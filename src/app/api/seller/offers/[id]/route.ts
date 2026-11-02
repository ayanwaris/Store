import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { offers } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiSeller } from "@/lib/guards";
import { REGIONS } from "@/lib/utils";

const Schema = z.object({
  price: z.number().min(0.49).max(5000).optional(),
  active: z.boolean().optional(),
  region: z.enum(REGIONS).optional(),
});

async function ownedOffer(id: string, sellerId: string) {
  const rows = await db.select().from(offers)
    .where(and(eq(offers.id, id), eq(offers.sellerId, sellerId))).limit(1);
  return rows[0] ?? null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;
  const { id } = await params;
  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const offer = await ownedOffer(id, auth.sellerId);
  if (!offer) return fail("Offer not found.", 404);

  await db.update(offers).set({
    ...(data.price != null ? { price: data.price } : {}),
    ...(data.active != null ? { active: data.active } : {}),
    ...(data.region ? { region: data.region } : {}),
  }).where(eq(offers.id, id));
  return ok({ updated: true });
}

/** "Delete" = deactivate, since sold history references the row. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;
  const { id } = await params;
  const offer = await ownedOffer(id, auth.sellerId);
  if (!offer) return fail("Offer not found.", 404);
  await db.update(offers).set({ active: false }).where(eq(offers.id, id));
  return ok({ deactivated: true });
}
