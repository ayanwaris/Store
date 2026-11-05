import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireSeller } from "@/lib/auth";
import { fmtEUR, formatDate } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

export default async function SellerOrdersPage() {
  const { sellerId } = await requireSeller();
  const rows = ((await db.execute(sql`
    select oi.id, oi.title, oi.price::float8 as price, oi.quantity, oi.status,
           o.number, o.created_at as "createdAt", sp.commission_rate::float8 as "commissionRate",
           u.name as "buyerName"
    from order_items oi
    join orders o on o.id = oi.order_id
    join seller_profiles sp on sp.id = oi.seller_id
    join users u on u.id = o.user_id
    where oi.seller_id = ${sellerId} and oi.status != 'awaiting_payment'
    order by o.created_at desc
    limit 100
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Sales</h2>
      <p className="mt-0.5 text-sm text-faint">Delivered items (including refunded), newest first.</p>
      {rows.length === 0 ? (
        <div className="card mt-5 flex flex-col items-center p-8 text-center sm:p-12">
          <ShoppingBag size={36} className="text-faint" />
          <p className="mt-3 font-semibold">No sales yet</p>
          <p className="mt-1 text-sm text-mute">Your first sale lands here the moment a payment completes.</p>
        </div>
      ) : (
        <div className="card mt-5 overflow-x-auto p-3 sm:p-0">
          <table className="table-x table-stack min-w-[680px]">
            <thead>
              <tr><th>Date</th><th>Product</th><th>Order</th><th>Buyer</th><th>Qty</th><th>Gross</th><th>Commission</th><th className="text-right">Net</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const qty = Number(r.quantity);
                const price = Number(r.price);
                const rate = Number(r.commissionRate);
                const gross = price * qty;
                const commission = Math.round(gross * rate) / 100;
                const net = gross - commission;
                return (
                  <tr key={String(r.id)}>
                    <td data-label="Date" className="text-mute">{formatDate(String(r.createdAt))}</td>
                    <td data-full className="font-medium">{String(r.title)}</td>
                    <td data-label="Order"><span className="text-xs text-mute">{String(r.number)}</span></td>
                    <td data-label="Buyer" className="text-mute">{String(r.buyerName)}</td>
                    <td data-label="Qty">{qty}</td>
                    <td data-label="Gross">{fmtEUR(gross)}</td>
                    <td data-label="Commission" className="text-faint">−{fmtEUR(commission)}</td>
                    <td data-label="Net" className={`text-right font-display font-bold ${r.status === "refunded" ? "text-rose-300 line-through" : "text-mint"}`}>
                      {fmtEUR(net)}
                    </td>
                    <td className="text-right">
                      {r.status === "refunded" && <span className="chip border border-rose-400/30 bg-rose-400/10 text-[10px] text-rose-300">refunded</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
