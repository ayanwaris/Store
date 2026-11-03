import { z } from "zod";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin, rateLimit, getIp } from "@/lib/api";
import { getNewsletterConfig } from "@/lib/site-data";

const Body = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address.")),
  source: z.enum(["home", "footer"]).default("home"),
  // honeypot: real visitors never fill this in, bots usually do
  website: z.string().max(0).optional(),
});

/**
 * Public newsletter sign-up.
 *  - validates the address, stores it lower-cased
 *  - duplicates are prevented by a unique index; a repeat sign-up still answers "success"
 *    so the endpoint can't be used to find out who is on the list
 *  - rate-limited per IP and same-origin only
 */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  if (!rateLimit(`newsletter:${getIp(req)}`, 8, 60_000)) return fail("Too many attempts — please try again in a minute.", 429);

  const cfg = await getNewsletterConfig();
  if (!cfg.enabled) return fail("Newsletter sign-up is currently unavailable.", 403);

  const { data, resp } = await parseJson(req, Body);
  if (!data) return resp!;

  await db.insert(newsletterSubscribers)
    .values({ email: data.email, source: data.source })
    .onConflictDoNothing({ target: newsletterSubscribers.email });

  return ok({ subscribed: true, message: cfg.successMessage }, { status: 201 });
}
