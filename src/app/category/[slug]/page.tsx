import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getBrowseCards, getBrowseCount, getBrowseFacets, parseList, type BrowseFilters } from "@/lib/browse";
import ProductCard from "@/components/ProductCard";
import BrowseShell, { type FacetGroup } from "@/components/browse/BrowseShell";
import Pagination from "@/components/browse/Pagination";
import { KIND_LABEL } from "@/lib/utils";
import { Gamepad2, PackageSearch } from "lucide-react";

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
  const num = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const filters: BrowseFilters = {
    categorySlug: slug,
    kind: parseList(sp.kind), platform: parseList(sp.platform), region: parseList(sp.region), genre: parseList(sp.genre),
    minPrice: num(sp.min), maxPrice: num(sp.max),
    sort: sp.sort ?? "popular",
  };
  const [cards, total, facets] = await Promise.all([
    getBrowseCards(filters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getBrowseCount(filters),
    getBrowseFacets(filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const groups: FacetGroup[] = [
    { key: "kind", title: "Type", limit: 8, options: facets.kind.map((f) => ({ value: f.value, label: KIND_LABEL[f.value] ?? f.value, count: f.count })) },
    { key: "platform", title: "Platforms", limit: 8, options: facets.platform.map((f) => ({ value: f.value, label: f.value, count: f.count })) },
    { key: "genre", title: "Genres", limit: 6, options: facets.genre.map((f) => ({ value: f.value, label: f.value, count: f.count })) },
    { key: "region", title: "Regions", limit: 6, options: facets.region.map((f) => ({ value: f.value, label: f.value === "GLOBAL" ? "Global" : f.value, count: f.count })) },
  ];

  return (
    <div className="container-x py-8">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/12 text-brand">
          <Gamepad2 size={26} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{cat.name}</h1>
          {cat.blurb && <p className="mt-0.5 text-sm text-mute">{cat.blurb}</p>}
        </div>
      </div>

      <BrowseShell current={sp} groups={groups} total={total}>
        {cards.length === 0 ? (
          <div className="card flex flex-col items-center p-14 text-center">
            <PackageSearch size={40} className="text-faint" />
            <p className="mt-4 font-display text-lg font-bold">Nothing found</p>
            <p className="mt-1 max-w-sm text-sm text-mute">Try removing a filter or check back later — sellers restock daily.</p>
            <Link href={`/category/${slug}`} className="btn btn-outline mt-5">Clear filters</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {cards.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
        <Pagination basePath={`/category/${slug}`} sp={sp} page={page} pages={pages} />
      </BrowseShell>
    </div>
  );
}