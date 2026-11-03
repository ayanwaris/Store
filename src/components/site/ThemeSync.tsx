"use client";

import { useEffect } from "react";

/**
 * The theme itself is pure CSS (@media prefers-color-scheme), so first paint is always correct.
 * This tiny helper only adds a short-lived `theme-transition` class to <html> when the device
 * flips between light and dark while the page is open, so surfaces fade instead of snapping.
 * Skipped entirely for visitors who prefer reduced motion.
 */
export default function ThemeSync() {
  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let t: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      if (reduce.matches) return;
      const root = document.documentElement;
      root.classList.add("theme-transition");
      clearTimeout(t);
      t = setTimeout(() => root.classList.remove("theme-transition"), 600);
    };
    dark.addEventListener("change", onChange);
    return () => { dark.removeEventListener("change", onChange); clearTimeout(t); };
  }, []);
  return null;
}
