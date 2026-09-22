/**
 * PayoutDelta — static API feed sync (Phase 6).
 *
 * Copies the versioned `data/fees.json` snapshot to `public/api/fees.json`,
 * which the static export mirrors verbatim into `out/api/fees.json`. That is
 * the documented "static JSON feed" endpoint
 * (https://ahmadbilaldsa.github.io/payout-delta/api/fees.json), so the file
 * the developer portal documents never drifts from the dataset the site is
 * built from.
 *
 * Runs automatically before every `npm run build` (see "prebuild" in
 * package.json) — including the GitHub Actions deploy workflow.
 */

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "data", "fees.json");
const TARGET = join(ROOT, "public", "api", "fees.json");

mkdirSync(dirname(TARGET), { recursive: true });
copyFileSync(SOURCE, TARGET);
console.log(`static api feed synced -> public/api/fees.json`);