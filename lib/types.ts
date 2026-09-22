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

export interface Corridor {
  slug: string;
  from: string;
  to: string;
  rate: number;
  country: string;
  countryCode: string;
  currencyName: string;
  currencySymbol: string;
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