import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import ModerationClient from "@/components/admin/ModerationClient";

export default async function AdminModeration() {
  await requireAdmin();

  const reviewRows = ((await db.execute(sql`
    select r.id, r.rating, r.comment, r.created_at as "createdAt",
           us.name as "authorName", coalesce(p.title, sp.store_name) as target,
           case when r.seller_id is not null then 'seller' else 'product' end as kind
    from reviews r
    join users us on us.id = r.author_id
    left join products p on p.id = r.product_id
    left join seller_profiles sp on sp.id = r.seller_id
    order by r.created_at desc limit 60
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  const ticketRows = ((await db.execute(sql`
    select t.id, t.subject, t.status, t.priority, t.updated_at as "updatedAt",
           us.name as "userName", us.email as "userEmail",
           (select count(*) from ticket_messages m where m.ticket_id = t.id)::int as messages
    from support_tickets t join users us on us.id = t.user_id
    order by case t.status when 'open' then 0 when 'pending' then 1 else 2 end, t.updated_at desc limit 60
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Moderation &amp; support</h2>
      <p className="mt-0.5 text-sm text-faint">Remove abusive reviews, and answer marketplace tickets as the support persona.</p>
      <ModerationClient reviews={reviewRows as never} tickets={ticketRows as never} />
    </div>
  );
}
