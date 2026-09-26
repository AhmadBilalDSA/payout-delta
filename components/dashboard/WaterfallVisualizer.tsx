"use client";

import { useMemo, useState } from "react";

import type {
  DashboardCorridor,
  DashboardPlatform,
} from "@/components/dashboard/payload";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useBaseCurrency } from "@/components/providers/BaseCurrencyProvider";
import { calculateGrossFromTargetNet } from "@/lib/calculatorEngine";

/**
 * PayoutDelta — Dashboard v3 seven-step fee waterfall.
 *
 * PROVENANCE OF THE MATH
 * Every figure is produced by `calculateGrossFromTargetNet` in
 * `lib/calculatorEngine.ts` — the same closed-form gross-up solver the main fee
 * auditor uses. This component never re-derives a fee: it assembles the
 * solver's inputs, calls it once in a `useMemo`, and maps the returned
 * `GrossUpResult` onto seven bars. Change the engine and this chart follows
 * automatically, which is the entire point of reusing it.
 *
 * WHY THE CASCADE TIES OUT EXACTLY
 * The solver is an inversion, so the seven layers telescope by construction:
 *
 *   gross − platform − intermediary − (fixed fee + FX spread) − landing
 *         − withholding ≡ net received
 *
 * Each deduction is deducted once and only once — the provider's flat clearing
 * fee and its FX spread are charged inside the conversion bar (with the split
 * printed underneath) because the seven-row shape has no separate row for a
 * flat fee, and folding it into the neighbouring row is the only arrangement
 * where the arithmetic still balances to the cent. Withholding is converted to
 * USD at the interbank reference rate so every bar shares one unit; the local
 * take-home — the number that actually lands in the account — is printed in
 * full beneath the final bar.
 *
 * ANIMATION
 * A hand-rolled CSS keyframe, staggered per row, gated behind
 * `prefers-reduced-motion: no-preference`. The bars are painted at their FINAL
 * width in the server-rendered HTML and the animation only ever transforms
 * them, so a reduced-motion visitor, a crawler and a JS-disabled browser all
 * get the same complete, correct chart rather than an empty one.
 *
 * BUNDLE
 * `import type` only from the payload module, and a value import of nothing
 * but the calculator engine plus its `safeMath` guard. The 131-corridor fee
 * dataset and the statutory bank directory stay on the server.
 */

/** Per-row bar geometry, resolved from one solver result. */
interface WaterfallStep {
  key: "gross" | "platform" | "intermediary" | "conversion" | "landing" | "withholding" | "net";
  /** Share of gross this bar occupies (0–100). */
  pct: number;
  /** Signed USD-equivalent amount. */
  usd: number;
  /** Optional second line under the amount. */
  detail?: string;
  /** True for the two totals (gross in, net out) rather than a deduction. */
  total?: boolean;
}

/**
 * Formats a USD-equivalent amount in the reader's settlement currency.
 *
 * Phase 2 — the waterfall's bar geometry is computed in USD so the proportions
 * stay identical no matter which currency is selected; only the printed figure
 * is re-based. That separation is deliberate: a reader who switches to AED must
 * see the same *shape* of loss, not a re-solved one.
 */
function formatRebased(
  value: number,
  format: (usd: number, dp?: number) => string
): string {
  return format(Number.isFinite(value) ? value : 0);
}

/** Formats a domestic-currency amount, degrading gracefully on huge rates. */
function formatLocal(value: number, symbol: string): string {
  const safe = Number.isFinite(value) ? value : 0;
  const digits = safe >= 100000 ? 0 : safe >= 1000 ? 0 : 2;
  return `${symbol}${safe.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export default function WaterfallVisualizer({
  corridors,
  platforms,
}: {
  corridors: DashboardCorridor[];
  platforms: DashboardPlatform[];
}) {
  const { t } = useLanguage();
  const { format, currency, isRebased: rebased } = useBaseCurrency();
  const first = corridors[0];

  const [slug, setSlug] = useState<string>(first?.slug ?? "");
  const [platformId, setPlatformId] = useState<string>(
    platforms.find((p) => p.feePercent > 0)?.id ?? platforms[0]?.id ?? ""
  );
  const [targetInput, setTargetInput] = useState<string>("");

  const corridor = useMemo(
    () => corridors.find((item) => item.slug === slug) ?? first,
    [corridors, slug, first]
  );
  const platform = useMemo(
    () => platforms.find((item) => item.id === platformId) ?? platforms[0],
    [platforms, platformId]
  );

  /**
   * The cheapest provider on the corridor, ranked on the same three layers the
   * solver charges: flat fee plus FX spread as a share of the benchmark. This
   * is the route the waterfall audits, and the one the matrix highlights.
   */
  const provider = useMemo(() => {
    if (!corridor || corridor.providers.length === 0) return null;
    // Flat clearing fee plus the FX spread charged on a $1,000 benchmark —
    // the same three layers the solver deducts, so "cheapest" here is the
    // route the chart below actually prices.
    const cost = (item: DashboardCorridor["providers"][number]): number =>
      item.fixedFeeUSD + item.fxSpread * 1000;
    return corridor.providers.reduce((best, item) =>
      cost(item) < cost(best) ? item : best
    );
  }, [corridor]);

  /**
   * Default target: the domestic equivalent of a $1,000 invoice at the
   * interbank rate. Always positive, so the solver is never handed a
   * degenerate input and the chart never renders its all-zero fallback.
   */
  const defaultTarget = corridor ? Math.round(corridor.rate * 1000) : 0;
  const targetNet = Number.parseFloat(targetInput);
  const target = Number.isFinite(targetNet) && targetNet > 0 ? targetNet : defaultTarget;

  const result = useMemo(() => {
    if (!corridor || !platform || !provider) return null;
    return calculateGrossFromTargetNet({
      targetNetLocal: target,
      platformFeePercent: platform.feePercent,
      channelSpread: provider.fxSpread,
      baseRate: corridor.rate,
      fixedFeeUSD: provider.fixedFeeUSD,
      intermediaryCutUSD: corridor.intermediaryUsd,
      landingFeeLocal: corridor.landingFeeLocal,
      taxWithholdingRate: corridor.taxRate,
    });
  }, [corridor, platform, provider, target]);

  const steps = useMemo<WaterfallStep[]>(() => {
    if (!corridor || !provider || !result?.feasible) return [];
    const gross = result.requiredGrossBill;
    if (gross <= 0) return [];

    // Withholding and take-home are local-currency figures; converting both at
    // the interbank rate puts every bar in the same USD-equivalent unit.
    const withholdingUsd = corridor.rate > 0 ? result.taxWithholdingLocal / corridor.rate : 0;
    const netUsd = corridor.rate > 0 ? result.realizedTakeHomeLocal / corridor.rate : 0;
    const conversionUsd = provider.fixedFeeUSD + result.spreadLeakageUsd;
    const share = (usd: number) => Math.max(0, Math.min(100, (usd / gross) * 100));

    return [
      { key: "gross", pct: 100, usd: gross, total: true },
      { key: "platform", pct: share(result.platformCutUsd), usd: result.platformCutUsd },
      { key: "intermediary", pct: share(corridor.intermediaryUsd), usd: corridor.intermediaryUsd },
      {
        key: "conversion",
        pct: share(conversionUsd),
        usd: conversionUsd,
        detail: `${provider.name} · ${(provider.fxSpread * 100).toFixed(2)}% FX + ${formatRebased(provider.fixedFeeUSD, format)} fee`,
      },
      {
        key: "landing",
        pct: share(corridor.rate > 0 ? corridor.landingFeeLocal / corridor.rate : 0),
        usd: corridor.rate > 0 ? corridor.landingFeeLocal / corridor.rate : 0,
      },
      { key: "withholding", pct: share(withholdingUsd), usd: withholdingUsd },
      {
        key: "net",
        pct: share(netUsd),
        usd: netUsd,
        total: true,
        detail: formatLocal(result.realizedTakeHomeLocal, corridor.symbol),
      },
    ];
  }, [corridor, provider, result, format]);

  if (!corridor || !provider || !platform || steps.length === 0) {
    return null;
  }

  const labelFor = (key: WaterfallStep["key"]): string => {
    switch (key) {
      case "gross":
        return t("rowGross");
      case "platform":
        return t("rowPlatformCut");
      case "intermediary":
        return t("rowIntermediary");
      case "conversion":
        return t("rowConversion");
      case "landing":
        return t("rowLandingFee");
      case "withholding":
        return t("rowWithholding");
      case "net":
        return t("rowTakeHome");
    }
  };

  return (
    <section
      aria-labelledby="waterfall-heading"
      className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors duration-200 sm:p-5 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id="waterfall-heading"
          className="text-sm font-bold tracking-tight text-black dark:text-white"
        >
          {t("waterfallTitle")}
        </h3>
        <p className="text-xs text-black/50 dark:text-white/50">
          {corridor.pair} · {t("targetNetDeposit")}
        </p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-black/50 dark:text-white/50">
        {t("dashboardWaterfallLead")}
      </p>

      {/* Controls — the two dimensions the solver actually inverts over. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            {t("dashboardWaterfallCorridor")}
          </span>
          <select
            value={corridor.slug}
            onChange={(event) => setSlug(event.target.value)}
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
            {t("clientPlatform")}
          </span>
          <select
            value={platform.id}
            onChange={(event) => setPlatformId(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          >
            {platforms.map((item) => (
              <option key={item.id} value={item.id}>
                {t(item.labelKey)} · {item.feePercent}%
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            {t("targetNetDeposit")} ({corridor.symbol})
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={50}
            value={targetInput}
            onChange={(event) => setTargetInput(event.target.value)}
            placeholder={String(defaultTarget)}
            className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          />
        </label>
      </div>

      {/* The cascade. Bars paint at final width; the keyframe only transforms. */}
      <ol className="mt-5 space-y-2.5">
        {steps.map((step, index) => {
          const isTotal = step.total === true;
          return (
            <li
              key={step.key}
              className="pd-cascade"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`truncate text-xs ${
                    isTotal
                      ? "font-semibold text-black/85 dark:text-white/85"
                      : "text-black/60 dark:text-white/60"
                  }`}
                >
                  {labelFor(step.key)}
                </span>
                <span
                  className={`shrink-0 font-mono text-xs tabular-nums ${
                    step.key === "net"
                      ? "font-bold text-emerald-600 dark:text-emerald-400"
                      : isTotal
                        ? "font-semibold text-black dark:text-white"
                        : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {isTotal ? "+ " : "− "}
                  {formatRebased(step.usd, format)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                <div
                  aria-hidden="true"
                  className={`h-full rounded-full ${
                    step.key === "net"
                      ? "bg-emerald-500"
                      : isTotal
                        ? "bg-slate-400 dark:bg-slate-500"
                        : "bg-amber-500/80"
                  }`}
                  style={{ width: `${step.pct}%` }}
                />
              </div>
              {step.detail ? (
                <p className="mt-1 font-mono text-[11px] tabular-nums tracking-tight text-black/40 dark:text-white/40">
                  {step.detail}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[11px] leading-relaxed text-black/45 dark:text-white/45">
        {t("dashboardWaterfallNote")}
      </p>

      {/* Phase 2 — the settlement-currency badge. Present in both states on
          purpose: a USD reader still needs to know the bars are USD, and a
          rebased reader needs the static-rate caveat to travel with the
          figures rather than live only in the header. */}
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
          {currency}
        </span>
        <span className="text-black/45 dark:text-white/45">
          {rebased ? t("rebasedNotice") : t("staticRateBadge")}
        </span>
      </p>

      {/* Scoped, dependency-free motion. The `no-preference` guard is what
          makes the chart static for reduced-motion visitors. */}
      <style>{`
        @keyframes pd-dash-rise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .pd-cascade {
            animation: pd-dash-rise 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        }
      `}</style>
    </section>
  );
}
