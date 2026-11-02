"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  KeyRound, ShoppingCart, Bell, Menu, ChevronDown, Store, LayoutDashboard, Package,
  Heart, LogOut, ShieldCheck, LifeBuoy, X, Gamepad2, Gift, AppWindow, BadgeCheck,
  Coins, Puzzle, Trophy, Sparkles, Tag, Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { timeAgo } from "@/lib/utils";

const CAT_ICONS: Record<string, LucideIcon> = {
  Gamepad2, Gift, AppWindow, BadgeCheck, Coins, Puzzle,
};

type Props = {
  user: { name: string; email: string; role: string; avatarHue: number; sellerStatus?: string } | null;
  categories: { name: string; slug: string; icon: string }[];
  cartCount: number;
  unread: number;
};

type Notif = { id: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string };

export default function Header({ user, categories, cartCount, unread }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [localUnread, setLocalUnread] = useState(unread);
  const pathname = usePathname();
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false); setMegaOpen(false); setAccountOpen(false); setBellOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMegaOpen(false); setAccountOpen(false); setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const openBell = async () => {
    setBellOpen((v) => !v); setAccountOpen(false); setMegaOpen(false);
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const json = await res.json();
      setNotifs(json.data ?? []);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read", { method: "POST" });
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    setLocalUnread(0);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const quickLinks = [
    { href: "/search?sort=popular", label: "Bestsellers", icon: Trophy },
    { href: "/search?sort=newest", label: "New releases", icon: Sparkles },
    { href: "/search?max=5", label: "Under €5", icon: Tag },
    { href: "/category/gift-cards", label: "Gift cards", icon: Gift },
    { href: "/search?sort=discount", label: "Hot deals", icon: Flame },
  ];

  return (
    <div ref={wrapRef} className="sticky top-0 z-40">
      {/* main bar */}
      <div className="glass border-b border-line">
        <div className="container-x flex h-16 items-center gap-3">
          <button className="btn btn-ghost btn-sm md:hidden -ml-2" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu size={20} />
          </button>

          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-bright to-brand-deep shadow-[0_6px_20px_-6px_rgba(255,122,26,0.7)] transition-transform group-hover:rotate-6">
              <KeyRound size={18} className="text-white" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              KEY<span className="text-brand">HAVEN</span>
            </span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-xl">
            <SearchBar variant="nav" />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link href="/sell" className="btn btn-ghost btn-sm hidden xl:inline-flex">
              <Store size={16} /> Sell
            </Link>

            <Link href="/cart" className="btn btn-ghost btn-sm relative" aria-label="Cart">
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {user && (
              <div className="relative">
                <button className="btn btn-ghost btn-sm relative" onClick={openBell} aria-label="Notifications">
                  <Bell size={18} />
                  {localUnread > 0 && (
                    <span className="absolute top-0.5 right-1 h-2 w-2 rounded-full bg-brand animate-pulse" />
                  )}
                </button>
                {bellOpen && (
                  <div className="card animate-pop absolute right-0 top-11 w-80 overflow-hidden shadow-2xl shadow-black/60">
                    <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                      <span className="text-sm font-semibold">Notifications</span>
                      <button onClick={markAllRead} className="text-xs font-medium text-brand hover:text-brand-bright">
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 && (
                        <p className="p-4 text-sm text-faint">You&apos;re all caught up.</p>
                      )}
                      {notifs.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href ?? "#"}
                          onClick={() => setBellOpen(false)}
                          className={`block border-b border-line-soft px-4 py-3 transition hover:bg-white/3 ${!n.read ? "bg-brand/4" : ""}`}
                        >
                          <p className="text-sm font-medium leading-snug">{n.title}</p>
                          {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-mute">{n.body}</p>}
                          <p className="mt-1 text-[10px] text-faint">{timeAgo(n.createdAt)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => { setAccountOpen((v) => !v); setBellOpen(false); setMegaOpen(false); }}
                  className="flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1.5 transition hover:border-line hover:bg-white/4"
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white"
                    style={{ background: `hsl(${user.avatarHue} 70% 45%)` }}
                  >
                    {user.name[0]?.toUpperCase()}
                  </span>
                  <ChevronDown size={14} className="text-mute" />
                </button>
                {accountOpen && (
                  <div className="card animate-pop absolute right-0 top-12 w-64 overflow-hidden shadow-2xl shadow-black/60">
                    <div className="border-b border-line px-4 py-3">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-faint">{user.email}</p>
                    </div>
                    <nav className="p-1.5 text-sm">
                      {[
                        { href: "/account", label: "Dashboard", icon: LayoutDashboard },
                        { href: "/account/orders", label: "My orders", icon: Package },
                        { href: "/account/library", label: "My keys", icon: KeyRound },
                        { href: "/account/wishlist", label: "Wishlist", icon: Heart },
                        ...(user.sellerStatus === "approved"
                          ? [{ href: "/seller", label: "Seller dashboard", icon: Store }]
                          : [{ href: "/sell", label: "Become a seller", icon: Store }]),
                        ...(user.role === "admin" ? [{ href: "/admin", label: "Admin panel", icon: ShieldCheck }] : []),
                      ].map((l) => (
                        <Link key={l.href} href={l.href} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-mute hover:bg-white/4 hover:text-ink">
                          <l.icon size={15} /> {l.label}
                        </Link>
                      ))}
                      <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-rose-300 hover:bg-rose-400/10">
                        <LogOut size={15} /> Log out
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
                <Link href="/register" className="btn btn-primary btn-sm">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* category nav */}
      <nav className="hidden md:block border-b border-line bg-panel/70 backdrop-blur">
        <div className="container-x flex h-11 items-center gap-1">
          <div className="relative">
            <button
              onClick={() => { setMegaOpen((v) => !v); setAccountOpen(false); setBellOpen(false); }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${megaOpen ? "text-brand" : "text-ink hover:text-brand-bright"}`}
            >
              <Menu size={15} /> All Categories
              <ChevronDown size={13} className={`transition-transform ${megaOpen ? "rotate-180" : ""}`} />
            </button>
            {megaOpen && (
              <div className="card animate-pop absolute left-0 top-10 z-50 w-[34rem] p-4 shadow-2xl shadow-black/70">
                <div className="grid grid-cols-2 gap-1.5">
                  {categories.map((c) => {
                    const Icon = CAT_ICONS[c.icon] ?? Gamepad2;
                    return (
                      <Link
                        key={c.slug}
                        href={`/category/${c.slug}`}
                        onClick={() => setMegaOpen(false)}
                        className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-line hover:bg-white/3"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-raised text-mute transition group-hover:bg-brand/15 group-hover:text-brand">
                          <Icon size={17} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{c.name}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {quickLinks.map((q) => (
            <Link key={q.href} href={q.href} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-mute transition hover:text-ink hover:bg-white/4">
              <q.icon size={14} /> {q.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Link href="/support" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-mute transition hover:text-ink hover:bg-white/4">
              <LifeBuoy size={14} /> Support
            </Link>
            <span className="chip ml-1">EUR · Global</span>
          </div>
        </div>
      </nav>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] border-r border-line bg-panel p-4 animate-fade-in overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display font-bold">KEY<span className="text-brand">HAVEN</span></span>
              <button onClick={() => setMobileOpen(false)} className="btn btn-ghost btn-sm" aria-label="Close"><X size={18} /></button>
            </div>
            <SearchBar variant="hero" />
            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-faint">Categories</p>
            <div className="space-y-0.5">
              {categories.map((c) => {
                const Icon = CAT_ICONS[c.icon] ?? Gamepad2;
                return (
                  <Link key={c.slug} href={`/category/${c.slug}`} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-mute hover:bg-white/4 hover:text-ink">
                    <Icon size={16} /> {c.name}
                  </Link>
                );
              })}
            </div>
            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-faint">Discover</p>
            <div className="space-y-0.5">
              {quickLinks.map((q) => (
                <Link key={q.href} href={q.href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-mute hover:bg-white/4 hover:text-ink">
                  <q.icon size={16} /> {q.label}
                </Link>
              ))}
              <Link href="/sell" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-mute hover:bg-white/4 hover:text-ink">
                <Store size={16} /> Sell on KeyHaven
              </Link>
              <Link href="/support" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-mute hover:bg-white/4 hover:text-ink">
                <LifeBuoy size={16} /> Support
              </Link>
            </div>
            {!user && (
              <div className="mt-6 flex gap-2">
                <Link href="/login" className="btn btn-outline flex-1">Log in</Link>
                <Link href="/register" className="btn btn-primary flex-1">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
