import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { db } from "@/db";
import { sellerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fmtEUR } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import SellerNav from "@/components/SellerNav";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSeller();
  const seller = (await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, user.sellerId)).limit(1))[0]!;

  return (
    <div className="container-x py-6 md:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-3 sm:mb-6 sm:gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl sm:h-14 sm:w-14 bg-gradient-to-br from-vio to-brand-deep font-display text-xl font-bold text-white">
          {seller.storeName[0]}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold">{seller.storeName}</h1>
          <p className="text-xs text-faint sm:text-sm">
            {seller.commissionRate}% commission · {Number(seller.ratingAvg).toFixed(1)}% positive · {seller.totalSales.toLocaleString()} sales
          </p>
        </div>
        {/* phones: storefront link and balance share one full-width row under the store name */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link href={`/store/${seller.slug}`} className="btn btn-outline btn-sm flex-1 sm:flex-none">
            <ExternalLink size={14} /> View storefront
          </Link>
          <span className="chip border border-mint/25 bg-mint/10 px-3 py-1.5 text-sm text-mint">
            Balance {fmtEUR(seller.balance)}
          </span>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:gap-8">
        <SellerNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
