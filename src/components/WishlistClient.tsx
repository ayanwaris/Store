"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import ProductCard from "./ProductCard";
import type { ProductCard as PCard } from "@/lib/commerce";

export default function WishlistClient({ cards }: { cards: PCard[] }) {
  const router = useRouter();
  const remove = async (productId: string) => {
    const res = await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      toast("Removed from wishlist");
      router.refresh();
    } else {
      toast.error("Could not remove");
    }
  };
  return (
    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((p) => (
        <div key={p.id} className="relative">
          <ProductCard p={p} />
          <button
            onClick={() => remove(p.id)}
            aria-label="Remove from wishlist"
            className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-lg bg-black/70 text-mute backdrop-blur transition hover:text-rose-300"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
