"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDownWideNarrow, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hrefWith, listOf, toggled, type FilterKey, type SP } from "./url";
import GlassSelect from "@/components/ui/GlassSelect";

export type FacetOption = { value: string; label: string; count: number };
export type FacetGroup = { key: FilterKey; title: string; options: FacetOption[]; limit: number };

const SORTS: [string, string][] = [
  ["popular", "Most popular"], ["price_asc", "Price: low → high"], ["price_desc", "Price: high → low"],
  ["rating", "Best rated"], ["discount", "Biggest discount"], ["newest", "Newest"],
];

function PriceBox({ current, go }: { current: SP; go: (patch: SP) => void }) {
  const [min, setMin] = useState(current.min ?? "");
  const [max, setMax] = useState(current.max ?? "");
  const apply = () => go({ min: min || undefined, max: max || undefined });
  return (
    <div className="flex items-center gap-1.5">
      <input className="input !px-2.5 !py-1.5 text-sm" placeholder="Min €" inputMode="decimal" aria-label="Minimum price" value={min}
        onChange={(e) => setMin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} />
      <span className="text-faint">–</span>
      <input className="input !px-2.5 !py-1.5 text-sm" placeholder="Max €" inputMode="decimal" aria-label="Maximum price" value={max}
        onChange={(e) => setMax(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} />
      <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={apply}>Go</button>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-line-soft py-3.5 last:border-b-0">
      <button type="button" className="flex w-full items-center justify-between py-1 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="flex items-center gap-2 text-sm font-bold">
          {title}
          {!!badge && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-on-brand">{badge}</span>}
        </span>
        <ChevronDown size={16} className={cn("text-faint transition", open ? "rotate-180" : "")} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function FacetList({ g, selected, onToggle }: { g: FacetGroup; selected: string[]; onToggle: (v: string) => void }) {
  const [all, setAll] = useState(false);
  // selected options always stay visible, even beyond the limit
  const shown = all ? g.options : g.options.filter((o, i) => i < g.limit || selected.includes(o.value));
  const hidden = g.options.length - shown.length;
  return (
    <ul className="space-y-0.5">
      {shown.map((o) => (
        <li key={o.value}>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-2.5 text-sm transition hover:bg-raised/60 lg:py-1.5">
            <input type="checkbox" className="h-5 w-5 shrink-0 cursor-pointer rounded accent-[var(--kh-brand)] lg:h-4 lg:w-4" checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} />
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            <span className="text-xs tabular-nums text-faint">{o.count}</span>
          </label>
        </li>
      ))}
      {(hidden > 0 || (all && g.options.length > g.limit)) && (
        <li>
          <button type="button" className="px-1 pt-1.5 text-xs font-semibold text-brand hover:text-brand-bright" onClick={() => setAll(!all)}>
            {all ? "Show less" : `${hidden} more`}
          </button>
        </li>
      )}
    </ul>
  );
}

/**
 * Eneba-style browse layout: sticky filter sidebar (checkbox groups with counts + price range) on the left,
 * toolbar (results count, removable filter chips, sort) above the product grid on the right.
 * The product grid itself is rendered on the server and passed in as `children`.
 */
export default function BrowseShell({ current, groups, total, children }: {
  current: SP; groups: FacetGroup[]; total: number; children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  // phones: while the filter drawer is open the page behind it must not scroll; Escape closes it
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [drawer]);

  const go = (patch: SP) => router.push(hrefWith(pathname, current, patch), { scroll: false });

  const chips: { label: string; patch: SP }[] = [];
  for (const g of groups) {
    for (const v of listOf(current[g.key])) {
      chips.push({ label: g.options.find((o) => o.value === v)?.label ?? v, patch: { [g.key]: toggled(current, g.key, v) } });
    }
  }
  if (current.min || current.max) {
    chips.push({ label: `€${current.min ?? "0"} – ${current.max ? "€" + current.max : "any"}`, patch: { min: undefined, max: undefined } });
  }
  const clearAll = hrefWith(pathname, { q: current.q }, {});
  // a group with nothing to choose between (e.g. one platform in a small category) is hidden unless something is selected
  const visible = groups.filter((g) => g.options.length > 1 || listOf(current[g.key]).length > 0);
  const activeCount = chips.length;

  const sidebar = (
    <>
      <div className="mb-1 flex items-center justify-between lg:hidden">
        <p className="font-display text-lg font-bold">Filters</p>
        <button type="button" className="btn btn-ghost btn-sm px-2" aria-label="Close filters" onClick={() => setDrawer(false)}><X size={18} /></button>
      </div>
      <Section title="Price range (EUR)" badge={current.min || current.max ? 1 : 0}>
        <PriceBox key={`${current.min}-${current.max}`} current={current} go={go} />
      </Section>
      {visible.map((g) => (
        <Section key={g.key} title={g.title} badge={listOf(current[g.key]).length}>
          {g.options.length === 0
            ? <p className="text-xs text-faint">No options for this search.</p>
            : <FacetList g={g} selected={listOf(current[g.key])} onToggle={(v) => go({ [g.key]: toggled(current, g.key, v) })} />}
        </Section>
      ))}
      {activeCount > 0 && <Link href={clearAll} className="btn btn-outline btn-sm mt-3 w-full" onClick={() => setDrawer(false)}>Clear all filters</Link>}
      {/* phones: filters apply instantly, so give a clear way back to the results */}
      <div className="sticky bottom-0 -mx-4 -mb-4 mt-3 border-t border-line bg-panel/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <button type="button" className="btn btn-primary w-full" onClick={() => setDrawer(false)}>Show {total} result{total === 1 ? "" : "s"}</button>
      </div>
    </>
  );

  const renderSort = (className: string, short: boolean) => (
    <GlassSelect aria-label="Sort by" className={className} value={current.sort ?? "popular"} onChange={(e) => go({ sort: e.target.value === "popular" ? undefined : e.target.value })}>
      {SORTS.map(([v, l]) => <option key={v} value={v}>{v === "popular" ? (short ? "Most popular" : "Popularity: Most popular") : l}</option>)}
    </GlassSelect>
  );

  return (
    <div className="mt-4 grid gap-6 sm:mt-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      {drawer && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setDrawer(false)} />}
      <aside
        aria-label="Filters"
        className={cn(
          "card p-4 no-scrollbar",
          drawer
            ? "fixed inset-y-0 left-0 z-50 w-[88%] max-w-sm overflow-y-auto overscroll-contain pt-[max(1rem,env(safe-area-inset-top))] rounded-none lg:static lg:z-auto lg:w-auto lg:max-w-none lg:rounded-[var(--kh-radius)]"
            : "hidden lg:block",
          "lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto",
        )}
      >
        {sidebar}
      </aside>

      <section className="min-w-0">
        {/* phones: Filters and Sort side by side, one tap each */}
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <button type="button" className="btn btn-outline w-full" onClick={() => setDrawer(true)}>
            <SlidersHorizontal size={15} /> Filters{activeCount > 0 && ` (${activeCount})`}
          </button>
          {renderSort("select text-sm", true)}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 empty:hidden lg:mt-0">
          {chips.map((c) => (
            <button key={c.label + JSON.stringify(c.patch)} type="button" onClick={() => go(c.patch)}
              className="chip border-brand/40 text-brand hover:bg-brand/10" aria-label={`Remove filter ${c.label}`}>
              {c.label} <X size={11} />
            </button>
          ))}
          {activeCount > 0 && <Link href={clearAll} className="text-xs font-semibold text-brand hover:text-brand-bright">Clear all</Link>}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mute">Results found: <span className="font-bold text-ink">{total}</span></p>
          <label className="hidden items-center gap-2 text-sm font-semibold lg:flex">
            <ArrowDownWideNarrow size={16} className="text-faint" />
            <span className="sr-only">Sort by</span>
            {renderSort("select w-auto text-sm", false)}
          </label>
        </div>

        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}