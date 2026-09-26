import type { Metadata } from "next";

import SwiftAuditorTerminal from "@/components/compliance/SwiftAuditorTerminal";
import { buildSwiftBankIndex } from "@/lib/swiftRoutingEngine";
import { getCorridors } from "@/lib/db";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "SWIFT Intermediary Route Auditor",
  description:
    "Search 50 countries of banks and inspect their complete SWIFT correspondent network — intermediary clearing node, SHA deduction band, settlement speed, double-dip risk and a 1-click wire instructions generator.",
  alternates: {
    canonical: "/swift-auditor/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/swift-auditor/`,
    siteName: "PayoutDelta",
    title: "SWIFT Intermediary Route Auditor — PayoutDelta",
    description:
      "BIC-level correspondent route inspector over the 50-country statutory bank directory. 100% client-side, deterministic, static export.",
  },
};

const webApplicationLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PayoutDelta SWIFT Intermediary Route Auditor",
  operatingSystem: "Web (React, static export)",
  applicationCategory: "FinanceApplication",
  url: `${SITE_URL}/swift-auditor/`,
  description:
    "Inspect the SWIFT correspondent routing, intermediary deduction band, settlement speed and double-dip risk for any bank across 50 payout corridors.",
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
      item: `${SITE_URL}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "SWIFT Intermediary Route Auditor",
      item: `${SITE_URL}/swift-auditor/`,
    },
  ],
};

export default function SwiftAuditorPage() {
  const entries = buildSwiftBankIndex();
  const corridors = getCorridors().length;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
          />
          SWIFT Intermediary Leakage &amp; BIC Route Inspector
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
          Every inbound bank wire leaks at a correspondent — audit the exact
          route before you invoice.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          PayoutDelta maps {corridors} corridors onto their real U.S. / EU / UK
          correspondent clearing nodes (CHASUS33, CITIUS33, IRVTUS3N, SCBLUS33,
          DEUTDEDD, BNPAFRPA, BARCGB22, MIDLGB22) and quantifies the expected
          SHA cut, the domestic receiving rail and the settlement speed for
          every bank in the directory — deterministically, entirely in your
          browser.
        </p>
      </section>

      <div className="mt-6">
        <SwiftAuditorTerminal entries={entries} />
      </div>

      <p className="no-print mt-10 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
        PayoutDelta is informational tooling, not financial, tax or legal
        advice. Correspondent identifiers and deduction bands are benchmark
        figures compiled from the public bank directory; the actual deduction
        lands on the beneficiary bank&apos;s credit advice (CRF) and must be
        verified before invoicing.
      </p>
    </div>
  );
}