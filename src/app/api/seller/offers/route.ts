import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventoryKeys, offers, products } from "@/db/schema";
import { ok, fail, parseJson, assertSameOrigin } from "@/lib/api";
import { requireApiSeller } from "@/lib/guards";
import { REGIONS } from "@/lib/utils";

export async function GET() {
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;
  const rows = await db
    .select({
      id: offers.id, price: offers.price, region: offers.region, active: offers.active,
      stockCount: offers.stockCount, soldCount: offers.soldCount, createdAt: offers.createdAt,
      productTitle: products.title, productSlug: products.slug, platform: products.platform,
      coverHue: products.coverHue, kind: products.kind, rrp: products.rrp,
    })
    .from(offers)
    .innerJoin(products, eq(products.id, offers.productId))
    .where(eq(offers.sellerId, auth.sellerId))
    .orderBy(desc(offers.createdAt));
  return ok(rows);
}

const Schema = z.object({
  productId: z.string().uuid(),
  price: z.number().min(0.49).max(5000),
  region: z.enum(REGIONS).default("GLOBAL"),
  keys: z.array(z.string()).max(500).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return fail("Forbidden", 403);
  const auth = await requireApiSeller();
  if (!auth.ok) return auth.resp;

  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;

  const product = (await db.select().from(products)
    .where(and(eq(products.id, data.productId), eq(products.active, true))).limit(1))[0];
  if (!product) return fail("Product not found (or inactive).", 404);

  const dup = await db.select({ id: offers.id }).from(offers)
    .where(and(eq(offers.productId, product.id), eq(offers.sellerId, auth.sellerId))).limit(1);
  if (dup[0]) return fail("You already have an offer for this product — edit it instead.", 409);

  const codes = [...new Set((data.keys ?? [])
    .map((k) => k.trim().toUpperCase())
    .filter((k) => k.length >= 5 && k.length <= 64))];

  const [offer] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(offers).values({
      productId: product.id, sellerId: auth.sellerId,
      price: data.price, region: data.region, stockCount: codes.length,
    }).returning();
    if (codes.length) {
      await tx.insert(inventoryKeys).values(
        codes.map((code) => ({ offerId: created.id, code, status: "available" as const })),
      );
    }
    return [created];
  });

  return ok({ offerId: offer.id }, { status: 201 });
}
