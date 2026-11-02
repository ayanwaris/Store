import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";
import { BusinessError, requestRefund } from "@/lib/commerce";

const Schema = z.object({
  orderItemId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;

  const { id } = await params;
  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const order = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0];
  if (!order || order.userId !== auth.user.id) return fail("Order not found.", 404);

  try {
    const refund = await requestRefund(auth.user.id, data.orderItemId, data.reason);
    return ok({ refundId: refund.id }, { status: 201 });
  } catch (e) {
    if (e instanceof BusinessError) return fail(e.message, 400);
    throw e;
  }
}
