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
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display font-bold">Order history</h2>
        <p className="mt-0.5 text-xs text-faint">Every purchase, its status, and its digital delivery.</p>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center p-12 text-center">
          <Package size={36} className="text-faint" />
          <p className="mt-3 font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-mute">Grab a deal and it will land here.</p>
          <Link href="/search?sort=popular" className="btn btn-primary btn-sm mt-4">Browse bestsellers</Link>
        </div>
      ) : (
        <table className="table-x">
          <thead><tr><th>Order</th><th>Placed</th><th>Items</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {rows.map(({ order, items }) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/order/${order.number}`} className="font-semibold hover:text-brand-bright">{order.number}</Link>
                </td>
                <td className="text-mute">{formatDate(order.createdAt)}</td>
                <td className="text-mute">{items}</td>
                <td><span className={`chip border text-[10px] ${statusTone(order.status)}`}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span></td>
                <td className="text-right font-display font-bold">{fmtEUR(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { count, sql as drizzleSql } from "drizzle-orm";
const dbItemsCount = drizzleSql<number>`(select count(*) from order_items oi where oi.order_id = ${orders.id})`.mapWith(Number);
void count; void orderItems;
