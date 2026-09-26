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
 *
 * ── Anti-collision contract (laptops + tablets) ────────────────────────────
 * The bar is exactly four flex regions inside one `w-full max-w-7xl` row, and
 * only ONE of them is allowed to give ground:
 *
 *   1. BRAND        `shrink-0` — logo + corridor switcher + language capsule.
 *   2. CENTER LINKS `hidden lg:flex … shrink min-w-0 overflow-hidden` — the
 *      only elastic region. It is hidden outright below `lg`, and because it
 *      clips, the last redundant link is what degrades on a 1024px laptop
 *      instead of the currency trigger or the trust pill colliding with it.
 *   3. TRUST PILL   dot always, copy from `xl` up — icon-only below `md`, so
 *      it can never crowd the corridor capsule on a phone in portrait.
 *   4. UTILITIES    `shrink-0` — Open Data, theme toggle, API access.
 *
 * No region wraps (`whitespace-nowrap` everywhere) and no region is allowed to
 * overlap: `shrink-0` on 1/4 plus `overflow-hidden` on 2 makes horizontal
 * overflow structurally impossible at any width.
 */
export default function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-lg">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        {/* 1 — BRAND. shrink-0 keeps the corridor capsule at its intrinsic
            width; both switchers are `relative` roots, so their absolute
            dropdown panels resolve against themselves and are never clipped
            by this row (no `overflow-hidden` anywhere on the brand side). */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold tracking-tight text-white transition-opacity duration-200 ease-out hover:opacity-80"
          >
            <span aria-hidden="true" className="text-base font-medium leading-none">
              Δ
            </span>
            <span className="truncate">PayoutDelta</span>
          </Link>
          <span
            aria-hidden="true"
            className="hidden h-4 w-px shrink-0 bg-slate-700/60 sm:block"
          />
          <div className="flex shrink-0 items-center gap-2">
            {/* Currency switcher: its own shrink-0 shell so the USD → PKR capsule
                keeps its intrinsic width (and its own `max-w-[8.5rem]` cap on a
                375px phone) and never collides with the right-hand cluster, and
                its absolute dropdown menu still resolves against the switcher's
                own `relative` wrapper. */}
            <div className="shrink-0">
              <CorridorSwitcher />
            </div>
            {/* Language capsule is the one brand control that yields on a
                phone: it is the widest of the two and the least urgent. */}
            <div className="hidden shrink-0 sm:block">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* 2 — CENTER LINKS. The only elastic region: hidden below `lg`, and
            `overflow-hidden` means a tight laptop clips the trailing
            secondary link rather than letting any two regions overlap. */}
        <div
          className="hidden min-w-0 shrink items-center gap-4 overflow-hidden text-xs font-mono text-slate-400 lg:flex xl:gap-5"
        >
          <Link
            href="/"
            className="whitespace-nowrap transition-colors duration-200 ease-out hover:text-slate-100"
          >
            {t("calculator")}
          </Link>
          <Link
            href="/invoice/"
            className="whitespace-nowrap transition-colors duration-200 ease-out hover:text-slate-100"
          >
            {t("invoiceStudio")}
          </Link>
          <Link
            href="/tax-ledger/"
            className="whitespace-nowrap transition-colors duration-200 ease-out hover:text-slate-100"
          >
            {t("taxLedger")}
          </Link>
          <Link
            href="/dashboard/"
            className="whitespace-nowrap transition-colors duration-200 ease-out hover:text-slate-100"
          >
            Terminal
          </Link>
          {/* Secondary pair: only once the `xl` breakpoint hands the row enough
              room, and yielded again at `2xl` where the two utility pills below
              claim the same fixed pixels inside the capped max-w-7xl container. */}
          <span className="hidden shrink-0 items-center gap-5 xl:inline-flex 2xl:hidden">
            <Link
              href="/banks/"
              className="whitespace-nowrap transition-colors duration-200 ease-out hover:text-slate-100"
            >
              {t("banks")}
            </Link>
            <Link
              href="/challengers/"
              className="whitespace-nowrap transition-colors duration-200 ease-out hover:text-slate-100"
            >
              {t("challengers")}
            </Link>
          </span>
        </div>

        {/* 3 + 4 — TRUST + UTILITIES. shrink-0, `whitespace-nowrap` on every
            child, and the pill degrades to its status dot below `xl`. */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-1 xl:px-2.5"
            title={t("clientSideBadge")}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="hidden text-xs font-medium text-emerald-400/90 xl:inline">
              {t("clientSideBadge")}
            </span>
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
          <span className="shrink-0">
            <ThemeToggle />
          </span>
          <Link
            href="/api-access/"
            className="hidden shrink-0 items-center whitespace-nowrap rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition-colors duration-200 ease-out hover:bg-slate-800 2xl:inline-flex"
          >
            {t("apiAccess")}
          </Link>
        </div>
      </nav>
    </header>
  );
}