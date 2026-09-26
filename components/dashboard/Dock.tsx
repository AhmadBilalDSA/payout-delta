"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
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

export function Dock() {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard/calculator", icon: CalculatorIcon, label: "Calculator", ariaLabel: "Open Fee Calculator" },
    { href: "/dashboard/invoice", icon: InvoiceIcon, label: "Invoice", ariaLabel: "Generate Invoice" },
    { href: "/dashboard/ledger", icon: LedgerIcon, label: "Ledger", ariaLabel: "View Client Ledger" },
    { href: "/dashboard/leaderboard", icon: LeaderboardIcon, label: "Leaderboard", ariaLabel: "View Cost Leaderboard" },
    { href: "/dashboard/banks", icon: BankBuildingIcon, label: "Banks", ariaLabel: "Browse Bank Directory" },
    { href: "/dashboard/compare", icon: CompareIcon, label: "Compare", ariaLabel: "Compare Corridors" },
    { href: "/dashboard/agencies", icon: AgencyIcon, label: "Agencies", ariaLabel: "Regulatory Agencies" },
    { href: "/dashboard/terminal", icon: TerminalIcon, label: "Terminal", ariaLabel: "Open Terminal" },
  ] as const;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile: Bottom horizontal pill */}
      <nav
        className="fixed bottom-3 inset-x-0 mx-auto w-fit max-w-[92vw] z-50 flex flex-row items-center justify-center gap-1.5 p-1.5 rounded-2xl border border-neutral-800 bg-neutral-950/90 shadow-2xl backdrop-blur-2xl overflow-x-auto hidden md:hidden"
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
        className="fixed left-3 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 p-2 rounded-2xl border border-neutral-800 bg-neutral-950/90 shadow-2xl backdrop-blur-2xl hidden md:flex"
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
                className="absolute left-full ml-3 whitespace-nowrap text-sm font-medium text-neutral-100
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible
                  transition-opacity duration-150
                  bg-neutral-950/95 border border-neutral-800 rounded-lg px-3 py-1.5 shadow-xl backdrop-blur-xl
                  pointer-events-none"
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}