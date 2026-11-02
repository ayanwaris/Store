import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { ok } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;

  const rows = await db.execute(sql`
    select o.id, o.number, o.status, o.total, o.created_at as "createdAt", o.paid_at as "paidAt",
           count(oi.id)::int as items
    from orders o
    left join order_items oi on oi.order_id = o.id
    where o.user_id = ${auth.user.id}
    group by o.id
    order by o.created_at desc
    limit 50
  `);
  const list = (rows as unknown as { rows: Array<Record<string, unknown>> }).rows
    .map((r) => ({ ...r, total: Number(r.total) }));
  return ok(list);
}
void eq; void desc; void orderItems; void orders;
