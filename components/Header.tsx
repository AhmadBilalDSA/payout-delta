"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import CorridorSwitcher from "@/components/CorridorSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import BaseCurrencySwitcher from "@/components/BaseCurrencySwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useHeaderDropdownActive } from "@/components/headerDropdownLayer";
import SearchTriggerButton from "@/components/nav/SearchTriggerButton";
import OmnibarModal from "@/components/search/OmnibarModal";

const GITHUB_URL = "https://github.com/AhmadBilalDSA/payout-delta";

/**
 * Pure utility header — no route navigation.
 *
 * Primary navigation is owned exclusively by the global `<Dock />`
 * (`components/dashboard/Dock.tsx`), so this bar deliberately carries NO route
 * links: the former centre region (Terminal, Invoice, Tax Ledger, Challengers)
 * was a duplicate of the Dock's left rail and has been removed. The Dock is the
 * single source of truth for "where can I go"; the Header is the single source
 * of truth for "how is this session configured".
 *
 * Two regions, both `shrink-0`, inside one `h-14` flex row:
 *
 *   1. BRAND     — `Δ PayoutDelta` wordmark → `/`, plus the corridor selector.
 *   2. UTILITIES — settlement-currency switcher, language switcher, trust
 *      indicator, theme toggle and the Open Data link.
 *
 * No region wraps (`whitespace-nowrap`) and neither may overlap, so horizontal
 * overflow stays structurally impossible: `shrink-0` on both sides plus
 * `justify-between` on the row. The switchers keep their own `relative` roots
 * so their absolute dropdown panels resolve against themselves.
 *
 * PHASE 2 — LAYER OWNERSHIP
 * `sticky top-0 z-40` puts this bar above the Dock's `z-30` stacking context, so
 * the bar can never be overlapped by the launcher. Because a positioned element
 * with a z-index owns a stacking context, the popovers it triggers cannot be
 * painted above a scrim rendered *next to* the header: the whole header would
 * paint as one z-40 layer. So the scrim and the panels are both lifted to
 * `document.body` (see `components/headerDropdownLayer.ts`) and the order there
 * is explicit — Dock z-30 < scrim z-60 < menu z-70 — which is what removes the
 * screenshot collisions between a wide corridor menu and the dock.
 */
export default function Header() {
  const { t } = useLanguage();
  const dropdownActive = useHeaderDropdownActive();

  return (
    <>
      <header className="w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-xl sticky top-0 z-40 h-14 flex items-center justify-between px-4 sm:px-6">
        {/* 1 — BRAND. `shrink-0` keeps the wordmark + corridor selector at their
            intrinsic width; the selector's own `relative` root means its absolute
            dropdown resolves against itself and is never clipped by this row. */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-neutral-100 hover:text-emerald-400 transition-colors"
          >
            <span aria-hidden="true" className="text-base font-medium leading-none">
              Δ
            </span>
            <span className="hidden whitespace-nowrap sm:inline">PayoutDelta</span>
          </Link>
          <div className="shrink-0">
            <CorridorSwitcher />
          </div>
        </div>

        {/* 2 — UTILITIES. `shrink-0` + `whitespace-nowrap` on every child; the
            trust indicator stays a compact pulsing pill at every width so the row
            never has to give ground. */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <span className="shrink-0">
            <SearchTriggerButton />
          </span>
          <span className="hidden shrink-0 sm:inline-flex">
            <BaseCurrencySwitcher />
          </span>
          <div className="shrink-0">
            <LanguageSwitcher />
          </div>
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-800/80 bg-neutral-900/60 px-2.5 py-1 font-mono text-[11px] text-neutral-400"
            title={t("clientSideBadge")}
          >
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            <span className="hidden lg:inline">{t("clientSideBadge")}</span>
          </span>
          <span className="shrink-0">
            <ThemeToggle />
          </span>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 dark:text-emerald-400 lg:inline-flex"
          >
            Open Data
            <span aria-hidden="true" className="ml-0.5 opacity-60">
              ↗
            </span>
          </Link>
        </div>
      </header>

      {/* Click-scrim. `aria-hidden` and inert by construction: dismissal is owned
          by each popover's own outside-pointerdown listener, so the scrim only
          has to darken the page behind the menu and make the overlap legible.
          Portalled to <body> so it clears the header's z-40 context. No mount
          guard is needed: `dropdownActive` is `false` on the server and on the
          first client paint, and a popover can only be opened by a click, so
          `document` always exists on any render that reaches the portal. */}
      {dropdownActive
        ? createPortal(
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            />,
            document.body
          )
        : null}
      <OmnibarModal />
    </>
  );
}