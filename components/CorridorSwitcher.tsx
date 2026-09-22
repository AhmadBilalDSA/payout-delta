"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useDismissable } from "@/components/useDismissable";
import { localizedCorridorHref } from "@/lib/localizedCorridors";
import rawFees from "@/data/fees.json";
import type { Corridor } from "@/lib/types";

/**
 * Phase 7 — global currency / corridor selector (client island).
 *
 * `[🌐 USD → PKR ▾]` capsule in the header that jumps straight to any of the
 * ten audited corridors' live calculation page. The row list mirrors the
 * dataset order defined in `data/fees.json` — the single source of truth for
 * slugs, currency codes and symbols. Selecting a corridor keeps the current
 * language prefix only when that `(lang, slug)` pair is authored, otherwise it
 * opens the English corridor page (see `localizedCorridorHref`). `next/link`
 * re-applies the `/payout-delta` production `basePath` on navigation.
 */

/** Dropdown order matches the audited-corridors list (dataset holds all 10). */
const CORRIDOR_ORDER = [
  "usd-to-pkr",
  "usd-to-inr",
  "usd-to-php",
  "usd-to-brl",
  "usd-to-eur",
  "usd-to-gbp",
  "usd-to-ngn",
  "usd-to-bdt",
  "usd-to-egp",
  "usd-to-zar",
] as const;

const corridorByOrder: Corridor[] = CORRIDOR_ORDER.map(
  (slug) => rawFees.corridors.find((corridor) => corridor.slug === slug)!,
).filter(Boolean);

/** Shown while not on a calculator page — the site's hero corridor. */
const FALLBACK_SLUG = "usd-to-pkr";

type Route = { lang: string; slug?: string };

function parseRoute(pathname: string): Route {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments[0] === "calculator" && segments[1]) {
    return { lang: "en", slug: segments[1] };
  }
  if (segments[1] === "calculator" && segments[2]) {
    return { lang: segments[0], slug: segments[2] };
  }
  return { lang: "en" };
}

export default function CorridorSwitcher() {
  const pathname = usePathname();
  const { open, setOpen, containerRef } = useDismissable();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  if (pathname === null) {
    return null;
  }

  const { lang, slug } = parseRoute(pathname);
  const current =
    corridorByOrder.find((corridor) => corridor.slug === slug) ??
    corridorByOrder.find((corridor) => corridor.slug === FALLBACK_SLUG)!;
  const isCorridorPage = slug !== undefined;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Currency corridor: USD to ${current.to}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 max-w-[8.5rem] items-center gap-1.5 rounded-full bg-black/[0.04] px-3 text-xs font-semibold text-slate-700 ring-1 ring-black/[0.06] transition-colors duration-200 ease-out hover:bg-black/[0.08] active:scale-[0.98] sm:max-w-none dark:bg-white/[0.06] dark:text-white/80 dark:ring-white/[0.1] dark:hover:bg-white/[0.12]"
      >
        <span aria-hidden="true" className="text-sm leading-none text-slate-500 dark:text-white/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <path d="M3 12h18" strokeLinecap="round" />
          </svg>
        </span>
        <span className="truncate tabular-nums">
          USD <span className="opacity-50">→</span> {current.to}
        </span>
        <span
          aria-hidden="true"
          className={`text-[9px] leading-none text-slate-400 transition-transform duration-200 ease-out dark:text-white/40 ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Currency corridor"
          className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right animate-[dropdown-in_130ms_ease-out] rounded-2xl bg-white/95 p-1.5 shadow-[var(--apple-glass-shadow)] ring-1 ring-black/[0.06] backdrop-blur-xl dark:bg-neutral-900/95 dark:ring-white/[0.1]"
        >
          <p
            aria-hidden="true"
            className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-white/40"
          >
            Audited corridors
          </p>
          <div className="max-h-[21rem] overflow-y-auto">
            {corridorByOrder.map((corridor) => {
              const active = isCorridorPage && corridor.slug === slug;
              return (
                <Link
                  key={corridor.slug}
                  href={localizedCorridorHref(lang, corridor.slug)}
                  role="menuitem"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-150 ease-out ${
                    active
                      ? "bg-black/[0.05] dark:bg-white/[0.08]"
                      : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] text-xs font-bold text-slate-600 dark:bg-white/[0.08] dark:text-white/60"
                  >
                    {corridor.currencySymbol}
                  </span>
                  <span className="min-w-0 flex-1 leading-none">
                    <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-white/90">
                      {corridor.country}
                    </span>
                    <span className="mt-0.5 block text-[11px] tabular-nums text-slate-400 dark:text-white/40">
                      {corridor.currencyName}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-white/70">
                    {corridor.to}
                  </span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}