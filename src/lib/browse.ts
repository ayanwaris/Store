import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import type { ProductCard } from "@/lib/commerce";

/**
 * Data layer for the Browse / Search page (sidebar filters with counts).
 * Filters accept MULTIPLE values per group (e.g. platform = Vapor + Orbit), like the checkbox sidebar.
 */
export type BrowseFilters = {
  q?: string;
  /** restrict to one category page (e.g. "games") */
  categorySlug?: string;
  kind?: string[]; platform?: string[]; region?: string[]; genre?: string[];
  minPrice?: number; maxPrice?: number;
  featuredOnly?: boolean;
  sort?: string;
};
export type FacetKey = "kind" | "platform" | "region" | "genre";
export type FacetItem = { value: string; count: number };
export type Facets = Record<FacetKey, FacetItem[]>;

/** "a,b,c" (from the URL) -> ["a","b","c"] */
export function parseList(v?: string | null): string[] {
  return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25);
}

const inList = (col: FacetKey, vals: string[]) =>
  sql`p.${sql.raw(col)} in (${sql.join(vals.map((v) => sql`${v}`), sql`, `)})`;

/** WHERE conditions; `skip` leaves one facet out so its own counts show every option (standard faceting). */
function conditions(f: BrowseFilters, skip?: FacetKey): SQL[] {
  const c: SQL[] = [sql`p.active = true`];
  if (f.q) c.push(sql`(p.title ilike ${"%" + f.q + "%"} or p.subtitle ilike ${"%" + f.q + "%"})`);
  if (f.categorySlug) c.push(sql`c.slug = ${f.categorySlug}`);
  if (f.featuredOnly) c.push(sql`p.featured = true`);
  for (const k of ["kind", "platform", "region", "genre"] as const) {
    const vals = f[k];
    if (k !== skip && vals && vals.length) c.push(inList(k, vals));
  }
  if (f.minPrice != null && Number.isFinite(f.minPrice)) c.push(sql`s.min_price >= ${f.minPrice}`);
  if (f.maxPrice != null && Number.isFinite(f.maxPrice)) c.push(sql`s.min_price <= ${f.maxPrice}`);
  return c;
}

const CATEGORY_JOIN = sql`left join categories c on c.id = p.category_id`;

/** cheapest active offer per product, used for the price filter */
const PRICE_JOIN = sql`left join lateral (
  select min(o.price) as min_price from offers o where o.product_id = p.id and o.active = true
) s on true`;

export async function getBrowseCards(f: BrowseFilters, limit = 24, offset = 0) {
  let order = sql`coalesce(st.sold, 0) desc, p.created_at desc`;
  switch (f.sort) {
    case "price_asc": order = sql`s.min_price asc nulls last`; break;
    case "price_desc": order = sql`s.min_price desc nulls last`; break;
    case "newest": order = sql`p.created_at desc`; break;
    case "rating": order = sql`p.rating_avg desc, p.rating_count desc`; break;
    case "discount": order = sql`(p.rrp - coalesce(s.min_price, p.rrp)) / nullif(p.rrp, 0) desc`; break;
  }
  const rows = await db.execute(sql`
    select p.id, p.slug, p.title, p.subtitle, p.platform, p.region, p.kind, p.genre,
           p.cover_hue as "coverHue", p.rrp, p.rating_avg as "ratingAvg", p.rating_count as "ratingCount",
           s.min_price as "minPrice", coalesce(st.offer_count, 0)::int as "offerCount", coalesce(st.sold, 0)::int as sold,
           coalesce(st.stock, 0)::int as stock, st.seller_rating as "sellerRating"
    from products p
    ${CATEGORY_JOIN}
    ${PRICE_JOIN}
    left join lateral (
      select count(*) as offer_count, sum(o.sold_count) as sold, sum(o.stock_count) as stock,
             (select sp.rating_avg from offers o2 join seller_profiles sp on sp.id = o2.seller_id
               where o2.product_id = p.id and o2.active = true order by o2.price asc, sp.rating_avg desc limit 1) as seller_rating
      from offers o where o.product_id = p.id and o.active = true
    ) st on true
    where ${sql.join(conditions(f), sql` and `)}
    order by ${order}
    limit ${limit} offset ${offset}
  `);
  return ((rows as { rows: unknown[] }).rows as Array<Record<string, unknown>>).map((r) => ({
    ...r,
    rrp: Number(r.rrp), ratingAvg: Number(r.ratingAvg),
    minPrice: r.minPrice == null ? null : Number(r.minPrice),
    sellerRating: r.sellerRating == null ? null : Number(r.sellerRating),
  })) as ProductCard[];
}

/** Total matches — now respects the price filter too, so page counts are correct. */
export async function getBrowseCount(f: BrowseFilters) {
  const rows = await db.execute(sql`
    select count(*)::int as total from products p ${CATEGORY_JOIN} ${PRICE_JOIN}
    where ${sql.join(conditions(f), sql` and `)}
  `);
  return (rows as unknown as { rows: Array<{ total: number }> }).rows[0]?.total ?? 0;
}

async function facet(f: BrowseFilters, key: FacetKey): Promise<FacetItem[]> {
  const rows = await db.execute(sql`
    select p.${sql.raw(key)} as value, count(*)::int as count
    from products p ${CATEGORY_JOIN} ${PRICE_JOIN}
    where ${sql.join(conditions(f, key), sql` and `)} and p.${sql.raw(key)} is not null and p.${sql.raw(key)} <> ''
    group by p.${sql.raw(key)}
    order by count desc, value asc
  `);
  return (rows as unknown as { rows: FacetItem[] }).rows.map((r) => ({ value: String(r.value), count: Number(r.count) }));
}

/** Option lists + counts for the sidebar (each group's counts ignore its own selection). */
export async function getBrowseFacets(f: BrowseFilters): Promise<Facets> {
  const [kind, platform, region, genre] = await Promise.all([
    facet(f, "kind"), facet(f, "platform"), facet(f, "region"), facet(f, "genre"),
  ]);
  return { kind, platform, region, genre };
}