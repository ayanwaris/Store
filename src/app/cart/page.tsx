import { cookies } from "next/headers";
import type { Metadata } from "next";
import { CART_COOKIE } from "@/lib/auth";
import { getCartItems, getProductCards, validateCoupon } from "@/lib/commerce";
import { getFeeConfig } from "@/lib/ops";
import CartClient from "@/components/CartClient";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  const couponCode = store.get("kh_coupon")?.value;

  const items = (await getCartItems(token)).map((i) => ({
    itemId: i.itemId, offerId: i.offerId, title: i.title, slug: i.slug,
    platform: i.platform, kind: i.kind, coverHue: i.coverHue,
    sellerName: i.sellerName, sellerSlug: i.sellerSlug, sellerRating: Number(i.sellerRating),
    region: i.region, price: i.price, quantity: i.quantity, stock: i.stock,
    valid: i.offerActive && i.productActive && i.stock >= 0,
  }));

  const subtotal = Math.round(items.reduce((a, i) => a + i.price * i.quantity, 0) * 100) / 100;
  const fees = await getFeeConfig();
  let discount = 0;
  let appliedCoupon: string | undefined;
  let couponError: string | undefined;
  if (couponCode && subtotal > 0) {
    try {
      const v = await validateCoupon(couponCode, subtotal);
      discount = v.discount;
      appliedCoupon = v.coupon.code;
    } catch (e) {
      couponError = e instanceof Error ? e.message : "Coupon invalid";
    }
  }
  const fee = subtotal > 0 ? Math.round(((subtotal - discount) * fees.percent) / 100 * 100) / 100 + fees.fixed : 0;
  const total = Math.max(0, Math.round((subtotal - discount + fee) * 100) / 100);

  const inCart = new Set(items.map((i) => i.slug));
  const suggestions = (await getProductCards({ sort: "popular", limit: 8 }))
    .filter((p) => !inCart.has(p.slug)).slice(0, 6);

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">Your cart</h1>
      <p className="mt-1 text-sm text-mute">{items.length} item{items.length === 1 ? "" : "s"}</p>
      <CartClient
        items={items}
        totals={{ subtotal, discount, fee, total }}
        coupon={{ code: appliedCoupon, error: couponError, raw: couponCode }}
        suggestions={suggestions}
      />
    </div>
  );
}
