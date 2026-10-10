/**
 * PayoutDelta — Multi-platform arbitrage comparison engine.
 *
 * Pure, deterministic FX-arbitrage calculations across four payout rails:
 * SWIFT Direct, Upwork Local, Deel Local, and Wise ACH.
 * All monetary inputs are USD; outputs convert to target currency via
 * the caller-supplied exchange rate.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformOption {
  id: "swift_direct" | "upwork_local" | "deel_local" | "wise_ach";
  name: string;
  flatFeeUsd: number;
  fxSpreadPercent: number;
  intermediaryDeduct: number;
  note: string;
}

export interface ArbitrageBreakdown {
  platform: PlatformOption;
  grossUsd: number;
  totalFeeUsd: number;
  landedAmountTarget: number;
  effectiveLossPercent: number;
  isOptimal: boolean;
}

// ─── Standard Platform Models ─────────────────────────────────────────────────

const PLATFORM_MODELS: PlatformOption[] = [
  {
    id: "swift_direct",
    name: "SWIFT Direct",
    flatFeeUsd: 30.0,
    fxSpreadPercent: 0.005,
    intermediaryDeduct: 20.0,
    note: "Full SWIFT chain (OUR/SHA rules apply)",
  },
  {
    id: "upwork_local",
    name: "Upwork Direct to Bank",
    flatFeeUsd: 0.99,
    fxSpreadPercent: 0.02,
    intermediaryDeduct: 0.0,
    note: "Retail FX conversion rate",
  },
  {
    id: "deel_local",
    name: "Deel Local Transfer",
    flatFeeUsd: 5.0,
    fxSpreadPercent: 0.0125,
    intermediaryDeduct: 0.0,
    note: "Fintech routing network",
  },
  {
    id: "wise_ach",
    name: "Wise ACH / Local",
    flatFeeUsd: 2.5,
    fxSpreadPercent: 0.0045,
    intermediaryDeduct: 0.0,
    note: "Mid-market close route",
  },
];

// ─── Core Engine ──────────────────────────────────────────────────────────────

/**
 * Compare all payout platforms and return ranked breakdowns.
 *
 * Landed amount formula:
 *   netUsd   = grossUsd − flatFeeUsd − (grossUsd × fxSpreadPercent) − intermediaryDeduct
 *   landed   = max(0, netUsd) × exchangeRate
 *   loss%    = totalFeeUsd / grossUsd
 *
 * The platform with the highest landed amount receives `isOptimal: true`.
 */
export function comparePlatformArbitrage(
  grossUsd: number,
  exchangeRate: number
): ArbitrageBreakdown[] {
  const results: ArbitrageBreakdown[] = PLATFORM_MODELS.map((platform) => {
    const fxSpreadCost = grossUsd * platform.fxSpreadPercent;
    const totalFeeUsd = platform.flatFeeUsd + fxSpreadCost + platform.intermediaryDeduct;
    const netUsd = Math.max(0, grossUsd - totalFeeUsd);
    const landedAmountTarget = netUsd * exchangeRate;
    const effectiveLossPercent = grossUsd > 0 ? totalFeeUsd / grossUsd : 0;

    return {
      platform,
      grossUsd,
      totalFeeUsd,
      landedAmountTarget,
      effectiveLossPercent,
      isOptimal: false,
    };
  });

  // Mark the optimal route (highest landed amount)
  const maxLanded = Math.max(...results.map((r) => r.landedAmountTarget));
  for (const result of results) {
    result.isOptimal =
      result.landedAmountTarget === maxLanded && maxLanded > 0;
  }

  return results;
}
