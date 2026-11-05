import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtEUR, formatDate, ORDER_STATUS_LABEL, statusTone } from "@/lib/utils";
import { DollarSign, ShoppingBag, Users, Store, Undo2, LifeBuoy, ArrowRight } from "lucide-react";

export default async function AdminDashboard() {
  await requireAdmin();

  const kpis = ((await db.execute(sql`
    select
      (select coalesce(sum(total),0)::float8 from orders where status in ('completed','partially_refunded','refunded')) as "grossVolume",
      (select coalesce(sum(amount),0)::float8 from transactions where kind = 'commission') as "platformRevenue",
      (select count(*)::int from orders) as orders,
      (select count(*)::int from users) as users,
      (select count(*)::int from seller_profiles where status = 'approved') as "activeSellers",
      (select count(*)::int from seller_profiles where status = 'pending') as "pendingSellers",
      (select count(*)::int from support_tickets where status != 'closed') as "openTickets",
      (select count(*)::int from refunds where status = 'pending') as "pendingRefunds"
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};

  const byDay = ((await db.execute(sql`
    select to_char(date_trunc('day', created_at), 'DD/MM') as day,
           coalesce(sum(amount) filter (where kind = 'commission'), 0)::float8 as commission,
           coalesce(sum(amount) filter (where kind = 'sale'), 0)::float8 as sales
    from transactions
    where created_at > now() - interval '14 days'
    group by 1 order by min(date_trunc('day', created_at))
  `)) as unknown as { rows: Array<{ day: string; commission: number; sales: number }> }).rows;

  const topProducts = ((await db.execute(sql`
    select p.title, sum(oi.quantity)::int as qty, sum(oi.price * oi.quantity)::float8 as revenue
    from order_items oi join products p on p.id = oi.product_id
    group by p.title order by qty desc limit 5
  `)) as unknown as { rows: Array<{ title: string; qty: number; revenue: number }> }).rows;

  const recentOrders = ((await db.execute(sql`
    select o.number, o.status, o.total::float8 as total, o.created_at as "createdAt", u.name as "buyerName"
    from orders o join users u on u.id = o.user_id
    order by o.created_at desc limit 7
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  const maxRev = Math.max(1, ...byDay.map((d) => Math.max(d.commission, d.sales)));

  const kpiCards = [
    { icon: DollarSign, label: "Platform revenue (fees)", value: fmtEUR(Number(kpis.platformRevenue ?? 0)), tint: "text-brand" },
    { icon: ShoppingBag, label: "Gross marketplace volume", value: fmtEUR(Number(kpis.grossVolume ?? 0)), tint: "text-mint" },
    { icon: Users, label: "Registered users", value: String(kpis.users ?? 0), tint: "text-vio" },
    { icon: Store, label: `Sellers — ${kpis.pendingSellers ?? 0} pending review`, value: String(kpis.activeSellers ?? 0), tint: "text-sky-300" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((c) => (
          <div key={c.label} className="card p-4">
            <c.icon size={18} className={c.tint} />
            <p className="mt-2.5 font-display text-xl font-bold">{c.value}</p>
            <p className="text-xs text-faint">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/refunds" className="card hover-lift flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/12 text-rose-300"><Undo2 size={17} /></span>
          <div><p className="font-display text-lg font-bold">{String(kpis.pendingRefunds ?? 0)}</p><p className="text-xs text-faint">Refunds awaiting review</p></div>
          <ArrowRight size={15} className="ml-auto text-faint" />
        </Link>
        <Link href="/admin/moderation" className="card hover-lift flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/12 text-amber-300"><LifeBuoy size={17} /></span>
          <div><p className="font-display text-lg font-bold">{String(kpis.openTickets ?? 0)}</p><p className="text-xs text-faint">Open support tickets</p></div>
          <ArrowRight size={15} className="ml-auto text-faint" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-4 sm:p-5">
          <h2 className="font-display font-bold">Revenue — last 14 days</h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {byDay.length === 0 && <p className="text-sm text-mute">No transactions yet.</p>}
            {byDay.map((d, i) => (
              <div key={i} className="group relative flex flex-1 items-end gap-0.5">
                <div className="flex-1 rounded-t bg-vio/70" style={{ height: `${Math.max(3, (d.sales / maxRev) * 128)}px` }} title={`Sales ${fmtEUR(d.sales)}`} />
                <div className="flex-1 rounded-t bg-brand" style={{ height: `${Math.max(3, (d.commission / maxRev) * 128)}px` }} title={`Commission ${fmtEUR(d.commission)}`} />
                <p className={`absolute -bottom-5 left-0 right-0 truncate text-center text-[9px] text-faint ${i % 2 ? "max-sm:hidden" : ""}`}>{d.day}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-vio" /> Seller sales</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand" /> Platform commission</span>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="font-display font-bold">Top products by units</h2>
          <ul className="mt-3 space-y-3">
            {topProducts.length === 0 && <p className="text-sm text-mute">No sales yet.</p>}
            {topProducts.map((p) => (
              <li key={p.title} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{p.title}</span>
                <span className="shrink-0 text-right">
                  <span className="block font-display font-bold text-brand-bright">{fmtEUR(p.revenue)}</span>
                  <span className="text-[10px] text-faint">{p.qty} sold</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="font-display font-bold">Latest orders</h2>
          <Link href="/admin/orders" className="btn btn-ghost btn-sm">All orders <ArrowRight size={13} /></Link>
        </div>
        <div className="p-3 sm:p-0">
<table className="table-x table-stack">
          <thead><tr><th>Order</th><th>Buyer</th><th>Placed</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={String(o.number)}>
                <td data-label="Order" className="font-semibold">{String(o.number)}</td>
                <td data-label="Buyer" className="text-mute">{String(o.buyerName)}</td>
                <td data-label="Placed" className="text-mute">{formatDate(String(o.createdAt))}</td>
                <td data-label="Status"><span className={`chip border text-[10px] ${statusTone(String(o.status))}`}>{ORDER_STATUS_LABEL[String(o.status)] ?? String(o.status)}</span></td>
                <td data-label="Total" className="text-right font-display font-bold">{fmtEUR(Number(o.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </div>
    </div>
  );
}
