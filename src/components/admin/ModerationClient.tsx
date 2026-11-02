"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn, statusTone, timeAgo } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";

type Review = { id: string; rating: number; comment: string | null; createdAt: string; authorName: string; target: string; kind: string };
type Ticket = { id: string; subject: string; status: string; priority: string; updatedAt: string; userName: string; userEmail: string; messages: number };
type Msg = { id: string; body: string; createdAt: string; authorName: string; authorRole: string; authorHue: number };

export default function ModerationClient({ reviews, tickets }: { reviews: Review[]; tickets: Ticket[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");

  const deleteReview = async (id: string) => {
    if (!confirm("Remove this review? Aggregated ratings will recompute.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Review removed");
      router.refresh();
    } catch {
      toast.error("Delete failed");
    } finally { setBusyId(null); }
  };

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(`Ticket ${status}`); router.refresh(); }
  };

  const openTicket = async (id: string) => {
    if (openId === id) return setOpenId(null);
    setOpenId(id); setMsgs([]); setReply("");
    const res = await fetch(`/api/support/tickets/${id}/messages`);
    const json = await res.json();
    if (res.ok) setMsgs(json.data.messages);
  };

  const sendReply = async () => {
    if (!reply.trim() || !openId) return;
    setBusyId(openId);
    try {
      const res = await fetch(`/api/support/tickets/${openId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      if (!res.ok) throw new Error();
      setReply("");
      const again = await fetch(`/api/support/tickets/${openId}/messages`);
      const json = await again.json();
      if (again.ok) setMsgs(json.data.messages);
      router.refresh();
    } catch {
      toast.error("Reply failed");
    } finally { setBusyId(null); }
  };

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-2">
      {/* reviews moderation */}
      <div>
        <h3 className="font-display font-bold">Latest reviews</h3>
        <div className="mt-3 space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {r.target} <span className="chip ml-1 text-[9px]">{r.kind}</span>
                  </p>
                  <p className="text-[11px] text-faint">by {r.authorName} · {timeAgo(r.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RatingStars value={r.rating} size={11} />
                  <button className="btn btn-danger btn-sm !px-2" aria-label="Remove review" disabled={busyId === r.id}
                    onClick={() => deleteReview(r.id)}>
                    {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              {r.comment && <p className="mt-2 text-xs text-mute">{r.comment}</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="card p-6 text-sm text-mute">No reviews to moderate.</p>}
        </div>
      </div>

      {/* support tickets */}
      <div>
        <h3 className="font-display font-bold">Support tickets</h3>
        <div className="mt-3 space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="card overflow-hidden">
              <button onClick={() => openTicket(t.id)} className="flex w-full items-center gap-2.5 p-3.5 text-left hover:bg-white/2">
                <span className={cn("chip border text-[10px]", statusTone(t.status))}>{t.status}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.subject}</span>
                  <span className="block text-[11px] text-faint">{t.userName} · {t.userEmail} · {t.messages} msg · {timeAgo(t.updatedAt)}</span>
                </span>
                <select
                  className="select w-auto py-1 text-[11px]"
                  value={t.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { e.stopPropagation(); setStatus(t.id, e.target.value); }}
                  aria-label="Ticket status"
                >
                  <option value="open">open</option>
                  <option value="pending">pending</option>
                  <option value="closed">closed</option>
                </select>
                <ChevronDown size={14} className={cn("text-faint transition-transform", openId === t.id && "rotate-180")} />
              </button>
              {openId === t.id && (
                <div className="border-t border-line bg-raised/30 p-3.5">
                  {msgs.length === 0 && <p className="py-2 text-center text-xs text-faint">Loading…</p>}
                  <div className="space-y-2.5">
                    {msgs.map((m) => (
                      <div key={m.id} className={cn("rounded-xl border px-3 py-2 text-xs leading-relaxed",
                        m.authorRole === "admin" ? "ml-8 border-vio/25 bg-vio/10" : "mr-8 border-line bg-card")}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-faint">{m.authorName}</p>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))}
                  </div>
                  {t.status !== "closed" && (
                    <div className="mt-3 flex gap-2">
                      <input className="input flex-1 text-sm" placeholder="Reply as support…" value={reply}
                        onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} />
                      <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={busyId === openId}>
                        {busyId === openId ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {tickets.length === 0 && <p className="card p-6 text-sm text-mute">Inbox zero. Nicely done.</p>}
        </div>
      </div>
    </div>
  );
}
