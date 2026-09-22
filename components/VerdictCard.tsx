"use client";

import { useState } from "react";
import type {
  CalcMode,
  ChannelQuote,
  Corridor,
  HistoryPoint,
  InverseVerdict,
  Platform,
  SparklineStats,
  Verdict,
} from "@/lib/types";
import { formatLocal, formatUSD } from "@/utils/format";
import RateSparkline from "@/components/RateSparkline";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { platformUiKey } from "@/lib/i18n/helpers";

/**
 * Obsidian hero verdict card — an Apple Wallet / dark macOS-widget look.
 *
 * Phase 3 adds the "Target Goal" (net → gross) operating mode on top of the
 * original quote-audit hero. Phase 7 refresh binds every string to the global
 * dictionary and adds a "Share calculation" deep link that encodes the exact
 * operating state (mode, platform, amount/target) so `Calculator` can hydrate
 * from the URL query on arrival.
 *
 * Provider identities appear strictly under nominative fair use for factual
 * cost comparison; no third-party logos.
 */
export default function VerdictCard({
  verdict,
  corridor,
  quotes,
  platform,
  mode,
  inverseVerdict,
  history,
  sparklineStats,
}: {
  verdict: Verdict;
  corridor: Corridor;
  quotes: ChannelQuote[];
  platform: Platform;
  mode: CalcMode;
  inverseVerdict: InverseVerdict;
  history: HistoryPoint[];
  sparklineStats: SparklineStats;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  async function copyAudit(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    const auditText =
      mode === "net-to-gross"
        ? buildTargetAudit(inverseVerdict, corridor)
        : buildQuoteAudit(verdict, corridor, platform);
    if (!auditText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(auditText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function copyShareLink(): Promise<void> {
    if (typeof window === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(buildShareLink(mode, platform, verdict, inverseVerdict));
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      setCopiedShare(false);
    }
  }

  const showSparkline = history.length >= 2;

  if (mode === "net-to-gross") {
    const best = inverseVerdict.best;
    const worst = inverseVerdict.worst;
    if (best === null || worst === null) {
      return null;
    }

    return (
      <section
        aria-label="Invoice requirement verdict"
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0D0D11] p-6 text-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"
        />

        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-400">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse"
            />
            {t("invoiceRequirement")}{" "}
            <span className="tabular-nums">
              {corridor.from} → {corridor.to}
            </span>
          </p>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t("quoteRequired", {
              invoice: formatUSD(best.grossRequired),
              platform: t(platformUiKey(platform.id)),
            })}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {t("toNetExactly", {
              amount: formatLocal(best.targetNetLocal, corridor),
              channel: best.channelName,
            })}
          </p>

          <p className="mt-5 text-xs font-medium uppercase tracking-widest text-white/40">
            {t("targetNetDeposit")}
          </p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-tight tabular-nums text-white sm:text-4xl">
            {formatLocal(best.targetNetLocal, corridor)}
          </p>

          <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold tabular-nums text-violet-300 ring-1 ring-violet-400/20">
                {t("requiresLess", {
                  savings: formatUSD(inverseVerdict.savingsUSD),
                  channel: worst.channelName,
                })}
              </span>
              {inverseVerdict.outOfBounds && (
                <span className="inline-flex items-center rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold tabular-nums text-amber-300 ring-1 ring-amber-400/20">
                  {t("outsideRange")}
                </span>
              )}
            </div>

            {showSparkline && (
              <div className="self-start sm:self-auto">
                <RateSparkline stats={sparklineStats} history={history} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-live="polite"
                onClick={() => {
                  void copyAudit();
                }}
                className={`inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out ${
                  copied
                    ? "border-violet-400/40 bg-violet-400/20 text-violet-300"
                    : "bg-white/[0.08] hover:bg-white/[0.16]"
                }`}
              >
                {copied ? t("copied") : t("copyAudit")}
              </button>
              <button
                type="button"
                aria-live="polite"
                onClick={() => {
                  void copyShareLink();
                }}
                title={t("shareLink")}
                className={`inline-flex h-10 items-center rounded-full border border-white/[0.12] px-4 text-sm font-semibold text-white transition-all duration-200 ease-out ${
                  copiedShare
                    ? "border-violet-400/40 bg-violet-400/20 text-violet-300"
                    : "bg-white/[0.08] hover:bg-white/[0.16]"
                }`}
              >
                <span aria-hidden="true" className="mr-1.5 text-base leading-none">
                  {copiedShare ? "✓" : "⧉"}
                </span>
                {copiedShare ? t("copied") : t("shareLink")}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (verdict.best === null || verdict.worst === null || quotes.length === 0) {
    return null;
  }

  const best = verdict.best;
  const worst = verdict.worst;

  return (
    <section
      aria-label="Best payout channel verdict"
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0D0D11] p-6 text-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
      />

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
          />
          {t("recommendedRoute")}{" "}
          <span className="tabular-nums">
            {corridor.from} → {corridor.to}
          </span>
        </p>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
          {best.channelName}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          {t("netsYouTheMost", {
            amount: formatUSD(best.grossUSD),
            pct: best.totalCostPercent.toFixed(1),
          })}
        </p>

        <p className="mt-5 text-xs font-medium uppercase tracking-widest text-white/40">
          {t("netTakeHome")}
        </p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-tight tabular-nums text-white sm:text-4xl">
          {formatLocal(best.localAmount, corridor)}
        </p>

        <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold tabular-nums text-emerald-400 ring-1 ring-emerald-400/20">
              {t("savedAmount", { savings: formatUSD(verdict.savingsUSD) })}
            </span>
            <span className="text-xs text-white/40">
              {t("vsChannel", { channel: worst.channelName })}
            </span>
          </div>

          {showSparkline && (
            <div className="self-start sm:self-auto">
              <RateSparkline stats={sparklineStats} history={history} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-live="polite"
              onClick={() => {
                void copyAudit();
              }}
              className={`inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out ${
                copied
                  ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-300"
                  : "bg-white/[0.08] hover:bg-white/[0.16]"
              }`}
            >
              {copied ? t("copied") : t("copyAudit")}
            </button>
            <button
              type="button"
              aria-live="polite"
              onClick={() => {
                void copyShareLink();
              }}
              title={t("shareLink")}
              className={`inline-flex h-10 items-center rounded-full border border-white/[0.12] px-4 text-sm font-semibold text-white transition-all duration-200 ease-out ${
                copiedShare
                  ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-300"
                  : "bg-white/[0.08] hover:bg-white/[0.16]"
              }`}
            >
              <span aria-hidden="true" className="mr-1.5 text-base leading-none">
                {copiedShare ? "✓" : "⧉"}
              </span>
              {copiedShare ? t("copied") : t("shareLink")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildShareLink(
  mode: CalcMode,
  platform: Platform,
  verdict: Verdict,
  inverseVerdict: InverseVerdict
): string {
  if (typeof window === "undefined") {
    return "";
  }
  const params = new URLSearchParams();
  if (mode === "net-to-gross") {
    const best = inverseVerdict.best;
    if (!best) {
      return "";
    }
    params.set("mode", "target");
    params.set("platform", platform.id);
    params.set("target", String(Math.round(best.targetNetLocal)));
  } else {
    const best = verdict.best;
    if (!best) {
      return "";
    }
    params.set("mode", "quote");
    params.set("platform", platform.id);
    params.set("gross", String(Math.round(best.grossUSD)));
  }
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function buildQuoteAudit(
  verdict: Verdict,
  corridor: Corridor,
  platform: Platform
): string | null {
  const best = verdict.best;
  const worst = verdict.worst;
  if (best === null || worst === null) {
    return null;
  }
  return [
    "PayoutDelta Audit",
    `${corridor.from} → ${corridor.to} · ${corridor.country}`,
    `Client platform: ${platform.name} (${platform.feePercent}%)`,
    `Gross: ${formatUSD(best.grossUSD)}`,
    `Cheapest provider: ${best.channelName}`,
    `Net take-home: ${formatLocal(best.localAmount, corridor)}`,
    `Total cost: ${best.totalCostPercent.toFixed(2)}%`,
    `Saved vs ${worst.channelName}: +${formatUSD(verdict.savingsUSD)}`,
  ].join("\n");
}

function buildTargetAudit(
  verdict: InverseVerdict,
  corridor: Corridor
): string | null {
  const best = verdict.best;
  const worst = verdict.worst;
  if (best === null || worst === null) {
    return null;
  }
  return [
    "PayoutDelta Target Goal",
    `${corridor.from} → ${corridor.to} · ${corridor.country}`,
    `Target net deposit: ${formatLocal(best.targetNetLocal, corridor)}`,
    `Cheapest invoice: ${best.channelName}`,
    `Required invoice: ${formatUSD(best.grossRequired)}`,
    `All-in cost: ${best.totalCostPercent.toFixed(2)}%`,
    `Bill this much less vs ${worst.channelName}: ${formatUSD(
      verdict.savingsUSD
    )}`,
  ].join("\n");
}