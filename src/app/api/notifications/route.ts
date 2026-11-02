import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ok } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, auth.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  return ok(rows);
}
