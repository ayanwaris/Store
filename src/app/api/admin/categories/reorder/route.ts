import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiAdmin } from "@/lib/guards";
import { logAudit } from "@/lib/ops";

const Body = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

/** Persist a new category order (drag-and-drop in Admin → Categories). `ids` is the full list, first = top. */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;
  const { data, resp } = await parseJson(req, Body);
  if (!data) return resp!;
  if (new Set(data.ids).size !== data.ids.length) return fail("Duplicate ids.", 422);

  await db.transaction(async (tx) => {
    for (let i = 0; i < data.ids.length; i++) {
      await tx.update(categories).set({ position: i }).where(eq(categories.id, data.ids[i]));
    }
  });
  await logAudit({ actorId: auth.user.id, action: "category.reorder", entity: "category", meta: { count: data.ids.length } });
  return ok({ reordered: true });
}
