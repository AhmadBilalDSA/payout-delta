"use client";

import { useMemo, useRef, useState } from "react";
import type { Corridor } from "@/lib/types";
import {
  computeAlternativeRailsBenchmark,
  MODERN_FLAT_FEE_MIN_USD,
  MODERN_FLAT_FEE_MAX_USD,
  WIRE_INTERMEDIARY_MIN_USD,
  WIRE_INTERMEDIARY_MAX_USD,
  WIRE_RETAIL_SPREAD_MIN,
  WIRE_RETAIL_SPREAD_MAX,
} from "@/lib/alternativeRails";
import { formatUSD } from "@/utils/format";

interface ContractorLine {
  id: number;
  corridorSlug: string;
  monthlyInvoiceUSD: number;
}

const DEFAULT_INVOICE_USD = 3000;
const PAYOUTS_PER_YEAR = 12;
const RETAIL_SPREAD_FALLBACK = (WIRE_RETAIL_SPREAD_MIN + WIRE_RETAIL_SPREAD_MAX) / 2;

function initialRoster(): ContractorLine[] {
  const corridor = (corridorSlug: string, id: number): ContractorLine => ({
    id,
    corridorSlug,
    monthlyInvoiceUSD: DEFAULT_INVOICE_USD,
  });
  return [
    corridor("usd-to-pkr", 1),
    corridor("usd-to-pkr", 2),
    corridor("usd-to-pkr", 3),
    corridor("usd-to-pkr", 4),
    corridor("usd-to-inr", 5),
    corridor("usd-to-inr", 6),
    corridor("usd-to-cop", 7),
  ];
}

function corridorLabel(corridor: Corridor | undefined, slug: string): string {
  if (!corridor) return slug;
  return `${corridor.from} → ${corridor.to} · ${corridor.country}`;
}

export default function AgencyAuditCalculator({
  corridors,
}: {
  corridors: Corridor[];
}) {
  const corridorBySlug = useMemo(
    () => new Map(corridors.map((corridor) => [corridor.slug, corridor])),
    [corridors]
  );
  const [roundId, setRoundId] = useState(0);
  const [lines, setLines] = useState<ContractorLine[]>(initialRoster);
  const [addCorridor, setAddCorridor] = useState<string>("usd-to-pkr");
  const [addInvoice, setAddInvoice] = useState<number>(DEFAULT_INVOICE_USD);
  const nextId = useRef(300);

  const rows = useMemo(() => {
    const enrich = (line: ContractorLine) => {
      const corridor = corridorBySlug.get(line.corridorSlug);
      const providers = corridor?.providers ?? [];
      const swift = providers.find((provider) => provider.id === "swift");
      const intermediaryUSD =
        swift?.fixedFeeUSD ??
        (WIRE_INTERMEDIARY_MIN_USD + WIRE_INTERMEDIARY_MAX_USD) / 2;
      const retailSpread = swift?.fxSpread ?? RETAIL_SPREAD_FALLBACK;
      const monthly = line.monthlyInvoiceUSD;
      const benchmark = computeAlternativeRailsBenchmark(monthly);
      return {
        id: line.id,
        corridor,
        intermediaryUSD,
        retailSpread,
        monthly,
        shaMonthlyUSD: intermediaryUSD,
        shaAnnualUSD: intermediaryUSD * PAYOUTS_PER_YEAR,
        fxAnnualUSD: monthly * PAYOUTS_PER_YEAR * retailSpread,
        annualGrossUSD: monthly * PAYOUTS_PER_YEAR,
        classicAnnualMinUSD: benchmark.wire.totalMinUSD * PAYOUTS_PER_YEAR,
        classicAnnualMaxUSD: benchmark.wire.totalMaxUSD * PAYOUTS_PER_YEAR,
        modernAnnualMinUSD: benchmark.modern.totalMinUSD * PAYOUTS_PER_YEAR,
        modernAnnualMaxUSD: benchmark.modern.totalMaxUSD * PAYOUTS_PER_YEAR,
        savingsAnnualUSD: benchmark.savingsMidUSD * PAYOUTS_PER_YEAR,
      };
    };
    return lines.map(enrich);
  }, [lines, corridorBySlug]);

  const totals = useMemo(() => {
    let monthlyGross = 0;
    let annualGross = 0;
    let shaAnnual = 0;
    let fxAnnual = 0;
    for (const row of rows) {
      monthlyGross += row.monthly;
      annualGross += row.annualGrossUSD;
      shaAnnual += row.shaAnnualUSD;
      fxAnnual += row.fxAnnualUSD;
    }
    return { monthlyGross, annualGross, shaAnnual, fxAnnual };
  }, [rows]);

  const leakageAnnual = totals.shaAnnual + totals.fxAnnual;

  const corridorComparison = useMemo(() => {
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.corridor?.slug ?? "unknown";
      const existing = groups.get(key) ?? [];
      existing.push(row);
      groups.set(key, existing);
    }
    return Array.from(groups.entries())
      .map(([slug, groupRows]) => ({
        slug,
        contractors: groupRows.length,
        monthlyGross: groupRows.reduce((sum, row) => sum + row.monthly, 0),
        classicAnnualMin: groupRows.reduce(
          (sum, row) => sum + row.classicAnnualMinUSD,
          0
        ),
        classicAnnualMax: groupRows.reduce(
          (sum, row) => sum + row.classicAnnualMaxUSD,
          0
        ),
        modernAnnualMin: groupRows.reduce(
          (sum, row) => sum + row.modernAnnualMinUSD,
          0
        ),
        modernAnnualMax: groupRows.reduce(
          (sum, row) => sum + row.modernAnnualMaxUSD,
          0
        ),
        savingsAnnual: groupRows.reduce(
          (sum, row) => sum + row.savingsAnnualUSD,
          0
        ),
      }))
      .sort((a, b) => b.savingsAnnual - a.savingsAnnual);
  }, [rows]);

  const modernAnnualMin = rows.length * MODERN_FLAT_FEE_MIN_USD * PAYOUTS_PER_YEAR;
  const modernAnnualMax = rows.length * MODERN_FLAT_FEE_MAX_USD * PAYOUTS_PER_YEAR;
  const netSavingsMin = Math.max(0, leakageAnnual - modernAnnualMax);
  const netSavingsMax = Math.max(0, leakageAnnual - modernAnnualMin);

  const addLine = () => {
    nextId.current += 1;
    setLines((current) => [
      ...current,
      { id: nextId.current, corridorSlug: addCorridor, monthlyInvoiceUSD: addInvoice },
    ]);
  };

  const removeLine = (id: number) => {
    setLines((current) => current.filter((line) => line.id !== id));
  };

  const updateInvoice = (id: number, value: number) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? { ...line, monthlyInvoiceUSD: Number.isFinite(value) && value > 0 ? value : 0 }
          : line
      )
    );
  };

  const kpiCard = (label: string, value: string, tone: "accent" | "neutral" | "crimson") => (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
      <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
        {label}
      </span>
      <span
        className={
          tone === "crimson"
            ? "font-mono text-xl font-bold tracking-tight text-red-600 tabular-nums dark:text-red-400"
            : tone === "accent"
              ? "font-mono text-xl font-bold tracking-tight text-emerald-700 tabular-nums dark:text-emerald-400"
              : "font-mono text-xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white"
        }
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="agency-corridor"
            className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400"
          >
            Payout corridor
          </label>
          <select
            id="agency-corridor"
            value={addCorridor}
            onChange={(event) => setAddCorridor(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/[0.1] dark:bg-black/20 dark:text-white"
          >
            {corridors.map((corridor) => (
              <option key={corridor.slug} value={corridor.slug}>
                {corridorLabel(corridor, corridor.slug)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="agency-invoice"
            className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400"
          >
            Monthly invoice (USD)
          </label>
          <input
            id="agency-invoice"
            type="number"
            min={100}
            step={100}
            value={addInvoice}
            onChange={(event) =>
              setAddInvoice(Number(event.target.value) || DEFAULT_INVOICE_USD)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/[0.1] dark:bg-black/20 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add contractor
        </button>

        <button
          type="button"
          onClick={() => {
            setLines(initialRoster);
            setRoundId((value) => value + 1);
          }}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-500/40 hover:text-emerald-700 dark:border-white/[0.1] dark:text-slate-300 dark:hover:text-emerald-400"
        >
          Reset roster
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M4.5 3.5A1.5 1.5 0 0 0 3 5v4.25A1.5 1.5 0 0 0 4.5 10h11A1.5 1.5 0 0 0 17 9.25V5a1.5 1.5 0 0 0-1.5-1.5H4.5ZM3 12a1.5 1.5 0 0 0-1.5 1.5v3.25c0 .414.336.75.75.75h3.5a.75.75 0 0 0 .75-.75V16A1.5 1.5 0 0 1 8 14.5h4A1.5 1.5 0 0 1 13.5 16v.25a.75.75 0 0 0 .75.75h3.5a.75.75 0 0 0 .75-.75V13.5A1.5 1.5 0 0 0 17 12H3Zm2-4.75A.75.75 0 0 1 5.75 6.5h2A.75.75 0 0 1 8.5 7.25v2A.75.75 0 0 1 7.75 10h-2A.75.75 0 0 1 5 9.25v-2Z" />
          </svg>
          Print Executive Treasury Report
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCard("Monthly Gross Payroll", formatUSD(totals.monthlyGross), "neutral")}
        {kpiCard("Annual Gross Payroll", formatUSD(totals.annualGross), "neutral")}
        {kpiCard("Annual SHA Wire Cuts", formatUSD(totals.shaAnnual), "crimson")}
        {kpiCard("Annual Retail FX Margin", formatUSD(totals.fxAnnual), "crimson")}
      </div>

      <section className="mt-4 w-full min-w-0 rounded-3xl border border-red-500/25 bg-red-500/[0.05] p-6 dark:border-red-500/20 dark:bg-red-500/[0.06] sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"
          />
          Annual Treasury Leakage
        </p>
        <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Your agency loses{" "}
          <span className="font-mono text-red-600 tabular-nums dark:text-red-400">
            {formatUSD(leakageAnnual)}
          </span>{" "}
          USD every year to silent banking friction.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          {formatUSD(totals.shaAnnual)} leaks into correspondent SHA cuts and{" "}
          {formatUSD(totals.fxAnnual)} evaporates in retail bank FX margins.
          Moving the roster to flat-fee B2B rails would hold the friction at
          roughly {formatUSD(modernAnnualMin)}–{formatUSD(modernAnnualMax)} per
          year — a net saving of{" "}
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
            {formatUSD(netSavingsMin)}–{formatUSD(netSavingsMax)}
          </span>{" "}
          annually.
        </p>
      </section>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02]">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:border-white/[0.08] dark:text-slate-400">
              <th className="px-4 py-3">Contractor</th>
              <th className="px-4 py-3">Corridor</th>
              <th className="px-4 py-3">Invoice / mo</th>
              <th className="px-4 py-3">SHA / yr</th>
              <th className="px-4 py-3">FX leak / yr</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-b-0 dark:border-white/[0.05]"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                  #{(row.id % 100).toString().padStart(2, "0")}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">
                  {row.corridor?.slug ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <label className="sr-only" htmlFor={`invoice-${row.id}`}>
                    Monthly invoice USD
                  </label>
                  <input
                    id={`invoice-${row.id}`}
                    type="number"
                    min={0}
                    step={100}
                    value={row.monthly}
                    onChange={(event) =>
                      updateInvoice(row.id, Number(event.target.value))
                    }
                    className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-900 focus:border-emerald-500/60 focus:outline-none dark:border-white/[0.1] dark:bg-black/20 dark:text-white"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-red-600 tabular-nums dark:text-red-400">
                  {formatUSD(row.shaAnnualUSD)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-red-600 tabular-nums dark:text-red-400">
                  {formatUSD(row.fxAnnualUSD)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => removeLine(row.id)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-white/[0.1] dark:text-slate-400 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-8 w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
        <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          B2B Rails vs Classic SWIFT — Annual Comparison
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-black/[0.5] dark:text-white/[0.5]">
          Classic band = correspondent SHA cut (${WIRE_INTERMEDIARY_MIN_USD}–$
          {WIRE_INTERMEDIARY_MAX_USD}) + retail spread (
          {(WIRE_RETAIL_SPREAD_MIN * 100).toFixed(1)}–{(WIRE_RETAIL_SPREAD_MAX * 100).toFixed(1)}%).
          B2B band = flat fee (${MODERN_FLAT_FEE_MIN_USD.toFixed(2)}–$
          {MODERN_FLAT_FEE_MAX_USD.toFixed(2)}) at mid-market. Savings are the
          annualized midpoint delta at each line&apos;s gross.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:border-white/[0.08] dark:text-slate-400">
                <th className="px-3 py-2.5">Corridor</th>
                <th className="px-3 py-2.5 text-right">Contractors</th>
                <th className="px-3 py-2.5 text-right">Monthly gross</th>
                <th className="px-3 py-2.5 text-right">Classic SWIFT / yr</th>
                <th className="px-3 py-2.5 text-right">B2B rails / yr</th>
                <th className="px-3 py-2.5 text-right">Net saving / yr</th>
              </tr>
            </thead>
            <tbody>
              {corridorComparison.map((group) => (
                <tr
                  key={group.slug}
                  className="border-b border-slate-100 last:border-b-0 dark:border-white/[0.05]"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white">
                    {group.slug}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {group.contractors}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-900 tabular-nums dark:text-white">
                    {formatUSD(group.monthlyGross)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-red-600 tabular-nums dark:text-red-400">
                    {formatUSD(group.classicAnnualMin)}–{formatUSD(group.classicAnnualMax)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {formatUSD(group.modernAnnualMin)}–{formatUSD(group.modernAnnualMax)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                    {formatUSD(group.savingsAnnual)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 text-xs font-bold dark:border-white/[0.1]">
                <td className="px-3 py-2.5 text-slate-900 dark:text-white">
                  Roster total
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-900 dark:text-white">
                  {rows.length}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatUSD(totals.monthlyGross)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-red-600 tabular-nums dark:text-red-400">
                  {formatUSD(
                    rows.reduce((sum, row) => sum + row.classicAnnualMinUSD, 0)
                  )}
                  –
                  {formatUSD(
                    rows.reduce((sum, row) => sum + row.classicAnnualMaxUSD, 0)
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {formatUSD(
                    rows.reduce((sum, row) => sum + row.modernAnnualMinUSD, 0)
                  )}
                  –
                  {formatUSD(
                    rows.reduce((sum, row) => sum + row.modernAnnualMaxUSD, 0)
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-700 tabular-nums dark:text-emerald-400">
                  {formatUSD(
                    rows.reduce((sum, row) => sum + row.savingsAnnualUSD, 0)
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="agency-print-area hidden">
        <header>
          <h1>Agency Treasury Leakage Audit — PayoutDelta</h1>
          <p>
            Monthly-cadence roster · {PAYOUTS_PER_YEAR} payouts per contractor
            per year · leakage round #{roundId + 1}
          </p>
        </header>

        <section>
          <h2>Key figures</h2>
          <div className="agency-print-kpis">
            <div>
              <span>Monthly gross payroll</span>
              <strong>{formatUSD(totals.monthlyGross)}</strong>
            </div>
            <div>
              <span>Annual gross payroll</span>
              <strong>{formatUSD(totals.annualGross)}</strong>
            </div>
            <div>
              <span>Annual SHA wire cuts</span>
              <strong>{formatUSD(totals.shaAnnual)}</strong>
            </div>
            <div>
              <span>Annual retail FX margin</span>
              <strong>{formatUSD(totals.fxAnnual)}</strong>
            </div>
            <div>
              <span>Total annual leakage</span>
              <strong>{formatUSD(leakageAnnual)}</strong>
            </div>
            <div>
              <span>Net annual saving on B2B rails</span>
              <strong>
                {formatUSD(netSavingsMin)}–{formatUSD(netSavingsMax)}
              </strong>
            </div>
          </div>
        </section>

        <section>
          <h2>Contractor roster</h2>
          <table>
            <thead>
              <tr>
                <th>Corridor</th>
                <th>Monthly invoice (USD)</th>
                <th>SHA cut / yr</th>
                <th>FX leak / yr</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.corridor?.slug ?? "—"}</td>
                  <td>{formatUSD(row.monthly)}</td>
                  <td>{formatUSD(row.shaAnnualUSD)}</td>
                  <td>{formatUSD(row.fxAnnualUSD)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>B2B rails vs classic SWIFT</h2>
          <table>
            <thead>
              <tr>
                <th>Corridor</th>
                <th>Contractors</th>
                <th>Classic SWIFT / yr</th>
                <th>B2B rails / yr</th>
                <th>Net saving / yr</th>
              </tr>
            </thead>
            <tbody>
              {corridorComparison.map((group) => (
                <tr key={group.slug}>
                  <td>{group.slug}</td>
                  <td>{group.contractors}</td>
                  <td>
                    {formatUSD(group.classicAnnualMin)}–{formatUSD(group.classicAnnualMax)}
                  </td>
                  <td>
                    {formatUSD(group.modernAnnualMin)}–{formatUSD(group.modernAnnualMax)}
                  </td>
                  <td>{formatUSD(group.savingsAnnual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer>
          <p>
            PayoutDelta is informational tooling. Benchmark bands compiled from
            the public bank directory and corridor fee dataset; verify actual
            deductions against each bank&apos;s CRF before invoicing.
          </p>
        </footer>
      </div>
    </div>
  );
}