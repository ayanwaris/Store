import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { db } from "@/db";
import { sellerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fmtEUR } from "@/lib/utils";
import { LayoutDashboard, Tag, PlusCircle, ShoppingBag, Banknote, Star, Settings, ExternalLink } from "lucide-react";

const NAV = [
  { href: "/seller", label: "Overview", icon: LayoutDashboard },
  { href: "/seller/offers", label: "Offers", icon: Tag },
  { href: "/seller/offers/new", label: "New listing", icon: PlusCircle },
  { href: "/seller/orders", label: "Sales", icon: ShoppingBag },
  { href: "/seller/payouts", label: "Payouts", icon: Banknote },
  { href: "/seller/reviews", label: "Reviews", icon: Star },
  { href: "/seller/settings", label: "Store settings", icon: Settings },
];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSeller();
  const seller = (await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, user.sellerId)).limit(1))[0]!;

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-vio to-brand-deep font-display text-xl font-bold text-white">
          {seller.storeName[0]}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold">{seller.storeName}</h1>
          <p className="text-sm text-faint">
            {seller.commissionRate}% commission · {Number(seller.ratingAvg).toFixed(1)}% positive · {seller.totalSales.toLocaleString()} sales
          </p>
        </div>
        <Link href={`/store/${seller.slug}`} className="btn btn-outline btn-sm">
          <ExternalLink size={14} /> View storefront
        </Link>
        <span className="chip border border-mint/25 bg-mint/10 px-3 py-1.5 text-sm text-mint">
          Balance {fmtEUR(seller.balance)}
        </span>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-mute transition hover:bg-white/4 hover:text-ink">
              <n.icon size={16} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
