import type {
  Corridor,
  InvertedQuote,
  InverseVerdict,
  Platform,
  WithdrawalChannel,
} from '@/lib/types';
import { clampGrossUSD, MAX_GROSS_USD, MIN_GROSS_USD } from '@/utils/calculateRoute';
import { calculateGrossFromTargetNet } from '@/lib/calculatorEngine';

/**
 * PayoutDelta — inverse deduction solver (Phase 3, "Target Goal" mode).
 *
 * Forward audits (Phase 1) answer "how much local currency lands from a
 * $X gross invoice?". The inverse solver walks that same cost stack
 * BACKWARDS: given a target net local deposit, what gross USD invoice must be
 * billed on a given platform?
 *
 * The three-layer legacy solver only accounted for the platform cut, the
 * channel's fixed clearing fee and the FX spread:
 *
 *   gross = ((targetNetLocal / effectiveRate) + fixedFee) / (1 − platformFee)
 *   where `effectiveRate = interbankRate * (1 − fxSpread)`
 *
 * Phase B lifts the inversion to the full seven-layer gross-up via
 * `calculateGrossFromTargetNet` (lib/calculatorEngine.ts): the intermediary
 * correspondent SWIFT cut, the local landing fee and the statutory
 * withholding tier are now settled on top of the target, so the required
 * invoice is exact. Every function is pure, finite-safe and clamped — a zero,
 * negative, NaN or absurd input can never produce Infinity or spin a loop —
 * and the UI stays at INP < 50ms because the whole computation is a single
 * O(1) `useMemo` pass.
 */

/** Optional settlement overrides that lift the 3-layer inverse above the
 *  Phase B gross-up: intermediary SWIFT cut (USD), local landing fee
 *  (domestic units) and statutory withholding (decimal fraction). All default
 *  to 0 → the solver reproduces the legacy three-layer behaviour exactly. */
export interface SettlementOverrides {
  wireUSD?: number;
  localFee?: number;
  tierRate?: number;
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** An empty quote used whenever the target is unusable (bounds the UI). */
function zeroQuote(
  channel: WithdrawalChannel,
  targetNetLocal: number,
  overrides: SettlementOverrides = {}
): InvertedQuote {
  return {
    channelId: channel.id,
    channelName: channel.name,
    targetNetLocal: safeNumber(targetNetLocal),
    effectiveRate: 0,
    usdConverted: 0,
    netAfterPlatformUSD: 0,
    fixedFeeUSD: safeNumber(channel.fixedFeeUSD),
    platformFeeUSD: 0,
    platformFeePercent: 0,
    wireUSD: safeNumber(overrides.wireUSD ?? 0),
    landingFeeLocal: safeNumber(overrides.localFee ?? 0),
    tierRate: safeNumber(overrides.tierRate ?? 0),
    fxSpread: 0,
    spreadLeakageUsd: 0,
    spreadLeakageLocal: 0,
    bankAndWireCutUSD: 0,
    realizedTakeHomeLocal: 0,
    grossRequiredRaw: 0,
    grossRequired: MIN_GROSS_USD,
    outOfBounds: true,
    totalCostUSD: 0,
    totalCostPercent: 0,
  };
}

/**
 * Exact gross USD invoice required on `platform` via `channel` to net
 * `targetNetLocal` in the corridor's domestic currency, after the platform
 * cut, SWIFT intermediary cut, local landing fee, FX spread and statutory
 * withholding (Phase B gross-up).
 */
export function invertChannelQuote(
  targetNetLocalInput: number,
  platform: Platform,
  channel: WithdrawalChannel,
  corridor: Corridor,
  overrides: SettlementOverrides = {}
): InvertedQuote {
  const targetNetLocal = safeNumber(targetNetLocalInput);
  const feePercent = safeNumber(platform.feePercent);
  const spread = Math.max(0, safeNumber(channel.fxSpread));
  const fixedFeeUSD = Math.max(0, safeNumber(channel.fixedFeeUSD));
  const wireUSD = Math.max(0, safeNumber(overrides.wireUSD ?? 0));
  const landingFeeLocal = Math.max(0, safeNumber(overrides.localFee ?? 0));
  const tierRate = Math.max(0, safeNumber(overrides.tierRate ?? 0));

  // Guard rail #1 — non-positive / non-finite targets are un-solvable.
  if (targetNetLocal <= 0 || feePercent < 0 || feePercent >= 100) {
    return zeroQuote(channel, targetNetLocal, overrides);
  }

  const solved = calculateGrossFromTargetNet({
    targetNetLocal,
    platformFeePercent: feePercent,
    channelSpread: spread,
    baseRate: corridor.rate,
    fixedFeeUSD,
    intermediaryCutUSD: wireUSD,
    landingFeeLocal,
    taxWithholdingRate: tierRate,
  });

  // Guard rail #2 — a degenerate FX rate or withholding tier cannot be
  // inverted; treat the channel as unsolvable instead of dividing by zero.
  if (!solved.feasible) {
    return zeroQuote(channel, targetNetLocal, overrides);
  }

  const effectiveRate = solved.realizedRate;
  const grossRequiredRaw = safeNumber(solved.requiredGrossBill);
  const grossRequired = clampGrossUSD(grossRequiredRaw);

  // Re-derive the full breakdown from the (clamped) billable gross so every
  // figure the UI shows is internally consistent with what gets invoiced.
  const platformFeeUSD = safeNumber((grossRequired * feePercent) / 100);
  const netAfterPlatform = safeNumber(grossRequired - platformFeeUSD);
  const bankAndWireCutUSD = safeNumber(solved.bankAndWireCutUsd);
  const usdConvertedFinal = Math.max(0, netAfterPlatform - bankAndWireCutUSD);
  const spreadLeakageUsd = safeNumber(solved.spreadLeakageUsd);
  const totalCostUSD = safeNumber(
    platformFeeUSD + bankAndWireCutUSD + spreadLeakageUsd
  );
  const totalCostPercent =
    grossRequired > 0 ? (totalCostUSD / grossRequired) * 100 : 0;

  const outOfBounds =
    grossRequiredRaw < MIN_GROSS_USD || grossRequiredRaw > MAX_GROSS_USD;

  return {
    channelId: channel.id,
    channelName: channel.name,
    targetNetLocal: Math.round(targetNetLocal),
    effectiveRate,
    usdConverted: usdConvertedFinal,
    netAfterPlatformUSD: netAfterPlatform,
    fixedFeeUSD,
    platformFeeUSD,
    platformFeePercent: feePercent,
    wireUSD,
    landingFeeLocal,
    tierRate,
    fxSpread: spread,
    spreadLeakageUsd,
    spreadLeakageLocal: safeNumber(solved.spreadLeakageLocal),
    bankAndWireCutUSD,
    realizedTakeHomeLocal: Math.round(solved.realizedTakeHomeLocal),
    grossRequiredRaw,
    grossRequired,
    outOfBounds,
    totalCostUSD,
    totalCostPercent,
  };
}

/** Inverts every channel for a platform, ranked cheapest invoice first. */
export function invertAllChannels(
  targetNetLocal: number,
  platform: Platform,
  corridor: Corridor,
  channels: WithdrawalChannel[],
  overrides: SettlementOverrides = {}
): InvertedQuote[] {
  return channels
    .map((channel) =>
      invertChannelQuote(targetNetLocal, platform, channel, corridor, overrides)
    )
    .sort((a, b) => a.grossRequired - b.grossRequired);
}

/** BLUF for a target: the cheapest invoice channel and the spread vs worst. */
export function buildInverseVerdict(
  quotes: InvertedQuote[]
): InverseVerdict {
  if (quotes.length === 0) {
    return { best: null, worst: null, savingsUSD: 0, outOfBounds: false };
  }
  let best: InvertedQuote = quotes[0];
  let worst: InvertedQuote = quotes[0];
  for (const quote of quotes) {
    if (quote.grossRequired < best.grossRequired) best = quote;
    if (quote.grossRequired > worst.grossRequired) worst = quote;
  }
  return {
    best,
    worst,
    savingsUSD: safeNumber(worst.grossRequired - best.grossRequired),
    outOfBounds: quotes.some((quote) => quote.outOfBounds),
  };
}

/** One-stop inverse entry point, mirroring `computeRoute`'s signature. */
export function computeInverseRoute(
  targetNetLocalInput: number,
  platform: Platform,
  corridor: Corridor,
  channels: WithdrawalChannel[],
  overrides: SettlementOverrides = {}
): {
  corridor: Corridor;
  platform: Platform;
  targetNetLocal: number;
  quotes: InvertedQuote[];
  verdict: InverseVerdict;
} {
  const targetNetLocal = Math.max(0, Math.round(safeNumber(targetNetLocalInput)));
  const quotes = invertAllChannels(
    targetNetLocal,
    platform,
    corridor,
    channels,
    overrides
  );
  return {
    corridor,
    platform,
    targetNetLocal,
    quotes,
    verdict: buildInverseVerdict(quotes),
  };
}

/** Corridor-friendly slider bounds for the inverse (local-currency) inputs.
 *  Target mode tops out at ~$20,000 USD equivalent (billing is capped by the
 *  $100,000 gross clamp anyway); the min stays ~$100 equivalent. */
export function localSliderBounds(corridor: Corridor): {
  min: number;
  max: number;
  step: number;
} {
  const rate = safeNumber(corridor.rate);
  return {
    min: Math.max(1, Math.round(MIN_GROSS_USD * rate)),
    max: Math.round(20000 * rate),
    step: Math.max(1, Math.round(50 * rate)),
  };
}

/** Corridor-tiered quick "Target Take-Home" chips, in local currency.
 *
 *  Bands follow the corridor mid-rate so a chip is always a sane invoice
 *  (1–3 USD thousands for pegged/single-digit corridors, EUR-friendly chips
 *  for sub-1 rates, and six-figure local chips for the high-denomination
 *  corridors such as PKR/INR/PHP/NGN/VND). */
export function corridorTargetPresets(corridor: Corridor): readonly number[] {
  const rate = safeNumber(corridor.rate);
  if (rate >= 100) {
    return [100_000, 250_000, 500_000];
  }
  if (rate >= 20) {
    return [50_000, 150_000, 300_000];
  }
  if (rate >= 5) {
    return [10_000, 25_000, 50_000];
  }
  if (rate < 1) {
    return [1_500, 3_000, 5_000];
  }
  return [1_000, 2_500, 5_000];
}