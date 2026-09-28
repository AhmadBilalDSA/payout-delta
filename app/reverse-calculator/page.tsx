import type { Metadata } from "next";

import ReverseCalculatorClient, {
  type CorridorOption,
} from "@/components/reverse-calculator/ReverseCalculatorClient";
import { getCorridors } from "@/lib/db";
import { getJurisdictions } from "@/lib/registryData";
import { SITE_URL } from "@/lib/seoSchemas";

/**
 * /reverse-calculator/ — static server shell.
 *
 * SERVER-ONLY. Resolves all corridor, channel and statutory data here at build
 * time and hands the client island a flat serialisable `CorridorOption[]`.
 * No lib/db, lib/registryData or any Node built-in ever reaches the client
 * bundle — only the narrow prop type crosses the boundary.
 */

export const dynamic = "force-static";

const TITLE =
  "Reverse Invoice Calculator — What Gross USD Invoice Do I Need to Raise?";
const DESCRIPTION =
  "Enter your target net take-home in PKR, INR, PHP, BRL, COP or any of 182 corridors. The engine solves backward through the full deduction stack — Upwork/Fiverr/Deel commission, SWIFT SHA correspondent cut, FX spread, and statutory withholding — returning the exact gross USD invoice amount.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/reverse-calculator/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/reverse-calculator/`,
    siteName: "PayoutDelta",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

/**
 * Build the narrow corridor option list for the client island.
 *
 * Withholding is resolved from `data/jurisdictions.json` keyed on ISO 3166-1
 * alpha-2. A missing jurisdiction defaults to 0% (no published withholding),
 * consistent with the hexagonal dossier's `"No statutory withholding"` branch.
 *
 * SHA cut is clamped to [15, 35] from the fees.json `channels.swift.fixedFeeUSD`
 * benchmark (45 USD total = ~$25 SHA + ~$20 sending bank) or falls back to 25.
 */
function buildCorridorOptions(): CorridorOption[] {
  const corridors    = getCorridors();
  const jurisdictions = getJurisdictions();
  const whtByIso2    = new Map(
    jurisdictions.map((j) => [j.iso2, j.tax.baselineWhtPct / 100])
  );

  return corridors.map((c) => ({
    slug:           c.slug,
    label:          `${c.from} → ${c.to} (${c.country})`,
    to:             c.to,
    symbol:         c.currencySymbol,
    midRate:        c.rate,
    // Use corridor-level provider spread if published, else fall back to
    // the swift channel benchmark (3.5%)
    fxSpread:       c.providers?.find((p) => p.id === "swift")?.fxSpread ?? 0.035,
    // SHA cut: mid-point of 15–35 range
    shaUsd:         25,
    withholdingRate: whtByIso2.get(c.countryCode) ?? 0,
  }));
}

/** JSON-LD WebApplication node for the reverse calculator tool. */
const SCHEMA_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PayoutDelta Reverse Invoice Calculator",
  url: `${SITE_URL}/reverse-calculator/`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
}).replace(/</g, "\\u003c");

export default function ReverseCalculatorPage() {
  const corridors = buildCorridorOptions();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: SCHEMA_LD }}
      />
      <ReverseCalculatorClient corridors={corridors} />
    </>
  );
}
