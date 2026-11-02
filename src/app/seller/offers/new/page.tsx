import { requireSeller } from "@/lib/auth";
import NewOfferForm from "@/components/seller/NewOfferForm";

export default async function NewOfferPage() {
  await requireSeller();
  return (
    <div className="max-w-xl">
      <h2 className="font-display text-xl font-bold">Create a listing</h2>
      <p className="mt-0.5 text-sm text-faint">
        Pick an existing catalog product, set your price and region, then upload initial stock.
      </p>
      <div className="mt-5"><NewOfferForm /></div>
    </div>
  );
}
