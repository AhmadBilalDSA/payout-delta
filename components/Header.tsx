"use client";

import { createPortal } from "react-dom";
import { TransitionLink as Link } from "@/components/nav/TransitionLink";
import CorridorSwitcher from "@/components/CorridorSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import BaseCurrencySwitcher from "@/components/BaseCurrencySwitcher";
import { useHeaderDropdownActive } from "@/components/headerDropdownLayer";
import SearchTriggerButton from "@/components/nav/SearchTriggerButton";
import OmnibarModal from "@/components/search/OmnibarModal";

const GITHUB_URL = "https://github.com/AhmadBilalDSA/payout-delta";

/**
 * Minimalist institutional header.
 *
 * Two regions inside one h-14 flex row:
 *   1. BRAND — Δ PayoutDelta wordmark + corridor quick search (⌘K).
 *   2. UTILITIES — theme toggle + base-currency switcher + GitHub source link.
 *
 * Advisory / client-side-badge removed; they belonged to a previous design.
 */
export default function Header() {
  const dropdownActive = useHeaderDropdownActive();

  return (
    <>
      <header className="w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-xl sticky top-0 z-40 h-14 flex items-center justify-between px-4 sm:px-6 [view-transition-name:site-header]">
        {/* 1 — BRAND + corridor search trigger */}
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

        {/* 2 — UTILITIES */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <span className="shrink-0">
            <SearchTriggerButton />
          </span>
          <span className="hidden shrink-0 sm:inline-flex">
            <BaseCurrencySwitcher />
          </span>
          <span className="shrink-0">
            <ThemeToggle />
          </span>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/60 px-2.5 py-1.5 text-[11px] font-mono text-neutral-300 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Source
          </Link>
        </div>
      </header>

      {/* Click-scrim — portalled to <body> so it clears the header's z-40 context. */}
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