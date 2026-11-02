import { z } from "zod";
import { cookies } from "next/headers";
import { ok, fail, parseJson } from "@/lib/api";
import { CART_COOKIE } from "@/lib/auth";
import { BusinessError, getCartItems, validateCoupon } from "@/lib/commerce";
import { getFeeConfig } from "@/lib/ops";

const Schema = z.object({ code: z.string().min(2).max(32) });

export async function POST(req: Request) {
  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const store = await cookies();
  const items = await getCartItems(store.get(CART_COOKIE)?.value);
  const subtotal = Math.round(items.reduce((a, i) => a + i.price * i.quantity, 0) * 100) / 100;

  try {
    const { coupon, discount } = await validateCoupon(data.code, subtotal);
    const fees = await getFeeConfig();
    const fee = Math.round(((subtotal - discount) * fees.percent) / 100 * 100) / 100 + fees.fixed;
    const total = Math.round((subtotal - discount + fee) * 100) / 100;
    const res = ok({ code: coupon.code, discount, subtotal, fee, total });
    res.cookies.set("kh_coupon", coupon.code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
    return res;
  } catch (e) {
    if (e instanceof BusinessError) return fail(e.message, 422);
    throw e;
  }
}

export async function DELETE() {
  const res = ok({ cleared: true });
  res.cookies.set("kh_coupon", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
