import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { fmtEUR } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";
import { ProductToggles } from "@/components/admin/AdminActions";
import ProductCreateForm from "@/components/admin/ProductCreateForm";
import { PlusCircle } from "lucide-react";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;

  const [rows, cats] = await Promise.all([
    db.execute(sql`
      select p.id, p.slug, p.title, p.kind, p.platform, p.region, p.rrp::float8 as rrp, p.active, p.featured,
             p.rating_avg::float8 as "ratingAvg", p.rating_count as "ratingCount", c.name as "categoryName",
             (select count(*) from offers o where o.product_id = p.id)::int as "offerCount",
             (select coalesce(sum(o.stock_count),0) from offers o where o.product_id = p.id)::int as stock
      from products p left join categories c on c.id = p.category_id
      ${q ? sql`where p.title ilike ${"%" + q + "%"}` : sql``}
      order by p.created_at desc limit 200
    `),
    db.select().from(categories).orderBy(asc(categories.position)),
  ]);
  const list = (rows as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Products</h2>
          <p className="mt-0.5 text-sm text-faint">{list.length} in catalog</p>
        </div>
        <div className="flex gap-2">
          <form method="get" className="flex gap-2">
            <input name="q" className="input w-52" placeholder="Search title…" defaultValue={q ?? ""} />
            <button className="btn btn-outline">Search</button>
          </form>
          <ProductCreateForm categories={cats.map((c) => ({ id: c.id, name: c.name }))} trigger={
            <span className="btn btn-primary"><PlusCircle size={15} /> New product</span>
          } />
        </div>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="table-x min-w-[860px]">
          <thead>
            <tr><th>Product</th><th>Category</th><th>Kind</th><th>Platform</th><th>RRP</th><th>Rating</th><th>Offers / stock</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={String(r.id)} className={!r.active ? "opacity-50" : ""}>
                <td>
                  <Link href={`/product/${r.slug}`} className="font-semibold hover:text-brand-bright">{String(r.title)}</Link>
                  <p className="text-xs text-faint">{String(r.slug)}</p>
                </td>
                <td className="text-mute">{String(r.categoryName ?? "—")}</td>
                <td><span className="chip">{String(r.kind)}</span></td>
                <td className="text-mute">{String(r.platform)}</td>
                <td>{fmtEUR(Number(r.rrp))}</td>
                <td><RatingStars value={Number(r.ratingAvg)} count={Number(r.ratingCount)} /></td>
                <td className="text-mute">{String(r.offerCount)} / {String(r.stock)}</td>
                <td>
                  {r.active
                    ? <span className="chip border border-mint/25 bg-mint/5 text-[10px] text-mint">live</span>
                    : <span className="chip border border-line text-[10px] text-faint">hidden</span>}
                  {Boolean(r.featured) && <span className="chip ml-1 border border-amber-400/30 bg-amber-400/10 text-[10px] text-amber-300">featured</span>}
                </td>
                <td className="text-right">
                  <ProductToggles id={String(r.id)} active={Boolean(r.active)} featured={Boolean(r.featured)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
