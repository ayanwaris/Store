"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, ShoppingCart, Trash2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { fmtEUR } from "@/lib/utils";
import CoverArt from "./CoverArt";
import ProductCard from "./ProductCard";
import type { ProductCard as PCard } from "@/lib/commerce";

type Item = {
  itemId: string; offerId: string; title: string; slug: string; platform: string; kind: string;
  coverHue: number; sellerName: string; sellerSlug: string; region: string;
  price: number; quantity: number; stock: number; valid: boolean;
};

export default function CartClient({ items, totals, coupon, suggestions }: {
  items: Item[];
  totals: { subtotal: number; discount: number; fee: number; total: number };
  coupon: { code?: string; error?: string; raw?: string };
  suggestions: PCard[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState(coupon.raw ?? coupon.code ?? "");
  const [couponBusy, setCouponBusy] = useState(false);

  const update = async (itemId: string, action: { quantity?: number; remove?: boolean }) => {
    setBusy(itemId);
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: action.remove ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action.remove ? undefined : JSON.stringify({ quantity: action.quantity }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Invalid coupon");
      toast.success(`Coupon ${json.data.code} applied — you save ${fmtEUR(json.data.discount)}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid coupon");
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = async () => {
    await fetch("/api/coupons/validate", { method: "DELETE" });
    setCouponInput("");
    router.refresh();
  };

  if (!items.length) {
    return (
      <div className="mt-6">
        <div className="card flex flex-col items-center p-8 text-center sm:p-14">
          <ShoppingCart size={42} className="text-faint" />
          <p className="mt-4 font-display text-lg font-bold">Your cart is empty</p>
          <p className="mt-1 max-w-sm text-sm text-mute">Compare sellers, grab a deal, and your keys will be one click away.</p>
          <Link href="/search?sort=popular" className="btn btn-primary mt-6">Browse bestsellers</Link>
        </div>
        <h2 className="mt-10 font-display text-lg font-bold">Popular right now</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {suggestions.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-6 pb-24 sm:mt-6 lg:grid-cols-[1fr_360px] lg:pb-0">
      {/* items */}
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.itemId} className="card flex gap-3 p-3 sm:items-center sm:gap-4 sm:p-3.5">
            <Link href={`/product/${i.slug}`} className="shrink-0">
              <CoverArt title={i.title} hue={i.coverHue} platform={i.platform} kind={i.kind} className="h-20 w-16 rounded-lg" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${i.slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-brand-bright sm:line-clamp-1">{i.title}</Link>
              <p className="mt-0.5 text-xs text-faint">
                Sold by <Link href={`/store/${i.sellerSlug}`} className="text-mute hover:text-brand-bright">{i.sellerName}</Link>
                {" "}· {i.region}
              </p>
              {!i.valid && <p className="mt-1 text-xs font-semibold text-rose-300">No longer available</p>}
              {i.valid && i.stock < i.quantity && (
                <p className="mt-1 text-xs font-semibold text-amber-300">Only {i.stock} left — quantity will be adjusted</p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2 sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <button
                    className="btn btn-outline btn-sm min-w-10 !px-2"
                    disabled={busy === i.itemId || i.quantity <= 1}
                    onClick={() => update(i.itemId, { quantity: i.quantity - 1 })}
                    aria-label="Decrease"
                  ><Minus size={13} /></button>
                  <span className="w-8 text-center text-sm font-bold">{i.quantity}</span>
                  <button
                    className="btn btn-outline btn-sm min-w-10 !px-2"
                    disabled={busy === i.itemId || i.quantity >= Math.min(i.stock, 10)}
                    onClick={() => update(i.itemId, { quantity: i.quantity + 1 })}
                    aria-label="Increase"
                  ><Plus size={13} /></button>
                  <button
                    className="btn btn-ghost btn-sm min-w-10 text-rose-300"
                    disabled={busy === i.itemId}
                    onClick={() => update(i.itemId, { remove: true })}
                    aria-label="Remove"
                  >
                    {busy === i.itemId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
                {/* phones: the line price sits next to the quantity controls */}
                <p className="font-display text-base font-bold sm:hidden">{fmtEUR(i.price * i.quantity)}</p>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <p className="font-display text-lg font-bold">{fmtEUR(i.price * i.quantity)}</p>
              {i.quantity > 1 && <p className="text-[11px] text-faint">{fmtEUR(i.price)} each</p>}
            </div>
          </div>
        ))}
        <Link href="/search" className="btn btn-ghost btn-sm">← Continue shopping</Link>
      </div>

      {/* summary */}
      <div className="lg:sticky lg:top-36 h-fit">
        <div className="card p-4 sm:p-5">
          <h2 className="font-display font-bold">Order summary</h2>

          {coupon.code ? (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-mint/25 bg-mint/5 px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-mint">
                <Tag size={14} /> {coupon.code}
              </span>
              <button onClick={removeCoupon} className="text-faint hover:text-ink" aria-label="Remove coupon"><X size={15} /></button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex gap-2">
                <input
                  className="input min-w-0 flex-1 uppercase"
                  placeholder="Coupon code (try WELCOME10)"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <button className="btn btn-outline" onClick={applyCoupon} disabled={couponBusy}>
                  {couponBusy ? <Loader2 size={15} className="animate-spin" /> : "Apply"}
                </button>
              </div>
              {coupon.error && coupon.raw && <p className="mt-1.5 text-xs text-rose-300">{coupon.raw}: {coupon.error}</p>}
            </div>
          )}

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="font-semibold">{fmtEUR(totals.subtotal)}</dd></div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-mint"><dt>Coupon savings</dt><dd className="font-semibold">−{fmtEUR(totals.discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-mute">Service &amp; processing fee</dt><dd className="font-semibold">{fmtEUR(totals.fee)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-display text-xl font-bold text-brand-bright">{fmtEUR(totals.total)}</dd>
            </div>
          </dl>

          <Link href="/checkout" className="btn btn-primary btn-lg mt-5 w-full">
            Proceed to checkout
          </Link>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
            Instant key delivery after payment. Buyer protection included on every order.
          </p>
        </div>
      </div>

      {/* phones: total + checkout always within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 backdrop-blur lg:hidden">
        <div className="container-x flex items-center gap-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">Total</p>
            <p className="font-display text-lg font-bold leading-tight text-brand-bright">{fmtEUR(totals.total)}</p>
          </div>
          <Link href="/checkout" className="btn btn-primary ml-auto flex-1 sm:max-w-xs sm:flex-none">Checkout</Link>
        </div>
      </div>
    </div>
  );
}
