import type { Metadata } from "next";
import { getCorridors } from "@/lib/db";
import { getJurisdictions } from "@/lib/registryData";
import { CompareClient } from "@/components/compare/CompareClient";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Corridor Comparison Engine — SWIFT SHA vs OUR vs Local Rails",
  description:
    "Interactive side-by-side settlement comparator evaluating Net Landed Amount, Effective Basis Point Friction, and Intermediary Deductions across multiple withdrawal paths.",
  alternates: { canonical: "/compare/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/compare/`,
    siteName: "PayoutDelta",
    title: "Corridor Comparison Engine — PayoutDelta",
    description:
      "Interactive side-by-side settlement comparator evaluating Net Landed Amount, Effective Basis Point Friction, and Intermediary Deductions across multiple withdrawal paths.",
    locale: "en_US",
  },
};

export const dynamic = "force-static";

export default function ComparePage() {
  const jurisdictions = getJurisdictions();
  const whtByIso2 = new Map(
    jurisdictions.map((j) => [j.iso2, j.tax.baselineWhtPct / 100])
  );

  const corridors = getCorridors().map((c) => {
    // Synthetic fallback for the comparator demonstration
    const baseSha = 25; 
    return {
      slug: c.slug,
      label: `${c.from} to ${c.to} (${c.country})`,
      to: c.to,
      symbol: c.currencySymbol,
      rate: c.rate,
      shaUsd: baseSha,
      ourUsd: baseSha + 15,
      localUsd: 0,
      withholdingRate: whtByIso2.get(c.countryCode) ?? 0,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black pt-16">
      <CompareClient corridors={corridors} />
    </main>
  );
}