import { NextResponse, type NextRequest } from "next/server";

/**
 * Records the current path + query in a request header so server-side auth guards
 * (requireUser / requireAdmin / requireSeller in src/lib/auth.ts) know which page the visitor was
 * trying to open, and can send them back to it after login.
 *
 * - It only adds a header to the incoming request; it never redirects or blocks anything.
 * - The header is always overwritten here, so a client cannot choose its value through this path.
 *   The guard also re-validates it with sanitizeNext(), so a spoofed value could never be unsafe.
 * - The URL hash is not available on the server (browsers do not send it); hash-aware links are
 *   built on the client / in page components instead.
 *
 * NOTE: the header name must match CURRENT_URL_HEADER in src/lib/auth.ts.
 */
const CURRENT_URL_HEADER = "x-current-url";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Next.js adds an internal `_rsc` cache-busting param to client-side navigations; drop it.
  const params = new URLSearchParams(searchParams);
  params.delete("_rsc");
  const query = params.toString();

  const headers = new Headers(request.headers);
  headers.set(CURRENT_URL_HEADER, query ? `${pathname}?${query}` : pathname);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Pages only: skip API routes, Next.js internals and static files (anything with a file extension).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
