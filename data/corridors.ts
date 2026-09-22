/**
 * PayoutDelta — programmatic long-tail platform corridor registry (Phase 4).
 *
 * In addition to the currency corridors in `data/fees.json`, the site
 * statically generates high-intent `<platform>-to-<currency>` pages that
 * pre-set the calculator and its AEO copy for a specific earning platform.
 * The underlying FX/settlement math still runs against the base currency
 * corridor (e.g. `upwork-usd-to-pkr` → `usd-to-pkr`); only the platform
 * preset and the search metadata change per route.
 *
 * Deel has no entry in `data/fees.json` and invoices like a direct client,
 * so the `deel-*` slugs preset the `direct` platform (0% platform cut).
 */

export type LongTailPlatform = "upwork" | "fiverr" | "direct";

/** One statically-generated `calculator/<slug>` platform corridor. */
export interface LongTailCorridorSpec {
  /** Full URL slug, e.g. `upwork-usd-to-pkr`. */
  slug: string;
  /** Underlying currency corridor slug, e.g. `usd-to-pkr`. */
  baseSlug: string;
  /** Client platform id preset into the calculator on mount. */
  platformId: LongTailPlatform;
  /** Source currency shorthand (always `USD`). */
  sourceCurrency: string;
  /** Target local currency shorthand, e.g. `PKR`. */
  targetCurrency: string;
  /** Display label (Deel is branded even though it presets `direct`). */
  label: string;
}

export const LONG_TAIL_CORRIDORS: LongTailCorridorSpec[] = [
  {
    slug: "upwork-usd-to-pkr",
    baseSlug: "usd-to-pkr",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "PKR",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-pkr",
    baseSlug: "usd-to-pkr",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "PKR",
    label: "Fiverr",
  },
  {
    slug: "deel-usd-to-pkr",
    baseSlug: "usd-to-pkr",
    platformId: "direct",
    sourceCurrency: "USD",
    targetCurrency: "PKR",
    label: "Deel",
  },
  {
    slug: "upwork-usd-to-inr",
    baseSlug: "usd-to-inr",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "INR",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-inr",
    baseSlug: "usd-to-inr",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "INR",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-php",
    baseSlug: "usd-to-php",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "PHP",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-php",
    baseSlug: "usd-to-php",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "PHP",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-vnd",
    baseSlug: "usd-to-vnd",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "VND",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-vnd",
    baseSlug: "usd-to-vnd",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "VND",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-kes",
    baseSlug: "usd-to-kes",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "KES",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-kes",
    baseSlug: "usd-to-kes",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "KES",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-idr",
    baseSlug: "usd-to-idr",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "IDR",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-idr",
    baseSlug: "usd-to-idr",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "IDR",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-cop",
    baseSlug: "usd-to-cop",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "COP",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-cop",
    baseSlug: "usd-to-cop",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "COP",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-try",
    baseSlug: "usd-to-try",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "TRY",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-try",
    baseSlug: "usd-to-try",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "TRY",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-mxn",
    baseSlug: "usd-to-mxn",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "MXN",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-mxn",
    baseSlug: "usd-to-mxn",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "MXN",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-ars",
    baseSlug: "usd-to-ars",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "ARS",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-ars",
    baseSlug: "usd-to-ars",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "ARS",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-pln",
    baseSlug: "usd-to-pln",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "PLN",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-pln",
    baseSlug: "usd-to-pln",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "PLN",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-ron",
    baseSlug: "usd-to-ron",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "RON",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-ron",
    baseSlug: "usd-to-ron",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "RON",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-czk",
    baseSlug: "usd-to-czk",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "CZK",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-czk",
    baseSlug: "usd-to-czk",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "CZK",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-thb",
    baseSlug: "usd-to-thb",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "THB",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-thb",
    baseSlug: "usd-to-thb",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "THB",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-myr",
    baseSlug: "usd-to-myr",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "MYR",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-myr",
    baseSlug: "usd-to-myr",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "MYR",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-ghs",
    baseSlug: "usd-to-ghs",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "GHS",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-ghs",
    baseSlug: "usd-to-ghs",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "GHS",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-aed",
    baseSlug: "usd-to-aed",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "AED",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-aed",
    baseSlug: "usd-to-aed",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "AED",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-sar",
    baseSlug: "usd-to-sar",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "SAR",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-sar",
    baseSlug: "usd-to-sar",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "SAR",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-uah",
    baseSlug: "usd-to-uah",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "UAH",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-uah",
    baseSlug: "usd-to-uah",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "UAH",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-iqd",
    baseSlug: "usd-to-iqd",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "IQD",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-iqd",
    baseSlug: "usd-to-iqd",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "IQD",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-mad",
    baseSlug: "usd-to-mad",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "MAD",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-mad",
    baseSlug: "usd-to-mad",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "MAD",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-clp",
    baseSlug: "usd-to-clp",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "CLP",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-clp",
    baseSlug: "usd-to-clp",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "CLP",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-pen",
    baseSlug: "usd-to-pen",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "PEN",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-pen",
    baseSlug: "usd-to-pen",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "PEN",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-huf",
    baseSlug: "usd-to-huf",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "HUF",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-huf",
    baseSlug: "usd-to-huf",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "HUF",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-bgn",
    baseSlug: "usd-to-bgn",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "BGN",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-bgn",
    baseSlug: "usd-to-bgn",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "BGN",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-rsd",
    baseSlug: "usd-to-rsd",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "RSD",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-rsd",
    baseSlug: "usd-to-rsd",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "RSD",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-sgd",
    baseSlug: "usd-to-sgd",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "SGD",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-sgd",
    baseSlug: "usd-to-sgd",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "SGD",
    label: "Fiverr",
  },
  {
    slug: "upwork-usd-to-hkd",
    baseSlug: "usd-to-hkd",
    platformId: "upwork",
    sourceCurrency: "USD",
    targetCurrency: "HKD",
    label: "Upwork",
  },
  {
    slug: "fiverr-usd-to-hkd",
    baseSlug: "usd-to-hkd",
    platformId: "fiverr",
    sourceCurrency: "USD",
    targetCurrency: "HKD",
    label: "Fiverr",
  },
];

/** Resolves a long-tail spec by its URL slug, if any. */
export function getLongTailBySlug(
  slug: string,
): LongTailCorridorSpec | undefined {
  return LONG_TAIL_CORRIDORS.find((spec) => spec.slug === slug);
}

export interface ParsedCorridorSlug {
  /** Platform preset (`null` for generic currency corridors). */
  platform: LongTailPlatform | null;
  /** Source currency shorthand (defaults to `USD`). */
  sourceCurrency: string;
  /** Target currency shorthand when the slug is parseable, else `""`. */
  targetCurrency: string;
  /** True when this is a long-tail platform corridor. */
  isLongTail: boolean;
  /** Underlying currency corridor slug when long-tail, else `null`. */
  baseSlug: string | null;
}

/**
 * Parses any calculator route slug into its platform + currency parts.
 *
 * Long-tail slugs (`upwork-usd-to-pkr`) resolve through the registry; generic
 * slugs (`usd-to-pkr`) fall through to the `{source}-to-{target}` pattern. Any
 * other slug returns `isLongTail: false` with empty currency fields so callers
 * can 404 consistently.
 */
export function parseCorridorSlug(slug: string): ParsedCorridorSlug {
  const longTail = getLongTailBySlug(slug);
  if (longTail) {
    return {
      platform: longTail.platformId,
      sourceCurrency: longTail.sourceCurrency,
      targetCurrency: longTail.targetCurrency,
      isLongTail: true,
      baseSlug: longTail.baseSlug,
    };
  }
  const match = /^([a-z]{3})-to-([a-z]{3})$/.exec(slug);
  if (match) {
    return {
      platform: null,
      sourceCurrency: match[1].toUpperCase(),
      targetCurrency: match[2].toUpperCase(),
      isLongTail: false,
      baseSlug: null,
    };
  }
  return {
    platform: null,
    sourceCurrency: "USD",
    targetCurrency: "",
    isLongTail: false,
    baseSlug: null,
  };
}