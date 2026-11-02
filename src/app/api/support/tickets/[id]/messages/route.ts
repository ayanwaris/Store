import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { supportTickets, ticketMessages, users } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";

async function loadTicket(id: string, userId: string, isAdmin: boolean) {
  const ticket = (await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1))[0];
  if (!ticket || (ticket.userId !== userId && !isAdmin)) return null;
  return ticket;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  const { id } = await params;
  const ticket = await loadTicket(id, auth.user.id, auth.user.role === "admin");
  if (!ticket) return fail("Ticket not found.", 404);

  const msgs = await db
    .select({
      id: ticketMessages.id, body: ticketMessages.body, createdAt: ticketMessages.createdAt,
      authorName: users.name, authorRole: users.role, authorHue: users.avatarHue,
    })
    .from(ticketMessages)
    .innerJoin(users, eq(users.id, ticketMessages.authorId))
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(asc(ticketMessages.createdAt));
  return ok({ ticket, messages: msgs });
}

const Schema = z.object({ body: z.string().min(1).max(4000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  const { id } = await params;

  const ticket = await loadTicket(id, auth.user.id, auth.user.role === "admin");
  if (!ticket) return fail("Ticket not found.", 404);
  if (ticket.status === "closed") return fail("This ticket is closed.", 409);

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const isAdmin = auth.user.role === "admin";
  await db.insert(ticketMessages).values({
    ticketId: id, authorId: auth.user.id, body: data.body.trim(),
  });
  await db.update(supportTickets)
    .set({ updatedAt: new Date(), status: isAdmin ? "pending" : "open" })
    .where(eq(supportTickets.id, id));
  return ok({ sent: true }, { status: 201 });
}
