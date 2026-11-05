"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Banknote } from "lucide-react";
import { toast } from "sonner";

export function RequestPayoutButton({ balance }: { balance: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const eligible = balance >= 25;
  return (
    <button
      className="btn btn-primary w-full sm:w-auto"
      disabled={!eligible || busy}
      title={eligible ? "Request payout" : "Minimum payout is €25"}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/seller/payouts", { method: "POST" });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Payout failed");
          toast.success("Payout requested — an admin will settle it shortly.");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Payout failed");
        } finally { setBusy(false); }
      }}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />}
      Request payout
    </button>
  );
}
