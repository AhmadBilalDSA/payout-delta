"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useDismissable } from "@/components/useDismissable";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { localizedCorridorHref } from "@/lib/localizedCorridors";
import rawFees from "@/data/fees.json";
import type { Corridor } from "@/lib/types";

/**
 * Phase 7 — global currency / corridor selector with quick-invert (client
 * island).
 *
 * `[🌐 USD → PKR ▾][⇄]` capsule set in the header that jumps straight to any
 * of the 50 audited corridors' live calculation page. The dropdown groups the
 * target currencies by receiving region (South Asia / Asia Pacific / East
 * Africa & EMEA / Latin America / Europe & UK / Central Asia & APAC) so
 * high-volume markets are reachable in one glance.
 *
 * The `⇄` quick-swap button inverts the active pair. When the inverted route
 * exists in the dataset (e.g. a genuine `pkr-to-usd` corridor) it navigates
 * straight there; otherwise a clear status pill explains the pair is not
 * audited yet and links to the structured corridor-request issue so the gap
 * is one click from being filled.
 *
 * All corridor metadata (slugs, currency codes, symbols) is derived from
 * `data/fees.json` — the single source of truth. Selecting a corridor keeps
 * the current language prefix only when that `(lang, slug)` pair is authored,
 * otherwise it opens the English corridor page (`localizedCorridorHref`).
 * `next/link` re-applies the `/payout-delta` production `basePath`.
 */

/**
 * Receiving-market regions for the grouped corridor dropdown. Currencies inside
 * a region keep the high-volume markets together; a region renders only when
 * the dataset actually contains at least one audited corridor for it.
 */
const REGIONS: { label: string; currencies: string[] }[] = [
  { label: "South Asia", currencies: ["PKR", "INR", "BDT", "NPR", "LKR"] },
  { label: "Asia Pacific", currencies: ["PHP", "VND", "IDR", "THB", "MYR", "SGD", "HKD"] },
  { label: "East Africa & EMEA", currencies: ["KES", "NGN", "EGP", "ZAR", "TRY", "GHS", "AED", "SAR", "IQD", "MAD", "TZS", "UGX", "RWF", "ZMW"] },
  { label: "Latin America", currencies: ["BRL", "COP", "MXN", "ARS", "CLP", "PEN", "UYU", "CRC"] },
  { label: "Europe & UK", currencies: ["EUR", "GBP", "PLN", "RON", "CZK", "UAH", "HUF", "BGN", "RSD", "SEK", "NOK", "DKK", "BAM", "GEL", "HRK"] },
  { label: "Central Asia & APAC", currencies: ["KZT"] },
];

const NEW_CORRIDOR_ISSUE_URL =
  "https://github.com/AhmadBilalDSA/payout-delta/issues/new?assignees=&labels=corridor-request%2Cenhancement&template=new_corridor.yml";

const corridorBySlug = new Map<string, Corridor>(
  rawFees.corridors.map((corridor) => [corridor.slug, corridor])
);

/** Regions mapped to their audited corridors (empty groups are skipped). */
const corridorGroups: { label: string; corridors: Corridor[] }[] = REGIONS.map(
  ({ label, currencies }) => ({
    label,
    corridors: rawFees.corridors.filter((corridor) =>
      currencies.includes(corridor.to)
    ),
  })
).filter((group) => group.corridors.length > 0);

/** Shown while not on a calculator page — the site's hero corridor. */
const FALLBACK_SLUG = "usd-to-pkr";

type Route = { slug?: string };

function parseRoute(pathname: string): Route {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments[0] === "calculator" && segments[1]) {
    return { slug: segments[1] };
  }
  if (segments[1] === "calculator" && segments[2]) {
    return { slug: segments[2] };
  }
  return {};
}

export default function CorridorSwitcher() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const { open, setOpen, containerRef } = useDismissable();
  const { open: inverseOpen, setOpen: setInverseOpen, containerRef: inverseRef } =
    useDismissable();

  useEffect(() => {
    setOpen(false);
    setInverseOpen(false);
  }, [pathname, setOpen, setInverseOpen]);

  if (pathname === null) {
    return null;
  }

  const { slug } = parseRoute(pathname);
  const current =
    corridorBySlug.get(slug ?? "") ??
    (slug !== undefined
      ? rawFees.corridors.find((corridor) => corridor.slug === slug)
      : undefined) ??
    corridorBySlug.get(FALLBACK_SLUG)!;
  const isCorridorPage = slug !== undefined && corridorBySlug.has(slug);

  // Quick-invert: `usd-to-pkr` ⇄ `pkr-to-usd`. Resolves when the inverted
  // corridor is actually audited; otherwise surfaces the status pill.
  const inverseSlug = `${current.from.toLowerCase()}-to-${current.to.toLowerCase()}`;
  const inverseCorridor = corridorBySlug.get(inverseSlug);
  const inverseLabel = `${current.to} → ${current.from}`;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Currency corridor: ${current.from} to ${current.to}`}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 max-w-[8.5rem] items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-xs font-semibold text-white/80 ring-1 ring-white/[0.1] transition-colors duration-200 ease-out hover:bg-white/[0.12] active:scale-[0.98] sm:max-w-none"
        >
          <span aria-hidden="true" className="text-sm leading-none text-white/50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="9" />
              <ellipse cx="12" cy="12" rx="4" ry="9" />
              <path d="M3 12h18" strokeLinecap="round" />
            </svg>
          </span>
          <span className="truncate tabular-nums">
            {current.from} <span className="opacity-50">→</span> {current.to}
          </span>
          <span
            aria-hidden="true"
            className={`text-[9px] leading-none text-white/40 transition-transform duration-200 ease-out ${
              open ? "rotate-180" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {/* Tactile quick-invert ⇄ — navigates to the inverted corridor when an
            audited route exists, otherwise reveals the "not audited" status
            pill so the gap is discoverable (and requestable) instead of a 404. */}
        {isCorridorPage ? (
          inverseCorridor ? (
            <Link
              href={localizedCorridorHref(lang, inverseSlug)}
              aria-label={`Swap to ${inverseLabel}`}
              title={`${inverseLabel} — audited, open it`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-white/70 ring-1 ring-white/[0.1] transition-colors duration-200 ease-out hover:bg-white/[0.12] active:scale-[0.95]"
            >
              ⇄
            </Link>
          ) : (
            <div ref={inverseRef} className="relative">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={inverseOpen}
                aria-label={`Swap to ${inverseLabel} — not audited yet`}
                title={`${inverseLabel} isn't audited yet`}
                onClick={() => setInverseOpen((value) => !value)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-white/40 ring-1 ring-white/[0.1] transition-colors duration-200 ease-out hover:bg-white/[0.12] active:scale-[0.95]"
              >
                ⇄
              </button>

              {/* Inverse-pair status pill (only when the swap is not available). */}
              {inverseOpen && (
                <div
                  role="status"
                  className="absolute right-0 top-full z-50 mt-2 w-64 animate-[dropdown-in_130ms_ease-out] rounded-2xl bg-white/95 p-3 shadow-[var(--apple-glass-shadow)] ring-1 ring-black/[0.06] backdrop-blur-xl dark:bg-neutral-900/95 dark:ring-white/[0.1]"
                >
                  <p className="text-xs font-semibold leading-relaxed text-slate-800 dark:text-white/90">
                    {inverseLabel}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-white/50">
                    This inverted pair isn’t audited yet — the dataset covers
                    USD into {current.to} today. Request it and it ships as a
                    full static route.
                  </p>
                  <a
                    href={NEW_CORRIDOR_ISSUE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-neutral-800 dark:bg-white dark:text-black"
                  >
                    Request {inverseLabel} on GitHub{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
            </div>
          )
        ) : null}
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Currency corridor"
          className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right animate-[dropdown-in_130ms_ease-out] rounded-2xl bg-white/95 p-1.5 shadow-[var(--apple-glass-shadow)] ring-1 ring-black/[0.06] backdrop-blur-xl dark:bg-neutral-900/95 dark:ring-white/[0.1]"
        >
          <p
            aria-hidden="true"
            className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-white/40"
          >
            Audited corridors
          </p>
          <div className="max-h-[24rem] overflow-y-auto">
            {corridorGroups.map((group) => (
              <div key={group.label} role="group" aria-label={group.label}>
                <p
                  aria-hidden="true"
                  className="sticky top-0 z-10 bg-white/95 px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 backdrop-blur-md dark:bg-neutral-900/95 dark:text-white/40"
                >
                  {group.label}
                </p>
                {group.corridors.map((corridor) => {
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}