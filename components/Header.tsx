"use client";

import Link from "next/link";
import CorridorSwitcher from "@/components/CorridorSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { useLanguage } from "@/components/providers/LanguageProvider";

const GITHUB_URL = "https://github.com/AhmadBilalDSA/payout-delta";

/**
 * Frosted navigation header — dark command stack. Sticky, backdrop-blurred,
 * hairline-bordered. Groups the three global controls (language, corridor,
 * theme) with the brand on the left and the trust cluster + API pill on the
 * right, so regional copy stays in one place. Invoice Studio navigates with
 * `next/link` — no hard refresh, so the wallet draft and any calculator sync
 * state survive the trip. Every `next/link` href is server paths-based —
 * `basePath` (`/payout-delta` in production) is re-applied automatically.
 */
export default function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-lg">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold tracking-tight text-white transition-opacity duration-200 ease-out hover:opacity-80"
          >
            <span aria-hidden="true" className="text-base font-medium leading-none">
              Δ
            </span>
            <span className="truncate">PayoutDelta</span>
          </Link>
          <span
            aria-hidden="true"
            className="hidden h-4 w-px bg-slate-700/60 sm:block"
          />
          <div className="flex items-center gap-2">
            <CorridorSwitcher />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <span
            aria-hidden="true"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/10 px-2.5 py-1 md:inline-flex"
            title={t("clientSideBadge")}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-400/90">
              {t("clientSideBadge")}
            </span>
          </span>
          <Link
            href="/"
            className="hidden text-xs text-slate-400 transition-colors duration-200 ease-out hover:text-slate-100 sm:inline"
          >
            {t("calculator")}
          </Link>
          <Link
            href="/invoice/"
            className="hidden text-xs text-slate-400 transition-colors duration-200 ease-out hover:text-slate-100 sm:inline"
          >
            {t("invoiceStudio")}
          </Link>
          <Link
            href="/tax-ledger/"
            className="hidden text-xs text-slate-400 transition-colors duration-200 ease-out hover:text-slate-100 sm:inline"
          >
            {t("taxLedger")}
          </Link>
          <Link
            href="/leaderboard/"
            className="hidden text-xs text-slate-400 transition-colors duration-200 ease-out hover:text-slate-100 sm:inline"
          >
            Leaderboard
          </Link>
          <Link
            href="/compare/"
            className="hidden text-xs text-slate-400 transition-colors duration-200 ease-out hover:text-slate-100 sm:inline"
          >
            {t("compare")}
          </Link>
          <Link
            href="/developers/"
            className="hidden text-xs text-slate-400 transition-colors duration-200 ease-out hover:text-slate-100 sm:inline"
          >
            {t("developers")}
          </Link>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-xs text-slate-400 transition-colors duration-200 ease-out hover:text-slate-100 lg:inline"
          >
            {t("openDataset")}
            <span aria-hidden="true" className="ml-0.5 opacity-50">
              ↗
            </span>
          </Link>
          <ThemeToggle />
          <Link
            href="/api-access/"
            className="hidden items-center whitespace-nowrap rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition-colors duration-200 ease-out hover:bg-slate-800 md:inline-flex"
          >
            {t("apiAccess")}
          </Link>
        </div>
      </nav>
    </header>
  );
}