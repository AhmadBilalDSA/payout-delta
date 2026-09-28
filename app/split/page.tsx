import type { Metadata } from "next";

import SplitOptimizerClient, {
  type SplitCorridorOption,
} from "@/components/split/SplitOptimizerClient";
import { getCorridors } from "@/lib/db";
import { getJurisdictions } from "@/lib/registryData";
import { SITE_URL } from "@/lib/seoSchemas";

/**
 * /split/ — Multi-Rail Withdrawal Split Optimizer server shell.
 *
 * SERVER-ONLY. Resolves corridors and withholding data at build time.
 * Hands the client island a flat, serialisable SplitCorridorOption[].
 */

export const dynamic = "force-static";

const TITLE =
  "Multi-Rail Withdrawal Split Optimizer — SWIFT vs Payoneer/Wise vs FCY Wallet";
const DESCRIPTION =
  "Compare net yield across three withdrawal rails for any gross invoice volume ($1,000–$50,000). Direct SWIFT Wire to local bank, Payoneer or Wise transfer, and Foreign Currency Value Account retention — side-by-side fee leakage analysis across 182 corridors.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/split/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/split/`,
    siteName: "PayoutDelta",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

function buildSplitCorridors(): SplitCorridorOption[] {
  const corridors     = getCorridors();
  const jurisdictions = getJurisdictions();
  const whtByIso2     = new Map(
    jurisdictions.map((j) => [j.iso2, j.tax.baselineWhtPct / 100])
  );
  return corridors.map((c) => ({
    slug:            c.slug,
    label:           `${c.from} → ${c.to} (${c.country})`,
    to:              c.to,
    symbol:          c.currencySymbol,
    midRate:         c.rate,
    withholdingRate: whtByIso2.get(c.countryCode) ?? 0,
  }));
}

const SCHEMA_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PayoutDelta Multi-Rail Split Optimizer",
  url: `${SITE_URL}/split/`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
}).replace(/</g, "\\u003c");

export default function SplitPage() {
  const corridors = buildSplitCorridors();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: SCHEMA_LD }}
      />
      <SplitOptimizerClient corridors={corridors} />
    </>
  );
}
