import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getProductCards, getProductCardsCount } from "@/lib/commerce";
import ProductCard from "@/components/ProductCard";
import FilterControls from "@/components/FilterControls";
import { Gamepad2, ArrowLeft, ArrowRight, PackageSearch } from "lucide-react";

const PAGE_SIZE = 24;

export default async function CategoryPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = (await db.select().from(categories).where(eq(categories.slug, slug)).limit(1))[0];
  if (!cat) notFound();

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const filters = {
    categorySlug: slug,
    platform: sp.platform, region: sp.region, kind: sp.kind,
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
    sort: sp.sort ?? "popular",
  };
  const [cards, total] = await Promise.all([
    getProductCards({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getProductCardsCount(filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (pn: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
    params.set("page", String(pn));
    return `/category/${slug}?${params.toString()}`;
  };

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/12 text-brand">
          <Gamepad2 size={26} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{cat.name}</h1>
          <p className="mt-0.5 text-sm text-mute">{cat.blurb} · {total} products</p>
        </div>
      </div>

      <FilterControls current={sp} />
      {cards.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center p-14 text-center">
          <PackageSearch size={40} className="text-faint" />
          <p className="mt-4 font-display text-lg font-bold">Nothing found</p>
          <p className="mt-1 max-w-sm text-sm text-mute">Try relaxing a filter or check back later — sellers restock daily.</p>
          <Link href={`/category/${slug}`} className="btn btn-outline mt-5">Clear filters</Link>
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
