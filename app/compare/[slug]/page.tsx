import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EDITORIAL_GUIDES,
  getEditorialGuideBySlug,
  type EditorialGuide,
} from "@/data/editorialGuides";
import { getPartnerConfig } from "@/data/affiliatePartners";
import { computeAlternativeRailsBenchmark } from "@/lib/alternativeRails";
import {
  buildArticleSchema,
  buildBreadcrumbLd,
  serializeSchemaGraph,
  SITE_URL,
} from "@/lib/seoSchemas";
import { formatUSD } from "@/utils/format";

export const dynamicParams = false;

interface CompareGuidePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return EDITORIAL_GUIDES.map((guide) => ({ slug: guide.slug }));
}

/** Deterministic word count over the authored copy, for Schema.org. */
function countArticleWords(guide: EditorialGuide): number {
  const corpus = [
    guide.title,
    guide.metaDescription,
    ...guide.focus,
    ...guide.verdict,
    ...guide.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
    ...guide.quickMetrics.flatMap((metric) => [
      metric.label,
      metric.optionA,
      metric.optionB,
    ]),
  ].join(" ");
  return corpus.split(/\s+/).filter(Boolean).length;
}

export async function generateMetadata({
  params,
}: CompareGuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getEditorialGuideBySlug(slug);
  if (!guide) {
    return { title: "Comparison guide not found" };
  }
  const guideUrl = `${SITE_URL}/compare/${guide.slug}/`;
  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: `${SITE_URL}/compare/${guide.slug}/` },
    openGraph: {
      type: "article",
      url: guideUrl,
      siteName: "PayoutDelta",
      title: `${guide.title} — PayoutDelta`,
      description: guide.metaDescription,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.metaDescription,
    },
  };
}

/**
 * Milestone 9 — sponsored recommendation card. Mirrors the calculator's
 * Alternative Rails card contract: the all-in bands come from the same pure
 * `computeAlternativeRailsBenchmark` engine, and the CTA always carries
 * `rel="noopener noreferrer sponsored"` with the partner's FTC disclosure
 * rendered underneath.
 */
function GuideRecommendationCard({ guide }: { guide: EditorialGuide }) {
  const benchmark = computeAlternativeRailsBenchmark(guide.exampleGrossUSD);
  const partner = getPartnerConfig(guide.recommendation.partnerId);

  return (
    <aside
      aria-label="Alternative direct rail recommendation"
      className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl"
      />

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
          />
          {partner.partnerBadge}
        </p>

        <h2 className="mt-3 text-sm font-bold tracking-tight text-slate-900 dark:text-white">
          {guide.recommendation.headline}
        </h2>
        {partner.url !== "" && (
          <p className="mt-1 text-xs leading-relaxed text-black/[0.5] dark:text-white/[0.5]">
            {guide.recommendation.body}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Classic SWIFT wire
            </span>
            <span className="font-mono text-base font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {formatUSD(benchmark.wire.totalMinUSD)}–
              {formatUSD(benchmark.wire.totalMaxUSD)}
            </span>
            <span className="text-[10px] leading-snug text-black/[0.45] dark:text-white/[0.45]">
              {benchmark.wire.components}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              Modern direct clearing
            </span>
            <span className="font-mono text-base font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
              {formatUSD(benchmark.modern.totalMinUSD)}–
              {formatUSD(benchmark.modern.totalMaxUSD)}
            </span>
            <span className="text-[10px] leading-snug text-emerald-900/60 dark:text-emerald-200/50">
              {benchmark.modern.components}
            </span>
          </div>
        </div>

        <p className="mt-2 text-[10px] leading-snug text-black/[0.45] dark:text-white/[0.45]">
          Corridor benchmark at a {formatUSD(guide.exampleGrossUSD)} transfer —
          your bank&apos;s actual credit advice is the audit of record.
        </p>

        <a
          href={partner.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          title={partner.disclosure}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-150 ease-out hover:bg-emerald-500 active:scale-[0.99] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
        >
          {guide.recommendation.claimCopy}
        </a>

        <p className="mt-3 text-[11px] leading-relaxed text-black/[0.45] dark:text-white/40">
          {partner.disclosure} Independent audit. We may earn a referral
          commission at zero cost to you.
        </p>
      </div>
    </aside>
  );
}

export default async function CompareGuidePage({
  params,
}: CompareGuidePageProps) {
  const { slug } = await params;
  const guide = getEditorialGuideBySlug(slug);
  if (!guide) {
    notFound();
  }

  const guideUrl = `${SITE_URL}/compare/${guide.slug}/`;
  const schema = serializeSchemaGraph([
    buildArticleSchema({
      title: guide.title,
      description: guide.metaDescription,
      url: guideUrl,
      publishedAt: guide.publishedAt,
      updatedAt: guide.updatedAt,
      wordCount: countArticleWords(guide),
      articleSection: "Cross-Border Payout Comparison",
      isTechArticle: guide.isTechArticle,
    }),
    buildBreadcrumbLd([
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Comparison Guides", url: `${SITE_URL}/compare/` },
      { name: guide.title, url: guideUrl },
    ]),
  ]);

  const related = EDITORIAL_GUIDES.filter((item) => item.slug !== guide.slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />

      <p className="text-sm font-medium text-slate-500 dark:text-white/50">
        <Link
          href="/compare/"
          className="transition-colors duration-200 ease-out hover:text-emerald-400"
        >
          Comparison Guides
        </Link>{" "}
        · {guide.readingTimeMinutes} min read ·{" "}
        {guide.isTechArticle ? "TechArticle" : "Article"} · up to date 2026-09-24
      </p>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        {guide.title}
      </h1>
      <p className="mt-3 max-w-3xl leading-relaxed text-slate-600 dark:text-white/60">
        {guide.metaDescription}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {guide.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-700/70 bg-slate-800/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {guide.quickMetrics.map((metric) => (
          <div
            key={metric.label}
            className="flex w-full min-w-0 flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-md backdrop-blur-md"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <p className="font-mono text-sm font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {guide.optionA.shortLabel}: {metric.optionA}
              </p>
              <p className="font-mono text-sm font-semibold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
                {guide.optionB.shortLabel}: {metric.optionB}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8 w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-md backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Side-by-side comparison of {guide.optionA.label} and{" "}
              {guide.optionB.label}
            </caption>
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-400">
                <th className="px-4 py-3">Line item</th>
                <th className="px-4 py-3">{guide.optionA.label}</th>
                <th className="px-4 py-3">{guide.optionB.label}</th>
              </tr>
            </thead>
            <tbody>
              {guide.comparisonTable.rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-white/[0.04] align-top last:border-0"
                >
                  <td className="w-[38%] px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {row.label}
                  </td>
                  <td
                    className={`w-[31%] px-4 py-3 ${
                      row.winner === "a"
                        ? "bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300"
                        : "text-white/70"
                    }`}
                  >
                    {row.optionA}
                  </td>
                  <td
                    className={`w-[31%] px-4 py-3 ${
                      row.winner === "b"
                        ? "bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300"
                        : "text-white/70"
                    }`}
                  >
                    {row.optionB}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 w-full min-w-0 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-md backdrop-blur-md">
        <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          What you&apos;ll learn
        </h2>
        <ul className="mt-3 space-y-2">
          {guide.focus.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-sm leading-relaxed text-slate-600 dark:text-white/60"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 w-full min-w-0 space-y-8">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph, index) => (
              <p
                key={`${section.heading}-${index}`}
                className={
                  paragraph.startsWith("> ")
                    ? "mt-3 rounded-r-xl border-l-2 border-emerald-500 bg-emerald-500/[0.06] px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-700 dark:text-emerald-100/80"
                    : "mt-2 leading-relaxed text-slate-600 dark:text-white/60"
                }
              >
                {paragraph.startsWith("> ")
                  ? paragraph.replace(/^> /, "")
                  : paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <section
        aria-label="Verdict"
        className="mt-8 w-full min-w-0 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6 shadow-md backdrop-blur-md"
      >
        <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          The verdict
        </h2>
        {guide.verdict.map((point, index) => (
          <p
            key={`verdict-${index}`}
            className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-white/65"
          >
            {point}
          </p>
        ))}
      </section>

      <div className="mt-8 grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_minmax(0,360px)]">
        <div className="w-full min-w-0 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-md backdrop-blur-md">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Audit your corridor, then invoice accordingly
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
            The calculation these guides describe — gross invoice, platform cut,
            correspondent deduction, real conversion and net landed — runs live
            for every corridor in the fee calculator. The Invoice Studio then
            renders the result as a contract-ready remittance clause so the
            client pays a number that has already priced the transit.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-150 ease-out hover:bg-emerald-500 active:scale-[0.99] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              Open the fee calculator
              <span aria-hidden="true" className="opacity-70">
                →
              </span>
            </Link>
            <Link
              href="/invoice/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-2.5 text-sm font-bold text-slate-200 transition-colors duration-150 ease-out hover:bg-slate-800"
            >
              Build a remittance-transparent invoice
            </Link>
          </div>
        </div>

        <GuideRecommendationCard guide={guide} />
      </div>

      {related.length > 0 && (
        <nav
          aria-label="Related comparison guides"
          className="mt-10 w-full min-w-0 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-md backdrop-blur-md"
        >
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Continue reading
          </h2>
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/compare/${item.slug}/`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors duration-150 ease-out hover:text-emerald-300"
                >
                  <span aria-hidden="true" className="opacity-60">
                    →
                  </span>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}