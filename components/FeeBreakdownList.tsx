"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChannelQuote, Corridor } from "@/lib/types";
import { formatLocal, formatUSD } from "@/utils/format";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Ranked, expandable disclosure cards for the per-channel fee math. The
 * top-rated channel earns the emerald `BEST VALUE` badge; every other row is
 * numbered. Expanding a row smoothly discloses the four cost layers:
 *
 *   1. Platform cut          — platform commission off gross USD
 *   2. Fixed clearing / wire — the channel's flat deduction
 *   3. Hidden FX spread      — markup fraction + local-currency penalty
 *   4. Net received          — domestic-bank deposit after all three leaks
 *
 * Provider identities are rendered as clean typographic monograms (no
 * proprietary logos), and the native grid-rows disclosure keeps layout shift
 * at zero, so AdSense CWV stays clean.
 */
export default function FeeBreakdownList({
  quotes,
  corridor,
  onExport,
}: {
  quotes: ChannelQuote[];
  corridor: Corridor;
  onExport: (quote: ChannelQuote) => void;
}) {
  const { t } = useLanguage();
  const [openChannelId, setOpenChannelId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {quotes.map((quote, index) => {
        const isOpen = openChannelId === quote.channelId;
        const spreadFraction =
          corridor.rate > 0 ? 1 - quote.effectiveRate / corridor.rate : 0;
        const spreadPercent = spreadFraction * 100;
        const fxLossUSD = quote.usdConverted * spreadFraction;
        const fxLossLocal = fxLossUSD * quote.effectiveRate;

        return (
          <div
            key={quote.channelId}
            className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 ease-out dark:bg-[#15151A] ${
              isOpen
                ? "border-black/[0.15] shadow-sm dark:border-white/[0.15]"
                : "border-black/[0.06] hover:border-black/[0.15] dark:border-white/[0.08] dark:hover:border-white/[0.15]"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenChannelId(isOpen ? null : quote.channelId)}
              aria-expanded={isOpen}
              aria-controls={`fee-detail-${quote.channelId}`}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs font-bold text-black/60 ring-1 ring-black/[0.06] dark:bg-neutral-800 dark:text-white/70 dark:ring-white/[0.08]"
                  >
                    {channelMonogram(quote.channelName)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-500/20">
                          {t("bestValue")}
                        </span>
                      )}
                      <p className="truncate font-semibold text-black dark:text-white">
                        {quote.channelName}
                      </p>
                    </div>
                    <p className="text-xs tabular-nums text-black/[0.45] dark:text-white/[0.45]">
                      {quote.effectiveRate.toFixed(4)} {corridor.to} ·{" "}
                      {t("spreadLabel", { pct: spreadPercent.toFixed(2) })}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-black dark:text-white">
                      {formatLocal(quote.localAmount, corridor)}
                    </p>
                    <p className="text-xs tabular-nums text-black/[0.45] dark:text-white/[0.45]">
                      <span className={index === 0 ? "text-emerald-600" : ""}>
                        {quote.totalCostPercent.toFixed(1)}%
                      </span>{" "}
                      {t("allInCost")}
                    </p>
                  </div>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={`h-4 w-4 shrink-0 text-black/40 transition-transform duration-200 ease-out dark:text-white/40 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="m5 7.5 5 5 5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </button>

            <div
              id={`fee-detail-${quote.channelId}`}
              className={`grid transition-all duration-200 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <dl className="divide-y divide-black/[0.06] border-t border-black/[0.06] bg-neutral-50/70 px-5 py-2 text-sm dark:divide-white/[0.08] dark:border-white/[0.08] dark:bg-white/[0.03]">
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-black/55 dark:text-white/55">
                      1. {t("platformCut")}
                    </dt>
                    <dd className="tabular-nums font-medium text-black dark:text-white">
                      − {formatUSD(quote.platformFeeUSD)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-black/55 dark:text-white/55">
                      2. {t("fixedClearingFee")}
                    </dt>
                    <dd className="tabular-nums font-medium text-black dark:text-white">
                      − {formatUSD(quote.feeDeductedUSD)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-black/55 dark:text-white/55">
                      3. {t("hiddenFxSpread")}
                    </dt>
                    <dd className="tabular-nums font-medium text-black dark:text-white">
                      {spreadPercent.toFixed(2)}% · −{" "}
                      {formatLocal(fxLossLocal, corridor)}{" "}
                      <span className="text-black/[0.45] dark:text-white/[0.45]">
                        ({formatUSD(fxLossUSD)})
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="font-semibold text-black/80 dark:text-white/80">
                      4. {t("netReceived")}
                    </dt>
                    <dd className="font-bold tabular-nums text-emerald-600">
                      + {formatLocal(quote.localAmount, corridor)}
                    </dd>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => onExport(quote)}
                      className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-neutral-800 dark:bg-white dark:text-black"
                    >
                      {t("exportInvoicePdf")}
                    </button>
                    <Link
                      href={`/invoice/?gross=${Math.round(
                        quote.grossUSD
                      )}&ccy=USD&channel=${encodeURIComponent(
                        quote.channelName
                      )}`}
                      className="rounded-full border border-black/[0.14] bg-white px-4 py-1.5 text-xs font-semibold text-black transition-all duration-200 ease-out hover:border-black/30 hover:bg-neutral-50 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                    >
                      {t("openInInvoice")}
                    </Link>
                    {/*
                      PHASE 2 — RATE-DROP ALERT (requires the managed backend
                      + email opt-in; see lib/db.ts fact_rate_alerts and the
                      daily-rates-sync cron).

                      <button type="button">Set Rate Drop Alert</button>
                    */}
                  </div>
                </dl>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Clean typographic monogram (up to two initials, e.g. "DS", "W", "RE"). */
function channelMonogram(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}