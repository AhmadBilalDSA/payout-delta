import type { Metadata } from "next";
import Link from "next/link";
import {
  BREADCRUMB_ORIGIN,
  SITE_URL,
  buildDatasetSchema,
  serializeSchemaGraph,
} from "@/lib/seoSchemas";
import { getCorridors, getDataset } from "@/lib/db";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import CodeSnippetTabs, {
  type SnippetLang,
} from "@/components/developers/CodeSnippetTabs";

export const metadata: Metadata = {
  title: "Open Developer Data Hub & API Documentation",
  description:
    "Zero-dependency open index of 50 freelance payout corridors, correspondent SWIFT BICs, retail FX spreads, and statutory export tax codes — with copyable cURL, TypeScript and Python access to the fees.json feed.",
  alternates: {
    canonical: `${BREADCRUMB_ORIGIN}/developers/`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/developers/`,
    siteName: "PayoutDelta",
    title: "Open Developer Data Hub & API Documentation",
    description:
      "The versioned fees.json feed, llms-full.txt manifest and developer schema for 50 cross-border payout corridors.",
  },
};

const FEED_URL = `${SITE_URL}/api/fees.json`;
const MANIFEST_URL = `${SITE_URL}/llms-full.txt`;

const CODE_SAMPLES: Record<SnippetLang, string> = {
  curl: `curl -s ${SITE_URL}/api/fees.json`,
  ts: `const response = await fetch(
  "${SITE_URL}/api/fees.json",
);
const dataset = await response.json();

const pkr = dataset.corridors.find(
  (corridor) => corridor.slug === "usd-to-pkr",
);
console.log(pkr.rate); // 277.425913
console.log(pkr.country); // Pakistan`,
  python: `import requests

dataset = requests.get(
    "${SITE_URL}/api/fees.json",
    timeout=15,
).json()

pkr = next(
    corridor
    for corridor in dataset["corridors"]
    if corridor["slug"] == "usd-to-pkr"
)
print(pkr["rate"])  # 277.425913
print(pkr["country"])  # Pakistan`,
};

interface SchemaRow {
  field: string;
  type: string;
  description: string;
  example: string;
}

function buildSchemaRows(): SchemaRow[] {
  const corridor = getCorridors()[0];
  const regulation = getRegulatoryBanking(corridor.slug);
  const sourceBank = regulation.banks[0];
  const intermediaryUSD =
    regulation.defaultIntermediaryCut ?? sourceBank?.intermediaryUSD ?? 15;
  const purposeCode = regulation.generic
    ? "Benchmark (not statutory)"
    : (regulation.tiers[0]?.purposeCode ?? "—");

  return [
    {
      field: "slug",
      type: "string",
      description: "Canonical corridor route id used in URLs and lookups.",
      example: corridor.slug,
    },
    {
      field: "baseCurrency",
      type: "string · ISO 4217",
      description: "Source settlement currency of the payout.",
      example: corridor.from,
    },
    {
      field: "targetCurrency",
      type: "string · ISO 4217",
      description: "Destination local currency received by the freelancer.",
      example: corridor.to,
    },
    {
      field: "baseRate",
      type: "number",
      description:
        "Reference mid-market rate: 1 `baseCurrency` → `targetCurrency`.",
      example: String(corridor.rate),
    },
    {
      field: "intermediaryUSD",
      type: "number · USD",
      description:
        "Benchmark SHA intermediary correspondent SWIFT deduction on an inbound wire.",
      example: String(intermediaryUSD),
    },
    {
      field: "swiftCode",
      type: "string · ISO 9362",
      description: "Recipient bank SWIFT / BIC identifier (8–11 chars).",
      example: sourceBank?.swiftCode ?? "—",
    },
    {
      field: "purposeCode",
      type: "string",
      description:
        "Statutory export / remittance purpose code from the first tax tier (composed as `SBP 9111` on the manifest).",
      example: purposeCode,
    },
  ];
}

export default function DevelopersPage() {
  const dataset = getDataset();
  const rows = buildSchemaRows();
  const updatedAt = dataset.updatedAt.slice(0, 10);

  const datasetSchema = serializeSchemaGraph([
    buildDatasetSchema({ dataset, feedUrl: FEED_URL, manifestUrl: MANIFEST_URL }),
  ]);

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: datasetSchema }}
      />

      {/* ── Hero & value proposition ─────────────────────────────────── */}
      <header>
        <p className="text-sm font-medium text-emerald-500 dark:text-emerald-400">
          PayoutDelta · Open Developer Data Hub
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Open Cross-Border Banking &amp; Remittance Dataset
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-slate-600 dark:text-white/60">
          A zero-dependency open index of 50 freelance payout corridors,
          correspondent SWIFT BICs, retail FX spreads, and statutory export tax
          codes. Published as static files from this website&apos;s own export —
          no API key, no CORS preflight, no cloud bill.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/api/fees.json"
            download="fees.json"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 ease-out hover:bg-emerald-700"
          >
            <span aria-hidden="true">⬇</span>
            Download fees.json
          </Link>
          <Link
            href="/llms-full.txt"
            download="llms-full.txt"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors duration-150 ease-out hover:border-emerald-500/60 hover:text-emerald-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:text-emerald-300"
          >
            <span aria-hidden="true">⬇</span>
            Download llms-full.txt
          </Link>
        </div>
        <p className="mt-3 text-xs tabular-nums text-slate-500 dark:text-white/40">
          Dataset revision {updatedAt} · {dataset.corridors.length} corridors ·{" "}
          {dataset.platforms.length} platforms · {dataset.channels.length} rails
          · MIT / Open Data
        </p>
      </header>

      {/* ── Interactive code snippet tabs ────────────────────────────── */}
      <section aria-labelledby="quickstart-heading" className="mt-10">
        <h2
          id="quickstart-heading"
          className="text-lg font-bold text-slate-900 dark:text-white"
        >
          Pull the feed in 3 lines
        </h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-slate-600 dark:text-white/60">
          The corridor payload is a plain JSON file served straight from the
          static export — fetch it with any HTTP client and filter by corridor{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">
            slug
          </code>
          .
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-slate-900 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Fetch corridor data
            </span>
            <code className="break-all rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 dark:bg-white/[0.12] dark:text-white/70">
              GET {FEED_URL}
            </code>
          </div>
          <div className="mt-4">
            <CodeSnippetTabs samples={CODE_SAMPLES} label="Fetch corridor data" />
          </div>
        </div>
      </section>

      {/* ── Schema specification table ───────────────────────────────── */}
      <section aria-labelledby="schema-heading" className="mt-12">
        <h2
          id="schema-heading"
          className="text-lg font-bold text-slate-900 dark:text-white"
        >
          Corridor schema
        </h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-slate-600 dark:text-white/60">
          Each corridor record merges the feed&apos;s native fields (the JSON
          carries <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">from</code> /{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">to</code> /{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">rate</code>{" "}
          aliases) with the statutory bank database. The canonical developer
          contract below is documented with live values from{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">
            usd-to-pkr
          </code>
          .
        </p>

        <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08]">
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse bg-white text-left dark:bg-slate-900">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.08]">
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40"
                  >
                    Attribute
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40"
                  >
                    Example
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.field}
                    className="border-b border-slate-100 last:border-b-0 dark:border-white/[0.06]"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.field}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-white/50">
                      {row.type}
                    </td>
                    <td className="px-4 py-3 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                      {row.description}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">
                      {row.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/50">
            Figures are informational benchmarks compiled from public rate
            cards — the actual intermediary deduction lands on the beneficiary
            bank&apos;s credit advice. Nothing here is financial, tax or legal
            advice.
          </p>
        </div>
      </section>

      {/* ── Licensing & provenance ───────────────────────────────────── */}
      <section aria-labelledby="license-heading" className="mt-12">
        <h2
          id="license-heading"
          className="text-lg font-bold text-slate-900 dark:text-white"
        >
          License &amp; provenance
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-slate-900">
            <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              MIT
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              Open Data license
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-white/50">
              The dataset, schema and API documentation are released under the
              MIT license and the Open Definition — free to share, remix and
              cite commercially.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-slate-900">
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
              CORS *
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              Read from anywhere
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-white/50">
              Plain static files: no key, no preflight, no proxy. Fetch from a
              dashboard, spreadsheet sync or CI job and pin to the{" "}
              <code className="font-mono">updatedAt</code> revision.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-slate-900">
            <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              0
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              Server-side tracking
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-white/50">
              PayoutDelta publishes the feed from its own static export. No
              telemetry, no query logging — the bytes you download are the only
              bytes that move.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-white/50">
          Publisher: PayoutDelta ·{" "}
          <a
            href="https://github.com/AhmadBilalDSA/payout-delta"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-white"
          >
            GitHub repository
          </a>{" "}
          · source feed regenerated on every deploy via{" "}
          <code className="font-mono">npm run prebuild</code>.
        </p>
      </section>
    </article>
  );
}