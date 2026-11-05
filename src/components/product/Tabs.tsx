"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Tabs({ tabs }: { tabs: Array<{ id: string; label: string; content: ReactNode }> }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div role="tablist" className="no-scrollbar fade-r -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
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
