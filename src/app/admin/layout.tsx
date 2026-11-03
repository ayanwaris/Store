import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  LayoutDashboard, Users, Store, Package, ShoppingBag, Ticket as TicketIcon,
  Banknote, Undo2, FolderTree, ShieldAlert, ScrollText, Settings, ArrowLeft, LayoutTemplate, Palette,
} from "lucide-react";

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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="container-x py-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold font-display text-lg font-bold text-on-brand">
          KH
        </span>
        <div>
          <h1 className="font-display text-xl font-bold">Admin console</h1>
          <p className="text-sm text-faint">Signed in as {user.name} · every action is audit-logged</p>
        </div>
        <Link href="/" className="btn btn-outline btn-sm ml-auto"><ArrowLeft size={14} /> Marketplace</Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-mute transition hover:bg-white/4 hover:text-ink">
              <n.icon size={16} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
