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
import Calculator from "@/components/Calculator";
import BlufSummary from "@/components/BlufSummary";
import FaqAccordion from "@/components/FaqAccordion";
import { dedupeFaqs } from "@/lib/corridorContent";

const BREADCRUMB_ORIGIN = "https://ahmadbilaldsa.github.io/payout-delta";

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

function buildJsonLd(lang: string, slug: string) {
  const localized = getLocalizedCorridor(lang, slug);
  if (!localized) return [];
  const corridor = getCorridorBySlug(slug);
  if (!corridor) return [];

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
        name: localized.headline,
        item: `${BREADCRUMB_ORIGIN}/${lang}/calculator/${slug}/`,
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: dedupeFaqs(localized.faqs).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return [breadcrumbLd, faqLd].map((block) =>
    JSON.stringify(block).replace(/</g, "\\u003c"),
  );
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
      className="mx-auto max-w-5xl px-4 py-10 sm:px-6"
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

      {/* Phase 6 — same BLUF answer card as the English corridor, so localized
          pages carry the indexer-parseable one-sentence takeaway too. */}
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