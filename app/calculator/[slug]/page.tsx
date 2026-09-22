import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getChannels,
  getCorridors,
  getCorridorBySlug,
  getCorridorSlugs,
  getPlatforms,
} from "@/lib/db";
import { getCorridorContent } from "@/lib/corridorContent";
import Calculator from "@/components/Calculator";
import FaqAccordion from "@/components/FaqAccordion";
import CorridorCard from "@/components/CorridorCard";

const SITE_URL = "https://payoutdelta.com";

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
  return {
    title: `${corridor.from} to ${corridor.to} — Payout Fee Audit (${corridor.country})`,
    description: `${content.overview.slice(0, 150)}`,
    alternates: {
      canonical: `/calculator/${corridor.slug}/`,
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

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((item) => ({
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
    url: `${SITE_URL}/calculator/${corridor.slug}/`,
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

  return [faqLd, appLd].map((block) =>
    JSON.stringify(block).replace(/</g, "\\u003c"),
  );
}

export default async function CorridorPage({ params }: CorridorPageProps) {
  const { slug } = await params;
  const corridor = getCorridorBySlug(slug);
  if (!corridor) {
    notFound();
  }
  const content = getCorridorContent(corridor.slug);
  const platforms = getPlatforms();
  const channels = getChannels();
  const related = getCorridors()
    .filter((item) => item.slug !== corridor.slug)
    .slice(0, 3);
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

      <p className="text-sm font-medium text-slate-500">
        Payout corridor · {corridor.from} → {corridor.to} ·{" "}
        {corridor.country}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {corridor.from} to {corridor.to} Payout Fee Auditor
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Reference rate:{" "}
        <span className="font-semibold text-slate-900">
          {corridor.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
          {corridor.to}
        </span>{" "}
        per USD · fee data revision 2026-09-22. Every calculation runs in your
        browser; nothing is tracked.
      </p>

      <div className="mt-6">
        <Calculator
          corridor={corridor}
          platforms={platforms}
          channels={channels}
        />
      </div>

      {/* Unique editorial prose — see lib/corridorContent.ts */}
      <div className="mt-10 space-y-10">
        <section aria-labelledby="corridor-overview">
          <h2
            id="corridor-overview"
            className="text-xl font-bold text-slate-900"
          >
            {content.pageHeadline}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700">
            {content.overview}
          </p>
        </section>

        <section aria-labelledby="tax-considerations">
          <h2
            id="tax-considerations"
            className="text-xl font-bold text-slate-900"
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
            className="text-xl font-bold text-slate-900"
          >
            Domestic payout clearance times
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700">
            {content.clearanceTimes}
          </p>
        </section>

        <section aria-labelledby="swift-rules">
          <h2
            id="swift-rules"
            className="text-xl font-bold text-slate-900"
          >
            Inbound SWIFT &amp; central-bank rules
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700">
            {content.swiftRules}
          </p>
        </section>

        <section aria-labelledby="corridor-faq">
          <h2 id="corridor-faq" className="text-xl font-bold text-slate-900">
            Frequently asked questions
          </h2>
          <div className="mt-3">
            <FaqAccordion items={content.faqs} />
          </div>
        </section>

        <section aria-labelledby="related-corridors">
          <h2
            id="related-corridors"
            className="text-xl font-bold text-slate-900"
          >
            Audited corridors
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <CorridorCard key={item.slug} corridor={item} />
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-500">
          The above is informational, not financial or tax advice. Verify
          today’s live rates and your local obligations before transacting.{" "}
          <Link
            href="/disclaimer"
            className="underline underline-offset-2 hover:text-slate-700"
          >
            Full disclaimer
          </Link>
          .
        </p>
      </div>
    </div>
  );
}