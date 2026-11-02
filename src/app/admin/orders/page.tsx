import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtEUR, formatDate, ORDER_STATUS_LABEL, statusTone } from "@/lib/utils";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const { q, status } = await searchParams;

  const rows = ((await db.execute(sql`
    select o.id, o.number, o.status, o.total::float8 as total, o.created_at as "createdAt",
           u.name as "buyerName", u.email as "buyerEmail",
           (select count(*) from order_items oi where oi.order_id = o.id)::int as items,
           p.status as "paymentStatus"
    from orders o
    join users u on u.id = o.user_id
    left join payments p on p.order_id = o.id
    where true
    ${q ? sql`and (o.number ilike ${"%" + q + "%"} or u.email ilike ${"%" + q + "%"})` : sql``}
    ${status ? sql`and o.status = ${status}` : sql``}
    order by o.created_at desc limit 200
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  const statuses = ["", "pending_payment", "completed", "cancelled", "partially_refunded", "refunded"];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Orders</h2>
          <p className="mt-0.5 text-sm text-faint">Platform-wide order and payment status.</p>
        </div>
        <form method="get" className="flex gap-2">
          <input name="q" className="input w-56" placeholder="Order # or buyer email…" defaultValue={q ?? ""} />
          <button className="btn btn-outline">Search</button>
        </form>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link key={s || "all"} href={s ? `/admin/orders?status=${s}` : "/admin/orders"}
            className={`chip border ${(status ?? "") === s ? "border-brand/50 bg-brand/10 text-brand-bright" : ""}`}>
            {s ? (ORDER_STATUS_LABEL[s] ?? s) : "all"}
          </Link>
        ))}
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="table-x min-w-[800px]">
          <thead><tr><th>Order</th><th>Buyer</th><th>Placed</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td><Link href={`/admin/orders/${r.id}`} className="font-semibold hover:text-brand-bright">{String(r.number)}</Link></td>
                <td>
                  <p className="text-sm">{String(r.buyerName)}</p>
                  <p className="text-xs text-faint">{String(r.buyerEmail)}</p>
                </td>
                <td className="text-mute">{formatDate(String(r.createdAt))}</td>
                <td className="text-mute">{String(r.items)}</td>
                <td><span className={`chip border text-[10px] ${statusTone(String(r.paymentStatus ?? "initiated"))}`}>{String(r.paymentStatus ?? "—")}</span></td>
                <td><span className={`chip border text-[10px] ${statusTone(String(r.status))}`}>{ORDER_STATUS_LABEL[String(r.status)] ?? String(r.status)}</span></td>
                <td className="text-right font-display font-bold">{fmtEUR(Number(r.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
