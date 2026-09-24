import type { Metadata } from "next";
import Link from "next/link";

import { EDITORIAL_GUIDES } from "@/data/editorialGuides";
import { SITE_URL, serializeSchemaGraph } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Comparison Guides — SWIFT vs Wise, SHA vs OUR, Bank Wire vs Payoneer",
  description:
    "Editorial cost comparisons for international contractors: real SWIFT transit deductions, SHA vs OUR wire charges, and the true all-in cost of direct bank wires versus Payoneer withdrawals.",
  alternates: { canonical: "/compare/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/compare/`,
    siteName: "PayoutDelta",
    title: "Comparison Guides — PayoutDelta",
    description:
      "High-intent editorial guides on the real cost of cross-border payout rails: SWIFT transit deductions, SHA vs OUR field 71A charges, and bank wire versus Payoneer withdrawals.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Comparison Guides — PayoutDelta",
    description:
      "Editorial cost comparisons for international contractors: SWIFT transit deductions, SHA vs OUR, and bank wire versus Payoneer.",
  },
};

const breadcrumbLd = {
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
      name: "Comparison Guides",
      item: `${SITE_URL}/compare/`,
    },
  ],
};

const guideListLd = {
  "@type": "ItemList",
  name: "PayoutDelta Editorial Comparison Guides",
  numberOfItems: EDITORIAL_GUIDES.length,
  itemListElement: EDITORIAL_GUIDES.map((guide, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: guide.title,
    url: `${SITE_URL}/compare/${guide.slug}/`,
  })),
};

/** Formats "2026-09-24" as a compact "24 Sep 2026" editorial date. */
function formatGuideDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[(month ?? 1) - 1]} ${year}`;
}

export default function CompareGuidesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeSchemaGraph([breadcrumbLd, guideListLd]),
        }}
      />

      <p className="text-sm font-medium text-slate-500 dark:text-white/50">
        Editorial · {EDITORIAL_GUIDES.length} comparison guides · updated{" "}
        {formatGuideDate("2026-09-24")}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        Comparison Guides
      </h1>
      <p className="mt-2 max-w-3xl leading-relaxed text-slate-600 dark:text-white/60">
        The rails a foreign invoice actually crosses do not appear on the
        client&apos;s PDF. These guides quantify the hidden layers — correspondent
        SHA hops, retail FX spreads, withdrawal fees and conversion markups —
        and reckon each pair down to a single all-in number you can verify in
        the calculator.
      </p>

      <div className="mt-8 grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        {EDITORIAL_GUIDES.map((guide) => (
          <article
            key={guide.slug}
            className="flex w-full min-w-0 flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-md backdrop-blur-md transition-colors duration-200 ease-out hover:border-emerald-500/40"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {guide.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-700/70 bg-slate-800/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h2 className="mt-4 text-base font-bold leading-snug tracking-tight text-slate-900 dark:text-white">
              <Link
                href={`/compare/${guide.slug}/`}
                className="transition-colors duration-200 ease-out hover:text-emerald-400"
              >
                {guide.title}
              </Link>
            </h2>

            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-white/55">
              {guide.metaDescription}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {guide.optionA.shortLabel}
                </span>
                <span className="mt-1 font-mono text-sm font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                  {guide.quickMetrics[0].optionA}
                </span>
              </div>
              <div className="flex flex-col rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                  {guide.optionB.shortLabel}
                </span>
                <span className="mt-1 font-mono text-sm font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
                  {guide.quickMetrics[0].optionB}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/60 pt-4">
              <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-white/40">
                {guide.readingTimeMinutes} min read · updated{" "}
                {formatGuideDate(guide.updatedAt)}
              </span>
              <Link
                href={`/compare/${guide.slug}/`}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-emerald-400 transition-colors duration-150 ease-out hover:text-emerald-300"
                aria-label={`Read ${guide.title}`}
              >
                Read guide
                <span aria-hidden="true" className="opacity-60">
                  →
                </span>
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex w-full flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-md backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-white/60">
          Every figure in these guides mirrors the audited fee dataset behind
          the calculator — benchmark the exact corridor your client pays from
          before you choose a rail.
        </p>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-150 ease-out hover:bg-emerald-500 active:scale-[0.99] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
        >
          Open the fee calculator
          <span aria-hidden="true" className="opacity-70">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}