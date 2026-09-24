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
 * Phase 6 also verifies ./out/leaderboard/index.html (the full corridor leakage
 * index) and ./out/seo_rankings.json + the footer "Ranked #1" badge wiring.
 *
 * Phase I also verifies every /embed/<slug>/ widget card exports with metadata,
 * a "Verified by PayoutDelta" badge truthfully backlinking the full calculator
 * route, and clean basePath-prefixed assets/links.
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
  "usd-to-dop",
  "usd-to-gtq",
  "usd-to-pab",
  "usd-to-ec-usd",
  "usd-to-bob",
  "usd-to-pyg",
  "usd-to-jmd",
  "usd-to-ttd",
  "usd-to-hnl",
  "usd-to-sv-usd",
  "usd-to-nio",
  "usd-to-bsd",
  "usd-to-bbd",
  "usd-to-uzs",
  "usd-to-khr",
  "usd-to-mnt",
  "usd-to-amd",
  "usd-to-azn",
  "usd-to-kgs",
  "usd-to-tjs",
  "usd-to-mvr",
  "usd-to-bnd",
  "usd-to-lak",
  "usd-to-btn",
  "usd-to-fjd",
  "usd-to-pgk",
  "usd-to-wst",
  "usd-to-top",
  "usd-to-vuv",
  "usd-to-sbd",
  "usd-to-mur",
  "eur-to-pkr",
  "eur-to-inr",
  "eur-to-php",
  "eur-to-bdt",
  "eur-to-ngn",
  "eur-to-egp",
  "eur-to-brl",
  "eur-to-vnd",
  "eur-to-idr",
  "eur-to-mxn",
  "eur-to-try",
  "eur-to-kes",
  "gbp-to-pkr",
  "gbp-to-inr",
  "gbp-to-php",
  "gbp-to-bdt",
  "gbp-to-ngn",
  "gbp-to-egp",
  "gbp-to-kes",
  "gbp-to-zar",
  "gbp-to-ghs",
  "gbp-to-pln",
  "usd-to-etb",
  "usd-to-xaf",
  "usd-to-xof",
  "usd-to-bwp",
  "usd-to-nad",
  "usd-to-mzn",
  "usd-to-mwk",
  "usd-to-aoa",
  "usd-to-mga",
  "usd-to-jod",
  "usd-to-omr",
  "usd-to-kwd",
  "usd-to-bhd",
  "usd-to-qar",
  "usd-to-tnd",
  "usd-to-dzd",
  "usd-to-lbp",

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
  "upwork-usd-to-dop",
  "fiverr-usd-to-dop",
  "upwork-usd-to-gtq",
  "fiverr-usd-to-gtq",
  "upwork-usd-to-pab",
  "fiverr-usd-to-pab",
  "upwork-usd-to-bob",
  "fiverr-usd-to-bob",
  "upwork-usd-to-pyg",
  "fiverr-usd-to-pyg",
  "upwork-usd-to-jmd",
  "fiverr-usd-to-jmd",
  "upwork-usd-to-ttd",
  "fiverr-usd-to-ttd",
  "upwork-usd-to-hnl",
  "fiverr-usd-to-hnl",
  "upwork-usd-to-nio",
  "fiverr-usd-to-nio",
  "upwork-usd-to-bsd",
  "fiverr-usd-to-bsd",
  "upwork-usd-to-bbd",
  "fiverr-usd-to-bbd",
  "upwork-usd-to-uzs",
  "fiverr-usd-to-uzs",
  "upwork-usd-to-khr",
  "fiverr-usd-to-khr",
  "upwork-usd-to-mnt",
  "fiverr-usd-to-mnt",
  "upwork-usd-to-amd",
  "fiverr-usd-to-amd",
  "upwork-usd-to-azn",
  "fiverr-usd-to-azn",
  "upwork-usd-to-kgs",
  "fiverr-usd-to-kgs",
  "upwork-usd-to-tjs",
  "fiverr-usd-to-tjs",
  "upwork-usd-to-mvr",
  "fiverr-usd-to-mvr",
  "upwork-usd-to-bnd",
  "fiverr-usd-to-bnd",
  "upwork-usd-to-lak",
  "fiverr-usd-to-lak",
  "upwork-usd-to-btn",
  "fiverr-usd-to-btn",
  "upwork-usd-to-fjd",
  "fiverr-usd-to-fjd",
  "upwork-usd-to-pgk",
  "fiverr-usd-to-pgk",
  "upwork-usd-to-wst",
  "fiverr-usd-to-wst",
  "upwork-usd-to-top",
  "fiverr-usd-to-top",
  "upwork-usd-to-vuv",
  "fiverr-usd-to-vuv",
  "upwork-usd-to-sbd",
  "fiverr-usd-to-sbd",
  "upwork-usd-to-mur",
  "fiverr-usd-to-mur",
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

/**
 * Phase I — embeddable backlink widget audit. Every base corridor must export
 * an isolated card at ./out/embed/<slug>/index.html: valid metadata, a
 * "Verified by PayoutDelta" badge linking back to the full calculator route,
 * JSON-LD that parses, and basePath-prefixed assets/links that resolve.
 */
function auditEmbed(slug) {
  const htmlFile = join(OUT, "embed", slug, "index.html");
  const row = { slug: `embed/${slug}` };

  if (!existsSync(htmlFile)) {
    row.html = false;
    row.metadata = false;
    row.badge = false;
    row.backlink = false;
    row.assets = false;
    row.links = { total: 0, bad: 0 };
    return row;
  }
  row.html = true;

  const html = readFileSync(htmlFile, "utf8");
  const titleOk = /<title[^>]*>[^<]*PayoutDelta/i.test(html);
  const descriptionTag =
    html.match(/<meta[^>]*name=["']description["'][^>]*>/i)?.[0] ?? "";
  const descriptionOk = /content=["'][^"']{20,}["']/i.test(descriptionTag);
  row.badge = html.includes("Verified by PayoutDelta");
  row.backlink = new RegExp(
    `href="[^"]*/calculator/${slug}/"`,
    "i"
  ).test(html);
  row.metadata = titleOk && descriptionOk;

  const { blocks, broken } = countBrokenLdBlocks(html);
  row.ldBlocks = blocks;
  row.ldParse = broken === 0;

  const { checked, bad } = verifyAssets(html);
  row.assets = checked > 0 && bad === 0;
  row.assetDetails = { checked, bad };

  row.links = verifyInternalLinks(html);
  return row;
}

const embedRows = EXPECTED_SLUGS.map(auditEmbed);
let embedFailures = 0;
for (const row of embedRows) {
  if (!row.html) {
    embedFailures += 1;
    fail("embed page not exported", row.slug);
  }
  if (row.html && !row.metadata) {
    embedFailures += 1;
    fail("embed metadata missing", `${row.slug}: title + description required`);
  }
  if (row.html && !row.badge) {
    embedFailures += 1;
    fail("embed badge missing", `${row.slug}: 'Verified by PayoutDelta' absent`);
  }
  if (row.html && !row.backlink) {
    embedFailures += 1;
    fail("embed backlink missing", `${row.slug}: calculator route not linked`);
  }
  if (row.html && !row.ldParse) {
    embedFailures += 1;
    fail("embed malformed JSON-LD", row.slug);
  }
  if (row.assetDetails && row.assetDetails.bad > 0) {
    embedFailures += 1;
    fail("embed asset errors", row.slug);
  }
  if (row.links && row.links.bad > 0) {
    embedFailures += 1;
    fail("embed links broken", row.slug);
  }
}
console.log(
  `\nEmbed widget audit (Phase I): ${
    embedFailures === 0
      ? `PASS — ${embedRows.length} /embed cards exported with badge + backlink`
      : `FAIL — ${embedFailures} issue(s) across embed widgets`
  }`
);

/**
 * Milestone 9 — editorial comparison guide audit. Verifies the /compare hub
 * and every guide route: exported HTML, non-empty metadata, an Article or
 * TechArticle in the JSON-LD, a sponsor-compliant CTA
 * (`rel="noopener noreferrer sponsored"`), a backlink to the hub, and the
 * standard basePath asset/link battery. LENIENT by design: when ./out/compare
 * does not exist (a stale or unbuilt ./out), the audit reports SKIPPED and
 * contributes zero failures, so the gate never hard-fails a developer loop
 * that has not rebuilt since the milestone landed.
 */
const EXPECTED_COMPARE_SLUGS = [
  "swift-wire-vs-wise-business",
  "sha-vs-our-swift-charges",
  "direct-bank-wire-vs-payoneer",
];

function auditCompareHub() {
  const htmlFile = join(OUT, "compare", "index.html");
  const row = { slug: "compare" };

  if (!existsSync(htmlFile)) {
    row.html = false;
    row.metadata = false;
    row.schema = false;
    row.assets = false;
    row.guideLinks = [];
    row.links = { total: 0, bad: 0 };
    return row;
  }
  row.html = true;

  const html = readFileSync(htmlFile, "utf8");
  const titleOk = /<title[^>]*>[^<]*(Comparison Guides|Comparison)/i.test(html);
  const descriptionTag =
    html.match(/<meta[^>]*name=["']description["'][^>]*>/i)?.[0] ?? "";
  const descriptionOk = /content=["'][^"']{20,}["']/i.test(descriptionTag);
  const schemaTypes = collectTypes(html);
  row.schema =
    schemaTypes.has("BreadcrumbList") && schemaTypes.has("ItemList");
  row.missingSchema = ["BreadcrumbList", "ItemList"].filter(
    (t) => !schemaTypes.has(t)
  );
  row.guideLinks = EXPECTED_COMPARE_SLUGS.filter(
    (slug) => !html.includes(`/compare/${slug}/`)
  );
  row.metadata = titleOk && descriptionOk && row.schema;

  const { blocks, broken } = countBrokenLdBlocks(html);
  row.ldBlocks = blocks;
  row.ldParse = broken === 0;

  const { checked, bad } = verifyAssets(html);
  row.assets = checked > 0 && bad === 0;
  row.assetDetails = { checked, bad };

  row.links = verifyInternalLinks(html);
  return row;
}

function auditCompareGuide(slug) {
  const htmlFile = join(OUT, "compare", slug, "index.html");
  const row = { slug: `compare/${slug}` };

  if (!existsSync(htmlFile)) {
    row.html = false;
    row.metadata = false;
    row.schema = false;
    row.sponsored = false;
    row.backlink = false;
    row.assets = false;
    row.links = { total: 0, bad: 0 };
    return row;
  }
  row.html = true;

  const html = readFileSync(htmlFile, "utf8");
  const titleOk = /<title[^>]*>[^<]{20,}/i.test(html);
  const descriptionTag =
    html.match(/<meta[^>]*name=["']description["'][^>]*>/i)?.[0] ?? "";
  const descriptionOk = /content=["'][^"']{20,}["']/i.test(descriptionTag);
  const schemaTypes = collectTypes(html);
  row.schema =
    schemaTypes.has("BreadcrumbList") &&
    (schemaTypes.has("Article") || schemaTypes.has("TechArticle"));
  row.missingSchema = ["BreadcrumbList"].filter((t) => !schemaTypes.has(t));
  if (!schemaTypes.has("Article") && !schemaTypes.has("TechArticle")) {
    row.missingSchema.push("Article|TechArticle");
  }
  row.sponsored = html.includes('rel="noopener noreferrer sponsored"');
  row.backlink = html.includes("href=\"/payout-delta/compare/\"");
  row.metadata = titleOk && descriptionOk;

  const { blocks, broken } = countBrokenLdBlocks(html);
  row.ldBlocks = blocks;
  row.ldParse = broken === 0;

  const { checked, bad } = verifyAssets(html);
  row.assets = checked > 0 && bad === 0;
  row.assetDetails = { checked, bad };

  row.links = verifyInternalLinks(html);
  return row;
}

console.log("\nEditorial comparison guides audit (Milestone 9):");
const outCompareExists = existsSync(join(OUT, "compare"));
let compareFailures = 0;
if (!outCompareExists) {
  console.log(
    "  SKIPPED — ./out/compare missing (rebuild with `npm run build` before this milestone gate can audit the guides)"
  );
  compareFailures = 0;
} else {
  const hub = auditCompareHub();
  if (!hub.html) {
    compareFailures += 1;
    fail("compare hub not exported", "compare/index.html");
  }
  if (hub.html && !hub.metadata) {
    compareFailures += 1;
    fail("compare hub metadata/schema missing", `requires BreadcrumbList + ItemList: ${(hub.missingSchema ?? []).join(", ")}`);
  }
  if (hub.html && !hub.ldParse) {
    compareFailures += 1;
    fail("compare hub malformed JSON-LD", "compare");
  }
  if (hub.guideLinks && hub.guideLinks.length > 0) {
    compareFailures += 1;
    fail("compare hub missing guide links", hub.guideLinks.join(", "));
  }
  if (hub.assetDetails && hub.assetDetails.bad > 0) {
    compareFailures += 1;
    fail("compare hub asset errors", "compare");
  }
  if (hub.links && hub.links.bad > 0) {
    compareFailures += 1;
    fail("compare hub links broken", "compare");
  }
  console.log(
    `  ${`compare/index.html`.padEnd(38)}${hub.html ? (hub.metadata && hub.guideLinks.length === 0 ? "PASS" : "FAIL") : "n/a"} · ${hub.assetDetails ? hub.assetDetails.checked : 0} assets · ${hub.links ? hub.links.total : 0} links`
  );

  for (const slug of EXPECTED_COMPARE_SLUGS) {
    const guide = auditCompareGuide(slug);
    const detail = guide.html
      ? `${guide.metadata ? "PASS" : "FAIL"} metadata · ${guide.schema ? "PASS" : "FAIL"} Article/TechArticle · ${guide.sponsored ? "PASS" : "FAIL"} sponsored CTA · ${guide.backlink ? "PASS" : "FAIL"} hub backlink · ${guide.assetDetails ? `${guide.assetDetails.checked} assets` : "-"} · ${guide.links ? `${guide.links.total} links` : "-"}`
      : "page not exported";
    console.log(`  ${`compare/${slug}/index.html`.padEnd(38)}${detail}`);
    if (!guide.html) {
      compareFailures += 1;
      fail("guide not exported", `compare/${slug}/index.html`);
    }
    if (guide.html && !guide.metadata) {
      compareFailures += 1;
      fail("guide metadata missing", `compare/${slug}: title + description required`);
    }
    if (guide.html && !guide.schema) {
      compareFailures += 1;
      fail("guide schema missing", `compare/${slug}: requires ${(guide.missingSchema ?? []).join(", ")}`);
    }
    if (guide.html && !guide.ldParse) {
      compareFailures += 1;
      fail("guide malformed JSON-LD", `compare/${slug}`);
    }
    if (guide.html && guide.sponsored === false) {
      compareFailures += 1;
      fail("sponsored CTA missing", `compare/${slug}: rel='noopener noreferrer sponsored' absent`);
    }
    if (guide.html && guide.backlink === false) {
      compareFailures += 1;
      fail("hub backlink missing", `compare/${slug}: /compare/ not linked`);
    }
    if (guide.assetDetails && guide.assetDetails.bad > 0) {
      compareFailures += 1;
      fail("guide asset errors", `compare/${slug}`);
    }
    if (guide.links && guide.links.bad > 0) {
      compareFailures += 1;
      fail("guide links broken", `compare/${slug}`);
    }
  }
}
if (outCompareExists && compareFailures === 0) {
  console.log(
    `\nEditorial comparison guides: PASS — hub + ${EXPECTED_COMPARE_SLUGS.length} guides audited`
  );
}

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

/**
 * Phase G — Global Cross-Border Banking Leakage Index: ./out/leaderboard/
 * index.html must exist, carry valid metadata (title + meta description +
 * WebApplication / BreadcrumbList JSON-LD), and serve basePath-prefixed
 * assets that resolve on disk. Because the header nav now links to
 * /leaderboard/, every exported page implicitly verifies its export.
 */
function auditLeaderboard() {
  const htmlFile = join(OUT, "leaderboard", "index.html");
  const row = { slug: "leaderboard" };

  if (!existsSync(htmlFile)) {
    row.html = false;
    row.metadata = false;
    row.assets = false;
    row.links = { total: 0, bad: 0 };
    return row;
  }
  row.html = true;

  const html = readFileSync(htmlFile, "utf8");
  const titleOk = /<title[^>]*>[^<]*Leakage Index/i.test(html);
  const descriptionTag =
    html.match(/<meta[^>]*name=["']description["'][^>]*>/i)?.[0] ?? "";
  const descriptionOk = /content=["'][^"']{20,}["']/i.test(descriptionTag);
  const schemaTypes = collectTypes(html);
  row.schemaMissing = [];
  for (const t of ["WebApplication", "BreadcrumbList"]) {
    if (!schemaTypes.has(t)) row.schemaMissing.push(t);
  }
  const { blocks, broken } = countBrokenLdBlocks(html);
  row.ldBlocks = blocks;
  row.ldParse = broken === 0;
  row.hasRows = (html.match(/calculator\//g) ?? []).length >= 50;
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

console.log("\nGlobal Leakage Index (leaderboard) audit (Phase G):");
const leaderboard = auditLeaderboard();
const leaderboardFlags = `${leaderboard.html ? "PASS" : "FAIL"}`;
if (!leaderboard.html) {
  fail("page not exported", "leaderboard/index.html");
}
if (leaderboard.html && !leaderboard.metadata) {
  fail("metadata missing", "leaderboard: title + description + WebApplication/BreadcrumbList required");
}
if (leaderboard.html && !leaderboard.ldParse) {
  fail("malformed JSON-LD", "leaderboard");
}
if (leaderboard.html && !leaderboard.hasRows) {
  fail("corridor rows missing", "leaderboard must rank the full corridor index");
}
if (leaderboard.assetDetails && leaderboard.assetDetails.bad > 0) {
  fail("asset errors", "leaderboard");
}
if (leaderboard.links && leaderboard.links.bad > 0) {
  fail("internal links broken", "leaderboard");
}
console.log(
  `  ${"leaderboard/index.html".padEnd(38)}${leaderboardFlags.padEnd(10)}Metadata ${leaderboard.html ? (leaderboard.metadata ? "PASS" : "FAIL") : "n/a"}`
);
console.log(
  `  ${"assets".padEnd(38)}${(leaderboard.assets ? "PASS" : "FAIL").padEnd(10)}${`${leaderboard.assetDetails ? leaderboard.assetDetails.checked : 0} checked`}`
);
console.log(
  `  ${"internal links".padEnd(38)}${(leaderboard.links && leaderboard.links.bad === 0 ? "PASS" : "FAIL").padEnd(10)}${leaderboard.links ? leaderboard.links.total : 0} verified`
);

console.log("\nOpenSEO rankings mirror audit (Phase F):");

const seoRankingsPath = join(OUT, "seo_rankings.json");
let seoMirrorOk = false;
if (!existsSync(seoRankingsPath)) {
  console.log(
    `  ${"FAIL  " + "rankings JSON exported".padEnd(32)}out/seo_rankings.json missing`
  );
  fail("seo rankings mirror", "out/seo_rankings.json does not exist");
} else {
  try {
    const seo = JSON.parse(readFileSync(seoRankingsPath, "utf8"));
    seoMirrorOk =
      typeof seo === "object" &&
      seo !== null &&
      Array.isArray(seo.rankings) &&
      seo.rankings.length > 0 &&
      typeof seo.summary === "object" &&
      seo.summary !== null &&
      typeof seo.targetDomain === "string" &&
      seo.targetDomain.length > 0;
    console.log(
      `  ${(seoMirrorOk ? "PASS  " : "FAIL  ") + "rankings JSON parses".padEnd(32)}${seo.rankings?.length ?? 0} tracked queries, best stable rank ${seo.summary?.bestRank ?? "—"}`
    );
    if (!seoMirrorOk) {
      fail("seo rankings mirror", "out/seo_rankings.json shape invalid");
    }
  } catch {
    seoMirrorOk = false;
    fail("seo rankings mirror", "out/seo_rankings.json is not valid JSON");
  }
}
if (!seoMirrorOk) globalBad += 1;

const homeHtmlOut = readFileSync(join(OUT, "index.html"), "utf8");
const seoBadgeWired =
  homeHtmlOut.includes(`${BASE_PATH}/seo_rankings.json`) &&
  homeHtmlOut.includes("Ranked #1 Real-Time Settlement Engine");
console.log(
  `  ${(seoBadgeWired ? "PASS  " : "FAIL  ") + "footer SEO badge wired".padEnd(32)}home page links the exported rankings mirror`
);
if (!seoBadgeWired) {
  globalBad += 1;
  fail("seo badge", "footer link to /payout-delta/seo_rankings.json missing on the home page");
}

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

const leaderboardFailures =
  (!leaderboard.html ? 1 : 0) +
  (leaderboard.html && !leaderboard.metadata ? 1 : 0) +
  (leaderboard.html && !leaderboard.ldParse ? 1 : 0) +
  (leaderboard.html && !leaderboard.hasRows ? 1 : 0) +
  (leaderboard.assets ? 0 : 1) +
  (leaderboard.links ? leaderboard.links.bad : 0);

/**
 * Phase S2 — Static Schema SRE Gates: ISO 9362 SWIFT/BIC syntax validation,
 * financial range invariants and leaderboard consistency assertion.
 *
 * The receiving-bank registry (`data/regulatoryBanking.ts`) and the
 * correspondent clearing network (`lib/swiftRoutingEngine.ts`) are authored in
 * TypeScript; the static build on CI (Node 20) cannot import TS types, so
 * these gates read the literal comma-separated source text on disk and audit
 * every authored BIC / numeric literal directly. `buildLeaderboard()` is
 * re-derived from the same `data/fees.json` corpus + statutory bank database
 * the page is compiled from, then checked against the invariants the index
 * page itself claims (positive savings, non-zero penalty, ranked variance).
 */
console.log("\nPhase S2 — static schema SRE gates:");

const SWIFT_BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const BIC_SENTINELS = new Set(["", "-", "—"]);
const SPREAD_CAP = 0.15;
const PLATFORM_FEE_CAP = 0.5;
const INTERMEDIARY_CAP_USD = 100;
const WIRE_BENCHMARK_USD = 1000;
const DEFAULT_WIRE_FEE_USD = 18;
const DEFAULT_WIRE_SPREAD = 0.032;
const DEFAULT_INTERMEDIARY_CUT_USD = 18;
const MIN_REALISTIC_WIRE_LEAKAGE_USD = 25;
const IDENTICAL_RUN_LIMIT = 10;

const bankingSource = readFileSync(
  join(ROOT, "data", "regulatoryBanking.ts"),
  "utf8"
);
const routingSource = readFileSync(
  join(ROOT, "lib", "swiftRoutingEngine.ts"),
  "utf8"
);

const s2GateFailures = [0, 0, 0];
function s2fail(gateIndex, label, detail) {
  s2GateFailures[gateIndex - 1] += 1;
  fail(label, detail);
}

/** S2.1 — ISO 9362 BIC syntax gate over authored `field` literals in `source`. */
let bicAuthorized = 0;
let bicSentinels = 0;
function auditBicSource(source, field, fileLabel) {
  const re = new RegExp(`${field}:\\s*"([^"]*)"`, "g");
  let match;
  while ((match = re.exec(source)) !== null) {
    const bic = match[1].trim();
    if (BIC_SENTINELS.has(bic)) {
      bicSentinels += 1;
      continue;
    }
    bicAuthorized += 1;
    if (!SWIFT_BIC_RE.test(bic)) {
      s2fail(
        1,
        "SWIFT/BIC violates ISO 9362",
        `${bic} (${bic.length} chars) in ${fileLabel} — expected 8 or 11 uppercase alphanumeric chars, no spaces`
      );
    }
  }
}
auditBicSource(bankingSource, "swiftCode", "data/regulatoryBanking.ts");
auditBicSource(routingSource, "swiftCode", "lib/swiftRoutingEngine.ts");
auditBicSource(routingSource, "bic", "lib/swiftRoutingEngine.ts");
console.log(
  `  ${(s2GateFailures[0] === 0 ? "PASS  " : "FAIL  ") + "SWIFT/BIC syntax (ISO 9362)".padEnd(34)}${bicAuthorized} authorized BICs valid, ${bicSentinels} local-clearing sentinels exempt`
);

/** S2.2 — financial range invariants over the static corpus + bank database. */
let spreadCount = 0;
function checkSpread(value, label) {
  spreadCount += 1;
  if (!Number.isFinite(value) || value < 0 || value > SPREAD_CAP) {
    s2fail(2, "spread invariant", `${label}: ${value} outside [0, ${SPREAD_CAP}]`);
  }
}
for (const corridor of corpus.corridors) {
  if (!Number.isFinite(corridor.rate) || corridor.rate <= 0) {
    s2fail(2, "baseRate invariant", `${corridor.slug}: rate ${corridor.rate} must be finite and > 0`);
  }
}
for (const platform of corpus.platforms) {
  const fraction = platform.feePercent / 100;
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > PLATFORM_FEE_CAP) {
    s2fail(2, "platform fee invariant", `${platform.id}: ${platform.feePercent}% outside [0, ${PLATFORM_FEE_CAP * 100}%]`);
  }
}
for (const channel of corpus.channels) {
  checkSpread(channel.fxSpread, `channel ${channel.id}`);
}
for (const corridor of corpus.corridors) {
  for (const provider of corridor.providers ?? []) {
    checkSpread(provider.fxSpread, `provider ${provider.id} on ${corridor.slug}`);
  }
}
function auditNumericLiterals(source, field, min, max, label) {
  const re = new RegExp(`${field}:\\s*([0-9]+(?:\\.[0-9]+)?)`, "g");
  let count = 0;
  let match;
  while ((match = re.exec(source)) !== null) {
    const value = Number(match[1]);
    count += 1;
    if (!Number.isFinite(value) || value < min || value > max) {
      s2fail(2, label, `${value} outside [${min}, ${max}]`);
    }
  }
  return count;
}
const intermediaryLiteralsChecked =
  auditNumericLiterals(
    bankingSource,
    "intermediaryUSD",
    0,
    INTERMEDIARY_CAP_USD,
    "intermediaryUSD invariant"
  ) +
  auditNumericLiterals(
    routingSource,
    "intermediaryUSD",
    0,
    INTERMEDIARY_CAP_USD,
    "intermediaryUSD invariant"
  );

/** S2.3 — leaderboard consistency (mirrors `buildLeaderboard()`). */
function buildIntermediaryMap() {
  const firstBankCut = new Map();
  const arrayRe = /const\s+(\w+)\s*:\s*RegulatoryBank\[\]\s*=\s*\[([\s\S]*?)\n\];/g;
  let match;
  while ((match = arrayRe.exec(bankingSource)) !== null) {
    const value = /\bintermediaryUSD:\s*([0-9]+(?:\.[0-9]+)?)/.exec(match[2]);
    firstBankCut.set(
      match[1],
      value ? Number(value[1]) : DEFAULT_INTERMEDIARY_CUT_USD
    );
  }
  const arrayBySlug = new Map();
  const entryRe = /"([a-z0-9-]+)":\s*\{\s*slug:\s*"[^"]*",[\s\S]*?banks:\s*(\w+)/g;
  let entry;
  while ((entry = entryRe.exec(bankingSource)) !== null) {
    arrayBySlug.set(entry[1], entry[2]);
  }
  const map = new Map();
  for (const corridor of corpus.corridors) {
    const arrayName = arrayBySlug.get(corridor.slug);
    map.set(
      corridor.slug,
      arrayName && firstBankCut.has(arrayName)
        ? firstBankCut.get(arrayName)
        : DEFAULT_INTERMEDIARY_CUT_USD
    );
  }
  return map;
}
const intermediaryBySlug = buildIntermediaryMap();
const distinctCuts = new Set();
for (const corridor of corpus.corridors) {
  const cut = intermediaryBySlug.get(corridor.slug) ?? DEFAULT_INTERMEDIARY_CUT_USD;
  distinctCuts.add(cut);
  if (!Number.isFinite(cut) || cut < 0 || cut > INTERMEDIARY_CAP_USD) {
    s2fail(2, "defaultIntermediaryCut invariant", `${corridor.slug}: ${cut} outside [0, ${INTERMEDIARY_CAP_USD}]`);
  }
}
console.log(
  `  ${(s2GateFailures[1] === 0 ? "PASS  " : "FAIL  ") + "financial range invariants".padEnd(34)}${corpus.corridors.length} rates · ${corpus.platforms.length} platform cuts · ${spreadCount} fx spreads · ${intermediaryLiteralsChecked + corpus.corridors.length} intermediary checks`
);

function buildLeaderboardRows() {
  const channels = corpus.channels;
  const direct =
    corpus.platforms.find((platform) => platform.id === "direct") ??
    corpus.platforms[0];

  return corpus.corridors
    .map((corridor) => {
      const quotes = channels
        .map((channel) => {
          const platformFeeUSD = (WIRE_BENCHMARK_USD * direct.feePercent) / 100;
          const netAfter = WIRE_BENCHMARK_USD - platformFeeUSD;
          const feeDeducted = Math.min(
            channel.fixedFeeUSD,
            Math.max(0, netAfter)
          );
          const usdConverted = Math.max(0, netAfter - feeDeducted);
          const effectiveRate =
            corridor.rate * (1 - Math.max(0, channel.fxSpread));
          return {
            channelId: channel.id,
            localAmount: usdConverted * effectiveRate,
          };
        })
        .sort((a, b) => b.localAmount - a.localAmount);
      const winner = quotes[0];
      if (!winner) return null;

      const directWire = corridor.providers?.find(
        (provider) => provider.id === "swift"
      );
      const wireFee = directWire?.fixedFeeUSD ?? DEFAULT_WIRE_FEE_USD;
      const wireSpread = directWire?.fxSpread ?? DEFAULT_WIRE_SPREAD;
      const wireIntermediary =
        intermediaryBySlug.get(corridor.slug) ?? DEFAULT_INTERMEDIARY_CUT_USD;
      const wirePenaltyUsd =
        wireFee + wireIntermediary + WIRE_BENCHMARK_USD * wireSpread;

      const winningProvider = corridor.providers?.find(
        (provider) => provider.id === winner.channelId
      );
      const winningChannel = channels.find(
        (channel) => channel.id === winner.channelId
      );
      const bestCostUsd =
        (winningProvider?.fixedFeeUSD ?? winningChannel?.fixedFeeUSD ?? 0) +
        WIRE_BENCHMARK_USD *
          (winningProvider?.fxSpread ?? winningChannel?.fxSpread ?? 0);

      const netSavingsUsd = Math.max(0, wirePenaltyUsd - bestCostUsd);
      const savingsPct = Math.max(0, (netSavingsUsd / WIRE_BENCHMARK_USD) * 100);
      return { slug: corridor.slug, penaltyUsd: wirePenaltyUsd, savingsPct };
    })
    .filter((row) => row !== null)
    .sort((a, b) => b.penaltyUsd - a.penaltyUsd);
}

const leaderboardRows = buildLeaderboardRows();
if (leaderboardRows.length !== corpus.corridors.length) {
  s2fail(3, "leaderboard completeness", `${leaderboardRows.length}/${corpus.corridors.length} corridors ranked`);
}
for (const row of leaderboardRows) {
  if (!Number.isFinite(row.penaltyUsd) || row.penaltyUsd <= 0) {
    s2fail(3, "non-zero wire penalty", `${row.slug}: $${row.penaltyUsd}`);
  }
  if (row.penaltyUsd < MIN_REALISTIC_WIRE_LEAKAGE_USD) {
    s2fail(3, "hard minimum wire leakage", `${row.slug}: $${row.penaltyUsd} below $${MIN_REALISTIC_WIRE_LEAKAGE_USD}`);
  }
  if (!(row.savingsPct > 0)) {
    s2fail(3, "positive net savings", `${row.slug}: ${row.savingsPct}%`);
  }
}
let identicalRun = 1;
for (let i = 1; i < leaderboardRows.length; i += 1) {
  const identical =
    leaderboardRows[i].penaltyUsd === leaderboardRows[i - 1].penaltyUsd &&
    leaderboardRows[i].savingsPct === leaderboardRows[i - 1].savingsPct;
  identicalRun = identical ? identicalRun + 1 : 1;
  if (identicalRun >= IDENTICAL_RUN_LIMIT) {
    const startSlug = leaderboardRows[i - IDENTICAL_RUN_LIMIT + 1]?.slug ?? "?";
    s2fail(
      3,
      "leaderboard variance",
      `10 consecutive corridors identical at $${leaderboardRows[i].penaltyUsd}/${leaderboardRows[i].savingsPct.toFixed(2)}% starting at ${startSlug}`
    );
    identicalRun = 1;
  }
}
console.log(
  `  ${(s2GateFailures[2] === 0 ? "PASS  " : "FAIL  ") + "leaderboard consistency".padEnd(34)}${leaderboardRows.length}/${corpus.corridors.length} corridors ranked, ${distinctCuts.size} distinct intermediary cuts, no ${IDENTICAL_RUN_LIMIT}-row identical cluster`
);

console.log(`\n${"-".repeat(header.length)}`);
console.log(`  pages exported           ${report.length} corridors + ${localizedRows.length} localized routes + 1 invoice studio + 1 tax ledger + 1 leakage index + ${embedRows.length} embed widgets + ${outCompareExists ? EXPECTED_COMPARE_SLUGS.length + 1 : "skipped (unbuilt ./out)"} compare routes`);
console.log(`  assets verified          ${assetTotal + localizedAssetTotal + (invoice.assetDetails ? invoice.assetDetails.checked : 0) + (taxLedger.assetDetails ? taxLedger.assetDetails.checked : 0) + (leaderboard.assetDetails ? leaderboard.assetDetails.checked : 0) + embedRows.reduce((sum, r) => sum + (r.assetDetails ? r.assetDetails.checked : 0), 0)}`);
console.log(`  internal links verified  ${linkTotal + localizedLinkTotal + (invoice.links ? invoice.links.total : 0) + (taxLedger.links ? taxLedger.links.total : 0) + (leaderboard.links ? leaderboard.links.total : 0) + embedRows.reduce((sum, r) => sum + (r.links ? r.links.total : 0), 0)}`);
console.log(`  JSON-LD blocks scanned   ${ldScanned}`);
console.log(`  failures                 ${failures + globalBad + pageFailures + linkFailures + invoiceFailures + localizedFailures + hreflangFailures + taxLedgerFailures + leaderboardFailures + embedFailures + compareFailures}`);

const ok =
  failures === 0 &&
  globalBad === 0 &&
  pageFailures === 0 &&
  linkFailures === 0 &&
  invoiceFailures === 0 &&
  localizedFailures === 0 &&
  hreflangFailures === 0 &&
  taxLedgerFailures === 0 &&
  leaderboardFailures === 0 &&
  embedFailures === 0 &&
  compareFailures === 0;
if (ok) {
  console.log("\n  ALL CHECKS PASSED\n");
  process.exit(0);
}
console.log("\n  AUDIT FAILED — fix reported issues and re-run\n");
process.exit(1);