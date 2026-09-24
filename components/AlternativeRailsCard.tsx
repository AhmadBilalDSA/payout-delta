"use client";

import { useMemo } from "react";
import type { Corridor } from "@/lib/types";
import { getPartnerConfig } from "@/data/affiliatePartners";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  computeAlternativeRailsBenchmark,
  MODERN_FX_SPREAD,
  WIRE_RETAIL_SPREAD_MAX,
  WIRE_RETAIL_SPREAD_MIN,
} from "@/lib/alternativeRails";
import { formatUSD } from "@/utils/format";

/**
 * Milestone 7 — Alternative Rails Monetization Engine comparison card.
 *
 * Mounted on every corridor calculator route. Quantifies the all-in friction
 * of the classic SWIFT correspondent wire ($15–$35 intermediary SHA cut stacked
 * on a 2.0–4.2% retail spread) against a modern direct-clearing rail (flat
 * $5.50–$7.00, mid-market spread) and monetizes the delta through the central
 * partner directory CTA.
 *
 * The benchmark is a pure static computation (`lib/alternativeRails.ts`);
 * hydration can never disagree. The CTA resolves the corridor's best partnered
 * rail via `getPartnerConfig` and always carries
 * `rel="noopener noreferrer sponsored"` with the FTC disclosure from the
 * shared dictionary, mirroring the verdict card's affiliate contract.
 */
export default function AlternativeRailsCard({
  corridor,
  grossUSD,
  bestChannelId,
}: {
  corridor: Corridor;
  /** Live audited gross amount so the headline scales truthfully. */
  grossUSD: number;
  /** Optional best-rail channel id; falls back to a modern partnered rail. */
  bestChannelId?: string | null;
}) {
  const { t } = useLanguage();

  const benchmark = useMemo(
    () => computeAlternativeRailsBenchmark(grossUSD),
    [grossUSD]
  );

  const partner = useMemo(() => {
    const modernRails = ["wise", "payoneer", "remitly", "elevate"];
    const preferred =
      bestChannelId && modernRails.includes(bestChannelId)
        ? bestChannelId
        : "wise";
    return getPartnerConfig(preferred);
  }, [bestChannelId]);

  return (
    <section
      aria-label="Alternative direct rails"
      className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl"
      />

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
          />
          Bypass the correspondent chain
        </p>

        <h2 className="mt-3 text-sm font-bold tracking-tight text-slate-900 dark:text-white">
          Save {formatUSD(benchmark.savingsRoundedUSD)} on a{" "}
          {formatUSD(benchmark.grossUSD)} {corridor.from} → {corridor.to}{" "}
          transfer
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-black/[0.5] dark:text-white/[0.5]">
          Classic SWIFT wire friction runs{" "}
          {formatUSD(benchmark.wire.totalMinUSD)}–
          {formatUSD(benchmark.wire.totalMaxUSD)} all-in — a{" "}
          {(WIRE_RETAIL_SPREAD_MIN * 100).toFixed(1)}–
          {(WIRE_RETAIL_SPREAD_MAX * 100).toFixed(1)}% retail FX spread stacked
          on a $15–$35 intermediary SHA cut. Modern direct-clearing rails land
          a flat ${MODERN_FX_SPREAD.toFixed(0)}%-spread{" "}
          {formatUSD(benchmark.modern.totalMinUSD)}–
          {formatUSD(benchmark.modern.totalMaxUSD)}.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {benchmark.wire.label}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {formatUSD(benchmark.wire.totalMinUSD)}–
              {formatUSD(benchmark.wire.totalMaxUSD)}
            </span>
            <span className="text-[10px] leading-snug text-black/[0.45] dark:text-white/[0.45]">
              {benchmark.wire.components}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              {benchmark.modern.label}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
              {formatUSD(benchmark.modern.totalMinUSD)}–
              {formatUSD(benchmark.modern.totalMaxUSD)}
            </span>
            <span className="text-[10px] leading-snug text-emerald-900/60 dark:text-emerald-200/50">
              {benchmark.modern.components}
            </span>
          </div>
        </div>

        <a
          href={partner.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          title={partner.disclosure}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-150 ease-out hover:bg-emerald-500 active:scale-[0.99] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
        >
          Compare Direct Rail Options ↗
        </a>

        <p className="mt-3 text-[11px] leading-relaxed text-black/[0.45] dark:text-white/40">
          {partner.disclosure} {t("affiliateDisclaimer")}
        </p>
      </div>
    </section>
  );
}