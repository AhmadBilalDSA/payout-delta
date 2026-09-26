#!/usr/bin/env node
/**
 * PayoutDelta — IndexNow ping (Milestone 3, AEO).
 *
 * Notifies the IndexNow endpoint (Bing / Yandex / Seznam et al.) that the
 * static export changed, so the fresh pages get re-crawled promptly instead of
 * waiting for the next natural discovery cycle. The URL list is derived from
 * the same sources of truth the site builds from — `data/fees.json` base
 * corridors (which also back the 50 `/embed/<slug>/` widget routes),
 * `data/corridors.ts` programmatic long-tail routes and the documented
 * localized sub-paths — so the ping can never drift from the routes that
 * actually exist.
 *
 * The host is resolved to the ACTIVE deployment: by default GitHub Pages at
 * `ahmadbilaldsa.github.io/payout-delta` (matching `basePath: "/payout-delta"`
 * in next.config.mjs while `USE_CUSTOM_DOMAIN` is false), so the submitted
 * URLs and the key verification file live under the same subpath the export
 * actually lands on. The IndexNow `host` field includes that subdirectory
 * (`ahmadbilaldsa.github.io/payout-delta`), which is exactly how the protocol
 * locates the `<key>.txt` verification file for sub-folder sites.
 *
 * Single-flag override: set `INDEXNOW_HOST` to the custom domain (e.g.
 * `payoutdelta.com`) once `USE_CUSTOM_DOMAIN` flips to true and the export
 * drops its basePath — the script then pings the root of that host instead.
 *
 * Key hygiene: `public/indexnow-key.txt` holds the shared key, and the key
 * verification file is served verbatim as `public/<key>.txt`
 * (https://ahmadbilaldsa.github.io/payout-delta/<key>.txt) so search engines
 * can confirm ownership.
 *
 * Running this is OPT-IN. It is not wired into `prebuild` (a local build should
 * not nuke a remote search cache). Run it on deployment:
 *     npm run indexnow
 *
 * It never exits non-zero: offline or 4xx/5xx responses only log a warning, so
 * telemetry can never take a deploy down.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_TIMEOUT_MS = 15000;

/** Active live host (override when the custom domain takes over the export). */
const INDEXNOW_HOST = String(
  process.env.INDEXNOW_HOST ?? "ahmadbilaldsa.github.io"
)
  .replace(/^https?:\/\//i, "")
  .replace(/\/+$/, "");
const isGitHubPages = INDEXNOW_HOST.toLowerCase().endsWith(".github.io");
const BASE_DIR = isGitHubPages ? "/payout-delta" : "";
const SITE_URL = `https://${INDEXNOW_HOST}${BASE_DIR}`;

/** Trailing slashes mirror the `trailingSlash: true` canonicals in the sitemap. */
const STATIC_PATHS = [
  "/",
  "/about/",
  "/agencies/",
  "/api-access/",
  "/banks/",
  "/compare/",
  "/compare/swift-wire-vs-wise-business/",
  "/compare/sha-vs-our-swift-charges/",
  "/compare/direct-bank-wire-vs-payoneer/",
  "/contact/",
  "/dashboard/",
  "/developers/",
  "/disclaimer/",
  "/invoice/",
  "/leaderboard/",
  "/privacy-policy/",
  "/swift-auditor/",
  "/tax-clearance/",
  "/tax-ledger/",
  "/terms-of-service/",
];

const LOCALIZED = [
  ["ur", "usd-to-pkr"],
  ["hi", "usd-to-inr"],
  ["fil", "usd-to-php"],
  ["es", "usd-to-eur"],
  ["pt", "usd-to-brl"],
];

/** All static-export paths, exactly as the build emits them (460+ URLs today). */
function derivePaths() {
  const fees = JSON.parse(readFileSync(join(ROOT, "data", "fees.json"), "utf8"));
  const corridorsSource = readFileSync(join(ROOT, "data", "corridors.ts"), "utf8");
  const banksSource = readFileSync(join(ROOT, "data", "banks.ts"), "utf8");
  const longTailSlugs = [
    ...corridorsSource.matchAll(/slug:\s*"([a-z0-9-]+)"/g),
  ].map((match) => match[1]);
  const bankSlugs = [...banksSource.matchAll(/slug:\s*"([a-z0-9-]+)"\s*,/g)].map(
    (match) => match[1]
  );
  const baseSlugs = fees.corridors.map((corridor) => corridor.slug);
  const corridorPaths = [
    ...baseSlugs.map((slug) => `/calculator/${slug}/`),
    ...longTailSlugs.map((slug) => `/calculator/${slug}/`),
  ];
  const embedPaths = baseSlugs.map((slug) => `/embed/${slug}/`);
  const bankPaths = bankSlugs.map((slug) => `/banks/${slug}/`);
  return [
    ...STATIC_PATHS,
    ...corridorPaths,
    ...bankPaths,
    ...embedPaths,
    ...LOCALIZED.map(([lang, slug]) => `/${lang}/calculator/${slug}/`),
  ];
}

async function main() {
  const keyPath = join(ROOT, "public", "indexnow-key.txt");
  const key = existsSync(keyPath)
    ? readFileSync(keyPath, "utf8").trim()
    : "";

  if (!/^[a-f0-9]{32}$/.test(key)) {
    console.warn(
      `IndexNow: no valid 32-hex key in public/indexnow-key.txt — skipping ping (offline-safe).`
    );
    return;
  }

  const verificationFile = join(ROOT, "public", `${key}.txt`);
  if (!existsSync(verificationFile)) {
    console.warn(
      `IndexNow: key verification file public/${key}.txt is missing — the endpoint may reject the ping.`
    );
  }

  const urlList = derivePaths().map((path) => `${SITE_URL}${path}`);
  const payload = {
    host: `${INDEXNOW_HOST}${BASE_DIR}`,
    key,
    keyLocation: `${SITE_URL}/${key}.txt`,
    urlList,
  };

  if (typeof globalThis.fetch !== "function") {
    console.warn(
      `IndexNow: fetch unavailable in this Node runtime — ${urlList.length} URLs left to notify.`
    );
    return;
  }

  try {
    const signal =
      typeof AbortSignal !== "undefined"
        ? AbortSignal.timeout(INDEXNOW_TIMEOUT_MS)
        : undefined;
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.ok) {
      console.log(
        `IndexNow: notified=${urlList.length} urls host=${INDEXNOW_HOST}${BASE_DIR} keyLocation=${payload.keyLocation} status=${response.status}`
      );
    } else {
      console.warn(
        `IndexNow: endpoint replied HTTP ${response.status} for ${urlList.length} URLs — not a build failure.`
      );
    }
  } catch (error) {
    console.warn(
      `IndexNow: ping failed (${error.message}) — offline-safe, continuing.`
    );
  }
}

main();