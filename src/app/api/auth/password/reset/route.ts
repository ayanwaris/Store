import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { ok, fail, parseJson, rateLimit, getIp } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

const Schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(req: Request) {
  if (!rateLimit(`reset:${getIp(req)}`, 5)) return fail("Too many attempts.", 429);
  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const rows = await db.select().from(passwordResets)
    .where(and(
      eq(passwordResets.token, data.token),
      gt(passwordResets.expiresAt, new Date()),
      isNull(passwordResets.usedAt),
    ))
    .limit(1);
  const reset = rows[0];
  if (!reset) return fail("Reset link is invalid or expired.", 400);

  await db.update(users).set({ passwordHash: hashPassword(data.password) }).where(eq(users.id, reset.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));
  await db.delete(sessions).where(eq(sessions.userId, reset.userId)); // force re-login everywhere

  return ok({ reset: true });
}
