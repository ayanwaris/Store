import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventoryKeys, offers } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin, rateLimit } from "@/lib/api";
import { requireApiSeller } from "@/lib/guards";

async function ownedOffer(id: string, sellerId: string) {
  const rows = await db.select().from(offers)
    .where(and(eq(offers.id, id), eq(offers.sellerId, sellerId))).limit(1);
  return rows[0] ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;
  const { id } = await params;
  const offer = await ownedOffer(id, auth.sellerId);
  if (!offer) return fail("Offer not found.", 404);

  const counts = await db.execute(sql`
    select status, count(*)::int as n from inventory_keys where offer_id = ${id} group by status
  `);
  const recent = await db.select({
    id: inventoryKeys.id, code: inventoryKeys.code, status: inventoryKeys.status,
    reservedAt: inventoryKeys.reservedAt, soldAt: inventoryKeys.soldAt,
  }).from(inventoryKeys)
    .where(eq(inventoryKeys.offerId, id))
    .orderBy(asc(inventoryKeys.status), asc(inventoryKeys.code))
    .limit(300);

  return ok({
    counts: (counts as unknown as { rows: Array<{ status: string; n: number }> }).rows,
    keys: recent,
  });
}

const Schema = z.object({ codes: z.array(z.string()).min(1).max(500) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;
  if (!rateLimit(`keys:${auth.user.id}`, 20)) return fail("Uploading too fast — wait a moment.", 429);
  const { id } = await params;

  const offer = await ownedOffer(id, auth.sellerId);
  if (!offer) return fail("Offer not found.", 404);

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const normalized = [...new Set(
    data.codes.map((c) => c.trim().toUpperCase()).filter((c) => c.length >= 5 && c.length <= 64),
  )];
  if (!normalized.length) return fail("No valid keys found (5–64 chars each).", 422);

  const added = await db.transaction(async (tx) => {
    // skip codes that already exist on ANY offer (keys must be globally unique in practice)
    const existing = await tx.execute(sql`
      select code from inventory_keys where code = any(${normalized})
    `);
    const taken = new Set(((existing as unknown as { rows: Array<{ code: string }> }).rows).map((r) => r.code));
    const fresh = normalized.filter((c) => !taken.has(c));
    if (fresh.length) {
      await tx.insert(inventoryKeys).values(
        fresh.map((code) => ({ offerId: id, code, status: "available" as const })),
      );
    }
    await tx.execute(sql`
      update offers set stock_count =
        (select count(*) from inventory_keys where offer_id = ${id} and status = 'available')
      where id = ${id}
    `);
    return { added: fresh.length, skipped: normalized.length - fresh.length };
  });

  return ok(added, { status: 201 });
}
