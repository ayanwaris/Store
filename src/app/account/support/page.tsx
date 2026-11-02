import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import SupportClient from "@/components/SupportClient";

export default async function SupportTicketsPage() {
  const user = await requireUser();
  const rows = (await db.execute(sql`
    select t.id, t.subject, t.status, t.priority, t.created_at as "createdAt", t.updated_at as "updatedAt",
           (select count(*) from ticket_messages m where m.ticket_id = t.id)::int as messages
    from support_tickets t where t.user_id = ${user.id}
    order by t.updated_at desc
  `) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Support tickets</h2>
      <p className="mt-0.5 text-sm text-faint">Real humans, fast answers. Attach order numbers for quickest help.</p>
      <SupportClient initialTickets={rows as never} />
    </div>
  );
}
void desc; void eq; void supportTickets;
