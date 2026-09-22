"use client";

import { useState } from "react";

/**
 * Phase 7 — iOS-style sun/moon theme pill (client island).
 *
 * Writes `data-theme="dark"` on the `<html>` root — the selector every
 * `dark:` utility and the `:root`/`[data-theme="dark"]` token block in
 * globals.css key on — and mirrors the choice into localStorage so the
 * no-FOUC bootstrap script in `app/layout.tsx` re-applies it before paint on
 * the next visit.
 *
 * All visual states are expressed as *static* `dark:` classes (compiled to
 * `:where([data-theme="dark"], …)` selectors), never conditional strings, so
 * the server- and client-rendered markup are byte-identical and the pre-paint
 * attribute change is already reflected by the stylesheet — no flash, no
 * hydration mismatch.
 */

const STORAGE_KEY = "payoutdelta-theme";

function initialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const dark = theme === "dark";

  const toggle = () => {
    const next: "light" | "dark" = dark ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode / disabled cookies) — the
      // attribute toggle above already applied the theme for this session.
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      suppressHydrationWarning
      className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-black/[0.06] ring-1 ring-inset ring-black/[0.08] transition-colors duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:bg-white/[0.1] dark:ring-white/[0.16]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 opacity-100 transition-opacity duration-200 dark:opacity-40"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-3 w-3 text-amber-500"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-40 transition-opacity duration-200 dark:opacity-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3 w-3 text-indigo-300 dark:text-indigo-200"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 top-1/2 h-6 w-6 -translate-y-1/2 translate-x-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-out dark:translate-x-[22px]"
      />
    </button>
  );
}