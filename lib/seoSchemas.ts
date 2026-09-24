import type {
  ChannelQuote,
  Corridor,
  FeesDataset,
  Platform,
  WithdrawalChannel,
} from "@/lib/types";
import type { FaqItem } from "@/lib/corridorContent";

/**
 * Phase 5 — dedicated financial Schema.org builder.
 *
 * Every JSON-LD entity on the calculator routes is produced here so the
 * prerendered `@graph` blocks stay 100% syntactically valid schema.org:
 *
 *   - `buildFinancialServiceSchema`   → CurrencyConversionService + one
 *     FinancialProduct per compared rail (the "Financial JSON-LD Schema
 *     Dominance" core: fee/rate queries return entities, not prose).
 *   - `buildWaterfallHowToSchema`     → the 7-layer gross-to-net audit as a
 *     first-class HowTo rich-result.
 *   - `buildAeoFaqSchema`             → the programmatic AEO Q&As (from the
 *     shared `lib/aeoFaqs.ts` generator) mapped to Question/AcceptedAnswer.
 *
 * Blog-schema building blocks (BreadcrumbList, WebApplication, Service) are
 * consolidated here too, so routes compose one canonical `@graph` via
 * `serializeSchemaGraph` instead of emitting fragmented `<script>` blocks.
 */

export type JsonLdBlock = { "@type": string | string[] } & Record<
  string,
  unknown
>;

/**
 * Canonical origin every link (canonical, OpenGraph, JSON-LD, sitemap) is
 * derived from. Defaults to the active GitHub Pages deployment the static
 * export is served from (`basePath: "/payout-delta"`); override at build time
 * through `NEXT_PUBLIC_SITE_URL` once the custom domain takes the export over.
 * Single source of truth — route signaling must never fragment across hosts.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://ahmadbilaldsa.github.io/payout-delta"
).replace(/\/+$/, "");

/** Alias for call sites that read "breadcrumb / JSON-LD origin". Identical to `SITE_URL`. */
export const BREADCRUMB_ORIGIN = SITE_URL;

/**
 * BreadcrumbList — sequence from the GitHub Pages root through the corridor
 * index to the exact audited route (long-tail routes keep their own slug).
 */
export function buildBreadcrumbLd(
  crumbs: { name: string; url: string }[],
): JsonLdBlock {
  const itemListElement = crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: crumb.url,
  }));
  return { "@type": "BreadcrumbList", itemListElement };
}

/**
 * WebApplication — sticky rich-result entity for a zero-signup, browser-only
 * fee auditor targeting the route's corridor pair.
 */
export function buildWebApplicationLd(opts: {
  corridor: Corridor;
  corridorPair: string;
  corridorUrl: string;
}): JsonLdBlock {
  return {
    "@type": "WebApplication",
    name: "PayoutDelta",
    operatingSystem: "Web (React, static export)",
    applicationCategory: "FinanceApplication",
    url: opts.corridorUrl,
    description: `Zero-signup auditor of freelance payout fees for the ${opts.corridorPair} corridor.`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    browserRequirements: "Modern browser with JavaScript enabled",
  };
}

/**
 * Service — the corridor-pair remittance audit listing every withdrawal
 * channel as an Offer in an OfferCatalog.
 */
export function buildServiceLd(opts: {
  corridor: Corridor;
  corridorPair: string;
  corridorUrl: string;
  channels: WithdrawalChannel[];
}): JsonLdBlock {
  return {
    "@type": "Service",
    name: `PayoutDelta Cross-Border Freelance Remittance (${opts.corridorPair})`,
    serviceType: "Cross-border freelance payout fee audit",
    url: opts.corridorUrl,
    provider: {
      "@type": "Organization",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
    },
    areaServed: {
      "@type": "Country",
      name: opts.corridor.country,
      identifier: opts.corridor.countryCode,
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${opts.corridorPair} withdrawal channels`,
      itemListElement: opts.channels.map((channel) => ({
        "@type": "Offer",
        name: `${channel.name} — ${channel.fixedFeeUSD} USD fixed + ${(
          channel.fxSpread * 100
        ).toFixed(2)}% FX spread`,
        category: `Cross-border remittance (${opts.corridorPair})`,
        price: String(channel.fixedFeeUSD),
        priceCurrency: opts.corridor.from,
        seller: { "@type": "Organization", name: channel.name },
      })),
    },
  };
}

/**
 * Financial JSON-LD Schema Dominance core — a `CurrencyConversionService`
 * (name fix, top provider, live exchange rate spec) followed by one
 * `FinancialProduct` per compared rail with its fixed fee and fee structure.
 */
export function buildFinancialServiceSchema(
  corridorData: Corridor,
  platformData: Platform,
  bestQuote: ChannelQuote | null,
  channels: WithdrawalChannel[] = [],
): JsonLdBlock[] {
  const corridorPair = `${corridorData.from}→${corridorData.to}`;
  const providerName = bestQuote?.channelName ?? channels[0]?.name ?? "PayoutDelta";
  const exchangeRate = bestQuote?.effectiveRate ?? corridorData.rate;

  const conversionService: JsonLdBlock = {
    "@type": "CurrencyConversionService",
    name: "PayoutDelta Cross-Border Realization Auditor",
    description:
      `Layered payout audit for the ${corridorPair} corridor at the ` +
      `${platformData.feePercent}% ${platformData.name} platform commission: ` +
      "from the gross client invoice to the net local-currency bank deposit.",
    provider: { "@type": "Organization", name: providerName },
    areaServed: {
      "@type": "Country",
      name: corridorData.country,
      identifier: corridorData.countryCode,
    },
    exchangeRate: {
      "@type": "ExchangeRateSpecification",
      currency: corridorData.to,
      currentExchangeRate: {
        "@type": "UnitPriceSpecification",
        price: exchangeRate,
        priceCurrency: corridorData.to,
      },
    },
  };

  const products: JsonLdBlock[] = channels.map((channel) => ({
    "@type": "FinancialProduct",
    name: `${channel.name} Cross-Border Freelance Remittance (${corridorPair})`,
    category: `Cross-border remittance (${corridorPair})`,
    provider: { "@type": "Organization", name: channel.name },
    areaServed: {
      "@type": "Country",
      name: corridorData.country,
      identifier: corridorData.countryCode,
    },
    feesAndCommissionsSpecification: [
      {
        "@type": "MonetaryAmount",
        name: "Fixed transferring fee (USD)",
        value: channel.fixedFeeUSD,
        currency: corridorData.from,
      },
      {
        "@type": "QuantitativeValue",
        name: "FX spread markup on interbank reference",
        value: channel.fxSpread,
        unitText: "fraction of mid-market rate",
      },
    ],
    amount: {
      "@type": "MonetaryAmount",
      name: `Reference settlement rate (${corridorData.from} to ${corridorData.to})`,
      value: corridorData.rate,
      currency: corridorData.to,
    },
  }));

  return [conversionService, ...products];
}

/**
 * HowTo — the seven-layer gross-to-net realization waterfall as a first-class
 * structured recipe Google/Bing can surface for "how much will I actually
 * receive" queries on a platform corridor.
 */
export function buildWaterfallHowToSchema(
  sourceCurrency: string,
  targetCurrency: string,
  platformName: string,
): JsonLdBlock {
  const steps: { name: string; text: string }[] = [
    {
      name: "Gross Billing Amount Ingestion",
      text:
        `Record the full ${sourceCurrency} invoice value agreed with the client ` +
        "before any commission, wire fee or conversion margin applies.",
    },
    {
      name: `Platform Fee Deduction (${platformName} take-rate)`,
      text:
        `Deduct the ${platformName} platform commission charged on the gross ` +
        "invoice before the balance reaches any withdrawal rail.",
    },
    {
      name: "Intermediary Correspondent Bank Wire Deduction",
      text:
        "Deduct the correspondent-chain SWIFT charges applied between the " +
        "sending institution and the receiving bank.",
    },
    {
      name: "Real Mid-Market FX Rate Application & Provider Margin",
      text:
        `Convert the remaining ${sourceCurrency} at the actual mid-market ` +
        `${sourceCurrency}→${targetCurrency} rate minus the withdrawal ` +
        "provider's published FX spread.",
    },
    {
      name: "Local Inward Clearing & Landing Fee Application",
      text:
        `Apply the receiving bank's inward clearing and landing fee for ` +
        `${targetCurrency} deposits.`,
    },
    {
      name: "Statutory Tax Withholding (SBP / RBI / BIR compliant)",
      text:
        "Apply the receiving market's statutory withholding per its central " +
        "bank regime (SBP, RBI or BIR).",
    },
    {
      name: "Net Liquid Deposited Take-Home",
      text:
        `Sum the remaining ${targetCurrency} after every layer to obtain the ` +
        "true net amount deposited in your account.",
    },
  ];

  return {
    "@type": "HowTo",
    name: `How to Calculate Real Net ${targetCurrency} Payout from ${platformName}`,
    description:
      "Step-by-step audit from gross client invoice to actual bank deposit " +
      "accounting for platform commissions, intermediary wire cuts, and " +
      "statutory taxes.",
    totalTime: "PT5M",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

/**
 * FAQPage — maps the programmatic AEO Q&As (see `lib/aeoFaqs.ts`) plus the
 * editorial corridor copy into standard `Question` / `AcceptedAnswer` pairs,
 * so the structured data mirrors the exact strings rendered on the page.
 */
export function buildAeoFaqSchema(
  faqItems: FaqItem[],
  opts: { url?: string; inLanguage?: string } = {},
): JsonLdBlock {
  const block: JsonLdBlock = {
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  if (opts.url) {
    block.url = opts.url;
  }
  if (opts.inLanguage) {
    block.inLanguage = opts.inLanguage;
  }
  return block;
}

/**
 * Dataset — the Developer Data Hub's canonical schema.org entity. Documents
 * the open cross-border banking & remittance dataset as free, MIT-licensed
 * open data with a pinned publisher and two machine-readable distributions
 * (the `fees.json` JSON feed and the `llms-full.txt` corridor manifest) as
 * `DataDownload` nodes, so search & agent surfaces can attribute, mirror and
 * cite the feed directly from the `/developers` route's structured data.
 */
export function buildDatasetSchema(opts: {
  dataset: FeesDataset;
  feedUrl: string;
  manifestUrl: string;
}): JsonLdBlock {
  const { dataset } = opts;
  return {
    "@type": "Dataset",
    name: "Open Cross-Border Banking & Remittance Dataset",
    alternateName: dataset.dataset,
    description: `${dataset.description} ${dataset.corridors.length} freelance payout corridors with correspondent SWIFT BICs, retail FX spreads and statutory export tax codes.`,
    url: opts.feedUrl,
    keywords: [
      "cross-border remittance",
      "freelance payout corridors",
      "SWIFT BIC",
      "FX spread",
      "statutory purpose code",
      "open data",
      "cross-border banking",
    ],
    license: "https://opensource.org/licenses/mit",
    isAccessibleForFree: true,
    inLanguage: ["en", "ur", "hi", "fil", "es", "pt", "ar"],
    temporalCoverage: dataset.updatedAt.slice(0, 10),
    dateCreated: dataset.updatedAt.slice(0, 10),
    publisher: {
      "@type": "Organization",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
      sameAs: "https://github.com/AhmadBilalDSA/payout-delta",
    },
    creator: {
      "@type": "Organization",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
    },
    distribution: [
      {
        "@type": "DataDownload",
        name: "fees.json — platform fees, channels & corridor rates feed",
        encodingFormat: "application/json",
        contentUrl: opts.feedUrl,
        description: `Versioned ${dataset.schemaVersion} schema feed — ${dataset.corridors.length} corridors, ${dataset.platforms.length} platforms and ${dataset.channels.length} withdrawal channels.`,
      },
      {
        "@type": "DataDownload",
        name: "llms-full.txt — full corridor manifest",
        encodingFormat: "text/plain",
        contentUrl: opts.manifestUrl,
        description: `Complete ${dataset.corridors.length}-corridor table of intermediary cuts, correspondent clearing BICs, statutory tax purpose codes and recommended rails.`,
      },
    ],
    variableMeasured: [
      {
        "@type": "PropertyValue",
        name: "corridorSlug",
        description: "Canonical corridor route id (e.g. usd-to-pkr).",
        dataType: "Text",
      },
      {
        "@type": "PropertyValue",
        name: "baseCurrency",
        description: "Source settlement currency (ISO 4217).",
        dataType: "Text",
      },
      {
        "@type": "PropertyValue",
        name: "targetCurrency",
        description: "Destination local payout currency (ISO 4217).",
        dataType: "Text",
      },
      {
        "@type": "PropertyValue",
        name: "baseRate",
        description: "Reference mid-market rate per 1 baseCurrency.",
        dataType: "Number",
      },
      {
        "@type": "PropertyValue",
        name: "intermediaryUSD",
        description: "Benchmark SHA intermediary SWIFT cut in USD.",
        dataType: "Number",
      },
      {
        "@type": "PropertyValue",
        name: "swiftCode",
        description: "Recipient bank SWIFT/BIC identifier (ISO 9362).",
        dataType: "Text",
      },
      {
        "@type": "PropertyValue",
        name: "purposeCode",
        description: "Statutory export tax / remittance purpose code.",
        dataType: "Text",
      },
    ],
  };
}

/**
 * Emits one top-level schema.org graph and escapes every `<` (the JSON-LD
 * dots-on-diagonal safety practice) so React can inject it via
 * `dangerouslySetInnerHTML` without tripping literal-script terminators.
 */
export function serializeSchemaGraph(blocks: JsonLdBlock[]): string {
  const graph = {
    "@context": "https://schema.org",
    "@graph": blocks,
  };
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}