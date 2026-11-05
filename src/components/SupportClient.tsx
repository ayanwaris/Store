"use client";

import { useState } from "react";
import { Loader2, MessageSquarePlus, Send, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn, statusTone, timeAgo } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Ticket = { id: string; subject: string; status: string; priority: string; createdAt: string; updatedAt: string; messages: number };
type Message = { id: string; body: string; createdAt: string; authorName: string; authorRole: string; authorHue: number };

export default function SupportClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const router = useRouter();
  const [tickets] = useState(initialTickets);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const openTicket = async (id: string) => {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    setMsgs([]);
    const res = await fetch(`/api/support/tickets/${id}/messages`);
    const json = await res.json();
    if (res.ok) setMsgs(json.data.messages);
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create ticket");
      toast.success("Ticket created — we'll reply soon.");
      setSubject(""); setBody(""); setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setCreating(false); }
  };

  const sendReply = async () => {
    if (!openId || !reply.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${openId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      if (!res.ok) throw new Error();
      setReply("");
      await openTicket(openId); // reload
      setOpenId(openId);
    } catch {
      toast.error("Could not send reply");
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-5 space-y-3">
      <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowForm((s) => !s)}>
        <MessageSquarePlus size={15} /> New ticket
      </button>

      {showForm && (
        <form onSubmit={createTicket} className="card animate-pop p-4 sm:p-5">
          <label className="label">Subject</label>
          <input className="input" required minLength={4} maxLength={140} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Key not activating on Vapor — order KH-…" />
          <label className="label mt-3">Describe the issue</label>
          <textarea className="textarea min-h-28" required minLength={4} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Include your order number and the key's behavior…" />
          <button className="btn btn-primary mt-3 w-full sm:w-auto" disabled={creating}>
            {creating && <Loader2 size={14} className="animate-spin" />} Submit ticket
          </button>
        </form>
      )}

      {tickets.length === 0 && !showForm && (
        <div className="card p-6 text-center text-sm text-mute sm:p-10">No tickets yet. We hope it stays that way.</div>
      )}

      {tickets.map((t) => (
        <div key={t.id} className="card overflow-hidden">
          <button
            onClick={() => openTicket(t.id)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/2"
          >
            {/* phones: subject on top, status + age underneath; desktop: one single row */}
            <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="truncate text-sm font-semibold sm:order-2 sm:flex-1">{t.subject}</span>
              <span className="flex items-center gap-2 sm:contents">
                <span className={cn("chip border text-[10px] sm:order-1", statusTone(t.status))}>{t.status}</span>
                <span className="text-xs text-faint sm:order-3">{t.messages} msg · {timeAgo(t.updatedAt)}</span>
              </span>
            </span>
            <ChevronDown size={15} className={cn("text-faint transition-transform", openId === t.id && "rotate-180")} />
          </button>

          {openId === t.id && (
            <div className="border-t border-line bg-raised/30 p-4">
              {msgs.length === 0 && <p className="py-4 text-center text-xs text-faint">Loading conversation…</p>}
              <div className="space-y-3">
                {msgs.map((m) => (
                  <div key={m.id} className={cn("flex gap-3", m.authorRole === "admin" && "flex-row-reverse")}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                      style={{ background: `hsl(${m.authorHue} 65% 42%)` }}>
                      {m.authorName[0]}
                    </span>
                    <div className={cn("min-w-0 max-w-[85%] rounded-xl border border-line px-3.5 py-2.5 text-sm sm:max-w-[80%]",
                      m.authorRole === "admin" ? "bg-vio/10 border-vio/25" : "bg-card")}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-faint">
                        {m.authorName}{m.authorRole === "admin" ? " · support" : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-ink/90">{m.body}</p>
                      <p className="mt-1 text-[10px] text-faint">{timeAgo(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {t.status !== "closed" && (
                <div className="mt-4 flex gap-2">
                  <input className="input min-w-0 flex-1" enterKeyHint="send" placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()} />
                  <button className="btn btn-primary btn-sm shrink-0" onClick={sendReply} disabled={busy} aria-label="Send reply">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
