/**
 * KEYHAVEN — central theme system.
 *
 * This is the ONE place that defines how the website looks.
 *  - Each preset provides a full token set for light and for dark mode.
 *  - `buildThemeCss()` turns the active preset (+ admin overrides) into CSS variables
 *    that are injected once, server-side, from the root layout.
 *  - globals.css and every component only ever read those variables, so changing a
 *    preset / colour / glass intensity here (or in Admin → Site & theme) restyles every page.
 *
 * Light vs dark follows the visitor's operating system through
 * `@media (prefers-color-scheme: dark)` — pure CSS, so there is no flash of the wrong theme.
 *
 * This file is dependency-free so it can be imported from server and client code alike.
 */

export type ThemeTokens = {
  bg: string;          // page background
  panel: string;       // nav / footer / secondary surfaces
  card: string;        // cards
  raised: string;      // raised / hovered surfaces, icon tiles
  line: string;        // borders
  lineSoft: string;    // subtle dividers
  ink: string;         // primary text
  mute: string;        // secondary text
  faint: string;       // tertiary text (kept >= 4.5:1 on bg)
  brand: string;       // accent used for text / icons / links
  brandBright: string; // accent hover
  brandDeep: string;   // accent pressed / deep
  goldA: string;       // accent fill gradient start (buttons, badges, logo)
  goldB: string;       // accent fill gradient end
  onBrand: string;     // text on accent fills
  accent2: string;     // secondary accent
  onAccent2: string;   // text on secondary accent fills
  success: string;
  glow1: string;       // ambient background glow (top right)
  glow2: string;       // ambient background glow (top left)
  shadow: string;      // shadow colour (with alpha)
  /** Status colours used by Tailwind's rose/amber/sky/emerald utilities across the app */
  status: Record<"rose200" | "rose300" | "rose400" | "amber200" | "amber300" | "amber400" | "sky300" | "sky400" | "emerald300" | "emerald400", string>;
};

/** Colours the admin can edit by hand, on top of ANY preset (light and dark sides are edited separately). */
export type EditableKey =
  | "bg" | "panel" | "card" | "raised" | "line" | "lineSoft"
  | "ink" | "mute" | "faint"
  | "brand" | "brandBright" | "brandDeep"
  | "goldA" | "goldB" | "onBrand" | "accent2" | "onAccent2";

export const EDITABLE_GROUPS: { title: string; items: { key: EditableKey; label: string; hint: string }[] }[] = [
  { title: "Backgrounds", items: [
    { key: "bg", label: "Page background", hint: "Main page colour — use an off-white here" },
    { key: "panel", label: "Navbar / footer", hint: "Header, footer and secondary surfaces" },
    { key: "card", label: "Cards", hint: "Product cards, boxes, forms" },
    { key: "raised", label: "Raised / hover", hint: "Icon tiles, hovered rows" },
  ] },
  { title: "Borders", items: [
    { key: "line", label: "Border", hint: "Card and input outlines" },
    { key: "lineSoft", label: "Soft divider", hint: "Subtle separators" },
  ] },
  { title: "Text", items: [
    { key: "ink", label: "Main text", hint: "Headings and body" },
    { key: "mute", label: "Secondary text", hint: "Descriptions" },
    { key: "faint", label: "Tertiary text", hint: "Captions, placeholders" },
  ] },
  { title: "Accent (e.g. gold)", items: [
    { key: "brand", label: "Accent colour", hint: "Links, icons, highlights. Hover/pressed shades follow it unless edited" },
    { key: "brandBright", label: "Accent hover", hint: "Optional — auto if not edited" },
    { key: "brandDeep", label: "Accent pressed", hint: "Optional — auto if not edited" },
  ] },
  { title: "Buttons & badges", items: [
    { key: "goldA", label: "Button gradient — top", hint: "Lighter end" },
    { key: "goldB", label: "Button gradient — bottom", hint: "Darker end" },
    { key: "onBrand", label: "Text on buttons", hint: "Auto-readable if not edited" },
    { key: "accent2", label: "Secondary accent", hint: "Secondary buttons, gradients" },
    { key: "onAccent2", label: "Text on secondary", hint: "Auto-readable if not edited" },
  ] },
];
export const EDITABLE_KEYS: EditableKey[] = EDITABLE_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export type ColorSide = Partial<Record<EditableKey, string>>;
export type ColorOverrides = { light: ColorSide; dark: ColorSide };
export const EMPTY_OVERRIDES: ColorOverrides = { light: {}, dark: {} };

export type PresetId =
  | "white-gold" | "off-white-gold" | "black-gold"
  | "white-silver" | "off-white-silver" | "dark-purple" | "custom";
export const PRESET_IDS: PresetId[] = [
  "white-gold", "off-white-gold", "black-gold",
  "white-silver", "off-white-silver", "dark-purple", "custom",
];

/** auto = follow the visitor's OS; light/dark = force one mode regardless of OS */
export type ThemeMode = "auto" | "light" | "dark";

type Preset = { label: string; description: string; mode: ThemeMode; light: ThemeTokens; dark: ThemeTokens };

const STATUS_LIGHT: ThemeTokens["status"] = {
  rose200: "#9f1239", rose300: "#be123c", rose400: "#e11d48",
  amber200: "#854d0e", amber300: "#a16207", amber400: "#d97706",
  sky300: "#0369a1", sky400: "#0284c7",
  emerald300: "#047857", emerald400: "#059669",
};
const STATUS_DARK: ThemeTokens["status"] = {
  rose200: "#fecdd3", rose300: "#fda4af", rose400: "#fb7185",
  amber200: "#fde68a", amber300: "#fcd34d", amber400: "#fbbf24",
  sky300: "#7dd3fc", sky400: "#38bdf8",
  emerald300: "#6ee7b7", emerald400: "#34d399",
};

/* ------------------------------ White & Gold ------------------------------ */
const WG_LIGHT: ThemeTokens = {
  bg: "#ffffff", panel: "#fbf8f1", card: "#ffffff", raised: "#f5eedc",
  line: "#e6dcc3", lineSoft: "#efe8d3",
  ink: "#1b1810", mute: "#5a5340", faint: "#756e59",
  brand: "#946a00", brandBright: "#b58a14", brandDeep: "#7d5600",
  goldA: "#efcb62", goldB: "#c99a1a", onBrand: "#1b1405",
  accent2: "#7a5c1e", onAccent2: "#ffffff", success: "#0f8a5f",
  glow1: "rgba(212,166,42,0.16)", glow2: "rgba(212,166,42,0.08)",
  shadow: "rgba(70,52,10,0.22)",
  status: STATUS_LIGHT,
};
const WG_DARK: ThemeTokens = {
  bg: "#060606", panel: "#0d0c0a", card: "#14130f", raised: "#1e1c15",
  line: "#2d281a", lineSoft: "#1e1b12",
  ink: "#f7f2e4", mute: "#b7ae96", faint: "#8a826a",
  brand: "#e5bb4d", brandBright: "#f2d27a", brandDeep: "#c29a2c",
  goldA: "#f3d479", goldB: "#d3a42c", onBrand: "#1b1405",
  accent2: "#d8c28b", onAccent2: "#1b1405", success: "#34d399",
  glow1: "rgba(229,187,77,0.12)", glow2: "rgba(229,187,77,0.06)",
  shadow: "rgba(0,0,0,0.75)",
  status: STATUS_DARK,
};

/* ------------------------------ Black & Gold ------------------------------ */
const BG_DARK: ThemeTokens = {
  ...WG_DARK,
  bg: "#000000", panel: "#070707", card: "#0f0f0e", raised: "#191815",
  lineSoft: "#1b1810",
};

/* ----------------------------- White & Silver ----------------------------- */
const WS_LIGHT: ThemeTokens = {
  bg: "#ffffff", panel: "#f7f8fa", card: "#ffffff", raised: "#eff1f4",
  line: "#dde1e7", lineSoft: "#e9ecf0",
  ink: "#14171c", mute: "#4d5663", faint: "#6b7482",
  brand: "#4a5666", brandBright: "#66758a", brandDeep: "#38424f",
  goldA: "#eef1f5", goldB: "#aab4c2", onBrand: "#12161b",
  accent2: "#5b6b82", onAccent2: "#ffffff", success: "#0f8a5f",
  glow1: "rgba(120,135,160,0.16)", glow2: "rgba(120,135,160,0.08)",
  shadow: "rgba(30,40,60,0.2)",
  status: STATUS_LIGHT,
};
const WS_DARK: ThemeTokens = {
  bg: "#08090b", panel: "#0e1013", card: "#14171b", raised: "#1d2127",
  line: "#2a2f37", lineSoft: "#1c2026",
  ink: "#f1f3f6", mute: "#aeb5c0", faint: "#808896",
  brand: "#c9d1dc", brandBright: "#e3e8ee", brandDeep: "#9aa5b4",
  goldA: "#f1f4f8", goldB: "#aeb8c6", onBrand: "#0e1013",
  accent2: "#9db0cc", onAccent2: "#0e1013", success: "#34d399",
  glow1: "rgba(190,205,225,0.10)", glow2: "rgba(190,205,225,0.05)",
  shadow: "rgba(0,0,0,0.75)",
  status: STATUS_DARK,
};

/* ------------------------------- Dark Purple ------------------------------ */
const DP_DARK: ThemeTokens = {
  bg: "#0a0614", panel: "#100a1f", card: "#170f2b", raised: "#21173d",
  line: "#33265c", lineSoft: "#231a42",
  ink: "#f3effd", mute: "#b9afd6", faint: "#8d83ad",
  brand: "#b794f6", brandBright: "#d0b4ff", brandDeep: "#8b5cf6",
  goldA: "#a678f7", goldB: "#7c3aed", onBrand: "#ffffff",
  accent2: "#f0abfc", onAccent2: "#2a0a35", success: "#34d399",
  glow1: "rgba(139,92,246,0.18)", glow2: "rgba(240,171,252,0.08)",
  shadow: "rgba(0,0,0,0.8)",
  status: STATUS_DARK,
};

/* Light side for presets that used to be dark-only (so they work if the admin switches mode to "follow device"). */
const DP_LIGHT: ThemeTokens = {
  bg: "#faf7ff", panel: "#f4effd", card: "#ffffff", raised: "#ece4fb",
  line: "#ddd0f5", lineSoft: "#e9e0f8",
  ink: "#1a1230", mute: "#524670", faint: "#6e6290",
  brand: "#6d3fd1", brandBright: "#8456e6", brandDeep: "#5527ad",
  goldA: "#b794f6", goldB: "#8b5cf6", onBrand: "#ffffff",
  accent2: "#a21caf", onAccent2: "#ffffff", success: "#0f8a5f",
  glow1: "rgba(139,92,246,0.16)", glow2: "rgba(240,171,252,0.1)",
  shadow: "rgba(40,20,90,0.22)",
  status: STATUS_LIGHT,
};

/* ------------------------------ Off-white (ivory) ------------------------------ */
const OWG_LIGHT: ThemeTokens = {
  ...WG_LIGHT,
  bg: "#faf7f0", panel: "#f3eee1", card: "#fffdf8", raised: "#ece5d2",
  line: "#e0d6ba", lineSoft: "#eae2cb",
};
const OWS_LIGHT: ThemeTokens = {
  ...WS_LIGHT,
  bg: "#f6f6f3", panel: "#eeeeea", card: "#fcfcfa", raised: "#e6e7e4",
  line: "#d9dbd8", lineSoft: "#e5e6e3",
};

export const PRESETS: Record<Exclude<PresetId, "custom">, Preset> = {
  "white-gold": {
    label: "White & Gold",
    description: "Warm white with gold accents in light mode, deep black with gold in dark mode. Follows the visitor's device.",
    mode: "auto", light: WG_LIGHT, dark: WG_DARK,
  },
  "off-white-gold": {
    label: "Off-white & Gold",
    description: "Soft ivory instead of pure white, with gold accents; deep black with gold in dark mode.",
    mode: "auto", light: OWG_LIGHT, dark: WG_DARK,
  },
  "black-gold": {
    label: "Black & Gold",
    description: "Always black with gold accents, whatever the visitor's device uses.",
    mode: "dark", light: WG_LIGHT, dark: BG_DARK,
  },
  "white-silver": {
    label: "White & Silver",
    description: "Clean white with cool silver accents; charcoal and silver in dark mode.",
    mode: "auto", light: WS_LIGHT, dark: WS_DARK,
  },
  "off-white-silver": {
    label: "Off-white & Silver",
    description: "Soft grey-white with cool silver accents; charcoal and silver in dark mode.",
    mode: "auto", light: OWS_LIGHT, dark: WS_DARK,
  },
  "dark-purple": {
    label: "Dark Purple",
    description: "Always dark, with violet accents and a purple-tinted glass finish.",
    mode: "dark", light: DP_LIGHT, dark: DP_DARK,
  },
};

/* --------------------------------- settings -------------------------------- */

export type CustomTheme = {
  accent: string;
  lightBg: string; lightSurface: string; lightInk: string;
  darkBg: string; darkSurface: string; darkInk: string;
  mode: ThemeMode;
};

export type RadiusId = "sharp" | "soft" | "round";
export const RADIUS_REM: Record<RadiusId, number> = { sharp: 0.5, soft: 1, round: 1.5 };

export type ThemeSettings = {
  preset: PresetId;
  /** "preset" = use the preset's own light/dark behaviour; otherwise force it (presets only — Custom has its own mode) */
  mode: "preset" | ThemeMode;
  /** hand-edited colours applied on top of the preset (empty = pure preset) */
  overrides: ColorOverrides;
  /** glassmorphism intensity, 0 (solid) – 100 (very frosted) */
  glass: number;
  radius: RadiusId;
  custom: CustomTheme;
};

export const DEFAULT_CUSTOM: CustomTheme = {
  accent: "#c99a1a",
  lightBg: "#ffffff", lightSurface: "#ffffff", lightInk: "#1b1810",
  darkBg: "#060606", darkSurface: "#14130f", darkInk: "#f7f2e4",
  mode: "auto",
};

export const DEFAULT_THEME: ThemeSettings = {
  preset: "white-gold",
  mode: "preset",
  overrides: EMPTY_OVERRIDES,
  glass: 60,
  radius: "soft",
  custom: DEFAULT_CUSTOM,
};

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

/** Coerce anything (database JSON, request body) into a safe ThemeSettings. */
export function sanitizeTheme(input: unknown): ThemeSettings {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const c = (src.custom && typeof src.custom === "object" ? src.custom : {}) as Record<string, unknown>;
  const pick = (v: unknown, d: string) => (isHex(v) ? v.toLowerCase() : d);
  const preset = PRESET_IDS.includes(src.preset as PresetId) ? (src.preset as PresetId) : DEFAULT_THEME.preset;
  const glassRaw = Number(src.glass);
  const radius = (["sharp", "soft", "round"] as const).includes(src.radius as RadiusId) ? (src.radius as RadiusId) : DEFAULT_THEME.radius;
  const mode = (["auto", "light", "dark"] as const).includes(c.mode as ThemeMode) ? (c.mode as ThemeMode) : "auto";
  const pickSide = (v: unknown): ColorSide => {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    const out: ColorSide = {};
    for (const k of EDITABLE_KEYS) if (isHex(o[k])) out[k] = (o[k] as string).toLowerCase();
    return out;
  };
  const ov = (src.overrides && typeof src.overrides === "object" ? src.overrides : {}) as Record<string, unknown>;
  const topMode = (["preset", "auto", "light", "dark"] as const).includes(src.mode as never) ? (src.mode as ThemeSettings["mode"]) : "preset";
  return {
    preset,
    mode: topMode,
    overrides: { light: pickSide(ov.light), dark: pickSide(ov.dark) },
    glass: Number.isFinite(glassRaw) ? Math.min(100, Math.max(0, Math.round(glassRaw))) : DEFAULT_THEME.glass,
    radius,
    custom: {
      accent: pick(c.accent, DEFAULT_CUSTOM.accent),
      lightBg: pick(c.lightBg, DEFAULT_CUSTOM.lightBg),
      lightSurface: pick(c.lightSurface, DEFAULT_CUSTOM.lightSurface),
      lightInk: pick(c.lightInk, DEFAULT_CUSTOM.lightInk),
      darkBg: pick(c.darkBg, DEFAULT_CUSTOM.darkBg),
      darkSurface: pick(c.darkSurface, DEFAULT_CUSTOM.darkSurface),
      darkInk: pick(c.darkInk, DEFAULT_CUSTOM.darkInk),
      mode,
    },
  };
}

/* ------------------------------- colour maths ------------------------------ */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]: [number, number, number]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
}
/** Blend `a` towards `b` by t (0..1). */
export function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}
function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const readableOn = (bg: string) => (luminance(bg) > 0.4 ? "#14110a" : "#ffffff");
const alpha = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** Derive a full token set from just an accent + three base colours (Custom Theme). */
function deriveTokens(accent: string, bg: string, surface: string, ink: string, dark: boolean): ThemeTokens {
  // In light mode the accent is darkened so it stays readable as text on a light background.
  const brand = dark ? accent : mix(accent, "#000000", 0.28);
  const accent2 = dark ? mix(accent, "#ffffff", 0.45) : mix(accent, "#000000", 0.45);
  return {
    bg, card: surface,
    panel: mix(bg, surface, 0.5),
    raised: mix(surface, ink, 0.07),
    line: mix(bg, ink, 0.16),
    lineSoft: mix(bg, ink, 0.09),
    ink,
    mute: mix(ink, bg, 0.34),
    faint: mix(ink, bg, dark ? 0.46 : 0.42),
    brand,
    brandBright: dark ? mix(accent, "#ffffff", 0.25) : mix(accent, "#000000", 0.12),
    brandDeep: mix(accent, "#000000", dark ? 0.2 : 0.4),
    goldA: mix(accent, "#ffffff", 0.35), goldB: accent,
    onBrand: readableOn(mix(accent, "#ffffff", 0.15)),
    accent2, onAccent2: readableOn(accent2),
    success: dark ? "#34d399" : "#0f8a5f",
    glow1: alpha(accent, dark ? 0.14 : 0.16), glow2: alpha(accent, dark ? 0.07 : 0.08),
    shadow: dark ? "rgba(0,0,0,0.75)" : alpha(mix(ink, "#000000", 0.2), 0.22),
    status: dark ? STATUS_DARK : STATUS_LIGHT,
  };
}

/** Apply hand-edited colours on top of a token set. Dependent shades follow unless they were edited too. */
export function applyOverrides(base: ThemeTokens, ov: ColorSide, dark: boolean): ThemeTokens {
  const out: ThemeTokens = { ...base };
  for (const k of EDITABLE_KEYS) {
    const v = ov[k];
    if (v) (out as Record<string, unknown>)[k] = v;
  }
  if (ov.brand) {
    if (!ov.brandBright) out.brandBright = dark ? mix(ov.brand, "#ffffff", 0.25) : mix(ov.brand, "#000000", 0.12);
    if (!ov.brandDeep) out.brandDeep = mix(ov.brand, "#000000", dark ? 0.2 : 0.4);
    out.glow1 = alpha(ov.brand, dark ? 0.14 : 0.16);
    out.glow2 = alpha(ov.brand, dark ? 0.07 : 0.08);
  }
  if ((ov.goldA || ov.goldB) && !ov.onBrand) out.onBrand = readableOn(mix(out.goldA, out.goldB, 0.5));
  if (ov.accent2 && !ov.onAccent2) out.onAccent2 = readableOn(ov.accent2);
  return out;
}

/** Resolve the light/dark token sets + mode for the given settings (hand edits included unless `withOverrides` is false). */
export function resolveTheme(t: ThemeSettings, withOverrides = true): { light: ThemeTokens; dark: ThemeTokens; mode: ThemeMode } {
  const ov = withOverrides ? t.overrides : EMPTY_OVERRIDES;
  if (t.preset !== "custom") {
    const p = PRESETS[t.preset];
    return {
      light: applyOverrides(p.light, ov.light, false),
      dark: applyOverrides(p.dark, ov.dark, true),
      mode: t.mode === "preset" ? p.mode : t.mode,
    };
  }
  const c = t.custom;
  return {
    light: applyOverrides(deriveTokens(c.accent, c.lightBg, c.lightSurface, c.lightInk, false), ov.light, false),
    dark: applyOverrides(deriveTokens(c.accent, c.darkBg, c.darkSurface, c.darkInk, true), ov.dark, true),
    mode: c.mode,
  };
}

/** Glass maths shared by the site CSS and the admin live preview. 0 = solid, 100 = very frosted. */
export function glassParams(glass: number) {
  const g = Math.min(100, Math.max(0, Number(glass) || 0));
  return {
    blur: Math.round((g / 100) * 40),            // px of backdrop blur
    panelPct: Math.round(97 - g * 0.6),          // navbar / footer opacity %   (97 → 37)
    cardPct: Math.round(98 - g * 0.55),          // card opacity %              (98 → 43)
    orbs: Number(((g / 100) * 0.7).toFixed(3)),  // opacity of the coloured shapes behind the page
    sat: Number((1 + (g / 100) * 0.7).toFixed(2)),
  };
}

/* ------------------------------ CSS generation ----------------------------- */

function tokenVars(k: ThemeTokens): string {
  const s = k.status;
  return [
    `--kh-bg:${k.bg}`, `--kh-panel:${k.panel}`, `--kh-card:${k.card}`, `--kh-raised:${k.raised}`,
    `--kh-line:${k.line}`, `--kh-line-soft:${k.lineSoft}`,
    `--kh-ink:${k.ink}`, `--kh-mute:${k.mute}`, `--kh-faint:${k.faint}`,
    `--kh-brand:${k.brand}`, `--kh-brand-bright:${k.brandBright}`, `--kh-brand-deep:${k.brandDeep}`,
    `--kh-gold-a:${k.goldA}`, `--kh-gold-b:${k.goldB}`, `--kh-on-brand:${k.onBrand}`,
    `--kh-accent2:${k.accent2}`, `--kh-on-accent2:${k.onAccent2}`, `--kh-success:${k.success}`,
    `--kh-glow-1:${k.glow1}`, `--kh-glow-2:${k.glow2}`, `--kh-shadow:${k.shadow}`,
    `--color-rose-200:${s.rose200}`, `--color-rose-300:${s.rose300}`, `--color-rose-400:${s.rose400}`,
    `--color-amber-200:${s.amber200}`, `--color-amber-300:${s.amber300}`, `--color-amber-400:${s.amber400}`,
    `--color-sky-300:${s.sky300}`, `--color-sky-400:${s.sky400}`,
    `--color-emerald-300:${s.emerald300}`, `--color-emerald-400:${s.emerald400}`,
  ].join(";");
}

/**
 * Build the CSS injected into <head>. Every value is generated from validated hex colours /
 * clamped numbers, so nothing user-supplied can break out of the stylesheet.
 */
export function buildThemeCss(settings: ThemeSettings): string {
  const { light, dark, mode } = resolveTheme(settings);
  const { blur, panelPct, cardPct, orbs, sat } = glassParams(settings.glass);
  const radius = RADIUS_REM[settings.radius] ?? 1;

  const shared = [
    `--kh-glass-blur:${blur}px`,
    `--kh-glass-sat:${sat}`,
    `--kh-glass-orbs:${orbs}`,
    `--kh-glass-bg:color-mix(in srgb,var(--kh-panel) ${panelPct}%,transparent)`,
    `--kh-glass-card:color-mix(in srgb,var(--kh-card) ${cardPct}%,transparent)`,
    `--kh-glass-border:color-mix(in srgb,var(--kh-line) 85%,transparent)`,
    `--kh-radius:${radius}rem`,
  ].join(";");

  const lightVars = mode === "dark" ? tokenVars(dark) : tokenVars(light);
  let css = `:root{${shared};color-scheme:${mode === "auto" ? "light dark" : mode};${lightVars}}`;
  if (mode === "auto") {
    // Device preference by default…
    css += `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${tokenVars(dark)}}}`;
    // …unless the visitor picked a theme with the navbar toggle (html[data-theme], saved in localStorage).
    css += `:root[data-theme="light"]{color-scheme:light}`;
    css += `:root[data-theme="dark"]{color-scheme:dark;${tokenVars(dark)}}`;
  }
  return css;
}

/** Colours used for <meta name="theme-color"> (browser UI tint). */
export function themeColors(settings: ThemeSettings) {
  const { light, dark, mode } = resolveTheme(settings);
  return { light: mode === "dark" ? dark.bg : light.bg, dark: mode === "light" ? light.bg : dark.bg, mode };
}