import Link from "next/link";

import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import type { Corridor } from "@/lib/types";

/**
 * Milestone UX — the 3-hop visual wire pipeline.
 *
 * Pure server-rendered diagram (zero JS) mounted on every corridor route.
 * Shows where an inbound classic SWIFT wire loses money before it lands:
 *
 *  1. Sender Bank    — dispatches the gross wire.
 *  2. Correspondent  — $15–$35 intermediary SHA cut.
 *  3. Beneficiary    — 2.5%–4.2% retail FX margin + local-rail delivery.
 *
 * Node data resolves from the corridor's regulatory banking directory and a
 * small currency→correspondent-BIC map (CHASUS33 / DEUTDEDD / BARCGB22) so the
 * example BIC stays truthful per source currency. Fully responsive: the three
 * nodes stack vertically with down-arrows on mobile and go horizontal on `sm`.
 */
const CORRESPONDENT_BICS: Record<string, string> = {
  USD: "CHASUS33",
  EUR: "DEUTDEDD",
  GBP: "BARCGB22",
};

const WIRE_SPREAD_MIN_PCT = 2.5;
const WIRE_SPREAD_MAX_PCT = 4.2;

export default function WirePipelineMap({
  corridor,
}: {
  corridor: Corridor;
}) {
  const regulation = getRegulatoryBanking(corridor.slug);
  const bank = regulation.banks[0];
  const recipientBic =
    bank && bank.swiftCode !== "—" ? bank.swiftCode : "Local clearing";
  const correspondentBic =
    CORRESPONDENT_BICS[corridor.from] ?? "SWIFT Correspondent";

  return (
    <section
      aria-labelledby="wire-pipeline-heading"
      className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-white/40">
          Visual wire pipeline
        </p>
        <h2
          id="wire-pipeline-heading"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
        >
          Your wire&apos;s 3-hop journey — and where it gets shaved
        </h2>
      </div>

      <ol className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {/* Node 1 — Sender Bank */}
        <li className="sm:flex-1">
          <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <p className="text-[10px] font-mono font-semibold tracking-widest text-slate-400 dark:text-white/30">
              NODE 1
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 dark:bg-white/[0.1] dark:text-slate-300"
              >
                <BankIcon />
              </span>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Sender Bank
              </h3>
            </div>
            <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-white/50">
              Client payout account
            </p>
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-100/60 px-2.5 py-1.5 text-center text-xs font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-slate-200">
              Dispatches Wire (Gross {corridor.from})
            </p>
          </article>
        </li>

        {/* Connector 1 → 2 */}
        <FlowConnector />

        {/* Node 2 — Correspondent Intermediary */}
        <li className="sm:flex-1">
          <article className="flex h-full flex-col rounded-xl border border-red-500/25 bg-red-500/[0.06] p-4">
            <p className="text-[10px] font-mono font-semibold tracking-widest text-red-500/70 dark:text-red-400/70">
              NODE 2
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400"
              >
                <BankIcon />
              </span>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Correspondent Intermediary
              </h3>
            </div>
            <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-white/50">
              e.g. {correspondentBic}
            </p>
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                −$15 to −$35 Intermediary SHA Cut
              </span>
            </div>
          </article>
        </li>

        {/* Connector 2 → 3 */}
        <FlowConnector />

        {/* Node 3 — Beneficiary Bank */}
        <li className="sm:flex-1">
          <article className="flex h-full flex-col rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
            <p className="text-[10px] font-mono font-semibold tracking-widest text-emerald-600/70 dark:text-emerald-400/70">
              NODE 3
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              >
                <BankIcon />
              </span>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Beneficiary Bank
              </h3>
            </div>
            <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-white/50">
              Your {corridor.country} account · {recipientBic}
            </p>
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                −{WIRE_SPREAD_MIN_PCT}% to −{WIRE_SPREAD_MAX_PCT}% Silent FX
                Spread
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckIcon /> Local Rail Delivery
              </span>
            </div>
          </article>
        </li>
      </ol>

      <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-white/50">
        Field 71A SHA keeps the correspondent cut separate, but the sender
        bank&apos;s {WIRE_SPREAD_MIN_PCT}%–{WIRE_SPREAD_MAX_PCT}% retail FX
        margin is booked invisibly inside the exchange rate. Figures are
        benchmark ranges — always verify against your credit advice.{" "}
        <Link
          href="/compare/"
          className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-white"
        >
          Compare rails
        </Link>
        .
      </p>
    </section>
  );
}

/** Dashed transit connector with a pulsing packet and arrowhead. */
function FlowConnector() {
  return (
    <li
      aria-hidden="true"
      className="flex items-center justify-center py-1 sm:w-12 sm:py-0"
    >
      <svg
        viewBox="0 0 120 28"
        fill="none"
        className="h-7 w-14 rotate-90 overflow-visible sm:h-8 sm:w-full sm:flex-none sm:rotate-0"
      >
        <path
          d="M6 14h96"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 5"
          className="text-slate-300 dark:text-slate-600"
        />
        <circle
          cx="22"
          cy="14"
          r="3"
          fill="currentColor"
          className="animate-pulse text-emerald-500"
        />
        <path
          d="m104 7 12 7-12 7v-4.5h-4v-5h4z"
          className="text-emerald-500"
        />
      </svg>
    </li>
  );
}

/** Clean native-SVG bank glyph. */
function BankIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M3 11 12 6l9 5" />
      <path d="M5 11v9h14v-9" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

/** Clean native-SVG check glyph. */
function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="m3 8.5 3.5 3.5L13 4.5" />
    </svg>
  );
}