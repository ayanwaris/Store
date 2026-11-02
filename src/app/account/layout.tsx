import { requireUser } from "@/lib/auth";
import Link from "next/link";
import {
  LayoutDashboard, Package, KeyRound, Heart, Star, Bell, Settings, LifeBuoy,
} from "lucide-react";

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

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-x py-8">
      <div className="mb-6 flex items-center gap-4">
        <span
          className="grid h-14 w-14 place-items-center rounded-2xl font-display text-xl font-bold text-white"
          style={{ background: `hsl(${user.avatarHue} 65% 42%)` }}
        >
          {user.name[0]?.toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-faint">{user.email}{user.role === "admin" ? " · administrator" : ""}</p>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-mute transition hover:bg-white/4 hover:text-ink [&.active]:bg-brand/10 [&.active]:text-brand-bright"
            >
              <n.icon size={16} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
