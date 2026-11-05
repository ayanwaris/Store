import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** 1 … 4 5 6 … 20 */
function pageList(page: number, pages: number): (number | "…")[] {
  const set = new Set([1, 2, page - 1, page, page + 1, pages - 1, pages].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => { if (i > 0 && n - sorted[i - 1] > 1) out.push("…"); out.push(n); });
  return out;
}

/** Numbered pagination shared by /search and /category/[slug]; keeps every active filter in the links. */
export default function Pagination({ basePath, sp, page, pages }: {
  basePath: string; sp: Record<string, string | undefined>; page: number; pages: number;
}) {
  if (pages <= 1) return null;
  const href = (pn: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
    if (pn > 1) params.set("page", String(pn));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <>
    {/* phones: compact Prev / Page x of y / Next */}
    <nav className="mt-6 flex items-center justify-between gap-2 sm:hidden" aria-label="Pagination">
      {page > 1
        ? <Link href={href(page - 1)} className="btn btn-outline"><ChevronLeft size={16} /> Prev</Link>
        : <span className="btn btn-outline opacity-40" aria-hidden><ChevronLeft size={16} /> Prev</span>}
      <span className="text-sm text-mute">Page <strong className="text-ink">{page}</strong> of {pages}</span>
      {page < pages
        ? <Link href={href(page + 1)} className="btn btn-outline">Next <ChevronRight size={16} /></Link>
        : <span className="btn btn-outline opacity-40" aria-hidden>Next <ChevronRight size={16} /></span>}
    </nav>
    <nav className="mt-8 hidden flex-wrap items-center justify-center gap-1.5 sm:flex" aria-label="Pagination">
      {page > 1
        ? <Link href={href(page - 1)} className="btn btn-outline btn-sm px-2" aria-label="Previous page"><ChevronLeft size={16} /></Link>
        : <span className="btn btn-outline btn-sm px-2 opacity-40" aria-hidden><ChevronLeft size={16} /></span>}
      {pageList(page, pages).map((n, i) => n === "…"
        ? <span key={`e${i}`} className="px-1 text-faint">…</span>
        : <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined}
            className={n === page ? "btn btn-primary btn-sm min-w-8" : "btn btn-ghost btn-sm min-w-8"}>{n}</Link>)}
      {page < pages
        ? <Link href={href(page + 1)} className="btn btn-outline btn-sm px-2" aria-label="Next page"><ChevronRight size={16} /></Link>
        : <span className="btn btn-outline btn-sm px-2 opacity-40" aria-hidden><ChevronRight size={16} /></span>}
    </nav>
    </>
  );
}