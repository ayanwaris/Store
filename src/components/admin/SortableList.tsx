"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type RenderArgs<T> = { item: T; index: number; controls: React.ReactNode };

/**
 * Dependency-free sortable list. Drag the grip with a mouse, or use the up/down buttons
 * (which also make it work on touch screens and with a keyboard).
 */
export default function SortableList<T extends { id: string }>({
  items, onReorder, render, disabled, className,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  render: (a: RenderArgs<T>) => React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const rows = useRef<Record<string, HTMLLIElement | null>>({});

  const move = (i: number, j: number) => {
    if (j < 0 || j >= items.length || i === j) return;
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(j, 0, x);
    onReorder(next);
  };

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <li
          key={item.id}
          ref={(el) => { rows.current[item.id] = el; }}
          onDragOver={(e) => { if (from === null) return; e.preventDefault(); setOver(index); }}
          onDrop={(e) => { e.preventDefault(); if (from !== null) move(from, index); setFrom(null); setOver(null); }}
          className={cn(
            "rounded-xl border border-line bg-card/70 transition",
            from === index && "opacity-40",
            over === index && from !== null && from !== index && "border-brand ring-2 ring-brand/30",
          )}
        >
          {render({
            item, index,
            controls: (
              <span className="flex shrink-0 items-center gap-0.5">
                <span
                  draggable={!disabled}
                  onDragStart={(e) => {
                    setFrom(index);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", item.id);
                    const el = rows.current[item.id];
                    if (el) e.dataTransfer.setDragImage(el, 16, 16);
                  }}
                  onDragEnd={() => { setFrom(null); setOver(null); }}
                  title="Drag to reorder"
                  aria-hidden="true"
                  className={cn("cursor-grab rounded-md p-1 text-faint hover:bg-white/4 hover:text-ink active:cursor-grabbing [@media(pointer:coarse)]:hidden", disabled && "pointer-events-none opacity-40")}
                >
                  <GripVertical size={16} />
                </span>
                <button type="button" className="btn btn-ghost btn-sm px-1.5" aria-label="Move up" disabled={disabled || index === 0} onClick={() => move(index, index - 1)}>
                  <ArrowUp size={13} />
                </button>
                <button type="button" className="btn btn-ghost btn-sm px-1.5" aria-label="Move down" disabled={disabled || index === items.length - 1} onClick={() => move(index, index + 1)}>
                  <ArrowDown size={13} />
                </button>
              </span>
            ),
          })}
        </li>
      ))}
    </ul>
  );
}
