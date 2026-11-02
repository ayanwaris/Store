import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, carts, cartItems, sellerProfiles } from "@/db/schema";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "kh_session";
export const CART_COOKIE = "kh_cart";
const SESSION_DAYS = 30;

export const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compareSync(pw, hash);

export type SafeUser = {
  id: string; name: string; email: string; role: string;
  avatarHue: number; emailVerified: boolean; createdAt: Date;
  sellerId?: string; sellerStatus?: string; storeName?: string;
};

export async function createSession(userId: string) {
  const id = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function destroySession(tokenId: string) {
  await db.delete(sessions).where(eq(sessions.id, tokenId));
}

export async function getSessionUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const tokenId = store.get(SESSION_COOKIE)?.value;
  if (!tokenId) return null;
  const rows = await db
    .select({ user: users, seller: sellerProfiles })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(sellerProfiles, eq(sellerProfiles.userId, users.id))
    .where(and(eq(sessions.id, tokenId), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || row.user.banned) return null;
  const u = row.user;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    avatarHue: u.avatarHue, emailVerified: u.emailVerified, createdAt: u.createdAt,
    sellerId: row.seller?.id, sellerStatus: row.seller?.status, storeName: row.seller?.storeName,
  };
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin() {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  if (u.role !== "admin") redirect("/");
  return u;
}

export async function requireSeller() {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  if (u.sellerStatus !== "approved") redirect("/sell");
  return { ...u, sellerId: u.sellerId! };
}

/** Merge an anonymous cart (by cookie token) into the user's cart on login/register. */
export async function mergeCartIntoUser(userId: string) {
  const store = await cookies();
  const cartToken = store.get(CART_COOKIE)?.value;
  if (!cartToken) return;
  const found = await db.select().from(carts).where(eq(carts.token, cartToken)).limit(1);
  if (!found[0]) return;
  await db.update(carts).set({ userId }).where(eq(carts.id, found[0].id));
}

/** Count items in the cookie cart for header badge (server components). */
export async function getCartCount() {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return 0;
  const rows = await db
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(eq(carts.token, token));
  return rows.reduce((acc, r) => acc + r.quantity, 0);
}
