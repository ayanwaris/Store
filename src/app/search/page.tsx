import Link from "next/link";
import type { Metadata } from "next";
import { getBrowseCards, getBrowseCount, getBrowseFacets, parseList, type BrowseFilters } from "@/lib/browse";
import ProductCard from "@/components/ProductCard";
import BrowseShell, { type FacetGroup } from "@/components/browse/BrowseShell";
import Pagination from "@/components/browse/Pagination";
import { KIND_LABEL } from "@/lib/utils";
import { SearchX } from "lucide-react";

const PAGE_SIZE = 24;

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const num = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const filters: BrowseFilters = {
    q: q || undefined,
    kind: parseList(sp.kind), platform: parseList(sp.platform), region: parseList(sp.region), genre: parseList(sp.genre),
    minPrice: num(sp.min), maxPrice: num(sp.max),
    featuredOnly: sp.featured === "1" || undefined,
    sort: sp.sort ?? "popular",
  };
  const [cards, total, facets] = await Promise.all([
    getBrowseCards(filters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getBrowseCount(filters),
    getBrowseFacets(filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const regionLabel = (v: string) => (v === "GLOBAL" ? "Global" : v);
  const groups: FacetGroup[] = [
    { key: "kind", title: "Type", limit: 8, options: facets.kind.map((f) => ({ value: f.value, label: KIND_LABEL[f.value] ?? f.value, count: f.count })) },
    { key: "platform", title: "Platforms", limit: 8, options: facets.platform.map((f) => ({ value: f.value, label: f.value, count: f.count })) },
    { key: "genre", title: "Genres", limit: 6, options: facets.genre.map((f) => ({ value: f.value, label: f.value, count: f.count })) },
    { key: "region", title: "Regions", limit: 6, options: facets.region.map((f) => ({ value: f.value, label: regionLabel(f.value), count: f.count })) },
  ];

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">
        {q ? <>Results for <span className="text-gradient">“{q}”</span></> : "Browse everything"}
      </h1>

      <BrowseShell current={sp} groups={groups} total={total}>
        {cards.length === 0 ? (
          <div className="card flex flex-col items-center p-14 text-center">
            <SearchX size={40} className="text-faint" />
            <p className="mt-4 font-display text-lg font-bold">No matches</p>
            <p className="mt-1 max-w-sm text-sm text-mute">
              We couldn&apos;t find anything for those filters. Try removing a filter or a broader search term.
            </p>
            <Link href={q ? `/search?q=${encodeURIComponent(q)}` : "/search"} className="btn btn-outline mt-5">Clear filters</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {cards.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}

        <Pagination basePath="/search" sp={sp} page={page} pages={pages} />
      </BrowseShell>
    </div>
  );
}