import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { BanUserButton, RoleSelect } from "@/components/admin/AdminActions";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const { q } = await searchParams;

  const rows = ((await db.execute(sql`
    select us.id, us.name, us.email, us.role, us.banned, us.email_verified as "emailVerified",
           us.created_at as "createdAt", sp.status as "sellerStatus",
           (select count(*) from orders o where o.user_id = us.id)::int as "orderCount"
    from users us left join seller_profiles sp on sp.user_id = us.id
    ${q ? sql`where us.name ilike ${"%" + q + "%"} or us.email ilike ${"%" + q + "%"}` : sql``}
    order by us.created_at desc limit 200
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Users</h2>
          <p className="mt-0.5 text-sm text-faint">{rows.length} shown</p>
        </div>
        <form method="get" className="flex gap-2">
          <input name="q" className="input w-56" placeholder="Search name or email…" defaultValue={q ?? ""} />
          <button className="btn btn-outline">Search</button>
        </form>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="table-x min-w-[760px]">
          <thead>
            <tr><th>User</th><th>Role</th><th>Seller</th><th>Orders</th><th>Joined</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>
                  <p className="font-semibold">{String(r.name)}</p>
                  <p className="text-xs text-faint">{String(r.email)}</p>
                </td>
                <td>
                  {r.id === admin.id ? (
                    <span className="chip border border-vio/30 bg-vio/10 text-vio">admin (you)</span>
                  ) : (
                    <RoleSelect id={String(r.id)} role={String(r.role)} />
                  )}
                </td>
                <td className="text-xs text-mute">{r.sellerStatus ? String(r.sellerStatus) : "—"}</td>
                <td className="text-mute">{String(r.orderCount)}</td>
                <td className="text-mute">{formatDate(String(r.createdAt))}</td>
                <td>
                  {r.banned
                    ? <span className="chip border border-rose-400/30 bg-rose-400/10 text-[10px] text-rose-300">suspended</span>
                    : <span className="chip border border-mint/25 bg-mint/5 text-[10px] text-mint">active</span>}
                </td>
                <td className="text-right">
                  {r.id !== admin.id && <BanUserButton id={String(r.id)} banned={Boolean(r.banned)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
