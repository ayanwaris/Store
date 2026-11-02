"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Tabs({ tabs }: { tabs: Array<{ id: string; label: string; content: ReactNode }> }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-semibold transition",
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
