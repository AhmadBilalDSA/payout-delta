"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  CalcMode,
  ChannelQuote,
  Corridor,
  HistoryPoint,
  Platform,
  SparklineStats,
  WithdrawalChannel,
} from "@/lib/types";
import {
  clampGrossUSD,
  computeRoute,
  DEFAULT_GROSS_USD,
} from "@/utils/calculateRoute";
import {
  computeInverseRoute,
  localSliderBounds,
} from "@/utils/inverseMath";
import { formatUSD } from "@/utils/format";
import VerdictCard from "@/components/VerdictCard";
import SliderControls from "@/components/SliderControls";
import FeeBreakdownList from "@/components/FeeBreakdownList";
import TaxImpactCard from "@/components/TaxImpactCard";
import TransactionCostingWidget from "@/components/TransactionCostingWidget";
import AuditReceipt from "@/components/AuditReceipt";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Interactive payout auditor (client island) — Apple-grade, iOS-feel.
 *
 * Phase 3 adds the operating-mode capsule on top of the Milestone 2 surface:
 *
 *   - gross → net ("Quote Audit")  — Phase 1/2 forward pipeline untouched.
 *   - net → gross ("Target Goal")  — inverse deduction solver; the slider
 *     drives a target local payout and the VerdictCard reports the exact USD
 *     invoice required per platform/channel.
 *
 * Both pipelines are `useMemo`-memoized single passes over the same two inputs
 * (amount/target + platform), so re-renders are O(1) and INP stays well under
 * 50ms. No requests, no external fetches — static export budget intact.
 *
 * Provider identities render as typographic monograms + names only under
 * nominative fair use; the mandatory legal line sits beneath the calculator.
 */

function defaultTargetNet(corridor: Corridor): number {
  return Math.max(1, Math.round(DEFAULT_GROSS_USD * corridor.rate));
}

export default function Calculator({
  corridor,
  platforms,
  channels,
  history,
  sparklineStats,
  platformPreset,
}: {
  corridor: Corridor;
  platforms: Platform[];
  channels: WithdrawalChannel[];
  history: HistoryPoint[];
  sparklineStats: SparklineStats;
  /** Long-tail platform preset (e.g. `upwork`), optional for generic routes. */
  platformPreset?: string;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<CalcMode>("gross-to-net");
  const [amount, setAmount] = useState<number>(DEFAULT_GROSS_USD);
  const [targetNet, setTargetNet] = useState<number>(() =>
    defaultTargetNet(corridor)
  );
  const [platformId, setPlatformId] = useState<string>(() => {
    if (platformPreset && platforms.some((item) => item.id === platformPreset)) {
      return platformPreset;
    }
    return platforms[0]?.id ?? "upwork";
  });
  const [printQuote, setPrintQuote] = useState<ChannelQuote | null>(null);

  const platform =
    platforms.find((item) => item.id === platformId) ?? platforms[0];

  const route = useMemo(
    () => computeRoute(amount, platform, corridor, channels),
    [amount, platform, corridor, channels]
  );

  const inverseRoute = useMemo(
    () => computeInverseRoute(targetNet, platform, corridor, channels),
    [targetNet, platform, corridor, channels]
  );

  const isTarget = mode === "net-to-gross";

  // Live tax-impact snapshot: whatever the active mode considers "the quote"
  // (forward best channel vs inverse cheapest invoice) becomes the input for
  // the TaxImpactCard, so its math never disagrees with the VerdictCard.
  const taxSnapshot = useMemo(() => {
    if (isTarget) {
      const quote = inverseRoute.verdict.best ?? inverseRoute.quotes[0];
      if (!quote) return null;
      return {
        grossUSD: quote.grossRequired,
        grossLocal: quote.grossRequired * corridor.rate,
        netLocalPreTax: Math.max(0, quote.targetNetLocal),
        channelCutUSD: quote.totalCostUSD,
        channelName: quote.channelName,
        effectiveRate: quote.effectiveRate,
      };
    }
    const quote = route.verdict.best ?? route.quotes[0];
    if (!quote) return null;
    return {
      grossUSD: amount,
      grossLocal: amount * corridor.rate,
      netLocalPreTax: quote.localAmount,
      channelCutUSD: quote.totalCostUSD,
      channelName: quote.channelName,
      effectiveRate: quote.effectiveRate,
    };
  }, [isTarget, inverseRoute, route, amount, corridor]);

  const targetBounds = useMemo(() => localSliderBounds(corridor), [corridor]);

  // Phase 8 — the TransactionCostingWidget anchors its 7-step settlement
  // waterfall on whatever quote the active mode already declared "best"
  // (matching the TaxImpactCard), so every figure agrees with the verdict.
  const costingAnchor = useMemo(() => {
    if (isTarget) {
      const quote = inverseRoute.verdict.best ?? inverseRoute.quotes[0];
      if (!quote) return null;
      return {
        grossUSD: quote.grossRequired,
        platformFeeUSD: quote.platformFeeUSD,
        effectiveRate: quote.effectiveRate,
        channelName: quote.channelName,
      };
    }
    const quote = route.verdict.best ?? route.quotes[0];
    if (!quote) return null;
    return {
      grossUSD: amount,
      platformFeeUSD: quote.platformFeeUSD,
      effectiveRate: quote.effectiveRate,
      channelName: quote.channelName,
    };
  }, [isTarget, inverseRoute, route, amount]);

  // Phase 7 refresh — "Share calculation" deep-link hydration. When the page
  // loads with `?mode=&platform=&gross=` / `?mode=&platform=&target=` query
  // params (copied from the VerdictCard share button), restore that exact
  // operating state once on mount.
  useEffect(() => {
    const hydrate = () => {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode");
      if (modeParam === "quote") {
        setMode("gross-to-net");
      } else if (modeParam === "target") {
        setMode("net-to-gross");
      }
      const platformParam = params.get("platform");
      if (platformParam && platforms.some((item) => item.id === platformParam)) {
        setPlatformId(platformParam);
      }
      const grossParam = Number(params.get("gross"));
      if (Number.isFinite(grossParam) && grossParam > 0) {
        setAmount(clampGrossUSD(grossParam));
      }
      const targetParam = Number(params.get("target"));
      if (Number.isFinite(targetParam) && targetParam > 0) {
        setTargetNet(clampLocalTarget(targetParam, localSliderBounds(corridor)));
      }
    };
    const id = window.setTimeout(hydrate, 0);
    return () => window.clearTimeout(id);
  }, [corridor, platforms]);

  // When an export is requested, give the print-only receipt one frame to
  // mount, then open the native Save-as-PDF dialog. After the dialog closes,
  // tear the receipt back down so the screen DOM returns to normal.
  useEffect(() => {
    if (printQuote === null) {
      return;
    }
    const printId = window.setTimeout(() => window.print(), 60);
    const handleAfterPrint = () => setPrintQuote(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.clearTimeout(printId);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printQuote]);

  return (
    <div className="flex w-full flex-col gap-6">
      {/* BLUF verdict sits ABOVE the inputs — answer first, knobs second. */}
      <VerdictCard
        verdict={route.verdict}
        corridor={corridor}
        quotes={route.quotes}
        platform={platform}
        mode={mode}
        inverseVerdict={inverseRoute.verdict}
        history={history}
        sparklineStats={sparklineStats}
      />

      {/* iOS-style amount pills, slider, mode capsule & platform switcher. */}
      <SliderControls
        mode={mode}
        onModeChange={setMode}
        amount={amount}
        onAmountChange={(value) => setAmount(clampGrossUSD(value))}
        targetNet={targetNet}
        onTargetNetChange={setTargetNet}
        platformId={platformId}
        onPlatformChange={setPlatformId}
        platforms={platforms}
        corridor={corridor}
      />

      {isTarget ? (
        <section aria-labelledby="required-invoice-breakdown">
          <h2
            id="required-invoice-breakdown"
            className="text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40"
          >
            {t("requiredInvoiceTitle")}
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {inverseRoute.quotes.map((quote, index) => (
              <div
                key={quote.channelId}
                className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-[#15151A] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs font-bold text-black/60 ring-1 ring-black/[0.06] dark:bg-neutral-800 dark:text-white/70 dark:ring-white/[0.08]"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-black dark:text-white">
                      {quote.channelName}
                    </p>
                    <p className="text-xs tabular-nums text-black/[0.45] dark:text-white/[0.45]">
                      {quote.effectiveRate.toFixed(4)} {corridor.to} ·{" "}
                      {t("allInCostPercent", {
                        pct: quote.totalCostPercent.toFixed(2),
                      })}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-black dark:text-white sm:text-right">
                  {t("invoiceRequired", { amount: formatUSD(quote.grossRequired) })}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section aria-labelledby="fee-breakdown">
          <h2
            id="fee-breakdown"
            className="text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40"
          >
            {t("feeBreakdownTitle")}
          </h2>
          <div className="mt-3">
            <FeeBreakdownList
              quotes={route.quotes}
              corridor={corridor}
              onExport={setPrintQuote}
            />
          </div>
        </section>
      )}

      {/* Interactive tax & net take-home impact — beneath the verdict and the
          ranked breakdown. Binds live to the parent amount/target state. */}
      {taxSnapshot !== null && (
        <TaxImpactCard
          corridor={corridor}
          mode={mode}
          invoiceValue={isTarget ? targetNet : amount}
          onInvoiceChange={(value) => {
            if (isTarget) {
              setTargetNet(clampLocalTarget(value, targetBounds));
            } else {
              setAmount(clampGrossUSD(value));
            }
          }}
          grossUSD={taxSnapshot.grossUSD}
          grossLocal={taxSnapshot.grossLocal}
          netLocalPreTax={taxSnapshot.netLocalPreTax}
          channelCutUSD={taxSnapshot.channelCutUSD}
          channelName={taxSnapshot.channelName}
          effectiveRate={taxSnapshot.effectiveRate}
        />
      )}

      {/* Phase 8 — local bank settlement & custom costing under the ranked
          breakdown and tax card, shared by every corridor page variant. */}
      {costingAnchor !== null && (
        <TransactionCostingWidget corridor={corridor} {...costingAnchor} />
      )}

      {/* Nominative fair use — mandatory legal line. */}
      <p className="text-xs leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
        {t("legalLine")}
      </p>

      {/* Print-only audit receipt, mounted the instant an export is asked for
          (becomes the sole visible content inside the Save-as-PDF dialog). */}
      {printQuote !== null && (
        <div className="hidden print:block">
          <AuditReceipt
            quote={printQuote}
            corridor={corridor}
            platform={platform}
          />
        </div>
      )}
    </div>
  );
}

/** Clamps a free-typed local target into the corridor's inverse bounds. */
function clampLocalTarget(
  value: number,
  bounds: { min: number; max: number; step: number }
): number {
  if (!Number.isFinite(value)) {
    return bounds.min;
  }
  const clamped = Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
  const stepped =
    bounds.step > 0
      ? bounds.min + Math.round((clamped - bounds.min) / bounds.step) * bounds.step
      : clamped;
  return Math.min(bounds.max, Math.max(bounds.min, stepped));
}