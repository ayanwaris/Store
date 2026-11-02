import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryKeys, orderItems, orders, products, sellerProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fmtEUR, formatDate } from "@/lib/utils";
import CoverArt from "@/components/CoverArt";
import { KeyReveal } from "@/components/OrderWidgets";
import { KeyRound } from "lucide-react";

export default async function LibraryPage() {
  const user = await requireUser();

  const items = await db
    .select({
      itemId: orderItems.id, title: orderItems.title, price: orderItems.price, status: orderItems.status,
      orderNumber: orders.number, paidAt: orders.paidAt,
      slug: products.slug, platform: products.platform, kind: products.kind, coverHue: products.coverHue,
      howToActivate: products.howToActivate, sellerName: sellerProfiles.storeName,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, orderItems.sellerId))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.paidAt));

  const keys = await db
    .select({ code: inventoryKeys.code, status: inventoryKeys.status, orderItemId: inventoryKeys.orderItemId })
    .from(inventoryKeys)
    .innerJoin(orderItems, eq(orderItems.id, inventoryKeys.orderItemId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orders.userId, user.id));

  const owned = items.filter((i) => i.status === "delivered" || i.status === "refunded");

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold">My keys</h2>
        <p className="mt-0.5 text-sm text-faint">Your permanent library — keys stay redeemable here forever.</p>
      </div>
      {owned.length === 0 ? (
        <div className="card flex flex-col items-center p-12 text-center">
          <KeyRound size={36} className="text-faint" />
          <p className="mt-3 font-semibold">Nothing in the vault yet</p>
          <p className="mt-1 text-sm text-mute">Completed orders land here with instant key reveal.</p>
          <Link href="/search?sort=popular" className="btn btn-primary btn-sm mt-4">Find your first key</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {owned.map((it) => {
            const ks = keys.filter((k) => k.orderItemId === it.itemId);
            return (
              <div key={it.itemId} className="card flex flex-wrap gap-4 p-4">
                <Link href={`/product/${it.slug}`} className="shrink-0">
                  <CoverArt title={it.title} hue={it.coverHue} platform={it.platform} kind={it.kind} className="h-24 w-[76px] rounded-lg" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/product/${it.slug}`} className="font-semibold hover:text-brand-bright">{it.title}</Link>
                    <span className="text-xs text-faint">
                      {fmtEUR(it.price)} · {it.sellerName} · {it.paidAt ? formatDate(it.paidAt) : ""}
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-2">
                    {ks.map((k, i) => <KeyReveal key={i} code={k.code} revoked={k.status === "revoked"} />)}
                  </div>
                  <Link href={`/order/${it.orderNumber}`} className="mt-2 inline-block text-xs text-brand-bright hover:underline">
                    View order {it.orderNumber} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
