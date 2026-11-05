import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtEUR, formatDate, statusTone } from "@/lib/utils";
import { PayoutActions } from "@/components/admin/AdminActions";

export default async function AdminPayouts() {
  await requireAdmin();
  const rows = ((await db.execute(sql`
    select py.id, py.amount::float8 as amount, py.status, py.method,
           py.created_at as "createdAt", py.processed_at as "processedAt",
           sp.store_name as "storeName", us.email as "ownerEmail"
    from payouts py join seller_profiles sp on sp.id = py.seller_id join users us on us.id = sp.user_id
    order by case py.status when 'pending' then 0 else 1 end, py.created_at desc limit 200
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  const pendingTotal = rows.filter((r) => r.status === "pending").reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Seller payouts</h2>
      <p className="mt-0.5 text-sm text-faint">
        {fmtEUR(pendingTotal)} pending settlement. Approving marks the wire as sent; rejecting restores the seller balance.
      </p>
      <div className="card mt-5 overflow-x-auto p-3 sm:p-0">
        <table className="table-x table-stack min-w-[760px]">
          <thead><tr><th>Store</th><th>Requested</th><th>Method</th><th>Status</th><th>Processed</th><th className="text-right">Amount</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td data-full colSpan={7} className="text-center text-mute">No payout requests.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={String(r.id)} className={r.status === "pending" ? "bg-brand/[0.03]" : ""}>
                <td data-full>
                  <p className="font-semibold">{String(r.storeName)}</p>
                  <p className="text-xs text-faint">{String(r.ownerEmail)}</p>
                </td>
                <td data-label="Requested" className="text-mute">{formatDate(String(r.createdAt))}</td>
                <td data-label="Method" className="text-mute">{String(r.method).replace("_", " ")}</td>
                <td data-label="Status"><span className={`chip border text-[10px] ${statusTone(String(r.status))}`}>{String(r.status)}</span></td>
                <td data-label="Processed" className="text-mute">{r.processedAt ? formatDate(String(r.processedAt)) : "—"}</td>
                <td data-label="Amount" className="text-right font-display font-bold">{fmtEUR(Number(r.amount))}</td>
                <td data-label="Actions" className="text-right">{r.status === "pending" && <PayoutActions id={String(r.id)} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
