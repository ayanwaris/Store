import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ok } from "@/lib/api";
import { requireApiAdmin } from "@/lib/guards";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;

  const [kpisRaw, byDayRaw, topRaw, recentRaw] = await Promise.all([
    db.execute(sql`
      select
        (select coalesce(sum(total),0)::float8 from orders where status in ('completed','partially_refunded','refunded')) as "grossVolume",
        (select coalesce(sum(amount),0)::float8 from transactions where kind = 'commission') as "platformRevenue",
        (select count(*)::int from orders) as orders,
        (select count(*)::int from users) as users,
        (select count(*)::int from seller_profiles where status = 'approved') as "activeSellers",
        (select count(*)::int from seller_profiles where status = 'pending') as "pendingSellers",
        (select count(*)::int from support_tickets where status != 'closed') as "openTickets",
        (select count(*)::int from refunds where status = 'pending') as "pendingRefunds"
    `),
    db.execute(sql`
      select to_char(date_trunc('day', created_at), 'Mon DD') as day,
             coalesce(sum(amount) filter (where kind = 'commission'), 0)::float8 as revenue,
             coalesce(sum(amount) filter (where kind = 'sale'), 0)::float8 as "sellerSales"
      from transactions
      where created_at > now() - interval '14 days'
      group by 1 order by min(date_trunc('day', created_at))
    `),
    db.execute(sql`
      select p.title, sum(oi.quantity)::int as qty,
             sum(oi.price * oi.quantity)::float8 as revenue
      from order_items oi
      join products p on p.id = oi.product_id
      group by p.title
      order by qty desc
      limit 6
    `),
    db.execute(sql`
      select o.number, o.status, o.total::float8 as total, o.created_at as "createdAt",
             u.name as "buyerName"
      from orders o join users u on u.id = o.user_id
      order by o.created_at desc limit 8
    `),
  ]);

  const first = (r: unknown) => (r as unknown as { rows: Array<Record<string, unknown>> }).rows;
  return ok({
    kpis: first(kpisRaw)[0],
    revenueByDay: first(byDayRaw),
    topProducts: first(topRaw),
    recentOrders: first(recentRaw),
  });
}
