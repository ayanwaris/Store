import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ok } from "@/lib/api";

export async function GET() {
  const rows = await db.select().from(categories).orderBy(asc(categories.position));
  return ok(rows);
}
