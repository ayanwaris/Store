"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Pencil, Power, X } from "lucide-react";
import { toast } from "sonner";
import { cn, fmtEUR } from "@/lib/utils";
import GlassSelect from "@/components/ui/GlassSelect";

type Offer = {
  id: string; price: number; region: string; active: boolean;
  stockCount: number; soldCount: number;
  productTitle: string; productSlug: string; platform: string; rrp: number;
};

export default function SellerOffersClient({ offers }: { offers: Offer[] }) {
  const formatter = fmtEUR;
  const router = useRouter();
  const [edit, setEdit] = useState<Offer | null>(null);
  const [keysFor, setKeysFor] = useState<Offer | null>(null);
  const [price, setPrice] = useState("");
  const [region, setRegion] = useState("GLOBAL");
  const [keysText, setKeysText] = useState("");
  const [keysInfo, setKeysInfo] = useState<Record<string, number>[]>([]);
  const [busy, setBusy] = useState(false);

  const saveEdit = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/seller/offers/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(price), region }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      toast.success("Offer updated");
      setEdit(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally { setBusy(false); }
  };

  const toggle = async (o: Offer) => {
    const res = await fetch(`/api/seller/offers/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !o.active }),
    });
    if (res.ok) { toast.success(o.active ? "Offer hidden from buyers" : "Offer is live again"); router.refresh(); }
    else toast.error("Could not toggle offer");
  };

  const openKeys = async (o: Offer) => {
    setKeysFor(o);
    setKeysText("");
    const res = await fetch(`/api/seller/offers/${o.id}/keys`);
    const json = await res.json();
    if (res.ok) setKeysInfo(json.data.counts);
  };

  const uploadKeys = async () => {
    if (!keysFor) return;
    const codes = keysText.split(/[\n,;]+/).map((c) => c.trim()).filter(Boolean);
    if (!codes.length) return toast.error("Paste at least one key");
    setBusy(true);
    try {
      const res = await fetch(`/api/seller/offers/${keysFor.id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success(`${json.data.added} keys added${json.data.skipped ? `, ${json.data.skipped} duplicates skipped` : ""}`);
      setKeysText("");
      openKeys(keysFor);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  };

  if (!offers.length) {
    return (
      <div className="card flex flex-col items-center p-12 text-center">
        <KeyRound size={36} className="text-faint" />
        <p className="mt-3 font-semibold">No listings yet</p>
        <p className="mt-1 text-sm text-mute">Create your first listing and upload keys to start selling.</p>
        <Link href="/seller/offers/new" className="btn btn-primary btn-sm mt-4">New listing</Link>
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="table-x min-w-[640px]">
          <thead>
            <tr><th>Product</th><th>Price</th><th>Region</th><th>Stock</th><th>Sold</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className={cn(!o.active && "opacity-50")}>
                <td>
                  <Link href={`/product/${o.productSlug}`} className="font-semibold hover:text-brand-bright">{o.productTitle}</Link>
                  <p className="text-[11px] text-faint">{o.platform} · RRP {formatter(o.rrp)}</p>
                </td>
                <td className="font-display font-bold">{formatter(o.price)}</td>
                <td><span className="chip">{o.region}</span></td>
                <td>
                  <span className={cn("chip", o.stockCount === 0 ? "border-rose-400/30 text-rose-300" : o.stockCount <= 5 ? "border-amber-400/30 text-amber-300" : "text-mint")}>
                    {o.stockCount}
                  </span>
                </td>
                <td className="text-mute">{o.soldCount}</td>
                <td>
                  <span className={cn("chip border", o.active ? "border-mint/25 bg-mint/5 text-mint" : "border-line text-faint")}>
                    {o.active ? "Live" : "Hidden"}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <button className="btn btn-outline btn-sm" onClick={() => { setEdit(o); setPrice(String(o.price)); setRegion(o.region); }}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => openKeys(o)}>
                      <KeyRound size={13} /> Keys
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(o)} title={o.active ? "Hide offer" : "Publish offer"}>
                      <Power size={13} className={o.active ? "text-rose-300" : "text-mint"} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* edit modal */}
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEdit(null)} />
          <div className="card animate-pop relative w-full max-w-sm p-6">
            <button className="btn btn-ghost btn-sm absolute right-3 top-3" onClick={() => setEdit(null)}><X size={16} /></button>
            <h3 className="font-display font-bold">Edit offer</h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-mute">{edit.productTitle}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Price (EUR)</label>
                <input className="input" type="number" step="0.01" min={0.49} max={5000} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="label">Region</label>
                <GlassSelect className="select" value={region} onChange={(e) => setRegion(e.target.value)}>
                  {["GLOBAL", "EU", "US", "LATAM", "ASIA"].map((r) => <option key={r}>{r}</option>)}
                </GlassSelect>
              </div>
            </div>
            <button className="btn btn-primary mt-5 w-full" onClick={saveEdit} disabled={busy}>
              {busy && <Loader2 size={14} className="animate-spin" />} Save changes
            </button>
          </div>
        </div>
      )}

      {/* keys modal */}
      {keysFor && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setKeysFor(null)} />
          <div className="card animate-pop relative w-full max-w-lg p-6">
            <button className="btn btn-ghost btn-sm absolute right-3 top-3" onClick={() => setKeysFor(null)}><X size={16} /></button>
            <h3 className="font-display font-bold">Inventory keys</h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-mute">{keysFor.productTitle}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {["available", "reserved", "sold", "revoked"].map((s) => {
                const n = keysInfo.find((k) => String(k.status) === s);
                return (
                  <span key={s} className="chip">
                    {s}: <strong className="text-ink">{String(n ? Object.values(n)[1] : 0)}</strong>
                  </span>
                );
              })}
            </div>

            <label className="label mt-4">Add keys — one per line (duplicates skipped)</label>
            <textarea className="textarea min-h-32 font-mono text-xs" value={keysText} onChange={(e) => setKeysText(e.target.value)}
              placeholder={"ABCDE-23456-FGHIJ\nKLMNO-78901-PQRST"} />
            <button className="btn btn-primary mt-3 w-full" onClick={uploadKeys} disabled={busy}>
              {busy && <Loader2 size={14} className="animate-spin" />} Upload keys
            </button>
            <p className="mt-2 text-[11px] text-faint">
              Keys are encrypted at rest in transit rules we enforce and never shown publicly; buyers see them only after payment captures.
            </p>
          </div>
        </div>
      )}
    </>
  );
}