"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/**
 * One responsive Google AdSense unit.
 *
 * Only mounted by the server when the master switch, the slot switch, the publisher ID and the
 * slot ID are all valid — otherwise the whole section is not rendered. If Google decides it has
 * no ad to show ("unfilled") the section removes itself so no empty box or gap is left behind.
 * A fixed minimum height is reserved while the ad loads to limit layout shift. The ad is labelled
 * and left untouched (no overlays, no styling that disguises it) in line with AdSense policies.
 */
export default function AdSlot({ publisherId, slotId }: { publisherId: string; slotId: string }) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!pushed.current) {
      pushed.current = true;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked or already filled */ }
    }
    const obs = new MutationObserver(() => {
      if (el.getAttribute("data-ad-status") === "unfilled") setUnfilled(true);
    });
    obs.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => obs.disconnect();
  }, []);

  if (unfilled) return null;

  return (
    <section className="container-x mt-10" aria-label="Advertisement">
      <Script
        id="adsense-loader"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`}
      />
      <div className="mx-auto w-full max-w-[970px]">
        <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">Advertisement</p>
        <div className="min-h-[100px] overflow-hidden rounded-xl border border-line bg-card/60">
          <ins
            ref={ref}
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={publisherId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </section>
  );
}
