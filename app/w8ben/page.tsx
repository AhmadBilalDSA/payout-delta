import type { Metadata } from "next";
import { getJurisdictions } from "@/lib/registryData";
import { W8BenClient } from "@/components/tax/W8BenClient";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Statutory W-8BEN & Tax Treaty Clearance Engine",
  description:
    "Interactive statutory withholding tax resolver computing US WHT deductions under Double Taxation Treaties for cross-border contractors.",
  alternates: { canonical: "/w8ben/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/w8ben/`,
    siteName: "PayoutDelta",
    title: "Statutory W-8BEN & Tax Treaty Clearance Engine",
    description:
      "Interactive statutory withholding tax resolver computing US WHT deductions under Double Taxation Treaties for cross-border contractors.",
    locale: "en_US",
  },
};

export const dynamic = "force-static";

export default function W8BenPage() {
  const jurisdictions = getJurisdictions();
  
  // Format jurisdictions for the client
  const options = jurisdictions.map((j) => ({
    iso2: j.iso2,
    name: j.name,
  }));

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black pt-16">
      <W8BenClient jurisdictions={options} />
    </main>
  );
}
