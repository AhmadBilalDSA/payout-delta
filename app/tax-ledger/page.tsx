import type { Metadata } from "next";
import TaxLedgerView from "@/components/ledger/TaxLedgerView";
import { getCorridors } from "@/lib/db";

const SITE_URL = "https://payoutdelta.com";
const BREADCRUMB_ORIGIN = "https://ahmadbilaldsa.github.io/payout-delta";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Remittance & Tax Ledger",
  description:
    "Year-end annual tax-season remittance ledger: gross billed, platform & SWIFT deductions, realized FX and take-home per corridor. 100% local, spreadsheet-ready CSV export and printable audit package.",
  alternates: {
    canonical: "/tax-ledger/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/tax-ledger/`,
    siteName: "PayoutDelta",
    title: "Remittance & Tax Ledger — PayoutDelta",
    description:
      "Aggregate every invoice saved from the studio into an annual, filterable, printable tax-season ledger.",
  },
};

const ledgerLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PayoutDelta Remittance & Tax Ledger",
  operatingSystem: "Web (React, static export)",
  applicationCategory: "BusinessApplication",
  url: `${SITE_URL}/tax-ledger/`,
  description:
    "On-device annual remittance ledger rolling up invoiced gross, platform and SWIFT deductions, realized FX and local take-home, with spreadsheet-ready CSV export and a printable annual audit package.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${BREADCRUMB_ORIGIN}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Remittance & Tax Ledger",
      item: `${BREADCRUMB_ORIGIN}/tax-ledger/`,
    },
  ],
};

const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "PayoutDelta Remittance & Tax Ledger — Annual Filing Support",
  serviceType: "Year-end remittance aggregation with CSV export and printable audit package",
  url: `${SITE_URL}/tax-ledger/`,
  provider: {
    "@type": "Organization",
    name: "PayoutDelta",
    url: `${SITE_URL}/`,
  },
  areaServed: {
    "@type": "Place",
    name: "Worldwide",
  },
};

export default function TaxLedgerPage() {
  const corridors = getCorridors();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ledgerLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="no-print border-b border-black/[0.06] py-12 text-center sm:py-16 dark:border-white/[0.08]">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/40">
          Tools · Phase 5
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
          Remittance &amp; Tax Ledger
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-white/60">
          Every invoice saved from the studio lands here as a year-attributable
          record — gross billed, platform &amp; SWIFT deductions, realized FX
          and local take-home. Filter by year and corridor, export a CSV for
          your accountant, or print the annual audit package.
        </p>
      </section>

      <div className="mt-8">
        <TaxLedgerView corridors={corridors} />
      </div>

      <p className="no-print mt-10 text-xs leading-relaxed text-slate-500 dark:text-white/50">
        PayoutDelta is informational tooling, not financial, tax or legal
        advice. Ledger records persist only in your browser’s local storage;
        nothing is transmitted or tracked.
      </p>
    </div>
  );
}