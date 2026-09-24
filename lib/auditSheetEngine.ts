import type { ChannelQuote, Corridor, Platform } from "@/lib/types";
import type { CorridorRegulation } from "@/data/regulatoryBanking";
import { formatLocal, formatUSD } from "@/utils/format";

/**
 * PayoutDelta — Official Transit & Deductions Audit sheet builder (Milestone 7).
 *
 * Pure, framework-free builder for the one-page client audit certificate that
 * `AuditSheetModal` renders and prints. Mirrors the packaging conventions of
 * `utils/generateAuditPdf.ts` (native `window.print()`, no PDF runtime) while
 * producing a richer statutory document: a full settlement-wire route analysis,
 * an itemized deduction ledger with the SHA warning, and a binding
 * charge-instruction recommendation.
 *
 * Everything except the client-generated `verificationId` / `asOf` stamp is
 * computed from static receipt data, so the builder is SSR-safe and
 * unit-testable. The modal generates those two client-side values at open time
 * to guarantee a unique certificate per export while never causing a React
 * hydration mismatch.
 */

/** US correspondent BICs the settlement-route analysis cites. */
export const CORRESPONDENT_BICS = ["CHASUS33", "CITIUS33"] as const;

export interface AuditSheetRouteLeg {
  label: string;
  detail: string;
}

export interface AuditSheetRow {
  label: string;
  detail?: string;
  value: string;
  emphasized?: boolean;
  status?: "ok" | "warn";
}

export interface AuditSheetData {
  kicker: string;
  title: string;
  summary: string;
  corridorLabel: string;
  asOf: string;
  verificationId: string;
  grossLabel: string;
  grossValue: string;
  route: AuditSheetRouteLeg[];
  ledger: AuditSheetRow[];
  statutoryNotice: string;
  purposeCode: string;
  recommendation: string;
  disclaimer: string;
  independence: string;
}

export interface BuildAuditSheetArgs {
  quote: ChannelQuote;
  corridor: Corridor;
  platform: Platform;
  regulation: CorridorRegulation;
  asOf: string;
  verificationId: string;
}

/**
 * Builds the full audit certificate. Spread/take-home math mirrors
 * `utils/calculateRoute.ts` and `utils/generateAuditPdf.ts` so the sheet never
 * disagrees with the on-screen verdict.
 */
export function buildAuditSheet({
  quote,
  corridor,
  platform,
  regulation,
  asOf,
  verificationId,
}: BuildAuditSheetArgs): AuditSheetData {
  const spreadFraction =
    corridor.rate > 0
      ? Math.max(0, 1 - quote.effectiveRate / corridor.rate)
      : 0;
  const spreadPercent = spreadFraction * 100;
  const fxLossUSD = quote.usdConverted * spreadFraction;
  const fxLossLocal = fxLossUSD * quote.effectiveRate;

  const bank = regulation.banks[0];
  const tier = regulation.tiers[0];
  const beneficiaryBic =
    bank && bank.swiftCode !== "—" ? bank.swiftCode : "Domestic clearing";

  const route: AuditSheetRouteLeg[] = [
    {
      label: "Origin",
      detail: `${platform.name} payout · ${formatUSD(quote.grossUSD)} USD remitted from sender bank`,
    },
    {
      label: "Correspondent transit",
      detail: `US clearing via ${CORRESPONDENT_BICS.join(" / ")} — intermediary SHA deduction applies on inbound SWIFT`,
    },
    {
      label: "Beneficiary",
      detail: `${bank ? bank.displayName : corridor.country} receiving bank · BIC ${beneficiaryBic} · ${regulation.clearingNetwork}`,
    },
  ];

  const ledger: AuditSheetRow[] = [
    {
      label: "Platform commission",
      detail: `${platform.feePercent}% of gross invoice`,
      value: `− ${formatUSD(quote.platformFeeUSD)}`,
    },
    {
      label: "SWIFT / correspondent share",
      detail:
        "SHA warning — intermediary deduction is shared into the transfer; instruction OUR removes it",
      value: `− ${formatUSD(quote.feeDeductedUSD)}`,
      status: "warn",
    },
    {
      label: "Retail FX margin",
      detail: `${spreadPercent.toFixed(2)}% off mid-market ${corridor.rate.toFixed(4)} ${corridor.to}/${corridor.from}`,
      value: `− ${formatLocal(fxLossLocal, corridor)} (${formatUSD(fxLossUSD)})`,
      status: "warn",
    },
    {
      label: "Net realized payout",
      detail: `${quote.channelName} @ ${quote.effectiveRate.toFixed(4)} ${corridor.to} per USD`,
      value: `+ ${formatLocal(quote.localAmount, corridor)}`,
      emphasized: true,
      status: "ok",
    },
  ];

  const purposeCode =
    tier?.purposeCode ?? regulation.citations[0] ?? "Export services";
  const statutoryNotice = regulation.authority
    ? `${regulation.authority}. ${bank ? bank.displayName : "Receiving bank"} benchmarks an intermediary SWIFT cut of $${regulation.banks[0]?.intermediaryMinUSD ?? "—"}–$${regulation.banks[0]?.intermediaryMaxUSD ?? "—"} on inbound wires; the statutory purpose code filed is ${purposeCode}.`
    : `Statutory purpose code ${purposeCode} applies to this export service remittance.`;

  return {
    kicker: "PayoutDelta · Official Audit",
    title: "Cross-Border Transit & Deductions Audit",
    summary: `${formatUSD(quote.grossUSD)} USD → ${corridor.to} via ${platform.name} (${platform.feePercent}%)`,
    corridorLabel: `${corridor.from} → ${corridor.to} · ${corridor.country}`,
    asOf,
    verificationId,
    grossLabel: "Gross remittance",
    grossValue: formatUSD(quote.grossUSD),
    route,
    ledger,
    statutoryNotice,
    purposeCode,
    recommendation:
      "Invoice must specify SWIFT charge instruction: OUR — so the sender covers every intermediary leg and the beneficiary nets the audited take-home below.",
    disclaimer:
      "Independent calculation benchmarked against interbank rates and statutory tiers. Indicative, not a quote — verify the bank's credit advice before invoicing.",
    independence:
      "All brand names and trademarks belong to their respective owners. PayoutDelta is an independent auditing tool.",
  };
}