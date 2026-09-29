"use client";

/**
 * PayoutDelta — /split/ multi-rail withdrawal split optimizer.
 *
 * CLIENT COMPONENT. Renders an interactive invoice-volume slider and three
 * side-by-side rail cards, each showing net yield, deductions, and a color-
 * coded leakage bar. The bar chart is a hand-crafted inline SVG — no chart
 * library, no external package.
 *
 * Zero unstyled <select> elements; dropdowns are portal ARIA listboxes.
 */

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRef, useEffect, useCallback } from "react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

import {
  calculateSplitYields,
  fmtLocal,
  fmtPct,
  fmtUsd,
  PLATFORMS,
  type PlatformId,
  type SplitRailResult,
} from "@/lib/reverseEngine";
import { sanitizeFinancialInput } from "@/lib/safeMath";

/* -------------------------------------------------------------------------- *
 * Prop shapes
 * -------------------------------------------------------------------------- */

export interface SplitCorridorOption {
  slug: string;
  label: string;
  to: string;
  symbol: string;
  midRate: number;
  withholdingRate: number;
}

interface Props {
  corridors: SplitCorridorOption[];
}

/* -------------------------------------------------------------------------- *
 * Re-use portal listbox (inline — same pattern as ReverseCalculatorClient)
 * -------------------------------------------------------------------------- */

interface ListboxOption { value: string; label: string }

function PortalListbox({
  id,
  value,
  options,
  onChange,
  triggerLabel,
}: {
  id: string;
  value: string;
  options: ListboxOption[];
  onChange: (v: string) => void;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 0, left: 0, width: 0,
  });
  const selectedLabel = options.find((o) => o.value === value)?.label ?? triggerLabel;

  const openMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = (v: string) => { onChange(v); setOpen(false); };

  return (
    <>
      <button
        ref={triggerRef} id={id} type="button"
        aria-haspopup="listbox" aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition-colors hover:border-emerald-500/40 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white dark:hover:border-emerald-500/40"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && typeof document !== "undefined" &&
        createPortal(
          <ul ref={menuRef} role="listbox" tabIndex={-1} aria-label={triggerLabel}
            style={{ position: "absolute", top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 9999 }}
            className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl [animation:dropdown-in_0.12s_ease] dark:border-white/[0.12] dark:bg-slate-900"
          >
            {options.map((opt) => (
              <li key={opt.value} role="option" aria-selected={opt.value === value}
                onClick={() => select(opt.value)}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${opt.value === value ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]"}`}
              >
                {opt.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}

/* -------------------------------------------------------------------------- *
 * Inline SVG bar chart
 *
 * Three adjacent horizontal bars representing net yield for each rail.
 * viewBox: "0 0 480 180"  ← stable identifier asserted by audit_utility_engines.mjs
 *
 * Bars are colored:
 *   SWIFT          rose (highest leakage)
 *   Payoneer/Wise  amber (mid)
 *   FCVA           emerald (best USD preservation)
 * -------------------------------------------------------------------------- */

const BAR_COLORS: Record<string, { fill: string; label: string }> = {
  swift:         { fill: "#f43f5e", label: "rose"   },
  payoneer_wise: { fill: "#f59e0b", label: "amber"  },
  fcva:          { fill: "#10b981", label: "emerald" },
};

function SplitBarChart({
  results,
  grossUsd,
  midRate,
  symbol,
  toCurrency,
}: {
  results: SplitRailResult[];
  grossUsd: number;
  midRate: number;
  symbol: string;
  toCurrency: string;
}) {
  const VW = 480;
  const VH = 180;
  const BAR_H = 36;
  const GAP   = 12;
  const LABEL_W = 0;
  const BAR_MAX_W = VW - 160; // leave 160px for labels on the right
  const TOP_PAD = 16;

  // Max net across rails for normalising bar widths
  const maxNet = Math.max(
    ...results.map((r) => r.rail.retainsUsd ? r.netUsdRetained * midRate : r.netLocalDeposit),
    1,
  );

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      role="img"
      aria-label={`Multi-rail split comparison chart for ${fmtUsd(grossUsd)} gross invoice`}
      className="h-auto w-full"
      data-split-chart="true"
    >
      {results.map((r, i) => {
        const color = BAR_COLORS[r.rail.id] ?? BAR_COLORS.swift;
        const localEquiv = r.rail.retainsUsd
          ? r.netUsdRetained * midRate
          : r.netLocalDeposit;
        const barW = Math.max(4, (localEquiv / maxNet) * BAR_MAX_W);
        const y    = TOP_PAD + i * (BAR_H + GAP);

        const netLabel = r.rail.retainsUsd
          ? `${fmtUsd(r.netUsdRetained)} retained`
          : `${symbol}${Math.round(r.netLocalDeposit).toLocaleString("en-US")} ${toCurrency}`;

        return (
          <g key={r.rail.id}>
            {/* Bar */}
            <rect
              x={LABEL_W}
              y={y}
              width={barW}
              height={BAR_H}
              rx={6}
              fill={color.fill}
              fillOpacity={0.85}
            />
            {/* Rail label */}
            <text
              x={LABEL_W}
              y={y - 4}
              className="fill-slate-600 text-[10px] font-semibold dark:fill-slate-400"
              fontSize={10}
              fontWeight={600}
              fill="#64748b"
            >
              {r.rail.label}
            </text>
            {/* Net value label */}
            <text
              x={barW + LABEL_W + 8}
              y={y + BAR_H / 2 + 4}
              fontSize={11}
              fontWeight={700}
              fontFamily="ui-monospace, monospace"
              fill={color.fill}
            >
              {r.feasible ? netLabel : "N/A"}
            </text>
            {/* Leakage % */}
            <text
              x={barW + LABEL_W + 8}
              y={y + BAR_H / 2 + 17}
              fontSize={9}
              fill="#94a3b8"
              fontFamily="ui-monospace, monospace"
            >
              {r.feasible ? `${fmtPct(r.leakagePct)} leakage` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------------------------------------------------------- *
 * Rail detail card
 * -------------------------------------------------------------------------- */

function RailCard({ result, symbol }: { result: SplitRailResult; symbol: string }) {
  const color = BAR_COLORS[result.rail.id] ?? BAR_COLORS.swift;
  const netDisplay = result.rail.retainsUsd
    ? fmtUsd(result.netUsdRetained)
    : fmtLocal(result.netLocalDeposit, symbol);

  return (
    <div
      className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
      style={{ borderLeftColor: color.fill, borderLeftWidth: 3 }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {result.rail.label}
      </p>
      <p
        className="mt-2 font-mono tabular-nums text-xl font-bold"
        style={{ color: color.fill }}
      >
        {result.feasible ? netDisplay : "—"}
      </p>
      {result.rail.retainsUsd && (
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          USD retained — no immediate FX conversion
        </p>
      )}
      <dl className="mt-3 space-y-1.5">
        {[
          { label: "Wire / platform fee",  value: fmtUsd(result.rail.fixedFeeUsd + result.rail.shaIntermediateCutUsd) },
          { label: "FX spread",            value: fmtPct(result.rail.fxSpread * 100) },
          { label: "Total deducted",       value: fmtUsd(result.totalDeductedUsd) },
          { label: "Fee leakage",          value: fmtPct(result.leakagePct) },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="font-mono tabular-nums text-[12px] font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Main
 * -------------------------------------------------------------------------- */

const GROSS_PRESETS = [1000, 5000, 10000, 25000, 50000];

export default function SplitOptimizerClient({ corridors }: Props) {
  const [grossRaw,   setGrossRaw]   = useState("5000");
  const [corridorSlug, setCorridorSlug] = useState(corridors[0]?.slug ?? "");
  const [platformId, setPlatformId] = useState<PlatformId>("upwork");

  const corridor = useMemo(
    () => corridors.find((c) => c.slug === corridorSlug) ?? corridors[0],
    [corridors, corridorSlug],
  );
  const platform = useMemo(
    () => PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[0],
    [platformId],
  );

  const grossUsd = sanitizeFinancialInput(grossRaw, 0);

  const results = useMemo(() => {
    if (!corridor || grossUsd <= 0) return [];
    return calculateSplitYields({
      grossUsd,
      midRate:         corridor.midRate,
      withholdingRate: corridor.withholdingRate,
      platformRate:    platform.feePercent / 100,
    });
  }, [grossUsd, corridor, platform]);

  const corridorOptions = corridors.map((c) => ({ value: c.slug, label: c.label }));
  const platformOptions = PLATFORMS.map((p) => ({ value: p.id, label: p.label }));

  if (!corridor) return null;
  const { symbol, to: toCurrency } = corridor;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">

      {/* Hero */}
      <SpotlightCard className="rounded-3xl p-6 sm:p-8">
        <section>
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Multi-Rail Split Optimizer
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
          Which withdrawal rail keeps more?
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          Compare net yield across Direct SWIFT Wire, Payoneer / Wise transfer,
          and retaining USD in a Foreign Currency Value Account. Adjust invoice
          volume, corridor, and platform to see fee leakage in real time.
        </p>
      </section>
      </SpotlightCard>

      {/* Controls */}
      <section
        aria-labelledby="split-controls"
        className="mt-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 sm:p-8"
      >
        <h2 id="split-controls" className="mb-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Parameters
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label id="split-corridor-label" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Corridor
            </label>
            <PortalListbox
              id="split-corridor"
              value={corridorSlug}
              options={corridorOptions}
              onChange={setCorridorSlug}
              triggerLabel="Select corridor"
            />
          </div>
          <div>
            <label id="split-platform-label" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Platform
            </label>
            <PortalListbox
              id="split-platform"
              value={platformId}
              options={platformOptions}
              onChange={(v) => setPlatformId(v as PlatformId)}
              triggerLabel="Select platform"
            />
          </div>
          <div>
            <label htmlFor="split-gross" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Gross invoice (USD)
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">$</span>
              <input
                id="split-gross"
                type="number" inputMode="decimal" min={100} step={500}
                value={grossRaw}
                onChange={(e) => setGrossRaw(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-8 pr-4 font-mono tabular-nums text-sm text-slate-900 transition-colors focus:border-emerald-500/60 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white"
              />
            </div>
            {/* Quick presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GROSS_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGrossRaw(String(v))}
                  className={`rounded-lg border px-2.5 py-1 font-mono tabular-nums text-[11px] font-semibold transition-colors ${
                    grossUsd === v
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-slate-200 text-slate-500 hover:border-emerald-500/30 dark:border-white/[0.08] dark:text-slate-400"
                  }`}
                >
                  ${v.toLocaleString("en-US")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chart + Cards */}
      {results.length > 0 && (
        <>
          {/* SVG comparison bar chart */}
          <section
            aria-labelledby="split-chart-heading"
            className="mt-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 sm:p-8"
          >
            <h2 id="split-chart-heading" className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Net yield comparison — {fmtUsd(grossUsd)} gross · {platform.label}
            </h2>
            <figure className="w-full overflow-x-auto [scrollbar-width:thin]">
              <SplitBarChart
                results={results}
                grossUsd={grossUsd}
                midRate={corridor.midRate}
                symbol={symbol}
                toCurrency={toCurrency}
              />
              <figcaption className="mt-2 text-[11px] leading-relaxed text-black/45 dark:text-white/45">
                Bar length represents net local yield. Rose = highest fee leakage (Direct SWIFT). Amber = mid-leakage (Payoneer/Wise). Emerald = USD retained (FCVA/Exporter Wallet). Statutory withholding applied where published.
              </figcaption>
            </figure>
          </section>

          {/* Per-rail detail cards */}
          <section
            aria-labelledby="split-cards-heading"
            className="mt-6"
          >
            <h2 id="split-cards-heading" className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Rail breakdown
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {results.map((r) => (
                <RailCard
                  key={r.rail.id}
                  result={r}
                  symbol={symbol}
                />
              ))}
            </div>
          </section>

          {/* Monospace legend ledger */}
          <section
            aria-labelledby="split-ledger-heading"
            className="mt-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 sm:p-8"
          >
            <h2 id="split-ledger-heading" className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Fee deduction ledger
            </h2>
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <table className="w-full border-collapse text-left text-[13px]">
                <caption className="sr-only">
                  Fee deduction comparison across withdrawal rails for {fmtUsd(grossUsd)} gross invoice via {platform.label} to {corridor.to}
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {["Rail", "Wire Fee", "FX Spread", "Deducted Total", "Net Yield", "Leakage %"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="py-2 pr-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const netDisplay = r.rail.retainsUsd
                      ? fmtUsd(r.netUsdRetained)
                      : fmtLocal(r.netLocalDeposit, symbol);
                    return (
                      <tr key={r.rail.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                        <th scope="row" className="py-2.5 pr-4 text-left font-medium text-slate-700 dark:text-slate-300">
                          {r.rail.label}
                        </th>
                        <td className="py-2.5 pr-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                          {fmtUsd(r.rail.fixedFeeUsd + r.rail.shaIntermediateCutUsd)}
                        </td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                          {fmtPct(r.rail.fxSpread * 100)}
                        </td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                          {fmtUsd(r.totalDeductedUsd)}
                        </td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          {r.feasible ? netDisplay : "—"}
                        </td>
                        <td className="py-2.5 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                          {fmtPct(r.leakagePct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <p className="no-print mt-8 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
        PayoutDelta is informational tooling, not financial advice.
        FX spreads, wire fees, and withholding rates are indicative benchmarks.
        Confirm live rates with your provider before transacting.
      </p>
    </div>
  );
}
