"use client";

import { useEffect, useState } from "react";
import AddBestButton from "@/components/product/AddBestButton";
import { cn, fmtEUR } from "@/lib/utils";

/**
 * Phones only: once the price panel (id = targetId) has scrolled up out of view, a bar with the best price
 * and an "Add best offer" button slides up from the bottom so buying never needs a scroll back up.
 */
export default function StickyBuyBar({ targetId, price, offerId }: { targetId: string; price: number; offerId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <div
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 backdrop-blur transition-[transform,visibility] duration-200 md:hidden",
        show ? "visible translate-y-0" : "invisible translate-y-full",
      )}
    >
      <div className="container-x flex items-center gap-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">Best price</p>
          <p className="font-display text-lg font-bold leading-tight">{fmtEUR(price)}</p>
        </div>
        <AddBestButton offerId={offerId} className="ml-auto max-w-[16rem] flex-1" />
      </div>
    </div>
  );
}
