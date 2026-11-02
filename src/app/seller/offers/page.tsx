import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { offers, products } from "@/db/schema";
import { requireSeller } from "@/lib/auth";
import SellerOffersClient from "@/components/seller/SellerOffersClient";
import { PlusCircle } from "lucide-react";

export type SellerOffer = {
  id: string; price: number; region: string; active: boolean;
  stockCount: number; soldCount: number;
  productTitle: string; productSlug: string; platform: string; rrp: number;
};

export default async function SellerOffersPage() {
  const { sellerId } = await requireSeller();
  const rows = await db
    .select({
      id: offers.id, price: offers.price, region: offers.region, active: offers.active,
      stockCount: offers.stockCount, soldCount: offers.soldCount,
      productTitle: products.title, productSlug: products.slug, platform: products.platform, rrp: products.rrp,
    })
    .from(offers)
    .innerJoin(products, eq(products.id, offers.productId))
    .where(eq(offers.sellerId, sellerId))
    .orderBy(desc(offers.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">My offers</h2>
          <p className="mt-0.5 text-sm text-faint">{rows.length} listing{rows.length === 1 ? "" : "s"} · edit price, toggle visibility, upload keys</p>
        </div>
        <Link href="/seller/offers/new" className="btn btn-primary btn-sm"><PlusCircle size={14} /> New listing</Link>
      </div>
      <div className="mt-5">
        <SellerOffersClient offers={rows as SellerOffer[]} />
      </div>
    </div>
  );
}