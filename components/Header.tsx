import Link from "next/link";
import CorridorSwitcher from "@/components/CorridorSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

const GITHUB_URL = "https://github.com/AhmadBilalDSA/payout-delta";

/**
 * Frosted navigation header — Apple HIG. Sticky, backdrop-blurred, hairline-
 * bordered. The three global controls (persistent language switcher, currency
 * corridor selector, iOS theme toggle) are client islands; the rest stays
 * server-rendered so the static export keeps zero JS payload for nav links.
 * Every `next/link` href is server paths-based — basePath (`/payout-delta` in
 * production) is re-applied automatically on output and navigation.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/60">
      <nav
        aria-label="Primary"
        className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:gap-4 sm:px-6"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight text-slate-900 transition-opacity duration-200 ease-out hover:opacity-80 dark:text-white"
        >
          <span aria-hidden="true" className="text-base font-medium leading-none">
            Δ
          </span>
          <span className="truncate">PayoutDelta</span>
        </Link>

        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <CorridorSwitcher />
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/invoice/"
            className="hidden text-xs font-medium text-slate-600 transition-colors duration-200 ease-out hover:text-slate-900 sm:inline dark:text-white/70 dark:hover:text-white"
          >
            Invoice Studio
          </Link>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-xs font-medium text-slate-600 transition-colors duration-200 ease-out hover:text-slate-900 lg:inline dark:text-white/70 dark:hover:text-white"
          >
            Open dataset
            <span aria-hidden="true" className="ml-0.5 opacity-50">
              ↗
            </span>
          </Link>
          <Link
            href="/contact"
            className="hidden rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-neutral-800 md:inline sm:px-4 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            API Access
          </Link>
        </div>
      </nav>
    </header>
  );
}