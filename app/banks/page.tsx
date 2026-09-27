import type { Metadata } from "next";

import BankDirectory from "@/components/banks/BankDirectory";
import BankRegistryTable from "@/components/banks/BankRegistryTable";
import { BANK_DOSSIERS } from "@/data/banks";
import { getCorridors } from "@/lib/db";
import { getBankProfiles, getRegistryMeta } from "@/lib/registryData";
import { SITE_URL } from "@/lib/seoSchemas";

/** Every routable institution, one per verified head in the registry. */
const BANK_PROFILES = getBankProfiles();
const REGISTRY_META = getRegistryMeta();

export const metadata: Metadata = {
  title: "Bank Dossier Directory — 266 Verified SWIFT BICs & SHA Deductions",
  description:
    "An indexed directory of every verified ISO 9362 head behind the payout network — correspondent clearing hubs (CHASUS33, CITIUS33, DEUTDEDD) and domestic beneficiary banks, each with its BIC validation state, USD correspondent anchor, domestic clearing rail and field 71A charge-code support.",
  alternates: {
    canonical: "/banks/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/banks/`,
    siteName: "PayoutDelta",
    title: "Bank Dossier Directory — PayoutDelta",
    description: `${BANK_PROFILES.length} verified institutions decoded: correspondent clearing hubs (CHASUS33, DEUTDEDD, HSBCGB2L) and domestic beneficiary rails with SHA cuts, field 71A charge-code support and settlement rails.`,
  },
};

const itemListLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "PayoutDelta Bank Dossier Directory",
  numberOfItems: BANK_PROFILES.length,
  itemListElement: BANK_PROFILES.map((bank, index) => ({
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
          {REGISTRY_META.bankCount} verified ISO 9362 heads across{" "}
          {REGISTRY_META.jurisdictionsCovered} sovereign markets —{" "}
          {REGISTRY_META.tier1Count} correspondent clearing hubs and{" "}
          {REGISTRY_META.tier2Count} domestic settlement banks — covering the
          global hubs that intermediate USD, EUR and GBP corridors and the banks
          your payouts actually land in across {corridorCount} priced routes.
          Every head carries its validation state, USD correspondent anchor,
          domestic clearing rail and field 71A charge codes;{" "}
          {BANK_DOSSIERS.length} of them also carry an authored dossier with
          typical SHA deductions and corridor deep-links.
        </p>
      </section>

      <section
        aria-label="Verified institution registry"
        className="mt-6 w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 sm:p-8 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md"
      >
        <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          Verified institution registry
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          Indexed by institution, BIC, market and clearing rail. Every row is a
          real publisher-listed head: no synthetic institution is published, so a
          market with no evidenced head stays absent rather than padded.
        </p>
        <div className="mt-5">
          <BankRegistryTable profiles={BANK_PROFILES} />
        </div>
      </section>

      <section
        aria-label="Authored bank dossiers"
        className="mt-8 w-full min-w-0"
      >
        <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Authored deep-dive dossiers ({BANK_DOSSIERS.length})
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          These {BANK_DOSSIERS.length} institutions carry a full dossier: the
          typical SHA intermediary deduction, bank-specific field 71A guidance
          and every corridor the head serves.
        </p>
        <div className="mt-4">
          <BankDirectory banks={BANK_DOSSIERS} />
        </div>
      </section>

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