import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ok } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";

export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  await db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, auth.user.id));
  return ok({ read: true });
}
