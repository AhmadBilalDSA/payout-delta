import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import BankRoutingDiagram from "@/components/banks/BankRoutingDiagram";
import BankSettlementPanel from "@/components/banks/BankSettlementPanel";
import SovereignDossierView from "@/components/hex/SovereignDossierView";
import { GITHUB_REPO } from "@/data/banks";
import { railFor } from "@/data/regulatoryBanking";
import { getCorridorBySlug } from "@/lib/db";
import { buildSovereignDossier } from "@/lib/hexagonalDossier";
import {
  getBankProfileBySlug,
  getBankProfiles,
  getJurisdictionByIso2,
  type BankProfile,
} from "@/lib/registryData";
import {
  buildBankAccountSchema,
  buildBreadcrumbLd,
  serializeSchemaGraph,
  SITE_URL,
} from "@/lib/seoSchemas";

export const dynamicParams = false;

interface BankDossierPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * One static route per verified head in `data/banksRegistry.json`.
 *
 * The 23 authored dossiers in `data/banks.ts` keep their published slugs, so
 * `/banks/habib-bank/` never moves; the other 243 verified heads are addressed by
 * their lowercased BIC, which is unique by construction and stable across
 * rebuilds because it is derived from the real institution identifier. Every
 * route renders the institutional record — validation state, USD correspondent
 * anchor, clearing rail, charge codes — and only the 23 dossier-backed heads add
 * the authored prose.
 */
export function generateStaticParams(): { slug: string }[] {
  return getBankProfiles().map((bank) => ({ slug: bank.slug }));
}

function corridorName(slug: string): string {
  const corridor = getCorridorBySlug(slug);
  return corridor
    ? `${corridor.from} → ${corridor.to} · ${corridor.country}`
    : slug;
}

export async function generateMetadata({
  params,
}: BankDossierPageProps): Promise<Metadata> {
  const { slug } = await params;
  const bank = getBankProfileBySlug(slug);
  if (!bank) {
    return { title: "Bank dossier not found" };
  }
  const url = `${SITE_URL}/banks/${bank.slug}/`;
  const role = bank.role.toLowerCase();
  const dossier = bank.dossier;
  return {
    title: `${bank.shortName} (${bank.bic}) — SWIFT Bank Dossier`,
    description: `${bank.name} — ${role}. Verified ${bank.bic} ISO 9362 head registered in ${bank.countryName}, ${bank.railId} domestic clearing rail, field 71A charge codes ${bank.supportedCharges.join("/")}, ${formatCut(bank.defaultIntermediaryCutUSD)} benchmark intermediary cut${
      dossier
        ? `, typical ${dossier.typicalShaDeduction} and ${dossier.connectedCorridors.length} served payout corridor${dossier.connectedCorridors.length === 1 ? "" : "s"}`
        : ""
    }.`,
    alternates: { canonical: `/banks/${bank.slug}/` },
    openGraph: {
      type: "profile",
      url,
      siteName: "PayoutDelta",
      title: `${bank.shortName} (${bank.bic}) — PayoutDelta`,
      description: `SWIFT dossier for ${bank.name}: BIC ${bank.bic}, ${role}, ${formatCut(bank.defaultIntermediaryCutUSD)} intermediary cut.`,
    },
    twitter: {
      card: "summary",
      title: `${bank.shortName} (${bank.bic}) — PayoutDelta`,
      description: `SWIFT dossier: ${role}, ${formatCut(bank.defaultIntermediaryCutUSD)} intermediary cut.`,
    },
  };
}

/** Shared money formatter for the metadata and the on-page cards. */
function formatCut(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function bankSchemaLd(bank: BankProfile) {
  return {
    "@type": "FinancialService",
    name: bank.name,
    alternateName: bank.shortName,
    brand: {
      "@type": "Brand",
      name: bank.shortName,
    },
    location: {
      "@type": "Place",
      name: `${bank.countryName} registration`,
      address: {
        "@type": "PostalAddress",
        addressCountry: bank.countryIso2,
      },
    },
    identifier: [
      {
        "@type": "PropertyValue",
        propertyID: "ISO 9362 BIC",
        value: bank.bic,
      },
      {
        "@type": "PropertyValue",
        propertyID: "clearing rail",
        value: bank.railId,
      },
    ],
    url: `${SITE_URL}/banks/${bank.slug}/`,
    description:
      bank.dossier?.field71aGuidance ??
      `${bank.role} in ${bank.countryName}. ISO 9362 head ${bank.bic} validated, ${bank.railId} domestic clearing rail, field 71A charge codes ${bank.supportedCharges.join("/")}.`,
  };
}

export default async function BankDossierPage({
  params,
}: BankDossierPageProps) {
  const { slug } = await params;
  const bank = getBankProfileBySlug(slug);
  if (!bank) notFound();

  // Early exit: skip expensive sovereign dossier for banks without jurisdiction
  const jurisdiction = getJurisdictionByIso2(bank.countryIso2) ?? null;
  const dossier = bank.dossier;
  const primaryCorridor = dossier?.connectedCorridors[0] ?? null;

  // Build sovereign dossier only when we have all required data
  let sovereignDossier = null;
  if (jurisdiction && dossier) {
    try {
      sovereignDossier = buildSovereignDossier(
        bank,
        jurisdiction,
        getCorridorBySlug(primaryCorridor ?? "") ?? null
      );
    } catch {
      // Degrade gracefully if dossier building fails
      sovereignDossier = null;
    }
  }

  const breadcrumbs = serializeSchemaGraph([
    buildBreadcrumbLd([
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Banks", url: `${SITE_URL}/banks/` },
      { name: bank.shortName, url: `${SITE_URL}/banks/${bank.slug}/` },
    ]),
    bankSchemaLd(bank),
    // Phase 6 — the priced correspondent product and the USD settlement
    // account. `FinancialService` says who the head is; these two say what it
    // charges and where the money lands, which is the rest of what an
    // institutional consumer needs. Spread after the service node so a
    // consumer reading the graph in order meets entity → product → account.
    ...buildBankAccountSchema(bank),
  ]);

  // Phase 7 — the interconnected sovereign graph (FinancialProduct +
  // GovernmentService + FAQPage, tied by `@id`) ships as its own `@graph`
  // document rather than being spread into the one above. The two graphs
  // describe the same entities from different vantage points — one prices the
  // correspondent leg, the other prices the statutory clearance — and merging
  // them would put two `FinancialProduct` nodes for one product in a single
  // document, which is a conflicting-entity signal rather than a richer one.
  const sovereignLd = sovereignDossier
    ? serializeSchemaGraph(sovereignDossier.jsonLd)
    : "";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbs }}
      />
      {sovereignLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sovereignLd }}
        />
      ) : null}

      <nav
        aria-label="Breadcrumb"
        className="no-print mb-6 overflow-x-auto"
      >
        <ol className="flex items-center gap-1.5 text-xs text-black/[0.5] whitespace-nowrap dark:text-white/[0.5]">
          <li>
            <Link href="/" className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/banks/" className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              Banks
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/banks/"
              className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              {bank.countryName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-emerald-600 dark:text-emerald-400">
            {bank.shortName}
          </li>
        </ol>
      </nav>

      <section className="w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
              />
              {bank.role}
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
              {bank.name}
            </h1>
            <p className="mt-2 text-sm text-black/[0.6] dark:text-white/60">
              <span aria-hidden="true">{bank.flag}</span>{" "}
              {bank.countryName},{" "}
              <span className="uppercase">{bank.countryIso2}</span>
              {dossier ? `, ${dossier.headquartersCity}` : ""} ·{" "}
              <span className="font-mono font-semibold">{bank.railId}</span>{" "}
              clearing
            </p>
          </div>

          <dl className="shrink-0">
            <dt className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              ISO 9362 BIC
            </dt>
            <dd
              className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center font-mono text-xl font-bold tracking-widest text-slate-900 tabular-nums dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white"
              aria-label={`BIC ${bank.bic}`}
            >
              {bank.bic.slice(0, 4)} {bank.bic.slice(4, 6)} {bank.bic.slice(6)}
            </dd>
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------------ *
       * Institutional record — published for every verified head, from the
       * bank registry. The authored dossier below only deepens the 23 hubs
       * this repository has written up.
       * ------------------------------------------------------------------ */}
      <section className="mt-6 w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
        <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          Institutional record
        </h2>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <dt className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              ISO 9362 validation
            </dt>
            <dd className="mt-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  bank.iso9362.valid
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                }`}
              >
                <span aria-hidden="true">{bank.iso9362.valid ? "✓" : "!"}</span>
                {bank.iso9362.valid ? "Validated" : "Unvalidated"}
              </span>
              <p className="mt-1.5 font-mono text-[11px] text-black/55 dark:text-white/55">
                bank {bank.iso9362.bankCode} · country {bank.iso9362.countryCode}
                {" · "}
                location {bank.iso9362.locationCode}
                {bank.iso9362.branchCode
                  ? ` · branch ${bank.iso9362.branchCode}`
                  : ""}
              </p>
              <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">
                {bank.iso9362.length}-character head
                {bank.iso9362.primaryOffice ? " · primary office" : " · branch"}
                {bank.iso9362.length === 11 ? " (location suffix)" : ""}
              </p>
              {bank.iso9362.issues.map((issue) => (
                <p
                  key={issue}
                  className="mt-1 text-[11px] text-amber-700 dark:text-amber-400"
                >
                  {issue}
                </p>
              ))}
            </dd>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <dt className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              G-SIB USD correspondent
            </dt>
            <dd className="mt-1.5">
              {bank.usdGsibCorrespondent === "" ? (
                <>
                  <span className="text-[11px] font-bold text-black/45 dark:text-white/45">
                    No single anchor evidenced
                  </span>
                  <p className="mt-1 text-[11px] leading-relaxed text-black/50 dark:text-white/50">
                    The registry publishes no dominant USD correspondent for this
                    domestic bank; the monetary exposure is carried by the
                    benchmark cut below.
                  </p>
                </>
              ) : (
                <>
                  <span className="font-mono text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    {bank.usdGsibCorrespondent.slice(0, 4)}{" "}
                    {bank.usdGsibCorrespondent.slice(4, 6)}{" "}
                    {bank.usdGsibCorrespondent.slice(6)}
                  </span>
                  <p className="mt-1 text-[11px] leading-relaxed text-black/55 dark:text-white/55">
                    {bank.usdGsibCorrespondentName ||
                      (bank.tier === 1
                        ? "Carries its own USD leg"
                        : "USD leg correspondent")}
                    {bank.usdGsibCountryIso2
                      ? ` · ${bank.usdGsibCountryIso2}`
                      : ""}
                  </p>
                </>
              )}
            </dd>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <dt className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              Domestic clearing rail
            </dt>
            <dd className="mt-1.5">
              <span className="font-mono text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                {bank.railId}
              </span>
              <p className="mt-1 text-[11px] leading-relaxed text-black/55 dark:text-white/55">
                {bank.rail?.operator ?? "Unspecified operator"}
              </p>
              <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">
                {bank.rail ? `${bank.rail.protocol} · ${bank.rail.finalityWindow}` : "Not published"}
                {bank.rail?.instant ? " · instant" : ""}
              </p>
            </dd>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <dt className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              Field 71A charge codes
            </dt>
            <dd className="mt-1.5">
              <span className="inline-flex flex-wrap gap-1">
                {bank.supportedCharges.length > 0 ? (
                  bank.supportedCharges.map((code) => (
                    <span
                      key={code}
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:border-white/[0.12] dark:bg-white/[0.05] dark:text-slate-200"
                    >
                      {code}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] font-bold text-black/45 dark:text-white/45">
                    Not published
                  </span>
                )}
              </span>
              <p className="mt-1.5 font-mono text-[11px] tabular-nums text-black/55 dark:text-white/55">
                {formatCut(bank.defaultIntermediaryCutUSD)} benchmark cut ·{" "}
                {bank.avgTransitHours}h transit
              </p>
              <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">
                {dossier?.chargeCodeSupport.recommended
                  ? `Recommended: ${dossier.chargeCodeSupport.recommended}`
                  : "SHA is the priced default across the corpus"}
              </p>
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
            Correspondent routing path
          </h3>
          <div className="mt-3">
            <BankRoutingDiagram profile={bank} />
          </div>
        </div>
      </section>

      {dossier ? (
        <>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
          <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
            Field 71A — Details of Charges
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-black/[0.7] dark:text-white/75">
            {dossier.field71aGuidance}
          </p>

          {/* Phase 2 — the rail the money lands on, the 71A codes the bank
              honours, and the average cut. `railFor` resolves the destination's
              own central-bank system from `RAILS_BY_CURRENCY`, so a dossier can
              never claim a rail the rails table does not carry. */}
          <BankSettlementPanel
            rail={`${dossier.clearingNetwork} — ${dossier.clearingCurrency}`}
            chargeCodes={dossier.chargeCodeSupport.supported}
            recommended={dossier.chargeCodeSupport.recommended}
            note={dossier.chargeCodeSupport.note}
            averageIntermediaryCutUSD={dossier.averageIntermediaryCutUSD}
            transitTimeHours={dossier.transitTimeHours}
            instantRail={railFor(dossier.clearingCurrency).instant}
          />

          <a
            href={`${GITHUB_REPO}/blob/master/data/banks.ts`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            Edit this record on GitHub
            <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400">
              ↗
            </span>
          </a>
        </section>

        <section className="w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
          <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
            Typical SHA Deduction
          </h2>
          <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-emerald-700 tabular-nums dark:text-emerald-400">
            {dossier.typicalShaDeduction}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-black/[0.5] dark:text-white/[0.5]">
            Benchmark band for the intermediary tier on {bank.bic} corridors.
            Actual deduction appears on the beneficiary&apos;s CRF / MT103
            credit advice.
          </p>
          {primaryCorridor && (
            <Link
              href={`/compare/${primaryCorridor}/`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              Run Wire Deduction Benchmark for this Bank
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          )}
        </section>
      </div>

      <section className="mt-6 w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
        <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          Served Payout Corridors
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {dossier.connectedCorridors.map((slug) => (
            <li key={slug}>
              <Link
                href={`/compare/${slug}/`}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-500/40 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400"
              >
                <span className="font-mono">{slug}</span>
                <span className="truncate text-black/[0.45] dark:text-white/[0.45]">
                  {corridorName(slug)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
        </>
      ) : null}

      {sovereignDossier ? (
        <SovereignDossierView dossier={sovereignDossier} idPrefix={`bank-${bank.slug}`} />
      ) : null}

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Explore the Directory
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/banks/"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-500/40 hover:text-emerald-700 dark:border-white/[0.1] dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400"
          >
            All bank dossiers
          </Link>
          <Link
            href="/swift-auditor/"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-500/40 hover:text-emerald-700 dark:border-white/[0.1] dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400"
          >
            SWIFT Intermediary Route Auditor
          </Link>
        </div>
      </section>

      <p className="no-print mt-10 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
        PayoutDelta is informational tooling, not financial, tax or legal
        advice. This dossier is a benchmark reference — always verify the BIC,
        account number and charges with the receiving bank before issuing an
        invoice.
      </p>
    </div>
  );
}