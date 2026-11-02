import { z } from "zod";
import { cookies } from "next/headers";
import { ok, fail, parseJson, rateLimit, getIp, assertSameOrigin } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";
import { BusinessError, createOrder } from "@/lib/commerce";

const Schema = z.object({ method: z.enum(["card", "paypal", "stripe", "razorpay"]) });

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  if (!rateLimit(`checkout:${auth.user.id}:${getIp(req)}`, 15)) {
    return fail("Too many checkout attempts — slow down.", 429);
  }

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const store = await cookies();
  const couponCode = store.get("kh_coupon")?.value;

  try {
    const { order, paymentRef } = await createOrder(auth.user.id, data.method, couponCode);
    const res = ok({ orderId: order.id, number: order.number, total: order.total, paymentRef }, { status: 201 });
    res.cookies.set("kh_coupon", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    if (e instanceof BusinessError) return fail(e.message, 400);
    throw e;
  }
}
