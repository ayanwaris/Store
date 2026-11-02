import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sellerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, type SafeUser } from "./auth";
import { fail } from "./api";

type GuardOk<T extends object> = ({ ok: true } & T) | { ok: false; resp: NextResponse };

/** API guard: any logged-in user. */
export async function requireApiUser(): Promise<GuardOk<{ user: SafeUser }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, resp: fail("Authentication required.", 401) };
  return { ok: true, user };
}

/** API guard: approved seller (loads profile). */
export async function requireApiSeller(): Promise<GuardOk<{ user: SafeUser; sellerId: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, resp: fail("Authentication required.", 401) };
  const rows = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, user.id)).limit(1);
  const s = rows[0];
  if (!s || s.status !== "approved") return { ok: false, resp: fail("Approved seller account required.", 403) };
  return { ok: true, user, sellerId: s.id };
}

/** API guard: platform administrator. */
export async function requireApiAdmin(): Promise<GuardOk<{ user: SafeUser }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, resp: fail("Authentication required.", 401) };
  if (user.role !== "admin") return { ok: false, resp: fail("Administrator access required.", 403) };
  return { ok: true, user };
}
