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
    mainEntity: localized.faqs.map((item) => ({
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

      <p className="text-sm font-medium text-slate-500">
        {localized.eyebrow} · {corridor.from} → {corridor.to}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {localized.headline}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        {localized.intro} — {localized.localeName} edition · fee data revision{" "}
        {datasetRevision}.
      </p>

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
        <section aria-labelledby="localized-takeaways">
          <h2
            id="localized-takeaways"
            className="text-xl font-bold text-slate-900"
          >
            {localized.localeName} compliance takeaways
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-slate-700">
            {localized.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="localized-faq">
          <h2 id="localized-faq" className="text-xl font-bold text-slate-900">
            Frequently asked questions
            <span lang="en" className="ml-1 text-sm font-normal text-slate-500">
              ({localized.localeName})
            </span>
          </h2>
          <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {localized.faqs.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium text-slate-900 select-none hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-slate-400 transition-transform duration-200 ease-out group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-xs leading-relaxed text-slate-500">
          {localized.note}{" "}
          <Link
            href={`/calculator/${corridor.slug}/`}
            lang="en"
            className="underline underline-offset-2 hover:text-slate-700"
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