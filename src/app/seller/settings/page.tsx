import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sellerProfiles } from "@/db/schema";
import { requireSeller } from "@/lib/auth";
import { SellerSettingsForm } from "@/components/seller/SellerSettingsForm";

export default async function SellerSettingsPage() {
  const { sellerId } = await requireSeller();
  const seller = (await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, sellerId)).limit(1))[0]!;
  return (
    <div className="max-w-xl">
      <h2 className="font-display text-xl font-bold">Store settings</h2>
      <p className="mt-0.5 text-sm text-faint">Public storefront details. Commission is set by the platform admin.</p>
      <div className="mt-5">
        <SellerSettingsForm
          storeName={seller.storeName}
          about={seller.about ?? ""}
          commissionRate={seller.commissionRate}
          slug={seller.slug}
        />
      </div>
    </div>
  );
}
