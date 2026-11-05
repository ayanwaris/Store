import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fmtEUR, formatDate, ORDER_STATUS_LABEL, statusTone } from "@/lib/utils";
import { Package } from "lucide-react";

export default async function OrdersPage() {
  const user = await requireUser();
  const rows = await db
    .select({ order: orders, items: dbItemsCount })
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
        <h2 className="font-display font-bold">Order history</h2>
        <p className="mt-0.5 text-xs text-faint">Every purchase, its status, and its digital delivery.</p>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center p-8 text-center sm:p-12">
          <Package size={36} className="text-faint" />
          <p className="mt-3 font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-mute">Grab a deal and it will land here.</p>
          <Link href="/search?sort=popular" className="btn btn-primary btn-sm mt-4">Browse bestsellers</Link>
        </div>
      ) : (
        <div className="p-3 sm:p-0">
        <table className="table-x table-stack">
          <thead><tr><th>Order</th><th>Placed</th><th>Items</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {rows.map(({ order, items }) => (
              <tr key={order.id}>
                <td data-label="Order">
                  <Link href={`/order/${order.number}`} className="font-semibold hover:text-brand-bright">{order.number}</Link>
                </td>
                <td data-label="Placed" className="text-mute">{formatDate(order.createdAt)}</td>
                <td data-label="Items" className="text-mute">{items}</td>
                <td data-label="Status"><span className={`chip border text-[10px] ${statusTone(order.status)}`}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span></td>
                <td data-label="Total" className="text-right font-display font-bold">{fmtEUR(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

import { count, sql as drizzleSql } from "drizzle-orm";
const dbItemsCount = drizzleSql<number>`(select count(*) from order_items oi where oi.order_id = ${orders.id})`.mapWith(Number);
void count; void orderItems;
