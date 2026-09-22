import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why PayoutDelta exists, how the fee dataset is structured, and what Phase 1 ships.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        About PayoutDelta
      </h1>
      <p className="mt-4 leading-relaxed text-slate-700 dark:text-white/70">
        PayoutDelta answers one question for freelancers:{" "}
        <em>“after every fee, how much of my invoice actually lands in my local
        account?”</em> Most marketplaces show a headline commission and a
        withdrawal fee, but the full chain — platform cut, channel fixed fee,
        and the FX spread on conversion — is scattered across pages and PDFs.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">
        The dataset
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
        Phase 1 ships as a fully static site. The fee tables live in{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">
          data/fees.json
        </code>{" "}
        — a versioned, machine-readable snapshot of 35 corridors, 3 client
        platforms and 5 withdrawal channels, carrying an{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">
          updatedAt
        </code>{" "}
        revision so providers/rates can be re-synced on a schedule. Rates are
        indicative aggregates from public rate cards, never quotes.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">
        Privacy by architecture
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
        There is no server and no tracking. Every calculator calculation runs
        in your browser against the static bundle, so your payout amounts never
        leave the device. The only network touchpoints are the fonts and the
        ad placeholder, both third-party.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">
        Phase 2 roadmap
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700 dark:text-white/70">
        <li>Invoice PDF export and rate-drop email alerts (B2B tier)</li>
        <li>Embeddable calculator widget for agencies</li>
        <li>Scheduled crawler replacing the static snapshot (see{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">
            scripts/playwright_scraper.py
          </code>)
        </li>
        <li>Weekend-inflation warnings and multi-hop arbitrage routes</li>
      </ul>

      <p className="mt-8 text-sm text-slate-500 dark:text-white/50">
        PayoutDelta is informational tooling, not financial, tax or legal
        advice. See the{" "}
        <Link
          href="/disclaimer"
          className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-white"
        >
          disclaimer
        </Link>{" "}
        and{" "}
        <Link
          href="/terms-of-service"
          className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-white"
        >
          terms
        </Link>
        .
      </p>
    </article>
  );
}