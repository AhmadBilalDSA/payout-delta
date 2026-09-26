/**
 * PayoutDelta — deterministic settlement-currency re-baselining.
 *
 * Every fee figure in the dataset is authored in USD, because USD is the only
 * currency the corpus quotes directly. That is fine for arithmetic and useless
 * for a CFO in Dubai who has to approve the number in AED. This module re-bases
 * a USD figure onto any supported settlement currency with a single pure
 * multiplication, so the calculator, the waterfall, the invoice studio and the
 * bank dossiers can all quote the same number in the reader's own currency
 * without any of them re-deriving the rate.
 *
 * The rates below are **static reference rates**, not a live feed. They are a
 * fixed, auditable snapshot committed to the repository so that the static
 * export, the S4 edge-case simulation and the CI schema gates all reproduce
 * byte-identical output. The displayed amounts are informational benchmarks for
 * comparative analysis, not executable pricing — see `STATIC_RATE_NOTICE`.
 *
 * Deliberate constraints:
 *   - Zero dependencies and zero I/O. Pure functions only, so this module is
 *     safe to import from server components, client components and the
 *     source-stripping simulation harness alike.
 *   - Deterministic: no `Date.now()`, no `Math.random()`, no locale formatting.
 *     The same input always yields the same output, which is what makes the
 *     static export reproducible.
 */

/** Currencies a reader may re-base the whole surface onto. */
export const BASE_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "CAD",
  "SGD",
] as const;

export type BaseCurrency = (typeof BASE_CURRENCIES)[number];

/** The dataset's own accounting currency. Nothing is stored in any other unit. */
export const DATASET_CURRENCY: BaseCurrency = "USD";

/**
 * Units of each settlement currency per 1 USD.
 *
 * Static reference snapshot, four-decimal precision. AED is the one currency
 * here that is *pegged* rather than floating (3.6725 to the USD, held by the
 * UAE Central Bank), so its rate is exact by policy rather than by observation
 * — the remaining five are rounded market references and drift over time.
 */
export const REFERENCE_RATES_PER_USD: Record<BaseCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.6725,
  CAD: 1.36,
  SGD: 1.345,
};

/** Human labels for the settlement-currency switcher. */
export const BASE_CURRENCY_LABELS: Record<BaseCurrency, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "Pound Sterling",
  AED: "UAE Dirham",
  CAD: "Canadian Dollar",
  SGD: "Singapore Dollar",
};

/** Compact symbols for money formatting next to an amount. */
export const BASE_CURRENCY_SYMBOLS: Record<BaseCurrency, string> = {
  USD: "$",
  EUR: "\u20ac",
  GBP: "\u00a3",
  AED: "AED\u00a0",
  CAD: "C$",
  SGD: "S$",
};

/** Attached wherever a re-based figure is displayed, so the caveat travels with it. */
export const STATIC_RATE_NOTICE =
  "Converted at static reference rates committed to the dataset — a fixed, " +
  "auditable snapshot, not a live FX feed and not executable pricing.";

/** Type guard for values arriving from localStorage or a `<select>`. */
export function isBaseCurrency(value: unknown): value is BaseCurrency {
  return (
    typeof value === "string" &&
    (BASE_CURRENCIES as readonly string[]).includes(value)
  );
}

/**
 * Coerces an arbitrary string to a supported settlement currency, defaulting to
 * the dataset currency. Used on the storage and route-param boundary so a stale
 * or hand-edited preference can never poison a render.
 */
export function toBaseCurrency(value: unknown): BaseCurrency {
  return isBaseCurrency(value) ? value : DATASET_CURRENCY;
}

/** Units of `currency` per 1 USD. Always ≥ the peg floor, never zero. */
export function unitsPerUsd(currency: BaseCurrency): number {
  return REFERENCE_RATES_PER_USD[currency] || 1;
}

/** The share of one base-currency unit expressed in USD. */
export function usdPerUnit(currency: BaseCurrency): number {
  return 1 / unitsPerUsd(currency);
}

/** Converts a USD figure into `currency`. */
export function fromUsdToBase(usd: number, currency: BaseCurrency): number {
  if (!Number.isFinite(usd)) return 0;
  return usd * unitsPerUsd(currency);
}

/** Converts a `currency` figure back into USD. */
export function fromBaseToUsd(amount: number, currency: BaseCurrency): number {
  if (!Number.isFinite(amount)) return 0;
  return amount / unitsPerUsd(currency);
}

/**
 * Re-bases a USD fee onto a settlement currency.
 *
 * Fees are *amounts*, not rates, so this is a flat conversion with no spread
 * applied. The retail FX spread that a real payer pays is already modelled
 * separately, per corridor, in `data/fees.json` — double-charging it here would
 * make the rebased figure disagree with the waterfall it is supposed to match.
 */
export function rebasedFee(usd: number, currency: BaseCurrency): number {
  return fromUsdToBase(usd, currency);
}

/**
 * Re-bases a quoted FX rate expressed in destination-currency per USD onto the
 * same per-`currency` basis, so a rate table and a money table can be shown side
 * by side. This is the one place a naive re-basing goes wrong: a rate must be
 * re-based *per unit*, not multiplied by the money rate.
 */
export function rebasedRate(
  ratePerUsd: number,
  from: BaseCurrency,
  to: BaseCurrency
): number {
  if (!Number.isFinite(ratePerUsd)) return 0;
  return (ratePerUsd * unitsPerUsd(to)) / unitsPerUsd(from);
}

/** Rounds to `dp` decimals, dropping floating-point noise like 0.1 + 0.2. */
export function roundTo(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a USD figure in `currency` with thousands separators and a fixed
 * number of decimals. Locale-independent on purpose: pinning the separators
 * keeps server and client HTML byte-identical, which the static export and the
 * hydration check both depend on.
 */
export function formatInBaseCurrency(
  usd: number,
  currency: BaseCurrency,
  dp = 2
): string {
  const converted = roundTo(fromUsdToBase(usd, currency), dp);
  const [whole, fraction] = Math.abs(converted)
    .toFixed(dp)
    .split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = converted < 0 ? "-" : "";
  const suffix = fraction ? `.${fraction}` : "";
  return `${sign}${grouped}${suffix}`;
}

/** True when the reader is looking at a figure that is not in the dataset's own unit. */
export function isRebased(currency: BaseCurrency): boolean {
  return currency !== DATASET_CURRENCY;
}
