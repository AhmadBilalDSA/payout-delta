"use client";

import { usePathname } from "next/navigation";
import { TransitionLink as Link } from "@/components/nav/TransitionLink";
import {
  CalculatorIcon,
  InvoiceIcon,
  LedgerIcon,
  LeaderboardIcon,
  BankBuildingIcon,
  CompareIcon,
  AgencyIcon,
  TerminalIcon,
} from "./Icons";

/**
 * Global application launcher.
 *
 * PHASE 2 — LAYER OWNERSHIP
 * The dock lives inside its own `z-30` root, and that root is what makes the
 * layer order total: Header bar `z-40` > header click-scrim `z-[60]` > header
 * menu `z-[70]` > dock `z-30` > page content. The wrapper is `fixed inset-0
 * pointer-events-none` so it is a real stacking context that repaints as one
 * unit, while only the two launcher bars themselves accept pointer events.
 * Leaving `z-50` on the bars without this wrapper is what let a wide corridor
 * menu and the dock fight over the same pixels in the screenshot pass.
 */
export function Dock() {
  const pathname = usePathname();

  const items = [
    { href: "/", icon: CalculatorIcon, label: "Calculator", ariaLabel: "Open Fee Calculator" },
    { href: "/invoice", icon: InvoiceIcon, label: "Invoice", ariaLabel: "Generate Invoice" },
    { href: "/tax-ledger", icon: LedgerIcon, label: "Ledger", ariaLabel: "View Client Ledger" },
    { href: "/leaderboard", icon: LeaderboardIcon, label: "Leaderboard", ariaLabel: "View Cost Leaderboard" },
    { href: "/banks", icon: BankBuildingIcon, label: "Banks", ariaLabel: "Browse Bank Directory" },
    { href: "/compare", icon: CompareIcon, label: "Compare", ariaLabel: "Compare Corridors" },
    { href: "/agencies", icon: AgencyIcon, label: "Agencies", ariaLabel: "Regulatory Agencies" },
    { href: "/dashboard", icon: TerminalIcon, label: "Terminal", ariaLabel: "Open Terminal" },
  ] as const;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      {/* Mobile: Bottom horizontal pill */}
      <nav
        className="pointer-events-auto fixed bottom-3 inset-x-0 mx-auto w-fit max-w-[92vw] flex md:hidden flex-row items-center justify-center gap-1.5 p-1.5 rounded-2xl border border-neutral-800 bg-neutral-950/90 shadow-2xl backdrop-blur-2xl overflow-x-auto"
        role="navigation"
        aria-label="Main navigation"
      >
        {items.map(({ href, icon: Icon, label, ariaLabel }) => (
          <Link
            key={href}
            href={href}
            className={`
              flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl
              text-neutral-400 hover:text-white transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50
              ${isActive(href) ? "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/50" : ""}
            `}
            aria-label={ariaLabel}
            aria-current={isActive(href) ? "page" : undefined}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] font-medium whitespace-nowrap">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Desktop: Left vertical rail with expanding tooltips */}
      <nav
        className="pointer-events-auto fixed left-3.5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 p-2 rounded-2xl border border-neutral-800 bg-neutral-950/90 shadow-2xl backdrop-blur-2xl hidden md:flex"
        role="navigation"
        aria-label="Main navigation"
      >
        {items.map(({ href, icon: Icon, label, ariaLabel }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`
                relative group flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl
                text-neutral-400 hover:text-white transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50
                ${active ? "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/50" : ""}
              `}
              aria-label={ariaLabel}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap
                  rounded-lg bg-neutral-900 border border-neutral-700 px-2.5 py-1
                  text-xs font-mono text-neutral-200 shadow-xl
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                  group-focus-within:opacity-100 group-focus-within:visible
                  transition-opacity duration-150 pointer-events-none"
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}