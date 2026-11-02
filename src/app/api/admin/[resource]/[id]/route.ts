import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  banners, categories, coupons, notifications, payouts, products, reviews,
  sellerProfiles, supportTickets, transactions, users,
} from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiAdmin, requireApiUser } from "@/lib/guards";
import { logAudit, notify, setSetting } from "@/lib/ops";
import { BusinessError, processRefund } from "@/lib/commerce";

type Ctx = { params: Promise<{ resource: string; id: string }> };

const UserPatch = z.object({
  banned: z.boolean().optional(),
  role: z.enum(["buyer", "admin"]).optional(),
});
const SellerPatch = z.object({
  status: z.enum(["approved", "rejected", "suspended"]).optional(),
  commissionRate: z.number().min(0).max(30).optional(),
});
const ProductPatch = z.object({
  active: z.boolean().optional(), featured: z.boolean().optional(),
  title: z.string().min(2).max(120).optional(), subtitle: z.string().max(160).optional(),
  description: z.string().min(10).max(4000).optional(), howToActivate: z.string().max(1500).optional(),
  rrp: z.number().min(0.5).max(5000).optional(), platform: z.string().max(30).optional(),
  region: z.string().max(10).optional(), kind: z.string().max(20).optional(),
  genre: z.string().max(40).optional().nullable(), coverHue: z.number().int().min(0).max(359).optional(),
  categoryId: z.string().uuid().optional().nullable(), tags: z.array(z.string()).max(10).optional(),
});
const CategoryPatch = z.object({
  name: z.string().min(2).max(40).optional(),
  blurb: z.string().max(160).optional(), icon: z.string().max(30).optional(),
});
const CouponPatch = z.object({
  active: z.boolean().optional(), value: z.number().positive().max(500).optional(),
  minSubtotal: z.number().min(0).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
});
const BannerPatch = z.object({
  title: z.string().max(80).optional(), subtitle: z.string().max(200).optional(),
  ctaText: z.string().max(30).optional(), ctaHref: z.string().max(120).optional(),
  hue: z.number().int().min(0).max(359).optional(),
  active: z.boolean().optional(), position: z.number().int().optional(),
});
const PayoutPatch = z.object({ status: z.enum(["paid", "rejected"]) });
const RefundPatch = z.object({ approve: z.boolean() });
const TicketPatch = z.object({ status: z.enum(["open", "pending", "closed"]) });
const SettingsPatch = z.object({ value: z.unknown() });

export async function PATCH(req: Request, ctx: Ctx) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;
  const { resource, id } = await ctx.params;
  const adminId = auth.user.id;

  switch (resource) {
    case "users": {
      if (id === adminId) return fail("You can't modify your own account here.", 400);
      const { data, resp } = await parseJson(req, UserPatch);
      if (!data) return resp!;
      const target = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
      if (!target) return fail("User not found.", 404);
      await db.update(users).set({
        ...(data.banned != null ? { banned: data.banned } : {}),
        ...(data.role ? { role: data.role } : {}),
      }).where(eq(users.id, id));
      await logAudit({ actorId: adminId, action: data.banned != null ? (data.banned ? "user.ban" : "user.unban") : "user.role", entity: "user", entityId: id, meta: data as Record<string, unknown> });
      if (data.banned) {
        await notify({ userId: id, title: "Account suspended", body: "Your account was suspended by an administrator.", type: "system" });
      }
      return ok({ updated: true });
    }
    case "sellers": {
      const { data, resp } = await parseJson(req, SellerPatch);
      if (!data) return resp!;
      const seller = (await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, id)).limit(1))[0];
      if (!seller) return fail("Seller not found.", 404);
      await db.update(sellerProfiles).set({
        ...(data.status ? { status: data.status } : {}),
        ...(data.commissionRate != null ? { commissionRate: data.commissionRate } : {}),
      }).where(eq(sellerProfiles.id, id));
      if (data.status && data.status !== seller.status) {
        const msg: Record<string, string> = {
          approved: "Congratulations — your seller application is approved. Your dashboard is live!",
          rejected: "Unfortunately your seller application was rejected this time.",
          suspended: "Your seller account was suspended. Contact support for details.",
        };
        await notify({ userId: seller.userId, title: `Seller status: ${data.status}`, body: msg[data.status], href: "/seller", type: "seller" });
        await logAudit({ actorId: adminId, action: `seller.${data.status}`, entity: "seller_profile", entityId: id, meta: { storeName: seller.storeName } });
      }
      if (data.commissionRate != null) {
        await logAudit({ actorId: adminId, action: "seller.commission", entity: "seller_profile", entityId: id, meta: { commissionRate: data.commissionRate } });
      }
      return ok({ updated: true });
    }
    case "products": {
      const { data, resp } = await parseJson(req, ProductPatch);
      if (!data) return resp!;
      await db.update(products).set(data).where(eq(products.id, id));
      await logAudit({ actorId: adminId, action: "product.update", entity: "product", entityId: id, meta: data as Record<string, unknown> });
      return ok({ updated: true });
    }
    case "categories": {
      const { data, resp } = await parseJson(req, CategoryPatch);
      if (!data) return resp!;
      await db.update(categories).set(data).where(eq(categories.id, id));
      await logAudit({ actorId: adminId, action: "category.update", entity: "category", entityId: id });
      return ok({ updated: true });
    }
    case "coupons": {
      const { data, resp } = await parseJson(req, CouponPatch);
      if (!data) return resp!;
      await db.update(coupons).set({
        ...(data.active != null ? { active: data.active } : {}),
        ...(data.value != null ? { value: data.value } : {}),
        ...(data.minSubtotal != null ? { minSubtotal: data.minSubtotal } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } : {}),
        ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit } : {}),
      }).where(eq(coupons.id, id));
      await logAudit({ actorId: adminId, action: "coupon.update", entity: "coupon", entityId: id });
      return ok({ updated: true });
    }
    case "banners": {
      const { data, resp } = await parseJson(req, BannerPatch);
      if (!data) return resp!;
      await db.update(banners).set(data).where(eq(banners.id, id));
      await logAudit({ actorId: adminId, action: "banner.update", entity: "banner", entityId: id });
      return ok({ updated: true });
    }
    case "payouts": {
      const { data, resp } = await parseJson(req, PayoutPatch);
      if (!data) return resp!;
      const payout = (await db.select().from(payouts).where(eq(payouts.id, id)).limit(1))[0];
      if (!payout) return fail("Payout not found.", 404);
      if (payout.status !== "pending") return fail("Payout already processed.", 409);
      const seller = (await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, payout.sellerId)).limit(1))[0]!;

      await db.transaction(async (tx) => {
        await tx.update(payouts).set({ status: data.status, processedAt: new Date(), processedBy: adminId })
          .where(eq(payouts.id, id));
        if (data.status === "rejected") {
          // restore balance — the seller keeps what they earned
          await tx.execute(sql`update seller_profiles set balance = balance + ${payout.amount} where id = ${payout.sellerId}`);
          await tx.insert(transactions).values({
            kind: "adjustment", sellerId: payout.sellerId, amount: payout.amount,
            note: "Payout rejected — balance restored",
          });
        }
      });
      await notify({
        userId: seller.userId, type: "payout",
        title: data.status === "paid" ? `Payout of €${payout.amount} sent` : `Payout of €${payout.amount} rejected`,
        body: data.status === "paid"
          ? `Your ${payout.method.replace("_", " ")} payout was marked as paid.`
          : "The amount was returned to your balance. Contact support for details.",
        href: "/seller/payouts",
      });
      await logAudit({ actorId: adminId, action: `payout.${data.status}`, entity: "payout", entityId: id, meta: { amount: payout.amount } });
      return ok({ updated: true });
    }
    case "refunds": {
      const { data, resp } = await parseJson(req, RefundPatch);
      if (!data) return resp!;
      try {
        const refund = await processRefund(adminId, id, data.approve);
        await logAudit({ actorId: adminId, action: data.approve ? "refund.approve" : "refund.reject", entity: "refund", entityId: id, meta: { amount: refund.amount } });
        return ok({ processed: true });
      } catch (e) {
        if (e instanceof BusinessError) return fail(e.message, 400);
        throw e;
      }
    }
    case "tickets": {
      const { data, resp } = await parseJson(req, TicketPatch);
      if (!data) return resp!;
      await db.update(supportTickets).set({ status: data.status, updatedAt: new Date() })
        .where(eq(supportTickets.id, id));
      return ok({ updated: true });
    }
    case "settings": {
      // [id] is the setting key here
      const allowed = new Set(["fees", "default_commission", "support_email"]);
      if (!allowed.has(id)) return fail("Unknown setting.", 404);
      const { data, resp } = await parseJson(req, SettingsPatch);
      if (!data) return resp!;
      await setSetting(id, data.value);
      await logAudit({ actorId: adminId, action: "settings.update", entity: "setting", entityId: id, meta: { value: data.value } });
      return ok({ updated: true });
    }
  }
  return fail(`Update not supported for ${resource}.`, 404);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  if (auth.user.role !== "admin") return fail("Administrator access required.", 403);
  const { resource, id } = await ctx.params;

  switch (resource) {
    case "categories":
      await db.delete(categories).where(eq(categories.id, id));
      await logAudit({ actorId: auth.user.id, action: "category.delete", entity: "category", entityId: id });
      return ok({ deleted: true });
    case "coupons":
      await db.delete(coupons).where(eq(coupons.id, id));
      await logAudit({ actorId: auth.user.id, action: "coupon.delete", entity: "coupon", entityId: id });
      return ok({ deleted: true });
    case "banners":
      await db.delete(banners).where(eq(banners.id, id));
      await logAudit({ actorId: auth.user.id, action: "banner.delete", entity: "banner", entityId: id });
      return ok({ deleted: true });
    case "reviews": {
      const review = (await db.select().from(reviews).where(eq(reviews.id, id)).limit(1))[0];
      if (!review) return fail("Review not found.", 404);
      await db.delete(reviews).where(eq(reviews.id, id));
      // refresh aggregates after moderation
      if (review.productId) {
        await db.execute(sql`
          update products set
            rating_avg = coalesce((select round(avg(rating), 2) from reviews where product_id = ${review.productId}), 0),
            rating_count = (select count(*) from reviews where product_id = ${review.productId})
          where id = ${review.productId}
        `);
      }
      if (review.sellerId) {
        await db.execute(sql`
          update seller_profiles set
            rating_avg = coalesce((select round(avg(rating), 2) from reviews where seller_id = ${review.sellerId}), 0),
            rating_count = (select count(*) from reviews where seller_id = ${review.sellerId})
          where id = ${review.sellerId}
        `);
      }
      await logAudit({ actorId: auth.user.id, action: "review.delete", entity: "review", entityId: id });
      return ok({ deleted: true });
    }
  }
  return fail(`Delete not supported for ${resource}.`, 404);
}
void and; void notifications;
