import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireSeller } from "@/lib/auth";
import { fmtEUR } from "@/lib/utils";
import { Banknote, ShoppingBag, Tag, TrendingUp, AlertTriangle } from "lucide-react";

export default async function SellerOverview() {
  const { sellerId } = await requireSeller();

  const kpis = ((await db.execute(sql`
    select
      (select balance from seller_profiles where id = ${sellerId})::float8 as balance,
      (select lifetime_revenue from seller_profiles where id = ${sellerId})::float8 as lifetime,
      (select total_sales from seller_profiles where id = ${sellerId})::int as sales,
      (select count(*) from offers o where o.seller_id = ${sellerId} and o.active)::int as "activeOffers",
      (select coalesce(sum(o.stock_count), 0) from offers o where o.seller_id = ${sellerId} and o.active)::int as stock,
      (select coalesce(sum(t.amount),0) from transactions t where t.seller_id = ${sellerId}
         and t.kind='sale' and t.created_at > now() - interval '30 days')::float8 as "last30"
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};

  const byDay = ((await db.execute(sql`
    select to_char(date_trunc('day', created_at), 'DD Mon') as day, sum(amount)::float8 as revenue
    from transactions
    where seller_id = ${sellerId} and kind = 'sale' and created_at > now() - interval '14 days'
    group by 1 order by min(date_trunc('day', created_at))
  `)) as unknown as { rows: Array<{ day: string; revenue: number }> }).rows;

  const lowStock = ((await db.execute(sql`
    select o.id, o.stock_count as stock, p.title, p.slug
    from offers o join products p on p.id = o.product_id
    where o.seller_id = ${sellerId} and o.active and o.stock_count <= 5
    order by o.stock_count asc limit 8
  `)) as unknown as { rows: Array<{ id: string; stock: number; title: string; slug: string }> }).rows;

  const recentSales = ((await db.execute(sql`
    select t.amount::float8 as amount, t.note, t.created_at as "createdAt"
    from transactions t where t.seller_id = ${sellerId} and t.kind = 'sale'
    order by t.created_at desc limit 8
  `)) as unknown as { rows: Array<{ amount: number; note: string; createdAt: string }> }).rows;

  const maxRev = Math.max(1, ...byDay.map((d) => d.revenue));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Banknote, label: "Withdrawable balance", value: fmtEUR(Number(kpis.balance ?? 0)), tint: "text-mint" },
          { icon: TrendingUp, label: "Revenue last 30 days (net)", value: fmtEUR(Number(kpis.last30 ?? 0)), tint: "text-brand" },
          { icon: ShoppingBag, label: "Lifetime sales", value: String(kpis.sales ?? 0), tint: "text-vio" },
          { icon: Tag, label: "Active offers / keys", value: `${kpis.activeOffers ?? 0} / ${kpis.stock ?? 0}`, tint: "text-sky-300" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <c.icon size={18} className={c.tint} />
            <p className="mt-2.5 font-display text-xl font-bold">{c.value}</p>
            <p className="text-xs text-faint">{c.label}</p>
          </div>
        ))}
      </div>

      {/* revenue chart */}
      <div className="card p-4 sm:p-5">
        <h2 className="font-display font-bold">Net sales — last 14 days</h2>
        {byDay.length === 0 ? (
          <p className="mt-3 text-sm text-mute">No sales yet in this window. List an offer to get moving.</p>
        ) : (
          <div className="mt-4 flex h-36 items-end gap-1.5">
            {byDay.map((d, i) => (
              <div key={i} tabIndex={0} role="img" aria-label={`${d.day}: ${fmtEUR(d.revenue)}`} className="group relative flex-1 outline-none">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-brand-deep/60 to-brand transition-all group-hover:from-brand group-hover:to-brand-bright"
                  style={{ height: `${Math.max(4, (d.revenue / maxRev) * 120)}px` }}
                />
                <p className={`mt-1.5 truncate text-center text-[9px] text-faint ${i % 2 ? "max-sm:hidden" : ""}`}>{d.day}</p>
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-panel px-2 py-0.5 text-[11px] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus:opacity-100">
                  {fmtEUR(d.revenue)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* low stock */}
        <div className="card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display font-bold">
            <AlertTriangle size={16} className="text-amber-300" /> Low-stock offers
          </h2>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-mute">All offers comfortably stocked.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lowStock.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/product/${l.slug}`} className="truncate hover:text-brand-bright">{l.title}</Link>
                  <span className={`chip shrink-0 ${l.stock === 0 ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}>
                    {l.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/seller/offers" className="btn btn-outline btn-sm mt-4">Restock inventory</Link>
        </div>

        {/* recent sales */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-display font-bold">Latest sales</h2>
          {recentSales.length === 0 ? (
            <p className="mt-3 text-sm text-mute">Sales will appear here in real time.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {recentSales.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-mute">{s.note}</span>
                  <span className="shrink-0 font-semibold text-mint">+{fmtEUR(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/seller/orders" className="btn btn-outline btn-sm mt-4">All sales</Link>
        </div>
      </div>
    </div>
  );
}
