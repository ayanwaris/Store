import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { cartItems, carts, offers, products } from "@/db/schema";
import { ok, fail, parseJson } from "@/lib/api";
import { CART_COOKIE, getSessionUser } from "@/lib/auth";
import { getCartItems } from "@/lib/commerce";

const CART_COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 90 };

export async function GET() {
  const store = await cookies();
  const items = await getCartItems(store.get(CART_COOKIE)?.value);
  return ok({ items, count: items.reduce((a, i) => a + i.quantity, 0) });
}

const AddSchema = z.object({
  offerId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function POST(req: Request) {
  const { data, resp } = await parseJson(req, AddSchema);
  if (!data) return resp!;

  const store = await cookies();
  const user = await getSessionUser();
  let token = store.get(CART_COOKIE)?.value;

  const rows = await db
    .select({ offer: offers, productActive: products.active })
    .from(offers)
    .innerJoin(products, eq(products.id, offers.productId))
    .where(eq(offers.id, data.offerId))
    .limit(1);
  const row = rows[0];
  if (!row || !row.offer.active || !row.productActive) return fail("This offer is no longer available.", 404);
  if (row.offer.stockCount < 1) return fail("This offer is out of stock.", 409);

  if (!token) token = crypto.randomUUID();
  await db.insert(carts).values({ token, userId: user?.id ?? null })
    .onConflictDoNothing({ target: carts.token });
  const cart = (await db.select().from(carts).where(eq(carts.token, token)).limit(1))[0]!;

  const allowed = Math.min(row.offer.stockCount, 10);
  await db.insert(cartItems)
    .values({ cartId: cart.id, offerId: data.offerId, quantity: Math.min(data.quantity, allowed) })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.offerId],
      set: { quantity: sql`least(${cartItems.quantity} + ${data.quantity}, ${allowed})` },
    });
  await db.execute(sql`update carts set updated_at = now() where id = ${cart.id}`);

  const items = await getCartItems(token);
  const res = ok({ added: true, count: items.reduce((a, i) => a + i.quantity, 0) });
  res.cookies.set(CART_COOKIE, token, CART_COOKIE_OPTS);
  return res;
}
