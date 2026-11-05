"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, MailCheck } from "lucide-react";
import { DEFAULT_NEWSLETTER, type NewsletterConfig } from "@/lib/site-config";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function NewsletterForm({
  config = DEFAULT_NEWSLETTER, source = "home",
}: { config?: NewsletterConfig; source?: "home" | "footer" }) {
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) return toast.error("Enter a valid email address.");
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source, website: trap }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not subscribe. Please try again.");
      setDone(true);
      setEmail("");
      toast.success(json.data?.message ?? config.successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not subscribe. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <p role="status" className="flex w-full max-w-md items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand/8 px-4 py-3 text-sm font-semibold text-brand md:justify-start">
        <Check size={16} /> {config.successMessage}
      </p>
    );
  }

  return (
    <form className="flex w-full max-w-md flex-col gap-2 sm:flex-row" onSubmit={submit} noValidate>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={config.placeholder}
        className="input min-w-0 flex-1"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        autoComplete="email"
        required
        aria-label="Email address"
      />
      {/* honeypot — hidden from people and assistive tech */}
      <input
        value={trap} onChange={(e) => setTrap(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true" name="website"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <MailCheck size={16} />} {config.buttonLabel}
      </button>
    </form>
  );
}
