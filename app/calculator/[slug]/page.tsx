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
import {
  LONG_TAIL_CORRIDORS,
  getLongTailBySlug,
  parseCorridorSlug,
} from "@/data/corridors";
import { dedupeFaqs, getCorridorContent } from "@/lib/corridorContent";
import { computeSparklineStats, getCorridorHistory } from "@/lib/history";
import { getComplianceGuide } from "@/data/complianceGuides";
import { hreflangMap } from "@/lib/localizedCorridors";
import { getAeoFaqEntries } from "@/lib/aeoFaqs";
import {
  BREADCRUMB_ORIGIN,
  SITE_URL,
  buildAeoFaqSchema,
  buildBreadcrumbLd,
  buildFinancialServiceSchema,
  buildServiceLd,
  buildWaterfallHowToSchema,
  buildWebApplicationLd,
  serializeSchemaGraph,
} from "@/lib/seoSchemas";
import { computeRoute, DEFAULT_GROSS_USD } from "@/utils/calculateRoute";
import Calculator from "@/components/Calculator";
import ErrorBoundary from "@/components/ErrorBoundary";
import FaqAccordion from "@/components/FaqAccordion";
import CorridorCard from "@/components/CorridorCard";
import BlufSummary from "@/components/BlufSummary";
import AeoFaqSection from "@/components/AeoFaqSection";
import ComplianceGuide from "@/components/ComplianceGuide";
import CurrencyTrendSparkline from "@/components/CurrencyTrendSparkline";

interface CorridorPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Statically generates every corridor page at build time — the ten base
 * currency corridors plus the programmatic long-tail platform corridors
 * (Upwork / Fiverr / Deel permutations).
 */
export function generateStaticParams(): { slug: string }[] {
  return [
    ...getCorridorSlugs(),
    ...LONG_TAIL_CORRIDORS.map((spec) => spec.slug),
  ].map((slug) => ({ slug }));
}

/** On-demand pages outside the static param set are 404s, not SSR'd. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: CorridorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const longTail = getLongTailBySlug(slug);
  const parsed = longTail
    ? { sourceCurrency: longTail.sourceCurrency, targetCurrency: longTail.targetCurrency }
    : parseCorridorSlug(slug);
  const corridorSlug = longTail ? longTail.baseSlug : slug;
  const corridor = getCorridorBySlug(corridorSlug);
  if (!corridor) {
    return { title: "Corridor not found" };
  }
  const languages = hreflangMap(corridor.slug);

  // Phase 4 — long-tail platform corridors get search-tailored metadata that
  // matches the exact route under the GitHub Pages basePath.
  if (longTail) {
    const title = `${longTail.label} ${parsed.sourceCurrency} to ${parsed.targetCurrency} Payout Calculator — Real Bank Deductions & Net Take-Home`;
    const description = `Calculate exact net ${parsed.targetCurrency} payout from ${longTail.label}. Audits ${longTail.label} fee, intermediary SWIFT cuts, local bank landing charges, and statutory tax withholding.`;
    const ogDescription = `Benchmark SWIFT intermediary deductions (CHASUS33/CITIUS33), retail FX spreads, and tax purpose codes for ${longTail.label} ${parsed.sourceCurrency} to ${parsed.targetCurrency} on PayoutDelta.`;
    return {
      title,
      description,
      alternates: {
        canonical: `${BREADCRUMB_ORIGIN}/calculator/${slug}/`,
      },
      openGraph: {
        type: "website",
        siteName: "PayoutDelta",
        url: `${BREADCRUMB_ORIGIN}/calculator/${slug}/`,
        title,
        description: ogDescription,
        locale: "en_US",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: ogDescription,
      },
    };
  }

  const content = getCorridorContent(corridor.slug);
  const ogDescription = `Benchmark SWIFT intermediary deductions (CHASUS33/CITIUS33), retail FX spreads, and tax purpose codes for ${corridor.from} to ${corridor.to} on PayoutDelta.`;
  return {
    title: `${corridor.from} to ${corridor.to} — Payout Fee Audit (${corridor.country})`,
    description: `${content.overview.slice(0, 150)}`,
    alternates: {
      canonical: `/calculator/${corridor.slug}/`,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: "website",
      siteName: "PayoutDelta",
      url: `${SITE_URL}/calculator/${corridor.slug}/`,
      title: `${corridor.from}→${corridor.to} payout fee audit`,
      description: ogDescription,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${corridor.from}→${corridor.to} payout fee audit`,
      description: ogDescription,
    },
  };
}

/**
 * Phase 5 — single canonical JSON-LD `@graph` per corridor route.
 *
 * Every entity (BreadcrumbList, WebApplication, CurrencyConversionService +
 * per-rail FinancialProducts, Service, the 7-layer HowTo waterfall, and a
 * FAQPage mirroring the programmatic AEO Q&As) is emitted through the
 * dedicated builders in `lib/seoSchemas.ts`. Long-tail platform corridors
 * resolve pricing/conversion data from their underlying currency corridor
 * while keeping their own route slug in URLs and copy.
 */
function buildJsonLd(slug: string): string[] {
  const longTail = getLongTailBySlug(slug);
  const corridor = getCorridorBySlug(longTail ? longTail.baseSlug : slug);
  if (!corridor) return [];
  const content = getCorridorContent(corridor.slug);
  const guide = getComplianceGuide(corridor.slug);
  const channels = getChannels();
  const platforms = getPlatforms();
  const corridorPair = longTail
    ? `${longTail.label} ${corridor.from}→${corridor.to}`
    : `${corridor.from}→${corridor.to}`;
  const corridorUrl = `${SITE_URL}/calculator/${slug}/`;

  const platform =
    platforms.find((item) => item.id === (longTail?.platformId ?? "upwork")) ??
    platforms[0];
  const bestQuote = computeRoute(
    DEFAULT_GROSS_USD,
    platform,
    corridor,
    channels,
  ).verdict.best;
  const platformName = longTail?.label ?? platform.name;

  const breadcrumbLd = buildBreadcrumbLd([
    { name: "Home", url: `${BREADCRUMB_ORIGIN}/` },
    { name: "Corridors", url: `${BREADCRUMB_ORIGIN}/calculator/` },
    {
      name: longTail
        ? `${longTail.label} ${corridor.from} to ${corridor.to} (${corridor.country})`
        : `${corridor.from} to ${corridor.to} (${corridor.country})`,
      url: `${BREADCRUMB_ORIGIN}/calculator/${slug}/`,
    },
  ]);

  const faqLd = buildAeoFaqSchema(
    dedupeFaqs([
      ...getAeoFaqEntries({
        corridor,
        channels,
        platform,
        lang: "en",
        platformLabel: longTail?.label,
      }).map((entry) => ({ q: entry.q, a: entry.aText })),
      ...content.faqs,
      ...guide.faqs,
    ]),
    {
      url: corridorUrl,
      inLanguage: "en",
    },
  );

  const appLd = buildWebApplicationLd({ corridor, corridorPair, corridorUrl });

  const serviceLd = buildServiceLd({
    corridor,
    corridorPair,
    corridorUrl,
    channels,
  });

  return [
    serializeSchemaGraph([
      breadcrumbLd,
      appLd,
      ...buildFinancialServiceSchema(corridor, platform, bestQuote, channels),
      serviceLd,
      buildWaterfallHowToSchema(corridor.from, corridor.to, platformName),
      faqLd,
    ]),
  ];
}

export default async function CorridorPage({ params }: CorridorPageProps) {
  const { slug } = await params;
  const longTail = getLongTailBySlug(slug);
  const corridor = getCorridorBySlug(longTail ? longTail.baseSlug : slug);
  if (!corridor) {
    notFound();
  }
  const parsed = longTail
    ? {
        platform: longTail.platformId,
        sourceCurrency: longTail.sourceCurrency,
        targetCurrency: longTail.targetCurrency,
      }
    : parseCorridorSlug(slug);

  const platforms = getPlatforms();
  const platformPreset =
    platforms.find((item) => item.id === parsed.platform) ?? null;

  // Phase 4 — long-tail pages keep the base corridor's country-specific copy
  // but lead with a platform-tailored headline + overview so every generated
  // route is a genuinely distinct document (platform win-rate wording varies).
  const baseContent = getCorridorContent(corridor.slug);
  const content = longTail
    ? {
        ...baseContent,
        pageHeadline: `${longTail.label} ${corridor.from}→${corridor.to} payout audit: the ${platformPreset?.feePercent ?? 10}% platform cut, itemized`,
        overview: `This is the ${longTail.label} edition of the ${corridor.from}→${corridor.to} audit. A $1,000 ${longTail.label} payout deducts ${platformPreset?.feePercent ?? 10}% platform commission before any money reaches a withdrawal channel — then the intermediary SWIFT cut, local bank landing fee and statutory withholding slice the rest. PayoutDelta ranks every route by the ${corridor.to} that actually lands in your account at the ${corridor.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })} reference rate.`,
      }
    : baseContent;
  const guide = getComplianceGuide(corridor.slug);
  const allFaqs = [...content.faqs, ...guide.faqs];
  const uniqueFaqs = allFaqs.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.q === self[index].q),
  );
  const channels = getChannels();
  const datasetRevision = getDataset().updatedAt.slice(0, 10);
  const related = getCorridors()
    .filter((item) => item.slug !== corridor.slug)
    .slice(0, 3);
  const history = getCorridorHistory(corridor.slug);
  const sparklineStats = computeSparklineStats(history, channels);
  const jsonLd = buildJsonLd(slug) ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      {jsonLd.map((block) => (
        <script
          key={block}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: block }}
        />
      ))}

      <p className="text-sm font-medium text-slate-500 dark:text-white/50">
        Payout corridor ·{" "}
        {longTail ? `${longTail.label} · ` : ""}
        {corridor.from} → {corridor.to} · {corridor.country}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {longTail
          ? `${longTail.label} ${corridor.from} to ${corridor.to} Payout Fee Auditor`
          : `${corridor.from} to ${corridor.to} Payout Fee Auditor`}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-white/60">
        Reference rate:{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          {corridor.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
          {corridor.to}
        </span>{" "}
        per USD · fee data revision {datasetRevision}.{" "}
        {longTail && platformPreset
          ? `${longTail.label} default (${platformPreset.feePercent}% platform cut) is pre-selected; you can switch platforms below.`
          : "Every calculation runs in your browser; nothing is tracked."}
      </p>

      <CurrencyTrendSparkline
        slug={slug}
        rate={corridor.rate}
        code={corridor.to}
        className="mt-6"
      />

      {/* UI anti-collapse grid — Calculator renders the 12-column rail shell
          (interactive inputs / waterfall left, analytical AEO + verdict + FAQ
          right) and mounts the server-rendered BLUF + AEO FAQ slots beside the
          live verdict card. Phase S1 — the interactive calculator is wrapped
          in an institutional error boundary so a render fault in one module
          is contained to its own fallback card, never the whole route. */}
      <div className="mt-6">
        <ErrorBoundary fallbackTitle="Payout Calculator Guard">
          <Calculator
            corridor={corridor}
            platforms={platforms}
            channels={channels}
            history={history}
            sparklineStats={sparklineStats}
            platformPreset={parsed.platform ?? undefined}
            bluf={
              <BlufSummary
                corridor={corridor}
                channels={channels}
                platforms={platforms}
                platformId={parsed.platform ?? undefined}
                platformLabel={longTail?.label}
              />
            }
            faq={
              <AeoFaqSection
                corridor={corridor}
                channels={channels}
                platforms={platforms}
                platformId={parsed.platform ?? undefined}
                platformLabel={longTail?.label}
              />
            }
          />
        </ErrorBoundary>
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
            <FaqAccordion items={uniqueFaqs} />
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