import type { Corridor, ProviderFee } from "@/lib/types";

/**
 * Phase S2 — static schema runtime guard.
 *
 * Client-side twin of the build-time SRE gates (see `scripts/test_corridors.mjs`
 * Phase S2). The calculator and invoice islands receive a serialized `Corridor`
 * prop from the static HTML payload; as a last line of defence against a stale
 * or hand-edited dataset, every missing or malformed field is silently hydrated
 * to a safe statutory fallback instead of throwing mid-render.
 */

const FALLBACK_SLUG = "usd-to-pkr";
const FALLBACK_FROM = "USD";
const FALLBACK_TO = "PKR";
const FALLBACK_RATE = 277.425913;
const FALLBACK_COUNTRY = "Pakistan";
const FALLBACK_COUNTRY_CODE = "PK";
const FALLBACK_CURRENCY_NAME = "Pakistani Rupee";
const FALLBACK_CURRENCY_SYMBOL = "Rs";

/** Upper bound for a provider's fixed fee in USD (SanityZ, not statutory). */
const MAX_PROVIDER_FEE_USD = 1_000_000;

export const FALLBACK_CORRIDOR: Readonly<Corridor> = Object.freeze({
  slug: FALLBACK_SLUG,
  from: FALLBACK_FROM,
  to: FALLBACK_TO,
  rate: FALLBACK_RATE,
  country: FALLBACK_COUNTRY,
  countryCode: FALLBACK_COUNTRY_CODE,
  currencyName: FALLBACK_CURRENCY_NAME,
  currencySymbol: FALLBACK_CURRENCY_SYMBOL,
});

function sanitizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function sanitizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function sanitizeRate(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : FALLBACK_RATE;
}

function sanitizeProviders(value: unknown): ProviderFee[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const providers: ProviderFee[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object") {
      continue;
    }
    providers.push({
      id: sanitizeString((entry as ProviderFee).id, "direct"),
      name: sanitizeString((entry as ProviderFee).name, "Direct wire"),
      fixedFeeUSD: sanitizeNumber(
        (entry as ProviderFee).fixedFeeUSD,
        0,
        0,
        MAX_PROVIDER_FEE_USD
      ),
      fxSpread: sanitizeNumber((entry as ProviderFee).fxSpread, 0, 0, 1),
    });
  }
  return providers;
}

/**
 * Returns a corridor guaranteed to be structurally safe for the calculator and
 * invoice engines. Never throws. Missing string fields fall back to the
 * statutory usd-to-pkr default; a corrupt (non-positive / non-finite) `rate`
 * falls back before any quote is computed; a malformed `providers` entry is
 * dropped and each surviving record is sanitized independently.
 */
export function validateCorridorRuntime(
  corridor: Corridor | null | undefined
): Corridor {
  if (corridor === null || typeof corridor !== "object") {
    return FALLBACK_CORRIDOR;
  }
  return {
    slug: sanitizeString(corridor.slug, FALLBACK_SLUG),
    from: sanitizeString(corridor.from, FALLBACK_FROM),
    to: sanitizeString(corridor.to, FALLBACK_TO),
    rate: sanitizeRate(corridor.rate),
    country: sanitizeString(corridor.country, FALLBACK_COUNTRY),
    countryCode: sanitizeString(
      corridor.countryCode,
      FALLBACK_COUNTRY_CODE
    ),
    currencyName: sanitizeString(
      corridor.currencyName,
      FALLBACK_CURRENCY_NAME
    ),
    currencySymbol: sanitizeString(
      corridor.currencySymbol,
      FALLBACK_CURRENCY_SYMBOL
    ),
    providers: sanitizeProviders(corridor.providers),
  };
}