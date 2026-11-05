/**
 * Post-login redirect helpers.
 *
 * Pure functions with no server-only or browser-only imports, so the exact same validation runs
 * in API routes, server components and client components.
 *
 * The destination travels in the `?next=` query parameter. A URL hash (e.g. `#reviews`) is kept by
 * encoding it *inside* the `next` value, because browsers never send hashes to the server.
 */

/** Where users land when there is no valid destination (the existing default behaviour). */
export const DEFAULT_REDIRECT = "/";

/** Auth pages that can carry a destination. */
export type AuthPath = "/login" | "/register";

const MAX_NEXT_LENGTH = 2000;

/**
 * Destinations we never return to: auth pages (would cause loops), API routes (not pages)
 * and Next.js internals. Matched on whole path segments, case-insensitively.
 */
const BLOCKED_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api",
  "/_next",
];

// eslint-disable-next-line no-control-regex
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

function isBlockedPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return BLOCKED_PREFIXES.some((b) => p === b || p.startsWith(`${b}/`));
}

/** Percent-decode up to twice, to catch double-encoded tricks like `/%252f/evil.com`. */
function decodeLayers(value: string): string[] {
  const layers = [value];
  let current = value;
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      layers.push(decoded);
      current = decoded;
    } catch {
      // Malformed percent-encoding: treat the whole value as unsafe.
      layers.push("\\");
      break;
    }
  }
  return layers;
}

/**
 * Validate a user/frontend-supplied redirect destination.
 *
 * Returns a safe, same-site path (`/pathname?query#hash`) or `null` if the value must be rejected.
 * Never returns an absolute URL, a protocol-relative URL, or an auth/API path.
 */
export function sanitizeNext(raw: unknown): string | null {
  // Next.js searchParams may be string | string[] | undefined — use the first value.
  const input = Array.isArray(raw) ? raw[0] : raw;
  if (typeof input !== "string") return null;

  const value = input.trim();
  if (!value || value.length > MAX_NEXT_LENGTH) return null;

  // Must be a root-relative path: "/x" — not "x", "//host", "/\host", "https:", "javascript:".
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  // Reject control characters (tab/newline are stripped by URL parsers, enabling bypasses) and
  // backslashes (browsers treat "\" like "/"), in the raw value and in decoded forms.
  for (const layer of decodeLayers(value)) {
    if (CONTROL_OR_BACKSLASH.test(layer)) return null;
    if (layer.startsWith("//")) return null;
  }

  // Normalise with the URL parser against a throwaway origin; anything that escapes it is rejected.
  const BASE = "http://internal.invalid";
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;

  // Dot-segments can *create* a protocol-relative path: "/.//evil.com" normalises to "//evil.com".
  if (url.pathname.startsWith("//")) return null;

  if (isBlockedPath(url.pathname)) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** A validated destination, or the default if there is none / it is unsafe. */
export function resolveNext(raw: unknown): string {
  return sanitizeNext(raw) ?? DEFAULT_REDIRECT;
}

/**
 * Build `/login` or `/register`, carrying the destination when it is valid.
 * With no (or an invalid) destination the plain path is returned, so default behaviour is unchanged.
 */
export function buildAuthUrl(path: AuthPath, next?: unknown): string {
  const safe = sanitizeNext(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}

export const buildLoginUrl = (next?: unknown) => buildAuthUrl("/login", next);
export const buildRegisterUrl = (next?: unknown) => buildAuthUrl("/register", next);

/** Turn a browser/Next location into a `next` candidate (includes the hash when present). */
export function locationToNext(loc: { pathname: string; search?: string; hash?: string }): string {
  return `${loc.pathname}${loc.search ?? ""}${loc.hash ?? ""}`;
}
