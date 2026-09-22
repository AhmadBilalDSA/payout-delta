import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const GITHUB_URL = "https://github.com/AhmadBilalDSA/payout-delta";

/**
 * Frosted navigation header — Apple HIG, zero-JS server component.
 * Sticky, backdrop-blurred, hairline-bordered; ships no client bundles so the
 * static export stays light and every nav interaction is a zero-reload Link.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight text-slate-900 transition-opacity duration-200 ease-out hover:opacity-80"
        >
          <span aria-hidden="true" className="text-base font-medium leading-none">
            Δ
          </span>
          PayoutDelta
        </Link>

        <div className="flex items-center justify-center gap-3">
          <LanguageSwitcher />
          <span className="hidden items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-black/[0.06] md:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
            Live Spread Engine
          </span>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link
            href="/invoice/"
            className="text-xs font-medium text-slate-600 transition-colors duration-200 ease-out hover:text-slate-900"
          >
            Invoice Studio
          </Link>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-slate-600 transition-colors duration-200 ease-out hover:text-slate-900"
          >
            Open dataset
            <span aria-hidden="true" className="ml-0.5 opacity-50">
              ↗
            </span>
          </Link>
          <Link
            href="/contact"
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-neutral-800"
          >
            API Access
          </Link>
        </div>
      </nav>
    </header>
  );
}