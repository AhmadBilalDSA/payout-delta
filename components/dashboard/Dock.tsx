"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BankBuildingIcon,
  CalculatorIcon,
  CompareIcon,
  InvoiceIcon,
  LeaderboardIcon,
  LedgerIcon,
  PercentIcon,
  RailIcon,
  TerminalIcon,
} from "@/components/dashboard/Icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { UiKey } from "@/lib/i18n/dictionaries";

/**
 * PayoutDelta — global vertical command rail.
 *
 * A `fixed` left-edge launcher, vertically centred and frosted, that is the
 * single entry point to every major module. It is mounted ONCE in
 * `app/layout.tsx`, so it rides above EVERY route — home, /dashboard/,
 * /invoice/, /tax-ledger/, /tax-clearance/, /banks/, /compare/, /agencies/ and
 * /challengers/ — instead of being re-declared per page.
 *
 * The rail is chrome, not a document section, so it never reserves vertical
 * space: the root layout's `<main>` carries `pl-16 sm:pl-20` as the matching
 * permanent left clearance, which replaced the old `pb-*` bottom padding when
 * the launcher moved off the bottom edge. Because the rail is 40px wide and
 * pinned 12px from the viewport edge, that clearance leaves a 12px gutter.
 *
 * Design-system constraints honoured here:
 *   - Hairline border only (`border-neutral-800` on the dark canvas), a
 *     recessed `shadow-2xl` instead of a glow, and emerald reserved for the
 *     single active-route tile.
 *   - Each target is a 40×40 tile: the label is NOT rendered inline (a vertical
 *     column has no room for it), so it is exposed two ways that never both
 *     fire at once — as the flyout tooltip on hover/focus, and as an
 *     `aria-label` on the link itself, which is what assistive tech reads.
 *   - The tooltip is `opacity`/`pointer-events` only: no layout shift, no
 *     `overflow` on the rail (an `overflow-*` here would clip the flyout),
 *     and a 150ms ease-out so a `prefers-reduced-motion` visitor is unaffected.
 *   - `motion-safe:` guards the hover magnify so a touch device never fires it.
 *
 * Localised: every label resolves through the global `t()` dictionary, so the
 * rail is one of the seven fully-translated surfaces. Tooltips are
 * `whitespace-nowrap` and never wrap, and the rail is a fixed `left-3` column,
 * so a long translation can never reflow a neighbour.
 *
 * The targets reuse the existing server paths so `next/link` re-applies the
 * `/payout-delta` production `basePath` on its own.
 */

interface DockItem {
  href: string;
  labelKey: UiKey;
  Icon: typeof CalculatorIcon;
}

/** Order is the operator's mental model: audit → terminal → issue → track → rank. */
const DOCK_ITEMS: readonly DockItem[] = [
  { href: "/", labelKey: "feeAuditor", Icon: CalculatorIcon },
  { href: "/dashboard/", labelKey: "terminal", Icon: TerminalIcon },
  { href: "/invoice/", labelKey: "invoiceStudio", Icon: InvoiceIcon },
  { href: "/tax-ledger/", labelKey: "taxLedger", Icon: LedgerIcon },
  { href: "/tax-clearance/", labelKey: "taxHub", Icon: PercentIcon },
  { href: "/challengers/", labelKey: "challengers", Icon: RailIcon },
  { href: "/banks/", labelKey: "banks", Icon: BankBuildingIcon },
  { href: "/compare/", labelKey: "compare", Icon: CompareIcon },
  { href: "/leaderboard/", labelKey: "leaderboard", Icon: LeaderboardIcon },
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
      className="no-print fixed left-3 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/85 p-2 shadow-2xl backdrop-blur-2xl sm:left-4"
    >
      <ul className="flex flex-col items-center gap-1">
        {DOCK_ITEMS.map(({ href, labelKey, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={t(labelKey)}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 ease-out ${
                  active
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100"
                } motion-safe:hover:scale-105 focus-visible:bg-neutral-800/60 focus-visible:text-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-600`}
              >
                <Icon size={18} className="shrink-0" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 font-mono text-xs text-neutral-200 opacity-0 shadow-xl transition-opacity duration-150 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:opacity-100"
                >
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
