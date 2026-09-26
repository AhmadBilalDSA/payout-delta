/**
 * PayoutDelta — Dashboard v3 client payload contract.
 *
 * The dashboard is a static export with a hard 60KB gzip budget for the route,
 * so the client islands must never reach back into the build-time datasets.
 * `lib/clearingTerminal.ts` already proves the pattern for the registry: the
 * server resolves everything and ships one flat, serializable array.
 *
 * This file is the same idea for the two surfaces that need fee-model detail —
 * the Simple Tier provider matrix and the Diagnostic Tier fee waterfall. It
 * carries numbers and short strings only, so the JSON lands in the HTML at a
 * few KB gzipped instead of dragging `data/fees.json` and the ~226KB statutory
 * bank directory into the browser bundle.
 *
 * Every monetary field is a benchmark resolved from the versioned dataset at
 * build time. Nothing here is modelled or illustrative: a figure is either
 * published in the dataset or derived from a published figure by the same
 * arithmetic the client engine re-runs.
 */

import type { UiKey } from "@/lib/i18n/dictionaries";

/** One provider fee model published on a corridor (Wise / Payoneer / wire). */
export interface DashboardProvider {
  /** Provider id as authored in `data/fees.json`. */
  id: string;
  /** Display name, kept in English in every locale (nominative fair use). */
  name: string;
  /** Flat clearing / withdrawal fee in USD. */
  fixedFeeUSD: number;
  /** FX markup as a decimal fraction (0.0045 = 0.45%). */
  fxSpread: number;
}

/**
 * The lean per-corridor record the client islands read.
 *
 * `rate` is the interbank reference (local units per USD), `taxRate` the
 * statutory withholding tier, `landingFeeLocal` the receiving bank's fee and
 * `intermediaryUsd` the benchmark correspondent cut — i.e. exactly the inputs
 * `calculateGrossFromTargetNet` needs to invert a target net deposit.
 */
export interface DashboardCorridor {
  slug: string;
  from: string;
  to: string;
  /** `USD → PKR` */
  pair: string;
  country: string;
  countryCode: string;
  /** Regional-indicator flag for the beneficiary market. */
  flag: string;
  /** Domestic currency symbol, used when rendering local take-home. */
  symbol: string;
  /** Interbank reference rate (local per USD). */
  rate: number;
  /** Statutory withholding as a decimal fraction. */
  taxRate: number;
  /** Receiving-bank landing fee in the domestic currency. */
  landingFeeLocal: number;
  /** Benchmark intermediary correspondent cut in USD. */
  intermediaryUsd: number;
  /** Every provider fee model published on this corridor. */
  providers: DashboardProvider[];
}

/** A client platform's commission, resolved build-time from `data/fees.json`. */
export interface DashboardPlatform {
  id: string;
  /** Commission percent; 0 for a direct client invoice. */
  feePercent: number;
  /** Dictionary key for the platform's display name in the active locale. */
  labelKey: UiKey;
}

/**
 * The four build-time tiles of the Simple Tier KPI strip.
 *
 * `cheapestFeePercent` / `priciestFeePercent` are the all-in cost as a share of
 * the benchmark gross, taken across every corridor's cheapest published
 * provider. The slugs travel with the numbers so the tile can name the corridor
 * it is talking about instead of asserting a bare percentage.
 */
export interface DashboardKpis {
  corridorsAudited: number;
  /** Distinct provider fee models benchmarked across the whole dataset. */
  providersBenchmarked: number;
  cheapestFeePercent: number;
  cheapestFeeSlug: string;
  priciestFeePercent: number;
  priciestFeeSlug: string;
}
