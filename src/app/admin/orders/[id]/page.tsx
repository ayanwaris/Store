import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, payments, products, refunds, sellerProfiles, users, inventoryKeys } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fmtEUR, formatDate, ORDER_STATUS_LABEL, statusTone } from "@/lib/utils";
import { RefundActions } from "@/components/admin/AdminActions";
import { ArrowLeft } from "lucide-react";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const order = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0];
  if (!order) notFound();
  const buyer = (await db.select().from(users).where(eq(users.id, order.userId)).limit(1))[0]!;
  const payment = (await db.select().from(payments).where(eq(payments.orderId, id)).limit(1))[0];

  const items = await db
    .select({
      id: orderItems.id, title: orderItems.title, price: orderItems.price, quantity: orderItems.quantity,
      status: orderItems.status, storeName: sellerProfiles.storeName, slug: products.slug,
    })
    .from(orderItems)
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, orderItems.sellerId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.createdAt));

  const keysByItem = ((await db.execute(sql`
    select order_item_id as "orderItemId", status, count(*)::int as n
    from inventory_keys where order_item_id in (select id from order_items where order_id = ${id})
    group by 1, 2
  `)) as unknown as { rows: Array<{ orderItemId: string; status: string; n: number }> }).rows;

  const refundRows = ((await db.execute(sql`
    select r.id, r.amount::float8 as amount, r.reason, r.status, r.created_at as "createdAt",
           oi.title, u.name as "buyerName"
    from refunds r
    join order_items oi on oi.id = r.order_item_id
    join users u on u.id = r.requested_by
    where r.order_id = ${id}
    order by r.created_at desc
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <Link href="/admin/orders" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={14} /> All orders</Link>
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">{order.number}</h2>
            <p className="text-sm text-faint">
              {buyer.name} · {buyer.email} · placed {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`chip border ${statusTone(order.status)}`}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
            <span className="font-display text-xl font-bold text-brand-bright">{fmtEUR(order.total)}</span>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <div><dt className="text-faint">Subtotal</dt><dd className="font-semibold">{fmtEUR(order.subtotal)}</dd></div>
          <div><dt className="text-faint">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="font-semibold text-mint">−{fmtEUR(order.discount)}</dd></div>
          <div><dt className="text-faint">Service fee</dt><dd className="font-semibold">{fmtEUR(order.fee)}</dd></div>
          <div><dt className="text-faint">Payment</dt><dd className="font-semibold">{payment ? `${payment.provider}/${payment.method ?? "—"} · ${payment.status}` : "—"}</dd></div>
        </dl>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-line px-5 py-3.5"><h3 className="font-display font-bold">Items</h3></div>
        <div className="p-3 sm:p-0">
<table className="table-x table-stack">
          <thead><tr><th>Product</th><th>Seller</th><th>Keys</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td data-full><Link href={`/product/${it.slug}`} className="font-medium hover:text-brand-bright">{it.title}</Link></td>
                <td data-label="Seller" className="text-mute">{it.storeName}</td>
                <td data-label="Keys" className="text-xs text-mute">
                  {keysByItem.filter((k) => k.orderItemId === it.id).map((k) => `${k.n} ${k.status}`).join(", ") || "—"}
                </td>
                <td data-label="Status"><span className={`chip border text-[10px] ${statusTone(it.status)}`}>{it.status.replace("_", " ")}</span></td>
                <td data-label="Amount" className="text-right font-display font-bold">{fmtEUR(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </div>

      {refundRows.length > 0 && (
        <div className="card mt-4 overflow-hidden">
          <div className="border-b border-line px-5 py-3.5"><h3 className="font-display font-bold">Refund requests</h3></div>
          <div className="p-3 sm:p-0">
<table className="table-x table-stack">
            <thead><tr><th>Item</th><th>Requested by</th><th>Reason</th><th>Status</th><th className="text-right">Amount</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {refundRows.map((r) => (
                <tr key={String(r.id)}>
                  <td data-full className="font-medium">{String(r.title)}</td>
                  <td data-label="Requested by" className="text-mute">{String(r.buyerName)}</td>
                  <td data-label="Reason" className="max-w-56 truncate text-xs text-mute">{String(r.reason ?? "—")}</td>
                  <td data-label="Status"><span className={`chip border text-[10px] ${statusTone(String(r.status))}`}>{String(r.status)}</span></td>
                  <td data-label="Amount" className="text-right font-display font-bold">{fmtEUR(Number(r.amount))}</td>
                  <td data-label="Actions" className="text-right">
                    {r.status === "pending" && <RefundActions id={String(r.id)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      )}
    </div>
  );
}
void inventoryKeys;
