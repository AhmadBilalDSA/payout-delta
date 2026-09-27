"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import { useDismissable } from "@/components/useDismissable";
import { useMenuAnchor } from "@/components/headerDropdownLayer";
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
 *
 * PHASE 2 — PANEL LAYER
 * The menu is portalled to `document.body` and pinned to the trigger's live
 * viewport rectangle (`useMenuAnchor`), so it can sit in the root stacking
 * context at `z-[70]` — above the Header's click-scrim (`z-[60]`), which is
 * itself above the Dock (`z-30`). Keeping it inside the header instead would
 * trap the whole header under one `z-40` layer and put the wide panel on a
 * collision course with the dock, and an `absolute` panel would scroll away
 * from its trigger the moment the page moves.
 */

/** Panel width on desktop, mirrored by the anchor clamp. */
const PANEL_WIDTH_PX = 480;

/** Inverse-status pill width (`w-64`), mirrored by its anchor clamp. */
const INVERSE_PILL_WIDTH_PX = 256;

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
  const { open, setOpen, containerRef, panelRef } = useDismissable();
  const {
    open: inverseOpen,
    setOpen: setInverseOpen,
    containerRef: inverseRef,
    panelRef: inversePanelRef,
  } = useDismissable();
  const anchor = useMenuAnchor(open, containerRef, PANEL_WIDTH_PX);
  const inverseAnchor = useMenuAnchor(
    inverseOpen,
    inverseRef,
    INVERSE_PILL_WIDTH_PX
  );

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
          className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 font-mono text-xs text-neutral-200 transition-all hover:border-emerald-500/50 hover:bg-neutral-900 active:scale-[0.98]"
        >
          <span aria-hidden="true" className="text-neutral-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="9" />
              <ellipse cx="12" cy="12" rx="4" ry="9" />
              <path d="M3 12h18" strokeLinecap="round" />
            </svg>
          </span>
          <span className="truncate font-semibold tracking-tight tabular-nums">
            {current.from} <span className="opacity-50">→</span> {current.to}
          </span>
          <span
            aria-hidden="true"
            className={`text-[9px] leading-none text-neutral-500 transition-transform duration-200 ease-out ${
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
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/80 text-xs font-bold text-neutral-300 transition-all hover:border-emerald-500/50 hover:bg-neutral-900 active:scale-[0.95]"
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
                className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/80 text-xs font-bold text-neutral-500 transition-all hover:border-emerald-500/50 hover:bg-neutral-900 active:scale-[0.95]"
              >
                ⇄
              </button>

              {/* Inverse-pair status pill (only when the swap is not available).
                  Portalled for the same reason as the corridor menu: it opens a
                  header-layer dropdown, so the click-scrim appears, and a panel
                  left inside the header's z-40 context would be painted under
                  the root-level z-60 scrim. */}
              {inverseOpen && typeof document !== "undefined"
                ? createPortal(
                    <div
                      ref={inversePanelRef}
                      role="status"
                      style={inverseAnchor
                        ? { left: `${inverseAnchor.left}px` }
                        : undefined}
                      className="fixed left-2 top-14 z-[70] mt-1 w-64 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-3 shadow-2xl backdrop-blur-2xl"
                    >
                      <p className="text-xs font-semibold leading-relaxed text-neutral-100">
                        {inverseLabel}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
                        This inverted pair isn’t audited yet — the dataset covers
                        USD into {current.to} today. Request it and it ships as a
                        full static route.
                      </p>
                      <a
                        href={NEW_CORRIDOR_ISSUE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] font-semibold text-emerald-400 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20"
                      >
                        Request {inverseLabel} on GitHub{" "}
                        <span aria-hidden="true">↗</span>
                      </a>
                    </div>,
                    document.body
                  )
                : null}
            </div>
          )
        ) : null}
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              aria-label="Currency corridor"
              style={anchor ? { left: `${anchor.left}px` } : undefined}
              className="fixed left-2 top-14 z-[70] mt-1 max-h-[75vh] w-[92vw] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950/98 p-3 shadow-2xl backdrop-blur-2xl sm:w-[480px]"
            >
              <p
                aria-hidden="true"
                className="px-1 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500"
              >
                Audited corridors
              </p>
              <div className="space-y-3">
                {corridorGroups.map((group) => (
                  <div key={group.label} role="group" aria-label={group.label}>
                    <p
                      aria-hidden="true"
                      className="px-1 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500"
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
                          className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors duration-150 ease-out ${
                            active
                              ? "border-emerald-500/30 bg-emerald-500/10"
                              : "border-transparent hover:border-neutral-800 hover:bg-neutral-900/70"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-xs font-bold text-neutral-300 ring-1 ring-neutral-800"
                          >
                            {corridor.currencySymbol}
                          </span>
                          <span className="min-w-0 flex-1 leading-none">
                            <span className="block truncate text-[13px] font-medium text-neutral-100">
                              {corridor.country}
                            </span>
                            <span className="mt-0.5 block text-[11px] tabular-nums text-neutral-500">
                              {corridor.currencyName}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums tracking-tight text-neutral-300">
                            {corridor.to}
                          </span>
                          {active && (
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}