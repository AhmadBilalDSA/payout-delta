"use client";

import type { WithdrawalChannel } from "@/lib/types";
import { formatUSD } from "@/utils/format";

/**
 * Phase 4 — Payout Transparency & Gross-Up Clause addendum.
 *
 * The default export is the editor's prominent toggle. When enabled, the live
 * preview and printed document append a standardized, legally balanced
 * remittance clause (rendered by `TransparencyClauseBlock`), optionally
 * showing estimated intermediary charges benchmarked against the PayoutDelta
 * open dataset — all purely presentational, so the printed PDF stays a clean
 * native `window.print()` output with zero runtime PDF bundles.
 */

export const TRANSPARENCY_CLAUSE_TITLE = "International Remittance & Banking Terms";

export const TRANSPARENCY_CLAUSE_NOTICE =
  "Notice on Remittance Deductions: This invoice reflects agreed net deliverables. " +
  "The payer is requested to instruct intermediary clearing banks to route funds " +
  "without deduct-at-source clearing penalties (OUR instruction on SWIFT wire or " +
  "covering payment processor surcharges), ensuring net realization of the invoiced balance.";

export const TRANSPARENCY_CORRIDORS: readonly string[] = [
  "Wise",
  "Local Bank Wire",
  "Upwork Direct",
];

/** Editor toggle — `[✓] Attach Remittance Transparency Addendum`. */
export default function TransparencyClause({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.06] bg-white p-4 transition-colors duration-200 ease-out hover:border-black/[0.15]">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={enabled}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 ${
          enabled
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-black/20 bg-white text-transparent"
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-3 w-3"
        >
          <path
            d="m3 8.5 3.2 3L13 4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">
          Attach Remittance Transparency Addendum
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          Appends a net-deliverables remittance clause and PayoutDelta fee
          benchmark to the printed invoice.
        </span>
      </span>
    </label>
  );
}

/** Print/preview block appended to `#invoice-document` when toggled on. */
export function TransparencyClauseBlock({
  channels,
}: {
  channels: WithdrawalChannel[];
}) {
  return (
    <section
      aria-label={TRANSPARENCY_CLAUSE_TITLE}
      className="invoice-addendum mt-8 rounded-lg border border-slate-200 p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {TRANSPARENCY_CLAUSE_TITLE}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
        {TRANSPARENCY_CLAUSE_NOTICE}
      </p>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Accepted corridors / channels
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {TRANSPARENCY_CORRIDORS.map((corridor) => (
          <span
            key={corridor}
            className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600"
          >
            {corridor}
          </span>
        ))}
      </div>

      {channels.length > 0 && (
        <>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Estimated intermediary charges · PayoutDelta benchmark
          </p>
          <dl className="mt-1 divide-y divide-slate-100 border-t border-slate-100">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-baseline justify-between gap-4 py-1 text-[11px]"
              >
                <dt className="text-slate-600">{channel.name}</dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  {formatUSD(channel.fixedFeeUSD)} fixed ·{" "}
                  {(channel.fxSpread * 100).toFixed(2)}% FX markup
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}