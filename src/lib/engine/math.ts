/**
 * PayoutDelta — Pure calculation engine.
 *
 * Deterministic, finite-safe arithmetic for cross-border payout calculations.
 * All functions are pure with explicit return types. No `any` types permitted.
 *
 * Adheres to financial invariants:
 *   R1: Amounts bounded within [1, 10_000_000]
 *   R2: Negative landings clamped to 0 with isFeeAbsorbed flag
 *   R3: High-precision internal calculation with Intl.NumberFormat output
 */

import type {
  Corridor,
  IntermediaryRoute,
  CalculationResult,
  ReverseResult,
} from "./types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum transaction amount in USD. */
const MIN_AMOUNT = 1;

/** Maximum transaction amount in USD. */
const MAX_AMOUNT = 10_000_000;

/** Epsilon floor for safe division. */
const EPSILON = Number.EPSILON;

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Safe division with epsilon-clamped denominator.
 * Returns fallback (default 0) for non-finite or invalid inputs.
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback = 0
): number {
  if (
    typeof numerator !== "number" ||
    !Number.isFinite(numerator) ||
    typeof denominator !== "number" ||
    !Number.isFinite(denominator)
  ) {
    return fallback;
  }

  const magnitude = Math.abs(denominator);
  const clampedDenominator =
    magnitude < EPSILON ? EPSILON : denominator;

  return numerator / clampedDenominator;
}

/**
 * Guarded multiplication returning fallback for non-finite inputs.
 */
export function safeMultiply(a: number, b: number, fallback = 0): number {
  if (typeof a !== "number" || !Number.isFinite(a)) return fallback;
  if (typeof b !== "number" || !Number.isFinite(b)) return fallback;
  return a * b;
}

/**
 * Clamp a value within [min, max]. Non-finite values resolve to min.
 */
export function clampNumber(
  val: number,
  min: number,
  max: number
): number {
  if (typeof val !== "number" || !Number.isFinite(val)) {
    return Number.isFinite(min) ? min : 0;
  }
  return Math.min(Math.max(val, min), max);
}

/**
 * Format a currency amount using Intl.NumberFormat for consistent display.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = "en-US"
): string {
  const clamped = clampNumber(amount, 0, MAX_AMOUNT);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(clamped);
}

// ─── Forward Calculation ─────────────────────────────────────────────────────

/**
 * Calculate the net payout for a forward transfer.
 *
 * Waterfall:
 *   gross → minus intermediary deduct → minus fx spread → minus tax → net
 *
 * @param amount - Gross amount in source currency (bounded to [1, 10M])
 * @param corridor - Corridor configuration
 * @param route - Intermediary banking route
 * @param taxRate - Statutory withholding rate as decimal (0–1)
 */
export function calculateForwardPayout(
  amount: number,
  corridor: Corridor,
  route: IntermediaryRoute,
  taxRate: number
): CalculationResult {
  // R1: Bound amount to [MIN, MAX]
  const boundedAmount = clampNumber(amount, MIN_AMOUNT, MAX_AMOUNT);

  // R1: Clamp tax rate to [0, 1]
  const boundedTax = clampNumber(taxRate, 0, 1);

  // R1: Clamp corridor spread to [0, 0.15]
  const boundedSpread = clampNumber(corridor.baseSpreadPercent, 0, 0.15);

  // R1: Clamp deductions to non-negative
  const intermediaryDeduct = Math.max(0, route.deductUsd);
  const fixedDeduct = Math.max(0, corridor.fixedDeductUsd);

  // Calculate intermediate values
  const totalDeduct = fixedDeduct + intermediaryDeduct;
  const fxSpreadCost = safeMultiply(boundedAmount, boundedSpread);
  const statutoryTax = safeMultiply(boundedAmount, boundedTax);

  // Net before landing (in source currency equivalent)
  const netBeforeLanding = boundedAmount - totalDeduct - fxSpreadCost - statutoryTax;

  // R2: Clamp negative landing to 0
  const isFeeAbsorbed = netBeforeLanding <= 0;
  const netLanding = Math.max(0, netBeforeLanding);

  // Effective loss percent
  const effectiveLossPercent =
    boundedAmount > 0
      ? safeDivide(totalDeduct + fxSpreadCost + statutoryTax, boundedAmount)
      : 0;

  return {
    grossAmount: boundedAmount,
    intermediaryDeduct,
    fxSpreadCost,
    statutoryTax,
    netLanding,
    effectiveLossPercent,
    isFeeAbsorbed,
  };
}

// ─── Reverse Calculation ─────────────────────────────────────────────────────

/**
 * Calculate the gross amount required to achieve a target net landing.
 *
 * Inverts the waterfall to find the billable gross:
 *   targetNet = (gross - fixed - intermediary) * (1 - spread) * (1 - tax)
 *   gross = targetNet / ((1 - spread) * (1 - tax)) + fixed + intermediary
 *
 * @param targetLanding - Desired net amount in source currency equivalent
 * @param corridor - Corridor configuration
 * @param route - Intermediary banking route
 * @param taxRate - Statutory withholding rate as decimal (0–1)
 */
export function calculateReverseTarget(
  targetLanding: number,
  corridor: Corridor,
  route: IntermediaryRoute,
  taxRate: number
): ReverseResult {
  // Guard: non-positive target is infeasible
  if (targetLanding <= 0) {
    return { requiredGross: 0, feasible: false };
  }

  const boundedTax = clampNumber(taxRate, 0, 1);
  const boundedSpread = clampNumber(corridor.baseSpreadPercent, 0, 0.15);
  const fixedDeduct = Math.max(0, corridor.fixedDeductUsd);
  const intermediaryDeduct = Math.max(0, route.deductUsd);

  // Denominator for inversion: (1 - spread) * (1 - tax)
  const denominator = safeMultiply(1 - boundedSpread, 1 - boundedTax);

  // Guard against division by near-zero
  if (denominator < EPSILON) {
    return { requiredGross: 0, feasible: false };
  }

  const totalFixed = fixedDeduct + intermediaryDeduct;
  const requiredGross = safeDivide(targetLanding, denominator) + totalFixed;

  return {
    requiredGross: clampNumber(requiredGross, MIN_AMOUNT, MAX_AMOUNT),
    feasible: true,
  };
}

// ─── Exported API ─────────────────────────────────────────────────────────────

/**
 * Validate a corridor configuration. Returns true if all invariants hold.
 */
export function validateCorridor(corridor: Corridor): boolean {
  if (typeof corridor.id !== "string" || corridor.id.length === 0) return false;
  if (corridor.source.length !== 3 || corridor.target.length !== 3) return false;
  if (corridor.baseSpreadPercent < 0 || corridor.baseSpreadPercent > 0.15)
    return false;
  if (corridor.fixedDeductUsd < 0 || corridor.fixedDeductUsd > 100) return false;
  return true;
}

/**
 * Validate an intermediary route. Returns true if all invariants hold.
 */
export function validateRoute(route: IntermediaryRoute): boolean {
  // ISO 9362 BIC pattern: 8 or 11 uppercase alphanumeric characters
  const bicPattern = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  if (!bicPattern.test(route.bic)) return false;
  if (route.deductUsd < 0 || route.deductUsd > 100) return false;
  return true;
}
