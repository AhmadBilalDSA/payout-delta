import type { Metadata } from "next";

import AgencyAuditCalculator from "@/components/agencies/AgencyAuditCalculator";
import { getCorridors } from "@/lib/db";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Agency Treasury Leakage Engine — Silent Banking Friction Auditor",
  description:
    "Roster-level auditor for digital agencies paying contractors abroad: quantify annual SHA wire cuts, retail bank FX margins and the net savings of B2B rails (Wise Business / Airwallex / Payoneer) with a 1-click executive PDF report.",
  alternates: {
    canonical: "/agencies/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/agencies/`,
    siteName: "PayoutDelta",
    title: "Agency Treasury Leakage Engine — PayoutDelta",
    description:
      "Model a contractor roster across 50+ payout corridors, compute the annual leakage from SWIFT SHA cuts and retail FX margins, then export the executive treasury report as PDF.",
  },
};

const webApplicationLd = {
  "@type": "WebApplication",
  name: "PayoutDelta Agency Treasury Leakage Engine",
  operatingSystem: "Web (React, static export)",
  applicationCategory: "FinanceApplication",
  url: `${SITE_URL}/agencies/`,
  description:
    "Roster-level annual audit of silent banking friction for agencies paying cross-border contractors: SHA intermediary cuts, retail bank FX margins and B2B rails net savings.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function AgenciesPage() {
  const corridors = getCorridors();

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
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "For Agencies", item: `${SITE_URL}/agencies/` },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />

      <section className="w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
          />
          Agency Treasury Leakage Engine
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
          The wire cuts and FX margins quietly draining your contractor payroll.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          Add every contractor you pay abroad. PayoutDelta models your roster
          across {corridors.length} corridors and computes the two silent
          frictions in classic SWIFT payroll: the correspondent SHA cut and the
          retail bank FX margin — then benchmarks what flat-fee B2B rails
          (Wise Business, Airwallex, Payoneer) would keep in your treasury,
          and exports the whole audit as a one-click executive PDF.
        </p>
      </section>

      <div className="mt-6">
        <AgencyAuditCalculator corridors={corridors} />
      </div>

      <p className="no-print mt-10 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
        PayoutDelta is informational tooling, not financial, tax or legal
        advice. Roster leakage models use benchmark intermediary and spread
        bands compiled from the public corridor dataset; actual deductions land
        on each bank&apos;s credit advice (CRF) and must be verified against
        the beneficiary country&apos;s statutory withholding regime before
        invoicing.
      </p>
    </div>
  );
}