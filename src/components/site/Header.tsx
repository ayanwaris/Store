"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  KeyRound, ShoppingCart, Bell, Menu, ChevronDown, Store, LayoutDashboard, Package,
  Heart, LogOut, ShieldCheck, LifeBuoy, X, Trophy, Sparkles, Tag, Flame, Gift,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PromoBanner from "@/components/site/PromoBanner";
import ThemeToggle from "@/components/site/ThemeToggle";
import { categoryHref, renderCategoryIcon } from "@/lib/category-icons";
import type { PromoBanner as PromoConfig } from "@/lib/site-config";
import { cn, timeAgo } from "@/lib/utils";

export type NavCategory = { name: string; slug: string; icon: string; imageUrl?: string | null; href?: string | null };

type Props = {
  user: { name: string; email: string; role: string; avatarHue: number; sellerStatus?: string } | null;
  categories: NavCategory[];
  cartCount: number;
  unread: number;
  /** only passed when the banner is enabled, configured and inside its display period */
  promo: PromoConfig | null;
  /** show the Sun/Moon button (only for theme presets that follow the device) */
  themeToggle: boolean;
};

type Notif = { id: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string };

function CategoryGlyph({ c, size }: { c: NavCategory; size: number }) {
  if (c.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.imageUrl} alt="" width={size} height={size} loading="lazy" decoding="async" className="object-contain" style={{ width: size, height: size }} />;
  }
  return renderCategoryIcon(c.icon, size);
}

/**
 * Dropdown panels stay mounted and animate with opacity/transform, so they fade in AND out.
 * They are anchored to the bar's container (not to their button), so they can never run off
 * either edge of the screen, and sit above both bars (main bar z-30 > category bar z-20).
 */
const PANEL = "popover absolute right-0 top-full z-50 mt-2 origin-top-right overflow-hidden transition-[opacity,transform,visibility] duration-200 ease-out";
const PANEL_OPEN = "visible translate-y-0 scale-100 opacity-100";
const PANEL_CLOSED = "invisible pointer-events-none -translate-y-1.5 scale-95 opacity-0";

export default function Header({ user, categories, cartCount, unread, promo, themeToggle }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [localUnread, setLocalUnread] = useState(unread);
  const pathname = usePathname();
  const router = useRouter();
  const megaBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false); setMegaOpen(false); setAccountOpen(false); setBellOpen(false);
  }, [pathname]);

  // Click outside any open menu closes it; Escape closes everything (and returns focus to the trigger).
  useEffect(() => {
    const closeAll = () => { setMegaOpen(false); setAccountOpen(false); setBellOpen(false); };
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest("[data-menu]")) closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMegaOpen((open) => { if (open) megaBtnRef.current?.focus(); return false; });
      setAccountOpen(false); setBellOpen(false); setMobileOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  // lock page scroll while the drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

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

  const navLink = "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-mute transition hover:text-ink hover:bg-white/4";

  return (
    // sticky wrapper = promo banner + main bar + category bar, so they scroll away / stick together.
    // With no banner the main bar is the first element, i.e. the navbar sits flush at the top.
    <header className="sticky top-0 z-40">
      {promo && <PromoBanner promo={promo} />}

      {/* ------------------------------ main bar ------------------------------ */}
      <div className="glass relative z-30 border-b border-line">
        <div className="container-x relative flex h-16 items-center gap-3">
          <button className="btn btn-ghost btn-sm -ml-2" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>

          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="bg-gold grid h-9 w-9 place-items-center rounded-xl shadow-[0_6px_20px_-8px_var(--kh-brand-deep)] transition-transform group-hover:rotate-6">
              <KeyRound size={18} className="text-on-brand" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight max-[420px]:hidden">
              KEY<span className="text-brand">HAVEN</span>
            </span>
          </Link>

          <div className="hidden max-w-xl flex-1 md:flex">
            <SearchBar variant="nav" />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link href="/sell" className="btn btn-ghost btn-sm hidden lg:inline-flex">
              <Store size={16} /> Sell
            </Link>

            {themeToggle && <ThemeToggle />}

            <Link href="/cart" className="btn btn-ghost btn-sm relative" aria-label="Cart">
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="bg-gold text-on-brand absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            {user && (
              <div data-menu>
                <button className="btn btn-ghost btn-sm relative" onClick={openBell} aria-label="Notifications" aria-expanded={bellOpen} aria-controls="notif-menu">
                  <Bell size={18} />
                  {localUnread > 0 && (
                    <span className="absolute right-1 top-0.5 h-2 w-2 animate-pulse rounded-full bg-brand" />
                  )}
                </button>
                <div id="notif-menu" aria-hidden={!bellOpen} className={cn(PANEL, "w-80 max-w-full", bellOpen ? PANEL_OPEN : PANEL_CLOSED)}>
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <span className="text-sm font-semibold">Notifications</span>
                    <button onClick={markAllRead} className="text-xs font-medium text-brand hover:text-brand-bright">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-[min(20rem,60vh)] overflow-y-auto">
                    {notifs.length === 0 && (
                      <p className="p-5 text-center text-sm text-faint">You&apos;re all caught up.</p>
                    )}
                    {notifs.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href ?? "#"}
                        onClick={() => setBellOpen(false)}
                        className={`block border-b border-line-soft px-4 py-3 transition hover:bg-white/3 ${!n.read ? "bg-brand/5" : ""}`}
                      >
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-mute">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-faint">{timeAgo(n.createdAt)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {user ? (
              <div data-menu>
                <button
                  onClick={() => { setAccountOpen((v) => !v); setBellOpen(false); setMegaOpen(false); }}
                  aria-expanded={accountOpen}
                  aria-controls="account-menu"
                  aria-label="Account menu"
                  className="flex items-center gap-1.5 rounded-xl border border-transparent p-1 pr-1.5 transition hover:border-line hover:bg-white/4"
                >
                  <span
                    className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white"
                    style={{ background: `hsl(${user.avatarHue} 70% 42%)` }}
                  >
                    {user.name[0]?.toUpperCase()}
                  </span>
                  <ChevronDown size={14} className={cn("text-mute transition-transform duration-200", accountOpen && "rotate-180")} />
                </button>
                <div id="account-menu" aria-hidden={!accountOpen} className={cn(PANEL, "w-72 max-w-full", accountOpen ? PANEL_OPEN : PANEL_CLOSED)}>
                  <div className="flex items-center gap-3 border-b border-line bg-brand/5 px-4 py-3.5">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold text-white shadow-md shadow-black/20"
                      style={{ background: `hsl(${user.avatarHue} 70% 42%)` }}
                    >
                      {user.name[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{user.name}</p>
                      <p className="truncate text-xs text-faint">{user.email}</p>
                      {user.role === "admin" && <span className="chip mt-1 border-brand/40 text-brand">Admin</span>}
                    </div>
                  </div>
                  <nav className="p-2 text-sm" aria-label="Account">
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
                      <Link key={l.href} href={l.href} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 text-mute transition hover:bg-brand/8 hover:text-ink">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-raised text-brand transition group-hover:bg-brand/15">
                          <l.icon size={15} />
                        </span>
                        <span className="font-medium">{l.label}</span>
                      </Link>
                    ))}
                  </nav>
                  <div className="border-t border-line p-2">
                    <button onClick={logout} className="group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-rose-300 transition hover:bg-rose-400/10">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-400/10"><LogOut size={15} /></span>
                      <span className="font-medium">Log out</span>
                    </button>
                  </div>
                </div>
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

      {/* --------------------------- category bar (md+) --------------------------- */}
      <nav className="glass relative z-20 hidden border-b border-line md:block" aria-label="Browse">
        <div className="container-x flex h-11 items-center gap-1">
          <button
            ref={megaBtnRef}
            data-menu
            onClick={() => { setMegaOpen((v) => !v); setAccountOpen(false); setBellOpen(false); }}
            aria-expanded={megaOpen}
            aria-haspopup="true"
            aria-controls="mega-menu"
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${megaOpen ? "bg-white/4 text-brand" : "text-ink hover:text-brand-bright"}`}
          >
            <Menu size={15} /> All Categories
            <ChevronDown size={13} className={`transition-transform ${megaOpen ? "rotate-180" : ""}`} />
          </button>
          {quickLinks.map((q) => (
            <Link key={q.href} href={q.href} className={navLink}>
              <q.icon size={14} /> {q.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Link href="/support" className={navLink}>
              <LifeBuoy size={14} /> Support
            </Link>
            <span className="chip ml-1">EUR · Global</span>
          </div>
        </div>
      </nav>

      {/*
        Category mega-menu. Rendered as a sibling of the (blurred) bars — not inside them — so it is
        never clipped and its own blur works; it hangs from the bottom edge of the sticky header and
        is aligned with the container's left edge, i.e. directly under the "All Categories" button.
      */}
      {megaOpen && categories.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-full z-50 hidden md:block">
          <div className="container-x">
            <div id="mega-menu" data-menu className="popover animate-pop pointer-events-auto mt-1.5 w-[min(42rem,100%)] p-3.5 sm:p-4">
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={categoryHref(c)}
                      onClick={() => setMegaOpen(false)}
                      className="group flex items-center gap-3.5 rounded-xl border border-transparent p-2.5 transition hover:border-brand/25 hover:bg-brand/6"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-raised text-brand transition group-hover:bg-brand/15 group-hover:text-brand-bright">
                        <CategoryGlyph c={c} size={19} />
                      </span>
                      <span className="min-w-0 truncate text-[15px] font-bold">{c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------- drawer ------------------------------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
          <div className="animate-fade-in absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="animate-fade-in absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto border-r border-line bg-panel p-4 shadow-2xl shadow-black/40">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display font-bold">KEY<span className="text-brand">HAVEN</span></span>
              <button onClick={() => setMobileOpen(false)} className="btn btn-ghost btn-sm" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="md:hidden"><SearchBar variant="hero" /></div>
            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-faint">Categories</p>
            <div className="space-y-0.5">
              {categories.map((c) => (
                <Link key={c.slug} href={categoryHref(c)} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-mute hover:bg-white/4 hover:text-ink">
                  <CategoryGlyph c={c} size={16} /> {c.name}
                </Link>
              ))}
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
    </header>
  );
}
