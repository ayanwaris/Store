import { z } from "zod";
import { asc, desc, eq, sql } from "drizzle-orm";
import { isSafeUrl } from "@/lib/site-config";
import { db } from "@/db";
import { banners, categories, coupons, products, settings } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiAdmin } from "@/lib/guards";
import { logAudit } from "@/lib/ops";
import { slugify } from "@/lib/utils";

const RESOURCES = new Set([
  "users", "sellers", "products", "categories", "coupons", "payouts",
  "refunds", "banners", "reviews", "orders", "tickets", "logs", "settings",
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;
  const { resource } = await params;
  if (!RESOURCES.has(resource)) return fail("Unknown resource.", 404);

  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();
  const status = u.searchParams.get("status");

  switch (resource) {
    case "users": {
      const rows = await db.execute(sql`
        select us.id, us.name, us.email, us.role, us.banned, us.email_verified as "emailVerified",
               us.created_at as "createdAt", sp.status as "sellerStatus",
               (select count(*) from orders o where o.user_id = us.id)::int as "orderCount"
        from users us left join seller_profiles sp on sp.user_id = us.id
        ${q ? sql`where us.name ilike ${"%" + q + "%"} or us.email ilike ${"%" + q + "%"}` : sql``}
        order by us.created_at desc limit 200
      `);
      return ok(wrap(rows));
    }
    case "sellers": {
      const rows = await db.execute(sql`
        select sp.id, sp.store_name as "storeName", sp.slug, sp.status, sp.commission_rate as "commissionRate",
               sp.rating_avg as "ratingAvg", sp.rating_count as "ratingCount", sp.total_sales as "totalSales",
               sp.balance, sp.created_at as "createdAt", us.email, us.name as "ownerName"
        from seller_profiles sp join users us on us.id = sp.user_id
        ${status ? sql`where sp.status = ${status}` : sql``}
        order by sp.created_at desc limit 200
      `);
      return ok(wrap(rows));
    }
    case "products": {
      const rows = await db.execute(sql`
        select p.id, p.slug, p.title, p.kind, p.platform, p.region, p.rrp::float8 as rrp, p.active, p.featured,
               p.rating_avg::float8 as "ratingAvg", p.rating_count as "ratingCount",
               c.name as "categoryName",
               (select min(o.price) from offers o where o.product_id = p.id and o.active) as "minPrice",
               (select count(*) from offers o where o.product_id = p.id)::int as "offerCount"
        from products p left join categories c on c.id = p.category_id
        ${q ? sql`where p.title ilike ${"%" + q + "%"}` : sql``}
        order by p.created_at desc limit 200
      `);
      return ok(numify("rrp", "minPrice")(wrap(rows)));
    }
    case "categories":
      return ok(await db.select().from(categories).orderBy(asc(categories.position)));
    case "coupons":
      return ok(await db.select().from(coupons).orderBy(desc(coupons.id)));
    case "payouts": {
      const rows = await db.execute(sql`
        select py.id, py.amount::float8 as amount, py.status, py.method, py.created_at as "createdAt",
               py.processed_at as "processedAt", sp.store_name as "storeName"
        from payouts py join seller_profiles sp on sp.id = py.seller_id
        ${status ? sql`where py.status = ${status}` : sql``}
        order by py.created_at desc limit 200
      `);
      return ok(wrap(rows));
    }
    case "refunds": {
      const rows = await db.execute(sql`
        select r.id, r.amount::float8 as amount, r.reason, r.status, r.created_at as "createdAt",
               o.number as "orderNumber", oi.title, us.name as "buyerName", us.email as "buyerEmail"
        from refunds r
        join orders o on o.id = r.order_id
        join order_items oi on oi.id = r.order_item_id
        join users us on us.id = r.requested_by
        ${status ? sql`where r.status = ${status}` : sql``}
        order by r.created_at desc limit 200
      `);
      return ok(wrap(rows));
    }
    case "banners":
      return ok(await db.select().from(banners).orderBy(asc(banners.position)));
    case "reviews": {
      const rows = await db.execute(sql`
        select r.id, r.rating, r.comment, r.created_at as "createdAt",
               us.name as "authorName",
               coalesce(p.title, sp.store_name) as target
        from reviews r
        join users us on us.id = r.author_id
        left join products p on p.id = r.product_id
        left join seller_profiles sp on sp.id = r.seller_id
        ${q ? sql`where r.comment ilike ${"%" + q + "%"}` : sql``}
        order by r.created_at desc limit 150
      `);
      return ok(wrap(rows));
    }
    case "orders": {
      const rows = await db.execute(sql`
        select o.id, o.number, o.status, o.total::float8 as total, o.created_at as "createdAt",
               u.name as "buyerName", u.email as "buyerEmail",
               (select count(*) from order_items oi where oi.order_id = o.id)::int as items
        from orders o join users u on u.id = o.user_id
        ${q ? sql`where o.number ilike ${"%" + q + "%"} or u.email ilike ${"%" + q + "%"}` : sql``}
        ${status ? (q ? sql`and o.status = ${status}` : sql`where o.status = ${status}`) : sql``}
        order by o.created_at desc limit 200
      `);
      return ok(wrap(rows));
    }
    case "tickets": {
      const rows = await db.execute(sql`
        select t.id, t.subject, t.status, t.priority, t.created_at as "createdAt", t.updated_at as "updatedAt",
               us.name as "userName", us.email as "userEmail",
               (select count(*) from ticket_messages m where m.ticket_id = t.id)::int as messages
        from support_tickets t join users us on us.id = t.user_id
        ${status ? sql`where t.status = ${status}` : sql``}
        order by t.updated_at desc limit 200
      `);
      return ok(wrap(rows));
    }
    case "logs": {
      const rows = await db.execute(sql`
        select a.id, a.action, a.entity, a.entity_id as "entityId", a.meta, a.created_at as "createdAt",
               us.name as "actorName"
        from audit_logs a left join users us on us.id = a.actor_id
        order by a.created_at desc limit 200
      `);
      return ok(wrap(rows));
    }
    case "settings":
      return ok(await db.select().from(settings));
  }
}

function wrap(r: unknown): Array<Record<string, unknown>> {
  return (r as unknown as { rows: Array<Record<string, unknown>> }).rows;
}
function numify(...keys: string[]) {
  return (rows: Array<Record<string, unknown>>) =>
    rows.map((r) => {
      const out = { ...r };
      for (const k of keys) if (out[k] != null) out[k] = Number(out[k]);
      return out;
    });
}

/* ------------------------------- create ops ------------------------------- */

const SafeUrl = z.string().max(500).refine(isSafeUrl, "Use a site path like /category/games or a full https:// URL");
const CategoryCreate = z.object({
  name: z.string().min(2).max(40), icon: z.string().max(30).optional(), blurb: z.string().max(160).optional(),
  imageUrl: SafeUrl.optional().nullable(), href: SafeUrl.optional().nullable(), active: z.boolean().optional(),
});
const ProductCreate = z.object({
  title: z.string().min(2).max(120), subtitle: z.string().max(160).optional(),
  description: z.string().min(10).max(4000), howToActivate: z.string().max(1500).optional(),
  rrp: z.number().min(0.5).max(5000), categoryId: z.string().uuid().optional().nullable(),
  platform: z.string().min(1).max(30), region: z.string().max(10).default("GLOBAL"),
  kind: z.enum(["game", "giftcard", "software", "subscription", "points", "dlc"]).default("game"),
  genre: z.string().max(40).optional(), featured: z.boolean().default(false),
  coverHue: z.number().int().min(0).max(359).default(262),
  tags: z.array(z.string()).max(10).default([]),
});
const CouponCreate = z.object({
  code: z.string().min(3).max(24).regex(/^[A-Z0-9]+$/i, "Letters and numbers only"),
  kind: z.enum(["percent", "fixed"]).default("percent"),
  value: z.number().positive().max(500),
  minSubtotal: z.number().min(0).default(0),
  expiresAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
});
const BannerCreate = z.object({
  title: z.string().min(2).max(80), subtitle: z.string().max(200).optional(),
  ctaText: z.string().max(30).optional(), ctaHref: z.string().max(120).optional(),
  hue: z.number().int().min(0).max(359).default(262),
  active: z.boolean().default(true), position: z.number().int().min(0).max(50).default(0),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;
  const { resource } = await params;

  switch (resource) {
    case "categories": {
      const { data, resp } = await parseJson(req, CategoryCreate);
      if (!data) return resp!;
      let slug = slugify(data.name);
      if ((await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1))[0]) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      }
      // new categories go to the end of the menu
      const [{ next }] = await db.select({ next: sql<number>`coalesce(max(${categories.position}), -1) + 1` }).from(categories);
      const [row] = await db.insert(categories).values({
        ...data, slug, position: Number(next),
        imageUrl: data.imageUrl || null, href: data.href || null,
      }).returning();
      await logAudit({ actorId: auth.user.id, action: "category.create", entity: "category", entityId: row.id, meta: { name: data.name } });
      return ok(row, { status: 201 });
    }
    case "products": {
      const { data, resp } = await parseJson(req, ProductCreate);
      if (!data) return resp!;
      let slug = slugify(data.title);
      if ((await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1))[0]) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      }
      const [row] = await db.insert(products).values({ ...data, slug, categoryId: data.categoryId ?? null }).returning();
      await logAudit({ actorId: auth.user.id, action: "product.create", entity: "product", entityId: row.id, meta: { title: data.title } });
      return ok({ id: row.id, slug: row.slug }, { status: 201 });
    }
    case "coupons": {
      const { data, resp } = await parseJson(req, CouponCreate);
      if (!data) return resp!;
      const code = data.code.toUpperCase();
      const dup = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code)).limit(1);
      if (dup[0]) return fail("Coupon code already exists.", 409);
      const [row] = await db.insert(coupons).values({
        code, kind: data.kind, value: data.value, minSubtotal: data.minSubtotal,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        usageLimit: data.usageLimit ?? null,
      }).returning();
      await logAudit({ actorId: auth.user.id, action: "coupon.create", entity: "coupon", entityId: code });
      return ok(row, { status: 201 });
    }
    case "banners": {
      const { data, resp } = await parseJson(req, BannerCreate);
      if (!data) return resp!;
      const [row] = await db.insert(banners).values(data).returning();
      await logAudit({ actorId: auth.user.id, action: "banner.create", entity: "banner", entityId: row.id });
      return ok(row, { status: 201 });
    }
  }
  return fail(`Create not supported for ${resource}.`, 404);
}
