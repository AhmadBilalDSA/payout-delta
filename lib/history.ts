import type {
  HistoryDataset,
  HistoryPoint,
  SparklineStats,
  WithdrawalChannel,
} from '@/lib/types';
import rawHistory from '../data/history.json';

/**
 * PayoutDelta — 14-day rate-history access layer (Phase 3).
 *
 * `data/history.json` is a companion to `data/fees.json`: each corridor
 * maps to a 14-point `{date, rate}` trajectory that scripts/playwright_scraper.py
 * appends to daily (oldest entry rolls off, atomically). All accessors below
 * are pure and read the same immutable snapshot, so the sparkline SSG-renders
 * server-side — search indexers see the numeric trajectory without any client
 * JavaScript, and the exported SVG costs zero bundle weight.
 */

const dataset = rawHistory as HistoryDataset;

/** Raw versioned history dataset plus schema metadata. */
export function getHistoryDataset(): HistoryDataset {
  return dataset;
}

/** The `{date, rate}` series for a corridor slug (empty when unknown). */
export function getCorridorHistory(slug: string): HistoryPoint[] {
  return dataset.history[slug] ?? [];
}

/** Latest observation date for a corridor, or `null` when none recorded. */
export function getLatestHistoryDate(slug: string): string | null {
  const series = getCorridorHistory(slug);
  return series.length > 0 ? series[series.length - 1].date : null;
}

/**
 * 14-day trajectory facts: signed % change, direction, and a deterministic
 * spread-state label. `spreadState` reads provider spreads from the fee
 * dataset: when the tightest channel's markup is a small fraction of the
 * widest channel's, savers have a genuinely cheaper lane → "Favorable";
 * otherwise the corridor is priced "Normal".
 */
export function computeSparklineStats(
  history: HistoryPoint[],
  channels: WithdrawalChannel[]
): SparklineStats {
  const fallback: SparklineStats = {
    trendPercent: 0,
    direction: "flat",
    spreadState: "Normal",
    latestRate: 0,
    oldestRate: 0,
  };
  if (history.length < 2) {
    return fallback;
  }

  const latestRate = history[history.length - 1].rate;
  const oldestRate = history[0].rate;
  const trendPercent =
    oldestRate > 0 ? ((latestRate - oldestRate) / oldestRate) * 100 : 0;
  const direction =
    trendPercent > 0.01 ? "up" : trendPercent < -0.01 ? "down" : "flat";

  const spreads = channels
    .map((channel) => channel.fxSpread)
    .filter((value) => Number.isFinite(value) && value > 0);
  const minSpread = spreads.length ? Math.min(...spreads) : 0;
  const maxSpread = spreads.length ? Math.max(...spreads) : 0;
  const spreadState =
    maxSpread > 0 && minSpread / maxSpread <= 0.15
      ? "Favorable"
      : "Normal";

  return { trendPercent, direction, spreadState, latestRate, oldestRate };
}