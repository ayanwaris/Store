"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AddBestButton({ offerId, className }: { offerId: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      className={cn("btn btn-primary", className)}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offerId, quantity: 1 }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Could not add to cart");
          toast.success("Best offer added to cart");
          router.push("/cart");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
      Add best offer
    </button>
  );
}
