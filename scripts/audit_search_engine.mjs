import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "out");
const SEARCH_INDEX_PATH = join(ROOT, "public", "api", "search-index.json");

console.log("PayoutDelta search engine audit (./out)");

let assertions = 0;
let failures = 0;

function assert(condition, message, successDetail = "") {
  assertions++;
  if (!condition) {
    console.error(`  FAIL  ${message}${successDetail ? ` (${successDetail})` : ""}`);
    failures++;
  } else if (successDetail) {
    console.log(`  PASS  ${message.padEnd(40)} ${successDetail}`);
  } else {
    console.log(`  PASS  ${message}`);
  }
}

console.log("\nSurface 1 — Search Index Validation");
assert(existsSync(SEARCH_INDEX_PATH), "search-index.json exists", "public/api/search-index.json");

let index = [];
try {
  index = JSON.parse(readFileSync(SEARCH_INDEX_PATH, "utf8"));
  assert(true, "search-index.json parses cleanly");
} catch (e) {
  assert(false, "search-index.json parses cleanly", e.message);
}

assert(index.length >= 450, "index has >= 450 entries", `${index.length} entries found`);

let outPathsValid = true;
let bicsValid = true;
let invalidPaths = [];
let invalidBics = [];

const iso9362Regex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

for (const entry of index) {
  let rawUrl = entry.url.replace(/^\/payout-delta/, "");
  rawUrl = rawUrl.split("#")[0];
  
  if (rawUrl.endsWith("/")) {
    rawUrl += "index.html";
  } else if (!rawUrl.endsWith(".html")) {
    rawUrl += "/index.html";
  }
  
  const fsPath = join(OUT_DIR, rawUrl);
  if (!existsSync(fsPath)) {
    outPathsValid = false;
    invalidPaths.push(entry.url);
  }

  if (entry.badge === "Bank") {
    // b.bic is the first keyword in our generator script
    const bic = entry.keywords[0];
    if (bic !== "—" && !iso9362Regex.test(bic)) {
      bicsValid = false;
      invalidBics.push(bic);
    }
  }
}

assert(outPathsValid, "all index URLs map to exported static HTML", outPathsValid ? "" : `Missing: ${invalidPaths.slice(0, 3).join(", ")}`);
assert(bicsValid, "all index BICs conform to ISO 9362", bicsValid ? "" : `Invalid: ${invalidBics.slice(0, 3).join(", ")}`);

console.log(`\n  assertions                 ${assertions}`);
console.log(`  failures                   ${failures}\n`);

if (failures > 0) {
  console.error("  SEARCH ENGINE AUDIT FAILED");
  process.exit(1);
} else {
  console.log("  ALL SEARCH ENGINE CHECKS PASSED");
}
