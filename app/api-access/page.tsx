"use client";

import { useState } from "react";
import fees from "../../data/fees.json";

const API_BASE = "https://api.payoutdelta.com";
const FEED_URL = "https://ahmadbilaldsa.github.io/payout-delta/api/fees.json";
const RATES_URL = `${API_BASE}/v1/rates?pair=USD-PKR&gross=1000&platform=upwork`;

type EndpointKey = "rates" | "corridor" | "corridors" | "dataset" | "health";

const ENDPOINTS: { key: EndpointKey; label: string; method: string; path: string }[] = [
  { key: "rates", label: "Quote a corridor", method: "GET", path: "/v1/rates?corridor={slug}|pair={USD-PKR}&gross={gross}&platform={platform}" },
  { key: "corridor", label: "Corridor detail", method: "GET", path: "/v1/corridors/{slug}?gross={gross}&platform={platform}" },
  { key: "corridors", label: "Corridor index", method: "GET", path: "/v1/corridors" },
  { key: "dataset", label: "Full dataset", method: "GET", path: "/v1/dataset" },
  { key: "health", label: "Liveness", method: "GET", path: "/health" },
];

const LANGUAGE_TABS = [
  { key: "curl", label: "cURL" },
  { key: "ts", label: "TypeScript / Fetch" },
  { key: "python", label: "Python" },
] as const;
type CodeLang = (typeof LANGUAGE_TABS)[number]["key"];

const FEED_SAMPLES: Record<CodeLang, string> = {
  curl: `curl -s "${FEED_URL}" \\
  | jq '.corridors[] | select(.slug == "usd-to-pkr")'`,
  ts: `const url = "${FEED_URL}";
const data = await fetch(url).then((r) => r.json());

const pkr = data.corridors.find((c) => c.slug === "usd-to-pkr");
console.log(pkr.rate); // 277.425913
console.log(pkr.country); // Pakistan`,
  python: `from urllib.request import urlopen
import json

with urlopen("${FEED_URL}") as res:
    data = json.load(res)

pkr = next(c for c in data["corridors"] if c["slug"] == "usd-to-pkr")
print(pkr["rate"])  # 277.425913
print(pkr["country"])  # Pakistan`,
};

const RATES_SAMPLES: Record<CodeLang, string> = {
  curl: `curl -s "${RATES_URL}" | jq '.verdict, .statutory'`,
  ts: `const url = "${RATES_URL}";
const audit = await fetch(url).then((r) => r.json());

console.log(audit.verdict.best.channelName); // Wise
console.log(audit.verdict.savingsLocal); // 18837
console.log(audit.statutory.citations);`,
  python: `from urllib.request import urlopen
import json

with urlopen("${RATES_URL}") as res:
    audit = json.load(res)

best = audit["verdict"]["best"]
print(best["channelName"], "nets", best["localAmount"], "PKR")
print(audit["statutory"]["authority"])`,
};

/** Abridged but real `fees.json` — what the static feed returns for USD → PKR. */
const FEED_SCHEMA = `{
  "schemaVersion": 1,
  "dataset": "payoutdelta-fees",
  "updatedAt": "2026-09-22T12:40:57Z",
  "platforms": [
    { "id": "upwork", "name": "Upwork", "feePercent": 10 }
  ],
  "channels": [
    { "id": "swift", "name": "Direct SWIFT Wire", "fixedFeeUSD": 45, "fxSpread": 0.035 },
    { "id": "wise", "name": "Wise", "fixedFeeUSD": 2.99, "fxSpread": 0.0045 },
    { "id": "remitly", "name": "Remitly Economy", "fixedFeeUSD": 1.99, "fxSpread": 0.012 }
  ],
  "corridors": [
    {
      "slug": "usd-to-pkr",
      "from": "USD",
      "to": "PKR",
      "rate": 277.425913,
      "country": "Pakistan",
      "countryCode": "PK",
      "currencyName": "Pakistani Rupee",
      "currencySymbol": "Rs"
    }
  ]
}`;

/** What the edge worker returns for pair=USD-PKR&gross=1000&platform=upwork. */
const RATES_SCHEMA = `{
  "datasetRevision": "2026-09-22T12:40:57Z",
  "corridor": {
    "slug": "usd-to-pkr",
    "from": "USD",
    "to": "PKR",
    "rate": 277.425913,
    "country": "Pakistan",
    "countryCode": "PK",
    "currencyName": "Pakistani Rupee",
    "currencySymbol": "Rs"
  },
  "statutory": {
    "authority": "SBP Foreign Exchange Manual Chapter 13 & Income Tax Ordinance Section 154A",
    "clearingNetwork": "Raast / BEFTN",
    "citations": [
      "SBP Foreign Exchange Manual Ch. 13 · Section 154A ITO (PC 9111)",
      "PRC Purpose Code 9111 · PSEB 0.25% final tax"
    ]
  },
  "platform": { "id": "upwork", "name": "Upwork", "feePercent": 10 },
  "grossUSD": 1000,
  "quotes": [
    {
      "channelId": "wise",
      "channelName": "Wise",
      "grossUSD": 1000,
      "platformFeeUSD": 100,
      "feeDeductedUSD": 2.99,
      "effectiveRate": 276.177497,
      "localAmount": 247733.76
    },
    {
      "channelId": "swift",
      "channelName": "Direct SWIFT Wire",
      "grossUSD": 1000,
      "platformFeeUSD": 100,
      "feeDeductedUSD": 45,
      "effectiveRate": 267.716006,
      "localAmount": 228897.19
    }
  ],
  "verdict": {
    "best": { "channelId": "wise", "channelName": "Wise", "localAmount": 247733.76 },
    "worst": { "channelId": "swift", "channelName": "Direct SWIFT Wire", "localAmount": 228897.19 },
    "savingsLocal": 18836.57,
    "savingsUSD": 68.2
  }
}`;

interface RunResult {
  status: number;
  ms: number;
  body: string;
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-[#0B0B0F] p-4 font-mono text-xs leading-relaxed text-emerald-200">
      {code}
    </pre>
  );
}

function SchemaBlock({ schema }: { schema: string }) {
  return (
    <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-[#0B0B0F] p-4 font-mono text-xs leading-relaxed text-slate-200">
      {schema}
    </pre>
  );
}

export default function ApiAccessPage() {
  const [feedLang, setFeedLang] = useState<CodeLang>("curl");
  const [ratesLang, setRatesLang] = useState<CodeLang>("curl");
  const [endpoint, setEndpoint] = useState<EndpointKey>("rates");
  const [slug, setSlug] = useState(fees.corridors[0].slug);
  const [gross, setGross] = useState("1000");
  const [platform, setPlatform] = useState("direct");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsCorridor = endpoint === "rates" || endpoint === "corridor";
  const needsAmount = endpoint === "rates" || endpoint === "corridor";

  function buildUrl(): string {
    switch (endpoint) {
      case "rates":
        return `${API_BASE}/v1/rates?corridor=${encodeURIComponent(slug)}&gross=${encodeURIComponent(gross)}&platform=${encodeURIComponent(platform)}`;
      case "corridor":
        return `${API_BASE}/v1/corridors/${encodeURIComponent(slug)}?gross=${encodeURIComponent(gross)}&platform=${encodeURIComponent(platform)}`;
      case "corridors":
        return `${API_BASE}/v1/corridors`;
      case "dataset":
        return `${API_BASE}/v1/dataset`;
      case "health":
        return `${API_BASE}/health`;
    }
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    try {
      const response = await fetch(buildUrl(), {
        headers: { Accept: "application/json" },
      });
      const text = await response.text();
      let body: string;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        body = text;
      }
      setResult({
        status: response.status,
        ms: Math.round(performance.now() - started),
        body,
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Request failed to reach the edge API.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-slate-500 dark:text-white/50">
        PayoutDelta · Developer API
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        API reference & playground
      </h1>
      <p className="mt-2 max-w-3xl leading-relaxed text-slate-600 dark:text-white/60">
        Two ways to consume the fee dataset: the versioned <strong>static JSON
        feed</strong> served straight from the GitPages export, and the{" "}
        <strong>live edge worker</strong> that answers request-time corridor
        audits from the same snapshot. Both are read-only, CORS-open and
        rate-limited to 60 requests per minute per IP — no key required.
      </p>

      {/* ── Quick start: code snippets ─────────────────────────────────── */}
      <section aria-labelledby="quickstart-heading" className="mt-8">
        <h2 id="quickstart-heading" className="text-lg font-bold text-slate-900 dark:text-white">
          Quick start
        </h2>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Example 1 — static JSON feed */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#15151A]">
            <div className="border-b border-slate-200 p-4 dark:border-white/[0.08]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Static JSON feed
                </span>
                <span className="rounded bg-slate-700 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  GET
                </span>
              </div>
              <code className="mt-2 block break-all font-mono text-xs text-slate-500 dark:text-white/50">
                {FEED_URL}
              </code>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFeedLang(tab.key)}
                    aria-pressed={feedLang === tab.key}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      feedLang === tab.key
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.14]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <CodeBlock code={FEED_SAMPLES[feedLang]} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/40">
                Response schema — base rates & provider spreads
              </p>
              <SchemaBlock schema={FEED_SCHEMA} />
            </div>
          </div>

          {/* Example 2 — live edge worker */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#15151A]">
            <div className="border-b border-slate-200 p-4 dark:border-white/[0.08]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Edge worker audit
                </span>
                <span className="rounded bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  GET
                </span>
              </div>
              <code className="mt-2 block break-all font-mono text-xs text-slate-500 dark:text-white/50">
                {RATES_URL}
              </code>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRatesLang(tab.key)}
                    aria-pressed={ratesLang === tab.key}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      ratesLang === tab.key
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.14]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <CodeBlock code={RATES_SAMPLES[ratesLang]} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/40">
                Response schema — quotes, verdict & statutory citations
              </p>
              <SchemaBlock schema={RATES_SCHEMA} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Live playground ────────────────────────────────────────────── */}
      <section aria-labelledby="playground-heading" className="mt-10">
        <h2 id="playground-heading" className="text-lg font-bold text-slate-900 dark:text-white">
          Try it live
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Request builder */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#15151A]">
            <div className="flex flex-wrap gap-2">
              {ENDPOINTS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setEndpoint(item.key)}
                  aria-pressed={endpoint === item.key}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    endpoint === item.key
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.14]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 dark:bg-white/[0.06] dark:text-white/70">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">GET</span>{" "}
              {buildUrl()}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {needsCorridor && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                    Corridor
                  </span>
                  <select
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/[0.12] dark:bg-[#15151A] dark:text-white"
                  >
                    {fees.corridors.map((corridor) => (
                      <option key={corridor.slug} value={corridor.slug}>
                        {corridor.slug} · {corridor.country}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {needsAmount && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                    Gross USD
                  </span>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    step={50}
                    value={gross}
                    onChange={(event) => setGross(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/[0.12] dark:bg-[#15151A] dark:text-white"
                  />
                </label>
              )}

              {needsAmount && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                    Platform
                  </span>
                  <select
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/[0.12] dark:bg-[#15151A] dark:text-white"
                  >
                    {fees.platforms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Requesting…" : "Run request"}
            </button>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}

            {result && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-white/50">
                  HTTP {result.status} · {result.ms}ms
                </p>
                <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-[#0B0B0F] p-4 font-mono text-xs leading-relaxed text-emerald-200">
                  {result.body}
                </pre>
              </div>
            )}
          </div>

          {/* Documentation */}
          <section aria-labelledby="docs-heading">
            <h2 id="docs-heading" className="text-lg font-bold text-slate-900 dark:text-white">
              Endpoints
            </h2>
            <div className="mt-4 space-y-3">
              {ENDPOINTS.map((item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#15151A]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      {item.label}
                    </span>
                    <span className="rounded bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                      {item.method}
                    </span>
                  </div>
                  <code className="mt-2 block break-all font-mono text-xs text-slate-500 dark:text-white/50">
                    {item.path}
                  </code>
                  {item.key === "rates" && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-white/50">
                      Resolve the corridor by <code className="font-mono">corridor</code> slug
                      or the shorthand <code className="font-mono">pair</code> code (e.g.{" "}
                      <code className="font-mono">pair=USD-PKR</code>).
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#15151A]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contract</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-white/60">
                <li>Response shape: <code className="font-mono text-xs">quotes</code> sorted by best local amount first, with a <code className="font-mono text-xs">verdict</code> summarising the cheapest vs costliest channel.</li>
                <li>Every audit carries a <code className="font-mono text-xs">statutory</code> citation object (authority, clearing network, regulation references).</li>
                <li>Errors: <code className="font-mono text-xs">400</code> bad request, <code className="font-mono text-xs">404</code> unknown route/corridor, <code className="font-mono text-xs">405</code> non-GET, <code className="font-mono text-xs">429</code> rate limit.</li>
                <li>Every response carries the <code className="font-mono text-xs">datasetRevision</code> from the bundled snapshot.</li>
              </ul>
            </div>
          </section>
        </div>
      </section>

      {/* ── Developer SLA & policy ─────────────────────────────────────── */}
      <section aria-labelledby="sla-heading" className="mt-10">
        <h2 id="sla-heading" className="text-lg font-bold text-slate-900 dark:text-white">
          Developer SLA & policy
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15151A]">
            <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              60<small className="text-xs font-semibold">/min</small>
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              Sliding-window rate limit
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-white/50">
              Per IP, tracked in a 60-second sliding window on the worker. Excess
              requests return <code className="font-mono">429</code> with a{" "}
              <code className="font-mono">retryAfterSeconds</code> field.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15151A]">
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
              CORS *
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              Open cross-origin access
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-white/50">
              <code className="font-mono">Access-Control-Allow-Origin: *</code> — read from
              any dashboard, spreadsheet sync or CI job without a key or proxy.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#15151A]">
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
              0
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              Telemetry on your queries
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-white/50">
              The worker only counts requests for the rate limit — no analytics, no
              logging of query bodies, no personal data stored on any server.
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500 dark:border-white/[0.08] dark:bg-[#15151A] dark:text-white/50">
          The static feed at <code className="font-mono">{FEED_URL}</code> is regenerated
          from <code className="font-mono">data/fees.json</code> on every build
          (<code className="font-mono">npm run prebuild</code>) — versioned, cache-friendly
          and readable anywhere CORS-free static files are allowed.
        </p>
      </section>
    </article>
  );
}