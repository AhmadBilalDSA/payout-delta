#!/usr/bin/env node
/**
 * PayoutDelta static-export corridor audit (Phase 1 QA).
 *
 * Crawls ./out after `npm run build` and verifies, for every currency
 * corridor:
 *   - the static HTML page exists on disk
 *   - JSON-LD exposes SoftwareApplication + FAQPage schemas
 *   - every _next/ asset URL is basePath-prefixed (/payout-delta/_next/...)
 *     and resolves to a real file under ./out
 *   - every internal link is basePath-prefixed and maps to an exported file
 *
 * Also checks ./out hygiene: index/404/sitemap/robots exist and .nojekyll is
 * present so GitHub Pages serves the bare /payout-delta subpath.
 *
 * Usage: node scripts/test_corridors.mjs
 * Exit:  0 when every check passes, 1 otherwise.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "out");
const BASE_PATH = "/payout-delta";

const EXPECTED_SLUGS = [
  "usd-to-pkr",
  "usd-to-inr",
  "usd-to-php",
  "usd-to-brl",
  "usd-to-gbp",
  "usd-to-eur",
  "usd-to-ngn",
  "usd-to-bdt",
  "usd-to-egp",
  "usd-to-zar",
];

const ASSET_HREF_RE = /(?:href|src)="(\/(?:payout-delta\/)?_next\/[^"]*)"/g;
const LD_JSON_RE =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
const HREF_RE = /href="([^"]*)"/g;

let failures = 0;
let passed = 0;

function fail(label, detail) {
  failures += 1;
  console.log(`  FAIL  ${label} — ${detail}`);
}

function pass(label) {
  passed += 1;
}

function collectTypes(html) {
  const types = new Set();
  let match;
  while ((match = LD_JSON_RE.exec(html)) !== null) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const collect = (node) => {
      if (Array.isArray(node)) {
        node.forEach(collect);
      } else if (node && typeof node === "object") {
        if (typeof node["@type"] === "string") {
          types.add(node["@type"]);
        } else if (Array.isArray(node["@type"])) {
          node["@type"].forEach((t) => types.add(t));
        }
        collect(Object.values(node));
      }
    };
    collect(parsed);
  }
  return types;
}

function diskPathForHref(relPath) {
  const withoutQuery = relPath.split(/[?#]/, 1)[0];
  const segments = withoutQuery.replace(/^\/+/, "").split("/").filter(Boolean);
  if (withoutQuery.includes(".") && !withoutQuery.endsWith("/")) {
    return [join(OUT, ...segments)];
  }
  if (withoutQuery.endsWith("/")) {
    return [join(OUT, ...segments, "index.html")];
  }
  return [join(OUT, ...segments, "index.html"), join(OUT, ...segments) + ".html"];
}

function verifyAssets(html) {
  let checked = 0;
  let bad = 0;
  const seen = new Set();
  let match;
  while ((match = ASSET_HREF_RE.exec(html)) !== null) {
    const url = match[1].split(/[?#]/, 1)[0];
    if (seen.has(url)) continue;
    seen.add(url);
    checked += 1;
    if (url.startsWith(`${BASE_PATH}/_next/`)) {
      const disk = join(OUT, url.slice(BASE_PATH.length).replace(/^\/+/, ""));
      if (!existsSync(disk)) {
        bad += 1;
        fail("asset missing on disk", url);
      }
    } else if (url.startsWith("/_next/")) {
      bad += 1;
      fail("asset lacks basePath prefix", url);
    }
  }
  return { checked, bad };
}

function verifyInternalLinks(html) {
  let total = 0;
  let bad = 0;
  const seen = new Set();
  let match;
  while ((match = HREF_RE.exec(html)) !== null) {
    const href = match[1];
    total += 1;
    if (href.startsWith(`${BASE_PATH}/_next/`) || href.startsWith("/_next/")) {
      continue;
    }
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("data:")
    ) {
      continue;
    }
    if (/^(https?:)?\/\//i.test(href)) {
      continue;
    }
    if (!href.startsWith("/")) {
      bad += 1;
      fail("relative href (needs absolute basePath)", href);
      continue;
    }
    if (!href.startsWith(BASE_PATH)) {
      bad += 1;
      fail("href missing basePath prefix", href);
      continue;
    }
    const key = href.split(/[?#]/, 1)[0];
    if (key === BASE_PATH) {
      if (!existsSync(join(OUT, "index.html"))) {
        bad += 1;
        fail("home link target missing", href);
      }
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const candidates = diskPathForHref(key.slice(BASE_PATH.length));
    if (!candidates.some((c) => existsSync(c))) {
      bad += 1;
      fail("link target missing on disk", href);
    }
  }
  return { total, bad };
}

function auditCorridor(slug) {
  const htmlFile = join(OUT, "calculator", slug, "index.html");
  const row = { slug };

  if (!existsSync(htmlFile)) {
    row.html = false;
    row.schema = false;
    row.assets = false;
    return row;
  }
  row.html = true;

  const html = readFileSync(htmlFile, "utf8");
  const types = collectTypes(html);
  row.schema = types.has("SoftwareApplication") && types.has("FAQPage");

  const { checked, bad } = verifyAssets(html);
  row.assets = checked > 0 && bad === 0;
  row.assetDetails = { checked, bad };

  const links = verifyInternalLinks(html);
  row.links = links;
  return row;
}

console.log("\nPayoutDelta static-export corridor audit (./out)\n");

const header = `${"Corridor Slug".padEnd(42)}${"HTML Exists".padEnd(14)}${"JSON-LD Present".padEnd(18)}${"Assets Verified"}`;
console.log(header);
console.log("-".repeat(header.length));

const report = EXPECTED_SLUGS.map(auditCorridor);
for (const row of report) {
  const flag = (ok) => (ok ? "PASS" : "FAIL");
  console.log(
    `${`calculator/${row.slug}/index.html`.padEnd(42)}${flag(row.html).padEnd(14)}${flag(row.schema).padEnd(18)}${flag(row.assets)}`
  );
  if (!row.html) {
    fail("page not exported", row.slug);
  }
  if (!row.schema) {
    fail("schema missing", `${row.slug}: SoftwareApplication + FAQPage required`);
  }
  if (row.assetDetails) {
    if (row.assetDetails.bad === 0) pass(`assets on ${row.slug}`);
    else fail("asset errors", row.slug);
  }
  if (row.links) {
    if (row.links.bad === 0) pass(`internal links on ${row.slug}`);
    else fail("internal links broken", row.slug);
  }
}
console.log("-".repeat(header.length));
console.log("\nGlobal ./out hygiene:");

const globalFiles = [
  ["index.html", "home page"],
  ["404.html", "404 fallback"],
  ["sitemap.xml", "sitemap"],
  ["robots.txt", "robots"],
  [".nojekyll", "GitHub Pages marker"],
];
let globalBad = 0;
for (const [file, label] of globalFiles) {
  const ok = existsSync(join(OUT, file));
  console.log(`  ${(ok ? "PASS  " : "FAIL  ") + label.padEnd(32)}${file}`);
  if (!ok) globalBad += 1;
}

function listCssFiles(dir) {
  if (!existsSync(dir)) return [];
  const css = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      css.push(...listCssFiles(full));
    } else if (entry.endsWith(".css")) {
      css.push(full);
    }
  }
  return css;
}

function cssBundleCount() {
  return listCssFiles(join(OUT, "_next", "static")).length;
}
const cssFiles = cssBundleCount();
console.log(
  `  ${(cssFiles > 0 ? "PASS  " : "FAIL  ") + "exported CSS bundle".padEnd(32)}${cssFiles} file(s) in _next/static/**`
);
if (cssFiles === 0) globalBad += 1;

const corpus = JSON.parse(
  readFileSync(join(ROOT, "data", "fees.json"), "utf8")
);
const corpusSlugs = corpus.corridors.map((c) => c.slug).sort();
const expected = [...EXPECTED_SLUGS].sort();
const corpusMatches =
  corpusSlugs.length === expected.length &&
  corpusSlugs.every((slug, i) => slug === expected[i]);
console.log(
  `  ${(corpusMatches ? "PASS  " : "FAIL  ") + "dataset slugs match audit list".padEnd(32)}${corpusSlugs.length} corridors in data/fees.json`
);
if (!corpusMatches) {
  globalBad += 1;
  fail("corpus drift", "data/fees.json slugs differ from EXPECTED_SLUGS");
}

const pageFailures = report.filter((r) => !r.html || !r.schema || !r.assets).length;
const linkFailures = report.reduce((sum, r) => sum + (r.links ? r.links.bad : 0), 0);
const linkTotal = report.reduce((sum, r) => sum + (r.links ? r.links.total : 0), 0);
const assetTotal = report.reduce((sum, r) => sum + (r.assetDetails ? r.assetDetails.checked : 0), 0);

console.log(`\n${"-".repeat(header.length)}`);
console.log(`  pages exported           ${report.length}`);
console.log(`  assets verified          ${assetTotal}`);
console.log(`  internal links verified  ${linkTotal}`);
console.log(`  failures                 ${failures + globalBad + pageFailures + linkFailures}`);

const ok = failures === 0 && globalBad === 0 && pageFailures === 0 && linkFailures === 0;
if (ok) {
  console.log("\n  ALL CHECKS PASSED\n");
  process.exit(0);
}
console.log("\n  AUDIT FAILED — fix reported issues and re-run\n");
process.exit(1);