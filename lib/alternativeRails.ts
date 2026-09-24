/**
 * PayoutDelta — Alternative Rails Monetization Engine (Milestone 7).
 *
 * Pure, deterministic benchmark for the AlternativeRailsCard on every corridor
 * calculator route. It quantifies, for a given gross amount, the all-in
 * friction frictional band of two payment rails:
 *
 *   1. THE CLASSIC SWIFT WIRE — the traditional correspondent chain. The
 *      sender bank's retail spread sits on top of an intermediary banker's
 *      SHA deduction. Benchmarked bands:
 *        - intermediary cut          $15 – $35
 *        - sender-side retail spread 2.0% – 4.2%
 *
 *   2. MODERN DIRECT CLEARING — the collapsing-rail alternative (regulated
 *      money-transfer operators, virtual-account clears, local ACH/real-time
 *      rails) that keeps the mid-market rate and charges a flat fee:
 *        - flat fee                  $5.50 – $7.00
 *        - FX spread                0% (mid-market)
 *
 * The midpoint savings delta is the headline monetization figure the card
 * renders (≈ $49.75 on $1,000 → "Save $50 USD"). Deliberately framework-free
 * and synchronous — no network, no `Date`, no locale — so the component can
 * render it statically at build time and hydration can never disagree.
 */

export const WIRE_INTERMEDIARY_MIN_USD = 15;
export const WIRE_INTERMEDIARY_MAX_USD = 35;
export const WIRE_RETAIL_SPREAD_MIN = 0.02;
export const WIRE_RETAIL_SPREAD_MAX = 0.042;
export const MODERN_FLAT_FEE_MIN_USD = 5.5;
export const MODERN_FLAT_FEE_MAX_USD = 7.0;
export const MODERN_FX_SPREAD = 0;
export const RAILS_BENCHMARK_GROSS_USD = 1000;

export interface RailBand {
  /** Human label, e.g. "Traditional bank wire". */
  label: string;
  /** Lower all-in bound in USD (intermediary cut + spread). */
  totalMinUSD: number;
  /** Upper all-in bound in USD (intermediary cut + spread). */
  totalMaxUSD: number;
  /** One-line copy listing the two friction components. */
  components: string;
}

export interface AlternativeRailsBenchmark {
  /** Gross amount the bands were computed for. */
  grossUSD: number;
  wire: RailBand;
  modern: RailBand;
  /** Midpoint difference between the two rails' all-in cost bands (USD). */
  savingsMidUSD: number;
  /** `savingsMidUSD` rounded to a whole-dollar headline. */
  savingsRoundedUSD: number;
}

/** Safe rescale so the bands stay truthful for any finite positive gross. */
function safeGross(grossUSD: number): number {
  if (!Number.isFinite(grossUSD) || grossUSD <= 0) {
    return RAILS_BENCHMARK_GROSS_USD;
  }
  return grossUSD;
}

/**
 * Computes the two all-in friction bands and the headline savings delta.
 * All figures are USD; spread terms scale linearly with `grossUSD` while the
 * flat/intermediary components are amount-interval constants.
 */
export function computeAlternativeRailsBenchmark(
  grossUSD: number = RAILS_BENCHMARK_GROSS_USD,
): AlternativeRailsBenchmark {
  const amount = safeGross(grossUSD);

  const wireMin =
    WIRE_INTERMEDIARY_MIN_USD + amount * WIRE_RETAIL_SPREAD_MIN;
  const wireMax =
    WIRE_INTERMEDIARY_MAX_USD + amount * WIRE_RETAIL_SPREAD_MAX;
  const modernMin =
    MODERN_FLAT_FEE_MIN_USD + amount * MODERN_FX_SPREAD;
  const modernMax =
    MODERN_FLAT_FEE_MAX_USD + amount * MODERN_FX_SPREAD;

  const wireMid = (wireMin + wireMax) / 2;
  const modernMid = (modernMin + modernMax) / 2;
  const savingsMidUSD = Math.max(0, wireMid - modernMid);

  return {
    grossUSD: amount,
    wire: {
      label: "Traditional bank wire",
      totalMinUSD: wireMin,
      totalMaxUSD: wireMax,
      components: `Correspondent SHA cut $${WIRE_INTERMEDIARY_MIN_USD}–$${WIRE_INTERMEDIARY_MAX_USD} · retail spread ${(WIRE_RETAIL_SPREAD_MIN * 100).toFixed(1)}–${(WIRE_RETAIL_SPREAD_MAX * 100).toFixed(1)}%`,
    },
    modern: {
      label: "Modern direct clearing",
      totalMinUSD: modernMin,
      totalMaxUSD: modernMax,
      components: `Flat fee $${MODERN_FLAT_FEE_MIN_USD.toFixed(2)}–$${MODERN_FLAT_FEE_MAX_USD.toFixed(2)} · ${(MODERN_FX_SPREAD * 100).toFixed(0)}% spread`,
    },
    savingsMidUSD,
    savingsRoundedUSD: Math.round(savingsMidUSD),
  };
}