#!/usr/bin/env node
/**
 * PayoutDelta static-export corridor audit (Phase 1 QA) + Invoice Studio
 * audit (Phase 4 QA).
 *
 * Crawls ./out after `npm run build` and verifies, for every currency
 * corridor:
 *   - the static HTML page exists on disk
 *   - JSON-LD is emitted as ONE valid schema.org @graph exposing the full
 *     Phase 6 schema set (WebApplication, CurrencyConversionService,
 *     FinancialProduct, Service, HowTo, FAQPage, BreadcrumbList)
 *   - every _next/ asset URL is basePath-prefixed (/payout-delta/_next/...)
 *     and resolves to a real file under ./out
 *   - every internal link is basePath-prefixed and maps to an exported file
 *
 * Phase 4 also verifies ./out/invoice/index.html: the route is exported, its
 * metadata (title + description + SoftwareApplication JSON-LD) is intact, and
 * its assets/links resolve under the /payout-delta subpath.
 *
 * Phase 5 also verifies:
 *   - every newly generated localized sub-path (ur/hi/fil/es/pt calculator
 *     routes) exports a real HTML page that loads with dir/lang attribution
 *   - every JSON-LD block on every exported HTML page parses cleanly as valid
 *     JSON (no unescaped quotes, no broken objects)
 *   - corridor pages expose the full Phase 6 schema set (BreadcrumbList,
 *     WebApplication, CurrencyConversionService, FinancialProduct, Service,
 *     HowTo, FAQPage)
 *   - English corridor pages with a localized twin emit hreflang alternates
 *     pointing at the localized sub-paths
 *
 * Phase 4 also verifies the programmatic long-tail platform corridors
 * (Upwork / Fiverr / Deel): each generated page passes the same HTML / JSON-LD /
 * asset / link battery as the base corridors, and every long-tail slug
 * resolves against `data/fees.json` through its underlying currency corridor.
 *
 * Also checks ./out hygiene: index/404/sitemap/robots exist and .nojekyll is
 * present so GitHub Pages serves the bare /payout-delta subpath.
 *
 * Usage: node scripts/test_corridors.mjs
 * Exit:  0 when every check passes, 1 otherwise.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
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
  "usd-to-vnd",
  "usd-to-kes",
  "usd-to-idr",
  "usd-to-cop",
  "usd-to-try",
  "usd-to-mxn",
  "usd-to-ars",
  "usd-to-pln",
  "usd-to-ron",
  "usd-to-czk",
  "usd-to-thb",
  "usd-to-myr",
  "usd-to-ghs",
  "usd-to-aed",
  "usd-to-sar",
  "usd-to-uah",
  "usd-to-iqd",
  "usd-to-mad",
  "usd-to-clp",
  "usd-to-pen",
  "usd-to-huf",
  "usd-to-bgn",
  "usd-to-rsd",
  "usd-to-sgd",
  "usd-to-hkd",
  "usd-to-sek",
  "usd-to-nok",
  "usd-to-dkk",
  "usd-to-bam",
  "usd-to-gel",
  "usd-to-uyu",
  "usd-to-crc",
  "usd-to-hrk",
  "usd-to-tzs",
  "usd-to-ugx",
  "usd-to-rwf",
  "usd-to-zmw",
  "usd-to-npr",
  "usd-to-lkr",
  "usd-to-kzt",
];

/** Phase 4 — programmatic long-tail platform corridors (Upwork/Fiverr/Deel). */
const EXPECTED_LONG_TAIL_SLUGS = [
  "upwork-usd-to-pkr",
  "fiverr-usd-to-pkr",
  "deel-usd-to-pkr",
  "upwork-usd-to-inr",
  "fiverr-usd-to-inr",
  "upwork-usd-to-php",
  "fiverr-usd-to-php",
  "upwork-usd-to-vnd",
  "fiverr-usd-to-vnd",
  "upwork-usd-to-kes",
  "fiverr-usd-to-kes",
  "upwork-usd-to-idr",
  "fiverr-usd-to-idr",
  "upwork-usd-to-cop",
  "fiverr-usd-to-cop",
  "upwork-usd-to-try",
  "fiverr-usd-to-try",
  "upwork-usd-to-mxn",
  "fiverr-usd-to-mxn",
  "upwork-usd-to-ars",
  "fiverr-usd-to-ars",
  "upwork-usd-to-pln",
  "fiverr-usd-to-pln",
  "upwork-usd-to-ron",
  "fiverr-usd-to-ron",
  "upwork-usd-to-czk",
  "fiverr-usd-to-czk",
  "upwork-usd-to-thb",
  "fiverr-usd-to-thb",
  "upwork-usd-to-myr",
  "fiverr-usd-to-myr",
  "upwork-usd-to-ghs",
  "fiverr-usd-to-ghs",
  "upwork-usd-to-aed",
  "fiverr-usd-to-aed",
  "upwork-usd-to-sar",
  "fiverr-usd-to-sar",
  "upwork-usd-to-uah",
  "fiverr-usd-to-uah",
  "upwork-usd-to-iqd",
  "fiverr-usd-to-iqd",
  "upwork-usd-to-mad",
  "fiverr-usd-to-mad",
  "upwork-usd-to-clp",
  "fiverr-usd-to-clp",
  "upwork-usd-to-pen",
  "fiverr-usd-to-pen",
  "upwork-usd-to-huf",
  "fiverr-usd-to-huf",
  "upwork-usd-to-bgn",
  "fiverr-usd-to-bgn",
  "upwork-usd-to-rsd",
  "fiverr-usd-to-rsd",
  "upwork-usd-to-sgd",
  "fiverr-usd-to-sgd",
  "upwork-usd-to-hkd",
  "fiverr-usd-to-hkd",
  "upwork-usd-to-sek",
  "fiverr-usd-to-sek",
  "upwork-usd-to-nok",
  "fiverr-usd-to-nok",
  "upwork-usd-to-dkk",
  "fiverr-usd-to-dkk",
  "upwork-usd-to-bam",
  "fiverr-usd-to-bam",
  "upwork-usd-to-gel",
  "fiverr-usd-to-gel",
  "upwork-usd-to-uyu",
  "fiverr-usd-to-uyu",
  "upwork-usd-to-crc",
  "fiverr-usd-to-crc",
  "upwork-usd-to-hrk",
  "fiverr-usd-to-hrk",
  "upwork-usd-to-tzs",
  "fiverr-usd-to-tzs",
  "upwork-usd-to-ugx",
  "fiverr-usd-to-ugx",
  "upwork-usd-to-rwf",
  "fiverr-usd-to-rwf",
  "upwork-usd-to-zmw",
  "fiverr-usd-to-zmw",
  "upwork-usd-to-npr",
  "fiverr-usd-to-npr",
  "upwork-usd-to-lkr",
  "fiverr-usd-to-lkr",
  "upwork-usd-to-kzt",
  "fiverr-usd-to-kzt",
];

const EXPECTED_LOCALIZED = [
  { lang: "ur", slug: "usd-to-pkr", dir: "rtl" },
  { lang: "hi", slug: "usd-to-inr", dir: "ltr" },
  { lang: "fil", slug: "usd-to-php", dir: "ltr" },
  { lang: "es", slug: "usd-to-eur", dir: "ltr" },
  { lang: "pt", slug: "usd-to-brl", dir: "ltr" },
];

/**
 * Phase 5/6 — full schema set required on every corridor page: the financial
 * JSON-LD dominance entities (CurrencyConversionService + per-rail
 * FinancialProduct), the WebApplication rich result, the HowTo realization
 * waterfall, the FAQPage and the BreadcrumbList — all inside one @graph.
 */
const REQUIRED_CORRIDOR_SCHEMA = [
  "BreadcrumbList",
  "WebApplication",
  "CurrencyConversionService",
  "FinancialProduct",
  "Service",
  "HowTo",
  "FAQPage",
];

/** Required schema set on localized corridor pages (subset of the corridor set). */
const REQUIRED_LOCALIZED_SCHEMA = [
  "BreadcrumbList",
  "WebApplication",
  "CurrencyConversionService",
  "HowTo",
  "FAQPage",
];

const ASSET_HREF_RE = /(?:href|src)="(\/(?:payout-delta\/)?_next\/[^"]*)"/g;
const LD_JSON_RE =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
const HREF_RE = /href="([^"]*)"/g;

let failures = 0;

function fail(label, detail) {
  failures += 1;
  console.log(`  FAIL  ${label} — ${detail}`);
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

/**
 * Phase 5 — parses every JSON-LD block on a page. Returns the number of
 * `application/ld+json` script blocks that fail `JSON.parse`, so malformed
 * markup (unescaped quotes, truncated objects) fails the audit instead of
 * being silently skipped by `collectTypes`.
 */
function countBrokenLdBlocks(html) {
  let blocks = 0;
  let broken = 0;
  let match;
  while ((match = LD_JSON_RE.exec(html)) !== null) {
    blocks += 1;
    try {
      JSON.parse(match[1]);
    } catch {
      broken += 1;
    }
  }
  return { blocks, broken };
}

/**
 * Phase 6 — verifies the page's JSON-LD is consolidated into exactly one
 * top-level schema.org `@graph` (the financial JSON-LD dominance pattern:
 * every page entity in one context-scoped graph instead of fragmented
 * scripts). Site-wide blocks from the root layout (e.g. `WebSite`) are
 * allowed alongside it; any second `@graph` or a graph missing the required
 * corridor entity set fails the check.
 */
function auditJsonLdHeader(html) {
  let graphs = 0;
  const types = new Set();
  let match;
  while ((match = LD_JSON_RE.exec(html)) !== null) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed["@graph"])) {
      graphs += 1;
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
      collect(parsed["@graph"]);
    }
  }
  return {
    singleGraph:
      graphs === 1 && REQUIRED_CORRIDOR_SCHEMA.every((t) => types.has(t)),
  };
}

const HREFLANG_RE = /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*>/gi;

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
  row.schema = REQUIRED_CORRIDOR_SCHEMA.every((t) => types.has(t));
  row.missingSchema = REQUIRED_CORRIDOR_SCHEMA.filter((t) => !types.has(t));

  const { blocks, broken } = countBrokenLdBlocks(html);
  row.ldBlocks = blocks;
  row.ldParse = broken === 0;

  row.singleGraph = auditJsonLdHeader(html).singleGraph;

  const { checked, bad } = verifyAssets(html);
  row.assets = checked > 0 && bad === 0;
  row.assetDetails = { checked, bad };

  const links = verifyInternalLinks(html);
  row.links = links;
  return row;
}

/**
 * Phase 5 — Freelance Invoice Studio: ./out/invoice/index.html must exist,
 * carry valid metadata (title + meta description + SoftwareApplication
 * JSON-LD), and serve basePath-prefixed assets that resolve on disk.
 */
function auditInvoice() {
  const htmlFile = join(OUT, "invoice", "index.html");
  const row = { slug: "invoice" };

  if (!existsSync(htmlFile)) {
    row.html = false;
    row.metadata = false;
    row.assets = false;
    row.links = { total: 0, bad: 0 };
    return row;
  }
  row.html = true;

  const html = readFileSync(htmlFile, "utf8");
  const titleOk = /<title[^>]*>[^<]*Freelance Invoice Studio/i.test(html);
  const descriptionTag =
    html.match(/<meta[^>]*name=["']description["'][^>]*>/i)?.[0] ?? "";
  const descriptionOk = /content=["'][^"']{20,}["']/i.test(descriptionTag);
  const schemaTypes = collectTypes(html);
  row.schemaMissing = [];
  for (const t of ["SoftwareApplication", "BreadcrumbList", "Service"]) {
    if (!schemaTypes.has(t)) row.schemaMissing.push(t);
  }
  const { blocks, broken } = countBrokenLdBlocks(html);
  row.ldBlocks = blocks;
  row.ldParse = broken === 0;
  row.metadata =
    titleOk && descriptionOk && row.schemaMissing.length === 0;

  const { checked, bad } = verifyAssets(html);
  row.assets = checked > 0 && bad === 0;
  row.assetDetails = { checked, bad };

  row.links = verifyInternalLinks(html);
  return row;
}

/**
 * Phase 5 — localized sub-path audit. Verifies each authored (lang, slug)
 * route exported a real HTML page with correct dir/lang attribution, valid
 * JSON-LD (incl. BreadcrumbList), prefix-intact assets and no broken links.
 */
function auditLocalized(lang, slug, dir) {
  const htmlFile = join(OUT, lang, "calculator", slug, "index.html");
  const row = { slug: `${lang}/${slug}` };

  if (!existsSync(htmlFile)) {
    row.html = false;
    row.dirLang = false;
    row.schema = false;
    row.assets = false;
    return row;
  }
  row.html = true;

  const html = readFileSync(htmlFile, "utf8");
  const dirLangOk = dir === "rtl";
  const hasDirRtl = /dir=["']rtl["']/i.test(html);
  const hasLang = new RegExp(`lang=["']${lang}["']`, "i").test(html);
  row.dirLang = hasLang && (!dirLangOk || hasDirRtl);

  const types = collectTypes(html);
  row.schema = REQUIRED_LOCALIZED_SCHEMA.every((t) => types.has(t));
  row.missingSchema = REQUIRED_LOCALIZED_SCHEMA.filter((t) => !types.has(t));

  const { blocks, broken } = countBrokenLdBlocks(html);
  row.ldBlocks = blocks;
  row.ldParse = broken === 0;

  row.singleGraph = auditJsonLdHeader(html).singleGraph;

  const { checked, bad } = verifyAssets(html);
  row.assets = checked > 0 && bad === 0;
  row.assetDetails = { checked, bad };

  row.links = verifyInternalLinks(html);
  return row;
}

/**
 * Phase 5 — hreflang audit. Every English corridor page with a localized twin
 * must emit a rel=alternate hreflang link for that language.
 */
function verifyHreflang(slug, expectedLangs) {
  const htmlFile = join(OUT, "calculator", slug, "index.html");
  if (!existsSync(htmlFile)) return [];
  const html = readFileSync(htmlFile, "utf8");
  const present = new Set();
  let match;
  while ((match = HREFLANG_RE.exec(html)) !== null) {
    present.add(match[1].toLowerCase());
  }
  return expectedLangs.filter((lang) => !present.has(lang));
}

console.log("\nPayoutDelta static-export corridor audit (./out)\n");

const header = `${"Corridor Slug".padEnd(42)}${"HTML Exists".padEnd(14)}${"JSON-LD Present".padEnd(18)}${"Assets Verified"}`;
console.log(header);
console.log("-".repeat(header.length));

const report = [
  ...EXPECTED_SLUGS.map(auditCorridor),
  ...EXPECTED_LONG_TAIL_SLUGS.map(auditCorridor),
];
for (const row of report) {
  const flag = (ok) => (ok ? "PASS" : "FAIL");
  console.log(
    `${`calculator/${row.slug}/index.html`.padEnd(42)}${flag(row.html).padEnd(14)}${flag(row.schema).padEnd(18)}${flag(row.assets)}`
  );
  if (!row.html) {
    fail("page not exported", row.slug);
  }
  if (!row.schema) {
    fail("schema missing", `${row.slug}: requires ${(row.missingSchema ?? []).join(", ")}`);
  }
  if (!row.ldParse) {
    fail("malformed JSON-LD", row.slug);
  }
  if (!row.singleGraph) {
    fail("JSON-LD not a single schema.org @graph", row.slug);
  }
  if (row.assetDetails && row.assetDetails.bad > 0) {
    fail("asset errors", row.slug);
  }
  if (row.links && row.links.bad > 0) {
    fail("internal links broken", row.slug);
  }
}
console.log("-".repeat(header.length));

console.log("\nLocalized sub-path audit (Phase 5):");
const localizedRows = EXPECTED_LOCALIZED.map(({ lang, slug, dir }) =>
  auditLocalized(lang, slug, dir)
);
let localizedFailures = 0;
for (const row of localizedRows) {
  const flag = (ok) => (ok ? "PASS" : "FAIL");
  const detail = row.html
    ? `${flag(row.dirLang)} dir/lang · ${flag(row.schema)} Phase6 schema · ${flag(row.singleGraph)} @graph · ${row.assetDetails ? `${row.assetDetails.checked} assets` : "-"} · ${row.links ? `${row.links.total} links` : "-"}`
    : "page not exported";
  console.log(`  ${`${row.slug}/index.html`.padEnd(38)}${detail}`);
  if (!row.html) {
    localizedFailures += 1;
    fail("page not exported", row.slug);
  }
  if (row.html && !row.dirLang) {
    localizedFailures += 1;
    fail("dir/lang attribution missing", row.slug);
  }
  if (row.html && !row.schema) {
    localizedFailures += 1;
    fail("schema missing", `${row.slug}: requires ${(row.missingSchema ?? []).join(", ")}`);
  }
  if (row.html && !row.singleGraph) {
    localizedFailures += 1;
    fail("JSON-LD not a single schema.org @graph", row.slug);
  }
  if (row.html && !row.ldParse) {
    localizedFailures += 1;
    fail("malformed JSON-LD", row.slug);
  }
  if (row.assetDetails && row.assetDetails.bad > 0) {
    localizedFailures += 1;
    fail("asset errors", row.slug);
  }
  if (row.links && row.links.bad > 0) {
    localizedFailures += 1;
    fail("internal links broken", row.slug);
  }
}
if (localizedFailures > 0) {
  fail("localized pages incomplete", `${localizedFailures} issue(s) across localized routes`);
}

const hreflangBySlug = new Map();
for (const { lang, slug } of EXPECTED_LOCALIZED) {
  if (!hreflangBySlug.has(slug)) hreflangBySlug.set(slug, []);
  hreflangBySlug.get(slug).push(lang);
}
let hreflangFailures = 0;
for (const [slug, langs] of hreflangBySlug) {
  const missing = verifyHreflang(slug, langs);
  if (missing.length > 0) {
    hreflangFailures += 1;
    fail("hreflang missing", `${slug}: ${missing.join(", ")}`);
  }
}
console.log(
  `\nHreflang alternates (Phase 5): ${hreflangFailures === 0 ? `PASS — ${EXPECTED_LOCALIZED.length} localized variant(s) wired into corridor heads` : `FAIL — ${hreflangFailures} corridor(s) missing alternates`}`
);

/**
 * Phase E — Year-End Remittance & Tax Ledger: ./out/tax-ledger/index.html
 * must exist, carry valid metadata (title + meta description +
 * SoftwareApplication / BreadcrumbList / Service JSON-LD), and serve
 * basePath-prefixed assets that resolve on disk. Because the header nav now
 * links to /tax-ledger/, every exported page implicitly verifies its export.
 */
function auditTaxLedger() {
  const htmlFile = join(OUT, "tax-ledger", "index.html");
  const row = { slug: "tax-ledger" };

  if (!existsSync(htmlFile)) {
    row.html = false;
    row.metadata = false;
    row.assets = false;
    row.links = { total: 0, bad: 0 };
    return row;
  }
  row.html = true;

  const html = readFileSync(htmlFile, "utf8");
  const titleOk = /<title[^>]*>[^<]*Remittance &amp; Tax Ledger|Remittance & Tax Ledger/i.test(html);
  const descriptionTag =
    html.match(/<meta[^>]*name=["']description["'][^>]*>/i)?.[0] ?? "";
  const descriptionOk = /content=["'][^"']{20,}["']/i.test(descriptionTag);
  const schemaTypes = collectTypes(html);
  row.schemaMissing = [];
  for (const t of ["SoftwareApplication", "BreadcrumbList", "Service"]) {
    if (!schemaTypes.has(t)) row.schemaMissing.push(t);
  }
  const { blocks, broken } = countBrokenLdBlocks(html);
  row.ldBlocks = blocks;
  row.ldParse = broken === 0;
  row.metadata =
    titleOk && descriptionOk && row.schemaMissing.length === 0;

  const { checked, bad } = verifyAssets(html);
  row.assets = checked > 0 && bad === 0;
  row.assetDetails = { checked, bad };

  row.links = verifyInternalLinks(html);
  return row;
}

console.log("\nInvoice Studio audit (Phase 4):");
const invoice = auditInvoice();
const invoiceFlags = `${invoice.html ? "PASS" : "FAIL"}`;
if (!invoice.html) {
  fail("page not exported", "invoice/index.html");
}
if (invoice.html && !invoice.metadata) {
  fail("metadata missing", "invoice: title + description + SoftwareApplication/BreadcrumbList/Service required");
}
if (invoice.html && !invoice.ldParse) {
  fail("malformed JSON-LD", "invoice");
}
if (invoice.assetDetails && invoice.assetDetails.bad > 0) {
  fail("asset errors", "invoice");
}
if (invoice.links && invoice.links.bad > 0) {
  fail("internal links broken", "invoice");
}
console.log(
  `  ${"invoice/index.html".padEnd(38)}${invoiceFlags.padEnd(10)}Metadata ${invoice.html ? (invoice.metadata ? "PASS" : "FAIL") : "n/a"}`
);
console.log(
  `  ${"assets".padEnd(38)}${(invoice.assets ? "PASS" : "FAIL").padEnd(10)}${`${invoice.assetDetails ? invoice.assetDetails.checked : 0} checked`}`
);
console.log(
  `  ${"internal links".padEnd(38)}${(invoice.links && invoice.links.bad === 0 ? "PASS" : "FAIL").padEnd(10)}${invoice.links ? invoice.links.total : 0} verified`
);

console.log("\nRemittance & Tax Ledger audit (Phase E):");
const taxLedger = auditTaxLedger();
const taxLedgerFlags = `${taxLedger.html ? "PASS" : "FAIL"}`;
if (!taxLedger.html) {
  fail("page not exported", "tax-ledger/index.html");
}
if (taxLedger.html && !taxLedger.metadata) {
  fail("metadata missing", "tax-ledger: title + description + SoftwareApplication/BreadcrumbList/Service required");
}
if (taxLedger.html && !taxLedger.ldParse) {
  fail("malformed JSON-LD", "tax-ledger");
}
if (taxLedger.assetDetails && taxLedger.assetDetails.bad > 0) {
  fail("asset errors", "tax-ledger");
}
if (taxLedger.links && taxLedger.links.bad > 0) {
  fail("internal links broken", "tax-ledger");
}
console.log(
  `  ${"tax-ledger/index.html".padEnd(38)}${taxLedgerFlags.padEnd(10)}Metadata ${taxLedger.html ? (taxLedger.metadata ? "PASS" : "FAIL") : "n/a"}`
);
console.log(
  `  ${"assets".padEnd(38)}${(taxLedger.assets ? "PASS" : "FAIL").padEnd(10)}${`${taxLedger.assetDetails ? taxLedger.assetDetails.checked : 0} checked`}`
);
console.log(
  `  ${"internal links".padEnd(38)}${(taxLedger.links && taxLedger.links.bad === 0 ? "PASS" : "FAIL").padEnd(10)}${taxLedger.links ? taxLedger.links.total : 0} verified`
);

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

/**
 * Phase 6 — static JSON feed mirror. The developer portal documents
 * /api/fees.json (exported verbatim from public/api/fees.json) as the
 * versioned static feed; it must byte-match data/fees.json so the docs never
 * drift from the dataset the site is built from. `prebuild` keeps it in sync.
 */
const feedPath = join(ROOT, "public", "api", "fees.json");
let feedMirrored = false;
if (!existsSync(feedPath)) {
  console.log(`  ${"FAIL  " + "static feed mirror".padEnd(32)}public/api/fees.json missing`);
  globalBad += 1;
  fail("static feed mirror", "public/api/fees.json does not exist");
} else {
  const normalizeJson = (text) => JSON.stringify(JSON.parse(text));
  feedMirrored =
    normalizeJson(readFileSync(feedPath, "utf8")) ===
    normalizeJson(readFileSync(join(ROOT, "data", "fees.json"), "utf8"));
  console.log(
    `  ${(feedMirrored ? "PASS  " : "FAIL  ") + "static feed mirror".padEnd(32)}public/api/fees.json matches data/fees.json`
  );
  if (!feedMirrored) {
    globalBad += 1;
    fail("static feed mirror", "public/api/fees.json drifted from data/fees.json");
  }
}

/**
 * Phase 4 — long-tail derivation check. Every long-tail slug must parse as
 * `<platform>-usd-to-<ccy>` where `platform` is upwork/fiverr/deel, the base
 * currency corridor exists in the corpus, and its target currency matches.
 */
function checkLongTailDerivation() {
  let bad = 0;
  const pattern = /^(upwork|fiverr|deel)-usd-to-([a-z]{3})$/;
  const bySlug = new Map(corpus.corridors.map((c) => [c.slug, c]));
  for (const slug of EXPECTED_LONG_TAIL_SLUGS) {
    const match = pattern.exec(slug);
    if (!match) {
      bad += 1;
      fail("long-tail slug pattern invalid", slug);
      continue;
    }
    const baseSlug = `usd-to-${match[2]}`;
    const corridor = bySlug.get(baseSlug);
    if (!corridor) {
      bad += 1;
      fail("long-tail base corridor missing", `${slug} -> ${baseSlug}`);
      continue;
    }
    // Euro-legacy alias: a corridor may keep its pre-euro ISO code in the
    // slug while pricing in EUR (e.g. Croatia `usd-to-hrk` receives EUR).
    const euroAlias = corridor.to === "EUR" && corridor.slug === `usd-to-${match[2]}`;
    if (corridor.to.toLowerCase() !== match[2] && !euroAlias) {
      bad += 1;
      fail("long-tail currency mismatch", `${slug} expects ${match[2].toUpperCase()}`);
    }
  }
  return bad;
}
let longTailFailures = checkLongTailDerivation();
if (longTailFailures > 0) {
  globalBad += 1;
  fail("long-tail derivation", `${longTailFailures} corridor(s) unresolved`);
}
console.log(
  `  ${(longTailFailures === 0 ? "PASS  " : "FAIL  ") + "long-tail corridors derive from corpus".padEnd(32)}${EXPECTED_LONG_TAIL_SLUGS.length} platform corridors`
);

/**
 * Phase 5 — global JSON-LD integrity scan. Parses every JSON-LD block in every
 * exported HTML page under ./out (home, legal, corridor and localized routes)
 * and counts blocks that fail `JSON.parse`.
 */
function listHtmlFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listHtmlFiles(full));
    } else if (entry.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}
let ldScanned = 0;
let ldBroken = 0;
for (const file of listHtmlFiles(OUT)) {
  const { blocks, broken } = countBrokenLdBlocks(readFileSync(file, "utf8"));
  ldScanned += blocks;
  ldBroken += broken;
}
console.log(
  `  ${(ldBroken === 0 ? "PASS  " : "FAIL  ") + "JSON-LD parse integrity".padEnd(32)}${ldScanned} blocks scanned, ${ldBroken} malformed`
);
if (ldBroken > 0) {
  globalBad += 1;
  fail("malformed JSON-LD", "see JSON-LD parse integrity check");
}

const pageFailures = report.filter(
  (r) =>
    !r.html ||
    !r.schema ||
    !r.assets ||
    !r.ldParse ||
    (r.html && !r.singleGraph)
).length;
const linkFailures = report.reduce((sum, r) => sum + (r.links ? r.links.bad : 0), 0);
const linkTotal = report.reduce((sum, r) => sum + (r.links ? r.links.total : 0), 0);
const assetTotal = report.reduce((sum, r) => sum + (r.assetDetails ? r.assetDetails.checked : 0), 0);

const localizedAssetTotal = localizedRows.reduce(
  (sum, r) => sum + (r.assetDetails ? r.assetDetails.checked : 0),
  0
);
const localizedLinkTotal = localizedRows.reduce(
  (sum, r) => sum + (r.links ? r.links.total : 0),
  0
);

const invoiceFailures =
  (!invoice.html ? 1 : 0) +
  (invoice.html && !invoice.metadata ? 1 : 0) +
  (invoice.html && !invoice.ldParse ? 1 : 0) +
  (invoice.assets ? 0 : 1) +
  (invoice.links ? invoice.links.bad : 0);

const taxLedgerFailures =
  (!taxLedger.html ? 1 : 0) +
  (taxLedger.html && !taxLedger.metadata ? 1 : 0) +
  (taxLedger.html && !taxLedger.ldParse ? 1 : 0) +
  (taxLedger.assets ? 0 : 1) +
  (taxLedger.links ? taxLedger.links.bad : 0);

console.log(`\n${"-".repeat(header.length)}`);
console.log(`  pages exported           ${report.length} corridors + ${localizedRows.length} localized routes + 1 invoice studio + 1 tax ledger`);
console.log(`  assets verified          ${assetTotal + localizedAssetTotal + (invoice.assetDetails ? invoice.assetDetails.checked : 0) + (taxLedger.assetDetails ? taxLedger.assetDetails.checked : 0)}`);
console.log(`  internal links verified  ${linkTotal + localizedLinkTotal + (invoice.links ? invoice.links.total : 0) + (taxLedger.links ? taxLedger.links.total : 0)}`);
console.log(`  JSON-LD blocks scanned   ${ldScanned}`);
console.log(`  failures                 ${failures + globalBad + pageFailures + linkFailures + invoiceFailures + localizedFailures + hreflangFailures + taxLedgerFailures}`);

const ok =
  failures === 0 &&
  globalBad === 0 &&
  pageFailures === 0 &&
  linkFailures === 0 &&
  invoiceFailures === 0 &&
  localizedFailures === 0 &&
  hreflangFailures === 0 &&
  taxLedgerFailures === 0;
if (ok) {
  console.log("\n  ALL CHECKS PASSED\n");
  process.exit(0);
}
console.log("\n  AUDIT FAILED — fix reported issues and re-run\n");
process.exit(1);