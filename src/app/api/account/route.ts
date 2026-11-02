import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";
import { hashPassword, verifyPassword, SESSION_COOKIE } from "@/lib/auth";

const Schema = z.object({
  name: z.string().min(2).max(40).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

export async function PATCH(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  if (data.name) {
    await db.update(users).set({ name: data.name.trim() }).where(eq(users.id, auth.user.id));
  }

  if (data.currentPassword || data.newPassword) {
    if (!data.currentPassword || !data.newPassword) return fail("Both current and new password are required.", 422);
    const row = (await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1))[0]!;
    if (!verifyPassword(data.currentPassword, row.passwordHash)) {
      return fail("Current password is incorrect.", 403);
    }
    await db.update(users).set({ passwordHash: hashPassword(data.newPassword) }).where(eq(users.id, auth.user.id));
    // keep the current session, kill the rest
    const store = await cookies();
    const currentToken = store.get(SESSION_COOKIE)?.value;
    await db.delete(sessions).where(and(eq(sessions.userId, auth.user.id), ne(sessions.id, currentToken ?? "")));
  }

  if (!data.name && !data.newPassword) return fail("Nothing to update.", 422);
  return ok({ updated: true });
}
