/**
 * PayoutDelta — Phase B "Target Net Gross-Up" inversion engine.
 *
 * Given a target net local deposit the user wants to land in their bank
 * account, this closed-form engine computes the exact gross USD invoice the
 * client must be billed after the FULL seven-layer cost stack:
 *
 *   platformRate      = platform.feePercent / 100
 *   realizedRate      = baseRate · (1 − channelSpread)
 *   netUsdNeeded      = (targetNetLocal / (1 − taxWithholdingRate)) / realizedRate
 *   usdBeforeWires    = netUsdNeeded + fixedFeeUSD + intermediaryCutUSD
 *                       + (landingFeeLocal / baseRate)
 *   requiredGrossBill = usdBeforeWires / (1 − platformRate)
 *
 * The landing fee is modelled as a USD-side cost converted at the corridor
 * base rate (per the spec), which guarantees the derived output
 * `realizedTakeHomeLocal` equals `targetNetLocal` exactly — there is no
 * rounding drift between what the user asks for and what lands in the bank.
 *
 * Pure, finite-safe and clamped: a zero, negative, NaN or absurd input can
 * never produce Infinity or spin a loop. The calculator consumes this in a
 * single O(1) `useMemo` pass, keeping INP well under 50ms.
 *
 * All divisions run through the Phase S1 `lib/safeMath.ts` guards, and the
 * gross-up bails to a safe zero stack the instant a non-positive target or
 * reference rate arrives — an inversion can never divide by zero.
 */

import { safeDivide, safeMultiply } from "@/lib/safeMath";

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export interface GrossUpInput {
  /** Desired net deposit in the corridor's domestic currency. */
  targetNetLocal: number;
  /** Platform commission percent (0–100, e.g. Upwork 10). */
  platformFeePercent: number;
  /** Channel FX spread as a decimal fraction (0–1, e.g. Wise 0.0045). */
  channelSpread: number;
  /** Corridor interbank reference rate (domestic units per base-currency unit). */
  baseRate: number;
  /** Channel flat clearing / withdrawal fee in USD (e.g. Wise fixed fee). */
  fixedFeeUSD: number;
  /** Intermediary correspondent SWIFT cut in USD. */
  intermediaryCutUSD: number;
  /** Local receiving / landing fee in the corridor's domestic currency. */
  landingFeeLocal: number;
  /** Statutory withholding rate as a decimal fraction (0–1). */
  taxWithholdingRate: number;
}

export interface GrossUpResult {
  /** False when an input is degenerate and the stack cannot be inverted. */
  feasible: boolean;
  /** baseRate · (1 − spread) — the rate the converted funds actually value at. */
  realizedRate: number;
  /** USD value that must cross the FX layer, net of everything. */
  netUsdNeeded: number;
  /** USD balance needed once the fixed, SWIFT and landing cuts are added. */
  usdBeforeWires: number;
  /** platformFeePercent / 100. */
  platformRate: number;
  /** Un-clamped gross invoice the client must be billed. */
  requiredGrossBill: number;
  /** requiredGrossBill · platformRate — the platform commission. */
  platformCutUsd: number;
  /** fixedFeeUSD + intermediaryCutUSD + (landingFeeLocal / baseRate). */
  bankAndWireCutUsd: number;
  /** netUsdNeeded · spread — the hidden FX spread leak, in USD. */
  spreadLeakageUsd: number;
  /** netUsdNeeded · baseRate · spread — the FX spread leak, in local currency. */
  spreadLeakageLocal: number;
  /** netUsdNeeded · realizedRate · taxRate — statutory withholding, in local. */
  taxWithholdingLocal: number;
  /** netUsdNeeded · realizedRate · (1 − taxRate) — always equals the target. */
  realizedTakeHomeLocal: number;
}

/** Degenerate inputs that no inversion can resolve (bound the UI). */
const INFEASIBLE: GrossUpResult = {
  feasible: false,
  realizedRate: 0,
  netUsdNeeded: 0,
  usdBeforeWires: 0,
  platformRate: 0,
  requiredGrossBill: 0,
  platformCutUsd: 0,
  bankAndWireCutUsd: 0,
  spreadLeakageUsd: 0,
  spreadLeakageLocal: 0,
  taxWithholdingLocal: 0,
  realizedTakeHomeLocal: 0,
};

export function calculateGrossFromTargetNet(
  input: GrossUpInput
): GrossUpResult {
  const targetNetLocal = safeNumber(input.targetNetLocal);
  const feePercent = safeNumber(input.platformFeePercent);
  const spread = Math.max(0, safeNumber(input.channelSpread));
  const baseRate = safeNumber(input.baseRate);
  const fixedFeeUSD = Math.max(0, safeNumber(input.fixedFeeUSD));
  const wireUSD = Math.max(0, safeNumber(input.intermediaryCutUSD));
  const landingFeeLocal = Math.max(0, safeNumber(input.landingFeeLocal));
  const taxRate = safeNumber(input.taxWithholdingRate);

  // Phase S1 guard rail #0 — a non-positive target or reference rate can never
  // be inverted: resolve to the safe zero stack before any division runs.
  if (targetNetLocal <= 0 || baseRate <= 0) {
    return INFEASIBLE;
  }

  // Guard rails — anything at or past a singular denominator is un-solvable.
  if (feePercent < 0 || feePercent >= 100) {
    return INFEASIBLE;
  }
  if (spread >= 1 || taxRate < 0 || taxRate >= 1) {
    return INFEASIBLE;
  }

  const platformRate = safeDivide(feePercent, 100);
  const realizedRate = safeMultiply(baseRate, 1 - spread);
  if (realizedRate <= 0) {
    return INFEASIBLE;
  }

  const preTaxLocal = safeDivide(targetNetLocal, 1 - taxRate);
  const netUsdNeeded = safeDivide(preTaxLocal, realizedRate);
  const landingFeeUsd = safeDivide(landingFeeLocal, baseRate);
  const bankAndWireCutUsd = fixedFeeUSD + wireUSD + landingFeeUsd;
  const usdBeforeWires = netUsdNeeded + bankAndWireCutUsd;
  const requiredGrossBill = safeDivide(usdBeforeWires, 1 - platformRate);

  return {
    feasible: true,
    realizedRate,
    netUsdNeeded,
    usdBeforeWires,
    platformRate,
    requiredGrossBill,
    platformCutUsd: safeMultiply(requiredGrossBill, platformRate),
    bankAndWireCutUsd,
    spreadLeakageUsd: safeMultiply(netUsdNeeded, spread),
    spreadLeakageLocal: safeMultiply(
      safeMultiply(netUsdNeeded, baseRate),
      spread
    ),
    taxWithholdingLocal: safeMultiply(preTaxLocal, taxRate),
    realizedTakeHomeLocal: safeMultiply(
      safeMultiply(netUsdNeeded, realizedRate),
      1 - taxRate
    ),
  };
}

/**
 * Phase 2 — re-base one USD-denominated fee onto a settlement currency.
 *
 * The gross-up solver above is deliberately left in USD: it is the accounting
 * model, and the dataset quotes every fee in USD, so converting inside the
 * solver would make the arithmetic depend on a presentation preference. This
 * helper is the single seam where a *presentation* re-basing happens instead.
 *
 * `unitsPerBase` is passed in as a plain number (units of the target currency
 * per 1 USD) rather than imported from `lib/currency.ts`. That is a hard
 * constraint, not a style choice: the S4 edge-case harness
 * (`scripts/simulate_edge_cases.mjs`) strips this file's imports and fuses it
 * with `lib/safeMath.ts` and `utils/calculateRoute.ts` into a single plain-JS
 * module, so a runtime import of the currency table would leave an undefined
 * identifier here and break the simulation. Passing the factor keeps the engine
 * self-contained and byte-identical in both the app and the harness.
 *
 * Fees are amounts, not rates, so this is a flat multiplication. The retail FX
 * spread a payer actually pays is modelled separately per corridor in
 * `data/fees.json` and is deliberately not applied a second time here.
 */
export function rebaseFee(usd: number, unitsPerBase: number): number {
  const amount = safeNumber(usd);
  const factor = safeNumber(unitsPerBase);
  if (amount === 0 || factor <= 0) {
    return 0;
  }
  return safeMultiply(amount, factor);
}

/**
 * Phase 2 — converts a *rate* (destination units per USD) onto a
 * units-per-settlement-currency basis. Kept separate from `rebaseFee` because a
 * rate must be re-based per unit, never multiplied by the money factor.
 */
export function rebaseRate(
  ratePerUsd: number,
  unitsPerUsdOfBase: number,
  unitsPerUsdOfQuote: number
): number {
  const rate = safeNumber(ratePerUsd);
  const base = safeNumber(unitsPerUsdOfBase);
  const quote = safeNumber(unitsPerUsdOfQuote);
  if (rate === 0 || base <= 0 || quote <= 0) {
    return 0;
  }
  return safeDivide(safeMultiply(rate, quote), base);
}