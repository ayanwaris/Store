import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { MarkAllReadButton } from "@/components/NotificationTools";
import { Bell } from "lucide-react";

export default async function NotificationsPage() {
  const user = await requireUser();
  const rows = await db.select().from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Notifications</h2>
          <p className="mt-0.5 text-sm text-faint">{rows.filter((r) => !r.read).length} unread</p>
        </div>
        <MarkAllReadButton />
      </div>
      {rows.length === 0 ? (
        <div className="card mt-5 flex flex-col items-center p-8 text-center sm:p-12">
          <Bell size={36} className="text-faint" />
          <p className="mt-3 font-semibold">Quiet in here</p>
          <p className="mt-1 text-sm text-mute">Order updates, sales alerts and seller messages will appear.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {rows.map((n) => (
            <Link
              key={n.id}
              href={n.href ?? "#"}
              className={`card block p-4 transition hover:border-brand/30 ${n.read ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{n.title}</p>
                <span className="flex items-center gap-2 text-[11px] text-faint">
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              {n.body && <p className="mt-1 text-sm text-mute">{n.body}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
