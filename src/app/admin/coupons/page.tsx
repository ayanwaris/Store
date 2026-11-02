import { desc } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { CouponToggle } from "@/components/admin/AdminActions";
import CouponCreateForm from "@/components/admin/CouponCreateForm";

export default async function AdminCoupons() {
  await requireAdmin();
  const rows = await db.select().from(coupons).orderBy(desc(coupons.id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Coupons</h2>
          <p className="mt-0.5 text-sm text-faint">Promo codes applied at cart/checkout.</p>
        </div>
        <CouponCreateForm />
      </div>
      <div className="card mt-5 overflow-x-auto">
        <table className="table-x min-w-[720px]">
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Min subtotal</th><th>Usage</th><th>Expires</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={!c.active ? "opacity-50" : ""}>
                <td><code className="chip border border-line bg-panel font-mono font-bold">{c.code}</code></td>
                <td className="font-semibold">{c.kind === "percent" ? `${c.value}%` : `€${c.value}`}</td>
                <td className="text-mute">€{c.minSubtotal}</td>
                <td className="text-mute">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td className="text-mute">{c.expiresAt ? formatDate(c.expiresAt) : "never"}</td>
                <td>
                  {c.active
                    ? <span className="chip border border-mint/25 bg-mint/5 text-[10px] text-mint">active</span>
                    : <span className="chip border border-line text-[10px] text-faint">disabled</span>}
                </td>
                <td className="text-right"><CouponToggle id={c.id} active={c.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
