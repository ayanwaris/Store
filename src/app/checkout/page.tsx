import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CART_COOKIE, requireUser } from "@/lib/auth";
import { getCartItems, validateCoupon } from "@/lib/commerce";
import { getFeeConfig } from "@/lib/ops";
import CheckoutClient from "@/components/CheckoutClient";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser();
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  const couponCode = store.get("kh_coupon")?.value;

  const rawItems = await getCartItems(token);
  const items = rawItems
    .filter((i) => i.offerActive && i.productActive)
    .map((i) => ({
      itemId: i.itemId, offerId: i.offerId, title: i.title, slug: i.slug,
      platform: i.platform, sellerName: i.sellerName, price: i.price,
      quantity: Math.min(i.quantity, i.stock), coverHue: i.coverHue,
    }))
    .filter((i) => i.quantity > 0);
  if (!items.length) redirect("/cart");

  const subtotal = Math.round(items.reduce((a, i) => a + i.price * i.quantity, 0) * 100) / 100;
  let discount = 0;
  let applied: string | undefined;
  if (couponCode) {
    try {
      const v = await validateCoupon(couponCode, subtotal);
      discount = v.discount;
      applied = v.coupon.code;
    } catch { /* invalid coupons ignored at checkout */ }
  }
  const fees = await getFeeConfig();
  const fee = Math.round(((subtotal - discount) * fees.percent) / 100 * 100) / 100 + fees.fixed;
  const total = Math.round((subtotal - discount + fee) * 100) / 100;

  return (
    <div className="container-x py-8">
      <CheckoutClient
        userName={user.name}
        items={items}
        totals={{ subtotal, discount, fee, total }}
        couponCode={applied}
      />
    </div>
  );
}
