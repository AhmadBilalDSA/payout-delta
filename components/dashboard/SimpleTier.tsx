"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  DashboardCorridor,
  DashboardKpis,
  DashboardPlatform,
} from "@/components/dashboard/payload";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { calculateGrossFromTargetNet } from "@/lib/calculatorEngine";
import { localizedCorridorHref } from "@/lib/localizedCorridors";

/**
 * PayoutDelta — Dashboard v3 SIMPLE TIER (open by default).
 *
 * The first half of the Two-Tier Progressive Disclosure contract. Everything a
 * decision actually needs is above the fold and requires no interaction: the
 * value proposition, four build-time totals, a live quote the visitor can aim,
 * and a sortable matrix they can scan. Nothing here collapses, hides behind a
 * toggle, or asks the reader to expand anything — the forensic half of the page
 * lives in `DiagnosticTier`, one disclosure away.
 *
 * WHY A CLIENT ISLAND
 * The brief's react guidance is "server components by default, client islands
 * only where interactivity demands it". This tier is genuinely interactive —
 * two live controls and a sortable table — and it is also the only thing on the
 * page that needs the language provider, since every string resolves through
 * `t()` at runtime. The page shell stays a server component; this is the island.
 *
 * BUNDLE DISCIPLINE
 * `import type` from the payload module only. The fee dataset, the statutory
 * bank directory and the platform table are all resolved on the server, so this
 * island ships flat numbers and short strings. The one value import from the
 * engine is the same `calculateGrossFromTargetNet` the fee auditor uses — no
 * fee arithmetic is duplicated here.
 *
 * ACCESSIBILITY
 * The matrix is a real `<table>` with a caption and scoped headers, the tier
 * badge is a heading rather than a decorative chip, and the sort control is a
 * `<button>` with `aria-sort` published on the header. Every highlighted cell
 * also carries its number as text, so the emerald "best" treatment is never the
 * only way the information is conveyed.
 */

/** Columns rendered in the matrix: the corridor label plus one per provider. */
type SortKey = "corridor" | string;

function formatUSD(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `$${safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SimpleTier({
  corridors,
  platforms,
  kpis,
  repoUrl,
}: {
  corridors: DashboardCorridor[];
  platforms: DashboardPlatform[];
  kpis: DashboardKpis;
  repoUrl: string;
}) {
  const { t, lang } = useLanguage();

  // ---------------------------------------------------------------------
  // Live quick-quote
  // ---------------------------------------------------------------------
  const firstCorridor = corridors[0];
  const [quoteSlug, setQuoteSlug] = useState(firstCorridor?.slug ?? "");
  const [quoteAmount, setQuoteAmount] = useState("");

  const quoteCorridor =
    corridors.find((item) => item.slug === quoteSlug) ?? firstCorridor;
  const quotePlatform =
    platforms.find((item) => item.feePercent > 0) ?? platforms[0];

  const defaultQuoteTarget = quoteCorridor
    ? Math.round(quoteCorridor.rate * 1000)
    : 0;
  const parsed = Number.parseFloat(quoteAmount);
  const quoteTarget =
    Number.isFinite(parsed) && parsed > 0 ? parsed : defaultQuoteTarget;

  const quote = useMemo(() => {
    if (!quoteCorridor || !quotePlatform) return null;
    const provider = quoteCorridor.providers[0];
    if (!provider) return null;
    return calculateGrossFromTargetNet({
      targetNetLocal: quoteTarget,
      platformFeePercent: quotePlatform.feePercent,
      channelSpread: provider.fxSpread,
      baseRate: quoteCorridor.rate,
      fixedFeeUSD: provider.fixedFeeUSD,
      intermediaryCutUSD: quoteCorridor.intermediaryUsd,
      landingFeeLocal: quoteCorridor.landingFeeLocal,
      taxWithholdingRate: quoteCorridor.taxRate,
    });
  }, [quoteCorridor, quotePlatform, quoteTarget]);

  // ---------------------------------------------------------------------
  // Provider comparison matrix
  // ---------------------------------------------------------------------
  /** Union of every published provider id, so columns are stable. */
  const providerIds = useMemo(() => {
    const seen = new Map<string, string>();
    for (const corridor of corridors) {
      for (const provider of corridor.providers) {
        if (!seen.has(provider.id)) seen.set(provider.id, provider.name);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [corridors]);

  const [sortKey, setSortKey] = useState<SortKey>("corridor");
  const [ascending, setAscending] = useState(true);

  /**
   * All-in cost of one provider on one corridor, as a percent of the benchmark
   * gross: the flat clearing fee plus the FX spread charged on $1,000. Mirrors
   * the banking-layer methodology `lib/clearingTerminal.ts` uses for the
   * registry, so the matrix and the clearing table can never disagree.
   */
  const allInPercent = (
    corridor: DashboardCorridor,
    providerId: string
  ): number | null => {
    const provider = corridor.providers.find((item) => item.id === providerId);
    if (!provider) return null;
    const cost = provider.fixedFeeUSD + provider.fxSpread * 1000;
    return (cost / 1000) * 100;
  };

  const rows = useMemo(() => {
    const sorted = [...corridors];
    sorted.sort((a, b) => {
      if (sortKey === "corridor") {
        return ascending
          ? a.pair.localeCompare(b.pair)
          : b.pair.localeCompare(a.pair);
      }
      const left = allInPercent(a, sortKey);
      const right = allInPercent(b, sortKey);
      // Unaudited cells always sort last, in both directions.
      if (left === null && right === null) return a.pair.localeCompare(b.pair);
      if (left === null) return 1;
      if (right === null) return -1;
      const delta = left - right;
      return ascending ? delta : -delta;
    });
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corridors, sortKey, ascending]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setAscending((value) => !value);
      return;
    }
    setSortKey(key);
    setAscending(key !== "corridor");
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (ascending ? "↑" : "↓") : "";

  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return ascending ? "ascending" : "descending";
  };

  if (!firstCorridor) return null;

  return (
    <div className="w-full min-w-0">
      {/* ---------------------------------------------------------------- *
       * Hero — value proposition and the two ways in.
       * ---------------------------------------------------------------- */}
      <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 sm:p-8 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          {t("dashboardEyebrow")}
        </p>
        <h1 className="mt-4 max-w-3xl text-balance text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
          {t("dashboardTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          {t("dashboardSubcopy")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-emerald-600"
          >
            {t("dashboardCtaAudit")}
          </Link>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] px-4 py-2 text-sm font-semibold text-black/70 transition-colors duration-200 ease-out hover:bg-black/[0.04] dark:border-white/[0.12] dark:text-white/75 dark:hover:bg-white/[0.06]"
          >
            {t("dashboardCtaData")}
            <span aria-hidden="true" className="opacity-60">
              ↗
            </span>
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------------- *
       * Tier badge — Simple Tier is the open, decision-grade surface.
       * ---------------------------------------------------------------- */}
      <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
          {t("dashboardTierSimple")}
        </h2>
        <p className="text-xs text-black/45 dark:text-white/45">
          {t("dashboardTierSimpleHint")}
        </p>
      </div>

      {/* ---------------------------------------------------------------- *
       * KPI strip — four build-time totals, tabular-nums throughout.
       * ---------------------------------------------------------------- */}
      <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label={t("dashboardKpiCorridors")} value={String(kpis.corridorsAudited)} />
        <KpiTile
          label={t("dashboardKpiProviders")}
          value={String(kpis.providersBenchmarked)}
        />
        <KpiTile
          label={t("dashboardKpiCheapest")}
          value={`${kpis.cheapestFeePercent.toFixed(2)}%`}
          accent="emerald"
        />
        <KpiTile
          label={t("dashboardKpiPriciest")}
          value={`${kpis.priciestFeePercent.toFixed(2)}%`}
          accent="amber"
        />
      </dl>

      {/* ---------------------------------------------------------------- *
       * Live corridor quick-quote
       * ---------------------------------------------------------------- */}
      <section
        aria-labelledby="quick-quote-heading"
        className="mt-5 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors duration-200 sm:p-5 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md"
      >
        <h3
          id="quick-quote-heading"
          className="text-sm font-bold tracking-tight text-black dark:text-white"
        >
          {t("dashboardQuickQuoteTitle")}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-black/50 dark:text-white/50">
          {t("dashboardQuickQuoteLead")}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-black/70 dark:text-white/70">
              {t("dashboardWaterfallCorridor")}
            </span>
            <select
              value={quoteCorridor.slug}
              onChange={(event) => setQuoteSlug(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            >
              {corridors.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.flag} {item.pair} · {item.country}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-black/70 dark:text-white/70">
              {t("targetNetDeposit")} ({quoteCorridor.symbol})
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={50}
              value={quoteAmount}
              onChange={(event) => setQuoteAmount(event.target.value)}
              placeholder={String(defaultQuoteTarget)}
              className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            />
          </label>
        </div>

        {quote?.feasible ? (
          <dl className="mt-4 divide-y divide-black/[0.06] text-sm dark:divide-white/[0.08]">
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-black/60 dark:text-white/60">
                {t("rowGross")}
              </dt>
              <dd className="font-mono tabular-nums font-medium text-black dark:text-white">
                {formatUSD(quote.requiredGrossBill)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-black/60 dark:text-white/60">
                {t("dashboardQuoteLeakage")}
              </dt>
              <dd className="font-mono tabular-nums font-medium text-amber-600 dark:text-amber-400">
                − {formatUSD(quote.requiredGrossBill - quote.realizedTakeHomeLocal / quoteCorridor.rate)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-semibold text-black/80 dark:text-white/80">
                {t("rowTakeHome")}
              </dt>
              <dd className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                + {formatUSD(quote.realizedTakeHomeLocal / quoteCorridor.rate)}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      {/* ---------------------------------------------------------------- *
       * Provider comparison matrix
       * ---------------------------------------------------------------- */}
      <section
        aria-labelledby="matrix-heading"
        className="mt-5 rounded-2xl border border-black/[0.06] bg-white shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md"
      >
        <div className="p-4 pb-0 sm:p-5 sm:pb-0">
          <h3
            id="matrix-heading"
            className="text-sm font-bold tracking-tight text-black dark:text-white"
          >
            {t("dashboardMatrixTitle")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-black/50 dark:text-white/50">
            {t("dashboardMatrixLead")}
          </p>
        </div>

        <div className="mt-4 max-h-[28rem] overflow-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">{t("dashboardMatrixTitle")}</caption>
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm dark:bg-slate-800/95">
              <tr>
                <th
                  scope="col"
                  aria-sort={ariaSort("corridor")}
                  className="border-b border-black/[0.06] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/[0.08] dark:text-white/50"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("corridor")}
                    className="inline-flex items-center gap-1 transition-colors duration-150 ease-out hover:text-black dark:hover:text-white"
                  >
                    {t("dashboardMatrixProvider")}
                    <span aria-hidden="true">{sortIndicator("corridor")}</span>
                  </button>
                </th>
                {providerIds.map((provider) => (
                  <th
                    key={provider.id}
                    scope="col"
                    aria-sort={ariaSort(provider.id)}
                    className="border-b border-black/[0.06] px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/[0.08] dark:text-white/50"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(provider.id)}
                      className="inline-flex items-center gap-1 transition-colors duration-150 ease-out hover:text-black dark:hover:text-white"
                    >
                      {provider.name}
                      <span aria-hidden="true">{sortIndicator(provider.id)}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((corridor) => {
                const cells = providerIds
                  .map((provider) => ({
                    id: provider.id,
                    value: allInPercent(corridor, provider.id),
                  }))
                  .filter((cell): cell is { id: string; value: number } =>
                    cell.value !== null
                  );
                const best = cells.reduce<number | null>(
                  (min, cell) => (min === null || cell.value < min ? cell.value : min),
                  null
                );

                return (
                  <tr
                    key={corridor.slug}
                    className="transition-colors duration-150 ease-out hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  >
                    <th scope="row" className="px-4 py-2.5 text-left font-normal">
                      <Link
                        href={localizedCorridorHref(lang, corridor.slug)}
                        className="inline-flex items-center gap-1.5 text-black/75 transition-colors duration-150 ease-out hover:text-emerald-600 dark:text-white/80 dark:hover:text-emerald-400"
                      >
                        <span aria-hidden="true">{corridor.flag}</span>
                        <span className="font-mono text-xs font-medium">
                          {corridor.pair}
                        </span>
                        <span className="sr-only">
                          {t("dashboardCtaAudit")} — {corridor.country}
                        </span>
                      </Link>
                    </th>
                    {providerIds.map((provider) => {
                      const value = allInPercent(corridor, provider.id);
                      const isBest =
                        value !== null && best !== null && value === best;
                      return (
                        <td
                          key={provider.id}
                          className={`px-3 py-2.5 text-right font-mono text-xs tabular-nums ${
                            value === null
                              ? "text-black/25 dark:text-white/25"
                              : isBest
                                ? "font-bold text-emerald-600 dark:text-emerald-400"
                                : "text-black/60 dark:text-white/60"
                          }`}
                        >
                          {value === null ? "—" : `${value.toFixed(2)}%`}
                          {isBest ? (
                            <span className="sr-only">
                              {" "}
                              {t("dashboardMatrixBest")}
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** One KPI tile: tabular-nums value, hairline card, optional accent. */
function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber";
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-black/45 dark:text-white/45">
        {label}
      </dt>
      <dd
        className={`mt-1.5 font-mono text-2xl font-bold tabular-nums tracking-tight ${
          accent === "emerald"
            ? "text-emerald-600 dark:text-emerald-400"
            : accent === "amber"
              ? "text-amber-600 dark:text-amber-400"
              : "text-black dark:text-white"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
