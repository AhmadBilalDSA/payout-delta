/**
 * PayoutDelta — Financial Schema.org Structured Data Component.
 *
 * Outputs schema.org/FinancialProduct and schema.org/Dataset JSON-LD on every
 * corridor route for SEO dominance and AI agent consumption.
 *
 * All schema is authoritatively static (build-time), zero runtime network calls.
 */
import React from "react";

interface FinancialSchemaProps {
  /** Corridor slug, e.g. "usd-to-pkr". */
  slug: string;
  /** Source currency code. */
  sourceCurrency: string;
  /** Target currency code. */
  targetCurrency: string;
  /** Corridor display name, e.g. "USD to PKR". */
  displayName: string;
  /** Base exchange rate (1 USD = X local). */
  baseRate: number;
  /** Intermediary fee benchmark in USD. */
  intermediaryFeeUsd: number;
  /** Authoritative regulatory citation. */
  regulatoryCitation: string;
  /** Export purpose code if applicable. */
  purposeCode?: string;
}

/**
 * Build schema.org JSON-LD for a corridor route.
 */
export function buildFinancialSchema(props: FinancialSchemaProps): string {
  const {
    slug,
    sourceCurrency,
    targetCurrency,
    displayName,
    baseRate,
    intermediaryFeeUsd,
    regulatoryCitation,
    purposeCode,
  } = props;

  const datasetUrl = `https://ahmadbilaldsa.github.io/payout-delta/api/fees.json`;
  const llmsUrl = `https://ahmadbilaldsa.github.io/payout-delta/llms-full.txt`;
  const corridorUrl = `https://ahmadbilaldsa.github.io/payout-delta/calculator/${slug}/`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CurrencyConversionService",
        "@id": `${corridorUrl}#currency-conversion`,
        name: `${displayName} Cross-Border Fee Calculator`,
        description: `Calculate exact net payout for ${sourceCurrency} to ${targetCurrency} transfers including intermediary SWIFT fees, FX spreads, and statutory withholding.`,
        url: corridorUrl,
        provider: {
          "@type": "Organization",
          name: "PayoutDelta",
          url: "https://ahmadbilaldsa.github.io/payout-delta/",
        },
        areaServed: {
          "@type": "Country",
          name: targetCurrency === "USD" ? "United States" : "Global",
        },
        serviceType: "Cross-Border Remittance & Fee Audit",
      },
      {
        "@type": "ExchangeRateSpecification",
        "@id": `${corridorUrl}#exchange-rate`,
        name: `${sourceCurrency}/${targetCurrency} Exchange Rate`,
        currencyCode: targetCurrency,
        exchangeRate: baseRate,
        rateUnit: "1 USD = " + baseRate + " " + targetCurrency,
        referenceDate: new Date().toISOString().split("T")[0],
        priceComponent: {
          "@type": "MonetaryAmount",
          currency: sourceCurrency,
          value: "1.00",
        },
      },
      {
        "@type": "FinancialProduct",
        "@id": `${corridorUrl}#financial-product`,
        name: `${displayName} Wire Transfer`,
        description: `Cross-border wire transfer from ${sourceCurrency} to ${targetCurrency} via correspondent banking with ${(intermediaryFeeUsd).toFixed(0)} USD intermediary benchmark.`,
        category: "International Money Transfer",
        feesAndCommissionsSpecification: {
          "@type": "MonetaryAmount",
          currency: sourceCurrency,
          value: intermediaryFeeUsd.toFixed(2),
          description: "Intermediary SWIFT correspondent fee (benchmark)",
        },
        offering: {
          "@type": "FinancialProduct",
          name: `${displayName} Direct Wire`,
          category: "SWIFT MT103",
          fee: intermediaryFeeUsd.toFixed(2),
        },
      },
      {
        "@type": "Dataset",
        "@id": `${corridorUrl}#dataset`,
        name: "PayoutDelta Open Cross-Border Banking Dataset",
        description: "Open dataset of freelance payout fees: platform commission, withdrawal channel fees, and foreign-exchange spreads per payout corridor (USD, EUR and GBP base rails).",
        url: datasetUrl,
        license: "https://opensource.org/licenses/MIT",
        creator: {
          "@type": "Organization",
          name: "PayoutDelta",
          url: "https://ahmadbilaldsa.github.io/payout-delta/",
        },
        distribution: [
          {
            "@type": "DataDownload",
            downloadUrl: datasetUrl,
            encodingFormat: "application/json",
            name: "Fees JSON API",
          },
          {
            "@type": "DataDownload",
            downloadUrl: llmsUrl,
            encodingFormat: "text/plain",
            name: "LLM Manifest (Full)",
          },
        ],
        keywords: [
          "cross-border payments",
          "SWIFT fees",
          "FX spreads",
          "remittance",
          "statutory withholding",
          sourceCurrency,
          targetCurrency,
        ],
        includedInDataCatalog: {
          "@type": "DataCatalog",
          name: "PayoutDelta Fee Registry",
          url: "https://ahmadbilaldsa.github.io/payout-delta/developers/",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${corridorUrl}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: `What is the total cost to send ${sourceCurrency} to ${targetCurrency}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `The total cost includes platform fees (${sourceCurrency === "USD" ? "10% for Upwork, 20% for Fiverr, 0% for direct" : "varies by platform"}), intermediary SWIFT fees (~$${intermediaryFeeUsd.toFixed(0)} benchmark), FX spread (~3.5% for direct bank wires, ~0.45% for Wise), and statutory withholding (${regulatoryCitation}${purposeCode ? " (Purpose Code " + purposeCode + ")" : ""}).`,
            },
          },
          {
            "@type": "Question",
            name: `How much lands in local currency for a $${sourceCurrency === "USD" ? "1,000" : "1,000 " + sourceCurrency} transfer?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Using the current mid-market rate of ${baseRate.toFixed(2)} ${targetCurrency} per USD, a $${sourceCurrency === "USD" ? "1,000" : "1,000 " + sourceCurrency} transfer via direct SWIFT wire typically lands approximately ${(baseRate * 940).toFixed(0)} ${targetCurrency} after fees and spreads. Use our calculator for exact figures.`,
            },
          },
          {
            "@type": "Question",
            name: `What is the regulatory citation for ${targetCurrency} statutory withholding?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: regulatoryCitation + (purposeCode ? `. Exporters should reference Purpose Code ${purposeCode} for tax exemption eligibility.` : ""),
            },
          },
        ],
      },
    ],
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * React component that injects JSON-LD into the document head.
 * Use in Next.js page components via dangerouslySetInnerHTML.
 */
export function FinancialSchema(props: FinancialSchemaProps): React.JSX.Element {
  const jsonLd = buildFinancialSchema(props);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}
