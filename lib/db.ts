import type {
  Corridor,
  FeesDataset,
  Platform,
  WithdrawalChannel,
} from './types';
import rawFees from '../data/fees.json';

/**
 * PayoutDelta data-access layer (Phase 1).
 *
 * Phase 1 reads the immutable JSON dataset at `data/fees.json` at build time
 * (static export). This module is the SINGLE seam between the app and the fee
 * data so that Phase 2 can swap the backing store without touching consumers.
 *
 * ---------------------------------------------------------------------------
 * PHASE 2 — DIMENSIONAL STAR-SCHEMA MIGRATION (stub / design note)
 * ---------------------------------------------------------------------------
 * When PayoutDelta becomes a B2B SaaS, `slices` below should be backed by a
 * relational store (SQLite during self-hosting, PostgreSQL on the managed
 * tier) instead of the JSON file. The target schema is a classic star schema
 * keyed on `(corridor_id, channel_id, platform_id, as_of_date)`:
 *
 *   fact_payout_quotes            -- one row per corridor × channel quote snap
 *     payout_quote_id            PK (bigserial / INTEGER PRIMARY KEY)
 *     corridor_id                FK -> dim_corridor.corridor_id
 *     channel_id                 FK -> dim_channel.channel_id
 *     platform_id                FK -> dim_platform.platform_id
 *     date_id                    FK -> dim_date.date_id
 *     gross_usd                  NUMERIC(18,2)
 *     mid_rate                   NUMERIC(20,6)
 *     effective_rate             NUMERIC(20,6)
 *     fixed_fee_usd              NUMERIC(18,2)
 *     fx_spread                  NUMERIC(10,6)
 *     platform_fee_usd           NUMERIC(18,2)
 *     total_cost_usd             NUMERIC(18,2)
 *     local_amount               NUMERIC(24,6)
 *     created_at                 TIMESTAMPTZ DEFAULT now()
 *
 *   dim_corridor   -- corridor_id, from_ccy, to_ccy, rate_source, country_code
 *   dim_channel    -- channel_id, name, fixed_fee_usd, fx_spread, is_active
 *   dim_platform   -- platform_id, name, fee_percent, is_active
 *   dim_date       -- date_id YYYYMMDD, full_date, month, quarter, year (for
 *                    weekly fee/markup trend analysis)
 *
 *   fact_rate_alerts -- Phase 2 "Rate Drop Alerts": user_id, corridor_id,
 *                    target_rate, status, triggered_at (for the email job).
 *
 * Suggested migrations:
 *   1. SQLite (dev seed): copy the JSON into an idempotent seed script
 *      (`npm run db:seed`) so `fees.json` remains the source of truth.
 *   2. PostgreSQL (prod): `CREATE TABLE ... LIKE` + upsert on
 *      (corridor_id, channel_id, platform_id, date_id) with a partial unique
 *      index so ETL re-runs are idempotent (see scripts/playwright_scraper.py).
 *   3. Add `SELECT` views that mirror the current selector functions below so
 *      the UI code changes very little when the swap lands.
 * ---------------------------------------------------------------------------
 */

const dataset: FeesDataset = rawFees;

/** Returns the raw, versioned dataset plus schema metadata. */
export function getDataset(): FeesDataset {
  return dataset;
}

/** All withdrawal channels currently modeled (5 in Phase 1). */
export function getChannels(): WithdrawalChannel[] {
  return dataset.channels;
}

/** All client platforms currently modeled (3 in Phase 1). */
export function getPlatforms(): Platform[] {
  return dataset.platforms;
}

/** Every corridor slug available for static route generation. */
export function getCorridorSlugs(): string[] {
  return dataset.corridors.map((corridor) => corridor.slug);
}

/** All corridors, sorted by their published mid-market rate descending. */
export function getCorridors(): Corridor[] {
  return dataset.corridors;
}

/**
 * Resolves a single corridor by its route slug.
 * Returns `null` when the slug does not exist (caller decides: 404 or fallback).
 */
export function getCorridorBySlug(slug: string): Corridor | null {
  return dataset.corridors.find((corridor) => corridor.slug === slug) ?? null;
}

/** True when the corridor slug exists in the dataset. */
export function isKnownCorridorSlug(slug: string): boolean {
  return dataset.corridors.some((corridor) => corridor.slug === slug);
}