import Link from "next/link";
import Image from "next/image";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { banners, categories, sellerProfiles } from "@/db/schema";
import { getProductCards } from "@/lib/commerce";
import { getSessionUser } from "@/lib/auth";
import { fmtEUR, fmtNum, cn } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import {
  ArrowRight, Flame, Gamepad2, Gift, AppWindow, BadgeCheck, Coins, Puzzle,
  ShieldCheck, TrendingUp, Zap, Store, CheckCircle2, Search, CreditCard, KeyRound,
} from "lucide-react";

const CAT_ICONS: Record<string, typeof Gamepad2> = {
  Gamepad2, Gift, AppWindow, BadgeCheck, Coins, Puzzle,
};

export default async function HomePage() {
  const user = await getSessionUser();
  const [featured, bestsellers, giftCards, deals, cats, topSellers, slides, recent] = await Promise.all([
    getProductCards({ featuredOnly: true, limit: 4 }),
    getProductCards({ sort: "popular", limit: 8 }),
    getProductCards({ kind: "giftcard", limit: 6 }),
    getProductCards({ sort: "discount", limit: 10 }),
    db.select({
      name: categories.name, slug: categories.slug, icon: categories.icon, blurb: categories.blurb,
      total: sql<number>`(select count(*) from products p where p.category_id = ${categories.id} and p.active = true)`,
    }).from(categories),
    db.select().from(sellerProfiles).orderBy(desc(sellerProfiles.ratingCount)).limit(4),
    db.select().from(banners).orderBy(banners.position),
    user
      ? getProductCards({ sort: "newest", limit: 5 }) // placeholder replaced below if history exists
      : Promise.resolve([]),
  ]);

  let recentCards: typeof featured = [];
  if (user) {
    const rows = await db.execute(sql`
      select p.id from recently_viewed rv join products p on p.id = rv.product_id
      where rv.user_id = ${user.id} order by rv.viewed_at desc limit 5
    `);
    const ids = ((rows as unknown as { rows: Array<{ id: string }> }).rows).map((r) => r.id);
    if (ids.length) {
      const all = await getProductCards({ sort: "popular", limit: 60 });
      recentCards = ids.map((id) => all.find((c) => c.id === id)).filter(Boolean) as typeof featured;
      if (!recentCards.length) recentCards = recent;
    }
  }
  void recent;

  return (
    <div>
      {/* ------------------------------- HERO ------------------------------- */}
      <section className="relative overflow-hidden border-b border-line">
        <Image src="/img/hero.jpg" alt="" fill priority className="object-cover opacity-45" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-abyss/70 via-abyss/55 to-abyss" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_300px_at_50%_0%,rgba(255,122,26,0.14),transparent)]" />
        <div className="container-x relative pb-14 pt-16 md:pb-20 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="animate-fade-up chip mx-auto mb-5 border-brand/30 bg-brand/10 text-brand-bright">
              <Zap size={11} /> Instant digital delivery · Buyer protection on every order
            </p>
            <h1 className="animate-fade-up d1 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Every game. <span className="text-gradient">One vault.</span>
            </h1>
            <p className="animate-fade-up d2 mx-auto mt-4 max-w-xl text-base text-mute md:text-lg">
              Thousands of sellers compete on price so you never pay RRP again.
              Keys, gift cards, software and subscriptions — delivered in seconds.
            </p>
            <div className="animate-fade-up d3 mx-auto mt-7 max-w-xl">
              <SearchBar variant="hero" />
            </div>
            <div className="animate-fade-up d4 mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-faint">
              <span>Trending:</span>
              {["Realm of Ash", "Vapor Wallet", "Game Pass", "Antivirus"].map((q) => (
                <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="chip hover:border-brand/40 hover:text-brand-bright">
                  {q}
                </Link>
              ))}
            </div>
          </div>

          {/* stats */}
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: KeyRound, label: "Digital keys", value: "4,200+" },
              { icon: Store, label: "Vetted sellers", value: "5" },
              { icon: TrendingUp, label: "Avg. saving vs RRP", value: "41%" },
              { icon: ShieldCheck, label: "Orders protected", value: "100%" },
            ].map((s, i) => (
              <div key={i} className="card glass flex items-center gap-3 px-4 py-3.5">
                <s.icon size={18} className="text-brand" />
                <div>
                  <p className="font-display text-lg font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] text-mute">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* promo banners */}
      {slides.length > 0 && (
        <section className="container-x mt-10">
          <div className="grid gap-4 md:grid-cols-3">
            {slides.map((b, i) => (
              <Link
                key={b.id}
                href={b.ctaHref ?? "/search"}
                className={cn("card hover-lift relative overflow-hidden p-5 min-h-32 flex flex-col justify-end animate-fade-up", i === 0 && "md:col-span-1")}
                style={{ background: `linear-gradient(120deg, hsl(${b.hue} 60% 22% / 0.85), hsl(${(b.hue + 50) % 360} 55% 12% / 0.9))` }}
              >
                <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full blur-2xl opacity-60" style={{ background: `hsl(${b.hue} 90% 55% / 0.45)` }} />
                <h3 className="font-display text-lg font-bold">{b.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-mute">{b.subtitle}</p>
                <span className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-bold text-brand-bright">
                  {b.ctaText} <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* deals rail */}
      <section className="container-x mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Flame size={19} className="text-brand" /> Deals of the day</h2>
            <p className="mt-1 text-sm text-mute">Deepest discounts vs recommended retail price.</p>
          </div>
          <Link href="/search?sort=discount" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="no-scrollbar mask-fade-x -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          {deals.map((p) => (
            <div key={p.id} className="w-44 shrink-0 sm:w-52"><ProductCard p={p} /></div>
          ))}
        </div>
      </section>

      {/* categories */}
      <section className="container-x mt-12">
        <h2 className="font-display text-xl font-bold">Browse categories</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cats.map((c, i) => {
            const Icon = CAT_ICONS[c.icon] ?? Gamepad2;
            const hues = [265, 25, 190, 150, 55, 320];
            const hue = hues[i % hues.length];
            return (
              <Link key={c.slug} href={`/category/${c.slug}`} className="card hover-lift group p-4">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-110"
                  style={{ background: `hsl(${hue} 60% 20%)`, color: `hsl(${hue} 90% 68%)` }}
                >
                  <Icon size={20} />
                </span>
                <p className="mt-3 text-sm font-bold">{c.name}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-faint">{c.blurb}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-faint">{c.total} products</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* bestsellers */}
      <section className="container-x mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Bestsellers</h2>
            <p className="mt-1 text-sm text-mute">Most-purchased keys across the marketplace.</p>
          </div>
          <Link href="/search?sort=popular" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {bestsellers.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* featured spotlight */}
      <section className="container-x mt-12">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="card relative overflow-hidden p-7 md:p-9" style={{ background: "linear-gradient(115deg, hsl(265 55% 16%), hsl(282 45% 10%))" }}>
            <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-vio/25 blur-3xl" />
            <p className="chip border-vio/40 bg-vio/10 text-vio">Spotlight</p>
            <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">Hand-picked featured drops</h2>
            <p className="mt-2 max-w-md text-sm text-mute">
              Our curation team tracks new releases and flags the best price-to-hype ratio so the good stuff never gets buried.
            </p>
            <Link href="/search?featured=1" className="btn btn-vio mt-5">Explore featured <ArrowRight size={15} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {featured.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      {/* gift cards strip */}
      <section className="container-x mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Gift size={19} className="text-vio" /> Gift cards &amp; top-ups</h2>
            <p className="mt-1 text-sm text-mute">Wallet credit for every storefront, below face value.</p>
          </div>
          <Link href="/category/gift-cards" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {giftCards.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* recently viewed */}
      {recentCards.length > 0 && (
        <section className="container-x mt-12">
          <h2 className="font-display text-xl font-bold">Recently viewed</h2>
          <div className="no-scrollbar mask-fade-x -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {recentCards.map((p) => (
              <div key={p.id} className="w-44 shrink-0 sm:w-52"><ProductCard p={p} /></div>
            ))}
          </div>
        </section>
      )}

      {/* top sellers */}
      <section className="container-x mt-12">
        <h2 className="font-display text-xl font-bold">Top-rated sellers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topSellers.map((s) => (
            <Link key={s.id} href={`/store/${s.slug}`} className="card hover-lift flex items-center gap-3.5 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, hsl(${265 + (s.storeName.length * 13) % 80} 60% 40%), hsl(230 50% 22%))` }}>
                {s.storeName[0]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{s.storeName}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-mint">
                  <CheckCircle2 size={12} /> {Number(s.ratingAvg).toFixed(1)}% positive
                </p>
                <p className="text-[11px] text-faint">{fmtNum(s.ratingCount)} ratings · {fmtNum(s.totalSales)} sales</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="container-x mt-16">
        <div className="card relative overflow-hidden p-8 md:p-10">
          <div className="absolute -left-16 -bottom-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
          <h2 className="font-display text-center text-2xl font-bold">Three steps to your key</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { icon: Search, t: "Find the best offer", d: "Compare verified sellers with live ratings, prices and stock — all in one table." },
              { icon: CreditCard, t: "Pay securely", d: "Checkout with card, PayPal or local methods. Buyer protection is automatic." },
              { icon: KeyRound, t: "Play in seconds", d: "Your key is delivered instantly to your vault. Activate, download, play." },
            ].map((s, i) => (
              <div key={i} className="relative">
                <span className="font-display text-5xl font-bold text-white/6">0{i + 1}</span>
                <s.icon size={22} className="mt-2 text-brand" />
                <h3 className="mt-2 font-display font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mute">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* sell CTA */}
      <section className="container-x mt-12 mb-4">
        <div className="card relative grid items-center gap-6 overflow-hidden p-8 md:grid-cols-[1fr_auto] md:p-10"
          style={{ background: "linear-gradient(105deg, hsl(25 80% 14%), hsl(340 50% 10%) 60%, hsl(262 50% 12%))" }}>
          <div className="absolute -right-8 top-0 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
          <div>
            <p className="chip border-brand/40 bg-brand/10 text-brand-bright">For sellers</p>
            <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">Turn your keys into revenue</h2>
            <p className="mt-2 max-w-lg text-sm text-mute">
              List inventory in minutes, manage stock in bulk, track commissions in real time,
              and withdraw with transparent payouts. Join sellers already earning on KeyHaven.
            </p>
          </div>
          <Link href="/sell" className="btn btn-primary btn-lg shrink-0">
            Start selling <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
