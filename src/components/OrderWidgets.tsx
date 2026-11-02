"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, Undo2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function KeyReveal({ code, revoked }: { code: string; revoked?: boolean }) {
  const [shown, setShown] = useState(false);
  const masked = code.split("-").map((s, i) => (i === 0 ? s : "•••••")).join("-");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className={`rounded-lg border border-line bg-panel px-3 py-1.5 font-mono text-sm tracking-wider ${revoked ? "text-faint line-through" : "text-mint"}`}>
        {revoked ? code : shown ? code : masked}
      </code>
      {!revoked && (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide key" : "Reveal key"}>
            {shown ? <EyeOff size={14} /> : <Eye size={14} />} {shown ? "Hide" : "Reveal"}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              toast.success("Key copied to clipboard");
            }}
            aria-label="Copy key"
          >
            <Copy size={14} /> Copy
          </button>
        </>
      )}
      {revoked && <span className="chip border border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px]">Revoked (refunded)</span>}
    </div>
  );
}

export function RefundRequestButton({ orderId, orderItemId }: { orderId: string; orderItemId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/refund-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not request refund");
      toast.success("Refund request submitted — our team will review it.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button className="btn btn-ghost btn-sm text-mute" onClick={() => setOpen(true)}>
        <Undo2 size={13} /> Request refund
      </button>
    );
  }
  return (
    <div className="mt-1 max-w-md rounded-xl border border-line bg-raised/40 p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
        <AlertCircle size={13} /> Refunds revoke the delivered key and return your money.
      </p>
      <textarea
        className="textarea mt-2.5 min-h-16 text-sm"
        placeholder="What went wrong? (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="mt-2.5 flex gap-2">
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>
          {busy ? "Submitting…" : "Submit request"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      className="btn btn-danger btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/checkout/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          if (!res.ok) throw new Error();
          toast("Order cancelled and keys released.");
          router.refresh();
        } catch {
          toast.error("Could not cancel order");
        } finally {
          setBusy(false);
        }
      }}
    >
      Cancel order &amp; release keys
    </button>
  );
}
