import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { ok, fail, assertSameOrigin } from "@/lib/api";
import { requireApiAdmin } from "@/lib/guards";
import { logAudit } from "@/lib/ops";

/** GET → subscribers (latest 500) + total.  GET ?format=csv → CSV export.  DELETE ?id= → remove one. */
export async function GET(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;
  const url = new URL(req.url);

  if (url.searchParams.get("format") === "csv") {
    const rows = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt));
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    // prefix risky leading characters so spreadsheets never treat an address as a formula
    const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
    const csv = ["email,status,source,subscribed_at",
      ...rows.map((r) => [esc(safe(r.email)), r.status, r.source, r.createdAt.toISOString()].join(","))].join("\n");
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="newsletter-subscribers.csv"' },
    });
  }

  const [rows, total] = await Promise.all([
    db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(500),
    db.select({ n: sql<number>`count(*)::int` }).from(newsletterSubscribers),
  ]);
  return ok({ total: total[0]?.n ?? 0, subscribers: rows });
}

export async function DELETE(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid id.", 422);
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
  await logAudit({ actorId: auth.user.id, action: "newsletter.remove", entity: "newsletter_subscriber", entityId: id });
  return ok({ deleted: true });
}
