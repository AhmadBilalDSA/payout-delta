"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { Corridor } from "@/lib/types";

/**
 * Milestone UX — Annual Leakage Estimator.
 *
 * One clean slider (monthly invoice volume) over 100% deterministic local
 * arithmetic — no network, no `Date`, no locale — so the server-prerendered
 * markup and hydrated client can never disagree. Converts the classic SWIFT
 * wire friction bands into a yearly loss projection under an explicit
 * benchmark assumption:
 *
 *   - intermediary SHA cut   $15–$35 per inbound wire (≈1 wire/month)
 *   - sender bank FX margin  2.5%–4.2% on annual invoiced volume
 *
 * The headline rounds the band midpoint; the breakdown rows keep honest
 * min–max ranges. The CTA routes to the Invoice Studio addendum generator.
 */
const MIN_MONTHLY_USD = 500;
const MAX_MONTHLY_USD = 30000;
const DEFAULT_MONTHLY_USD = 3000;
const SLIDER_STEP_USD = 500;
const MONTHS_PER_YEAR = 12;
const WIRES_PER_MONTH = 1;
const INTERMEDIARY_MIN_USD = 15;
const INTERMEDIARY_MAX_USD = 35;
const SPREAD_MIN = 0.025;
const SPREAD_MAX = 0.042;

interface LeakageEstimate {
  monthlyUSD: number;
  annualVolumeUSD: number;
  annualIntermediaryMinUSD: number;
  annualIntermediaryMaxUSD: number;
  annualSpreadMinUSD: number;
  annualSpreadMaxUSD: number;
  annualLossUSD: number;
}

/** `$1,506` — integer USD for scannable headline figures. */
function usd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function computeLeakage(monthlyUSD: number): LeakageEstimate {
  const months = MONTHS_PER_YEAR;
  const annualVolumeUSD = monthlyUSD * months;
  const annualIntermediaryMinUSD =
    WIRES_PER_MONTH * months * INTERMEDIARY_MIN_USD;
  const annualIntermediaryMaxUSD =
    WIRES_PER_MONTH * months * INTERMEDIARY_MAX_USD;
  const annualSpreadMinUSD = annualVolumeUSD * SPREAD_MIN;
  const annualSpreadMaxUSD = annualVolumeUSD * SPREAD_MAX;
  const totalMin = annualIntermediaryMinUSD + annualSpreadMinUSD;
  const totalMax = annualIntermediaryMaxUSD + annualSpreadMaxUSD;

  return {
    monthlyUSD,
    annualVolumeUSD,
    annualIntermediaryMinUSD,
    annualIntermediaryMaxUSD,
    annualSpreadMinUSD,
    annualSpreadMaxUSD,
    annualLossUSD: Math.round((totalMin + totalMax) / 2),
  };
}

export default function AnnualLeakageCalculator({
  corridor,
}: {
  corridor?: Corridor;
}) {
  const [monthlyUSD, setMonthlyUSD] = useState(DEFAULT_MONTHLY_USD);
  const estimate = useMemo(() => computeLeakage(monthlyUSD), [monthlyUSD]);

  return (
    <section
      aria-labelledby="annual-leakage-heading"
      className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-white/40">
            Annual leakage estimator
          </p>
          <h2
            id="annual-leakage-heading"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
          >
            How much quiet money leaks annually?
          </h2>
        </div>
        {corridor && (
          <span className="rounded-full border border-slate-200 bg-slate-100/70 px-3 py-1 text-[11px] font-semibold tabular-nums text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-slate-300">
            {corridor.from} → {corridor.to}
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs tabular-nums text-slate-500 dark:text-white/50">
          <span>Monthly invoicing volume</span>
          <span className="rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1 font-mono text-sm font-bold text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white">
            {usd(monthlyUSD)}
            <span className="ml-1 text-[10px] font-medium text-slate-500 dark:text-white/50">
              / month
            </span>
          </span>
        </div>

        <input
          type="range"
          aria-label="Monthly invoicing volume in USD"
          min={MIN_MONTHLY_USD}
          max={MAX_MONTHLY_USD}
          step={SLIDER_STEP_USD}
          value={monthlyUSD}
          onChange={(event) =>
            setMonthlyUSD(Number(event.currentTarget.value))
          }
          className="mt-3 h-2 w-full cursor-pointer rounded-lg bg-neutral-100 accent-emerald-600 dark:bg-neutral-800"
        />
        <div className="mt-2 flex justify-between text-xs tabular-nums text-slate-500 dark:text-white/45">
          <span>{usd(MIN_MONTHLY_USD)}</span>
          <span>{usd(MAX_MONTHLY_USD)}</span>
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="mt-5 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-4"
      >
        <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">
          You lose approximately{" "}
          <strong className="font-mono text-lg font-bold tabular-nums tracking-tight text-red-600 dark:text-red-400">
            {usd(estimate.annualLossUSD)} USD
          </strong>{" "}
          every year to silent banking friction.
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-100/60 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <span className="text-xs leading-snug text-slate-600 dark:text-white/60">
            Intermediary SWIFT fees lost per year
          </span>
          <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {usd(estimate.annualIntermediaryMinUSD)} –{" "}
            {usd(estimate.annualIntermediaryMaxUSD)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-100/60 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <span className="text-xs leading-snug text-slate-600 dark:text-white/60">
            Retail FX margin shaved per year
          </span>
          <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {usd(estimate.annualSpreadMinUSD)} –{" "}
            {usd(estimate.annualSpreadMaxUSD)}
          </span>
        </li>
      </ul>

      <Link
        href="/invoice"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-150 ease-out hover:bg-emerald-500 active:scale-[0.99] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
      >
        Protect Your Invoices (Generate Free Addendum)
        <span aria-hidden="true">↗</span>
      </Link>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-white/40">
        Estimate assumes ~1 inbound wire per month at the $15–$35 SHA cut plus a
        2.5%–4.2% sender-bank retail FX margin on your annual invoiced volume.{" "}
        {corridor ? `Based on ${corridor.from} → ${corridor.to} corridor benchmarks. ` : ""}
        Informational — verify against your credit advice.{" "}
        <Link
          href="/compare/"
          className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-white"
        >
          Read the comparison guides
        </Link>
        .
      </p>
    </section>
  );
}