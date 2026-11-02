import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { formatDate, fmtEUR } from "@/lib/utils";
import { SellerActions } from "@/components/admin/AdminActions";

export default async function AdminSellers({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;

  const rows = ((await db.execute(sql`
    select sp.id, sp.store_name as "storeName", sp.slug, sp.status,
           sp.commission_rate::float8 as "commissionRate",
           sp.rating_avg::float8 as "ratingAvg", sp.rating_count as "ratingCount",
           sp.total_sales as "totalSales", sp.balance::float8 as balance,
           sp.created_at as "createdAt", us.email, us.name as "ownerName"
    from seller_profiles sp join users us on us.id = sp.user_id
    ${status ? sql`where sp.status = ${status}` : sql``}
    order by case sp.status when 'pending' then 0 else 1 end, sp.created_at desc limit 200
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  const filters = ["", "pending", "approved", "rejected", "suspended"];

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Sellers</h2>
      <p className="mt-0.5 text-sm text-faint">Approve applications, set commissions, suspend abuse.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <a key={f || "all"} href={f ? `/admin/sellers?status=${f}` : "/admin/sellers"}
            className={`chip border ${(status ?? "") === f ? "border-brand/50 bg-brand/10 text-brand-bright" : ""}`}>
            {f || "all"}
          </a>
        ))}
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="table-x min-w-[860px]">
          <thead>
            <tr><th>Store</th><th>Owner</th><th>Status</th><th>Commission</th><th>Rating</th><th>Sales</th><th>Balance</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>
                  <p className="font-semibold">{String(r.storeName)}</p>
                  <p className="text-xs text-faint">/store/{String(r.slug)} · since {formatDate(String(r.createdAt))}</p>
                </td>
                <td className="text-xs text-mute">{String(r.ownerName)}<br />{String(r.email)}</td>
                <td><StatusPill status={String(r.status)} /></td>
                <td>
                  <CommissionEditor id={String(r.id)} value={Number(r.commissionRate)} />
                </td>
                <td className="text-mint">{Number(r.ratingAvg).toFixed(1)}% <span className="text-faint">({String(r.ratingCount)})</span></td>
                <td className="text-mute">{String(r.totalSales)}</td>
                <td className="font-semibold">{fmtEUR(Number(r.balance))}</td>
                <td className="text-right">
                  <SellerActions id={String(r.id)} status={String(r.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { statusTone } from "@/lib/utils";
import { CommissionEditor } from "@/components/admin/AdminActions";

function StatusPill({ status }: { status: string }) {
  return <span className={`chip border text-[10px] ${statusTone(status)}`}>{status}</span>;
}
