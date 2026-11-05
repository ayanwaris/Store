"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { buildLoginUrl, buildRegisterUrl, locationToNext } from "@/lib/redirect";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  /** Which auth page this link opens. */
  to: "login" | "register";
};

/**
 * Where the visitor should land after authenticating, read from the live browser URL.
 * - On /login or /register the destination is whatever `next` they already carry, so switching
 *   between the two pages (or re-opening one) never loses it.
 * - Anywhere else it is the current page including its query string and #hash.
 * buildLoginUrl / buildRegisterUrl validate the result, so unsafe or auth-page values are dropped.
 */
function currentDestination(pathname: string | null): string {
  if (pathname === "/login" || pathname === "/register") {
    return new URLSearchParams(window.location.search).get("next") ?? "";
  }
  return locationToNext(window.location);
}

/**
 * A "Log in" / "Sign up" link that sends the visitor back to the page they were on.
 *
 * Rendering uses only the pathname (so the layout stays statically renderable — no
 * useSearchParams), which also serves open-in-new-tab / middle-click. A normal click uses the full
 * live URL (query + hash), because that is only reliably known in the browser at click time.
 */
export default function AuthLink({ to, onClick, ...rest }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const build = to === "login" ? buildLoginUrl : buildRegisterUrl;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Leave modified clicks (new tab / window / download) to the browser and the href below.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(build(currentDestination(pathname)));
  };

  return <Link {...rest} href={build(pathname)} onClick={handleClick} />;
}
