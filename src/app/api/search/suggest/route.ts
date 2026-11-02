import { ok } from "@/lib/api";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return ok({ products: [], categories: [] });
  const like = `%${q}%`;

  const [prodRows, catRows] = await Promise.all([
    db.execute(sql`
      select p.slug, p.title, p.platform, p.cover_hue as hue,
             (select min(o.price) from offers o where o.product_id = p.id and o.active = true) as "minPrice"
      from products p
      where p.active = true and (p.title ilike ${like} or p.subtitle ilike ${like})
      order by p.rating_count desc
      limit 6
    `),
    db.execute(sql`
      select name, slug from categories where name ilike ${like} limit 3
    `),
  ]);

  const products = (prodRows as unknown as { rows: Array<Record<string, unknown>> }).rows.map((r) => ({
    ...r, minPrice: r.minPrice == null ? null : Number(r.minPrice),
  }));
  return ok({ products, categories: (catRows as unknown as { rows: unknown[] }).rows });
}
