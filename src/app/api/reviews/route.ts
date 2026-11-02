import { z } from "zod";
import { ok, fail, parseJson, rateLimit } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";
import { BusinessError, createReview } from "@/lib/commerce";

const Schema = z.object({
  productId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  orderItemId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(800).optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  if (!rateLimit(`review:${auth.user.id}`, 10)) return fail("Too many reviews in a row — take a breath.", 429);

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  try {
    const review = await createReview(auth.user.id, data);
    return ok({ reviewId: review.id }, { status: 201 });
  } catch (e) {
    if (e instanceof BusinessError) return fail(e.message, 400);
    throw e;
  }
}
