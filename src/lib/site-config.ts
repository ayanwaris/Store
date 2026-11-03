/**
 * Shared (server + client safe) definitions for everything the admin can configure on the
 * storefront: promotional banner, advertising, newsletter and the homepage section list.
 *
 * All of it is persisted in the existing `settings` table (key → jsonb), validated with zod
 * on the way in AND on the way out, so a hand-edited or stale row can never break the site.
 */
import { z } from "zod";

/* -------------------------------- primitives ------------------------------- */

/** Site-relative path ("/search?x=1") or absolute https URL. Anything else (javascript:, //evil, http:) is rejected. */
export const isSafeUrl = (v: string) => v === "" || (/^\/(?!\/)/.test(v) && !/\s/.test(v)) || /^https:\/\/[^\s]+$/i.test(v);
const safeUrl = z.string().max(500).refine(isSafeUrl, "Use a site path like /search or a full https:// URL");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #rrggbb colour");
const isoOrNull = z.string().datetime({ offset: true }).nullable().or(z.literal("").transform(() => null));

export const isExternal = (url: string) => /^https?:\/\//i.test(url);

/* ------------------------------ promo banner ------------------------------ */

export const PromoBannerSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(200),
  linkUrl: safeUrl,
  linkLabel: z.string().max(40),
  style: z.enum(["gold", "dark", "custom"]),
  bgColor: hex,
  textColor: hex,
  audience: z.enum(["all", "guests", "members"]),
  startsAt: isoOrNull,
  endsAt: isoOrNull,
});
export type PromoBanner = z.infer<typeof PromoBannerSchema>;

export const DEFAULT_PROMO: PromoBanner = {
  enabled: false, text: "", linkUrl: "", linkLabel: "", style: "gold",
  bgColor: "#c99a1a", textColor: "#1b1405", audience: "all", startsAt: null, endsAt: null,
};

/** The banner is shown only when enabled, has text, matches the audience and is inside its display period. */
export function isPromoVisible(p: PromoBanner, signedIn: boolean, now = new Date()): boolean {
  if (!p.enabled || !p.text.trim()) return false;
  if (p.audience === "guests" && signedIn) return false;
  if (p.audience === "members" && !signedIn) return false;
  if (p.startsAt && now < new Date(p.startsAt)) return false;
  if (p.endsAt && now > new Date(p.endsAt)) return false;
  return true;
}

/* ------------------------------- advertising ------------------------------ */

export const AD_SLOT_KEYS = ["home_top", "home_middle", "home_bottom"] as const;
export type AdSlotKey = (typeof AD_SLOT_KEYS)[number];

const SlotSchema = z.object({
  enabled: z.boolean(),
  slotId: z.string().regex(/^(\d{6,20})?$/, "Slot ID is the numeric ad-unit ID from AdSense"),
});
export const AdsSchema = z.object({
  enabled: z.boolean(),
  publisherId: z.string().regex(/^(ca-pub-\d{10,20})?$/, "Looks like ca-pub-1234567890123456"),
  slots: z.object({ home_top: SlotSchema, home_middle: SlotSchema, home_bottom: SlotSchema }),
});
export type AdsConfig = z.infer<typeof AdsSchema>;

export const DEFAULT_ADS: AdsConfig = {
  enabled: false, publisherId: "",
  slots: {
    home_top: { enabled: false, slotId: "" },
    home_middle: { enabled: false, slotId: "" },
    home_bottom: { enabled: false, slotId: "" },
  },
};

/** An AdSense unit is only rendered when the master switch, the slot switch, the publisher ID and the slot ID are all valid. */
export function resolveAdSlot(ads: AdsConfig, key: AdSlotKey): { publisherId: string; slotId: string } | null {
  const slot = ads.slots[key];
  if (!ads.enabled || !slot?.enabled || !ads.publisherId || !slot.slotId) return null;
  return { publisherId: ads.publisherId, slotId: slot.slotId };
}

/* -------------------------------- newsletter ------------------------------ */

export const NewsletterSchema = z.object({
  enabled: z.boolean(),
  heading: z.string().min(1).max(80),
  description: z.string().max(240),
  placeholder: z.string().max(60),
  buttonLabel: z.string().min(1).max(24),
  successMessage: z.string().min(1).max(140),
});
export type NewsletterConfig = z.infer<typeof NewsletterSchema>;

export const DEFAULT_NEWSLETTER: NewsletterConfig = {
  enabled: true,
  heading: "Drops, deals & key alerts",
  description: "Get new releases and the best price drops in your inbox. No spam — unsubscribe anytime.",
  placeholder: "you@example.com",
  buttonLabel: "Subscribe",
  successMessage: "You're on the list! Watch your inbox for the next drop.",
};

/* ----------------------------- homepage sections --------------------------- */

export const SECTION_TYPES = [
  "top_selling", "adsense", "deals", "top_sellers", "sponsored", "how_it_works", "newsletter",
  "product_grid", "recently_viewed", "categories", "promo_cards", "become_seller",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_META: Record<SectionType, { label: string; hint: string; unique?: boolean }> = {
  top_selling: { label: "Top-selling products", hint: "Hero block with category chips and the best-selling products." },
  adsense: { label: "Google AdSense ad", hint: "A responsive AdSense unit. Hidden unless fully configured in Site & theme → Advertising." },
  deals: { label: "Deals of the day", hint: "Products with the deepest discount versus the recommended price." },
  top_sellers: { label: "Top sellers", hint: "Approved sellers ranked by rating, sales or number of reviews." },
  sponsored: { label: "Sponsored / custom ad", hint: "Your own image banner. Hidden until an image is set." },
  how_it_works: { label: "Steps (how it works)", hint: "Three editable steps explaining how buying works." },
  newsletter: { label: "Newsletter subscription", hint: "Sign-up form. Heading and settings come from Site & theme → Newsletter.", unique: true },
  product_grid: { label: "Product list", hint: "Featured, new, gift cards, bestsellers, a category — pick a source." },
  recently_viewed: { label: "Recently viewed", hint: "Shows the signed-in visitor's recently viewed products. Hidden for guests.", unique: true },
  categories: { label: "Browse categories", hint: "Tiles for every enabled category.", unique: true },
  promo_cards: { label: "Promo cards", hint: "The cards managed under Categories & banners.", unique: true },
  become_seller: { label: "Become a seller", hint: "Call-to-action for new sellers (to be redesigned later).", unique: true },
};

export const GRID_SOURCES = ["featured", "popular", "newest", "discount", "giftcard", "category"] as const;
export const SELLER_SORTS = ["rating", "sales", "reviews"] as const;
export const STEP_ICONS = ["Search", "CreditCard", "KeyRound", "ShieldCheck", "Zap", "Gift"] as const;

const StepSchema = z.object({
  icon: z.enum(STEP_ICONS),
  title: z.string().max(60),
  text: z.string().max(200),
});

const SettingsSchema = z.object({
  /** how many items to show */
  limit: z.number().int().min(1).max(24).optional(),
  /** auto = ranked by rule, manual = hand-picked ids below */
  mode: z.enum(["auto", "manual"]).optional(),
  productIds: z.array(z.string().uuid()).max(24).optional(),
  sellerIds: z.array(z.string().uuid()).max(24).optional(),
  sellerSort: z.enum(SELLER_SORTS).optional(),
  gridSource: z.enum(GRID_SOURCES).optional(),
  categorySlug: z.string().max(80).optional(),
  layout: z.enum(["grid", "spotlight"]).optional(),
  ctaText: z.string().max(30).optional(),
  ctaHref: safeUrl.optional(),
  eyebrow: z.string().max(90).optional(),
  showCategoryChips: z.boolean().optional(),
  showSearch: z.boolean().optional(),
  adSlot: z.enum(AD_SLOT_KEYS).optional(),
  imageUrl: safeUrl.optional(),
  linkUrl: safeUrl.optional(),
  alt: z.string().max(140).optional(),
  height: z.enum(["slim", "medium", "large"]).optional(),
  steps: z.array(StepSchema).max(6).optional(),
});
export type SectionSettings = z.infer<typeof SettingsSchema>;

export const HomeSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{2,48}$/i),
  type: z.enum(SECTION_TYPES),
  title: z.string().max(100),
  description: z.string().max(400),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(1000),
  settings: SettingsSchema,
});
export type HomeSection = z.infer<typeof HomeSectionSchema>;

export const HomeSectionsSchema = z.array(HomeSectionSchema).max(40).superRefine((list, ctx) => {
  const seen = new Set<string>();
  list.forEach((s, i) => {
    if (seen.has(s.id)) ctx.addIssue({ code: "custom", message: `Duplicate section id "${s.id}"`, path: [i, "id"] });
    seen.add(s.id);
  });
});

const DEFAULT_STEPS = [
  { icon: "Search" as const, title: "Find the best offer", text: "Compare verified sellers with live ratings, prices and stock — all in one table." },
  { icon: "CreditCard" as const, title: "Pay securely", text: "Checkout with card, PayPal or local methods. Buyer protection is automatic." },
  { icon: "KeyRound" as const, title: "Play in seconds", text: "Your key is delivered instantly to your vault. Activate, download, play." },
];

/**
 * Default homepage — used until an admin saves a layout. The first seven entries are the
 * requested order; the extra sections ship disabled so they can be switched on with one click.
 */
export const DEFAULT_SECTIONS: HomeSection[] = [
  { id: "top-selling", type: "top_selling", enabled: true, title: "Top-selling products",
    description: "Thousands of sellers compete on price so you never pay RRP again. Keys, gift cards, software and subscriptions — delivered in seconds.",
    order: 0, settings: { limit: 6, mode: "auto", showCategoryChips: true, showSearch: true, eyebrow: "Instant digital delivery · Buyer protection on every order" } },
  { id: "ad-adsense-top", type: "adsense", enabled: true, title: "Google AdSense", description: "", order: 1, settings: { adSlot: "home_top" } },
  { id: "deals", type: "deals", enabled: true, title: "Deals of the day", description: "Deepest discounts vs recommended retail price.",
    order: 2, settings: { limit: 4, mode: "auto", ctaText: "View all", ctaHref: "/search?sort=discount" } },
  { id: "top-sellers", type: "top_sellers", enabled: true, title: "Top-rated sellers", description: "",
    order: 3, settings: { limit: 4, mode: "auto", sellerSort: "reviews" } },
  { id: "ad-sponsored", type: "sponsored", enabled: true, title: "Sponsored", description: "",
    order: 4, settings: { imageUrl: "", linkUrl: "", alt: "", height: "medium" } },
  { id: "how-it-works", type: "how_it_works", enabled: true, title: "Three steps to your key", description: "",
    order: 5, settings: { steps: DEFAULT_STEPS } },
  { id: "newsletter", type: "newsletter", enabled: true, title: "Newsletter subscription", description: "", order: 6, settings: {} },
  // ---- optional sections (disabled by default) ----
  { id: "featured-drops", type: "product_grid", enabled: false, title: "Hand-picked featured drops",
    description: "Our curation team tracks new releases and flags the best price-to-hype ratio so the good stuff never gets buried.",
    order: 7, settings: { gridSource: "featured", limit: 4, layout: "spotlight", ctaText: "Explore featured", ctaHref: "/search?featured=1" } },
  { id: "new-releases", type: "product_grid", enabled: false, title: "New releases", description: "Fresh keys, just landed.",
    order: 8, settings: { gridSource: "newest", limit: 8, layout: "grid", ctaText: "View all", ctaHref: "/search?sort=newest" } },
  { id: "gift-cards", type: "product_grid", enabled: false, title: "Gift cards & top-ups", description: "Wallet credit for every storefront, below face value.",
    order: 9, settings: { gridSource: "giftcard", limit: 6, layout: "grid", ctaText: "View all", ctaHref: "/category/gift-cards" } },
  { id: "recently-viewed", type: "recently_viewed", enabled: false, title: "Recently viewed", description: "", order: 10, settings: { limit: 5 } },
  { id: "categories", type: "categories", enabled: false, title: "Browse categories", description: "", order: 11, settings: {} },
  { id: "promo-cards", type: "promo_cards", enabled: false, title: "Promo cards", description: "", order: 12, settings: {} },
  { id: "become-seller", type: "become_seller", enabled: false, title: "Turn your keys into revenue",
    description: "List inventory in minutes, manage stock in bulk, track commissions in real time, and withdraw with transparent payouts.",
    order: 13, settings: { ctaText: "Start selling", ctaHref: "/sell", eyebrow: "For sellers" } },
];

/** New section created from the admin "Add section" menu. */
export function newSection(type: SectionType, order: number): HomeSection {
  const id = `${type.replace(/_/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { id, type, enabled: true, order, title: SECTION_META[type].label, description: "" };
  switch (type) {
    case "top_selling": return { ...base, settings: { limit: 6, mode: "auto", showCategoryChips: true, showSearch: true } };
    case "adsense": return { ...base, settings: { adSlot: "home_middle" } };
    case "deals": return { ...base, settings: { limit: 4, mode: "auto", ctaText: "View all", ctaHref: "/search?sort=discount" } };
    case "top_sellers": return { ...base, settings: { limit: 4, mode: "auto", sellerSort: "rating" } };
    case "sponsored": return { ...base, settings: { imageUrl: "", linkUrl: "", alt: "", height: "medium" } };
    case "how_it_works": return { ...base, settings: { steps: DEFAULT_STEPS } };
    case "product_grid": return { ...base, settings: { gridSource: "popular", limit: 8, layout: "grid", mode: "auto" } };
    case "recently_viewed": return { ...base, settings: { limit: 5 } };
    case "become_seller": return { ...base, settings: { ctaText: "Start selling", ctaHref: "/sell", eyebrow: "For sellers" } };
    default: return { ...base, settings: {} };
  }
}

/** Sort by `order` and renumber 0..n-1 so stored order is always dense and stable. */
export function normalizeSections(list: HomeSection[]): HomeSection[] {
  return [...list].sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i }));
}
