"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle, Trash2, Pencil, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string; slug: string; icon: string; blurb: string };
type Bnr = { id: string; title: string; subtitle: string; ctaText: string; ctaHref: string; hue: number; active: boolean; position: number };

const ICONS = ["Gamepad2", "Gift", "AppWindow", "BadgeCheck", "Coins", "Puzzle"];

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method, headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Action failed");
}

export default function CatalogClient({ categories, banners }: { categories: Cat[]; banners: Bnr[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editCat, setEditCat] = useState<Cat | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", icon: "Gamepad2", blurb: "" });
  const [showBnrForm, setShowBnrForm] = useState(false);
  const [bnrForm, setBnrForm] = useState({ title: "", subtitle: "", ctaText: "", ctaHref: "", hue: 265 });
  const [bnrEdit, setBnrEdit] = useState<Bnr | null>(null);

  const run = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-2">
      {/* ------------------------------ categories ------------------------------ */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Categories</h3>
          <button className="btn btn-outline btn-sm" onClick={() => { setShowCatForm(true); setEditCat(null); setCatForm({ name: "", icon: "Gamepad2", blurb: "" }); }}>
            <PlusCircle size={13} /> Add
          </button>
        </div>
        <ul className="mt-3 divide-y divide-line-soft">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="truncate text-[11px] text-faint">/{c.slug} · icon {c.icon}</p>
              </div>
              <button className="btn btn-ghost btn-sm" aria-label="Edit" onClick={() => { setEditCat(c); setCatForm({ name: c.name, icon: c.icon, blurb: c.blurb }); setShowCatForm(true); }}>
                <Pencil size={13} />
              </button>
              <button className="btn btn-danger btn-sm" aria-label="Delete" disabled={busy}
                onClick={() => run(async () => { await call("DELETE", `/api/admin/categories/${c.id}`); }, "Category deleted")}>
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------------- banners ------------------------------- */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Homepage banners</h3>
          <button className="btn btn-outline btn-sm" onClick={() => { setShowBnrForm(true); setBnrEdit(null); setBnrForm({ title: "", subtitle: "", ctaText: "", ctaHref: "", hue: 265 }); }}>
            <PlusCircle size={13} /> Add
          </button>
        </div>
        <ul className="mt-3 space-y-2.5">
          {banners.map((b) => (
            <li key={b.id} className={cn("flex items-center gap-3 rounded-xl border border-line p-3", !b.active && "opacity-50")}>
              <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: `hsl(${b.hue} 65% 40%)` }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{b.title}</p>
                <p className="truncate text-[11px] text-faint">{b.ctaText} → {b.ctaHref}</p>
              </div>
              <button className="btn btn-ghost btn-sm" aria-label="Toggle" disabled={busy}
                onClick={() => run(async () => { await call("PATCH", `/api/admin/banners/${b.id}`, { active: !b.active }); }, b.active ? "Banner hidden" : "Banner live")}>
                {b.active ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button className="btn btn-danger btn-sm" aria-label="Delete" disabled={busy}
                onClick={() => run(async () => { await call("DELETE", `/api/admin/banners/${b.id}`); }, "Banner deleted")}>
                <Trash2 size={13} />
              </button>
            </li>
          ))}
          {banners.length === 0 && <p className="text-sm text-mute">No banners — homepage falls back to defaults.</p>}
        </ul>
      </div>

      {/* category modal */}
      {showCatForm && (
        <Modal onClose={() => setShowCatForm(false)} title={editCat ? "Edit category" : "New category"}>
          <div className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input className="input" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Icon</label>
              <select className="select" value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}>
                {ICONS.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Blurb</label>
              <input className="input" value={catForm.blurb} onChange={(e) => setCatForm({ ...catForm, blurb: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary mt-5 w-full" disabled={busy || catForm.name.length < 2}
            onClick={() => run(async () => {
              if (editCat) await call("PATCH", `/api/admin/categories/${editCat.id}`, catForm);
              else await call("POST", "/api/admin/categories", catForm);
              setShowCatForm(false);
            }, "Category saved")}>
            {busy && <Loader2 size={14} className="animate-spin" />} Save category
          </button>
        </Modal>
      )}

      {showBnrForm && (
        <Modal onClose={() => setShowBnrForm(false)} title="New banner">
          <div className="space-y-3">
            <div><label className="label">Title</label><input className="input" value={bnrForm.title} onChange={(e) => setBnrForm({ ...bnrForm, title: e.target.value })} /></div>
            <div><label className="label">Subtitle</label><input className="input" value={bnrForm.subtitle} onChange={(e) => setBnrForm({ ...bnrForm, subtitle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">CTA text</label><input className="input" value={bnrForm.ctaText} onChange={(e) => setBnrForm({ ...bnrForm, ctaText: e.target.value })} placeholder="Shop now" /></div>
              <div><label className="label">CTA link</label><input className="input" value={bnrForm.ctaHref} onChange={(e) => setBnrForm({ ...bnrForm, ctaHref: e.target.value })} placeholder="/category/games" /></div>
            </div>
            <div>
              <label className="label">Accent hue: {bnrForm.hue}</label>
              <input type="range" min={0} max={359} value={bnrForm.hue} onChange={(e) => setBnrForm({ ...bnrForm, hue: Number(e.target.value) })} className="w-full accent-orange-500" />
            </div>
          </div>
          <button className="btn btn-primary mt-5 w-full" disabled={busy || bnrForm.title.length < 2}
            onClick={() => run(async () => {
              await call("POST", "/api/admin/banners", { ...bnrForm, position: banners.length });
              setShowBnrForm(false);
            }, "Banner created")}>
            {busy && <Loader2 size={14} className="animate-spin" />} Create banner
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="card animate-pop relative w-full max-w-sm p-6">
        <button className="btn btn-ghost btn-sm absolute right-3 top-3" onClick={onClose}><X size={16} /></button>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
void Pencil;
