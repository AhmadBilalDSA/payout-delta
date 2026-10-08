"use client";

import { comparePlatformArbitrage } from '../../lib/engine/arbitrage';
import type { ArbitrageBreakdown } from '../../lib/engine/arbitrage';

interface ArbitrageMatrixProps {
  grossAmount: number;
  exchangeRate: number;
  targetCurrency: string;
}

/** Format a USD amount as a compact string with 2 decimals. */
function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a target-currency landed amount. */
function fmtLanded(n: number, currency: string): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format an effective loss percentage string. */
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

/** Row component for a single platform breakdown. */
function BreakdownRow({
  row,
  targetCurrency,
}: {
  row: ArbitrageBreakdown;
  targetCurrency: string;
}) {
  const { platform, totalFeeUsd, landedAmountTarget, effectiveLossPercent, isOptimal } =
    row;

  return (
    <tr
      className={
        isOptimal
          ? "border border-emerald-500 bg-emerald-500/5"
          : "border-b border-slate-800/60"
      }
    >
      <td className="px-3 py-2 text-xs font-medium text-slate-200 tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          {platform.name}
          {isOptimal && (
            <span className="inline-flex items-center rounded-full border border-emerald-500/50 bg-emerald-500/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Optimal
            </span>
          )}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-slate-400 tabular-nums font-mono">
        ${fmtUsd(platform.flatFeeUsd)}
      </td>
      <td className="px-3 py-2 text-xs text-slate-400 tabular-nums font-mono">
        {fmtPct(platform.fxSpreadPercent)}
      </td>
      <td className="px-3 py-2 text-xs text-slate-300 tabular-nums font-mono">
        ${fmtUsd(totalFeeUsd)} Â· {fmtPct(effectiveLossPercent)}
      </td>
      <td className="px-3 py-2 text-xs tabular-nums font-mono">
        <span
          className={
            isOptimal
              ? "font-bold text-emerald-400"
              : "text-slate-300"
          }
        >
          {fmtLanded(landedAmountTarget, targetCurrency)}
        </span>
      </td>
    </tr>
  );
}

/**
 * Multi-platform arbitrage comparison matrix.
 *
 * Renders a terminal-styled table comparing SWIFT, Upwork, Deel, and Wise
 * for a given gross USD amount and exchange rate. The best landed amount
 * is highlighted with an emerald border and badge.
 */
export default function ArbitrageMatrix({
  grossAmount,
  exchangeRate,
  targetCurrency,
}: ArbitrageMatrixProps) {
  const rows = comparePlatformArbitrage(grossAmount, exchangeRate);
  const optimal = rows.find((r) => r.isOptimal);

  return (
    <section
      aria-label="Arbitrage matrix"
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-sm backdrop-blur-md"
    >
      <div className="border-b border-slate-800/80 px-4 py-3">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400">
          Arbitrage Comparison
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          {optimal
            ? `Best route: ${optimal.platform.name} â€” lands ${fmtLanded(optimal.landedAmountTarget, targetCurrency)}`
            : `Compare ${rows.length} rails for $${fmtUsd(grossAmount)} at ${exchangeRate.toFixed(4)} ${targetCurrency}/USD`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-0 table-auto text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-left">
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Channel
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Fixed Fee
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                FX Spread
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Total Loss
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Est. Landed ({targetCurrency})
              </th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs tabular-nums">
            {rows.map((row: any) => (
              <BreakdownRow
                key={row.platform.id}
                row={row}
                targetCurrency={targetCurrency}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


