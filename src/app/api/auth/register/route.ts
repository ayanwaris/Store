import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, fail, parseJson, rateLimit, getIp, assertSameOrigin } from "@/lib/api";
import { createSession, hashPassword, mergeCartIntoUser, SESSION_COOKIE } from "@/lib/auth";
import { notify } from "@/lib/ops";
import { resolveNext } from "@/lib/redirect";

const Schema = z.object({
  name: z.string().min(2, "Name too short").max(40),
  email: z.string().email().max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  // Optional post-registration destination. Never trusted: validated below, ignored if unsafe.
  next: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  if (!rateLimit(`register:${getIp(req)}`, 10)) return fail("Too many attempts — try again shortly.", 429);

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const email = data.email.toLowerCase().trim();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return fail("An account with this email already exists.", 409);

  const [user] = await db.insert(users).values({
    name: data.name.trim(),
    email,
    passwordHash: hashPassword(data.password),
    referralCode: `KEYH-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    avatarHue: Math.floor(Math.random() * 360),
  }).returning();

  await notify({
    userId: user.id,
    title: "Welcome to KeyHaven!",
    body: "Your vault is ready. Tip: WELCOME10 takes 10% off your first order over €5.",
    href: "/search?sort=popular",
    type: "welcome",
  });

  const { id, expiresAt } = await createSession(user.id);
  await mergeCartIntoUser(user.id);

  // Server-validated destination (falls back to the existing default "/" when missing or unsafe).
  const redirectTo = resolveNext(data.next);

  const res = ok({ user: { id: user.id, name: user.name, email: user.email }, redirectTo }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, id, {
    httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
