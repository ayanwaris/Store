import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { supportTickets, ticketMessages } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  const rows = await db.execute(sql`
    select t.id, t.subject, t.status, t.priority, t.created_at as "createdAt", t.updated_at as "updatedAt",
           (select count(*) from ticket_messages m where m.ticket_id = t.id)::int as messages
    from support_tickets t
    where t.user_id = ${auth.user.id}
    order by t.updated_at desc
  `);
  return ok((rows as unknown as { rows: unknown[] }).rows);
}

const Schema = z.object({
  subject: z.string().min(4).max(140),
  body: z.string().min(4).max(4000),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const [ticket] = await db.insert(supportTickets).values({
    userId: auth.user.id, subject: data.subject.trim(),
  }).returning();
  await db.insert(ticketMessages).values({
    ticketId: ticket.id, authorId: auth.user.id, body: data.body.trim(),
  });
  return ok({ ticketId: ticket.id }, { status: 201 });
}

void desc; void eq;
