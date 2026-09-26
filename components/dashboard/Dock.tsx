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
  RailIcon,
} from "@/components/dashboard/Icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { UiKey } from "@/lib/i18n/dictionaries";

/**
 * PayoutDelta — global module dock (Dashboard v3 floating launcher).
 *
 * A macOS-style launcher, centred on the bottom edge, that is the single entry
 * point to every major module. It is mounted ONCE in `app/layout.tsx`, so it
 * floats above EVERY route — home, /dashboard/, /invoice/, /tax-ledger/,
 * /tax-clearance/, /banks/, /compare/, /agencies/ and /challengers/ — rather
 * than being re-declared per page. It is deliberately `fixed` rather than
 * in-flow so it reads as chrome above the page instead of another document
 * section, and frosted (`backdrop-blur-xl`) so the scrolling telemetry passes
 * visibly underneath it. The root layout's `<main>` carries `pb-24 sm:pb-28`
 * as the matching permanent clearance, so no route can end up with its last
 * table row or footer sitting under the bar.
 *
 * Design-system constraints honoured here:
 *   - Hairline border only (`border-neutral-800/80` on the dark canvas), a
 *     recessed `shadow-2xl` instead of a glow, and emerald reserved for the
 *     single active-route pill.
 *   - `max-w-fit` lets the bar hug its content, so it never stretches into a
 *     full-width slab on a wide monitor; the inner rail keeps
 *     `overflow-x-auto` for the rare narrow viewport where seven translated
 *     labels outgrow the row, which is why no label is ever clipped.
 *   - The magnify-on-hover is a `md:` (desktop-only) affordance wrapped in
 *     `motion-safe:`, so a touch device never fires it and a
 *     `prefers-reduced-motion` visitor gets the static page the brief requires.
 *   - Transitions are 150–200ms ease-out. No animation library, no keyframes.
 *
 * Localised: every label resolves through the global `t()` dictionary, so the
 * dock is one of the seven fully-translated surfaces. The label stays visible
 * beside the icon at every breakpoint — it is the accessible name for the link,
 * so it is never collapsed to an icon-only affordance. Labels are
 * `text-[11px] whitespace-nowrap`.
 *
 * The targets are the modules the brief enumerates, and they reuse the existing
 * server paths so `next/link` re-applies the `/payout-delta` production
 * `basePath` on its own.
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
  { href: "/challengers/", labelKey: "challengers", Icon: RailIcon },
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
      <div className="pointer-events-auto mx-auto max-w-fit rounded-2xl border border-neutral-800/80 bg-neutral-950/80 px-3 py-1.5 shadow-2xl backdrop-blur-xl">
        <ul className="flex items-stretch justify-between gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1.5">
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
      </div>
    </nav>
  );
}
