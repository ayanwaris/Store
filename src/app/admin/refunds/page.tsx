import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtEUR, timeAgo, statusTone } from "@/lib/utils";
import { RefundActions } from "@/components/admin/AdminActions";

export default async function AdminRefunds() {
  await requireAdmin();
  const rows = ((await db.execute(sql`
    select r.id, r.amount::float8 as amount, r.reason, r.status, r.created_at as "createdAt",
           o.number as "orderNumber", o.id as "orderId", oi.title,
           u.name as "buyerName", u.email as "buyerEmail"
    from refunds r
    join orders o on o.id = r.order_id
    join order_items oi on oi.id = r.order_item_id
    join users u on u.id = r.requested_by
    order by case r.status when 'pending' then 0 else 1 end, r.created_at desc limit 200
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Refunds</h2>
      <p className="mt-0.5 text-sm text-faint">
        Approving revokes the delivered keys, reverses the seller and commission ledger entries, and notifies the buyer.
      </p>
      {rows.length === 0 ? (
        <div className="card mt-5 p-6 text-center text-sm text-mute sm:p-10">No refund requests. Healthy marketplace.</div>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((r) => (
            <div key={String(r.id)} className={`card p-4 ${r.status === "pending" ? "border-amber-400/25" : ""}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`chip border text-[10px] ${statusTone(String(r.status))}`}>{String(r.status)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {String(r.title)} — <span className="text-brand-bright">{fmtEUR(Number(r.amount))}</span>
                  </p>
                  <p className="text-xs text-faint">
                    {String(r.buyerName)} ({String(r.buyerEmail)}) · order{" "}
                    <Link href={`/admin/orders/${r.orderId}`} className="text-brand-bright hover:underline">{String(r.orderNumber)}</Link>{" "}
                    · {timeAgo(String(r.createdAt))}
                  </p>
                  {r.reason ? <p className="mt-1.5 rounded-lg bg-raised/40 px-3 py-2 text-xs text-mute">“{String(r.reason)}”</p> : null}
                </div>
                {r.status === "pending" && <RefundActions id={String(r.id)} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
