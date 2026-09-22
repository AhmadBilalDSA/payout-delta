import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getChannels,
  getCorridors,
  getCorridorBySlug,
  getCorridorSlugs,
  getDataset,
  getPlatforms,
} from "@/lib/db";
import { getCorridorContent } from "@/lib/corridorContent";
import { computeSparklineStats, getCorridorHistory } from "@/lib/history";
import { getComplianceGuide } from "@/data/complianceGuides";
import { hreflangMap } from "@/lib/localizedCorridors";
import Calculator from "@/components/Calculator";
import FaqAccordion from "@/components/FaqAccordion";
import CorridorCard from "@/components/CorridorCard";
import BlufSummary from "@/components/BlufSummary";
import ComplianceGuide from "@/components/ComplianceGuide";

const SITE_URL = "https://payoutdelta.com";
const BREADCRUMB_ORIGIN = "https://ahmadbilaldsa.github.io/payout-delta";

interface CorridorPageProps {
  params: Promise<{ slug: string }>;
}

/** Statically generates every corridor page at build time. */
export function generateStaticParams(): { slug: string }[] {
  return getCorridorSlugs().map((slug) => ({ slug }));
}

/** On-demand pages outside the static param set are 404s, not SSR'd. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: CorridorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const corridor = getCorridorBySlug(slug);
  if (!corridor) {
    return { title: "Corridor not found" };
  }
  const content = getCorridorContent(slug);
  const languages = hreflangMap(slug);
  return {
    title: `${corridor.from} to ${corridor.to} — Payout Fee Audit (${corridor.country})`,
    description: `${content.overview.slice(0, 150)}`,
    alternates: {
      canonical: `/calculator/${corridor.slug}/`,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/calculator/${corridor.slug}/`,
      title: `${corridor.from}→${corridor.to} payout fee audit`,
      description: content.overview.slice(0, 150),
    },
  };
}

function buildJsonLd(slug: string) {
  const corridor = getCorridorBySlug(slug);
  if (!corridor) return null;
  const content = getCorridorContent(slug);
  const guide = getComplianceGuide(slug);
  const channels = getChannels();
  const corridorPair = `${corridor.from}→${corridor.to}`;
  const corridorUrl = `${SITE_URL}/calculator/${corridor.slug}/`;

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
        name: "Corridors",
        item: `${BREADCRUMB_ORIGIN}/calculator/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${corridor.from} to ${corridor.to} (${corridor.country})`,
        item: `${BREADCRUMB_ORIGIN}/calculator/${corridor.slug}/`,
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: corridorUrl,
    inLanguage: "en",
    mainEntity: [...content.faqs, ...guide.faqs].map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PayoutDelta",
    operatingSystem: "Web (React, static export)",
    applicationCategory: "FinanceApplication",
    url: corridorUrl,
    description:
      "Zero-signup auditor of freelance payout fees for the " +
      `${corridor.from}-to-${corridor.to} (${corridor.country}) corridor.`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: undefined,
  };

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `PayoutDelta Cross-Border Freelance Remittance (${corridorPair})`,
    serviceType: "Cross-border freelance payout fee audit",
    url: corridorUrl,
    provider: {
      "@type": "Organization",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
    },
    areaServed: {
      "@type": "Country",
      name: corridor.country,
      identifier: corridor.countryCode,
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${corridorPair} withdrawal channels`,
      itemListElement: channels.map((channel) => ({
        "@type": "Offer",
        name: `${channel.name} — ${channel.fixedFeeUSD} USD fixed + ${(
          channel.fxSpread * 100
        ).toFixed(2)}% FX spread`,
        category: `Cross-border remittance (${corridorPair})`,
        price: String(channel.fixedFeeUSD),
        priceCurrency: corridor.from,
        seller: { "@type": "Organization", name: channel.name },
      })),
    },
  };

  const productLds = channels.map((channel) => ({
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${channel.name} Cross-Border Freelance Remittance`,
    category: `Cross-border remittance (${corridorPair})`,
    provider: { "@type": "Organization", name: channel.name },
    areaServed: {
      "@type": "Country",
      name: corridor.country,
      identifier: corridor.countryCode,
    },
    feesAndCommissionsSpecification: [
      {
        "@type": "MonetaryAmount",
        name: "Fixed transferring fee (USD)",
        value: channel.fixedFeeUSD,
        currency: corridor.from,
      },
      {
        "@type": "QuantitativeValue",
        name: "FX spread markup on interbank reference",
        value: channel.fxSpread,
        unitText: "fraction of mid-market rate",
      },
    ],
    amount: {
      "@type": "MonetaryAmount",
      name: `Reference settlement rate (${corridor.from} to ${corridor.to})`,
      value: corridor.rate,
      currency: corridor.to,
    },
  }));

  return [
    breadcrumbLd,
    faqLd,
    appLd,
    serviceLd,
    ...productLds,
  ].map((block) => JSON.stringify(block).replace(/</g, "\\u003c"));
}

export default async function CorridorPage({ params }: CorridorPageProps) {
  const { slug } = await params;
  const corridor = getCorridorBySlug(slug);
  if (!corridor) {
    notFound();
  }
  const content = getCorridorContent(corridor.slug);
  const guide = getComplianceGuide(corridor.slug);
  const platforms = getPlatforms();
  const channels = getChannels();
  const datasetRevision = getDataset().updatedAt.slice(0, 10);
  const related = getCorridors()
    .filter((item) => item.slug !== corridor.slug)
    .slice(0, 3);
  const history = getCorridorHistory(corridor.slug);
  const sparklineStats = computeSparklineStats(history, channels);
  const jsonLd = buildJsonLd(corridor.slug) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {jsonLd.map((block) => (
        <script
          key={block}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: block }}
        />
      ))}

      <p className="text-sm font-medium text-slate-500 dark:text-white/50">
        Payout corridor · {corridor.from} → {corridor.to} ·{" "}
        {corridor.country}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {corridor.from} to {corridor.to} Payout Fee Auditor
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-white/60">
        Reference rate:{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {corridor.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
          {corridor.to}
        </span>{" "}
        per USD · fee data revision {datasetRevision}. Every calculation runs in your
        browser; nothing is tracked.
      </p>

      {/* Phase 3 — BLUF answer card (server-rendered, indexer-parseable). */}
      <div className="mt-6">
        <BlufSummary
          corridor={corridor}
          channels={channels}
          platforms={platforms}
        />
      </div>

      <div className="mt-6">
        <Calculator
          corridor={corridor}
          platforms={platforms}
          channels={channels}
          history={history}
          sparklineStats={sparklineStats}
        />
      </div>

      {/* Phase 5 — regional banking & tax compliance drawer under the fee cards. */}
      <div className="mt-8">
        <ComplianceGuide guide={guide} />
      </div>

      {/* Unique editorial prose — see lib/corridorContent.ts */}
      <div className="mt-10 space-y-10">
        <section aria-labelledby="corridor-overview">
          <h2
            id="corridor-overview"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            {content.pageHeadline}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
            {content.overview}
          </p>
        </section>

        <section aria-labelledby="tax-considerations">
          <h2
            id="tax-considerations"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            Tax considerations for {corridor.country}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-slate-700">
            {content.taxConsiderations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="clearance-times">
          <h2
            id="clearance-times"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            Domestic payout clearance times
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
            {content.clearanceTimes}
          </p>
        </section>

        <section aria-labelledby="swift-rules">
          <h2
            id="swift-rules"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            Inbound SWIFT &amp; central-bank rules
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
            {content.swiftRules}
          </p>
        </section>

        <section aria-labelledby="corridor-faq">
          <h2 id="corridor-faq" className="text-xl font-bold text-slate-900 dark:text-white">
            Frequently asked questions
          </h2>
          <div className="mt-3">
            <FaqAccordion items={[...content.faqs, ...guide.faqs]} />
          </div>
        </section>

        <section aria-labelledby="related-corridors">
          <h2
            id="related-corridors"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            Audited corridors
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <CorridorCard key={item.slug} corridor={item} />
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-500 dark:text-white/50">
          The above is informational, not financial or tax advice. Verify
          today’s live rates and your local obligations before transacting.{" "}
          <Link
            href="/disclaimer"
            className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-white"
          >
            Full disclaimer
          </Link>
          .
        </p>
      </div>
    </div>
  );
}