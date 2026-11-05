"use client";

import {
  Children, Fragment, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GlassSelect — drop-in replacement for the native <select>.
 *
 * The native dropdown list is drawn by the browser/OS, so it can never follow the site theme.
 * This component renders its own frosted-glass menu that uses the same --kh-* theme variables
 * (and the Admin → Site & theme "Glass intensity" slider) as .card / .glass.
 *
 * Usage is identical to <select>:
 *   <GlassSelect className="select w-auto text-sm" value={v} onChange={(e) => set(e.target.value)} aria-label="Sort">
 *     <option value="a">A</option>
 *   </GlassSelect>
 */

type Opt = { value: string; label: string; disabled: boolean };

export type GlassSelectChangeEvent = {
  target: { value: string };
  currentTarget: { value: string };
  stopPropagation: () => void;
  preventDefault: () => void;
};

type Props = {
  value?: string | number;
  onChange?: (e: GlassSelectChangeEvent) => void;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

function collect(children: ReactNode, out: Opt[] = []): Opt[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
    if (el.type === Fragment) { collect(el.props.children, out); return; }
    if (el.type === "option") {
      const label = textOf(el.props.children);
      out.push({ value: el.props.value != null ? String(el.props.value) : label, label, disabled: !!el.props.disabled });
    }
  });
  return out;
}

export default function GlassSelect({
  value, onChange, onClick, className, children, disabled, id, "aria-label": ariaLabel,
}: Props) {
  const options = useMemo(() => collect(children), [children]);
  const current = value == null ? "" : String(value);
  const selectedIdx = options.findIndex((o) => o.value === current);
  const shown = options[selectedIdx] ?? options[0]; // native <select> shows the first option when nothing matches

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; minWidth: number; maxHeight: number; up: boolean } | null>(null);
  const [sheet, setSheet] = useState(false); // phones: open as a bottom sheet instead of a floating menu
  const sheetRef = useRef(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el || sheetRef.current) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const below = window.innerHeight - r.bottom - gap - 12;
    const above = r.top - gap - 12;
    const up = below < 180 && above > below;
    const maxHeight = Math.max(140, Math.min(320, up ? above : below));
    const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - Math.max(r.width, 180) - 8));
    setPos({ left, top: up ? r.top - gap : r.bottom + gap, minWidth: r.width, maxHeight, up });
  }, []);

  const openMenu = () => {
    if (disabled || !options.length) return;
    setActive(selectedIdx >= 0 ? selectedIdx : 0);
    const asSheet = window.innerWidth < 640;
    sheetRef.current = asSheet;
    setSheet(asSheet);
    if (!asSheet) place();
    setOpen(true);
  };
  const closeMenu = useCallback(() => setOpen(false), []);

  const choose = (opt: Opt) => {
    if (opt.disabled) return;
    closeMenu();
    triggerRef.current?.focus();
    if (opt.value !== current) {
      onChange?.({
        target: { value: opt.value }, currentTarget: { value: opt.value },
        stopPropagation: () => {}, preventDefault: () => {},
      });
    }
  };

  // keep the menu glued to the trigger; close on outside press / Escape
  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      // the sheet's dark backdrop closes on its own click (so the tap can't fall through to what's underneath)
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t) || t === backdropRef.current) return;
      closeMenu();
    };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place, closeMenu]);

  // while the bottom sheet is open the page behind it must not scroll
  useEffect(() => {
    if (!open || !sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, sheet]);

  // scroll the highlighted row into view
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, pos]);

  const move = (dir: 1 | -1) => {
    if (!options.length) return;
    let i = active;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.stopPropagation();
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); move(1); break;
      case "ArrowUp": e.preventDefault(); move(-1); break;
      case "Home": e.preventDefault(); setActive(0); break;
      case "End": e.preventDefault(); setActive(options.length - 1); break;
      case "Enter": case " ": e.preventDefault(); if (options[active]) choose(options[active]); break;
      case "Tab": closeMenu(); break;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        data-open={open || undefined}
        className={cn("glass-select-trigger", className, disabled && "opacity-60 cursor-not-allowed")}
        onClick={(e) => { onClick?.(e); if (open) closeMenu(); else openMenu(); }}
        onKeyDown={onKeyDown}
      >
        <span className="truncate">{shown?.label ?? ""}</span>
        <ChevronDown size={15} className={cn("glass-select-chevron shrink-0", open && "rotate-180")} aria-hidden />
      </div>

      {open && (pos || sheet) && typeof document !== "undefined" && createPortal(
        <>
        {sheet && (
          <div
            ref={backdropRef}
            className="glass-select-backdrop"
            onClick={(e) => { e.stopPropagation(); closeMenu(); }}
          />
        )}
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn("popover glass-select-menu", sheet ? "glass-select-sheet" : pos?.up && "glass-select-menu-up")}
          style={!sheet && pos ? { left: pos.left, top: pos.top, minWidth: pos.minWidth, maxHeight: pos.maxHeight } : undefined}
          // React events bubble through portals — keep clicks from reaching a parent button/row
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((o, i) => {
            const selected = i === (selectedIdx >= 0 ? selectedIdx : 0);
            return (
              <div
                key={`${o.value}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={selected}
                aria-disabled={o.disabled || undefined}
                data-active={i === active || undefined}
                data-selected={selected || undefined}
                className="glass-select-option"
                onPointerEnter={() => !o.disabled && setActive(i)}
                onClick={() => choose(o)}
              >
                <span className="truncate">{o.label}</span>
                {selected && <span className="glass-select-tick"><Check size={14} aria-hidden /></span>}
              </div>
            );
          })}
        </div>
        </>,
        document.body,
      )}
    </>
  );
}
