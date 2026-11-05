"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageSearch, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { cn, fmtEUR } from "@/lib/utils";
import GlassSelect from "@/components/ui/GlassSelect";

type Product = { id: string; slug: string; title: string; platform: string; kind: string; rrp: number };

export default function NewOfferForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [price, setPrice] = useState("");
  const [region, setRegion] = useState("GLOBAL");
  const [keys, setKeys] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (selected) return;
    setSearching(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/products?picker=1&q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.data ?? []);
      setSearching(false);
    }, 180);
  }, [q, selected]);

  const submit = async () => {
    if (!selected) return toast.error("Pick a product first");
    const codes = keys.split(/[\n,;]+/).map((c) => c.trim()).filter(Boolean);
    setBusy(true);
    try {
      const res = await fetch("/api/seller/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selected.id, price: Number(price), region, keys: codes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create listing");
      toast.success("Listing created and live!");
      router.push("/seller/offers");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-5 p-4 sm:p-6">
      {/* product picker */}
      <div>
        <label className="label">Catalog product</label>
        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/5 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">{selected.title}</p>
              <p className="text-xs text-faint">{selected.platform} · {selected.kind} · RRP {fmtEUR(selected.rrp)}</p>
            </div>
            <button className="btn btn-ghost btn-sm shrink-0" onClick={() => setSelected(null)}>Change</button>
          </div>
        ) : (
          <div className="relative">
            <input className="input" placeholder="Search catalog…" enterKeyHint="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="card absolute left-0 right-0 top-full z-20 mt-1.5 max-h-60 overflow-y-auto overscroll-contain p-1.5">
              {searching && <p className="p-3 text-xs text-faint">Searching…</p>}
              {!searching && results.length === 0 && (
                <p className="flex items-center gap-2 p-3 text-xs text-faint"><PackageSearch size={14} /> No products match.</p>
              )}
              {results.map((p) => (
                <button key={p.id} onClick={() => setSelected(p)}
                  className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/4 sm:py-2")}>
                  <span className="min-w-0">
                    <span className="block font-medium">{p.title}</span>
                    <span className="text-[11px] text-faint">{p.platform} · {p.kind}</span>
                  </span>
                  <span className="shrink-0 text-xs text-mute">RRP {fmtEUR(p.rrp)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Your price (EUR)</label>
          <input className="input" type="number" inputMode="decimal" min={0.49} max={5000} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="34.99" />
        </div>
        <div>
          <label className="label">Region</label>
          <GlassSelect className="select" value={region} onChange={(e) => setRegion(e.target.value)}>
            {["GLOBAL", "EU", "US", "LATAM", "ASIA"].map((r) => <option key={r}>{r}</option>)}
          </GlassSelect>
        </div>
      </div>

      <div>
        <label className="label">Initial keys — one per line</label>
        <textarea className="textarea min-h-28 font-mono text-xs" value={keys} onChange={(e) => setKeys(e.target.value)}
          placeholder={"ABCDE-23456-FGHIJ\nKLMNO-78901-PQRST"} />
        <p className="mt-1.5 text-[11px] text-faint">Stock updates instantly. A listing with zero keys appears as out of stock.</p>
      </div>

      <button className="btn btn-primary w-full" onClick={submit} disabled={busy || !selected || !price}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />} Publish listing
      </button>
    </div>
  );
}
