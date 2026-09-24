#!/usr/bin/env node
/**
 * PayoutDelta — IndexNow ping (Milestone 3, AEO).
 *
 * Notifies the IndexNow endpoint (Bing / Yandex / Seznam et al.) that the
 * static export changed, so the fresh pages get re-crawled promptly instead of
 * waiting for the next natural discovery cycle. The URL list is derived from
 * the same sources of truth the site builds from — `data/fees.json` base
 * corridors, `data/corridors.ts` programmatic long-tail routes and the
 * documented localized sub-paths — so the ping can never drift from the routes
 * that actually exist.
 *
 * The canonical host is `payoutdelta.com`, matching the sitemap / canonicals /
 * robots rules. Key hygiene: `public/indexnow-key.txt` holds the shared key,
 * and the key verification file is served verbatim as `public/<key>.txt`
 * (https://payoutdelta.com/<key>.txt) so search engines can confirm ownership.
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
const SITE_URL = "https://payoutdelta.com";
const HOST = "payoutdelta.com";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_TIMEOUT_MS = 15000;

/** Trailing slashes mirror the `trailingSlash: true` canonicals in the sitemap. */
const STATIC_PATHS = [
  "/",
  "/about/",
  "/api-access/",
  "/contact/",
  "/disclaimer/",
  "/invoice/",
  "/leaderboard/",
  "/privacy-policy/",
  "/swift-auditor/",
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

/** All static-export paths, exactly as the build emits them (153 URLs today). */
function derivePaths() {
  const fees = JSON.parse(readFileSync(join(ROOT, "data", "fees.json"), "utf8"));
  const corridorsSource = readFileSync(join(ROOT, "data", "corridors.ts"), "utf8");
  const longTailSlugs = [
    ...corridorsSource.matchAll(/slug:\s*"([a-z0-9-]+)"/g),
  ].map((match) => match[1]);
  const corridorPaths = [
    ...fees.corridors.map((corridor) => `/calculator/${corridor.slug}/`),
    ...longTailSlugs.map((slug) => `/calculator/${slug}/`),
  ];
  return [
    ...STATIC_PATHS,
    ...corridorPaths,
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
    host: HOST,
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
        `IndexNow: notified=${urlList.length} urls host=${HOST} status=${response.status}`
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