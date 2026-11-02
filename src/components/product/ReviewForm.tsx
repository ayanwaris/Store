"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ReviewForm({ productId, orderItemId }: { productId: string; orderItemId?: string }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, orderItemId, rating, comment: comment || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit review");
      toast.success("Thanks! Your review is live.");
      setComment("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-5">
      <p className="font-display font-bold">Write a review</p>
      <p className="mt-0.5 text-xs text-faint">Only verified purchases are published.</p>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            aria-label={`${i} stars`}
          >
            <Star
              size={22}
              className={cn("transition", (hover || rating) >= i ? "fill-amber-400 text-amber-400" : "text-line")}
              strokeWidth={(hover || rating) >= i ? 0 : 2}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-mute">{rating}/5</span>
      </div>
      <textarea
        className="textarea mt-3 min-h-24"
        placeholder="How was the key? Instant delivery? Any activation notes for other buyers?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={800}
      />
      <button className="btn btn-primary mt-3" disabled={busy}>
        <Send size={14} /> {busy ? "Publishing…" : "Publish review"}
      </button>
    </form>
  );
}
