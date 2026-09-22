import type {
  ChannelQuote,
  Corridor,
  Platform,
  RouteResult,
  Verdict,
  WithdrawalChannel,
} from '@/lib/types';

/**
 * Core fee mathematics for PayoutDelta (Phase 1).
 *
 * Every payout is decomposed into three cost layers, mirroring how funds are
 * actually processed:
 *
 *   1. Platform commission  — platform.feePercent applied to gross USD.
 *   2. Channel fixed fee    — channel.fixedFeeUSD flat deduction.
 *   3. FX spread            — channel.fxSpread as a fraction of the mid rate.
 *
 * The math stays fully client-side (`useMemo`) so Interaction-to-Next-Paint
 * stays well under the 50ms budget: there is no network round-trip and no
 * re-render besides the two inputs that affect it.
 *
 * ---------------------------------------------------------------------------
 * PHASE 2 — MULTI-HOP ARBITRAGE EXPANSION
 * ---------------------------------------------------------------------------
 * Phase 2 will introduce multi-hop arbitrage (e.g. USD -> EUR inside Wise,
 * then EUR -> PKR; or USD -> GBP -> NGN via inter-bank crossing) and
 * portfolio "sweep" optimization across several withdrawals per month.
 * To keep that refactor surgery-free:
 *   - Every function below is PURE and takes plain value objects; the future
 *     `computeMultiHopRoute()` can compose them into a graph search
 *     (Dijkstra over (corridor, channel) edges weighted by total cost).
 *   - All currency math must stay in one module so a move to `decimal.js`
 *     or an integer-minor representation later touches one file.
 * ---------------------------------------------------------------------------
 */

export const MIN_GROSS_USD = 100;
export const MAX_GROSS_USD = 100000;
export const DEFAULT_GROSS_USD = 1000;
export const SLIDER_STEP_USD = 50;

/**
 * Clamps any value into the [$100, $100,000] slider bounds and guards the
 * non-finite edge cases (`NaN`, `Infinity`, `-Infinity`) that could otherwise
 * cascade into hopeless renders. Returns the default when input is unusable.
 */
export function clampGrossUSD(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GROSS_USD;
  }
  return Math.min(MAX_GROSS_USD, Math.max(MIN_GROSS_USD, value));
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Computes the full per-channel quote for a single corridor.
 *
 * `usdConverted` is the amount that actually crosses the FX layer after the
 * fixed fee; `totalCostUSD` folds platform + fixed + FX-spread losses into a
 * single comparable number so two channels can be audited at a glance.
 */
export function quoteChannel(
  grossUSDInput: number,
  platform: Platform,
  channel: WithdrawalChannel,
  corridor: Corridor
): ChannelQuote {
  const grossUSD = clampGrossUSD(grossUSDInput);

  const platformFeeUSD = safeNumber(
    (grossUSD * platform.feePercent) / 100
  );
  const netAfterPlatformUSD = safeNumber(grossUSD - platformFeeUSD);

  // The flat channel fee can never exceed the amount available after the
  // platform cut; anything charged beyond that is treated as "all funds lost".
  const feeDeductedUSD = Math.min(
    channel.fixedFeeUSD,
    Math.max(0, netAfterPlatformUSD)
  );
  const usdConverted = Math.max(0, netAfterPlatformUSD - feeDeductedUSD);

  const fxSpread = Math.max(0, channel.fxSpread);
  const effectiveRate = safeNumber(corridor.rate * (1 - fxSpread));
  const localAmount = safeNumber(usdConverted * effectiveRate);
  const fxLossUSD = safeNumber(usdConverted * fxSpread);
  const totalCostUSD = safeNumber(
    platformFeeUSD + feeDeductedUSD + fxLossUSD
  );

  const totalCostPercent = grossUSD > 0 ? (totalCostUSD / grossUSD) * 100 : 0;

  return {
    channelId: channel.id,
    channelName: channel.name,
    grossUSD,
    platformFeeUSD,
    netAfterPlatformUSD,
    feeDeductedUSD,
    usdConverted,
    effectiveRate,
    localAmount,
    totalCostUSD,
    totalCostPercent,
  };
}

/** Quotes every channel for a corridor, sorted best (highest local amount) first. */
export function quoteAllChannels(
  grossUSD: number,
  platform: Platform,
  corridor: Corridor,
  channels: WithdrawalChannel[]
): ChannelQuote[] {
  const quotes = channels.map((channel) =>
    quoteChannel(grossUSD, platform, channel, corridor)
  );
  return quotes.sort((a, b) => b.localAmount - a.localAmount);
}

/**
 * Builds the BLUF verdict: the cheapest channel (highest local currency in
 * hand) and the exact local amount saved versus the most expensive route.
 */
export function buildVerdict(quotes: ChannelQuote[]): Verdict {
  if (quotes.length === 0) {
    return { best: null, worst: null, savingsLocal: 0, savingsUSD: 0 };
  }

  let best: ChannelQuote = quotes[0];
  let worst: ChannelQuote = quotes[0];
  for (const quote of quotes) {
    if (quote.localAmount > best.localAmount) best = quote;
    if (quote.localAmount < worst.localAmount) worst = quote;
  }

  const savingsLocal = safeNumber(best.localAmount - worst.localAmount);
  // USD-equivalent of the saved local amount, recomputed via the best route's
  // effective rate so it stays meaningful even when rates differ per channel.
  const savingsUSD =
    best.effectiveRate > 0 ? safeNumber(savingsLocal / best.effectiveRate) : 0;

  return { best, worst, savingsLocal, savingsUSD };
}

/** One-stop entry point used by the client calculator. */
export function computeRoute(
  grossUSDInput: number,
  platform: Platform,
  corridor: Corridor,
  channels: WithdrawalChannel[]
): RouteResult {
  const grossUSD = clampGrossUSD(grossUSDInput);
  const quotes = quoteAllChannels(grossUSD, platform, corridor, channels);
  return {
    corridor,
    platform,
    grossUSD,
    quotes,
    verdict: buildVerdict(quotes),
  };
}