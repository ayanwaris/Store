"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { buildLoginUrl, buildRegisterUrl, resolveNext } from "@/lib/redirect";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json;
}

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <form
      className="card p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          // `next` is sent for server-side validation; the server answers with a safe `redirectTo`.
          const json = await post("/api/auth/login", { email, password, next });
          toast.success("Welcome back!");
          router.push(resolveNext(json?.data?.redirectTo ?? next));
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Login failed");
          setBusy(false);
        }
      }}
    >
      <h1 className="font-display text-xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-mute">Your vault misses you. Demo: buyer@keyhaven.app / Buyer!23456</p>
      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Log in
        </button>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          <Link href="/forgot-password" className="link py-1">Forgot password?</Link>
          <Link href={buildRegisterUrl(next)} className="py-1 font-semibold text-brand-bright hover:underline">Create account</Link>
        </div>
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : /[A-Z]/.test(password) && /\d/.test(password) ? 3 : 2;

  return (
    <form
      className="card p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const json = await post("/api/auth/register", { name, email, password, next });
          toast.success("Account created — welcome to KeyHaven!");
          router.push(resolveNext(json?.data?.redirectTo ?? next));
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Registration failed");
          setBusy(false);
        }
      }}
    >
      <h1 className="font-display text-xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-mute">Buy keys, track orders, build your library.</p>
      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">Display name</label>
          <input id="name" className="input" autoComplete="name" required minLength={2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
        </div>
        <div>
          <label className="label" htmlFor="email2">Email</label>
          <input id="email2" className="input" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="password2">Password</label>
          <input id="password2" className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
          <div className="mt-2 flex gap-1">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${strength >= i ? (i === 1 ? "bg-rose-400" : i === 2 ? "bg-amber-400" : "bg-mint") : "bg-line"}`} />
            ))}
            <span className="ml-2 text-[10px] text-faint">{["", "weak", "ok", "strong"][strength]}</span>
          </div>
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : null} Create account
        </button>
        <p className="text-center text-xs text-faint">
          By continuing you agree to our <Link href="/legal/terms" className="underline">Terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <p className="text-center text-sm text-mute">
          Already have an account?{" "}
          <Link href={buildLoginUrl(next)} className="font-semibold text-brand-bright hover:underline">Log in</Link>
        </p>
      </div>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  return (
    <form
      className="card p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const json = await post("/api/auth/password/forgot", { email });
          setToken(json.data.devResetLink ?? null);
          toast.success("If that email exists, a reset link was created.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Request failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="font-display text-xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-mute">We&apos;ll create a secure reset link for your account.</p>
      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="email3">Email</label>
          <input id="email3" className="input" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <MailCheck size={15} />} Send reset link
        </button>
      </div>
      {token && (
        <div className="mt-4 rounded-xl border border-mint/25 bg-mint/5 p-3.5 text-xs text-mute">
          <p className="font-semibold text-mint">Demo mode — no email server attached.</p>
          <p className="mt-1">Your reset link (expires in 60 min):</p>
          <Link href={token} className="mt-1 block break-all font-mono text-brand-bright underline">{token}</Link>
        </div>
      )}
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <form
      className="card p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await post("/api/auth/password/reset", { token, password });
          toast.success("Password updated — log in with your new one.");
          router.push("/login");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Reset failed");
          setBusy(false);
        }
      }}
    >
      <h1 className="font-display text-xl font-bold">Choose a new password</h1>
      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="password3">New password</label>
          <input id="password3" className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : null} Update password
        </button>
      </div>
    </form>
  );
}
