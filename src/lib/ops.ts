import "server-only";
import { db } from "@/db";
import { auditLogs, notifications, settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function notify(input: {
  userId: string;
  title: string;
  body?: string;
  href?: string;
  type?: string;
}) {
  await db.insert(notifications).values({
    userId: input.userId,
    title: input.title,
    body: input.body,
    href: input.href,
    type: input.type ?? "info",
  });
}

export async function logAudit(input: {
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    actorId: input.actorId ?? null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    meta: input.meta,
  });
}

const settingsCache = new Map<string, { value: unknown; at: number }>();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.at < 30_000) return cached.value as T;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  const value = rows[0] ? (rows[0].value as T) : fallback;
  settingsCache.set(key, { value, at: Date.now() });
  return value;
}

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  settingsCache.delete(key);
}

export interface FeeConfig {
  percent: number;
  fixed: number;
}

export async function getFeeConfig(): Promise<FeeConfig> {
  return getSetting<FeeConfig>("fees", { percent: 3, fixed: 0.49 });
}

export async function getDefaultCommission(): Promise<number> {
  return getSetting<number>("default_commission", 12);
}
