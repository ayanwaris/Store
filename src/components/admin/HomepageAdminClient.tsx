"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Eye, EyeOff, Loader2, PlusCircle, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import SortableList from "@/components/admin/SortableList";
import {
  DEFAULT_SECTIONS, GRID_SOURCES, SECTION_META, SECTION_TYPES, STEP_ICONS, newSection, normalizeSections,
  type HomeSection, type SectionSettings, type SectionType,
} from "@/lib/site-config";
import { cn } from "@/lib/utils";

type Labels = Record<string, string>;
type Row = { id: string; label: string; sub?: string };

/* ------------------------------ pick products / sellers ------------------------------ */

function Picker({ kind, ids, labels, onChange, max }: {
  kind: "product" | "seller"; ids: string[]; labels: Labels; onChange: (ids: string[], labels: Labels) => void; max: number;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [known, setKnown] = useState<Labels>(labels);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2 && kind === "product") { setResults([]); return; }
      setBusy(true);
      try {
        const url = kind === "product" ? `/api/admin/products?q=${encodeURIComponent(q.trim())}` : "/api/admin/sellers?status=approved";
        const json = await (await fetch(url)).json();
        const rows = (json.data ?? []) as Array<Record<string, string>>;
        const mapped: Row[] = kind === "product"
          ? rows.map((r) => ({ id: r.id, label: r.title, sub: r.platform }))
          : rows.map((r) => ({ id: r.id, label: r.storeName, sub: r.email }));
        setResults(mapped.filter((r) => !q.trim() || r.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8));
      } finally { setBusy(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, kind]);

  const add = (r: Row) => {
    if (ids.includes(r.id) || ids.length >= max) return;
    const next = { ...known, [r.id]: r.label };
    setKnown(next);
    onChange([...ids, r.id], next);
  };

  return (
    <div className="mt-2 rounded-xl border border-line p-3">
      <p className="text-xs text-faint">Hand-picked {kind}s ({ids.length}/{max}) — shown in this order.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <span key={id} className="chip gap-1.5 pr-1">
            {known[id] ?? id.slice(0, 8)}
            <button type="button" aria-label="Remove" onClick={() => onChange(ids.filter((x) => x !== id), known)} className="rounded-full p-0.5 hover:bg-white/5"><X size={11} /></button>
          </span>
        ))}
        {ids.length === 0 && <span className="text-xs text-rose-300">Nothing picked yet — the section stays hidden until you add at least one.</span>}
      </div>
      <div className="relative mt-3">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input className="input pl-9" placeholder={kind === "product" ? "Search products by title…" : "Filter approved sellers…"} value={q} onChange={(e) => setQ(e.target.value)} />
        {busy && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-faint" />}
      </div>
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" disabled={ids.includes(r.id) || ids.length >= max} onClick={() => add(r)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-white/4 disabled:opacity-40">
                <span className="truncate">{r.label}</span><span className="shrink-0 text-[11px] text-faint">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------- editor ----------------------------------- */

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div><label className="label">{label}</label>{children}{hint && <p className="mt-1 text-[11px] text-faint">{hint}</p>}</div>;
}

function SectionEditor({ s, categories, labels, onSection, onSettings }: {
  s: HomeSection; categories: { slug: string; name: string }[]; labels: Labels;
  onSection: (p: Partial<HomeSection>) => void; onSettings: (p: Partial<SectionSettings>) => void;
}) {
  const st = s.settings;
  const num = (v: string, d: number, min = 1, max = 24) => Math.min(max, Math.max(min, Number(v) || d));
  const hasProducts = ["top_selling", "deals", "product_grid"].includes(s.type);
  const hasCta = ["top_selling", "deals", "product_grid", "become_seller"].includes(s.type);

  return (
    <div className="space-y-4 border-t border-line p-4">
      {s.type === "newsletter" ? (
        <p className="rounded-lg bg-brand/8 p-3 text-sm text-mute">
          The heading, description, button and success message come from <Link href="/admin/site#newsletter" className="font-semibold text-brand underline">Site &amp; theme → Newsletter</Link>.
          Use the switch above to show or hide this section.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title"><input className="input" value={s.title} maxLength={100} onChange={(e) => onSection({ title: e.target.value })} /></Field>
          <Field label="Description"><input className="input" value={s.description} maxLength={400} onChange={(e) => onSection({ description: e.target.value })} /></Field>
        </div>
      )}

      {s.type === "top_selling" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Small line above the title"><input className="input" value={st.eyebrow ?? ""} onChange={(e) => onSettings({ eyebrow: e.target.value })} /></Field>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={st.showCategoryChips !== false} onChange={(e) => onSettings({ showCategoryChips: e.target.checked })} /> Show category chips</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={st.showSearch !== false} onChange={(e) => onSettings({ showSearch: e.target.checked })} /> Show search box on mobile</label>
          </div>
        </div>
      )}

      {s.type === "product_grid" && (
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Source">
            <select className="select" value={st.gridSource ?? "popular"} onChange={(e) => onSettings({ gridSource: e.target.value as never })}>
              {GRID_SOURCES.map((g) => <option key={g} value={g}>{{ featured: "Featured products", popular: "Bestsellers", newest: "Newest / recently added", discount: "Biggest discounts", giftcard: "Gift cards", category: "A specific category" }[g]}</option>)}
            </select>
          </Field>
          {st.gridSource === "category" && (
            <Field label="Category">
              <select className="select" value={st.categorySlug ?? ""} onChange={(e) => onSettings({ categorySlug: e.target.value })}>
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Layout">
            <select className="select" value={st.layout ?? "grid"} onChange={(e) => onSettings({ layout: e.target.value as never })}>
              <option value="grid">Grid</option><option value="spotlight">Spotlight (text panel + 4 products)</option>
            </select>
          </Field>
        </div>
      )}

      {hasProducts && (
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Products to show" hint="1–24">
            <input className="input" type="number" min={1} max={24} value={st.limit ?? 6} onChange={(e) => onSettings({ limit: num(e.target.value, 6) })} />
          </Field>
          <Field label="Selection">
            <select className="select" value={st.mode ?? "auto"} onChange={(e) => onSettings({ mode: e.target.value as never })}>
              <option value="auto">Automatic (by rule)</option><option value="manual">Hand-picked</option>
            </select>
          </Field>
        </div>
      )}
      {hasProducts && st.mode === "manual" && (
        <Picker kind="product" max={24} ids={st.productIds ?? []} labels={labels} onChange={(ids) => onSettings({ productIds: ids })} />
      )}

      {s.type === "recently_viewed" && (
        <Field label="Products to show"><input className="input w-32" type="number" min={1} max={12} value={st.limit ?? 5} onChange={(e) => onSettings({ limit: num(e.target.value, 5, 1, 12) })} /></Field>
      )}

      {s.type === "top_sellers" && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Sellers to show"><input className="input" type="number" min={1} max={12} value={st.limit ?? 4} onChange={(e) => onSettings({ limit: num(e.target.value, 4, 1, 12) })} /></Field>
            <Field label="Sort by">
              <select className="select" value={st.sellerSort ?? "reviews"} onChange={(e) => onSettings({ sellerSort: e.target.value as never })}>
                <option value="reviews">Number of reviews</option><option value="rating">Positive rating</option><option value="sales">Total sales</option>
              </select>
            </Field>
            <Field label="Selection" hint="Only approved sellers are ever shown.">
              <select className="select" value={st.mode ?? "auto"} onChange={(e) => onSettings({ mode: e.target.value as never })}>
                <option value="auto">Automatic (by sort)</option><option value="manual">Hand-picked</option>
              </select>
            </Field>
          </div>
          {st.mode === "manual" && <Picker kind="seller" max={12} ids={st.sellerIds ?? []} labels={labels} onChange={(ids) => onSettings({ sellerIds: ids })} />}
        </>
      )}

      {s.type === "adsense" && (
        <Field label="Ad placement" hint="Each placement has its own AdSense unit ID. If the placement isn't fully set up, this section stays hidden.">
          <select className="select max-w-xs" value={st.adSlot ?? "home_top"} onChange={(e) => onSettings({ adSlot: e.target.value as never })}>
            <option value="home_top">Home — top</option><option value="home_middle">Home — middle</option><option value="home_bottom">Home — bottom</option>
          </select>
          <Link href="/admin/site#advertising" className="mt-2 inline-block text-xs font-semibold text-brand underline">Configure AdSense →</Link>
        </Field>
      )}

      {s.type === "sponsored" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Image URL" hint="https:// or a /path. The section is hidden while this is empty."><input className="input" value={st.imageUrl ?? ""} onChange={(e) => onSettings({ imageUrl: e.target.value })} /></Field>
          <Field label="Link URL (optional)"><input className="input" value={st.linkUrl ?? ""} onChange={(e) => onSettings({ linkUrl: e.target.value })} /></Field>
          <Field label="Image description (alt text)"><input className="input" value={st.alt ?? ""} onChange={(e) => onSettings({ alt: e.target.value })} /></Field>
          <Field label="Height">
            <select className="select" value={st.height ?? "medium"} onChange={(e) => onSettings({ height: e.target.value as never })}>
              <option value="slim">Slim (90px)</option><option value="medium">Medium (160px)</option><option value="large">Large (250px)</option>
            </select>
          </Field>
          {st.imageUrl && /^(https:\/\/|\/)/.test(st.imageUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={st.imageUrl} alt="" className="max-h-24 rounded-lg border border-line object-cover md:col-span-2" />
          )}
        </div>
      )}

      {s.type === "how_it_works" && (
        <div className="space-y-3">
          {(st.steps ?? []).map((step, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line p-3 md:grid-cols-[9rem_1fr_2fr_auto]">
              <select className="select" value={step.icon} onChange={(e) => onSettings({ steps: (st.steps ?? []).map((x, j) => j === i ? { ...x, icon: e.target.value as never } : x) })}>
                {STEP_ICONS.map((ic) => <option key={ic}>{ic}</option>)}
              </select>
              <input className="input" placeholder="Title" value={step.title} maxLength={60} onChange={(e) => onSettings({ steps: (st.steps ?? []).map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} />
              <input className="input" placeholder="Text" value={step.text} maxLength={200} onChange={(e) => onSettings({ steps: (st.steps ?? []).map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} />
              <button type="button" className="btn btn-danger btn-sm" aria-label="Remove step" onClick={() => onSettings({ steps: (st.steps ?? []).filter((_, j) => j !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}
          {(st.steps ?? []).length < 6 && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onSettings({ steps: [...(st.steps ?? []), { icon: "Search", title: "", text: "" }] })}><PlusCircle size={13} /> Add step</button>
          )}
        </div>
      )}

      {s.type === "become_seller" && (
        <Field label="Small line above the title"><input className="input" value={st.eyebrow ?? ""} onChange={(e) => onSettings({ eyebrow: e.target.value })} /></Field>
      )}

      {hasCta && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Button text"><input className="input" value={st.ctaText ?? ""} maxLength={30} onChange={(e) => onSettings({ ctaText: e.target.value })} /></Field>
          <Field label="Button link" hint="/search?sort=discount or https://…"><input className="input" value={st.ctaHref ?? ""} onChange={(e) => onSettings({ ctaHref: e.target.value })} /></Field>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------ page ------------------------------------ */

export default function HomepageAdminClient({ initial, categories, labels }: {
  initial: HomeSection[]; categories: { slug: string; name: string }[]; labels: Labels;
}) {
  const router = useRouter();
  const [sections, setSections] = useState<HomeSection[]>(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState<SectionType | "">("");

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (next: HomeSection[]) => { setSections(next.map((s, i) => ({ ...s, order: i }))); setDirty(true); };
  const patch = (id: string, p: Partial<HomeSection>) => set(sections.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const patchSettings = (id: string, p: Partial<SectionSettings>) => set(sections.map((s) => (s.id === id ? { ...s, settings: { ...s.settings, ...p } } : s)));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site/homepage_sections", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeSections(sections)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success("Homepage saved — it's live now");
      setDirty(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  const addable = SECTION_TYPES.filter((t) => !SECTION_META[t].unique || !sections.some((s) => s.type === t));

  return (
    <div className="mt-5">
      <div className="card sticky top-36 z-20 flex flex-wrap items-center gap-2 p-3">
        <select className="select max-w-56" value={adding} onChange={(e) => {
          const t = e.target.value as SectionType;
          if (!t) return;
          const created = newSection(t, sections.length);
          set([...sections, created]); setOpen(created.id); setAdding("");
        }} aria-label="Add section">
          <option value="">+ Add section…</option>
          {addable.map((t) => <option key={t} value={t}>{SECTION_META[t].label}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => { if (confirm("Replace the layout with the default homepage?")) set(DEFAULT_SECTIONS); }}>
          <RotateCcw size={13} /> Reset to default
        </button>
        <span className="ml-auto text-xs text-faint">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <button className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={save}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save homepage
        </button>
      </div>

      <SortableList
        className="mt-4"
        items={sections}
        onReorder={set}
        render={({ item: s, index, controls }) => (
          <div>
            <div className="flex flex-wrap items-center gap-2 p-2.5">
              {controls}
              <span className="w-5 text-center text-xs font-bold text-faint">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-semibold", !s.enabled && "text-faint line-through")}>{s.title || SECTION_META[s.type].label}</p>
                <p className="truncate text-[11px] text-faint">{SECTION_META[s.type].label} — {SECTION_META[s.type].hint}</p>
              </div>
              <button className={cn("btn btn-sm", s.enabled ? "btn-outline" : "btn-ghost")} type="button" onClick={() => patch(s.id, { enabled: !s.enabled })} aria-pressed={s.enabled}>
                {s.enabled ? <><Eye size={13} /> Visible</> : <><EyeOff size={13} /> Hidden</>}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" aria-expanded={open === s.id} aria-label="Edit section" onClick={() => setOpen(open === s.id ? null : s.id)}>
                Edit <ChevronDown size={13} className={cn("transition-transform", open === s.id && "rotate-180")} />
              </button>
              <button className="btn btn-danger btn-sm" type="button" aria-label="Remove section" onClick={() => { if (confirm(`Remove "${s.title}" from the homepage?`)) set(sections.filter((x) => x.id !== s.id)); }}>
                <Trash2 size={13} />
              </button>
            </div>
            {open === s.id && (
              <SectionEditor s={s} categories={categories} labels={labels}
                onSection={(p) => patch(s.id, p)} onSettings={(p) => patchSettings(s.id, p)} />
            )}
          </div>
        )}
      />
      <p className="mt-4 text-xs text-faint">
        Sections with nothing to show (an ad that isn&apos;t configured, no products, &quot;recently viewed&quot; for guests…) are skipped automatically, so the page never has gaps.
      </p>
    </div>
  );
}
