"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, ShieldOff, ShieldCheck, Star, Eye, EyeOff, Trash2, BadgePercent } from "lucide-react";
import { toast } from "sonner";
import GlassSelect from "@/components/ui/GlassSelect";

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Action failed");
  return json;
}

function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (method: string, url: string, body?: unknown, okMsg?: string) => {
    setBusy(true);
    try {
      await call(method, url, body);
      if (okMsg) toast.success(okMsg);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(false); }
  };
  return { run, busy };
}

/* --------------------------------- users ---------------------------------- */

export function BanUserButton({ id, banned }: { id: string; banned: boolean }) {
  const { run, busy } = useAdminAction();
  return (
    <button
      className={`btn btn-sm ${banned ? "btn-outline" : "btn-danger"}`}
      disabled={busy}
      onClick={() => run("PATCH", `/api/admin/users/${id}`, { banned: !banned }, banned ? "User restored" : "User suspended")}
    >
      {banned ? <ShieldCheck size={13} /> : <ShieldOff size={13} />} {banned ? "Unban" : "Suspend"}
    </button>
  );
}

export function RoleSelect({ id, role }: { id: string; role: string }) {
  const { run } = useAdminAction();
  return (
    <GlassSelect
      className="select w-auto py-1 text-xs"
      value={role}
      onChange={(e) => run("PATCH", `/api/admin/users/${id}`, { role: e.target.value }, "Role updated")}
      aria-label="Role"
    >
      <option value="buyer">buyer</option>
      <option value="admin">admin</option>
    </GlassSelect>
  );
}

/* --------------------------------- sellers --------------------------------- */

export function SellerActions({ id, status }: { id: string; status: string }) {
  const { run, busy } = useAdminAction();
  if (status === "pending") {
    return (
      <div className="flex justify-end gap-1.5">
        <button className="btn btn-primary btn-sm" disabled={busy}
          onClick={() => run("PATCH", `/api/admin/sellers/${id}`, { status: "approved" }, "Seller approved")}>
          <Check size={13} /> Approve
        </button>
        <button className="btn btn-danger btn-sm" disabled={busy}
          onClick={() => run("PATCH", `/api/admin/sellers/${id}`, { status: "rejected" }, "Application rejected")}>
          <X size={13} /> Reject
        </button>
      </div>
    );
  }
  return (
    <div className="flex justify-end gap-1.5">
      {status !== "suspended" ? (
        <button className="btn btn-danger btn-sm" disabled={busy}
          onClick={() => run("PATCH", `/api/admin/sellers/${id}`, { status: "suspended" }, "Seller suspended")}>
          <ShieldOff size={13} /> Suspend
        </button>
      ) : (
        <button className="btn btn-outline btn-sm" disabled={busy}
          onClick={() => run("PATCH", `/api/admin/sellers/${id}`, { status: "approved" }, "Seller reinstated")}>
          <ShieldCheck size={13} /> Reinstate
        </button>
      )}
    </div>
  );
}

export function CommissionEditor({ id, value }: { id: string; value: number }) {
  const [v, setV] = useState(String(value));
  const { run, busy } = useAdminAction();
  return (
    <span className="inline-flex items-center gap-1">
      <input
        className="input w-16 px-2 py-1 text-xs"
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode="decimal"
        aria-label="Commission %"
      />
      <span className="text-xs text-faint">%</span>
      {Number(v) !== value && (
        <button className="btn btn-outline btn-sm !px-2" disabled={busy} aria-label="Save commission"
          onClick={() => run("PATCH", `/api/admin/sellers/${id}`, { commissionRate: Number(v) }, "Commission updated")}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
      )}
    </span>
  );
}

/* --------------------------------- products -------------------------------- */

export function ProductToggles({ id, active, featured }: { id: string; active: boolean; featured: boolean }) {
  const { run } = useAdminAction();
  return (
    <div className="flex justify-end gap-1.5">
      <button className="btn btn-ghost btn-sm" title={featured ? "Remove from featured" : "Feature on homepage"}
        onClick={() => run("PATCH", `/api/admin/products/${id}`, { featured: !featured }, featured ? "Unfeatured" : "Featured")}>
        <Star size={14} className={featured ? "fill-amber-400 text-amber-400" : "text-mute"} />
      </button>
      <button className="btn btn-ghost btn-sm" title={active ? "Hide product" : "Publish product"}
        onClick={() => run("PATCH", `/api/admin/products/${id}`, { active: !active }, active ? "Product hidden" : "Product live")}>
        {active ? <EyeOff size={14} className="text-rose-300" /> : <Eye size={14} className="text-mint" />}
      </button>
    </div>
  );
}

/* --------------------------------- coupons --------------------------------- */

export function CouponToggle({ id, active }: { id: string; active: boolean }) {
  const { run } = useAdminAction();
  return (
    <div className="flex justify-end gap-1.5">
      <button className="btn btn-outline btn-sm"
        onClick={() => run("PATCH", `/api/admin/coupons/${id}`, { active: !active }, active ? "Coupon disabled" : "Coupon enabled")}>
        <BadgePercent size={13} /> {active ? "Disable" : "Enable"}
      </button>
      <button className="btn btn-danger btn-sm"
        onClick={() => run("DELETE", `/api/admin/coupons/${id}`, undefined, "Coupon deleted")}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/* --------------------------------- payouts --------------------------------- */

export function PayoutActions({ id }: { id: string }) {
  const { run, busy } = useAdminAction();
  return (
    <div className="flex justify-end gap-1.5">
      <button className="btn btn-primary btn-sm" disabled={busy}
        onClick={() => run("PATCH", `/api/admin/payouts/${id}`, { status: "paid" }, "Payout marked paid")}>
        <Check size={13} /> Mark paid
      </button>
      <button className="btn btn-danger btn-sm" disabled={busy}
        onClick={() => run("PATCH", `/api/admin/payouts/${id}`, { status: "rejected" }, "Payout rejected — balance restored")}>
        <X size={13} /> Reject
      </button>
    </div>
  );
}

/* --------------------------------- refunds --------------------------------- */

export function RefundActions({ id }: { id: string }) {
  const { run, busy } = useAdminAction();
  return (
    <div className="flex justify-end gap-1.5">
      <button className="btn btn-primary btn-sm" disabled={busy}
        onClick={() => run("PATCH", `/api/admin/refunds/${id}`, { approve: true }, "Refund approved — keys revoked, ledger reversed")}>
        <Check size={13} /> Approve
      </button>
      <button className="btn btn-danger btn-sm" disabled={busy}
        onClick={() => run("PATCH", `/api/admin/refunds/${id}`, { approve: false }, "Refund rejected")}>
        <X size={13} /> Reject
      </button>
    </div>
  );
}

/* --------------------------------- generic --------------------------------- */

export function DeleteRowButton({ resource, id, label }: { resource: string; id: string; label: string }) {
  const { run, busy } = useAdminAction();
  return (
    <button className="btn btn-danger btn-sm" disabled={busy}
      onClick={() => {
        if (confirm(`Delete ${label}?`)) run("DELETE", `/api/admin/${resource}/${id}`, undefined, `${label} deleted`);
      }}>
      <Trash2 size={13} />
    </button>
  );
}
