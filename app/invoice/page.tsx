import type { Metadata } from "next";
import InvoiceEditor from "@/components/invoice/InvoiceEditor";
import { getChannels } from "@/lib/db";

const SITE_URL = "https://payoutdelta.com";

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

export default function InvoicePage() {
  const channels = getChannels();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(invoiceLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="border-b border-black/[0.06] py-12 text-center sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Tools · Phase 4
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Freelance Invoice Studio
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Generate minimalist, transparent international invoices with built-in
          remittance fee clauses. Everything renders in your browser — print to
          a clean A4 PDF, and no data ever leaves your device.
        </p>
      </section>

      <div className="mt-8">
        <InvoiceEditor channels={channels} />
      </div>

      <p className="mt-10 text-xs leading-relaxed text-slate-500">
        PayoutDelta is informational tooling, not financial, tax or legal
        advice. Invoice drafts and logos stay in your browser’s local storage;
        nothing is transmitted or tracked.
      </p>
    </div>
  );
}