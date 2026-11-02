import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getProductCards, getProductCardsCount } from "@/lib/commerce";
import ProductCard from "@/components/ProductCard";
import FilterControls from "@/components/FilterControls";
import { ArrowLeft, ArrowRight, SearchX } from "lucide-react";

const PAGE_SIZE = 24;

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const filters = {
    q: q || undefined,
    platform: sp.platform, region: sp.region, kind: sp.kind,
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
    featuredOnly: sp.featured === "1" || undefined,
    sort: sp.sort ?? "popular",
  };
  const [cards, total, cats] = await Promise.all([
    getProductCards({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getProductCardsCount(filters),
    db.select().from(categories),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (pn: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
    params.set("page", String(pn));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">
        {q ? <>Results for <span className="text-gradient">“{q}”</span></> : "Browse everything"}
      </h1>
      <p className="mt-1 text-sm text-mute">{total} products found</p>

      {!q && (
        <div className="mt-4 flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="chip hover:border-brand/40 hover:text-brand-bright">
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5">
        <FilterControls current={sp} />
      </div>

      {cards.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center p-14 text-center">
          <SearchX size={40} className="text-faint" />
          <p className="mt-4 font-display text-lg font-bold">No matches</p>
          <p className="mt-1 max-w-sm text-sm text-mute">
            We couldn&apos;t find anything for those filters. Try a broader term or browse the categories above.
          </p>
          <Link href="/search" className="btn btn-outline mt-5">Clear search</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {cards.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          {page > 1 && <Link href={pageHref(page - 1)} className="btn btn-outline btn-sm"><ArrowLeft size={14} /> Prev</Link>}
          <span className="text-sm text-mute">Page {page} of {pages}</span>
          {page < pages && <Link href={pageHref(page + 1)} className="btn btn-outline btn-sm">Next <ArrowRight size={14} /></Link>}
        </div>
      )}
    </div>
  );
}
