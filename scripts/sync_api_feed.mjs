/**
 * PayoutDelta — static API feed + offline registry sync (Phase 6).
 *
 * Copies the versioned registry snapshots from `data/` into `public/api/`, which
 * the static export mirrors verbatim into `out/api/`. That is the documented
 * "static JSON feed" endpoint
 * (https://ahmadbilaldsa.github.io/payout-delta/api/fees.json), so the file
 * the developer portal documents never drifts from the dataset the site is
 * built from.
 *
 * WHY ALL FOUR REGISTRIES, NOT JUST fees.json
 * `public/sw.js` precaches the four registries that back every audit on the
 * site. A service worker can only precache URLs the deployment actually serves,
 * and `data/*.json` is a build-time *source* directory — Next.js never copies it
 * into `out/`. Mirroring them here is what turns "precache the registries" from
 * a manifest of 404s into a working offline shell, and it costs no bundle
 * weight: the bytes are already in the repository and already in the prerendered
 * HTML; this only publishes them at a fetchable path.
 *
 *   data/fees.json            → public/api/fees.json            (~85 KB)
 *   data/jurisdictions.json   → public/api/jurisdictions.json   (~202 KB)
 *   data/rails.json           → public/api/rails.json           (~25 KB)
 *   data/banksRegistry.json   → public/api/banksRegistry.json   (~80 KB)
 *
 * `data/history.json` is deliberately *not* mirrored: it is a build-history
 * artifact with no consumer, and precaching bytes no page ever reads is the
 * fastest way to make a cache budget meaningless.
 *
 * Runs automatically before every `npm run build` (see "prebuild" in
 * package.json) — including the GitHub Actions deploy workflow.
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Registry basename → the JSON feed path it is published at. */
const REGISTRIES = [
  "fees.json",
  "jurisdictions.json",
  "rails.json",
  "banksRegistry.json",
];

const isoDate = new Date().toISOString();

for (const name of REGISTRIES) {
  const source = join(ROOT, "data", name);
  const target = join(ROOT, "public", "api", name);
  mkdirSync(dirname(target), { recursive: true });
  
  if (name === "fees.json" || name === "jurisdictions.json") {
    const data = JSON.parse(readFileSync(source, "utf8"));
    data.lastCompiledAudit = isoDate;
    writeFileSync(target, JSON.stringify(data, null, 2));
  } else {
    copyFileSync(source, target);
  }
  
  console.log(`static api feed synced -> public/api/${name}`);
}
