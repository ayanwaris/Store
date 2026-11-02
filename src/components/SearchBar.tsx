"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { cn, fmtEUR } from "@/lib/utils";

type Suggestion = {
  products: Array<{ slug: string; title: string; platform: string; hue: number; minPrice: number | null }>;
  categories: Array<{ name: string; slug: string }>;
};

export default function SearchBar({ variant = "nav" }: { variant?: "nav" | "hero" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Suggestion>({ products: [], categories: [] });
  const [hi, setHi] = useState(-1);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setData({ products: [], categories: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setData(json.data ?? { products: [], categories: [] });
      } finally {
        setLoading(false);
        setHi(-1);
      }
    }, 220);
  }, [q]);

  const items = data.products;
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const submit = () => {
    if (hi >= 0 && items[hi]) return go(`/product/${items[hi].slug}`);
    if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className={cn(
          "relative flex items-center",
          variant === "hero"
            ? "rounded-2xl border border-line bg-panel/90 shadow-[0_20px_60px_-20px_rgba(255,122,26,0.35)] focus-within:border-brand/50"
            : "rounded-xl border border-line bg-raised/60 focus-within:border-brand/50",
        )}
      >
        <Search size={variant === "hero" ? 20 : 16} className="ml-4 shrink-0 text-faint" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          aria-label="Search products"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, items.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)); }
          }}
          placeholder={
            variant === "hero"
              ? "Search games, gift cards, software…"
              : "Search 20,000+ digital products"
          }
          className={cn(
            "w-full bg-transparent outline-none placeholder:text-faint",
            variant === "hero" ? "px-4 py-4 text-base" : "px-3 py-2 text-sm",
          )}
        />
        {loading && <Loader2 size={16} className="mr-4 animate-spin text-faint" />}
        {variant === "hero" && (
          <button type="submit" className="btn btn-primary mr-2 hidden sm:inline-flex">Search</button>
        )}
      </form>

      {open && q.trim() && (
        <div className="card animate-pop absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden shadow-2xl shadow-black/70">
          {data.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-line-soft px-3 py-2.5">
              {data.categories.map((c) => (
                <button key={c.slug} onClick={() => go(`/category/${c.slug}`)} className="chip hover:border-brand/50 hover:text-brand-bright">
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {items.length === 0 && !loading && (
            <p className="px-4 py-5 text-sm text-faint">No matches for “{q}”. Try another title or category.</p>
          )}
          {items.map((p, i) => (
            <button
              key={p.slug}
              onMouseEnter={() => setHi(i)}
              onClick={() => go(`/product/${p.slug}`)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                hi === i ? "bg-white/5" : "",
              )}
            >
              <span
                className="grid h-10 w-8 shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, hsl(${p.hue} 70% 30%), hsl(${(p.hue + 40) % 360} 60% 18%))` }}
              >
                {p.title[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.title}</span>
                <span className="block text-xs text-faint">{p.platform}</span>
              </span>
              {p.minPrice != null && (
                <span className="text-sm font-bold text-brand-bright">{fmtEUR(p.minPrice)}</span>
              )}
            </button>
          ))}
          <button
            onClick={submit}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line bg-white/2 px-3 py-2.5 text-sm font-medium text-mute transition hover:text-brand-bright"
          >
            See all results for “{q}” <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
