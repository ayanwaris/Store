import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cartItems, carts, coupons, inventoryKeys, notifications, offers, orderItems,
  orders, payments, payouts, products, refunds, reviews, sellerProfiles, transactions, users,
} from "@/db/schema";
import { getProvider } from "./payments";
import { getFeeConfig, notify } from "./ops";
import { orderNumber } from "./utils";

export class BusinessError extends Error {}

/* ------------------------------- cart reading ------------------------------ */

export async function getCartItems(cartToken?: string) {
  if (!cartToken) return [];
  return db
    .select({
      itemId: cartItems.id,
      quantity: cartItems.quantity,
      offerId: offers.id,
      price: offers.price,
      stock: offers.stockCount,
      offerActive: offers.active,
      region: offers.region,
      productId: products.id,
      title: products.title,
      slug: products.slug,
      platform: products.platform,
      kind: products.kind,
      coverHue: products.coverHue,
      productActive: products.active,
      sellerName: sellerProfiles.storeName,
      sellerSlug: sellerProfiles.slug,
      sellerRating: sellerProfiles.ratingAvg,
    })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .innerJoin(offers, eq(offers.id, cartItems.offerId))
    .innerJoin(products, eq(products.id, offers.productId))
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, offers.sellerId))
    .where(eq(carts.token, cartToken));
}

export async function validateCoupon(code: string, subtotal: number) {
  const rows = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase().trim())).limit(1);
  const c = rows[0];
  if (!c || !c.active) throw new BusinessError("Coupon not found or inactive.");
  if (c.expiresAt && c.expiresAt < new Date()) throw new BusinessError("Coupon has expired.");
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) throw new BusinessError("Coupon usage limit reached.");
  if (subtotal < c.minSubtotal) throw new BusinessError(`Minimum subtotal for this coupon is €${c.minSubtotal}.`);
  const discount = c.kind === "percent"
    ? Math.min(subtotal, Math.round(subtotal * c.value) / 100)
    : Math.min(subtotal, c.value);
  return { coupon: c, discount: Math.round(discount * 100) / 100 };
}

/* ------------------------------ order creation ----------------------------- */

export async function createOrder(userId: string, method: string, couponCode?: string) {
  // find the user's cart (merged on login) by userId first
  const cartRows = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  const cart = cartRows[0];
  if (!cart) throw new BusinessError("Your cart is empty.");

  const items = await db
    .select({
      itemId: cartItems.id, quantity: cartItems.quantity,
      offerId: offers.id, price: offers.price, stock: offers.stockCount, offerActive: offers.active,
      productId: products.id, title: products.title, productActive: products.active,
      sellerId: sellerProfiles.id, sellerCommission: sellerProfiles.commissionRate,
      sellerUserId: sellerProfiles.userId, sellerName: sellerProfiles.storeName,
    })
    .from(cartItems)
    .innerJoin(offers, eq(offers.id, cartItems.offerId))
    .innerJoin(products, eq(products.id, offers.productId))
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, offers.sellerId))
    .where(eq(cartItems.cartId, cart.id));

  if (!items.length) throw new BusinessError("Your cart is empty.");
  for (const it of items) {
    if (!it.offerActive || !it.productActive) throw new BusinessError(`"${it.title}" is no longer available.`);
    if (it.stock < it.quantity) throw new BusinessError(`Only ${it.stock} left in stock for "${it.title}".`);
  }

  const subtotal = Math.round(items.reduce((a, i) => a + i.price * i.quantity, 0) * 100) / 100;
  let discount = 0;
  let appliedCode: string | undefined;
  if (couponCode) {
    const v = await validateCoupon(couponCode, subtotal);
    discount = v.discount;
    appliedCode = v.coupon.code;
  }
  const fees = await getFeeConfig();
  const fee = Math.round(((subtotal - discount) * fees.percent / 100 + fees.fixed) * 100) / 100;
  const total = Math.round((subtotal - discount + fee) * 100) / 100;

  const provider = getProvider();

  // reserve keys + create order atomically
  const order = await db.transaction(async (tx) => {
    const num = orderNumber();
    const [created] = await tx.insert(orders).values({
      number: num, userId, subtotal, discount, fee, total,
      couponCode: appliedCode, paymentMethod: method,
    }).returning();

    for (const it of items) {
      const keyRows = await tx.execute(sql`
        select id from inventory_keys
        where offer_id = ${it.offerId} and status = 'available'
        order by id
        limit ${it.quantity}
        for update skip locked
      `);
      const rows = (keyRows as unknown as { rows: Array<{ id: string }> }).rows;
      if (rows.length < it.quantity) {
        throw new BusinessError(`Stock ran out for "${it.title}". Please try again.`);
      }
      const keyIds = rows.map((r) => r.id);
      const [item] = await tx.insert(orderItems).values({
        orderId: created.id, offerId: it.offerId, productId: it.productId,
        sellerId: it.sellerId, title: it.title, price: it.price, quantity: it.quantity,
      }).returning();
      await tx.update(inventoryKeys)
        .set({ status: "reserved", orderItemId: item.id, reservedAt: new Date() })
        .where(inArray(inventoryKeys.id, keyIds));
      await tx.update(offers)
        .set({ stockCount: sql`${offers.stockCount} - ${it.quantity}` })
        .where(eq(offers.id, it.offerId));
    }

    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return created;
  });

  const session = await provider.createPayment({
    orderId: order.id, number: order.number, amount: order.total, currency: "EUR", method,
  });
  await db.insert(payments).values({
    orderId: order.id, provider: provider.id, ref: session.ref, amount: order.total, method,
  });

  return { order, clientSecret: session.clientSecret, paymentRef: session.ref };
}

/* --------------------------- payment confirmation -------------------------- */

export async function confirmOrderPayment(orderId: string, userId: string, payload: { cardNumber?: string }) {
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = orderRows[0];
  if (!order || order.userId !== userId) throw new BusinessError("Order not found.");
  if (order.status === "completed") return { ok: true as const, already: true };
  if (order.status !== "pending_payment") throw new BusinessError("Order is not awaiting payment.");

  const payRows = await db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
  const payment = payRows[0];
  if (!payment) throw new BusinessError("Payment session missing.");

  const provider = getProvider();
  const result = await provider.confirm(payment.ref, payload);

  if (result.status === "failed") {
    await db.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, payment.id));
    return { ok: false as const, error: result.error ?? "Payment failed." };
  }

  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status: "completed", paidAt: new Date() }).where(eq(orders.id, orderId));
    await tx.update(payments).set({ status: "succeeded", updatedAt: new Date() }).where(eq(payments.id, payment.id));

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const it of items) {
      await tx.update(inventoryKeys)
        .set({ status: "sold", soldAt: new Date() })
        .where(and(eq(inventoryKeys.orderItemId, it.id), eq(inventoryKeys.status, "reserved")));
      await tx.update(orderItems).set({ status: "delivered" }).where(eq(orderItems.id, it.id));
      await tx.update(offers)
        .set({ soldCount: sql`${offers.soldCount} + ${it.quantity}` })
        .where(eq(offers.id, it.offerId));

      const sellerRows = await tx.select().from(sellerProfiles).where(eq(sellerProfiles.id, it.sellerId)).limit(1);
      const seller = sellerRows[0]!;
      const gross = Math.round(it.price * it.quantity * 100) / 100;
      const commission = Math.round(gross * seller.commissionRate) / 100;
      const net = Math.round((gross - commission) * 100) / 100;

      await tx.update(sellerProfiles).set({
        balance: sql`${sellerProfiles.balance} + ${net}`,
        lifetimeRevenue: sql`${sellerProfiles.lifetimeRevenue} + ${gross}`,
        totalSales: sql`${sellerProfiles.totalSales} + ${it.quantity}`,
      }).where(eq(sellerProfiles.id, it.sellerId));

      await tx.insert(transactions).values([
        { kind: "sale", sellerId: it.sellerId, orderId, amount: net, note: `Sale: ${it.title} x${it.quantity}` },
        { kind: "commission", sellerId: it.sellerId, orderId, amount: commission, note: `Commission ${seller.commissionRate}% — ${it.title}` },
      ]);

      await tx.insert(notifications).values({
        userId: seller.userId, type: "sale",
        title: `New sale: ${it.title} ×${it.quantity}`,
        body: `Net payout ${net.toFixed(2)} EUR after ${commission.toFixed(2)} EUR commission.`,
        href: "/seller/orders",
      });
    }

    if (order.couponCode) {
      await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.code, order.couponCode));
    }

    await tx.insert(notifications).values({
      userId, type: "order",
      title: `Order ${order.number} completed`,
      body: "Your digital keys have been delivered to your library.",
      href: `/order/${order.number}`,
    });
  });

  return { ok: true as const };
}

export async function cancelOrder(orderId: string, userId: string) {
  await db.transaction(async (tx) => {
    const orderRows = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = orderRows[0];
    if (!order || order.userId !== userId) throw new BusinessError("Order not found.");
    if (order.status !== "pending_payment") throw new BusinessError("Only pending orders can be cancelled.");

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const it of items) {
      await tx.update(inventoryKeys)
        .set({ status: "available", orderItemId: null, reservedAt: null })
        .where(and(eq(inventoryKeys.orderItemId, it.id), eq(inventoryKeys.status, "reserved")));
      await tx.update(offers)
        .set({ stockCount: sql`${offers.stockCount} + ${it.quantity}` })
        .where(eq(offers.id, it.offerId));
      await tx.update(orderItems).set({ status: "cancelled" }).where(eq(orderItems.id, it.id));
    }
    await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
    await tx.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.orderId, orderId));
  });
}

/* --------------------------------- refunds --------------------------------- */

export async function requestRefund(userId: string, orderItemId: string, reason?: string) {
  const rows = await db
    .select({ item: orderItems, order: orders })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orderItems.id, orderItemId))
    .limit(1);
  const row = rows[0];
  if (!row || row.order.userId !== userId) throw new BusinessError("Order item not found.");
  if (row.item.status !== "delivered") throw new BusinessError("Only delivered items can be refunded.");
  const existing = await db.select().from(refunds)
    .where(and(eq(refunds.orderItemId, orderItemId), eq(refunds.status, "pending"))).limit(1);
  if (existing[0]) throw new BusinessError("A refund request is already pending for this item.");
  const [refund] = await db.insert(refunds).values({
    orderId: row.order.id, orderItemId, requestedBy: userId,
    amount: Math.round(row.item.price * row.item.quantity * 100) / 100, reason,
  }).returning();
  return refund;
}

export async function processRefund(adminId: string, refundId: string, approve: boolean) {
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(refunds).where(eq(refunds.id, refundId)).limit(1);
    const refund = rows[0];
    if (!refund) throw new BusinessError("Refund not found.");
    if (refund.status !== "pending") throw new BusinessError("Refund already processed.");

    if (!approve) {
      await tx.update(refunds).set({ status: "rejected", processedBy: adminId, processedAt: new Date() })
        .where(eq(refunds.id, refundId));
      await tx.insert(notifications).values({
        userId: refund.requestedBy, type: "refund",
        title: "Refund request rejected",
        body: "Contact support if you believe this is a mistake.", href: "/account/orders",
      });
      return refund;
    }

    const itemRows = await tx.select().from(orderItems).where(eq(orderItems.id, refund.orderItemId)).limit(1);
    const item = itemRows[0]!;
    const sellerRows = await tx.select().from(sellerProfiles).where(eq(sellerProfiles.id, item.sellerId)).limit(1);
    const seller = sellerRows[0]!;
    const gross = Math.round(item.price * item.quantity * 100) / 100;
    const commission = Math.round(gross * seller.commissionRate) / 100;
    const net = Math.round((gross - commission) * 100) / 100;

    await tx.update(orderItems).set({ status: "refunded" }).where(eq(orderItems.id, item.id));
    await tx.update(inventoryKeys).set({ status: "revoked" })
      .where(eq(inventoryKeys.orderItemId, item.id));
    await tx.update(sellerProfiles).set({
      balance: sql`${sellerProfiles.balance} - ${net}`,
      totalSales: sql`greatest(${sellerProfiles.totalSales} - ${item.quantity}, 0)`,
    }).where(eq(sellerProfiles.id, seller.id));
    await tx.insert(transactions).values([
      { kind: "refund", sellerId: seller.id, orderId: refund.orderId, amount: -net, note: `Refund: ${item.title}` },
      { kind: "commission", sellerId: seller.id, orderId: refund.orderId, amount: -commission, note: `Commission reversal — ${item.title}` },
    ]);

    const siblings = await tx.select({ status: orderItems.status }).from(orderItems)
      .where(eq(orderItems.orderId, refund.orderId));
    const allRefunded = siblings.every((s) => s.status === "refunded" || s.status === "cancelled");
    await tx.update(orders).set({ status: allRefunded ? "refunded" : "partially_refunded" })
      .where(eq(orders.id, refund.orderId));
    await tx.update(payments)
      .set({ status: allRefunded ? "refunded" : "partially_refunded", updatedAt: new Date() })
      .where(eq(payments.orderId, refund.orderId));

    await tx.update(refunds).set({ status: "approved", processedBy: adminId, processedAt: new Date() })
      .where(eq(refunds.id, refundId));
    await tx.insert(notifications).values({
      userId: refund.requestedBy, type: "refund",
      title: `Refund approved — ${refund.amount.toFixed(2)} EUR`,
      body: "The amount was returned via the original payment method.", href: "/account/orders",
    });
    return refund;
  });
}

/* ------------------------------ seller payout ------------------------------ */

export async function requestPayout(sellerId: string) {
  const rows = await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, sellerId)).limit(1);
  const seller = rows[0]!;
  if (seller.balance < 25) throw new BusinessError("Minimum payout is €25.");
  const [payout] = await db.insert(payouts).values({
    sellerId, amount: seller.balance,
  }).returning();
  await db.update(sellerProfiles).set({ balance: 0 }).where(eq(sellerProfiles.id, sellerId));
  await db.insert(transactions).values({
    kind: "payout", sellerId, amount: -seller.balance, note: `Payout request ${payout.id.slice(0, 8)}`,
  });
  return payout;
}

/* --------------------------------- reviews --------------------------------- */

export async function createReview(userId: string, input: {
  productId?: string; sellerId?: string; orderItemId?: string; rating: number; comment?: string;
}) {
  if (!input.productId && !input.sellerId) throw new BusinessError("Review target missing.");
  if (input.rating < 1 || input.rating > 5) throw new BusinessError("Rating must be 1–5.");

  if (input.orderItemId) {
    const rows = await db
      .select({ item: orderItems, order: orders })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(orderItems.id, input.orderItemId)).limit(1);
    const row = rows[0];
    if (!row || row.order.userId !== userId) throw new BusinessError("Purchase required to review.");
    if (row.item.status !== "delivered") throw new BusinessError("You can review after delivery.");
  }

  const dup = await db.select().from(reviews).where(and(
    eq(reviews.authorId, userId),
    input.productId ? eq(reviews.productId, input.productId) : eq(reviews.sellerId, input.sellerId!),
  )).limit(1);
  if (dup[0]) throw new BusinessError("You already reviewed this.");

  const [review] = await db.insert(reviews).values({
    authorId: userId, productId: input.productId ?? null, sellerId: input.sellerId ?? null,
    orderItemId: input.orderItemId ?? null, rating: input.rating, comment: input.comment,
  }).returning();

  if (input.productId) {
    await db.execute(sql`
      update products set
        rating_avg = round(((rating_avg * rating_count) + ${input.rating}) / (rating_count + 1), 2),
        rating_count = rating_count + 1
      where id = ${input.productId}
    `);
  }
  if (input.sellerId) {
    await db.execute(sql`
      update seller_profiles set
        rating_avg = round(((rating_avg * rating_count) + ${input.rating >= 4 ? 100 : 0}) / (rating_count + 1), 2),
        rating_count = rating_count + 1
      where id = ${input.sellerId}
    `);
    const seller = await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, input.sellerId)).limit(1);
    if (seller[0]) {
      await notify({
        userId: seller[0].userId, type: "review",
        title: `New ${input.rating}★ review`, body: input.comment?.slice(0, 140), href: "/seller/reviews",
      });
    }
  }
  return review;
}

/* -------------------------- catalog query helpers -------------------------- */

export type ProductCard = {
  id: string; slug: string; title: string; subtitle: string | null;
  platform: string; region: string; kind: string; genre: string | null;
  coverHue: number; rrp: number; ratingAvg: number; ratingCount: number;
  minPrice: number | null; offerCount: number; sold: number;
};

export async function getProductCards(opts: {
  categorySlug?: string; q?: string; platform?: string; region?: string; kind?: string;
  minPrice?: number; maxPrice?: number; sort?: string; featuredOnly?: boolean;
  limit?: number; offset?: number;
}) {
  const conditions = [sql`p.active = true`];
  if (opts.categorySlug) conditions.push(sql`c.slug = ${opts.categorySlug}`);
  if (opts.q) conditions.push(sql`(p.title ilike ${"%" + opts.q + "%"} or p.subtitle ilike ${"%" + opts.q + "%"})`);
  if (opts.platform) conditions.push(sql`p.platform = ${opts.platform}`);
  if (opts.region) conditions.push(sql`p.region = ${opts.region}`);
  if (opts.kind) conditions.push(sql`p.kind = ${opts.kind}`);
  if (opts.featuredOnly) conditions.push(sql`p.featured = true`);

  let orderClause = sql`coalesce(s.sold, 0) desc, p.created_at desc`;
  switch (opts.sort) {
    case "price_asc": orderClause = sql`s.min_price asc nulls last`; break;
    case "price_desc": orderClause = sql`s.min_price desc nulls last`; break;
    case "newest": orderClause = sql`p.created_at desc`; break;
    case "rating": orderClause = sql`p.rating_avg desc, p.rating_count desc`; break;
    case "discount": orderClause = sql`(p.rrp - coalesce(s.min_price, p.rrp)) / nullif(p.rrp, 0) desc`; break;
  }

  const having = [];
  if (opts.minPrice != null) having.push(sql`s.min_price >= ${opts.minPrice}`);
  if (opts.maxPrice != null) having.push(sql`s.min_price <= ${opts.maxPrice}`);
  const havingSql = having.length ? sql` having ${sql.join(having, sql` and `)}` : sql``;

  const rows = await db.execute(sql`
    select p.id, p.slug, p.title, p.subtitle, p.platform, p.region, p.kind, p.genre,
           p.cover_hue as "coverHue", p.rrp, p.rating_avg as "ratingAvg", p.rating_count as "ratingCount",
           s.min_price as "minPrice", coalesce(s.offer_count, 0)::int as "offerCount", coalesce(s.sold, 0)::int as sold
    from products p
    left join categories c on c.id = p.category_id
    left join lateral (
      select min(price) as min_price, count(*) as offer_count, sum(sold_count) as sold
      from offers o where o.product_id = p.id and o.active = true
    ) s on true
    where ${sql.join(conditions, sql` and `)}
    group by p.id, c.slug, s.min_price, s.offer_count, s.sold
    ${havingSql}
    order by ${orderClause}
    limit ${opts.limit ?? 24} offset ${opts.offset ?? 0}
  `);
  return ((rows as { rows: unknown[] }).rows as Array<Record<string, unknown>>).map((r) => ({
    ...r,
    rrp: Number(r.rrp), ratingAvg: Number(r.ratingAvg),
    minPrice: r.minPrice == null ? null : Number(r.minPrice),
  })) as ProductCard[];
}

export async function getProductCardsCount(opts: { categorySlug?: string; q?: string; platform?: string; region?: string; kind?: string }) {
  const conditions = [sql`p.active = true`];
  if (opts.categorySlug) conditions.push(sql`c.slug = ${opts.categorySlug}`);
  if (opts.q) conditions.push(sql`(p.title ilike ${"%" + opts.q + "%"} or p.subtitle ilike ${"%" + opts.q + "%"})`);
  if (opts.platform) conditions.push(sql`p.platform = ${opts.platform}`);
  if (opts.region) conditions.push(sql`p.region = ${opts.region}`);
  if (opts.kind) conditions.push(sql`p.kind = ${opts.kind}`);
  const rows = await db.execute(sql`
    select count(*)::int as total from products p
    left join categories c on c.id = p.category_id
    where ${sql.join(conditions, sql` and `)}
  `);
  return ((rows as unknown as { rows: Array<{ total: number }> }).rows)[0]?.total ?? 0;
}
