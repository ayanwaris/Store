import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { ScrollText } from "lucide-react";

export default async function AdminLogs() {
  await requireAdmin();
  const rows = ((await db.execute(sql`
    select a.id, a.action, a.entity, a.entity_id as "entityId", a.meta, a.created_at as "createdAt",
           us.name as "actorName"
    from audit_logs a left join users us on us.id = a.actor_id
    order by a.created_at desc limit 200
  `)) as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return (
    <div>
      <h2 className="font-display text-xl font-bold">Audit log</h2>
      <p className="mt-0.5 text-sm text-faint">Every administrative action, immutable and timestamped.</p>
      <div className="card mt-5 overflow-hidden">
        <div className="p-3 sm:p-0">
<table className="table-x table-stack">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td data-label="When" className="whitespace-nowrap text-mute">{timeAgo(String(r.createdAt))}</td>
                <td data-label="Actor" className="text-mute">{String(r.actorName ?? "system")}</td>
                <td data-label="Action"><code className="chip border border-vio/25 bg-vio/5 font-mono text-[11px] text-vio">{String(r.action)}</code></td>
                <td data-label="Entity" className="text-xs text-mute">{String(r.entity ?? "")} {r.entityId ? `· ${String(r.entityId).slice(0, 8)}…` : ""}</td>
                <td data-full className="max-w-56 truncate font-mono text-[11px] text-faint">{r.meta ? JSON.stringify(r.meta) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td data-full colSpan={5} className="p-8 text-center">
                <ScrollText size={24} className="mx-auto text-faint" />
                <p className="mt-2 text-sm text-mute">No audit events yet.</p>
              </td></tr>
            )}
          </tbody>
        </table>
</div>
      </div>
    </div>
  );
}
