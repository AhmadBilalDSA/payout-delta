import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getChannels, getCorridorBySlug, getDataset, getPlatforms } from "@/lib/db";
import { computeSparklineStats, getCorridorHistory } from "@/lib/history";
import {
  getLocalizedCorridor,
  hreflangMap,
  LOCALIZED_CORRIDORS,
} from "@/lib/localizedCorridors";
import { dedupeFaqs } from "@/lib/corridorContent";
import { getAeoFaqEntries } from "@/lib/aeoFaqs";
import {
  BREADCRUMB_ORIGIN,
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
import BlufSummary from "@/components/BlufSummary";
import FaqAccordion from "@/components/FaqAccordion";
import AeoFaqSection from "@/components/AeoFaqSection";
import CurrencyTrendSparkline from "@/components/CurrencyTrendSparkline";

interface LocalizedCorridorPageProps {
  params: Promise<{ lang: string; slug: string }>;
}

/**
 * Phase 5 — statically generated localized sub-paths.
 *
 * Only the five authored `(lang, slug)` pairs from the dictionary render; any
 * other combination is a 404 via `dynamicParams = false`. The HTML is baked
 * into `./out/<lang>/calculator/<slug>/index.html` at build time, so localized
 * queries strike plain pre-rendered markup with zero runtime negotiation.
 */
export function generateStaticParams(): { lang: string; slug: string }[] {
  return LOCALIZED_CORRIDORS.map(({ lang, slug }) => ({ lang, slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: LocalizedCorridorPageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const localized = getLocalizedCorridor(lang, slug);
  const corridor = getCorridorBySlug(slug);
  if (!localized || !corridor) {
    return { title: "Corridor not found" };
  }
  return {
    title: localized.title,
    description: localized.description,
    alternates: {
      canonical: `/${lang}/calculator/${slug}/`,
      languages: hreflangMap(slug),
    },
    openGraph: {
      type: "website",
      url: `${BREADCRUMB_ORIGIN}/${lang}/calculator/${slug}/`,
      title: localized.title,
      description: localized.description,
    },
  };
}

function buildJsonLd(lang: string, slug: string): string[] {
  const localized = getLocalizedCorridor(lang, slug);
  if (!localized) return [];
  const corridor = getCorridorBySlug(slug);
  if (!corridor) return [];

  const channels = getChannels();
  const platforms = getPlatforms();
  const corridorUrl = `${BREADCRUMB_ORIGIN}/${lang}/calculator/${slug}/`;
  const corridorPair = `${corridor.from}→${corridor.to}`;

  const platform =
    platforms.find((item) => item.id === "upwork") ?? platforms[0];
  const bestQuote = computeRoute(
    DEFAULT_GROSS_USD,
    platform,
    corridor,
    channels,
  ).verdict.best;

  const breadcrumbLd = buildBreadcrumbLd([
    { name: "Home", url: `${BREADCRUMB_ORIGIN}/` },
    { name: "Corridors", url: `${BREADCRUMB_ORIGIN}/calculator/` },
    { name: localized.headline, url: corridorUrl },
  ]);

  const aeoEntries = getAeoFaqEntries({
    corridor,
    channels,
    platform,
    lang: "en",
  });

  const faqLd = buildAeoFaqSchema(
    dedupeFaqs([
      ...aeoEntries.map((entry) => ({ q: entry.q, a: entry.aText })),
      ...localized.faqs,
    ]),
    { url: corridorUrl, inLanguage: lang },
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
      buildWaterfallHowToSchema(corridor.from, corridor.to, platform.name),
      faqLd,
    ]),
  ];
}

export default async function LocalizedCorridorPage({
  params,
}: LocalizedCorridorPageProps) {
  const { lang, slug } = await params;
  const localized = getLocalizedCorridor(lang, slug);
  const corridor = getCorridorBySlug(slug);
  if (!localized || !corridor) {
    notFound();
  }

  const platforms = getPlatforms();
  const channels = getChannels();
  const allFaqs = localized.faqs;
  const uniqueFaqs = allFaqs.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.q === self[index].q),
  );
  const datasetRevision = getDataset().updatedAt.slice(0, 10);
  const history = getCorridorHistory(corridor.slug);
  const sparklineStats = computeSparklineStats(history, channels);
  const jsonLd = buildJsonLd(lang, slug);

  return (
    <div
      dir={localized.dir}
      lang={localized.lang}
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6"
    >
      {jsonLd.map((block) => (
        <script
          key={block}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: block }}
        />
      ))}

      <p className="text-sm font-medium text-slate-500 dark:text-white/50">
        {localized.eyebrow} · {corridor.from} → {corridor.to}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {localized.headline}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-white/60">
        {localized.intro} — {localized.localeName} edition · fee data revision{" "}
        {datasetRevision}.
      </p>

      <CurrencyTrendSparkline
        slug={slug}
        rate={corridor.rate}
        code={corridor.to}
        className="mt-6"
      />

      {/* Phase 7 — the same anti-collapse 12-column rail shell as the English
          corridor page: interactive inputs / waterfall on the left, the AEO
          answer box + verdict + audit FAQ pinned on the right. */}
      <div className="mt-6">
        <Calculator
          corridor={corridor}
          platforms={platforms}
          channels={channels}
          history={history}
          sparklineStats={sparklineStats}
          bluf={
            <BlufSummary
              corridor={corridor}
              channels={channels}
              platforms={platforms}
            />
          }
          faq={
            <AeoFaqSection
              corridor={corridor}
              channels={channels}
              platforms={platforms}
            />
          }
        />
      </div>

      <div className="mt-10 space-y-8">
        <section aria-labelledby="localized-faq">
          <h2 id="localized-faq" className="text-xl font-bold text-slate-900 dark:text-white">
            Frequently asked questions
            <span lang="en" className="ml-1 text-sm font-normal text-slate-500 dark:text-white/50">
              ({localized.localeName})
            </span>
          </h2>
          <div className="mt-3">
            <FaqAccordion items={uniqueFaqs} />
          </div>
        </section>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-white/50">
          {localized.note}{" "}
          <Link
            href={`/calculator/${corridor.slug}/`}
            lang="en"
            className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-white"
          >
            Read the English version
          </Link>
          . PayoutDelta is informational tooling — not financial, tax or legal
          advice.
        </p>
      </div>
    </div>
  );
}