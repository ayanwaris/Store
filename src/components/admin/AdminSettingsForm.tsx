"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsForm({ fees, defaultCommission, supportEmail }: {
  fees: { percent: number; fixed: number };
  defaultCommission: number;
  supportEmail: string;
}) {
  const [percent, setPercent] = useState(String(fees.percent));
  const [fixed, setFixed] = useState(String(fees.fixed));
  const [commission, setCommission] = useState(String(defaultCommission));
  const [email, setEmail] = useState(supportEmail);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  const save = async (key: string, value: unknown, label: string) => {
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/settings/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success(`${label} saved`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-display font-bold">Service &amp; processing fee</h3>
        <p className="mt-1 text-xs text-faint">Charged to buyers at checkout: (subtotal − coupon) × % + fixed.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Percent</label>
            <input className="input" type="number" min={0} max={20} step={0.1} value={percent} onChange={(e) => setPercent(e.target.value)} />
          </div>
          <div>
            <label className="label">Fixed (EUR)</label>
            <input className="input" type="number" min={0} max={10} step={0.01} value={fixed} onChange={(e) => setFixed(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary mt-4" disabled={busy === "fees"}
          onClick={() => save("fees", { percent: Number(percent), fixed: Number(fixed) }, "Fee config")}>
          {busy === "fees" && <Loader2 size={14} className="animate-spin" />} Save fees
        </button>
      </div>

      <div className="card p-5">
        <h3 className="font-display font-bold">Default seller commission</h3>
        <p className="mt-1 text-xs text-faint">Applied to new seller applications; per-seller rates override it.</p>
        <div className="mt-3 flex items-center gap-3">
          <input className="input w-28" type="number" min={0} max={30} step={0.5} value={commission} onChange={(e) => setCommission(e.target.value)} />
          <span className="text-sm text-faint">%</span>
        </div>
        <button className="btn btn-primary mt-4" disabled={busy === "default_commission"}
          onClick={() => save("default_commission", Number(commission), "Default commission")}>
          {busy === "default_commission" && <Loader2 size={14} className="animate-spin" />} Save commission
        </button>
      </div>

      <div className="card p-5">
        <h3 className="font-display font-bold">Support contact</h3>
        <input className="input mt-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-primary mt-4" disabled={busy === "support_email"}
          onClick={() => save("support_email", email, "Support email")}>
          {busy === "support_email" && <Loader2 size={14} className="animate-spin" />} Save email
        </button>
      </div>
    </div>
  );
}
