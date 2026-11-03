import type { ZodType } from "zod";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiAdmin } from "@/lib/guards";
import { logAudit, setSetting } from "@/lib/ops";
import {
  AdsSchema, HomeSectionsSchema, NewsletterSchema, PromoBannerSchema, normalizeSections,
} from "@/lib/site-config";
import { DEFAULT_THEME, EDITABLE_KEYS, PRESET_IDS, isHex, sanitizeTheme } from "@/lib/theme";
import {
  getAdsConfig, getHomeSections, getNewsletterConfig, getPromoBanner, getThemeSettings,
} from "@/lib/site-data";
import { z } from "zod";

type Ctx = { params: Promise<{ key: string }> };

// optional hex per editable colour, e.g. { bg: "#faf7f0", brand: "#b8860b" }
const ColorSideBody = z.object(
  Object.fromEntries(EDITABLE_KEYS.map((k) => [k, z.string().refine(isHex).optional()])) as Record<string, z.ZodOptional<z.ZodString>>,
);

const ThemeBody = z.object({
  preset: z.enum(PRESET_IDS as [string, ...string[]]),
  mode: z.enum(["preset", "auto", "light", "dark"]).default("preset"),
  overrides: z.object({ light: ColorSideBody.default({}), dark: ColorSideBody.default({}) }).default({ light: {}, dark: {} }),
  glass: z.number().int().min(0).max(100),
  radius: z.enum(["sharp", "soft", "round"]),
  custom: z.object({
    accent: z.string().refine(isHex), lightBg: z.string().refine(isHex), lightSurface: z.string().refine(isHex),
    lightInk: z.string().refine(isHex), darkBg: z.string().refine(isHex), darkSurface: z.string().refine(isHex),
    darkInk: z.string().refine(isHex), mode: z.enum(["auto", "light", "dark"]),
  }),
});

const KEYS: Record<string, { schema: ZodType<unknown>; store: string; read: () => Promise<unknown>; prepare?: (v: never) => unknown }> = {
  theme: { schema: ThemeBody, store: "theme", read: getThemeSettings, prepare: ((v: unknown) => sanitizeTheme(v)) as never },
  promo_banner: { schema: PromoBannerSchema, store: "promo_banner", read: getPromoBanner },
  ads: { schema: AdsSchema, store: "ads", read: getAdsConfig },
  newsletter: { schema: NewsletterSchema, store: "newsletter", read: getNewsletterConfig },
  homepage_sections: {
    schema: HomeSectionsSchema, store: "homepage_sections", read: getHomeSections,
    prepare: ((v: Parameters<typeof normalizeSections>[0]) => normalizeSections(v)) as never,
  },
};

/** Admin-only read/write of storefront configuration (theme, banner, ads, newsletter, homepage layout). */
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;
  const { key } = await params;
  if (key === "defaults-theme") return ok(DEFAULT_THEME);
  const def = KEYS[key];
  if (!def) return fail("Unknown setting.", 404);
  return ok(await def.read());
}

export async function PUT(req: Request, { params }: Ctx) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.resp;
  const { key } = await params;
  const def = KEYS[key];
  if (!def) return fail("Unknown setting.", 404);

  const { data, resp } = await parseJson(req, def.schema);
  if (data === undefined) return resp!;
  const value = def.prepare ? def.prepare(data as never) : data;
  await setSetting(def.store, value);
  await logAudit({ actorId: auth.user.id, action: `site.${key}.update`, entity: "setting", entityId: key });
  return ok({ saved: true });
}