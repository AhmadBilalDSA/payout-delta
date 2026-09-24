import type { ChannelQuote, Corridor, Platform } from "@/lib/types";
import { formatLocal, formatUSD } from "@/utils/format";

/**
 * Pure builder for the one-page "Freelance Invoice Fee Audit Receipt".
 *
 * Deliberately framework-free and synchronous so it can be unit-tested and
 * rendered by the print-only `<AuditReceipt>` node (client-side only — this
 * never runs at `next build` request time, so static export stays intact).
 *
 * Printing strategy: the native `window.print()` path — no PDF/JS runtime
 * dependency. `.print-area` media styles in app/globals.css switch the whole
 * page into a clean 1-page receipt when the browser's Save-as-PDF dialog
 * opens, which keeps the static export zero-dependency and CLS-free.
 */

export interface AuditReceiptRow {
  label: string;
  detail?: string;
  value: string;
  emphasized?: boolean;
}

export interface AuditReceiptData {
  kicker: string;
  heading: string;
  summary: string;
  asOf: string;
  grossLabel: string;
  grossValue: string;
  rows: AuditReceiptRow[];
  emeraldNote: string;
  disclaimer: string;
  independence: string;
}

export interface BuildAuditReceiptArgs {
  quote: ChannelQuote;
  corridor: Corridor;
  platform: Platform;
  asOf: string;
}

/** Spread math mirrors utils/calculateRoute.ts so the receipt never drifts. */
export function buildAuditReceipt({
  quote,
  corridor,
  platform,
  asOf,
}: BuildAuditReceiptArgs): AuditReceiptData {
  const spreadFraction =
    corridor.rate > 0
      ? Math.max(0, 1 - quote.effectiveRate / corridor.rate)
      : 0;
  const spreadPercent = spreadFraction * 100;
  const fxLossUSD = quote.usdConverted * spreadFraction;
  const fxLossLocal = fxLossUSD * quote.effectiveRate;

  return {
    kicker: "PayoutDelta · Official Audit",
    heading: "Freelance Invoice Fee & Net Realization Audit",
    summary: `${formatUSD(quote.grossUSD)} USD to ${corridor.to} via ${platform.name} (${platform.feePercent}%)`,
    asOf,
    grossLabel: "Gross client payment",
    grossValue: formatUSD(quote.grossUSD),
    rows: [
      {
        label: "Platform commission",
        detail: `${platform.feePercent}% of gross invoice`,
        value: `− ${formatUSD(quote.platformFeeUSD)}`,
      },
      {
        label: "Clearing / wire surcharge",
        detail: `Fixed ${quote.channelName} fee`,
        value: `− ${formatUSD(quote.feeDeductedUSD)}`,
      },
      {
        label: "Hidden FX spread markup",
        detail: `${spreadPercent.toFixed(2)}% off mid-market ${corridor.rate.toFixed(4)} ${corridor.to}/${corridor.from}`,
        value: `− ${formatLocal(fxLossLocal, corridor)} (${formatUSD(fxLossUSD)})`,
      },
      {
        label: "Net domestic deposit",
        detail: `${quote.channelName} @ ${quote.effectiveRate.toFixed(4)} ${corridor.to} per ${corridor.from}`,
        value: `+ ${formatLocal(quote.localAmount, corridor)}`,
        emphasized: true,
      },
    ],
    emeraldNote: `${formatLocal(quote.localAmount, corridor)} net received · ${quote.totalCostPercent.toFixed(2)}% all-in cost`,
    disclaimer: "Independent calculation benchmarked against interbank rates. Indicative, not a quote.",
    independence:
      "All brand names and trademarks are the property of their respective owners. PayoutDelta is an independent auditing tool.",
  };
}