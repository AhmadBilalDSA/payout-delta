"use client";

import Link from "next/link";
import CorridorSwitcher from "@/components/CorridorSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import BaseCurrencySwitcher from "@/components/BaseCurrencySwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
 */
export default function Header() {
  const { t } = useLanguage();

  return (
    <header className="w-full border-b border-neutral-800/70 bg-neutral-950/80 backdrop-blur-xl sticky top-0 z-40 h-14 flex items-center justify-between px-4 sm:px-6">
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
  );
}