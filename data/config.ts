/**
 * PayoutDelta — build-time runtime configuration (Phase F/G).
 *
 * Centralizes the growth-system constants so client islands never hardcode
 * contact details or marketing copy. All environment knobs follow the repo's
 * `NEXT_PUBLIC_*` static-export convention (see `data/affiliatePartners.ts`):
 * values are consumed at build time and inlined, so GitHub Pages hosting stays
 * fully client-side with zero runtime configuration.
 */

/**
 * Resolves the consulting WhatsApp number. The canonical line and its env
 * override live in the monetization repository
 * (`data/monetizationConfig.ts`); this export is kept as a thin backward-
 * compatible facade for older call sites so the number has exactly one home.
 */
import { getConsultingWhatsAppNumber } from "@/data/monetizationConfig";

export function getConsultingWhatsAppPhone(): string {
  return getConsultingWhatsAppNumber();
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