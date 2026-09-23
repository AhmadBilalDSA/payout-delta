/**
 * PayoutDelta — build-time runtime configuration (Phase F).
 *
 * Centralizes the growth-system constants so client islands never hardcode
 * contact details or marketing copy. All environment knobs follow the repo's
 * `NEXT_PUBLIC_*` static-export convention (see `data/affiliatePartners.ts`):
 * values are consumed at build time and inlined, so GitHub Pages hosting stays
 * fully client-side with zero runtime configuration.
 */

/** WhatsApp line for the Phase F high-variance consulting funnel. */
export const CONSULTING_PHONE_ENV = "NEXT_PUBLIC_CONSULTING_WHATSAPP";

/**
 * Resolves the consulting WhatsApp number. Operators override it with
 * `NEXT_PUBLIC_CONSULTING_WHATSAPP="<country_code><digits>"` (E.164, no "+",
 * e.g. `923001234567`). Digits are stripped defensively; the placeholder
 * keeps the wa.me deep-link well-formed until a real line is configured.
 */
export function getConsultingWhatsAppPhone(): string {
  const override = process.env[CONSULTING_PHONE_ENV];
  if (override && override.length > 0) {
    const digits = override.replace(/\D/g, "");
    if (digits.length > 0) {
      return digits;
    }
  }
  return "923000000000";
}

/**
 * Phase F — leakage thresholds for the WhatsApp lead trigger.
 * A route is "high variance" when the gap between the costliest and cheapest
 * channel costs at least `WHATSAPP_LEAD_HARD_FLOOR_USD` per transfer, or at
 * least `WHATSAPP_LEAD_PCT_OF_GROSS` of the gross invoice it is moved on.
 */
export const WHATSAPP_LEAD_HARD_FLOOR_USD = 150;
export const WHATSAPP_LEAD_PCT_OF_GROSS = 0.05;

/** Phase F — OpenSEO transparency badge (footer) + rankings data path. */
export const SEO_RANKINGS_BADGE_LABEL = "Ranked #1 Real-Time Settlement Engine";
export const SEO_RANKINGS_DATA_PATH = "/seo_rankings.json";