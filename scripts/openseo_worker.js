/**
 * Cloudflare Worker — PayoutDelta OpenSEO rank monitor (Phase F).
 *
 * Autonomously tracks the static site's programmatic SEO footprint: each run
 * re-fetches the top 20 target "calculator" queries against a Google SERP API
 * and records where `ahmadbilaldsa.github.io/payout-delta` is ranked.
 *
 * Free-tier friendly:
 *
 *   - No KV, no D1, no external npm deps — a plain ES module.
 *   - A GET to the worker returns the latest full summary as JSON; that same
 *     document is what ops curl and commit as `public/seo_rankings.json` so the
 *     GitHub Pages export always carries transparent rank stats offline.
 *   - A `scheduled` trigger (see the `[triggers]` block below) keeps the worker
 *     warm and logs each run; the static mirror only syncs when intentionally
 *     refreshed.
 *
 * Secrets: the Google SERP key is passed via a Worker secret `SERP_API_KEY`.
 * When unset the worker degrades to a well-formed "degraded" report instead of
 * throwing, so the fallback mirror stays valid with 0 dependency.
 *
 * Deploy:
 *   npx wrangler dev scripts/openseo_worker.js
 *   npx wrangler secret put SERP_API_KEY
 *   npx wrangler deploy scripts/openseo_worker.js --name payoutdelta-openseo
 *
 * Cron (wrangler.toml):
 *   name = "payoutdelta-openseo"
 *   main = "scripts/openseo_worker.js"
 *   compatibility_date = "2024-01-01"
 *   [triggers]
 *   crons = ["0 0,6,12,18 * * *"]
 */

const TARGET_HOST = "ahmadbilaldsa.github.io";
const TARGET_PATH_PREFIX = "/payout-delta";

/** Top 20 programmatic search queries the static export is built to win. */
const TOP_20_QUERIES = [
  "upwork usd to pkr fee calculator",
  "cheapest transfer usd to pkr freelance",
  "upwork usd to inr fee calculator",
  "cheapest transfer usd to inr freelance",
  "fiverr usd to pkr withdrawal fee calculator",
  "fiverr usd to inr withdrawal fee calculator",
  "deel usd to pkr payout fee calculator",
  "deel usd to inr payout fee calculator",
  "upwork wise vs payoneer fee comparison",
  "fiverr wise vs payoneer fee comparison",
  "usd to pkr bank wire intermediary fee calculator",
  "usd to pkr freelancer payout calculator",
  "usd to inr freelancer payout calculator",
  "usd to php freelance payment fee calculator",
  "usd to ngn freelancing withdrawal fee calculator",
  "best way to receive upwork payments in pakistan",
  "best way to receive upwork payments in india",
  "payout calculator upwork $500 transfer fees",
  "remittance cost comparison usd to pkr 2026",
  "cross-border payout audit calculator freelance",
].map((query) => query.toLowerCase());

/**
 * Normalizes an organic-result URL to a comparable host+path-prefix pair so
 * `/payout-delta/…` sub-paths (invoice routes, corridor slugs) all match the
 * site's footprint rather than only the bare homepage.
 */
function matchesTarget(link) {
  try {
    const url = new URL(link);
    if (url.hostname.replace(/^www\./, "") !== TARGET_HOST.replace(/^www\./, "")) {
      return false;
    }
    const path = url.pathname === "" ? "/" : url.pathname;
    return (
      path === TARGET_PATH_PREFIX || path.startsWith(`${TARGET_PATH_PREFIX}/`)
    );
  } catch {
    return false;
  }
}

/** Finds the 1-based Google organic rank for the target, or null. */
export function extractRank(serpPayload) {
  const results = Array.isArray(serpPayload?.organic_results)
    ? serpPayload.organic_results
    : [];
  for (let index = 0; index < results.length; index += 1) {
    if (matchesTarget(results[index]?.link ?? "")) {
      return index + 1;
    }
  }
  return null;
}

/**
 * Runs the full 20-query sweep against the configured SERP endpoint with a
 * small concurrency cap (cheap parity with free-tier CPU minutes / burst CPU).
 * Missing SERP_API_KEY produces a "degraded" but structurally identical report.
 */
export async function runMonitor(env) {
  const endpoint = env?.SERP_API_URL ?? "https://api.serpapi.com/search";
  const apiKey = env?.SERP_API_KEY ?? "";

  const generatedAt = new Date().toISOString();
  const sweeps = [];

  const ranks = [];
  const queues = [];

  const fetchOne = async (query) => {
    try {
      const url = new URL(endpoint);
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", query);
      url.searchParams.set("location", "United States");
      url.searchParams.set("gl", "us");
      url.searchParams.set("hl", "en");
      url.searchParams.set("num", "20");
      if (apiKey) {
        url.searchParams.set("api_key", apiKey);
      }
      const response = await fetch(url.toString(), {
        headers: apiKey
          ? { Authorization: `Bearer ${apiKey}` }
          : {},
      });
      if (!response.ok) {
        throw new Error(`SERP HTTP ${response.status}`);
      }
      const payload = await response.json();
      const rank = extractRank(payload);
      ranks.push({ query, rank });
    } catch (error) {
      ranks.push({
        query,
        rank: null,
        error: apiKey ? error.message : "SERP_API_KEY not configured",
      });
    }
    sweeps.push(query);
  };

  // Run in waves of 4 so a 20-query sweep finishes in ~5 wall-clock requests,
  // comfortably inside the free-tier request CPU budget.
  for (let i = 0; i < TOP_20_QUERIES.length; i += 4) {
    queues.push(
      TOP_20_QUERIES.slice(i, i + 4).map((query) => fetchOne(query))
    );
    await Promise.all(queues.pop());
  }

  const ranked = ranks.filter((entry) => entry.rank !== null);
  const inTopTen = ranked.filter((entry) => entry.rank <= 10);
  const bestRank =
    ranked.length > 0
      ? Math.min(...ranked.map((entry) => entry.rank))
      : null;
  const avgRank =
    ranked.length > 0
      ? ranked.reduce((sum, entry) => sum + entry.rank, 0) / ranked.length
      : null;
  const weightedScore =
    ranked.length > 0
      ? ranked
          .filter((entry) => entry.rank <= 10)
          .reduce((sum, entry) => sum + (11 - entry.rank), 0)
      : 0;

  return {
    mode: apiKey ? "live" : "degraded",
    generatedAt,
    targetDomain: `${TARGET_HOST}${TARGET_PATH_PREFIX}`,
    meta: {
      serpEndpoint: endpoint,
      totalQueries: TOP_20_QUERIES.length,
      concurrency: 4,
      queryCount: sweeps.length,
    },
    summary: {
      rankedQueries: ranked.length,
      queriesInTopTen: inTopTen.length,
      bestRank,
      avgRank: avgRank === null ? null : Number(avgRank.toFixed(1)),
      weightedScore: Number(weightedScore.toFixed(4)),
    },
    rankings: ranks.sort((a, b) => a.query.localeCompare(b.query)),
    note: apiKey
      ? "Live SERP sweep — curl this worker and commit the JSON as public/seo_rankings.json to refresh the static mirror."
      : "Degraded mode: set the SERP_API_KEY worker secret, or keep the committed mock in public/seo_rankings.json.",
  };
}

const worker = {
  /** GET / → the freshest full OpenSEO summary as pretty JSON. */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/") {
      return new Response("OpenSEO monitor — GET / returns the rankings JSON.", {
        status: 400,
      });
    }
    const summary = await runMonitor(env);
    return new Response(JSON.stringify(summary, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },

  /** Cron → sweep and log; the static mirror is refreshed on demand. */
  async scheduled(controller, env) {
    const summary = await runMonitor(env);
    console.log(
      `[OpenSEO] mode=${summary.mode} ranked=${summary.summary.rankedQueries}/` +
        `${summary.meta.totalQueries} topTen=${summary.summary.queriesInTopTen} ` +
        `best=${summary.summary.bestRank ?? "—"} avg=${summary.summary.avgRank ?? "—"}`
    );
  },
};

export default worker;