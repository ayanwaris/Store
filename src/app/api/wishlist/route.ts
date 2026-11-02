import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, wishlists } from "@/db/schema";
import { ok, fail, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/guards";

const Schema = z.object({ productId: z.string().uuid() });

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  const rows = await db
    .select({
      productId: wishlists.productId, title: products.title, slug: products.slug,
      platform: products.platform, kind: products.kind, coverHue: products.coverHue,
      createdAt: wishlists.createdAt,
    })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, auth.user.id))
    .orderBy(desc(wishlists.createdAt));
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;
  await db.insert(wishlists).values({ userId: auth.user.id, productId: data.productId })
    .onConflictDoNothing();
  return ok({ wishlisted: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.resp;
  const { data, resp } = await parseJson(req, Schema);
  if (!data) return resp!;
  await db.delete(wishlists)
    .where(and(eq(wishlists.userId, auth.user.id), eq(wishlists.productId, data.productId)));
  return ok({ wishlisted: false });
}
