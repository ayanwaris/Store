"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SellerSettingsForm({ storeName, about, commissionRate, slug }: {
  storeName: string; about: string; commissionRate: number; slug: string;
}) {
  const [name, setName] = useState(storeName);
  const [bio, setBio] = useState(about);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const res = await fetch("/api/seller/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeName: name, about: bio }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Update failed");
          toast.success("Store updated");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Update failed");
        } finally { setBusy(false); }
      }}
    >
      <div>
        <label className="label">Store name</label>
        <input className="input" value={name} minLength={3} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Store URL</label>
        <input className="input" value={`keyhaven.app/store/${slug}`} disabled />
      </div>
      <div>
        <label className="label">About (public)</label>
        <textarea className="textarea min-h-24" maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div>
        <label className="label">Platform commission</label>
        <input className="input" value={`${commissionRate}% on each sale`} disabled />
        <p className="mt-1 text-[11px] text-faint">Contact support or your account manager for rate reviews.</p>
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy && <Loader2 size={14} className="animate-spin" />} Save store
      </button>
    </form>
  );
}
