/**
 * PayoutDelta — Dashboard v3: Institutional Clearing Terminal index builder.
 *
 * Derives one compact, serializable registry row per audited corridor so
 * `app/dashboard/page.tsx` can hand a single lean array to the client
 * `DashboardV3` island. Everything expensive — the regulatory bank lookup, the
 * correspondent routing, the field 71A resolution and the retail bank spread
 * math — resolves HERE at build time. The client ships only the precomputed
 * rows and runs pure in-memory filtering / CSV serialization, so the terminal
 * stays a static export with zero network round-trips.
 *
 * Design rules this module enforces:
 *   - Every published figure is DERIVED from `data/fees.json`,
 *     `data/regulatoryBanking.ts`, `data/banks.ts` and
 *     `lib/swiftRoutingEngine.ts`. Nothing is hardcoded, so the KPI ribbon can
 *     never drift away from the registry table printed directly beneath it.
 *   - The "retail bank spread" uses the exact same banking-layer penalty
 *     methodology as `/leaderboard` (direct-wire fee + intermediary SHA cut +
 *     hidden FX markup at the $1,000 benchmark), so the heatmap, the registry
 *     and the leakage index can never disagree.
 *   - All monetary figures are informational benchmarks. The actual deduction
 *     lands on the beneficiary bank's credit advice (CRF) and must be verified
 *     before invoicing. No legal or financial advice is expressed here.
 */

import type { Corridor } from "@/lib/types";
import { getChannels, getCorridors, getDataset, getPlatforms } from "@/lib/db";
import { FALLBACK_SWIFT_BAND, getRegulatoryBanking } from "@/data/regulatoryBanking";
import { BANK_DOSSIERS } from "@/data/banks";
import {
  CORRESPONDENT_NODES,
  clearingCurrencyFor,
  correspondentForBank,
  deductionBand,
  type ClearingCurrency,
} from "@/lib/swiftRoutingEngine";
import { flagOf } from "@/lib/directoryData";
import { quoteAllChannels } from "@/utils/calculateRoute";

/** Benchmark gross used for every percentage / USD friction figure. */
export const BENCHMARK_GROSS_USD = 1000;

/** Fallback direct-wire model for corridors authored without provider overrides. */
const DEFAULT_DIRECT_WIRE_FEE_USD = 18;
const DEFAULT_DIRECT_WIRE_SPREAD = 0.032;
const DEFAULT_INTERMEDIARY_CUT_USD = 18;

/** Legacy local-clearing sentinels that carry no accountable ISO 9362 BIC. */
const BIC_SENTINELS = new Set(["", "-", "—"]);

/** SHA deduction bands for the histogram. Order matters: first match wins. */
export type ShaCutBucket = "minimal" | "standard" | "heavy";

export interface ShaCutBucketSpec {
  id: ShaCutBucket;
  label: string;
  /** Inclusive lower bound in USD. */
  min: number;
  /** Inclusive upper bound in USD (Infinity for the open top bucket). */
  max: number;
  /** Label rendered beside the bar in the histogram legend. */
  range: string;
  /** Bar fill — emerald (clean), sky (typical), crimson (leaking). */
  tone: "emerald" | "sky" | "crimson";
}

export const SHA_CUT_BUCKETS: readonly ShaCutBucketSpec[] = [
  {
    id: "minimal",
    label: "Minimal Transit",
    min: 0,
    max: 15,
    range: "$0 – $15",
    tone: "emerald",
  },
  {
    id: "standard",
    label: "Standard Correspondent",
    min: 16,
    max: 25,
    range: "$16 – $25",
    tone: "sky",
  },
  {
    id: "heavy",
    label: "Heavy Intermediary",
    min: 26,
    max: Number.POSITIVE_INFINITY,
    range: "$26 – $35+",
    tone: "crimson",
  },
] as const;

/** Buckets a benchmark intermediary cut into its histogram band. */
export function bucketForCut(cutUsd: number): ShaCutBucket {
  const cut = Number.isFinite(cutUsd) ? cutUsd : 0;
  for (const bucket of SHA_CUT_BUCKETS) {
    if (cut >= bucket.min && cut <= bucket.max) return bucket.id;
  }
  return cut <= 15 ? "minimal" : cut <= 25 ? "standard" : "heavy";
}

/** One auditable line of the Institutional Clearing Registry. */
export interface ClearingRegistryRow {
  /** Canonical corridor slug, e.g. `usd-to-pkr`. */
  slug: string;
  /** Sending currency (ISO 4217), e.g. `USD`. */
  from: string;
  /** Receiving currency (ISO 4217), e.g. `PKR`. */
  to: string;
  /** `USD → PKR` */
  routePair: string;
  /** Beneficiary market name, e.g. `Pakistan`. */
  country: string;
  /** ISO 3166-1 alpha-2, e.g. `PK`. */
  countryCode: string;
  /** Regional-indicator flag emoji for the beneficiary market. */
  flag: string;
  /** Benchmark point intermediary SHA cut (USD). */
  cutUsd: number;
  /** Lower bound of the quoted SHA band (USD). */
  cutMinUsd: number;
  /** Upper bound of the quoted SHA band (USD). */
  cutMaxUsd: number;
  /** Preformatted signed deduction, e.g. `-$18.00` or `-$15.00 – $35.00`. */
  cutLabel: string;
  /** Histogram band this cut falls into. */
  bucket: ShaCutBucket;
  /** National clearing network serving the beneficiary, e.g. `Raast / BEFTN`. */
  rail: string;
  /** Clearing leg the correspondent node sits on. */
  clearingCurrency: ClearingCurrency;
  /** Named correspondent clearing hub the wire transits through. */
  correspondentName: string;
  /** Correspondent city, e.g. `New York, NY`. */
  correspondentCity: string;
  /** Correspondent ISO 9362 BIC, e.g. `CHASUS33`. */
  correspondentBic: string;
  /** Default receiving bank name for the corridor. */
  bankName: string;
  /** Receiving bank ISO 9362 BIC (`—` when the rail is local-clearing only). */
  beneficiaryBic: string;
  /** Field 71A charge code the terminal recommends. */
  chargeCode: string;
  /** Compact one-line field 71A rationale shown in the registry cell. */
  chargeNote: string;
  /** `/banks/<slug>` dossier that owns the detailed 71A guidance, if authored. */
  bankSlug: string | null;
  /** True when every authored provider quotes a 0.0% retail FX markup. */
  zeroMarkup: boolean;
  /** Retail bank spread as a percentage of the benchmark gross. */
  spreadPercent: number;
  /** Retail bank spread in USD at the benchmark gross. */
  spreadUsd: number;
}

/** A single cell of the retail bank spread heatmap. */
export interface SpreadHeatmapCell {
  slug: string;
  country: string;
  countryCode: string;
  flag: string;
  routePair: string;
  spreadUsd: number;
  spreadPercent: number;
  /** Cheapest modern digital rail on the corridor, for comparison context. */
  bestRail: string;
}

/** The four macro KPI cards on the top telemetry ribbon. */
export interface MacroTelemetry {
  /** Corridors audited in the registry. */
  corridorsAudited: number;
  /** Distinct ISO 9362 BICs verifiable across the registry + BIC dossier set. */
  verifiedBics: number;
  /** Peak intermediary SHA cut across the whole registry (USD). */
  peakCutUsd: number;
  /** Signed label for the peak cut, e.g. `-$34.00`. */
  peakCutLabel: string;
  /** Corridor holding the peak cut. */
  peakCutSlug: string;
  /** Named hub / bank the peak cut transits through. */
  peakCutVia: string;
  /** Corridors whose every provider quotes a 0.0% retail FX markup. */
  zeroMarkupCount: number;
  /** ISO codes of the zero-markup sovereign markets, alphabetically sorted. */
  zeroMarkupCodes: string[];
}

/** Histogram bucket tallies, always parallel to SHA_CUT_BUCKETS. */
export interface ShaHistogram {
  buckets: {
    id: ShaCutBucket;
    label: string;
    range: string;
    tone: "emerald" | "sky" | "crimson";
    count: number;
    /** Count as a share of the registry (0–100). */
    share: number;
  }[];
  /** Largest bucket count — the histogram scales its bars against this. */
  peak: number;
  total: number;
}

/** Retail bank spread heatmap: 5 tightest vs 5 highest-friction corridors. */
export interface SpreadHeatmap {
  tightest: SpreadHeatmapCell[];
  highest: SpreadHeatmapCell[];
  /** Widest spread observed, used to normalise the colour ramp (USD). */
  ceilingUsd: number;
}

/** Everything the `/dashboard` terminal needs, resolved at build time. */
export interface ClearingTerminalIndex {
  macro: MacroTelemetry;
  histogram: ShaHistogram;
  heatmap: SpreadHeatmap;
  rows: ClearingRegistryRow[];
  /** Dataset revision the figures were compiled from (ISO date). */
  revisedOn: string;
  /**
   * Benchmark gross every percentage / USD friction figure was computed on.
   * Shipped in the payload so the client's CSV header and widget copy can never
   * drift from the server-side math (the client must not import this module —
   * it would drag the fee and regulatory datasets into the browser bundle).
   */
  benchmarkGrossUsd: number;
}

/* --------------------------------------------------------------------------- *
 * Resolution helpers
 * --------------------------------------------------------------------------- */

/**
 * Corridor slug → the bank dossier that publishes detailed field 71A guidance.
 * First dossier wins, so the deterministic pick matches `/builders`' ordering.
 */
function buildBankDossierIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const dossier of BANK_DOSSIERS) {
    for (const corridor of dossier.connectedCorridors) {
      if (!index.has(corridor)) index.set(corridor, dossier.slug);
    }
  }
  return index;
}

/** True when every authored provider on the corridor quotes a 0.0% markup. */
function isZeroMarkup(corridor: Corridor): boolean {
  const providers = corridor.providers;
  if (!providers || providers.length === 0) return false;
  return providers.every((provider) => provider.fxSpread === 0);
}

/** Formats a signed intermediary deduction, collapsing single-point bands. */
function formatCutLabel(min: number, max: number): string {
  if (min === max) {
    return `-$${min.toFixed(2)}`;
  }
  return `-$${min.toFixed(2)} – $${max.toFixed(2)}`;
}

/**
 * Field 71A (Details of Charges) recommendation.
 *
 * SHA is the correct default on every audited corridor: the sender's bank
 * takes its sending fee and the correspondent deducts its cut from the
 * principal, so the beneficiary never absorbs the correspondence charge. The
 * note escalates only where the corridor also charges a local landing fee —
 * the genuine double-dip pair, where OUR would push the whole cut onto the
 * beneficiary on top of it.
 *
 * Kept deliberately terse: the registry ships one row per corridor into the
 * client payload, so the long-form per-bank rationale stays on the `/banks`
 * dossier it is linked from rather than being inlined here.
 */
function resolveChargeRecommendation(bank: {
  localFeeDefault: number;
  localCurrency: string;
}): { chargeCode: string; chargeNote: string } {
  if (bank.localFeeDefault > 0) {
    return {
      chargeCode: "SHA",
      chargeNote: `Split at correspondent · never OUR (${bank.localCurrency} ${bank.localFeeDefault} landing fee compounds)`,
    };
  }
  return {
    chargeCode: "SHA",
    chargeNote: "Split at correspondent · beneficiary banks whole",
  };
}

/* --------------------------------------------------------------------------- *
 * Registry
 * --------------------------------------------------------------------------- */

/**
 * Builds one registry row per audited corridor.
 *
 * The retail bank spread reuses `/leaderboard`'s banking-layer penalty so the
 * heatmap, the registry and the leakage index share a single methodology:
 * the corridor's direct-wire fixed fee + its benchmark intermediary SHA cut +
 * the hidden FX markup on the benchmark gross, all at a 0% platform cut (the
 * pure banking layer, isolated from platform commission).
 */
export function buildClearingRegistry(): ClearingRegistryRow[] {
  const dossierIndex = buildBankDossierIndex();

  return getCorridors().map((corridor) => {
    const regulation = getRegulatoryBanking(corridor.slug);
    const bank = regulation.banks[0];
    const targetCurrency = (bank?.localCurrency || corridor.to || "USD").toUpperCase();
    const clearingCurrency = clearingCurrencyFor(targetCurrency, corridor.from);
    const correspondent = bank
      ? correspondentForBank(bank, targetCurrency, corridor.from)
      : CORRESPONDENT_NODES[clearingCurrency][0];

    // Point cut: the authored default, else the default bank's own figure,
    // else the standard correspondence mid-band (mirrors /leaderboard).
    const cutUsd =
      regulation.defaultIntermediaryCut ??
      bank?.intermediaryUSD ??
      DEFAULT_INTERMEDIARY_CUT_USD;
    const band = bank
      ? deductionBand(bank)
      : {
          min: FALLBACK_SWIFT_BAND.min,
          max: FALLBACK_SWIFT_BAND.max,
        };

    // Retail bank spread — identical methodology to the leakage index.
    const directWire = corridor.providers?.find(
      (provider) => provider.id === "swift"
    );
    const wireFeeUsd = directWire?.fixedFeeUSD ?? DEFAULT_DIRECT_WIRE_FEE_USD;
    const wireSpread = directWire?.fxSpread ?? DEFAULT_DIRECT_WIRE_SPREAD;
    const spreadUsd = wireFeeUsd + cutUsd + BENCHMARK_GROSS_USD * wireSpread;

    const recommendation = resolveChargeRecommendation(
      bank ?? { localFeeDefault: 0, localCurrency: corridor.to }
    );

    return {
      slug: corridor.slug,
      from: corridor.from,
      to: corridor.to,
      routePair: `${corridor.from} → ${corridor.to}`,
      country: corridor.country,
      countryCode: corridor.countryCode,
      flag: flagOf(corridor.countryCode),
      cutUsd,
      cutMinUsd: band.min,
      cutMaxUsd: band.max,
      cutLabel: formatCutLabel(band.min, band.max),
      bucket: bucketForCut(cutUsd),
      rail: regulation.clearingNetwork,
      clearingCurrency,
      correspondentName: correspondent.bankName,
      correspondentCity: correspondent.city,
      correspondentBic: correspondent.bic,
      bankName: bank?.displayName ?? bank?.name ?? "Local receiving bank",
      beneficiaryBic:
        bank && !BIC_SENTINELS.has(bank.swiftCode)
          ? bank.swiftCode
          : "—",
      chargeCode: recommendation.chargeCode,
      chargeNote: recommendation.chargeNote,
      bankSlug: dossierIndex.get(corridor.slug) ?? null,
      zeroMarkup: isZeroMarkup(corridor),
      spreadPercent: (spreadUsd / BENCHMARK_GROSS_USD) * 100,
      spreadUsd,
    };
  });
}

/* --------------------------------------------------------------------------- *
 * Macro telemetry
 * --------------------------------------------------------------------------- */

/**
 * Aggregates the four macro KPI cards.
 *
 * `verifiedBics` counts every distinct accountable ISO 9362 identifier the
 * terminal can actually evidence across the WHOLE audited corpus: every
 * regulatory receiving bank on every corridor (not just the default bank the
 * registry row shows), the correspondent clearing hubs from the routing
 * registry, and the authored `/banks` dossiers. Local-clearing sentinels
 * (`""`, `"-"`, `"—"`) are excluded — they are placeholders, not BICs.
 */
export function buildMacroTelemetry(rows: ClearingRegistryRow[]): MacroTelemetry {
  const bics = new Set<string>();
  const record = (bic: string | undefined | null): void => {
    if (bic && !BIC_SENTINELS.has(bic)) bics.add(bic);
  };

  for (const node of Object.values(CORRESPONDENT_NODES)) {
    for (const correspondent of node) record(correspondent.bic);
  }
  for (const corridor of getCorridors()) {
    for (const bank of getRegulatoryBanking(corridor.slug).banks) {
      record(bank.swiftCode);
    }
  }
  for (const row of rows) {
    record(row.correspondentBic);
    record(row.beneficiaryBic);
  }
  for (const dossier of BANK_DOSSIERS) record(dossier.bic);

  let peak = rows[0];
  for (const row of rows) {
    if (peak === undefined || row.cutMaxUsd > peak.cutMaxUsd) peak = row;
  }

  const zeroMarkupCodes = rows
    .filter((row) => row.zeroMarkup)
    .map((row) => row.countryCode.toUpperCase())
    .sort();

  return {
    corridorsAudited: rows.length,
    verifiedBics: bics.size,
    peakCutUsd: peak ? peak.cutMaxUsd : 0,
    peakCutLabel: peak ? `-$${peak.cutMaxUsd.toFixed(2)}` : "-$0.00",
    peakCutSlug: peak ? peak.slug : "",
    peakCutVia: peak
      ? `${peak.correspondentName} ${peak.correspondentCity} (${peak.correspondentBic})`
      : "",
    zeroMarkupCount: zeroMarkupCodes.length,
    zeroMarkupCodes,
  };
}

/** Tallies the SHA deduction histogram. Shares are percentages of the registry. */
export function buildShaHistogram(rows: ClearingRegistryRow[]): ShaHistogram {
  const total = rows.length;
  const buckets = SHA_CUT_BUCKETS.map((bucket) => {
    const count = rows.filter((row) => row.bucket === bucket.id).length;
    return {
      id: bucket.id,
      label: bucket.label,
      range: bucket.range,
      tone: bucket.tone,
      count,
      share: total > 0 ? (count / total) * 100 : 0,
    };
  });

  return {
    buckets,
    peak: buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0),
    total,
  };
}

/**
 * Cheapest modern digital rail on a corridor, at the benchmark gross with a 0%
 * platform cut. Resolved lazily for the ten heatmap cells only, so the
 * 131-row registry payload never carries a field the table does not render.
 */
function resolveBestRail(corridor: Corridor): string {
  const platforms = getPlatforms();
  const direct = platforms.find((item) => item.id === "direct");
  if (!direct) return "—";
  const winner = quoteAllChannels(
    BENCHMARK_GROSS_USD,
    direct,
    corridor,
    getChannels()
  )[0];
  return winner?.channelName ?? "—";
}

/**
 * Builds the retail bank spread heatmap: the five tightest corridors (lowest
 * bank-layer friction at the benchmark gross) against the five highest-friction
 * corridors. Ties break on slug so the static export stays deterministic.
 */
export function buildSpreadHeatmap(rows: ClearingRegistryRow[]): SpreadHeatmap {
  const bySlug = new Map(
    getCorridors().map((corridor) => [corridor.slug, corridor])
  );
  const toCell = (row: ClearingRegistryRow): SpreadHeatmapCell => ({
    slug: row.slug,
    country: row.country,
    countryCode: row.countryCode,
    flag: row.flag,
    routePair: row.routePair,
    spreadUsd: row.spreadUsd,
    spreadPercent: row.spreadPercent,
    bestRail: (() => {
      const corridor = bySlug.get(row.slug);
      return corridor ? resolveBestRail(corridor) : "—";
    })(),
  });

  const ascending = [...rows].sort(
    (a, b) => a.spreadUsd - b.spreadUsd || a.slug.localeCompare(b.slug)
  );
  const descending = [...rows].sort(
    (a, b) => b.spreadUsd - a.spreadUsd || a.slug.localeCompare(b.slug)
  );

  return {
    tightest: ascending.slice(0, 5).map(toCell),
    highest: descending.slice(0, 5).map(toCell),
    ceilingUsd: descending.length > 0 ? descending[0].spreadUsd : 0,
  };
}

/** One-stop build: the complete `/dashboard` payload. */
export function buildClearingTerminalIndex(): ClearingTerminalIndex {
  const rows = buildClearingRegistry();
  return {
    macro: buildMacroTelemetry(rows),
    histogram: buildShaHistogram(rows),
    heatmap: buildSpreadHeatmap(rows),
    rows,
    revisedOn: getDataset().updatedAt.slice(0, 10),
    benchmarkGrossUsd: BENCHMARK_GROSS_USD,
  };
}
