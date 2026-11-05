"use client";

import { useState, type ReactNode, cloneElement, isValidElement } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PLATFORMS, REGIONS, KINDS, KIND_LABEL } from "@/lib/utils";
import GlassSelect from "@/components/ui/GlassSelect";

export default function ProductCreateForm({ categories, trigger }: {
  categories: Array<{ id: string; name: string }>;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", subtitle: "", description: "", howToActivate: "",
    rrp: "19.99", platform: PLATFORMS[0] as string, region: "GLOBAL",
    kind: "game", genre: "", categoryId: categories[0]?.id ?? "", featured: false,
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rrp: Number(form.rrp),
          categoryId: form.categoryId || null,
          howToActivate: form.howToActivate || undefined,
          coverHue: Math.floor(Math.random() * 360),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success("Product created");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally { setBusy(false); }
  };

  const triggerNode = isValidElement(trigger) ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, { onClick: () => setOpen(true) }) : null;

  return (
    <>
      {triggerNode ?? (
        <button className="btn btn-primary" onClick={() => setOpen(true)}>New product</button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-3 sm:p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="card animate-pop relative my-auto w-full max-w-xl p-4 sm:p-6">
            <button className="btn btn-ghost btn-sm absolute right-3 top-3" onClick={() => setOpen(false)}><X size={16} /></button>
            <h3 className="font-display text-lg font-bold">New catalog product</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Subtitle</label>
                <input className="input" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea className="textarea min-h-24" value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div>
                <label className="label">Category</label>
                <GlassSelect className="select" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </GlassSelect>
              </div>
              <div>
                <label className="label">Type</label>
                <GlassSelect className="select" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
                  {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </GlassSelect>
              </div>
              <div>
                <label className="label">Platform</label>
                <GlassSelect className="select" value={form.platform} onChange={(e) => set("platform", e.target.value)}>
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </GlassSelect>
              </div>
              <div>
                <label className="label">Region</label>
                <GlassSelect className="select" value={form.region} onChange={(e) => set("region", e.target.value)}>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </GlassSelect>
              </div>
              <div>
                <label className="label">RRP (EUR)</label>
                <input className="input" type="number" min={0.5} step="0.01" value={form.rrp} onChange={(e) => set("rrp", e.target.value)} />
              </div>
              <div>
                <label className="label">Genre (optional)</label>
                <input className="input" value={form.genre} onChange={(e) => set("genre", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Activation instructions (optional)</label>
                <textarea className="textarea min-h-16" value={form.howToActivate} onChange={(e) => set("howToActivate", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-mute sm:col-span-2">
                <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-orange-500" />
                Feature on the homepage spotlight
              </label>
            </div>
            <button className="btn btn-primary mt-5 w-full" onClick={submit} disabled={busy || form.title.length < 2 || form.description.length < 10}>
              {busy && <Loader2 size={14} className="animate-spin" />} Create product
            </button>
          </div>
        </div>
      )}
    </>
  );
}
