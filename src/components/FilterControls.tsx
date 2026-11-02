"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { PLATFORMS, REGIONS, KINDS, KIND_LABEL } from "@/lib/utils";

type Props = {
  current: Record<string, string | undefined>;
  hideKinds?: boolean;
};

export default function FilterControls({ current, hideKinds }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [min, setMin] = useState(current.min ?? "");
  const [max, setMax] = useState(current.max ?? "");

  const apply = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...current, ...patch };
    for (const [k, v] of Object.entries(merged)) {
      if (v && k !== "page") params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="card flex flex-wrap items-center gap-2.5 p-3">
      {!hideKinds && (
        <select
          className="select w-auto text-sm"
          value={current.kind ?? ""}
          onChange={(e) => apply({ kind: e.target.value || undefined })}
          aria-label="Type"
        >
          <option value="">All types</option>
          {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
      )}
      <select
        className="select w-auto text-sm"
        value={current.platform ?? ""}
        onChange={(e) => apply({ platform: e.target.value || undefined })}
        aria-label="Platform"
      >
        <option value="">All platforms</option>
        {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select
        className="select w-auto text-sm"
        value={current.region ?? ""}
        onChange={(e) => apply({ region: e.target.value || undefined })}
        aria-label="Region"
      >
        <option value="">All regions</option>
        {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      <div className="flex items-center gap-1.5">
        <input className="input w-20 text-sm" placeholder="Min €" inputMode="decimal" value={min}
          onChange={(e) => setMin(e.target.value)} aria-label="Min price" />
        <span className="text-faint">–</span>
        <input className="input w-20 text-sm" placeholder="Max €" inputMode="decimal" value={max}
          onChange={(e) => setMax(e.target.value)} aria-label="Max price" />
        <button className="btn btn-outline btn-sm" onClick={() => apply({ min: min || undefined, max: max || undefined })}>
          Apply
        </button>
      </div>

      <div className="ml-auto">
        <select
          className="select w-auto text-sm"
          value={current.sort ?? "popular"}
          onChange={(e) => apply({ sort: e.target.value })}
          aria-label="Sort"
        >
          <option value="popular">Most popular</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
          <option value="rating">Best rated</option>
          <option value="discount">Biggest discount</option>
          <option value="newest">Newest</option>
        </select>
      </div>
    </div>
  );
}
