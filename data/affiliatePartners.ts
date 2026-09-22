/**
 * PayoutDelta — Centralized Partner & Affiliate Directory (Phase 3).
 *
 * Single source of truth for the remittance provider affiliate engine. Each
 * partner carries a canonical outbound URL (with UTM attribution) that can be
 * overridden at build time via a `NEXT_PUBLIC_*` environment variable — the
 * override is inlined during the static export, so no runtime network call is
 * ever made and GitHub Pages hosting stays fully client-side.
 *
 * Every provider appears strictly under nominative fair use for factual cost
 * comparison; no third-party logos are used and the FTC-compliant disclaimer
 * is rendered wherever an affiliate link can be shown.
 */

export type PartnerKind = "affiliate" | "advisory";

export interface PartnerConfig {
  /** Matches a `WithdrawalChannel.id` (or an explicit advisory provider). */
  providerId: string;
  /** "affiliate" links out with commission attribution; "advisory" does not. */
  kind: PartnerKind;
  /** Resolved outbound URL (env override wins over the canonical default). */
  url: string;
  /** Short partner trust label shown above the CTA. */
  partnerBadge: string;
  /** Full call-to-action copy (canonical English; localized via dictionary). */
  claimCopy: string;
  /** One-line, evidence-based partner disclosure. */
  disclosure: string;
}

interface PartnerRecord {
  providerId: string;
  defaultUrl: string;
  /** Name of the `NEXT_PUBLIC_*` env var read at build time, or "none". */
  envVariable: string;
  partnerBadge: string;
  claimCopy: string;
  disclosure: string;
}

const DIRECTORY: Record<string, PartnerRecord> = {
  wise: {
    providerId: "wise",
    defaultUrl:
      "https://wise.com/?utm_source=payoutdelta&utm_medium=verdict_cta",
    envVariable: "NEXT_PUBLIC_WISE_AFFILIATE_URL",
    partnerBadge: "Wise Verified Partner Rail",
    claimCopy: "Claim This Rate via Wise →",
    disclosure: "Audited mid-market rate with transparent conversion fee.",
  },
  payoneer: {
    providerId: "payoneer",
    defaultUrl:
      "https://www.payoneer.com/?utm_source=payoutdelta&utm_medium=verdict_cta",
    envVariable: "NEXT_PUBLIC_PAYONEER_AFFILIATE_URL",
    partnerBadge: "Payoneer Freelance Rail",
    claimCopy: "Open Account & Transfer via Payoneer →",
    disclosure:
      "Direct inward clearing with multi-currency balance support.",
  },
  elevate: {
    providerId: "elevate",
    defaultUrl: "https://www.elevatepay.co/?utm_source=payoutdelta",
    envVariable: "NEXT_PUBLIC_ELEVATE_AFFILIATE_URL",
    partnerBadge: "US Virtual Account Partner",
    claimCopy: "Receive via Elevate Pay →",
    disclosure:
      "Direct ACH recipient routing for emerging market contractors.",
  },
  /** Non-affiliate rail: prompts the user to consult their receiving bank. */
  direct_wire: {
    providerId: "direct_wire",
    defaultUrl: "",
    envVariable: "none",
    partnerBadge: "Traditional Bank Wire Advisory",
    claimCopy: "Consult your bank for exact intermediary fees",
    disclosure:
      "No affiliate rail — confirm the correspondent SWIFT cut and local credit advice with your receiving bank before invoicing.",
  },
};

/** Reads a build-time env override, falling back to the canonical URL. */
function resolveUrl(record: PartnerRecord): string {
  if (record.envVariable === "none") {
    return "";
  }
  const override = process.env[record.envVariable];
  return override && override.length > 0 ? override : record.defaultUrl;
}

/**
 * Resolves the affiliate/advisory configuration for a provider id. Unknown
 * ids (e.g. `swift`, `local-bank`, `remitly`) fall back to the local bank
 * wire advisory note so a CTA is never fabricated for an unpartnered rail.
 */
export function getPartnerConfig(providerId: string): PartnerConfig {
  const record = DIRECTORY[providerId] ?? DIRECTORY.direct_wire;
  return {
    providerId: record.providerId,
    kind: record.envVariable === "none" ? "advisory" : "affiliate",
    url: resolveUrl(record),
    partnerBadge: record.partnerBadge,
    claimCopy: record.claimCopy,
    disclosure: record.disclosure,
  };
}