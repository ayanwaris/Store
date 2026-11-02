import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSessionUser, getCartCount } from "@/lib/auth";
import { db } from "@/db";
import { categories, notifications } from "@/db/schema";
import { and, asc, count, eq } from "drizzle-orm";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: { default: "KEYHAVEN — Every game. One vault.", template: "%s · KEYHAVEN" },
  description:
    "KeyHaven is a digital marketplace for game keys, gift cards, software and subscriptions — with instant delivery and vetted sellers.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, cats, cartCount] = await Promise.all([
    getSessionUser(),
    db.select().from(categories).orderBy(asc(categories.position)),
    getCartCount(),
  ]);
  const unread = user
    ? (await db.select({ n: count() }).from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.read, false))))[0]?.n ?? 0
    : 0;

  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`} suppressHydrationWarning>
      <body>
        <Header
          user={user ? { name: user.name, email: user.email, role: user.role, avatarHue: user.avatarHue, sellerStatus: user.sellerStatus } : null}
          categories={cats.map((c) => ({ name: c.name, slug: c.slug, icon: c.icon }))}
          cartCount={cartCount}
          unread={unread}
        />
        <main className="min-h-[70vh]">{children}</main>
        <Footer categories={cats.map((c) => ({ name: c.name, slug: c.slug }))} />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: { background: "#12152a", border: "1px solid #20253e", color: "#f2f4fa" },
          }}
        />
      </body>
    </html>
  );
}
