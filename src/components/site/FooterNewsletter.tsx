"use client";

import { usePathname } from "next/navigation";
import NewsletterForm from "@/components/NewsletterForm";
import type { NewsletterConfig } from "@/lib/site-config";

/** Newsletter band in the footer. Hidden on "/" when the homepage already shows its own newsletter section. */
export default function FooterNewsletter({ config, hideOnHome }: { config: NewsletterConfig; hideOnHome: boolean }) {
  const pathname = usePathname();
  if (!config.enabled || (hideOnHome && pathname === "/")) return null;
  return (
    <div className="border-b border-line">
      <div className="container-x flex flex-col items-center gap-5 py-10 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <h3 className="font-display text-xl font-bold">{config.heading}</h3>
          {config.description && <p className="mt-1 text-sm text-mute">{config.description}</p>}
        </div>
        <NewsletterForm config={config} source="footer" />
      </div>
    </div>
  );
}
