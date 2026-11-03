export type SP = Record<string, string | undefined>;

export const FILTER_KEYS = ["kind", "platform", "region", "genre"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const listOf = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Build `/path?…` from the current params + a patch. `page` is always reset; empty values are dropped. */
export function hrefWith(pathname: string, current: SP, patch: SP) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) {
    if (v && k !== "page") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Add/remove one value in a comma-separated filter; returns the new param value (undefined when empty). */
export function toggled(current: SP, key: FilterKey, value: string): string | undefined {
  const set = listOf(current[key]);
  const next = set.includes(value) ? set.filter((x) => x !== value) : [...set, value];
  return next.length ? next.join(",") : undefined;
}