"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, Store, Package, ShoppingBag, Ticket as TicketIcon,
  Banknote, Undo2, FolderTree, ShieldAlert, ScrollText, Settings, LayoutTemplate, Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/homepage", label: "Homepage", icon: LayoutTemplate },
  { href: "/admin/site", label: "Site & theme", icon: Palette },
  { href: "/admin/catalog", label: "Categories & banners", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/coupons", label: "Coupons", icon: TicketIcon },
  { href: "/admin/payouts", label: "Payouts", icon: Banknote },
  { href: "/admin/refunds", label: "Refunds", icon: Undo2 },
  { href: "/admin/moderation", label: "Moderation & tickets", icon: ShieldAlert },
  { href: "/admin/logs", label: "Audit logs", icon: ScrollText },
  { href: "/admin/settings", label: "Platform settings", icon: Settings },
];

/** Admin menu: swipeable tab row on phones, sidebar on desktop. Highlights the current page. */
export default function AdminNav() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  const current = NAV
    .filter((n) => (n.href === "/admin" ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/")))
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
      aria-label="Admin"
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
