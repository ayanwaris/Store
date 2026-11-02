import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { cartItems, carts, offers } from "@/db/schema";
import { ok, fail, parseJson } from "@/lib/api";
import { CART_COOKIE } from "@/lib/auth";

async function ownedItem(itemId: string) {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ itemId: cartItems.id, qty: cartItems.quantity, stock: offers.stockCount })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .innerJoin(offers, eq(offers.id, cartItems.offerId))
    .where(and(eq(cartItems.id, itemId), eq(carts.token, token)))
    .limit(1);
  return rows[0] ?? null;
}

const PatchSchema = z.object({ quantity: z.number().int().min(0).max(99) });

export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const { data, resp } = await parseJson(req, PatchSchema);
  if (!data) return resp!;

  const item = await ownedItem(itemId);
  if (!item) return fail("Cart item not found.", 404);

  if (data.quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
  } else {
    const clamped = Math.min(data.quantity, Math.max(1, Math.min(item.stock, 10)));
    await db.update(cartItems).set({ quantity: clamped }).where(eq(cartItems.id, itemId));
  }
  return ok({ updated: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const item = await ownedItem(itemId);
  if (!item) return fail("Cart item not found.", 404);
  await db.delete(cartItems).where(eq(cartItems.id, itemId));
  return ok({ removed: true });
}
