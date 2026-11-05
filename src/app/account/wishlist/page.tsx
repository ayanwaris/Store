import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { wishlists } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getProductCards } from "@/lib/commerce";
import WishlistClient from "@/components/WishlistClient";
import { Heart } from "lucide-react";

export default async function WishlistPage() {
  const user = await requireUser();
  const rows = await db.select({ productId: wishlists.productId })
    .from(wishlists).where(eq(wishlists.userId, user.id));

  let cards: Awaited<ReturnType<typeof getProductCards>> = [];
  if (rows.length) {
    const all = await getProductCards({ sort: "popular", limit: 200 });
    cards = rows
      .map((r) => all.find((c) => c.id === r.productId))
      .filter(Boolean) as typeof cards;
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Wishlist</h2>
      <p className="mt-0.5 text-sm text-faint">{cards.length} saved product{cards.length === 1 ? "" : "s"}</p>
      {cards.length === 0 ? (
        <div className="card mt-5 flex flex-col items-center p-8 text-center sm:p-12">
          <Heart size={36} className="text-faint" />
          <p className="mt-3 font-semibold">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-mute">Tap the heart on any product to watch it here.</p>
          <Link href="/search?sort=popular" className="btn btn-primary btn-sm mt-4">Discover deals</Link>
        </div>
      ) : (
        <WishlistClient cards={cards} />
      )}
    </div>
  );
}
void and; void inArray;
