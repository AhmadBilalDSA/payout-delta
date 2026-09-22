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
import { getPartnerConfig } from "@/data/affiliatePartners";

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
  const { t, lang } = useLanguage();
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

  const exportLabels = {
    breakdown: t("copyAuditBreakdown"),
    reddit: t("redditExporter"),
    social: t("socialExporter"),
    copiedReddit: t("copiedReddit"),
    copiedSocial: t("copiedSocial"),
  };

  async function copyViral(kind: "reddit" | "social"): Promise<void> {
    const payload = buildViralPayload(
      mode,
      verdict,
      inverseVerdict,
      corridor,
      platform,
      quotes
    );
    if (!payload || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        kind === "reddit" ? payload.reddit : payload.social
      );
    } catch {
      return;
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
              <AuditExportMenu labels={exportLabels} onCopy={copyViral} />
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

  // Phase 3 — high-intent affiliate engine: partner config + wire penalty.
  const partner = getPartnerConfig(best.channelId);
  const wireQuote = quotes.find((quote) => quote.channelId === "swift");
  const wireSavings =
    wireQuote === undefined
      ? 0
      : Math.max(0, best.localAmount - wireQuote.localAmount);
  const ctaLabel =
    partner.kind === "affiliate"
      ? lang === "en"
        ? partner.claimCopy
        : `${t("claimRateVia")} ${best.channelName} →`
      : partner.claimCopy;

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
              <AuditExportMenu labels={exportLabels} onCopy={copyViral} />
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

          {/* Phase 3 — high-intent partner referral card + regulatory
              disclosures. Affiliate rails get a sponsored outbound CTA with
              trust markers and the wire-penalty callout; unpartnered rails
              surface a neutral bank advisory instead. */}
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4">
            {partner.kind === "affiliate" ? (
              <>
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  title={partner.disclosure}
                  className="group inline-flex w-full items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.99] sm:w-auto sm:min-w-[320px]"
                >
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                      {partner.partnerBadge}
                    </span>
                    <span>{ctaLabel}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lg leading-none transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </a>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-emerald-300/90">
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true" className="text-emerald-400">
                      ✓
                    </span>
                    {t("zeroHiddenMarkup")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true" className="text-emerald-400">
                      ✓
                    </span>
                    {t("regulatedSettlement")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true" className="text-emerald-400">
                      ✓
                    </span>
                    {t("directPayout")}
                  </span>
                </div>

                {wireSavings > 0 && (
                  <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold tabular-nums text-amber-300">
                    {t("avoidWirePenalty")} — Save{" "}
                    {formatLocal(wireSavings, corridor)}
                  </p>
                )}

                <p className="mt-3 text-[10px] leading-relaxed text-white/40">
                  {partner.disclosure}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">
                  {partner.partnerBadge}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  {partner.disclosure}
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-white/40">
                  {partner.claimCopy}.
                </p>
              </>
            )}
          </div>

          {partner.kind === "affiliate" && (
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              {t("affiliateDisclaimer")}
            </p>
          )}
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

/**
 * Phase 6 — 1-click viral exporters. Two drop-in copy targets sharing one
 * payload builder: a Reddit markdown audit table and an X / LinkedIn
 * one-liner. All numbers come from the live verdict/quotes so the exported
 * figures always match the on-screen audit.
 */
interface ExportLabels {
  breakdown: string;
  reddit: string;
  social: string;
  copiedReddit: string;
  copiedSocial: string;
}

function AuditExportMenu({
  labels,
  onCopy,
}: {
  labels: ExportLabels;
  onCopy: (kind: "reddit" | "social") => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleCopy(kind: "reddit" | "social"): Promise<void> {
    setOpen(false);
    await onCopy(kind);
    setFeedback(kind === "reddit" ? labels.copiedReddit : labels.copiedSocial);
    window.setTimeout(() => setFeedback(null), 2000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-live="polite"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.08] px-4 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-white/[0.16]"
      >
        {feedback ? (
          <span className="text-emerald-300">{feedback}</span>
        ) : (
          <>
            <span aria-hidden="true" className="text-[10px] leading-none opacity-70">
              ▼
            </span>
            {labels.breakdown}
          </>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label={labels.breakdown}
            className="absolute right-0 z-20 mt-2 w-72 origin-top-right rounded-xl border border-white/[0.1] bg-[#16161B] p-1.5 shadow-2xl shadow-black/50"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleCopy("reddit");
              }}
              className="flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.08]"
            >
              <span className="text-xs font-semibold text-white">
                {labels.reddit}
              </span>
              <span className="text-[10px] leading-relaxed text-white/50">
                r/freelance · r/Upwork · r/pakistan · r/developersIndia
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleCopy("social");
              }}
              className="flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.08]"
            >
              <span className="text-xs font-semibold text-white">
                {labels.social}
              </span>
              <span className="text-[10px] leading-relaxed text-white/50">
                X · LinkedIn
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function fmtInt(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

function buildViralPayload(
  mode: CalcMode,
  verdict: Verdict,
  inverseVerdict: InverseVerdict,
  corridor: Corridor,
  platform: Platform,
  quotes: ChannelQuote[]
): { reddit: string; social: string } | null {
  const best = verdict.best;
  if (best === null) {
    return null;
  }
  const swiftQuote = quotes.find((quote) => quote.channelId === "swift");
  const gross = Math.round(best.grossUSD);
  const platformFee = best.platformFeeUSD.toFixed(2);
  const swiftDeduction = (swiftQuote?.feeDeductedUSD ?? 0).toFixed(2);
  const bestNet = fmtInt(best.localAmount);
  const swiftNet = swiftQuote ? fmtInt(swiftQuote.localAmount) : "—";
  const deltaSavings = swiftQuote
    ? fmtInt(best.localAmount - swiftQuote.localAmount)
    : fmtInt(best.localAmount);
  const targetCurrency = corridor.to;
  const countryName = corridor.country;
  const shareUrl = buildShareLink(mode, platform, verdict, inverseVerdict);

  const reddit = [
    `**Payout Audit via PayoutDelta (${gross} ${platform.name} → ${targetCurrency})**`,
    `- Gross Billed: $${gross}`,
    `- Platform Commission (${platform.feePercent}%): -$${platformFee}`,
    `- Intermediary SWIFT Wire Cut: -$${swiftDeduction}`,
    `- Net Take-Home (${best.channelName}): ${bestNet} ${targetCurrency}`,
    `- Traditional Bank Wire Net: ${swiftNet} ${targetCurrency}`,
    `- **Leakage Prevented / Saved: ${deltaSavings} ${targetCurrency}**`,
    `*Audit Link: ${shareUrl}*`,
  ].join("\n");

  const social = `Just audited a $${gross} ${platform.name} payout to ${countryName}: ${best.channelName} saves ${deltaSavings} ${targetCurrency} over traditional bank wires. Check your numbers: ${shareUrl}`;

  return { reddit, social };
}