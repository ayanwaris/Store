import { notFound } from "next/navigation";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { offers, products, reviews, sellerProfiles, users } from "@/db/schema";
import { fmtEUR, fmtNum, formatDate } from "@/lib/utils";
import CoverArt from "@/components/CoverArt";
import RatingStars from "@/components/RatingStars";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, Package, Store } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = (await db.select().from(sellerProfiles).where(eq(sellerProfiles.slug, slug)).limit(1))[0];
  return s ? { title: `${s.storeName} — storefront` } : { title: "Seller" };
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const seller = (await db.select().from(sellerProfiles).where(eq(sellerProfiles.slug, slug)).limit(1))[0];
  if (!seller || seller.status !== "approved") notFound();

  const listings = await db
    .select({
      id: offers.id, price: offers.price, region: offers.region, stock: offers.stockCount, sold: offers.soldCount,
      slug: products.slug, title: products.title, platform: products.platform, kind: products.kind,
      coverHue: products.coverHue, ratingAvg: products.ratingAvg, ratingCount: products.ratingCount,
    })
    .from(offers)
    .innerJoin(products, eq(products.id, offers.productId))
    .where(eq(offers.sellerId, seller.id))
    .orderBy(desc(offers.soldCount))
    .limit(60);

  const reviewRows = await db
    .select({
      id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt,
      authorName: users.name, authorHue: users.avatarHue,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.authorId))
    .where(eq(reviews.sellerId, seller.id))
    .orderBy(desc(reviews.createdAt))
    .limit(8);

  const stats = await db.execute(sql`
    select coalesce(sum(stock_count),0)::int as stock from offers where seller_id = ${seller.id} and active = true
  `);
  const stock = (stats as unknown as { rows: Array<{ stock: number }> }).rows[0]?.stock ?? 0;

  return (
    <div className="container-x py-8">
      {/* store header */}
      <div className="card relative overflow-hidden p-6 md:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/12 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-vio to-raised font-display text-3xl font-bold text-white">
            {seller.storeName[0]}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold md:text-3xl">
              {seller.storeName}
              <BadgeCheck size={22} className="text-mint" />
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-mute">
              <span className="flex items-center gap-1 text-mint">
                <CheckCircle2 size={14} /> {Number(seller.ratingAvg).toFixed(1)}% positive
              </span>
              <span>{fmtNum(seller.ratingCount)} ratings</span>
              <span>·</span>
              <span>{fmtNum(seller.totalSales)} total sales</span>
              <span>·</span>
              <span>Selling since {formatDate(seller.createdAt)}</span>
            </p>
            {seller.about && <p className="mt-2 max-w-2xl text-sm text-faint">{seller.about}</p>}
          </div>
          <div className="flex gap-3">
            <div className="card px-4 py-3 text-center">
              <p className="font-display text-xl font-bold">{stock}</p>
              <p className="text-[10px] uppercase tracking-wider text-faint">Keys in stock</p>
            </div>
            <div className="card px-4 py-3 text-center">
              <p className="font-display text-xl font-bold">{listings.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-faint">Listings</p>
            </div>
          </div>
        </div>
      </div>

      {/* listings */}
      <h2 className="mt-8 flex items-center gap-2 font-display text-lg font-bold">
        <Package size={18} className="text-brand" /> Active listings
      </h2>
      {listings.length === 0 && <p className="mt-4 text-sm text-mute">This seller has no active listings.</p>}
      <div className="mt-4 overflow-hidden card">
        <table className="table-x">
          <thead>
            <tr><th>Product</th><th>Platform</th><th>Region</th><th>Rating</th><th className="text-right">Stock</th><th className="text-right">Price</th></tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td>
                  <Link href={`/product/${l.slug}`} className="flex items-center gap-3 group">
                    <CoverArt title={l.title} hue={l.coverHue} kind={l.kind} className="h-12 w-10 shrink-0 rounded-md" />
                    <span className="text-sm font-semibold group-hover:text-brand-bright">{l.title}</span>
                  </Link>
                </td>
                <td><span className="chip">{l.platform}</span></td>
                <td><span className="chip">{l.region}</span></td>
                <td><RatingStars value={Number(l.ratingAvg)} count={l.ratingCount} /></td>
                <td className="text-right text-sm text-mute">{l.stock}</td>
                <td className="text-right font-display font-bold">{fmtEUR(l.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* reviews */}
      <h2 className="mt-10 flex items-center gap-2 font-display text-lg font-bold">
        <Store size={18} className="text-brand" /> Recent feedback
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {reviewRows.length === 0 && <p className="text-sm text-mute">No feedback yet.</p>}
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
              <span className="text-[11px] text-faint">{formatDate(r.createdAt)}</span>
            </div>
            {r.comment && <p className="mt-3 text-sm text-mute">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
