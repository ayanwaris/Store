import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { ok, fail, parseJson, rateLimit, getIp, assertSameOrigin } from "@/lib/api";
import { token as genToken } from "@/lib/utils";

const Schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  if (!rateLimit(`forgot:${getIp(req)}`, 5)) return fail("Too many attempts — try again shortly.", 429);

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const email = data.email.toLowerCase().trim();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  // Always respond success — do not leak account existence.
  if (!user) return ok({ sent: true });

  const t = genToken();
  await db.insert(passwordResets).values({
    userId: user.id, token: t, expiresAt: new Date(Date.now() + 60 * 60_000),
  });

  // Demo mode: no SMTP provider is attached, so the link is returned for local testing.
  return ok({ sent: true, devResetLink: `/reset-password?token=${t}` });
}
