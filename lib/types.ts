export interface Platform {
  id: string;
  name: string;
  feePercent: number;
  feeType: string;
}

export interface WithdrawalChannel {
  id: string;
  name: string;
  fixedFeeUSD: number;
  fxSpread: number;
}

export interface ProviderFee {
  id: string;
  name: string;
  fixedFeeUSD: number;
  fxSpread: number;
}

export interface Corridor {
  slug: string;
  from: string;
  to: string;
  rate: number;
  country: string;
  countryCode: string;
  currencyName: string;
  currencySymbol: string;
  /** Corridor-specific provider fee models (Wise / Payoneer / Direct Wire). */
  providers?: ProviderFee[];
}

export interface FeesDataset {
  schemaVersion: number;
  dataset: string;
  updatedAt: string;
  description: string;
  disclaimer: string;
  currency: {
    base: string;
    symbol: string;
  };
  platforms: Platform[];
  channels: WithdrawalChannel[];
  corridors: Corridor[];
}

export interface ChannelQuote {
  channelId: string;
  channelName: string;
  grossUSD: number;
  platformFeeUSD: number;
  netAfterPlatformUSD: number;
  feeDeductedUSD: number;
  usdConverted: number;
  effectiveRate: number;
  localAmount: number;
  totalCostUSD: number;
  totalCostPercent: number;
}

export interface Verdict {
  best: ChannelQuote | null;
  worst: ChannelQuote | null;
  savingsLocal: number;
  savingsUSD: number;
}

export interface RouteResult {
  corridor: Corridor;
  platform: Platform;
  grossUSD: number;
  quotes: ChannelQuote[];
  verdict: Verdict;
}

/** Phase 3 — calculator operating mode (forward quote vs inverse target). */
export type CalcMode = "gross-to-net" | "net-to-gross";

/**
 * Phase 3 — result of the inverse deduction solver for a single channel:
 * the exact gross USD invoice required to net a target local amount.
 */
export interface InvertedQuote {
  channelId: string;
  channelName: string;
  targetNetLocal: number;
  effectiveRate: number;
  /** USD value that must cross the FX layer after the fixed fee. */
  usdConverted: number;
  /** USD after the platform cut but before the fixed fee. */
  netAfterPlatformUSD: number;
  fixedFeeUSD: number;
  platformFeeUSD: number;
  platformFeePercent: number;
  /** Raw (unclamped) solver output, kept for OOB detection. */
  grossRequiredRaw: number;
  /** Clamped into the [MIN_GROSS_USD, MAX_GROSS_USD] invoice range. */
  grossRequired: number;
  /** True when the raw target cannot be netted inside the slider bounds. */
  outOfBounds: boolean;
  totalCostUSD: number;
  totalCostPercent: number;
}

/** Phase 3 — cheapest (lowest invoice) vs costliest channel for a target. */
export interface InverseVerdict {
  best: InvertedQuote | null;
  worst: InvertedQuote | null;
  /** USD you would need to bill less versus the worst channel. */
  savingsUSD: number;
  /** True if any channel's target fell outside the invoice bounds. */
  outOfBounds: boolean;
}

/** Phase 3 — one daily mid-rate observation for a corridor. */
export interface HistoryPoint {
  date: string;
  rate: number;
}

/** Phase 3 — marshalled shape of data/history.json. */
export interface HistoryDataset {
  schemaVersion: number;
  dataset: string;
  updatedAt: string;
  description: string;
  history: Record<string, HistoryPoint[]>;
}

/** Phase 3 — derived 14-day trajectory facts for the sparkline pill. */
export interface SparklineStats {
  trendPercent: number;
  direction: "up" | "down" | "flat";
  spreadState: "Normal" | "Favorable";
  latestRate: number;
  oldestRate: number;
}