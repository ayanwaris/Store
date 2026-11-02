import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sellerProfiles } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiSeller } from "@/lib/guards";

const Schema = z.object({
  storeName: z.string().min(3).max(40).optional(),
  about: z.string().max(500).optional(),
});

export async function PATCH(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;
  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  await db.update(sellerProfiles).set({
    ...(data.storeName ? { storeName: data.storeName.trim() } : {}),
    ...(data.about != null ? { about: data.about } : {}),
  }).where(eq(sellerProfiles.id, auth.sellerId));
  return ok({ updated: true });
}
