/**
 * Server-only data access for the admin-managed storefront configuration and the data each
 * homepage section needs. Every getter validates what it reads from the database and falls
 * back to safe defaults, so a missing / malformed row can never take the homepage down.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { banners, categories, sellerProfiles } from "@/db/schema";
import { getSetting } from "@/lib/ops";
import { getProductCards, type ProductCard } from "@/lib/commerce";
import {
  AdsSchema, DEFAULT_ADS, DEFAULT_NEWSLETTER, DEFAULT_PROMO, DEFAULT_SECTIONS, HomeSectionsSchema,
  NewsletterSchema, PromoBannerSchema, normalizeSections, resolveAdSlot,
  type AdsConfig, type HomeSection, type NewsletterConfig, type PromoBanner,
} from "@/lib/site-config";
import { DEFAULT_THEME, sanitizeTheme, type ThemeSettings } from "@/lib/theme";

/* --------------------------------- getters -------------------------------- */

export async function getThemeSettings(): Promise<ThemeSettings> {
  return sanitizeTheme(await getSetting<unknown>("theme", DEFAULT_THEME));
}

export async function getPromoBanner(): Promise<PromoBanner> {
  const raw = await getSetting<unknown>("promo_banner", DEFAULT_PROMO);
  const parsed = PromoBannerSchema.safeParse({ ...DEFAULT_PROMO, ...(raw as object) });
  return parsed.success ? parsed.data : DEFAULT_PROMO;
}

export async function getAdsConfig(): Promise<AdsConfig> {
  const raw = (await getSetting<unknown>("ads", DEFAULT_ADS)) as Partial<AdsConfig>;
  const parsed = AdsSchema.safeParse({
    ...DEFAULT_ADS, ...raw,
    slots: { ...DEFAULT_ADS.slots, ...(raw?.slots ?? {}) },
  });
  return parsed.success ? parsed.data : DEFAULT_ADS;
}

export async function getNewsletterConfig(): Promise<NewsletterConfig> {
  const raw = await getSetting<unknown>("newsletter", DEFAULT_NEWSLETTER);
  const parsed = NewsletterSchema.safeParse({ ...DEFAULT_NEWSLETTER, ...(raw as object) });
  return parsed.success ? parsed.data : DEFAULT_NEWSLETTER;
}

/** Ordered homepage sections (enabled and disabled). */
export async function getHomeSections(): Promise<HomeSection[]> {
  const raw = await getSetting<unknown>("homepage_sections", null);
  if (raw == null) return normalizeSections(DEFAULT_SECTIONS);
  const parsed = HomeSectionsSchema.safeParse(raw);
  return parsed.success ? normalizeSections(parsed.data) : normalizeSections(DEFAULT_SECTIONS);
}

/* ------------------------------ section data ------------------------------- */

export type CategoryTile = {
  name: string; slug: string; icon: string; blurb: string | null;
  imageUrl: string | null; href: string | null; total: number;
};
export type SellerTile = {
  id: string; slug: string; storeName: string; ratingAvg: number; ratingCount: number; totalSales: number;
};
export type PromoCard = { id: string; title: string; subtitle: string | null; ctaText: string | null; ctaHref: string | null; hue: number };

export type SectionData =
  | { kind: "products"; cards: ProductCard[]; chips?: CategoryTile[] }
  | { kind: "sellers"; sellers: SellerTile[] }
  | { kind: "categories"; tiles: CategoryTile[] }
  | { kind: "promos"; cards: PromoCard[] }
  | { kind: "ad"; publisherId: string; slotId: string }
  | { kind: "static" };

export type RenderedSection = { section: HomeSection; data: SectionData };

async function loadCategoryTiles(withCounts: boolean): Promise<CategoryTile[]> {
  const rows = await db.select({
    name: categories.name, slug: categories.slug, icon: categories.icon, blurb: categories.blurb,
    imageUrl: categories.imageUrl, href: categories.href,
    total: withCounts
      ? sql<number>`(select count(*)::int from products p where p.category_id = ${categories.id} and p.active = true)`
      : sql<number>`0`,
  }).from(categories).where(eq(categories.active, true)).orderBy(asc(categories.position));
  return rows;
}

/** Keep hand-picked ordering when products are fetched with `ids`. */
function inOrder<T extends { id: string }>(rows: T[], ids: string[]) {
  const pos = new Map(ids.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
}

/**
 * Loads the data for every ENABLED section in parallel and drops sections that have nothing to
 * show (unconfigured ads, no products, guests on "recently viewed"…), so the page never renders
 * an empty container or leaves a gap.
 */
export async function loadHomeSections(
  sections: HomeSection[],
  ctx: { userId: string | null; ads: AdsConfig; newsletter: NewsletterConfig },
): Promise<RenderedSection[]> {
  const enabled = sections.filter((s) => s.enabled);

  // Shared lookups are fetched at most once, only if a section needs them.
  const needsChips = enabled.some((s) => s.type === "top_selling" && s.settings.showCategoryChips !== false);
  const needsTiles = enabled.some((s) => s.type === "categories");
  const catsPromise = needsChips || needsTiles ? loadCategoryTiles(needsTiles) : Promise.resolve([] as CategoryTile[]);

  const results = await Promise.all(enabled.map(async (section): Promise<RenderedSection | null> => {
    const st = section.settings;
    const manualIds = st.mode === "manual" ? st.productIds ?? [] : null;

    switch (section.type) {
      case "top_selling": {
        const limit = st.limit ?? 6;
        const [cards, chips] = await Promise.all([
          manualIds
            ? getProductCards({ ids: manualIds, limit }).then((r) => inOrder(r, manualIds))
            : getProductCards({ sort: "popular", limit }),
          st.showCategoryChips === false ? Promise.resolve([]) : catsPromise,
        ]);
        return cards.length ? { section, data: { kind: "products", cards, chips } } : null;
      }
      case "deals": {
        const limit = st.limit ?? 4;
        let cards: ProductCard[];
        if (manualIds) {
          cards = inOrder(await getProductCards({ ids: manualIds, limit }), manualIds);
        } else {
          // only genuine discounts, deepest first
          cards = (await getProductCards({ sort: "discount", limit: limit * 3 }))
            .filter((p) => p.minPrice != null && p.rrp > p.minPrice)
            .slice(0, limit);
        }
        return cards.length ? { section, data: { kind: "products", cards } } : null;
      }
      case "product_grid": {
        const limit = st.limit ?? 8;
        let cards: ProductCard[];
        if (manualIds) {
          cards = inOrder(await getProductCards({ ids: manualIds, limit }), manualIds);
        } else {
          switch (st.gridSource ?? "popular") {
            case "featured": cards = await getProductCards({ featuredOnly: true, sort: "popular", limit }); break;
            case "newest": cards = await getProductCards({ sort: "newest", limit }); break;
            case "discount": cards = await getProductCards({ sort: "discount", limit }); break;
            case "giftcard": cards = await getProductCards({ kind: "giftcard", sort: "popular", limit }); break;
            case "category": cards = st.categorySlug ? await getProductCards({ categorySlug: st.categorySlug, sort: "popular", limit }) : []; break;
            default: cards = await getProductCards({ sort: "popular", limit });
          }
        }
        return cards.length ? { section, data: { kind: "products", cards } } : null;
      }
      case "recently_viewed": {
        if (!ctx.userId) return null;
        const limit = st.limit ?? 5;
        const rows = await db.execute(sql`
          select rv.product_id as id from recently_viewed rv
          join products p on p.id = rv.product_id and p.active = true
          where rv.user_id = ${ctx.userId} order by rv.viewed_at desc limit ${limit}
        `);
        const ids = (rows as unknown as { rows: Array<{ id: string }> }).rows.map((r) => r.id);
        if (!ids.length) return null;
        const cards = inOrder(await getProductCards({ ids, limit }), ids);
        return cards.length ? { section, data: { kind: "products", cards } } : null;
      }
      case "top_sellers": {
        const limit = st.limit ?? 4;
        const order = st.sellerSort === "sales" ? desc(sellerProfiles.totalSales)
          : st.sellerSort === "rating" ? desc(sellerProfiles.ratingAvg)
          : desc(sellerProfiles.ratingCount);
        const ids = st.mode === "manual" ? st.sellerIds ?? [] : null;
        if (ids && ids.length === 0) return null;
        const rows = await db.select({
          id: sellerProfiles.id, slug: sellerProfiles.slug, storeName: sellerProfiles.storeName,
          ratingAvg: sellerProfiles.ratingAvg, ratingCount: sellerProfiles.ratingCount, totalSales: sellerProfiles.totalSales,
        }).from(sellerProfiles)
          .where(ids ? and(eq(sellerProfiles.status, "approved"), inArray(sellerProfiles.id, ids)) : eq(sellerProfiles.status, "approved"))
          .orderBy(order, desc(sellerProfiles.totalSales))
          .limit(limit);
        const sellers = ids ? inOrder(rows, ids) : rows;
        return sellers.length ? { section, data: { kind: "sellers", sellers } } : null;
      }
      case "categories": {
        const tiles = await catsPromise;
        return tiles.length ? { section, data: { kind: "categories", tiles } } : null;
      }
      case "promo_cards": {
        const cards = await db.select({
          id: banners.id, title: banners.title, subtitle: banners.subtitle,
          ctaText: banners.ctaText, ctaHref: banners.ctaHref, hue: banners.hue,
        }).from(banners).where(eq(banners.active, true)).orderBy(asc(banners.position)).limit(3);
        return cards.length ? { section, data: { kind: "promos", cards } } : null;
      }
      case "adsense": {
        const slot = resolveAdSlot(ctx.ads, st.adSlot ?? "home_top");
        return slot ? { section, data: { kind: "ad", ...slot } } : null;
      }
      case "sponsored":
        return st.imageUrl ? { section, data: { kind: "static" } } : null;
      case "newsletter":
        return ctx.newsletter.enabled ? { section, data: { kind: "static" } } : null;
      case "how_it_works":
        return st.steps && st.steps.length ? { section, data: { kind: "static" } } : null;
      case "become_seller":
        return { section, data: { kind: "static" } };
    }
  }));

  return results.filter((r): r is RenderedSection => r !== null);
}
