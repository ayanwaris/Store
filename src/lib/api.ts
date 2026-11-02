import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function parseJson<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ data?: T; resp?: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { resp: fail("Invalid JSON body", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { resp: fail(`${issue?.path.join(".") || "body"}: ${issue?.message ?? "invalid input"}`, 422) };
  }
  return { data: parsed.data };
}

/* ------------------------------ rate limiting ------------------------------ */

const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

export function getIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
}

/** Reject cross-site POSTs that don't come from our own origin (CSRF hardening). */
export function assertSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // curl / server-to-server
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
