"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "kh-theme";
const EVENT = "kh-theme-change";

type Mode = "light" | "dark";

/** The theme currently on screen: the visitor's saved choice if any, otherwise the device setting. */
function current(): Mode {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // another tab changed it
  return () => {
    mq.removeEventListener("change", cb);
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Sun/Moon button. Until it is clicked the site follows the device's light/dark setting.
 * A click sets <html data-theme>, which the generated theme CSS (src/lib/theme.ts) turns into
 * the matching colours instantly — no reload — and saves the choice in localStorage; the inline
 * script in the root layout re-applies it before first paint on every page load.
 */
export default function ThemeToggle() {
  const mode = useSyncExternalStore<Mode>(subscribe, current, () => "light");

  const toggle = () => {
    const next: Mode = current() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("theme-transition"); // smooth fade (see globals.css)
      window.setTimeout(() => root.classList.remove("theme-transition"), 600);
    }
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* private mode: still works for this visit */ }
    window.dispatchEvent(new Event(EVENT));
  };

  const dark = mode === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost btn-sm relative px-2"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {/* both icons stay mounted so they can cross-fade */}
      <span className="relative block h-[18px] w-[18px]" suppressHydrationWarning>
        <Sun size={18} className={`absolute inset-0 transition duration-300 ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
        <Moon size={18} className={`absolute inset-0 transition duration-300 ${dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
      </span>
    </button>
  );
}
