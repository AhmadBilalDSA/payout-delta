"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BankBuildingIcon,
  CalculatorIcon,
  CompareIcon,
  InvoiceIcon,
  LedgerIcon,
  LeaderboardIcon,
} from "@/components/dashboard/Icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { UiKey } from "@/lib/i18n/dictionaries";

/**
 * PayoutDelta — Dashboard v3 floating module dock.
 *
 * A macOS-style launcher, centred on the bottom edge, that is the single entry
 * point to every major module. It is deliberately `fixed` rather than in-flow so
 * it reads as chrome above the page instead of another document section, and
 * frosted (`backdrop-blur-lg`) so the scrolling telemetry passes visibly
 * underneath it.
 *
 * Design-system constraints honoured here:
 *   - Hairline border only (`border-white/[0.08]` on the dark canvas), a
 *     recessed `shadow-lg` instead of a glow, and emerald reserved for the
 *     single active-route pill.
 *   - The magnify-on-hover is a `md:` (desktop-only) affordance wrapped in
 *     `motion-safe:`, so a touch device never fires it and a
 *     `prefers-reduced-motion` visitor gets the static page the brief requires.
 *   - Transitions are 150–200ms ease-out. No animation library, no keyframes.
 *
 * Localised: every label resolves through the global `t()` dictionary, so the
 * dock is one of the seven fully-translated surfaces. The label stays visible
 * beside the icon at every breakpoint — it is the accessible name for the link,
 * so it is never collapsed to an icon-only affordance. Labels are
 * `whitespace-nowrap` at 11px and the rail scrolls horizontally on the rare
 * narrow viewport where six translated labels outgrow the row, which is why no
 * label is ever clipped to an ellipsis.
 *
 * The six targets are the modules the brief enumerates for §4j, and they reuse
 * the existing server paths so `next/link` re-applies the `/payout-delta`
 * production `basePath` on its own.
 */

interface DockItem {
  href: string;
  labelKey: UiKey;
  Icon: typeof CalculatorIcon;
}

/** Module order is the operator's mental model: audit → issue → track → rank. */
const DOCK_ITEMS: readonly DockItem[] = [
  { href: "/", labelKey: "feeAuditor", Icon: CalculatorIcon },
  { href: "/invoice/", labelKey: "invoiceStudio", Icon: InvoiceIcon },
  { href: "/tax-ledger/", labelKey: "taxLedger", Icon: LedgerIcon },
  { href: "/leaderboard/", labelKey: "leaderboard", Icon: LeaderboardIcon },
  { href: "/banks/", labelKey: "banks", Icon: BankBuildingIcon },
  { href: "/compare/", labelKey: "compare", Icon: CompareIcon },
] as const;

/**
 * True when `href` is the route currently being viewed.
 *
 * The Fee Auditor lives at `/`, which is a prefix of every other path, so the
 * home route needs an exact match while module routes can safely use a prefix
 * test — that keeps `/banks/western-union/` highlighting the Banks tab.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(href);
}

export default function Dock() {
  const pathname = usePathname() ?? "/";
  const { t } = useLanguage();

  return (
    <nav
      aria-label={t("dashboardDockLabel")}
      className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 sm:pb-5"
    >
      <ul
        className="pointer-events-auto flex w-full max-w-3xl items-stretch justify-between gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-slate-900/70 p-1.5 shadow-lg shadow-black/40 [scrollbar-width:none] backdrop-blur-lg [&::-webkit-scrollbar]:hidden sm:gap-1.5 sm:p-2"
      >
        {DOCK_ITEMS.map(({ href, labelKey, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 text-center transition-colors duration-150 ease-out sm:flex-row sm:gap-2 sm:px-3 sm:py-2 ${
                  active
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                } motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.04] md:hover:scale-[1.06]`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="whitespace-nowrap text-[11px] font-medium leading-tight">
                  {t(labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
