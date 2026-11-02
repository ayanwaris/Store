import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";

export default async function AdminSettings() {
  await requireAdmin();
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return (
    <div className="max-w-xl">
      <h2 className="font-display text-xl font-bold">Platform settings</h2>
      <p className="mt-0.5 text-sm text-faint">Tunable marketplace economics. Changes apply instantly to new orders.</p>
      <div className="mt-5">
        <AdminSettingsForm
          fees={(map.fees as { percent: number; fixed: number }) ?? { percent: 3, fixed: 0.49 }}
          defaultCommission={Number(map.default_commission ?? 12)}
          supportEmail={String(map.support_email ?? "support@keyhaven.app")}
        />
      </div>
    </div>
  );
}
