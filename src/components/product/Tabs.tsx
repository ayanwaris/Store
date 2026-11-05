"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* The URL hash (e.g. "#reviews") is external state, so it is read with useSyncExternalStore:
   the server renders with "" (first tab), then the browser re-renders with the real hash. */
function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const getHash = () => window.location.hash;
const getServerHash = () => "";

export default function Tabs({ tabs }: { tabs: Array<{ id: string; label: string; content: ReactNode }> }) {
  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  // A tab the visitor clicked. It is remembered together with the hash it was clicked under, so a
  // later hash change (e.g. returning from login with "#reviews") takes over again.
  const [picked, setPicked] = useState<{ id: string; hash: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const hashTabId = tabs.find((t) => hash.slice(1).toLowerCase() === t.id.toLowerCase())?.id;
  const active = (picked && picked.hash === hash ? picked.id : undefined) ?? hashTabId ?? tabs[0]?.id;

  // When the URL names a tab (e.g. /product/x#reviews after login), bring that section into view.
  // Deferred a frame so it runs after the router's own scroll handling for the navigation.
  useEffect(() => {
    if (!hashTabId) return;
    const frame = requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [hashTabId, hash]);

  return (
    <div ref={rootRef} className="scroll-mt-36">
      <div role="tablist" className="no-scrollbar fade-r -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setPicked({ id: t.id, hash })}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition sm:px-4 sm:py-2.5",
              active === t.id ? "text-brand-bright" : "text-mute hover:text-ink",
            )}
          >
            {t.label}
            {active === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
            )}
          </button>
        ))}
      </div>
      <div className="py-6">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  );
}
