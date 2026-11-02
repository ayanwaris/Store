"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn, fmtEUR, fmtNum } from "@/lib/utils";

export type OfferRow = {
  id: string;
  sellerName: string;
  sellerSlug: string;
  sellerRating: number;
  sellerRatings: number;
  price: number;
  region: string;
  stock: number;
  sold: number;
};

export default function OfferTable({ offers }: { offers: OfferRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (offerId: string, buyNow: boolean) => {
    setBusy(offerId + (buyNow ? ":buy" : ""));
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, quantity: 1 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add to cart");
      toast.success("Added to cart");
      if (buyNow) router.push("/cart");
      else router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  if (!offers.length) {
    return <p className="p-6 text-sm text-mute">No sellers have stock right now. Check back soon or add it to your wishlist.</p>;
  }

  return (
    <div>
      {/* mobile cards */}
      <div className="space-y-2.5 p-3 md:hidden">
        {offers.map((o, i) => (
          <div key={o.id} className={cn("rounded-xl border p-3.5", i === 0 ? "border-brand/40 bg-brand/5" : "border-line bg-raised/40")}>
            <div className="flex items-center justify-between gap-3">
              <Link href={`/store/${o.sellerSlug}`} className="text-sm font-bold hover:text-brand-bright">{o.sellerName}</Link>
              <span className="text-lg font-bold font-display">{fmtEUR(o.price)}</span>
            </div>
            <p className="mt-1 text-xs text-mint flex items-center gap-1"><CheckCircle2 size={11} /> {o.sellerRating.toFixed(1)}% positive ({fmtNum(o.sellerRatings)})</p>
            <div className="mt-2.5 flex gap-2">
              <button className="btn btn-outline btn-sm flex-1" disabled={busy !== null} onClick={() => add(o.id, false)}>
                {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />} Add
              </button>
              <button className="btn btn-primary btn-sm flex-1" disabled={busy !== null} onClick={() => add(o.id, true)}>Buy now</button>
            </div>
          </div>
        ))}
      </div>

      {/* desktop table */}
      <table className="table-x hidden md:table">
        <thead>
          <tr>
            <th>Seller</th><th>Feedback</th><th>Region</th><th>Stock</th><th className="text-right">Price</th><th></th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o, i) => (
            <tr key={o.id} className={i === 0 ? "bg-brand/[0.045]" : ""}>
              <td>
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-raised text-xs font-bold text-brand">
                    {o.sellerName[0]}
                  </span>
                  <div>
                    <Link href={`/store/${o.sellerSlug}`} className="text-sm font-bold hover:text-brand-bright">{o.sellerName}</Link>
                    {i === 0 && (
                      <span className="ml-2 chip border-brand/40 bg-brand/10 text-brand-bright text-[10px]">Best offer</span>
                    )}
                    <p className="text-[11px] text-faint">{fmtNum(o.sold)} sold here</p>
                  </div>
                </div>
              </td>
              <td>
                <span className="flex items-center gap-1 text-sm text-mint">
                  <CheckCircle2 size={13} /> {o.sellerRating.toFixed(1)}%
                </span>
                <span className="text-[11px] text-faint">{fmtNum(o.sellerRatings)} ratings</span>
              </td>
              <td><span className="chip">{o.region}</span></td>
              <td>
                {o.stock < 10
                  ? <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300">{o.stock} left</span>
                  : <span className="chip text-mint border-mint/20 bg-mint/5">In stock</span>}
              </td>
              <td className="text-right">
                <span className="font-display text-lg font-bold">{fmtEUR(o.price)}</span>
              </td>
              <td className="text-right">
                <div className="flex justify-end gap-2">
                  <button className="btn btn-outline btn-sm" disabled={busy !== null} onClick={() => add(o.id, false)}>
                    {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                    <span className="hidden lg:inline">Add to cart</span>
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => add(o.id, true)}>
                    {busy === o.id + ":buy" ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Buy now
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
