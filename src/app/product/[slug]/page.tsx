import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  categories, offers, orderItems, orders, products, recentlyViewed, reviews, sellerProfiles, users, wishlists,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getProductCards } from "@/lib/commerce";
import { fmtEUR, fmtNum, KIND_LABEL } from "@/lib/utils";
import CoverArt from "@/components/CoverArt";
import RatingStars from "@/components/RatingStars";
import OfferTable, { type OfferRow } from "@/components/product/OfferTable";
import WishlistButton from "@/components/product/WishlistButton";
import ReviewForm from "@/components/product/ReviewForm";
import Tabs from "@/components/product/Tabs";
import ProductCard from "@/components/ProductCard";
import AddBestButton from "@/components/product/AddBestButton";
import { ChevronRight, Globe2, MonitorSmartphone, ShieldCheck, Zap, LifeBuoy, Layers } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = (await db.select().from(products).where(eq(products.slug, slug)).limit(1))[0];
  return p ? { title: p.title } : { title: "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await db.select().from(products).where(eq(products.slug, slug)).limit(1))[0];
  if (!product || !product.active) notFound();

  const [user, cat] = await Promise.all([
    getSessionUser(),
    product.categoryId
      ? db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1).then((r) => r[0])
      : Promise.resolve(undefined),
  ]);

  const offerRows = await db
    .select({
      id: offers.id, price: offers.price, region: offers.region, stock: offers.stockCount, sold: offers.soldCount,
      sellerName: sellerProfiles.storeName, sellerSlug: sellerProfiles.slug,
      sellerRating: sellerProfiles.ratingAvg, sellerRatings: sellerProfiles.ratingCount,
    })
    .from(offers)
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, offers.sellerId))
    .where(and(eq(offers.productId, product.id), eq(offers.active, true)))
    .orderBy(asc(offers.price));

  const reviewRows = await db
    .select({
      id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt,
      authorName: users.name, authorHue: users.avatarHue,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.authorId))
    .where(eq(reviews.productId, product.id))
    .orderBy(desc(reviews.createdAt))
    .limit(10);

  const minPrice = offerRows[0]?.price ?? null;
  const discount = minPrice != null && product.rrp > minPrice
    ? Math.round(((product.rrp - minPrice) / product.rrp) * 100)
    : 0;

  // engagement state for the viewer
  let wishlisted = false;
  let purchasedItemId: string | undefined;
  let reviewed = false;
  if (user) {
    const [w, purchases, r] = await Promise.all([
      db.select().from(wishlists).where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, product.id))).limit(1),
      db.select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(eq(orders.userId, user.id), eq(orderItems.productId, product.id), eq(orderItems.status, "delivered")))
        .limit(1),
      db.select({ id: reviews.id }).from(reviews)
        .where(and(eq(reviews.authorId, user.id), eq(reviews.productId, product.id))).limit(1),
    ]);
    wishlisted = !!w[0];
    purchasedItemId = purchases[0]?.id;
    reviewed = !!r[0];
    // record recently viewed (fire & forget semantics — awaited but cheap)
    await db.insert(recentlyViewed)
      .values({ userId: user.id, productId: product.id, viewedAt: new Date() })
      .onConflictDoUpdate({
        target: [recentlyViewed.userId, recentlyViewed.productId],
        set: { viewedAt: new Date() },
      });
  }

  const relatedRaw = cat
    ? await getProductCards({ categorySlug: cat.slug, limit: 9 })
    : [];
  const related = relatedRaw.filter((r) => r.id !== product.id).slice(0, 6);

  const offersForTable: OfferRow[] = offerRows.map((o) => ({
    id: o.id, sellerName: o.sellerName, sellerSlug: o.sellerSlug,
    sellerRating: Number(o.sellerRating), sellerRatings: o.sellerRatings,
    price: o.price, region: o.region, stock: o.stock, sold: o.sold,
  }));

  return (
    <div className="container-x py-6 md:py-8">
      {/* breadcrumbs */}
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-faint">
        <Link href="/" className="hover:text-mute">Home</Link>
        <ChevronRight size={11} />
        {cat && (
          <>
            <Link href={`/category/${cat.slug}`} className="hover:text-mute">{cat.name}</Link>
            <ChevronRight size={11} />
          </>
        )}
        <span className="text-mute">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
        {/* left: cover */}
        <div>
          <CoverArt
            title={product.title} hue={product.coverHue} platform={product.platform} kind={product.kind}
            className="aspect-[4/4.6] w-full rounded-2xl shadow-2xl shadow-black/50"
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: Zap, t: "Instant delivery" },
              { icon: ShieldCheck, t: "Buyer protection" },
              { icon: LifeBuoy, t: "24/7 support" },
            ].map((f) => (
              <div key={f.t} className="card px-2 py-3">
                <f.icon size={16} className="mx-auto text-brand" />
                <p className="mt-1.5 text-[11px] font-medium text-mute">{f.t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* right: details */}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span className="chip">{KIND_LABEL[product.kind] ?? product.kind}</span>
            <span className="chip"><MonitorSmartphone size={11} /> {product.platform}</span>
            <span className="chip"><Globe2 size={11} /> {product.region}</span>
            {product.genre && <span className="chip"><Layers size={11} /> {product.genre}</span>}
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold leading-tight md:text-3xl">{product.title}</h1>
          {product.subtitle && <p className="mt-1 text-sm text-mute md:text-base">{product.subtitle}</p>}
          <div className="mt-2.5 flex items-center gap-4">
            <RatingStars value={Number(product.ratingAvg)} size={15} />
            <span className="text-xs text-faint">{fmtNum(product.ratingCount)} reviews</span>
            <span className="text-xs text-faint">·</span>
            <span className="text-xs text-faint">{offerRows.length} offer{offerRows.length === 1 ? "" : "s"} available</span>
          </div>

          {/* price panel */}
          <div className="card mt-5 flex flex-wrap items-center gap-4 p-5">
            <div>
              {minPrice != null ? (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Best price</p>
                  <p className="font-display text-3xl font-bold">
                    {fmtEUR(minPrice)}
                    {product.rrp > minPrice && (
                      <span className="ml-2.5 text-base font-medium text-faint line-through">{fmtEUR(product.rrp)}</span>
                    )}
                    {discount > 0 && (
                      <span className="ml-2.5 rounded-lg bg-brand/15 px-2 py-0.5 align-middle text-sm font-bold text-brand-bright">−{discount}%</span>
                    )}
                  </p>
                </>
              ) : (
                <p className="font-display text-xl font-bold text-faint">Currently out of stock</p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <WishlistButton productId={product.id} active={wishlisted} loggedIn={!!user} />
              {offerRows[0] && <AddBestButton offerId={offerRows[0].id} />}
            </div>
          </div>

          {/* offers */}
          <div className="card mt-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-mute">
                All offers · {offerRows.length} seller{offerRows.length === 1 ? "" : "s"}
              </h2>
              <span className="chip text-mint border-mint/20 bg-mint/5"><Zap size={10} /> Digital delivery</span>
            </div>
            <OfferTable offers={offersForTable} />
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-10">
        <Tabs
          tabs={[
            {
              id: "about", label: "Description",
              content: (
                <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-mute">
                  {product.description.split("\n").filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
                  {!!product.tags.length && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {product.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: "activate", label: "How to activate",
              content: (
                <div className="max-w-2xl">
                  <ol className="space-y-3">
                    {(product.howToActivate ?? "").split("\n").filter(Boolean).map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-mute">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand/12 text-xs font-bold text-brand">{i + 1}</span>
                        {step.replace(/^\d+\.\s*/, "")}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 text-xs text-faint">
                    Region note: this listing is valid for <strong className="text-mute">{product.region}</strong> accounts.
                    Always check the seller&apos;s offer region before purchasing.
                  </p>
                </div>
              ),
            },
            {
              id: "reviews", label: `Reviews (${product.ratingCount})`,
              content: (
                <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
                  <div className="space-y-4">
                    {reviewRows.length === 0 && (
                      <p className="text-sm text-mute">No written reviews yet — be the first verified buyer to share feedback.</p>
                    )}
                    {reviewRows.map((r) => (
                      <div key={r.id} className="card p-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white"
                            style={{ background: `hsl(${r.authorHue} 65% 42%)` }}>
                            {r.authorName[0]}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{r.authorName}</p>
                            <RatingStars value={r.rating} size={11} />
                          </div>
                          <span className="text-[11px] text-faint">
                            {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        {r.comment && <p className="mt-3 text-sm leading-relaxed text-mute">{r.comment}</p>}
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-mint">Verified purchase</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    {user && purchasedItemId && !reviewed ? (
                      <ReviewForm productId={product.id} orderItemId={purchasedItemId} />
                    ) : user && reviewed ? (
                      <div className="card p-5 text-sm text-mute">You already reviewed this product. Thanks!</div>
                    ) : (
                      <div className="card p-5">
                        <p className="font-display font-bold">Review this product</p>
                        <p className="mt-1 text-sm text-mute">
                          {user
                            ? "Buy and receive this product to unlock a verified review."
                            : "Log in and purchase to leave a verified review."}
                        </p>
                        {!user && <Link href="/login" className="btn btn-outline btn-sm mt-3">Log in</Link>}
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">You might also like</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
