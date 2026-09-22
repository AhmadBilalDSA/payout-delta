/**
 * PayoutDelta Edge API — Cloudflare Worker "rate router".
 *
 * Phase 6 continuation of the Phase-2 `/api/v1/rates` stub (which can never
 * serve request-time data from the static export). This worker bundles the
 * same versioned `data/fees.json` snapshot the site is built from and exposes
 * it as a live, read-only API at the edge:
 *
 *   GET  /                       API index (endpoint map + rate-limit contract)
 *   GET  /health                 liveness probe
 *   GET  /v1/dataset             full revisioned fees dataset
 *   GET  /v1/corridors           corridor index
 *   GET  /v1/corridors/:slug     corridor audit (channel quotes + verdict)
 *   GET  /v1/rates               FIFO-style quote route (?corridor|?pair&gross&platform)
 *
 * Every IP is rate-limited with a sliding-window counter (60 req/min) keyed on
 * `cf-connecting-ip`. The counter lives in memory for this singleton worker;
 * production quotas should move to Workflows KV / the Cloudflare WAF once the
 * metered B2B tier ships.
 *
 * The quote math mirrors `utils/calculateRoute.ts` on the site so the API and
 * the browser calculator never disagree on an effective rate.
 */

import fees from "../../data/fees.json";
import { getRegulatoryBanking } from "../../data/regulatoryBanking";

interface Platform {
  id: string;
  name: string;
  feePercent: number;
  feeType: string;
}

interface Channel {
  id: string;
  name: string;
  fixedFeeUSD: number;
  fxSpread: number;
}

interface Corridor {
  slug: string;
  from: string;
  to: string;
  rate: number;
  country: string;
  countryCode: string;
  currencyName: string;
  currencySymbol: string;
}

interface FeesDataset {
  schemaVersion: number;
  dataset: string;
  updatedAt: string;
  description: string;
  disclaimer: string;
  currency: {
    base: string;
    symbol: string;
  };
  platforms: Platform[];
  channels: Channel[];
  corridors: Corridor[];
}

const dataset = fees as FeesDataset;

const MINUTE_MS = 60_000;
const REQUESTS_PER_MINUTE = 60;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

/** Sliding-window rate bucket per client IP (ts order preserved). */
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(request: Request):
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number } {
  const ip = request.headers.get("cf-connecting-ip") ?? "anonymous";
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => t > now - MINUTE_MS);
  if (hits.length >= REQUESTS_PER_MINUTE) {
    const retryAfter = Math.max(
      1,
      Math.ceil((hits[0] + MINUTE_MS - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return { allowed: true };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

function notFound(): Response {
  return json({ error: "not_found", message: "No route matches this path." }, 404);
}

function badRequest(message: string): Response {
  return json({ error: "bad_request", message }, 400);
}

// --- Quote math (mirror of utils/calculateRoute.ts) -------------------------

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function f2(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function quoteChannel(
  grossInput: number,
  platform: Platform,
  channel: Channel,
  corridor: Corridor,
) {
  const grossUSD = clampNumber(grossInput, 100, 100000, 1000);
  const platformFeeUSD = f2((grossUSD * platform.feePercent) / 100);
  const netAfterPlatformUSD = f2(grossUSD - platformFeeUSD);
  const feeDeductedUSD = Math.min(
    channel.fixedFeeUSD,
    Math.max(0, netAfterPlatformUSD),
  );
  const usdConverted = Math.max(0, netAfterPlatformUSD - feeDeductedUSD);
  const fxSpread = Math.max(0, channel.fxSpread);
  const effectiveRate = f2(corridor.rate * (1 - fxSpread));
  const localAmount = f2(usdConverted * effectiveRate);
  const fxLossUSD = f2(usdConverted * fxSpread);
  const totalCostUSD = f2(platformFeeUSD + feeDeductedUSD + fxLossUSD);
  const totalCostPercent = grossUSD > 0 ? (totalCostUSD / grossUSD) * 100 : 0;

  return {
    channelId: channel.id,
    channelName: channel.name,
    grossUSD,
    platformFeeUSD,
    netAfterPlatformUSD,
    feeDeductedUSD,
    usdConverted,
    effectiveRate,
    localAmount,
    totalCostUSD,
    totalCostPercent,
  };
}

function buildVerdict(quotes: ReturnType<typeof quoteChannel>[]) {
  if (quotes.length === 0) {
    return { best: null, worst: null, savingsLocal: 0, savingsUSD: 0 };
  }
  let best = quotes[0];
  let worst = quotes[0];
  for (const quote of quotes) {
    if (quote.localAmount > best.localAmount) best = quote;
    if (quote.localAmount < worst.localAmount) worst = quote;
  }
  const savingsLocal = f2(best.localAmount - worst.localAmount);
  const savingsUSD =
    best.effectiveRate > 0
      ? f2(savingsLocal / best.effectiveRate)
      : 0;
  return { best, worst, savingsLocal, savingsUSD };
}

interface CorridorAudit {
  corridor: {
    slug: string;
    from: string;
    to: string;
    rate: number;
    country: string;
    countryCode: string;
    currencyName: string;
    currencySymbol: string;
  };
  /** Phase 6 — statutory citation object for the corridor's regime. */
  statutory: {
    authority: string;
    clearingNetwork: string;
    citations: string[];
  };
  platform: { id: string; name: string; feePercent: number };
  grossUSD: number;
  quotes: ReturnType<typeof quoteChannel>[];
  verdict: ReturnType<typeof buildVerdict>;
}

function auditCorridor(
  corridor: Corridor,
  grossUSD: number,
  platformId: string,
): { ok: true; audit: CorridorAudit } | { ok: false; message: string } {
  const platform = dataset.platforms.find((p) => p.id === platformId);
  if (!platform) {
    return { ok: false, message: `Unknown platform "${platformId}".` };
  }
  const quotes = dataset.channels
    .map((channel) => quoteChannel(grossUSD, platform, channel, corridor))
    .sort((a, b) => b.localAmount - a.localAmount);
  return {
    ok: true,
    audit: {
      corridor: {
        slug: corridor.slug,
        from: corridor.from,
        to: corridor.to,
        rate: corridor.rate,
        country: corridor.country,
        countryCode: corridor.countryCode,
        currencyName: corridor.currencyName,
        currencySymbol: corridor.currencySymbol,
      },
      statutory: (() => {
        const regulation = getRegulatoryBanking(corridor.slug);
        return {
          authority: regulation.authority,
          clearingNetwork: regulation.clearingNetwork,
          citations: regulation.citations,
        };
      })(),
      platform: { id: platform.id, name: platform.name, feePercent: platform.feePercent },
      grossUSD: clampNumber(grossUSD, 100, 100000, 1000),
      quotes,
      verdict: buildVerdict(quotes),
    },
  };
}

// --- Router -----------------------------------------------------------------

const routeHandlers: Record<string, (request: Request, url: URL) => Response | null> = {
  "/": () =>
    json({
      name: "PayoutDelta Edge API",
      version: "v1",
      datasetRevision: dataset.updatedAt,
      baseUrl: "https://api.payoutdelta.com",
      rateLimit: { perMinute: REQUESTS_PER_MINUTE, scope: "per-ip" },
      endpoints: [
        "GET /health",
        "GET /v1/dataset",
        "GET /v1/corridors",
        "GET /v1/corridors/{slug}?gross=1000&platform=direct",
        "GET /v1/rates?corridor=usd-to-pkr&gross=1000&platform=direct",
        "GET /v1/rates?pair=USD-PKR&gross=1000&platform=upwork",
      ],
      docs: "https://payoutdelta.com/api-access",
    }),
  "/health": () => json({ status: "ok", ts: new Date().toISOString() }),
  "/v1/dataset": () => json(dataset),
  "/v1/corridors": () =>
    json({
      datasetRevision: dataset.updatedAt,
      corridors: dataset.corridors.map((corridor) => ({
        slug: corridor.slug,
        from: corridor.from,
        to: corridor.to,
        country: corridor.country,
        countryCode: corridor.countryCode,
        rate: corridor.rate,
      })),
    }),
  "/v1/rates": (_request, url) => {
    const corridorSlug = url.searchParams.get("corridor");
    const pair = url.searchParams.get("pair");
    let corridor = dataset.corridors.find((c) => c.slug === corridorSlug);
    if (!corridor && pair) {
      const [fromCode, toCode] = pair
        .split("-")
        .map((code) => code.trim().toUpperCase());
      corridor = dataset.corridors.find(
        (c) => c.from === fromCode && c.to === toCode
      );
    }
    if (!corridor) {
      return badRequest(
        'Missing or unknown "corridor" or "pair" query param. Try corridor=usd-to-pkr or pair=USD-PKR.',
      );
    }
    const gross = Number(url.searchParams.get("gross") ?? 1000);
    const platform = url.searchParams.get("platform") ?? "direct";
    const result = auditCorridor(corridor, gross, platform);
    if (!result.ok) {
      return badRequest(result.message);
    }
    return json({ datasetRevision: dataset.updatedAt, ...result.audit });
  },
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "GET") {
      return json({ error: "method_not_allowed", message: "Only GET is supported." }, 405);
    }

    const limited = checkRateLimit(request);
    if (!limited.allowed) {
      return json(
        {
          error: "rate_limited",
          message: `Rate limit of ${REQUESTS_PER_MINUTE} requests/minute reached. Retry shortly.`,
          retryAfterSeconds: limited.retryAfterSeconds,
        },
        429,
      );
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const segments = pathname.split("/").filter(Boolean);

    // Static path lookup first; exact matches beat the dynamic corridor route.
    const staticHandler = routeHandlers[pathname];
    if (staticHandler) {
      const handled = staticHandler(request, url);
      if (handled) return handled;
    }

    // GET /v1/corridors/:slug
    const corridorSlug = segments[0] === "v1" && segments[1] === "corridors" ? segments[2] : undefined;
    if (corridorSlug) {
      const corridor = dataset.corridors.find((c) => c.slug === corridorSlug);
      if (!corridor) {
        return json({ error: "not_found", message: `Unknown corridor "${corridorSlug}".` }, 404);
      }
      const gross = Number(url.searchParams.get("gross") ?? 1000);
      const platform = url.searchParams.get("platform") ?? "direct";
      const result = auditCorridor(corridor, gross, platform);
      if (!result.ok) {
        return badRequest(result.message);
      }
      return json({ datasetRevision: dataset.updatedAt, ...result.audit });
    }

    return notFound();
  },
};