"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SettingsForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [busyName, setBusyName] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busyPw, setBusyPw] = useState(false);

  const patch = async (body: Record<string, string>) => {
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Update failed");
  };

  return (
    <>
      <form
        className="card p-4 sm:p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusyName(true);
          try {
            await patch({ name: displayName });
            toast.success("Profile updated");
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed");
          } finally { setBusyName(false); }
        }}
      >
        <h3 className="font-display font-bold">Profile</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Display name</label>
            <input className="input" autoComplete="name" value={displayName} minLength={2} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} disabled />
            <p className="mt-1 text-[11px] text-faint">Email changes require support verification in this demo.</p>
          </div>
        </div>
        <button className="btn btn-primary mt-4 w-full sm:w-auto" disabled={busyName}>
          {busyName && <Loader2 size={14} className="animate-spin" />} Save profile
        </button>
      </form>

      <form
        className="card p-4 sm:p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusyPw(true);
          try {
            await patch({ currentPassword: current, newPassword: next });
            toast.success("Password changed — other sessions were signed out.");
            setCurrent(""); setNext("");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed");
          } finally { setBusyPw(false); }
        }}
      >
        <h3 className="font-display font-bold">Security</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary mt-4 w-full sm:w-auto" disabled={busyPw}>
          {busyPw && <Loader2 size={14} className="animate-spin" />} Change password
        </button>
      </form>
    </>
  );
}
