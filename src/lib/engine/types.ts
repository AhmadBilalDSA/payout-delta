/**
 * PayoutDelta — Pure calculation engine type definitions.
 *
 * Strictly typed interfaces with zero `any`. All monetary values are in USD
 * unless otherwise noted. Rates are decimal fractions (0.05 = 5%).
 */

/**
 * A cross-border currency corridor with its base spread and fixed deduction.
 */
export interface Corridor {
  /** Unique corridor identifier, e.g. "usd-to-pkr". */
  id: string;
  /** Source currency ISO 4217 code, e.g. "USD". */
  source: string;
  /** Target currency ISO 4217 code, e.g. "PKR". */
  target: string;
  /** Base FX spread as a decimal fraction (0–1), e.g. 0.035 for 3.5%. */
  baseSpreadPercent: number;
  /** Fixed deduction in USD applied to every transfer, e.g. 30.0. */
  fixedDeductUsd: number;
}

/**
 * An intermediary banking route with SWIFT charge code and deduction.
 */
export interface IntermediaryRoute {
  /** ISO 9362 BIC/SWIFT code, e.g. "CHASUS33". */
  bic: string;
  /** Human-readable bank name, e.g. "JPMorgan Chase Bank". */
  bankName: string;
  /** SWIFT charge code governing fee allocation. */
  chargeCode: "OUR" | "SHA" | "BEN";
  /** Intermediary deduction in USD, e.g. 25.0. */
  deductUsd: number;
}

/**
 * Result of a forward payout calculation.
 */
export interface CalculationResult {
  /** Original gross amount sent in source currency. */
  grossAmount: number;
  /** Intermediary bank deduction in source currency. */
  intermediaryDeduct: number;
  /** FX spread cost in source currency. */
  fxSpreadCost: number;
  /** Statutory tax withheld in source currency. */
  statutoryTax: number;
  /** Net amount landing in target currency (clamped ≥ 0). */
  netLanding: number;
  /** Total effective loss as a decimal fraction (0–1). */
  effectiveLossPercent: number;
  /** True when fixed fees consumed the entire transfer. */
  isFeeAbsorbed: boolean;
}

/**
 * Result of a reverse target calculation.
 */
export interface ReverseResult {
  /** Gross amount required in source currency to achieve target. */
  requiredGross: number;
  /** Whether the target is achievable given the fee structure. */
  feasible: boolean;
}
