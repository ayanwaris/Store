"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard, Package, KeyRound, Heart, Star, Bell, Settings, LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/library", label: "My keys", icon: KeyRound },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/reviews", label: "My reviews", icon: Star },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
];

/** Account menu: a swipeable tab row on phones, a sidebar on desktop. Highlights the current page. */
export default function AccountNav() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  // phones: keep the current tab centred in the swipeable row
  useEffect(() => {
    const nav = ref.current;
    const el = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !el || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [pathname]);

  return (
    <nav
      ref={ref}
      aria-label="Account"
      className="no-scrollbar fade-r -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {NAV.map((n) => {
        const active = n.href === "/account" ? pathname === n.href : pathname.startsWith(n.href);
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
