import Link from "next/link";
import { ShieldCheck, Zap } from "lucide-react";
import CoverArt from "./CoverArt";
import RatingStars from "./RatingStars";
import { cn, fmtEUR, KIND_LABEL } from "@/lib/utils";
import type { ProductCard as PCard } from "@/lib/commerce";

const LOW_STOCK = 5;

/**
 * Marketplace product card. Every card has the same structure so grids stay aligned:
 * artwork (fixed aspect ratio) → category → title (2 lines max) → platform/region →
 * product + seller rating → price block pinned to the bottom.
 * `landscape` swaps the artwork to a wider ratio for hero / spotlight layouts.
 */
export default function ProductCard({ p, variant = "default" }: { p: PCard; variant?: "default" | "landscape" }) {
  const discount =
    p.minPrice != null && p.rrp > p.minPrice
      ? Math.round(((p.rrp - p.minPrice) / p.rrp) * 100)
      : 0;
  const hasOffers = p.minPrice != null;
  const outOfStock = !hasOffers || p.stock <= 0;
  const lowStock = !outOfStock && p.stock <= LOW_STOCK;

  return (
    <Link href={`/product/${p.slug}`} className="card hover-lift group flex h-full min-w-0 flex-col overflow-hidden active:scale-[0.985] sm:active:scale-100">
      <div className="relative">
        <CoverArt
          title={p.title} hue={p.coverHue} platform={p.platform} kind={p.kind}
          className={cn("w-full rounded-none", variant === "landscape" ? "aspect-[16/10]" : "aspect-[4/4.4]")}
        />
        {discount > 4 && (
          <span className="bg-gold text-on-brand absolute left-2 top-2 sm:left-2.5 sm:top-2.5 rounded-lg px-2 py-0.5 text-xs font-bold shadow-lg shadow-black/25">
            −{discount}%
          </span>
        )}
        {hasOffers && !outOfStock && (
          <span
            className="chip absolute right-2 top-2 backdrop-blur sm:right-2.5 sm:top-2.5"
            // always sits on the dark cover art, so it keeps fixed light-on-dark colours in both themes
            style={{ color: "#6ee7b7", background: "rgba(0,0,0,0.62)", borderColor: "rgba(255,255,255,0.16)" }}
          >
            <Zap size={10} /> Instant
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className="chip">{KIND_LABEL[p.kind] ?? p.kind}</span>
        </div>
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug transition-colors group-hover:text-brand-bright">
          {p.title}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-faint">
          {p.platform} · {p.region === "GLOBAL" ? "Global" : p.region}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <RatingStars value={p.ratingAvg} count={p.ratingCount} />
          {p.sellerRating != null && p.sellerRating > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-mute" title="Rating of the seller with the lowest price">
              <ShieldCheck size={12} className="text-mint" /> {p.sellerRating.toFixed(1)}% seller
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-col items-start gap-1 pt-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
          {hasOffers ? (
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                From {p.offerCount} seller{p.offerCount === 1 ? "" : "s"}
              </p>
              <p className={cn("flex flex-wrap items-baseline gap-x-2 font-display text-lg font-bold leading-tight text-ink", outOfStock && "opacity-60")}>
                {fmtEUR(p.minPrice!)}
                {discount > 4 && (
                  <span className="text-xs font-medium text-faint line-through">{fmtEUR(p.rrp)}</span>
                )}
              </p>
            </div>
          ) : (
            <span className="text-sm font-medium text-faint">Out of stock</span>
          )}
          <div className="flex shrink-0 flex-wrap gap-x-2 text-[10px] leading-tight sm:block sm:text-right">
            {hasOffers && outOfStock && <p className="font-semibold text-rose-300">Out of stock</p>}
            {lowStock && <p className="font-semibold text-amber-300">Only {p.stock} left</p>}
            {p.sold > 0 && <p className="text-faint">{p.sold.toLocaleString()} sold</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}
