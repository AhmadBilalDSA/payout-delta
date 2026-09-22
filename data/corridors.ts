/**
 * PayoutDelta — programmatic long-tail platform corridor registry (Phase 4).
 *
 * In addition to the ten currency corridors in `data/fees.json`, the site
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