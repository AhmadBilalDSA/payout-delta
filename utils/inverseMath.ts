import type {
  Corridor,
  InvertedQuote,
  InverseVerdict,
  Platform,
  WithdrawalChannel,
} from '@/lib/types';
import { clampGrossUSD, MAX_GROSS_USD, MIN_GROSS_USD } from '@/utils/calculateRoute';

/**
 * PayoutDelta — inverse deduction solver (Phase 3, "Target Goal" mode).
 *
 * Forward audits (Phase 1) answer "how much local currency lands from a
 * $X gross invoice?". The inverse solver walks that same three-layer cost
 * stack BACKWARDS: given a target net local deposit, what gross USD invoice
 * must be billed on a given platform?
 *
 *   gross * (1 − platformFee) − fixedFee  =  targetNetLocal / effectiveRate
 *   ⇒  gross = ((targetNetLocal / effectiveRate) + fixedFee) / (1 − platformFee)
 *
 * where `effectiveRate = interbankRate * (1 − fxSpread)`. Every function is
 * pure, finite-safe and clamped so a zero, negative, NaN or absurd input can
 * never produce Infinity or spin a loop — the UI stays at INP < 50ms because
 * the whole computation is a single O(1) `useMemo` pass.
 */

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** An empty quote used whenever the target is unusable (bounds the UI). */
function zeroQuote(
  channel: WithdrawalChannel,
  targetNetLocal: number
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
    grossRequiredRaw: 0,
    grossRequired: MIN_GROSS_USD,
    outOfBounds: true,
    totalCostUSD: 0,
    totalCostPercent: 0,
  };
}

/**
 * Exact gross USD invoice required on `platform` via `channel` to net
 * `targetNetLocal` in the corridor's domestic currency.
 */
export function invertChannelQuote(
  targetNetLocalInput: number,
  platform: Platform,
  channel: WithdrawalChannel,
  corridor: Corridor
): InvertedQuote {
  const targetNetLocal = safeNumber(targetNetLocalInput);
  const feePercent = safeNumber(platform.feePercent);

  // Guard rail #1 — non-positive / non-finite targets are un-solvable.
  if (targetNetLocal <= 0 || feePercent < 0 || feePercent >= 100) {
    return zeroQuote(channel, targetNetLocal);
  }

  const spread = Math.max(0, safeNumber(channel.fxSpread));
  const effectiveRate = safeNumber(corridor.rate * (1 - spread));

  // Guard rail #2 — a degenerate FX rate (zero / negative corridor) cannot
  // be inverted; treat the channel as unsolvable instead of dividing by zero.
  if (corridor.rate <= 0 || effectiveRate <= 0) {
    return zeroQuote(channel, targetNetLocal);
  }

  const fixedFeeUSD = Math.max(0, safeNumber(channel.fixedFeeUSD));
  const usdConverted = safeNumber(targetNetLocal / effectiveRate);
  const netAfterPlatformUSD = safeNumber(usdConverted + fixedFeeUSD);

  const denominator = 1 - feePercent / 100;
  const grossRequiredRaw = safeNumber(netAfterPlatformUSD / denominator);
  const grossRequired = clampGrossUSD(grossRequiredRaw);

  // Re-derive the full breakdown from the (clamped) billable gross so every
  // figure the UI shows is internally consistent with what gets invoiced.
  const platformFeeUSD = safeNumber((grossRequired * feePercent) / 100);
  const netAfterPlatform = safeNumber(grossRequired - platformFeeUSD);
  const usdConvertedFinal = Math.max(0, netAfterPlatform - fixedFeeUSD);
  const fxLossUSD = safeNumber(usdConvertedFinal * spread);
  const totalCostUSD = safeNumber(
    platformFeeUSD + fixedFeeUSD + fxLossUSD
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
  channels: WithdrawalChannel[]
): InvertedQuote[] {
  return channels
    .map((channel) =>
      invertChannelQuote(targetNetLocal, platform, channel, corridor)
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
  channels: WithdrawalChannel[]
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
    channels
  );
  return {
    corridor,
    platform,
    targetNetLocal,
    quotes,
    verdict: buildInverseVerdict(quotes),
  };
}

/** Corridor-friendly slider bounds for the inverse (local-currency) inputs. */
export function localSliderBounds(corridor: Corridor): {
  min: number;
  max: number;
  step: number;
} {
  const rate = safeNumber(corridor.rate);
  return {
    min: Math.max(1, Math.round(MIN_GROSS_USD * rate)),
    max: Math.round(MAX_GROSS_USD * rate),
    step: Math.max(1, Math.round(50 * rate)),
  };
}