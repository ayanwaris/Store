"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { toast } from "sonner";

export default function SellerApplyForm({ heading = "Apply to become a seller" }: { heading?: string }) {
  const [storeName, setStoreName] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <form
      className="card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const res = await fetch("/api/seller/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeName, about: about || undefined }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Application failed");
          toast.success("Application submitted for review!");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Application failed");
        } finally { setBusy(false); }
      }}
    >
      <h2 className="font-display text-lg font-bold">{heading}</h2>
      <p className="mt-1 text-sm text-mute">Admin approval required before listings go live — this keeps buyers safe.</p>
      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="storeName">Store name</label>
          <input id="storeName" className="input" required minLength={3} maxLength={40} value={storeName}
            onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Meridian Keys" />
        </div>
        <div>
          <label className="label" htmlFor="about">About your store <span className="text-faint">(optional)</span></label>
          <textarea id="about" className="textarea min-h-24" maxLength={500} value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Where do you source keys? What regions/platforms do you specialize in?" />
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Store size={15} />} Submit application
        </button>
      </div>
    </form>
  );
}
