import { and, asc, ilike, or, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ok } from "@/lib/api";
import { getProductCards } from "@/lib/commerce";

/** Full catalog listing (public) or compact picker via ?picker=1 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim();

  if (u.searchParams.get("picker") === "1") {
    const where = q
      ? and(eq(products.active, true), or(ilike(products.title, `%${q}%`), ilike(products.subtitle, `%${q}%`)))
      : eq(products.active, true);
    const rows = await db
      .select({
        id: products.id, slug: products.slug, title: products.title,
        platform: products.platform, kind: products.kind, rrp: products.rrp,
      })
      .from(products)
      .where(where)
      .orderBy(asc(products.title))
      .limit(12);
    return ok(rows);
  }

  const page = Math.max(1, parseInt(u.searchParams.get("page") ?? "1", 10) || 1);
  const items = await getProductCards({
    q: q || undefined,
    categorySlug: u.searchParams.get("category") ?? undefined,
    platform: u.searchParams.get("platform") ?? undefined,
    region: u.searchParams.get("region") ?? undefined,
    kind: u.searchParams.get("kind") ?? undefined,
    minPrice: u.searchParams.get("min") ? Number(u.searchParams.get("min")) : undefined,
    maxPrice: u.searchParams.get("max") ? Number(u.searchParams.get("max")) : undefined,
    sort: u.searchParams.get("sort") ?? "popular",
    limit: Math.min(48, parseInt(u.searchParams.get("limit") ?? "24", 10) || 24),
    offset: (page - 1) * 24,
  });
  return ok({ items, page });
}
