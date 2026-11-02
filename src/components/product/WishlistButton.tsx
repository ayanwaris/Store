"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function WishlistButton({ productId, active, loggedIn }: {
  productId: string; active: boolean; loggedIn: boolean;
}) {
  const [on, setOn] = useState(active);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    if (!loggedIn) {
      toast("Log in to save products to your wishlist");
      return router.push("/login");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: on ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error();
      setOn(!on);
      toast.success(on ? "Removed from wishlist" : "Saved to wishlist");
      router.refresh();
    } catch {
      toast.error("Could not update wishlist");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label="Toggle wishlist"
      className={cn(
        "btn btn-outline btn-sm",
        on && "border-rose-400/40 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15",
      )}
    >
      <Heart size={15} className={on ? "fill-rose-400 text-rose-400" : ""} />
      {on ? "Wishlisted" : "Wishlist"}
    </button>
  );
}
