import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sellerProfiles } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin, rateLimit } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";
import { getDefaultCommission, logAudit, notify } from "@/lib/ops";
import { slugify } from "@/lib/utils";

const Schema = z.object({
  storeName: z.string().min(3).max(40),
  about: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  if (!rateLimit(`seller-apply:${auth.user.id}`, 5)) return fail("Too many attempts.", 429);

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const existing = (await db.select().from(sellerProfiles)
    .where(eq(sellerProfiles.userId, auth.user.id)).limit(1))[0];

  if (existing) {
    if (existing.status === "pending") return fail("Your application is already under review.", 409);
    if (existing.status === "approved") return fail("You are already an approved seller.", 409);
    if (existing.status === "suspended") return fail("This seller account is suspended. Contact support.", 403);
    // rejected → allow re-application
    await db.update(sellerProfiles)
      .set({ status: "pending", storeName: data.storeName.trim(), about: data.about })
      .where(eq(sellerProfiles.id, existing.id));
    await notify({
      userId: auth.user.id, title: "Application re-submitted",
      body: "Our team will review your seller application shortly.", href: "/sell", type: "seller",
    });
    return ok({ status: "pending" });
  }

  let slug = slugify(data.storeName);
  let tries = 0;
  while ((await db.select({ id: sellerProfiles.id }).from(sellerProfiles).where(eq(sellerProfiles.slug, slug)).limit(1))[0]) {
    tries++;
    slug = `${slugify(data.storeName)}-${Math.random().toString(36).slice(2, 6)}`;
    if (tries > 5) return fail("Store name is taken — pick another.", 409);
  }

  const commissionRate = await getDefaultCommission();
  await db.insert(sellerProfiles).values({
    userId: auth.user.id, storeName: data.storeName.trim(), slug,
    about: data.about, status: "pending", commissionRate,
  });
  await notify({
    userId: auth.user.id, title: "Seller application received",
    body: "We verify store identity before listings go live. You'll get a notification once approved.",
    href: "/sell", type: "seller",
  });
  await logAudit({ actorId: auth.user.id, action: "seller.apply", entity: "seller_profile", meta: { storeName: data.storeName } });
  return ok({ status: "pending" }, { status: 201 });
}
