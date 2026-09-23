/**
 * PayoutDelta — Configurable Monetization Repository (Phase G).
 *
 * Single source of truth for every revenue surface on the site:
 *   - the high-ticket WhatsApp consulting line + funnel trigger thresholds,
 *   - the canonical affiliate links for sponsored remittance rails,
 *   - the pre-filled `wa.me` lead-URL builder used by the consulting card.
 *
 * Everything follows the repo's static-export convention: values are consumed
 * at build time and inlined, no runtime calls, zero telemetry. Operators
 * override the WhatsApp line with `NEXT_PUBLIC_CONSULTING_WHATSAPP`
 * (E.164 digits, no "+") and any affiliate URL with its own
 * `NEXT_PUBLIC_*` variable (see `data/affiliatePartners.ts`).
 */

/** Consulting WhatsApp number (E.164 digits, no "+"). Configurable via env. */
export const consultingWhatsAppNumber = "923041943795";

/** Env override for the consulting WhatsApp line (build-time inlined). */
export const CONSULTING_WHATSAPP_ENV = "NEXT_PUBLIC_CONSULTING_WHATSAPP";

/**
 * Resolves the consulting WhatsApp number: the operator override wins, else
 * the canonical `consultingWhatsAppNumber`. Digits are stripped defensively so
 * a stray "+"/space/() in the env var never breaks the `wa.me` deep link.
 */
export function getConsultingWhatsAppNumber(): string {
  const override = process.env[CONSULTING_WHATSAPP_ENV];
  if (override && override.length > 0) {
    const digits = override.replace(/\D/g, "");
    if (digits.length > 0) {
      return digits;
    }
  }
  return consultingWhatsAppNumber;
}

/**
 * High-ticket consulting funnel trigger thresholds.
 * The WhatsApp card mounts under the verdict when the live audit shows:
 *   - at least `consultingThresholdUsd` (USD 120) of leakage on the transfer, OR
 *   - a gross payment of at least `consultingGrossThresholdUsd` (USD 2,500).
 */
export const consultingThresholdUsd = 120;
export const consultingGrossThresholdUsd = 2500;

/** Canonical affiliate partner links (single source of truth). */
export const affiliateLinks = {
  wise: "https://wise.com/?utm_source=payoutdelta&utm_medium=calculator_verdict",
  payoneer: "https://share.payoneer.com/nav/payoutdelta",
  remitly: "https://remitly.com/?utm_source=payoutdelta",
} as const;

export type AffiliatePartnerId = keyof typeof affiliateLinks;

/** Resolves an affiliate link by partner id. */
export function getAffiliateLink(id: AffiliatePartnerId): string {
  return affiliateLinks[id];
}

/** Rough money figure for prose (whole units, thousands separators). */
function formatRough(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  return Math.round(value).toLocaleString("en-US");
}

/**
 * Builds the authoritative pre-filled WhatsApp consulting inquiry.
 *
 * Returns a `https://wa.me/{number}?text={encoded}` deep link with a
 * client-readable, context-specific audit summary so the visitor opens
 * WhatsApp already knowing the corridor, platform, leakage and the ask.
 * Parses to an empty string when no number is configured.
 */
export function generateWhatsAppLeadUrl(
  grossUsd: number,
  corridor: string,
  platform: string,
  leakageUsd: number,
  leakageLocal: number,
  targetCurrency: string
): string {
  const number = getConsultingWhatsAppNumber();
  if (number === "") {
    return "";
  }
  const message =
    `Hi! I was auditing a $${formatRough(grossUsd)} transfer on the ${corridor} ` +
    `corridor (${platform}) via PayoutDelta. The calculator shows I am losing ` +
    `~${formatRough(leakageLocal)} ${targetCurrency} (${formatRough(leakageUsd)} USD) ` +
    `in intermediary fees and spreads. I'd like to consult on optimizing my ` +
    `cross-border payout setup and export tax structure.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}