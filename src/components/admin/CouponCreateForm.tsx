"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import GlassSelect from "@/components/ui/GlassSelect";

export default function CouponCreateForm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({ code: "", kind: "percent", value: "10", minSubtotal: "0", days: "", usageLimit: "" });

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          kind: form.kind,
          value: Number(form.value),
          minSubtotal: Number(form.minSubtotal || 0),
          expiresAt: form.days ? new Date(Date.now() + Number(form.days) * 86_400_000).toISOString() : null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success(`Coupon ${form.code.toUpperCase()} created`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally { setBusy(false); }
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><PlusCircle size={15} /> New coupon</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="card animate-pop relative w-full max-w-sm p-6">
            <button className="btn btn-ghost btn-sm absolute right-3 top-3" onClick={() => setOpen(false)}><X size={16} /></button>
            <h3 className="font-display text-lg font-bold">Create coupon</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Code</label>
                <input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER25" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kind</label>
                  <GlassSelect className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    <option value="percent">Percent %</option>
                    <option value="fixed">Fixed €</option>
                  </GlassSelect>
                </div>
                <div>
                  <label className="label">Value</label>
                  <input className="input" type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Min €</label>
                  <input className="input" type="number" min={0} value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
                </div>
                <div>
                  <label className="label">Days valid</label>
                  <input className="input" type="number" min={0} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} placeholder="∞" />
                </div>
                <div>
                  <label className="label">Max uses</label>
                  <input className="input" type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="∞" />
                </div>
              </div>
            </div>
            <button className="btn btn-primary mt-5 w-full" onClick={submit} disabled={busy || form.code.length < 3}>
              {busy && <Loader2 size={14} className="animate-spin" />} Create
            </button>
          </div>
        </div>
      )}
    </>
  );
}
