import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, fail, parseJson, rateLimit, getIp, assertSameOrigin } from "@/lib/api";
import { createSession, mergeCartIntoUser, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { resolveNext } from "@/lib/redirect";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // Optional post-login destination. Never trusted: it is validated below and ignored if unsafe.
  next: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  if (!rateLimit(`login:${getIp(req)}`, 10)) return fail("Too many attempts — try again shortly.", 429);

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const email = data.email.toLowerCase().trim();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(data.password, user.passwordHash)) {
    return fail("Invalid email or password.", 401);
  }
  if (user.banned) return fail("This account is suspended. Contact support.", 403);

  const { id, expiresAt } = await createSession(user.id);
  await mergeCartIntoUser(user.id);

  // Server-validated destination (falls back to the existing default "/" when missing or unsafe).
  const redirectTo = resolveNext(data.next);

  const res = ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, redirectTo });
  res.cookies.set(SESSION_COOKIE, id, {
    httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
