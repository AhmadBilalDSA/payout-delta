/**
 * PayoutDelta — Reverse Invoice & Multi-Rail Split Engine (Part 1).
 *
 * Given a desired net landing amount (local or USD), compute:
 *   1. The exact gross USD invoice required to hit that net after the full
 *      deduction stack (platform cut → wire fees → FX spread → withholding).
 *   2. The side-by-side net yield across all three split rails for any gross
 *      invoice volume, so a contractor can see fee leakage at a glance.
 *
 * MATH MODEL (reverse gross-up, same algebra as calculatorEngine.ts):
 *
 *   platformRate   = platformFeePercent / 100
 *   realizedRate   = midRate × (1 − fxSpread)
 *   preTaxLocal    = targetNetLocal / (1 − withholdingRate)
 *   netUsdNeeded   = preTaxLocal / realizedRate
 *   bankCutUsd     = shaFixedCutUsd + landingFeeLocal / midRate
 *   usdBeforeWires = netUsdNeeded + bankCutUsd
 *   grossInvoice   = usdBeforeWires / (1 − platformRate)
 *
 * MULTI-RAIL SPLIT MODEL (forward waterfall, three rails):
 *
 *   For each rail: netLocal = (gross × (1 − platformRate) − wireFee − shaUsd)
 *                           × (1 − fxSpread) × midRate × (1 − withholdingRate)
 *
 * Pure, finite-safe and O(1): no loops, no async, no runtime imports.
 * All divisions run through safeMath guards — a degenerate input can never
 * produce Infinity or NaN in the output.
 */

import { safeDivide, safeMultiply } from "@/lib/safeMath";

/* -------------------------------------------------------------------------- *
 * Domain types
 * -------------------------------------------------------------------------- */

export type PlatformId = "upwork" | "fiverr" | "direct" | "deel";

export interface PlatformSpec {
  id: PlatformId;
  label: string;
  /** Platform percentage deducted from the gross invoice (0–100). */
  feePercent: number;
}

export type RailId = "swift" | "payoneer_wise" | "fcva";

export interface SplitRail {
  id: RailId;
  label: string;
  /** Fixed wire/transfer fee, USD. */
  fixedFeeUsd: number;
  /** FX spread as decimal fraction (0–1). 0 for FCVA (no immediate conversion). */
  fxSpread: number;
  /** SHA intermediary cut from the receiving-bank SWIFT leg, USD. */
  shaIntermediateCutUsd: number;
  /** True for the FCVA rail — FX is not applied immediately. */
  retainsUsd: boolean;
}

export interface ReverseInput {
  /** Desired net deposit in the corridor's domestic currency (> 0). */
  targetNetLocal: number;
  /** Corridor mid-market reference rate (domestic units per USD, > 0). */
  midRate: number;
  /** FX spread as decimal fraction (0–1), e.g. 0.0045 for Wise. */
  fxSpread: number;
  /** SHA correspondent intermediary cut in USD (15–35 range). */
  shaFixedCutUsd: number;
  /** Local landing/receiving fee in domestic currency (0 if none). */
  landingFeeLocal: number;
  /** Statutory withholding rate as decimal fraction (0–1). */
  withholdingRate: number;
  /** Platform fee as percentage (0–100). */
  platformFeePercent: number;
}

export interface ReverseResult {
  /** False when an input is degenerate and inversion is impossible. */
  feasible: boolean;
  /** midRate × (1 − fxSpread) — effective converted rate. */
  realizedRate: number;
  /** USD value that must cross the FX layer after bank cuts. */
  netUsdNeeded: number;
  /** Total USD-side bank/wire friction (SHA + landing fee in USD). */
  bankCutUsd: number;
  /** netUsdNeeded + bankCutUsd. */
  usdBeforeWires: number;
  /** Platform fee as decimal (platformFeePercent / 100). */
  platformRate: number;
  /** The required gross invoice amount in USD. */
  grossInvoiceUsd: number;
  /** Platform commission deducted from gross (USD). */
  platformCutUsd: number;
  /** Value eroded by FX spread (USD). */
  spreadLeakageUsd: number;
  /** Value eroded by FX spread (local currency). */
  spreadLeakageLocal: number;
  /** Statutory withholding deducted (local currency). */
  withholdingLocal: number;
  /** Realized net landing — equals targetNetLocal when feasible. */
  realizedNetLocal: number;
  /**
   * Total friction as USD: platformCutUsd + bankCutUsd + spreadLeakageUsd
   * + withholdingLocal / midRate.
   */
  totalFrictionUsd: number;
  /** Total friction as a percentage of grossInvoiceUsd. */
  totalFrictionPct: number;
}

export interface SplitRailResult {
  rail: SplitRail;
  /** Net local deposit after all deductions (0 for FCVA — funds stay in USD). */
  netLocalDeposit: number;
  /** Net USD retained (only meaningful for FCVA rail). */
  netUsdRetained: number;
  /** All deductions in USD for comparison: platform + wire + spread + WHT. */
  totalDeductedUsd: number;
  /** Effective yield: netLocalDeposit / (grossUsd × midRate), as 0–1. */
  yieldFraction: number;
  /** Fee leakage percent of gross: 1 − yieldFraction. */
  leakagePct: number;
  feasible: boolean;
}

export interface SplitInput {
  /** Gross USD invoice volume (> 0). */
  grossUsd: number;
  /** Corridor mid-market rate (domestic units per USD, > 0). */
  midRate: number;
  /** Statutory withholding rate as decimal fraction (0–1). */
  withholdingRate: number;
  /** Platform fee as decimal fraction (0–1). */
  platformRate: number;
}

/* -------------------------------------------------------------------------- *
 * Canonical platform catalogue
 * -------------------------------------------------------------------------- */

export const PLATFORMS: readonly PlatformSpec[] = [
  { id: "upwork",  label: "Upwork",                feePercent: 10 },
  { id: "fiverr",  label: "Fiverr",                feePercent: 20 },
  { id: "deel",    label: "Deel",                  feePercent: 0  },
  { id: "direct",  label: "Direct Client Invoice",  feePercent: 0  },
] as const;

/* -------------------------------------------------------------------------- *
 * Canonical split rail catalogue
 *
 * SHA ranges are modelled at their mid-point per the corpus benchmark.
 * Rail C (FCVA) carries $0 FX spread because no immediate conversion occurs —
 * the USD is retained in the exporter wallet; any eventual conversion is a
 * separate future event and is not modelled here.
 * -------------------------------------------------------------------------- */

export const SPLIT_RAILS: readonly SplitRail[] = [
  {
    id: "swift",
    label: "Direct SWIFT Wire → Local Bank",
    fixedFeeUsd: 25,
    fxSpread: 0.035,
    shaIntermediateCutUsd: 25,
    retainsUsd: false,
  },
  {
    id: "payoneer_wise",
    label: "Payoneer / Wise → Local Bank",
    fixedFeeUsd: 2.99,
    fxSpread: 0.012,
    shaIntermediateCutUsd: 0,
    retainsUsd: false,
  },
  {
    id: "fcva",
    label: "FCY Value Account / Exporter Wallet",
    fixedFeeUsd: 0,
    fxSpread: 0,
    shaIntermediateCutUsd: 0,
    retainsUsd: true,
  },
] as const;

/* -------------------------------------------------------------------------- *
 * Infeasible zero sentinels
 * -------------------------------------------------------------------------- */

const INFEASIBLE_REVERSE: ReverseResult = {
  feasible: false,
  realizedRate: 0,
  netUsdNeeded: 0,
  bankCutUsd: 0,
  usdBeforeWires: 0,
  platformRate: 0,
  grossInvoiceUsd: 0,
  platformCutUsd: 0,
  spreadLeakageUsd: 0,
  spreadLeakageLocal: 0,
  withholdingLocal: 0,
  realizedNetLocal: 0,
  totalFrictionUsd: 0,
  totalFrictionPct: 0,
};

/* -------------------------------------------------------------------------- *
 * Part 1 — Reverse gross-up solver
 * -------------------------------------------------------------------------- */

/**
 * Derive the gross USD invoice required to net `targetNetLocal` after the
 * full deduction stack. Mirrors the algebra in `calculateGrossFromTargetNet`
 * from `lib/calculatorEngine.ts` but expressed as a standalone export so
 * the reverse-calculator page and any future CLI harness can import it
 * without pulling in the entire calculator module.
 */
export function calculateReverseLanding(input: ReverseInput): ReverseResult {
  const targetNetLocal = input.targetNetLocal;
  const midRate        = input.midRate;
  const fxSpread       = Math.max(0, input.fxSpread);
  const shaUsd         = Math.max(0, input.shaFixedCutUsd);
  const landingLocal   = Math.max(0, input.landingFeeLocal);
  const whtRate        = Math.max(0, Math.min(0.99, input.withholdingRate));
  const feePct         = input.platformFeePercent;

  // Guard: degenerate inputs
  if (targetNetLocal <= 0 || midRate <= 0) return INFEASIBLE_REVERSE;
  if (feePct < 0 || feePct >= 100) return INFEASIBLE_REVERSE;
  if (fxSpread >= 1) return INFEASIBLE_REVERSE;

  const platformRate  = safeDivide(feePct, 100);
  const realizedRate  = safeMultiply(midRate, 1 - fxSpread);
  if (realizedRate <= 0) return INFEASIBLE_REVERSE;

  // Invert withholding to get pre-tax local needed
  const preTaxLocal = safeDivide(targetNetLocal, 1 - whtRate);
  // Convert to USD needed at the realized (post-spread) rate
  const netUsdNeeded = safeDivide(preTaxLocal, realizedRate);
  // Bank-side cuts: SHA cut + landing fee converted to USD at mid-rate
  const landingUsd  = safeDivide(landingLocal, midRate);
  const bankCutUsd  = shaUsd + landingUsd;
  const usdBeforeWires = netUsdNeeded + bankCutUsd;
  // Gross up for the platform commission
  const grossInvoiceUsd = safeDivide(usdBeforeWires, 1 - platformRate);

  const platformCutUsd   = safeMultiply(grossInvoiceUsd, platformRate);
  const spreadLeakageUsd = safeMultiply(netUsdNeeded, fxSpread);
  const spreadLeakageLocal = safeMultiply(
    safeMultiply(netUsdNeeded, midRate),
    fxSpread,
  );
  const withholdingLocal = safeMultiply(preTaxLocal, whtRate);
  const realizedNetLocal = safeMultiply(
    safeMultiply(netUsdNeeded, realizedRate),
    1 - whtRate,
  );

  const withholdingUsd  = safeDivide(withholdingLocal, midRate);
  const totalFrictionUsd =
    platformCutUsd + bankCutUsd + spreadLeakageUsd + withholdingUsd;
  const totalFrictionPct = safeMultiply(
    safeDivide(totalFrictionUsd, grossInvoiceUsd),
    100,
  );

  return {
    feasible: true,
    realizedRate,
    netUsdNeeded,
    bankCutUsd,
    usdBeforeWires,
    platformRate,
    grossInvoiceUsd,
    platformCutUsd,
    spreadLeakageUsd,
    spreadLeakageLocal,
    withholdingLocal,
    realizedNetLocal,
    totalFrictionUsd,
    totalFrictionPct,
  };
}

/* -------------------------------------------------------------------------- *
 * Part 2 — Multi-rail forward split waterfall
 * -------------------------------------------------------------------------- */

/**
 * For a given gross invoice and platform rate, compute the net yield across
 * each of the three canonical withdrawal rails. Returns one `SplitRailResult`
 * per rail in SPLIT_RAILS order (SWIFT → Payoneer/Wise → FCVA).
 */
export function calculateSplitYields(input: SplitInput): SplitRailResult[] {
  const { grossUsd, midRate, withholdingRate, platformRate } = input;

  if (grossUsd <= 0 || midRate <= 0) {
    return SPLIT_RAILS.map((rail) => ({
      rail,
      netLocalDeposit: 0,
      netUsdRetained: 0,
      totalDeductedUsd: 0,
      yieldFraction: 0,
      leakagePct: 100,
      feasible: false,
    }));
  }

  return SPLIT_RAILS.map((rail) => {
    // Step 1: deduct platform fee
    const afterPlatform = safeMultiply(grossUsd, 1 - platformRate);
    // Step 2: deduct SHA intermediary cut + fixed wire fee (USD)
    const afterWires = afterPlatform - rail.fixedFeeUsd - rail.shaIntermediateCutUsd;

    if (afterWires <= 0) {
      return {
        rail,
        netLocalDeposit: 0,
        netUsdRetained: 0,
        totalDeductedUsd: grossUsd,
        yieldFraction: 0,
        leakagePct: 100,
        feasible: false,
      };
    }

    const platformCutUsd = safeMultiply(grossUsd, platformRate);
    const wireCutUsd     = rail.fixedFeeUsd + rail.shaIntermediateCutUsd;

    if (rail.retainsUsd) {
      // FCVA: funds stay in USD, no FX or WHT applied immediately
      const totalDeductedUsd = platformCutUsd + wireCutUsd;
      const netUsdRetained   = afterWires;
      const yieldFraction    = safeDivide(netUsdRetained, grossUsd);
      return {
        rail,
        netLocalDeposit: 0,
        netUsdRetained,
        totalDeductedUsd,
        yieldFraction,
        leakagePct: safeMultiply(1 - yieldFraction, 100),
        feasible: true,
      };
    }

    // Step 3: apply FX spread → converted at realized rate
    const realizedRate      = safeMultiply(midRate, 1 - rail.fxSpread);
    const spreadLeakageUsd  = safeMultiply(afterWires, rail.fxSpread);
    const localBeforeWht    = safeMultiply(afterWires, realizedRate);

    // Step 4: deduct statutory withholding
    const whtRate = Math.max(0, Math.min(0.99, withholdingRate));
    const whtLocal = safeMultiply(localBeforeWht, whtRate);
    const netLocalDeposit = safeMultiply(localBeforeWht, 1 - whtRate);

    const whtUsd = safeDivide(whtLocal, midRate);
    const totalDeductedUsd = platformCutUsd + wireCutUsd + spreadLeakageUsd + whtUsd;
    const yieldFraction    = safeDivide(netLocalDeposit, safeMultiply(grossUsd, midRate));

    return {
      rail,
      netLocalDeposit,
      netUsdRetained: 0,
      totalDeductedUsd,
      yieldFraction,
      leakagePct: safeMultiply(1 - yieldFraction, 100),
      feasible: true,
    };
  });
}

/* -------------------------------------------------------------------------- *
 * Formatting helpers (UI-layer only, kept here for co-location with the math)
 * -------------------------------------------------------------------------- */

/** Format a USD amount with $ prefix and 2 decimal places. */
export function fmtUsd(amount: number): string {
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format a local-currency amount with a symbol prefix and 2 decimal places. */
export function fmtLocal(amount: number, symbol: string): string {
  if (!Number.isFinite(amount)) return `${symbol}0`;
  return `${symbol}${Math.round(amount).toLocaleString("en-US")}`;
}

/** Format a percentage with 2 decimal places and a % suffix. */
export function fmtPct(pct: number): string {
  if (!Number.isFinite(pct)) return "0.00%";
  return `${pct.toFixed(2)}%`;
}
