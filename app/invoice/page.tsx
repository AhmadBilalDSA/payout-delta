import type { Metadata } from "next";
import InvoiceEditor from "@/components/invoice/InvoiceEditor";
import InvoiceHero from "@/components/invoice/InvoiceHero";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getChannels, getCorridors } from "@/lib/db";
import { BREADCRUMB_ORIGIN, SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Freelance Invoice Studio",
  description:
    "Generate minimalist, transparent international invoices with built-in remittance fee clauses. 100% client-side, zero-signup, print-ready A4 PDF.",
  alternates: {
    canonical: "/invoice/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/invoice/`,
    siteName: "PayoutDelta",
    title: "Freelance Invoice Studio — PayoutDelta",
    description:
      "Dynamic invoice customizer with a remittance transparency addendum, logo upload, and native print-to-PDF export.",
  },
};

const invoiceLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PayoutDelta Freelance Invoice Studio",
  operatingSystem: "Web (React, static export)",
  applicationCategory: "BusinessApplication",
  url: `${SITE_URL}/invoice/`,
  description:
    "Minimalist international invoice generator for freelancers with built-in remittance fee clauses. Fully client-side — invoice data never leaves the browser.",
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
      name: "Freelance Invoice Studio",
      item: `${BREADCRUMB_ORIGIN}/invoice/`,
    },
  ],
};

const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "PayoutDelta Freelance Invoice Studio — Cross-Border Invoicing Service",
  serviceType: "Freelance international invoicing with remittance transparency",
  url: `${SITE_URL}/invoice/`,
  provider: {
    "@type": "Organization",
    name: "PayoutDelta",
    url: `${SITE_URL}/`,
  },
  areaServed: {
    "@type": "Place",
    name: "Worldwide",
  },
  feesAndCommissionsSpecification: [
    {
      "@type": "MonetaryAmount",
      name: "Fixed service fee",
      value: 0,
      currency: "USD",
    },
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function InvoicePage() {
  const channels = getChannels();
  const corridors = getCorridors();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(invoiceLd).replace(/</g, "\\u003c"),
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

      <InvoiceHero />

      <div className="mt-8">
        {/* Phase S1 — the interactive editor is wrapped in the institutional
            error boundary so a fault is contained to its own fallback card. */}
        <ErrorBoundary fallbackTitle="Invoice Studio Guard">
          <InvoiceEditor channels={channels} corridors={corridors} />
        </ErrorBoundary>
      </div>

      <p className="no-print mt-10 text-xs leading-relaxed text-slate-500 dark:text-white/50">
        PayoutDelta is informational tooling, not financial, tax or legal
        advice. Invoice drafts and logos stay in your browser’s local storage;
        nothing is transmitted or tracked.
      </p>
    </div>
  );
}