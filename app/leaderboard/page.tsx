import type { Metadata } from "next";
import Link from "next/link";

import LeaderboardShareCard from "@/components/LeaderboardShareCard";
import { getChannels, getCorridors, getPlatforms } from "@/lib/db";
import { quoteAllChannels } from "@/utils/calculateRoute";

const SITE_URL = "https://payoutdelta.com";

export const metadata: Metadata = {
  title: "The Global Cross-Border Banking Leakage Index (2026)",
  description:
    "Comparing traditional correspondent wire deductions and hidden exchange rate markups across 50 international contractor markets.",
  alternates: {
    canonical: "/leaderboard/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/leaderboard/`,
    siteName: "PayoutDelta",
    title: "The Global Cross-Border Banking Leakage Index (2026)",
    description:
      "Ranking 50 contractor markets by the hidden bank wire penalty and FX markup — and what modern digital rails save you on each.",
  },
};

const webApplicationLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PayoutDelta — Global Cross-Border Banking Leakage Index (2026)",
  operatingSystem: "Web (React, static export)",
  applicationCategory: "FinanceApplication",
  url: `${SITE_URL}/leaderboard/`,
  description:
    "Ranked comparison of typical traditional-bank wire deductions and hidden FX markups across 50 international contractor markets, with the best digital rail and savings percentage per corridor.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
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
      name: "Global Cross-Border Banking Leakage Index",
      item: `${SITE_URL}/leaderboard/`,
    },
  ],
};

interface LeaderboardRow {
  rank: number;
  slug: string;
  country: string;
  currency: string;
  /** USD leakage at $1,000 gross vs the cheapest digital rail. */
  penaltyUsd: number;
  /** Name of the cheapest digital rail on the corridor. */
  bestRail: string;
  /** penaltyUsd as a percentage of the $1,000 base. */
  savingsPct: number;
}

const BENCHMARK_GROSS_USD = 1000;

/**
 * Builds the ranked leakage index at build time.
 *
 * Every corridor is quoted at a $1,000 gross direct invoice (0% platform
 * cut — the pure banking-layer comparison). "Typical Bank Wire Penalty" is
 * the USD-equivalent of the local-currency shortfall between the traditional
 * SWIFT wire and the best digital rail, recomputed through the winner's
 * effective rate so the index and the calculator verdicts agree exactly.
 */
function buildLeaderboard(): LeaderboardRow[] {
  const channels = getChannels();
  const platforms = getPlatforms();
  const direct = platforms.find((item) => item.id === "direct") ?? platforms[0];

  const rows = getCorridors()
    .map((corridor) => {
      const quotes = quoteAllChannels(
        BENCHMARK_GROSS_USD,
        direct,
        corridor,
        channels
      );
      const best = quotes[0];
      const swiftQuote = quotes.find((quote) => quote.channelId === "swift");
      if (!best || !swiftQuote) {
        return null;
      }
      const penaltyUsd =
        best.effectiveRate > 0 &&
        best.localAmount > swiftQuote.localAmount
          ? (best.localAmount - swiftQuote.localAmount) / best.effectiveRate
          : 0;
      return {
        slug: corridor.slug,
        country: corridor.country,
        currency: corridor.to,
        penaltyUsd,
        bestRail: best.channelName,
        savingsPct: (penaltyUsd / BENCHMARK_GROSS_USD) * 100,
      };
    })
    .filter((row): row is LeaderboardRow => row !== null);

  return rows
    .sort((a, b) => b.penaltyUsd - a.penaltyUsd)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function formatPenalty(value: number): string {
  if (!Number.isFinite(value)) {
    return "$0";
  }
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export default function LeaderboardPage() {
  const rows = buildLeaderboard();
  const worst = rows[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c"),
        }}
      />

      <p className="text-sm font-medium text-slate-500 dark:text-white/50">
        Leakage index · 50 international contractor markets ·{" "}
        {rows.length} corridors ranked
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        The Global Cross-Border Banking Leakage Index (2026)
      </h1>
      <p className="mt-2 max-w-3xl leading-relaxed text-slate-600 dark:text-white/60">
        Comparing traditional correspondent wire deductions and hidden exchange
        rate markups across 50 international contractor markets.
      </p>

      <div className="mt-6 flex w-full min-w-0 flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 min-w-0 flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-md backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Average retail bank spread
          </p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-amber-300">
            3.8%
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            typical correspondent wire + FX markup on a $1,000 payout.
          </p>
        </div>
        <div className="flex flex-1 min-w-0 flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-md backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Modern digital rails
          </p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-emerald-300">
            0.45%
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            aggregate spread on regulated money-transfer rails like Wise.
          </p>
        </div>
        <div className="flex flex-1 min-w-0 flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-md backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Worst corridor penalty
          </p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-white">
            {worst ? formatPenalty(worst.penaltyUsd) : "—"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            on $1,000 to{" "}
            {worst ? `${worst.country} (${worst.currency})` : "your lock"}.
          </p>
        </div>
      </div>

      <div className="mt-8 w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-md backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-semibold uppercase tracking-widest text-white/40">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Country &amp; Currency</th>
                <th className="px-4 py-3">
                  Typical Bank Wire Penalty ($ on $1k)
                </th>
                <th className="px-4 py-3">Best Digital Rail</th>
                <th className="px-4 py-3">Savings %</th>
                <th className="px-4 py-3">Direct Audit Link</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.slug}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-mono tabular-nums text-white/70">
                    #{row.rank}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{row.country}</p>
                    <p className="font-mono text-xs tabular-nums text-white/45">
                      {row.currency}
                    </p>
                  </td>
                  <td
                    className={`px-4 py-3 font-mono font-bold tabular-nums ${
                      row.rank <= 10
                        ? "text-amber-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {formatPenalty(row.penaltyUsd)}
                  </td>
                  <td className="px-4 py-3 text-white/80">{row.bestRail}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-white/60">
                    {row.savingsPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/calculator/${row.slug}/`}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-emerald-400 transition-colors duration-150 ease-out hover:text-emerald-300"
                    >
                      Audit {row.slug.replace("usd-to-", "").toUpperCase()}
                      <span aria-hidden="true" className="opacity-60">
                        →
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="w-full min-w-0 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-md backdrop-blur-md">
          <h2 className="text-base font-bold tracking-tight text-white">
            How the index is computed
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Each corridor is quoted at a $1,000 gross direct invoice with a 0%
            platform cut — isolating the pure banking layer. The “bank wire
            penalty” is the USD-equivalent shortfall between a traditional SWIFT
            wire (flat $45 fee + 3.5% FX markup) and the cheapest digital rail
            on that corridor, recomputed through the winner&apos;s effective
            rate, so the index numbers match the live calculator verdicts
            exactly.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/40">
            Figures are indicative public benchmarks compiled from merchant and
            commercial rate cards — not quotes or guaranteed mid-market rates.
            Confirm live rates and fees with your provider before transacting.
          </p>
        </div>
        <LeaderboardShareCard />
      </div>
    </div>
  );
}