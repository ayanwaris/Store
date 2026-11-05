"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LayoutDashboard, Tag, PlusCircle, ShoppingBag, Banknote, Star, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/seller", label: "Overview", icon: LayoutDashboard },
  { href: "/seller/offers", label: "Offers", icon: Tag },
  { href: "/seller/offers/new", label: "New listing", icon: PlusCircle },
  { href: "/seller/orders", label: "Sales", icon: ShoppingBag },
  { href: "/seller/payouts", label: "Payouts", icon: Banknote },
  { href: "/seller/reviews", label: "Reviews", icon: Star },
  { href: "/seller/settings", label: "Store settings", icon: Settings },
];

/** Seller menu: swipeable tab row on phones, sidebar on desktop. Highlights the current page. */
export default function SellerNav() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  // the most specific match wins, so /seller/offers/new highlights "New listing" and not "Offers"
  const current = NAV
    .filter((n) => (n.href === "/seller" ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // phones: keep the current tab centred in the swipeable row
  useEffect(() => {
    const nav = ref.current;
    const el = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !el || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [current]);

  return (
    <nav
      ref={ref}
      aria-label="Seller"
      className="no-scrollbar fade-r -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {NAV.map((n) => {
        const active = n.href === current;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
              active ? "bg-brand/10 text-brand-bright" : "text-mute hover:bg-white/4 hover:text-ink",
            )}
          >
            <n.icon size={16} /> {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
