import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isExternal, isSafeUrl, type PromoBanner as PromoConfig } from "@/lib/site-config";

/**
 * Sticky promotional strip rendered above the navbar. The parent only renders it when the
 * banner is enabled, configured and inside its display period — so when it is hidden there is
 * no element at all and the navbar simply sits at the very top.
 */
export default function PromoBanner({ promo }: { promo: PromoConfig }) {
  const style =
    promo.style === "custom"
      ? { background: promo.bgColor, color: promo.textColor }
      : promo.style === "dark"
        ? { background: "var(--kh-ink)", color: "var(--kh-bg)" }
        : { background: "linear-gradient(90deg, var(--kh-gold-b), var(--kh-gold-a) 50%, var(--kh-gold-b))", color: "var(--kh-on-brand)" };

  const href = promo.linkUrl && isSafeUrl(promo.linkUrl) ? promo.linkUrl : "";
  const label = promo.linkLabel.trim();
  const content = (
    <span className="mx-auto flex max-w-full items-center justify-center gap-2 text-center text-[13px] font-semibold leading-snug">
      <span className="min-w-0 [overflow-wrap:anywhere]">{promo.text}</span>
      {href && label && (
        <span className="inline-flex shrink-0 items-center gap-1 underline underline-offset-2">
          {label} <ArrowRight size={13} />
        </span>
      )}
    </span>
  );

  return (
    <div role="region" aria-label="Announcement" className="relative z-10" style={style}>
      <div className="container-x py-2">
        {href ? (
          isExternal(href) ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="block">{content}</a>
          ) : (
            <Link href={href} className="block">{content}</Link>
          )
        ) : content}
      </div>
    </div>
  );
}
