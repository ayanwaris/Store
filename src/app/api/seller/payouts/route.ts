import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts, sellerProfiles } from "@/db/schema";
import { ok, fail, assertSameOrigin, rateLimit } from "@/lib/api";
import { requireApiSeller } from "@/lib/guards";
import { BusinessError, requestPayout } from "@/lib/commerce";

export async function GET() {
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;
  const [list, seller] = await Promise.all([
    db.select().from(payouts).where(eq(payouts.sellerId, auth.sellerId)).orderBy(desc(payouts.createdAt)),
    db.select().from(sellerProfiles).where(eq(sellerProfiles.id, auth.sellerId)).limit(1),
  ]);
  return ok({ payouts: list, balance: seller[0]?.balance ?? 0 });
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;
  if (!rateLimit(`payout:${auth.user.id}`, 5)) return fail("Too many requests.", 429);
  try {
    const payout = await requestPayout(auth.sellerId);
    return ok({ payoutId: payout.id, amount: payout.amount }, { status: 201 });
  } catch (e) {
    if (e instanceof BusinessError) return fail(e.message, 400);
    throw e;
  }
}
