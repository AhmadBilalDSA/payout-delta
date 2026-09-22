"use client";

import { useState } from "react";
import fees from "../../data/fees.json";

const API_BASE = "https://api.payoutdelta.com";

type EndpointKey = "rates" | "corridor" | "corridors" | "dataset" | "health";

const ENDPOINTS: { key: EndpointKey; label: string; method: string; path: string }[] = [
  { key: "rates", label: "Quote a corridor", method: "GET", path: "/v1/rates?corridor={slug}&gross={gross}&platform={platform}" },
  { key: "corridor", label: "Corridor detail", method: "GET", path: "/v1/corridors/{slug}?gross={gross}&platform={platform}" },
  { key: "corridors", label: "Corridor index", method: "GET", path: "/v1/corridors" },
  { key: "dataset", label: "Full dataset", method: "GET", path: "/v1/dataset" },
  { key: "health", label: "Liveness", method: "GET", path: "/health" },
];

interface RunResult {
  status: number;
  ms: number;
  body: string;
}

export default function ApiAccessPage() {
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
        API access & playground
      </h1>
      <p className="mt-2 max-w-3xl leading-relaxed text-slate-600 dark:text-white/60">
        The fee dataset ships read-only from the Cloudflare edge at{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">
          {API_BASE}
        </code>
        , rate-limited to 60 requests per minute per IP. No key required; all
        responses are JSON and CORS-open. Fold this into your own payout-fee
        dashboard, spreadsheet sync or Slack alert.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Request builder */}
        <section
          aria-labelledby="playground-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#15151A]"
        >
          <h2 id="playground-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            Try a request
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
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
        </section>

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
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#15151A]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contract</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-white/60">
              <li>Response shape: <code className="font-mono text-xs">quotes</code> sorted by best local amount first, with a <code className="font-mono text-xs">verdict</code> summarising the cheapest vs costliest channel.</li>
              <li>Errors: <code className="font-mono text-xs">400</code> bad request, <code className="font-mono text-xs">404</code> unknown route/corridor, <code className="font-mono text-xs">405</code> non-GET, <code className="font-mono text-xs">429</code> rate limit.</li>
              <li>Every response carries the <code className="font-mono text-xs">datasetRevision</code> from the bundled snapshot.</li>
            </ul>
          </div>
        </section>
      </div>
    </article>
  );
}