import type { Metadata } from "next";

import BankDirectory from "@/components/banks/BankDirectory";
import { BANK_DOSSIERS } from "@/data/banks";
import { getCorridors } from "@/lib/db";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Bank Dossier Directory — SWIFT BICs & SHA Deductions",
  description:
    "Structured profiles for the correspondent clearing hubs and domestic beneficiary banks behind every payout corridor: verified ISO 9362 BICs, typical SHA intermediary deductions and 71A guidance.",
  alternates: {
    canonical: "/banks/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/banks/`,
    siteName: "PayoutDelta",
    title: "Bank Dossier Directory — PayoutDelta",
    description:
      "22 bank dossiers decoded: correspondent clearing hubs (CHASUS33, DEUTDEFF, HSBCGB2L) and domestic beneficiary rails with typical SHA cuts and field 71A guidance.",
  },
};

const itemListLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "PayoutDelta Bank Dossier Directory",
  numberOfItems: BANK_DOSSIERS.length,
  itemListElement: BANK_DOSSIERS.map((bank, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: bank.name,
    url: `${SITE_URL}/banks/${bank.slug}/`,
  })),
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
      name: "Bank Dossier Directory",
      item: `${SITE_URL}/banks/`,
    },
  ],
};

export default function BanksDirectoryPage() {
  const corridorCount = getCorridors().length;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListLd).replace(/</g, "\\u003c"),
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
          Programmatic Bank Dossier Directory
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
          Every correspondent hub and beneficiary rail at the receiving end of
          your wire — decoded bank by bank.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          {BANK_DOSSIERS.length} verified dossiers cover the global clearing
          hubs that intermediate USD, EUR and GBP corridors, plus the domestic
          banks your payouts actually land in across {corridorCount} routes.
          Each profile lists the ISO 9362 BIC, the bank&apos;s expected SHA
          intermediary deduction and field 71A guidance — then deep-links
          straight into the wire-deduction calculator for that corridor.
        </p>
      </section>

      <div className="mt-6">
        <BankDirectory banks={BANK_DOSSIERS} />
      </div>

      <p className="no-print mt-10 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
        PayoutDelta is informational tooling, not financial, tax or legal
        advice. BICs are validated ISO 9362 8-character heads; deduction bands
        are benchmark figures compiled from the public bank directory. The
        actual deduction lands on the beneficiary bank&apos;s credit advice
        (CRF) and must be verified before invoicing.
      </p>
    </div>
  );
}