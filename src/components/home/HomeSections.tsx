import Link from "next/link";
import {
  ArrowRight, CheckCircle2, CreditCard, Flame, Gift, KeyRound, Search, ShieldCheck, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import NewsletterForm from "@/components/NewsletterForm";
import AdSlot from "@/components/home/AdSlot";
import { categoryHref, getCategoryIcon } from "@/lib/category-icons";
import type { RenderedSection } from "@/lib/site-data";
import type { NewsletterConfig } from "@/lib/site-config";
import { cn, fmtNum } from "@/lib/utils";

const STEP_ICON: Record<string, LucideIcon> = { Search, CreditCard, KeyRound, ShieldCheck, Zap, Gift };

/** Responsive grid classes for N product cards so rows stay balanced. */
function gridCols(n: number) {
  if (n === 6) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";
  if (n === 5) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";
  if (n === 3) return "grid-cols-2 sm:grid-cols-3";
  if (n <= 2) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

function Head({ title, description, href, cta, icon: Icon, as: Tag = "h2" }: {
  title: string; description?: string; href?: string; cta?: string; icon?: LucideIcon; as?: "h1" | "h2";
}) {
  if (!title && !description) return null;
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {title && (
          <Tag className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
            {Icon && <Icon size={20} className="shrink-0 text-brand" />} {title}
          </Tag>
        )}
        {description && <p className="mt-1 text-sm text-mute">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="btn btn-ghost btn-sm shrink-0">{cta || "View all"} <ArrowRight size={14} /></Link>
      )}
    </div>
  );
}

export default function HomeSection({ rendered, first, newsletter }: {
  rendered: RenderedSection; first: boolean; newsletter: NewsletterConfig;
}) {
  const { section, data } = rendered;
  const st = section.settings;
  const mt = first ? "mt-8" : "mt-12";

  switch (section.type) {
    /* ------------------------------ hero / top selling ------------------------------ */
    case "top_selling": {
      if (data.kind !== "products") return null;
      return (
        <section className="relative overflow-hidden border-b border-line" aria-label={section.title}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(760px_340px_at_50%_-10%,var(--kh-glow-1),transparent)]" />
          <div className="container-x relative py-8 md:py-14">
            <div className="mx-auto max-w-3xl text-center">
              {st.eyebrow && (
                <p className="animate-fade-up chip glass mx-auto mb-4 border-brand/30 text-brand">
                  <Zap size={11} /> {st.eyebrow}
                </p>
              )}
              <h1 className="animate-fade-up d1 text-gradient font-display text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">
                {section.title}
              </h1>
              {section.description && (
                <p className="animate-fade-up d2 mx-auto mt-3 max-w-xl text-base text-mute md:text-lg">{section.description}</p>
              )}
            </div>

            {st.showSearch !== false && (
              <div className="mx-auto mt-6 max-w-xl md:hidden"><SearchBar variant="hero" /></div>
            )}

            {data.chips && data.chips.length > 0 && (
              <nav className="animate-fade-up d3 mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Categories">
                {data.chips.map((c) => {
                  const Icon = getCategoryIcon(c.icon);
                  return (
                    <Link key={c.slug} href={categoryHref(c)}
                      className="glass inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3.5 py-2 text-xs font-semibold text-mute transition hover:border-brand/50 hover:text-brand sm:py-1.5">
                      <Icon size={13} /> {c.name}
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className={cn("mt-8 grid grid-cols-2 gap-3 sm:gap-4", data.cards.length >= 3 && "lg:grid-cols-3")}>
              {data.cards.map((p) => <ProductCard key={p.id} p={p} variant="landscape" />)}
            </div>

            <div className="mt-6 text-center">
              <Link href={st.ctaHref || "/search?sort=popular"} className="btn btn-outline btn-sm">
                {st.ctaText || "View all bestsellers"} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      );
    }

    /* ---------------------------------- deals ---------------------------------- */
    case "deals": {
      if (data.kind !== "products") return null;
      return (
        <section className={cn(mt, "border-y border-line bg-gradient-to-b from-brand/8 via-brand/3 to-transparent py-10")} aria-label={section.title}>
          <div className="container-x">
            <Head title={section.title} description={section.description} icon={Flame} href={st.ctaHref} cta={st.ctaText} />
            <div className={cn("grid gap-3 sm:gap-4", gridCols(Math.min(data.cards.length, 4)))}>
              {data.cards.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      );
    }

    /* ----------------------- generic product list / spotlight ----------------------- */
    case "product_grid": {
      if (data.kind !== "products") return null;
      if (st.layout === "spotlight") {
        return (
          <section className={cn("container-x", mt)} aria-label={section.title}>
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="card relative flex flex-col justify-center overflow-hidden p-5 sm:p-7 md:p-9">
                <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />
                <p className="chip w-fit border-brand/40 bg-brand/10 text-brand">Spotlight</p>
                <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">{section.title}</h2>
                {section.description && <p className="mt-2 max-w-md text-sm text-mute">{section.description}</p>}
                {st.ctaHref && (
                  <Link href={st.ctaHref} className="btn btn-vio mt-5 w-fit">{st.ctaText || "Explore"} <ArrowRight size={15} /></Link>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {data.cards.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            </div>
          </section>
        );
      }
      return (
        <section className={cn("container-x", mt)} aria-label={section.title}>
          <Head title={section.title} description={section.description} href={st.ctaHref} cta={st.ctaText}
            icon={st.gridSource === "giftcard" ? Gift : undefined} />
          <div className={cn("grid gap-3 sm:gap-4", gridCols(data.cards.length))}>
            {data.cards.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      );
    }

    case "recently_viewed": {
      if (data.kind !== "products") return null;
      return (
        <section className={cn("container-x", mt)} aria-label={section.title}>
          <Head title={section.title} description={section.description} />
          <div className={cn("grid gap-3 sm:gap-4", gridCols(data.cards.length))}>
            {data.cards.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      );
    }

    /* --------------------------------- sellers --------------------------------- */
    case "top_sellers": {
      if (data.kind !== "sellers") return null;
      return (
        <section className={cn("container-x", mt)} aria-label={section.title}>
          <Head title={section.title} description={section.description} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.sellers.map((s) => (
              <Link key={s.id} href={`/store/${s.slug}`} className="card hover-lift flex items-center gap-3.5 p-4">
                <span className="bg-gold text-on-brand grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold">
                  {s.storeName[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{s.storeName}</p>
                  {s.ratingCount > 0 ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-mint">
                      <CheckCircle2 size={12} /> {Number(s.ratingAvg).toFixed(1)}% positive
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-faint">No ratings yet</p>
                  )}
                  <p className="text-[11px] text-faint">{fmtNum(s.ratingCount)} ratings · {fmtNum(s.totalSales)} sales</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    }

    /* ----------------------------------- ads ----------------------------------- */
    case "adsense":
      return data.kind === "ad" ? <AdSlot publisherId={data.publisherId} slotId={data.slotId} /> : null;

    case "sponsored": {
      if (!st.imageUrl) return null;
      const h = st.height === "slim" ? "h-[70px] sm:h-[90px]" : st.height === "large" ? "h-[150px] sm:h-[250px]" : "h-[110px] sm:h-[160px]";
      const external = !!st.linkUrl && /^https?:\/\//i.test(st.linkUrl);
      const img = (
        <div className={cn("relative w-full overflow-hidden rounded-2xl border border-line bg-raised", h)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={st.imageUrl} alt={st.alt || "Sponsored"} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <span className="absolute left-2.5 top-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur">
            Sponsored
          </span>
        </div>
      );
      return (
        <section className={cn("container-x", mt)} aria-label="Sponsored">
          {st.linkUrl ? (
            external
              ? <a href={st.linkUrl} target="_blank" rel="sponsored noopener noreferrer" className="block transition hover:opacity-95">{img}</a>
              : <Link href={st.linkUrl} className="block transition hover:opacity-95">{img}</Link>
          ) : img}
        </section>
      );
    }

    /* ----------------------------- content / marketing ----------------------------- */
    case "how_it_works": {
      const steps = st.steps ?? [];
      return (
        <section className={cn("container-x", mt)} aria-label={section.title}>
          <div className="card relative overflow-hidden p-5 sm:p-8 md:p-10">
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
            <h2 className="text-center font-display text-2xl font-bold">{section.title}</h2>
            {section.description && <p className="mx-auto mt-2 max-w-xl text-center text-sm text-mute">{section.description}</p>}
            <div className={cn("relative mt-8 grid gap-6", steps.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
              {steps.map((s, i) => {
                const Icon = STEP_ICON[s.icon] ?? Search;
                return (
                  <div key={i} className="relative">
                    <span className="font-display text-4xl font-bold text-ink/10 sm:text-5xl">0{i + 1}</span>
                    <Icon size={22} className="mt-2 text-brand" />
                    <h3 className="mt-2 font-display font-bold">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-mute">{s.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );
    }

    case "newsletter":
      return (
        <section className={cn("container-x", mt)} aria-label="Newsletter">
          <div className="card relative overflow-hidden p-5 sm:p-8 md:p-10">
            <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
              <div className="max-w-lg">
                <h2 className="font-display text-2xl font-bold">{newsletter.heading}</h2>
                {newsletter.description && <p className="mt-1.5 text-sm text-mute">{newsletter.description}</p>}
              </div>
              <NewsletterForm config={newsletter} source="home" />
            </div>
          </div>
        </section>
      );

    case "categories": {
      if (data.kind !== "categories") return null;
      return (
        <section className={cn("container-x", mt)} aria-label={section.title}>
          <Head title={section.title} description={section.description} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {data.tiles.map((c) => {
              const Icon = getCategoryIcon(c.icon);
              return (
                <Link key={c.slug} href={categoryHref(c)} className="card hover-lift group p-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand transition-transform group-hover:scale-110">
                    {c.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.imageUrl} alt="" width={22} height={22} loading="lazy" decoding="async" className="h-[22px] w-[22px] object-contain" />
                      : <Icon size={20} />}
                  </span>
                  <p className="mt-3 text-sm font-bold">{c.name}</p>
                  {c.blurb && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-faint">{c.blurb}</p>}
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-faint">{c.total} products</p>
                </Link>
              );
            })}
          </div>
        </section>
      );
    }

    case "promo_cards": {
      if (data.kind !== "promos") return null;
      return (
        <section className={cn("container-x", mt)} aria-label={section.title}>
          <div className="grid gap-4 md:grid-cols-3">
            {data.cards.map((b) => (
              <Link key={b.id} href={b.ctaHref || "/search"}
                className="card hover-lift relative flex min-h-32 flex-col justify-end overflow-hidden p-5"
                style={{ background: `linear-gradient(120deg, hsl(${b.hue} 70% 55% / 0.18), hsl(${(b.hue + 50) % 360} 60% 50% / 0.06)), var(--kh-glass-card)` }}>
                <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full opacity-60 blur-2xl" style={{ background: `hsl(${b.hue} 90% 55% / 0.35)` }} />
                <h3 className="relative font-display text-lg font-bold">{b.title}</h3>
                {b.subtitle && <p className="relative mt-1 line-clamp-2 text-xs text-mute">{b.subtitle}</p>}
                {b.ctaText && (
                  <span className="relative mt-3 inline-flex w-fit items-center gap-1 text-xs font-bold text-brand">
                    {b.ctaText} <ArrowRight size={12} />
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      );
    }

    case "become_seller":
      return (
        <section className={cn("container-x", mt)} aria-label={section.title}>
          <div className="card relative grid items-center gap-5 overflow-hidden p-5 sm:gap-6 sm:p-8 md:grid-cols-[1fr_auto] md:p-10">
            <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative">
              {st.eyebrow && <p className="chip border-brand/40 bg-brand/10 text-brand">{st.eyebrow}</p>}
              <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">{section.title}</h2>
              {section.description && <p className="mt-2 max-w-lg text-sm text-mute">{section.description}</p>}
            </div>
            <Link href={st.ctaHref || "/sell"} className="btn btn-primary btn-lg relative w-full shrink-0 md:w-auto">
              {st.ctaText || "Start selling"} <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      );
  }
}
