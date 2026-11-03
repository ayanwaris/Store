import {
  Gamepad2, Gift, AppWindow, BadgeCheck, Coins, Puzzle, Monitor, Music, Film, ShoppingBag,
  Wallet, Trophy, Crown, Headphones, BookOpen, Cpu, Tv, Sparkles, Star, Zap, Shield,
} from "lucide-react";
import { createElement } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Icons an admin can assign to a category. The first six are the originals — their names
 * are stored in `categories.icon`, so keep the keys stable.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Gamepad2, Gift, AppWindow, BadgeCheck, Coins, Puzzle,
  Monitor, Music, Film, ShoppingBag, Wallet, Trophy, Crown, Headphones, BookOpen, Cpu, Tv, Sparkles, Star, Zap, Shield,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || Gamepad2;
}

/** Where a category link should go: custom URL if the admin set one, otherwise its category page. */
export function categoryHref(c: { slug: string; href?: string | null }) {
  return c.href && c.href.trim() ? c.href : `/category/${c.slug}`;
}

/** Renders the icon registered under `name` (falls back to the game controller). */
export function renderCategoryIcon(name: string | null | undefined, size: number) {
  return createElement(getCategoryIcon(name), { size });
}
