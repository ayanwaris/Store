import { z } from "zod";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";
import { BusinessError, confirmOrderPayment } from "@/lib/commerce";

const Schema = z.object({
  orderId: z.string().uuid(),
  cardNumber: z.string().max(24).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  try {
    const result = await confirmOrderPayment(data.orderId, auth.user.id, { cardNumber: data.cardNumber });
    if (!result.ok) return fail(result.error ?? "Payment failed.", 402);
    return ok({ completed: true, already: !!result.already });
  } catch (e) {
    if (e instanceof BusinessError) return fail(e.message, 400);
    throw e;
  }
}
