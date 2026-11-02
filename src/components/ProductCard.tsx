import Link from "next/link";
import { Zap } from "lucide-react";
import CoverArt from "./CoverArt";
import RatingStars from "./RatingStars";
import { fmtEUR, KIND_LABEL } from "@/lib/utils";
import type { ProductCard as PCard } from "@/lib/commerce";

export default function ProductCard({ p }: { p: PCard }) {
  const discount =
    p.minPrice != null && p.rrp > p.minPrice
      ? Math.round(((p.rrp - p.minPrice) / p.rrp) * 100)
      : 0;

  return (
    <Link href={`/product/${p.slug}`} className="card hover-lift group block overflow-hidden">
      <div className="relative">
        <CoverArt title={p.title} hue={p.coverHue} platform={p.platform} kind={p.kind} className="aspect-[4/4.4] w-full rounded-none" />
        {discount > 4 && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-gradient-to-br from-brand-bright to-brand-deep px-2 py-0.5 text-xs font-bold text-white shadow-lg shadow-brand/30">
            −{discount}%
          </span>
        )}
        {p.minPrice != null && (
          <span className="absolute right-2.5 top-2.5 chip bg-black/60 backdrop-blur text-mint border-mint/20">
            <Zap size={10} /> Instant
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="chip">{KIND_LABEL[p.kind] ?? p.kind}</span>
          {p.region !== "GLOBAL" && <span className="chip text-sky-300 border-sky-400/20 bg-sky-400/5">{p.region}</span>}
        </div>
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug transition-colors group-hover:text-brand-bright">
          {p.title}
        </h3>
        <RatingStars value={p.ratingAvg} count={p.ratingCount} className="mt-1.5" />
        <div className="mt-2.5 flex items-end justify-between">
          {p.minPrice != null ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                From {p.offerCount} seller{p.offerCount === 1 ? "" : "s"}
              </p>
              <p className="font-display text-lg font-bold leading-tight text-ink">
                {fmtEUR(p.minPrice)}
                {discount > 4 && (
                  <span className="ml-2 text-xs font-medium text-faint line-through">{fmtEUR(p.rrp)}</span>
                )}
              </p>
            </div>
          ) : (
            <span className="text-sm text-faint">Out of stock</span>
          )}
          {p.sold > 0 && <span className="text-[10px] text-faint">{p.sold.toLocaleString()} sold</span>}
        </div>
      </div>
    </Link>
  );
}
