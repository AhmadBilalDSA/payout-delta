import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BANK_DOSSIERS,
  GITHUB_REPO,
  getBankDossierBySlug,
  type BankDossier,
} from "@/data/banks";
import { getCorridorBySlug } from "@/lib/db";
import {
  buildBreadcrumbLd,
  serializeSchemaGraph,
  SITE_URL,
} from "@/lib/seoSchemas";

export const dynamicParams = false;

interface BankDossierPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return BANK_DOSSIERS.map((bank) => ({ slug: bank.slug }));
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
  const bank = getBankDossierBySlug(slug);
  if (!bank) {
    return { title: "Bank dossier not found" };
  }
  const url = `${SITE_URL}/banks/${bank.slug}/`;
  return {
    title: `${bank.shortName} (${bank.bic}) — SWIFT Bank Dossier`,
    description: `${bank.name} — ${bank.role}. Verified ${bank.bic} ISO 9362 BIC, ${bank.headquartersCity} headquarters, typical ${bank.typicalShaDeduction} and field 71A SHA guidance for ${bank.connectedCorridors.length} payout corridor${bank.connectedCorridors.length === 1 ? "" : "s"}.`,
    alternates: { canonical: `/banks/${bank.slug}/` },
    openGraph: {
      type: "profile",
      url,
      siteName: "PayoutDelta",
      title: `${bank.shortName} (${bank.bic}) — PayoutDelta`,
      description: `SWIFT dossier for ${bank.name}: BIC ${bank.bic}, ${bank.role.toLowerCase()}, ${bank.typicalShaDeduction}.`,
    },
    twitter: {
      card: "summary",
      title: `${bank.shortName} (${bank.bic}) — PayoutDelta`,
      description: `SWIFT dossier: ${bank.role.toLowerCase()}, ${bank.typicalShaDeduction}.`,
    },
  };
}

function bankSchemaLd(bank: BankDossier) {
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
      name: `${bank.headquartersCity} headquarters`,
      address: {
        "@type": "PostalAddress",
        addressLocality: bank.headquartersCity,
        addressCountry: bank.headquartersCountry,
      },
    },
    identifier: {
      "@type": "PropertyValue",
      propertyID: "ISO 9362 BIC",
      value: bank.bic,
    },
    url: `${SITE_URL}/banks/${bank.slug}/`,
    description: bank.field71aGuidance,
  };
}

export default async function BankDossierPage({
  params,
}: BankDossierPageProps) {
  const { slug } = await params;
  const bank = getBankDossierBySlug(slug);
  if (!bank) notFound();

  const primaryCorridor = bank.connectedCorridors[0] ?? null;
  const breadcrumbs = serializeSchemaGraph([
    buildBreadcrumbLd([
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Banks", url: `${SITE_URL}/banks/` },
      { name: bank.shortName, url: `${SITE_URL}/banks/${bank.slug}/` },
    ]),
    bankSchemaLd(bank),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbs }}
      />

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
              {bank.headquartersCity},{" "}
              <span className="uppercase">{bank.headquartersCountry}</span> ·{" "}
              <span className="font-mono font-semibold">
                {bank.clearingCurrency}
              </span>{" "}
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
          <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
            Field 71A — Details of Charges
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-black/[0.7] dark:text-white/75">
            {bank.field71aGuidance}
          </p>

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
            {bank.typicalShaDeduction}
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
          {bank.connectedCorridors.map((slug) => (
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