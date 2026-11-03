import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSessionUser, getCartCount } from "@/lib/auth";
import { db } from "@/db";
import { categories, notifications } from "@/db/schema";
import { and, asc, count, eq } from "drizzle-orm";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import ThemeSync from "@/components/site/ThemeSync";
import { Toaster } from "sonner";
import { buildThemeCss, themeColors } from "@/lib/theme";
import { isPromoVisible } from "@/lib/site-config";
import { getHomeSections, getNewsletterConfig, getPromoBanner, getThemeSettings } from "@/lib/site-data";

const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("kh-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: { default: "KEYHAVEN — Every game. One vault.", template: "%s · KEYHAVEN" },
  description:
    "KeyHaven is a digital marketplace for game keys, gift cards, software and subscriptions — with instant delivery and vetted sellers.",
};

/** Tints the browser UI (mobile address bar) with the active theme and declares which schemes the site supports. */
export async function generateViewport(): Promise<Viewport> {
  const t = themeColors(await getThemeSettings());
  return {
    colorScheme: t.mode === "auto" ? "light dark" : t.mode,
    themeColor:
      t.mode === "auto"
        ? [{ media: "(prefers-color-scheme: light)", color: t.light }, { media: "(prefers-color-scheme: dark)", color: t.dark }]
        : t.mode === "dark" ? t.dark : t.light,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, cats, cartCount, theme, promo, newsletter, homeSections] = await Promise.all([
    getSessionUser(),
    db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.position)),
    getCartCount(),
    getThemeSettings(),
    getPromoBanner(),
    getNewsletterConfig(),
    getHomeSections(),
  ]);
  const unread = user
    ? (await db.select({ n: count() }).from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.read, false))))[0]?.n ?? 0
    : 0;

  const showPromo = isPromoVisible(promo, !!user);
  // The Sun/Moon toggle only makes sense for presets that follow the device (not Black & Gold / Dark Purple).
  const themeToggle = themeColors(theme).mode === "auto";
  // when the homepage already has its own enabled newsletter section, the footer band is skipped on "/"
  const homeHasNewsletter = homeSections.some((s) => s.type === "newsletter" && s.enabled);

  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`} suppressHydrationWarning>
      <head>
        {/* Generated from src/lib/theme.ts — the single source of truth for colours, glass and radius. */}
        <style id="kh-theme" dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }} />
        {/* Re-applies a theme the visitor picked with the navbar toggle BEFORE first paint (no flash). */}
        {themeToggle && <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />}
      </head>
      <body>
        <ThemeSync />
        <Header
          user={user ? { name: user.name, email: user.email, role: user.role, avatarHue: user.avatarHue, sellerStatus: user.sellerStatus } : null}
          categories={cats.map((c) => ({ name: c.name, slug: c.slug, icon: c.icon, imageUrl: c.imageUrl, href: c.href }))}
          cartCount={cartCount}
          unread={unread}
          promo={showPromo ? promo : null}
          themeToggle={themeToggle}
        />
        <main className="min-h-[70vh]">{children}</main>
        <Footer
          categories={cats.map((c) => ({ name: c.name, slug: c.slug, href: c.href }))}
          newsletter={newsletter}
          hideNewsletterOnHome={homeHasNewsletter}
        />
        <Toaster
          theme="system"
          position="bottom-right"
          toastOptions={{
            style: { background: "var(--kh-card)", border: "1px solid var(--kh-line)", color: "var(--kh-ink)" },
          }}
        />
      </body>
    </html>
  );
}
