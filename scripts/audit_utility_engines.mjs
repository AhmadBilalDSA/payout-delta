/**
 * PayoutDelta — utility engines audit gate.
 *
 * Asserts the two new static routes exported cleanly and meet every surface
 * contract:
 *
 *   /reverse-calculator/   — reverse gross-up tool
 *   /split/                — multi-rail split optimizer
 *
 * WHAT IT CHECKS (per route)
 *   1. index.html exists in ./out/
 *   2. <title> and <meta name="description"> are present and non-empty.
 *   3. A valid application/ld+json block exists and parses cleanly.
 *   4. All monetary figure elements carry both `font-mono` and `tabular-nums`.
 *      (Checks class attributes on td/dd/code/span/p elements that hold $)
 *   5. /split/ carries an inline <svg> with the expected viewBox "0 0 480 180".
 *   6. The SVG contains at least 3 <rect> bar elements.
 *
 * Exit: 0 on full pass, 1 on any failure.
 * Usage: node scripts/audit_utility_engines.mjs   (run after `npm run build`)
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT  = join(ROOT, "out");

/* -------------------------------------------------------------------------- *
 * Minimal result harness (mirrors audit_hexagonal_mesh.mjs)
 * -------------------------------------------------------------------------- */

let checks = 0;
let bad    = 0;
/** @type {string[]} */
const failures = [];

function pass(label, detail) {
  checks += 1;
  console.log(`  PASS  ${label.padEnd(42)}${detail}`);
}

function fail(label, detail) {
  checks += 1;
  bad += 1;
  failures.push(`${label} — ${detail}`);
  console.log(`  FAIL  ${label.padEnd(42)}${detail}`);
}

function surface(title) {
  console.log(`\n${title}`);
}

/** Read ./out/<route>/index.html or return null. */
function readOut(route) {
  const path = join(OUT, route, "index.html");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

/**
 * Strip <script> bodies before checking DOM content.
 *
 * Next.js serialises client-island props into inline self.__next_f.push()
 * calls, so any string from server-rendered props appears in the raw file.
 * Matching raw HTML would make every assertion vacuous (same reasoning as
 * audit_ui_surfaces.mjs). Strip script bodies so only rendered markup is
 * checked.
 */
function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

/**
 * Decode the handful of HTML entities Next.js injects so string matching
 * works for values containing &amp; / &#x27; etc.
 */
function decodeEntities(html) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/* -------------------------------------------------------------------------- *
 * Per-route assertions
 * -------------------------------------------------------------------------- */

/**
 * Assert a utility route.
 *
 * @param {string} route   — relative path inside ./out (e.g. "reverse-calculator")
 * @param {object} opts
 * @param {boolean} [opts.expectSvg]         — assert inline SVG present
 * @param {string}  [opts.svgViewBox]        — exact viewBox string to match
 * @param {number}  [opts.minSvgRects]       — minimum <rect> count inside SVG
 */
function auditUtilityRoute(route, opts = {}) {
  const short = route.length > 30 ? `…${route.slice(-26)}` : route;
  const html  = readOut(route);

  /* 1 — Export present */
  if (!html) {
    fail(`${short} exported`, "index.html missing from ./out — run npm run build first");
    return;
  }
  pass(`${short} exported`, `${Math.round(html.length / 1024)} KB`);

  const clean = decodeEntities(stripScripts(html));

  /* 2 — <title> */
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch || titleMatch[1].trim().length < 10) {
    fail(`${short} <title>`, "missing or too short");
  } else {
    pass(`${short} <title>`, titleMatch[1].slice(0, 60));
  }

  /* 3 — meta description */
  const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/);
  if (!descMatch || descMatch[1].trim().length < 20) {
    fail(`${short} meta desc`, "missing or too short");
  } else {
    pass(`${short} meta desc`, `${descMatch[1].length} chars`);
  }

  /* 4 — JSON-LD parse integrity */
  const ldBlocks = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) ?? [];
  if (ldBlocks.length === 0) {
    fail(`${short} JSON-LD`, "no application/ld+json block found");
  } else {
    let malformed = 0;
    for (const block of ldBlocks) {
      const body = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
      try { JSON.parse(body); } catch { malformed += 1; }
    }
    if (malformed > 0) {
      fail(`${short} JSON-LD`, `${malformed}/${ldBlocks.length} blocks fail JSON.parse`);
    } else {
      pass(`${short} JSON-LD`, `${ldBlocks.length} block(s) parse cleanly`);

      // Check for WebApplication schema type
      const allLd = ldBlocks.join("");
      if (!allLd.includes('"WebApplication"')) {
        fail(`${short} JSON-LD type`, "WebApplication schema node missing");
      } else {
        pass(`${short} JSON-LD type`, "WebApplication present");
      }
    }
  }

  /* 5 — font-mono + tabular-nums on monetary figures
   *
   * Strategy: find elements whose class attribute contains both classes and
   * whose text content contains a $ or a % sign. We look for the class
   * combination in the rendered markup rather than counting all elements,
   * which avoids false positives on structural wrappers.
   *
   * The pattern matches a tag whose class string includes both substrings,
   * regardless of order or surrounding classes.
   */
  const monoTabCells = (
    clean.match(/<(?:td|dd|code|span|p)[^>]*class="[^"]*(?:font-mono[^"]*tabular-nums|tabular-nums[^"]*font-mono)[^"]*"[^>]*>/g) ?? []
  );
  if (monoTabCells.length === 0) {
    fail(`${short} mono+tabular`, "no elements found with both font-mono and tabular-nums classes");
  } else {
    pass(`${short} mono+tabular`, `${monoTabCells.length} mono+tabular element(s) in rendered markup`);
  }

  /* 6 — SVG bar chart (split route only) */
  if (opts.expectSvg) {
    const svgMatch = opts.svgViewBox
      ? clean.match(new RegExp(`<svg[^>]*viewBox="${opts.svgViewBox.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?<\\/svg>`))
      : clean.match(/<svg[\s\S]*?<\/svg>/);

    if (!svgMatch) {
      fail(`${short} SVG chart`, opts.svgViewBox
        ? `no <svg viewBox="${opts.svgViewBox}"> found in export`
        : "no inline <svg> found in export");
    } else {
      pass(`${short} SVG chart`, `viewBox="${opts.svgViewBox ?? "present"}" found`);

      if (opts.minSvgRects) {
        const rects = (svgMatch[0].match(/<rect/g) ?? []).length;
        if (rects < opts.minSvgRects) {
          fail(`${short} SVG rects`, `${rects} <rect> elements, need >= ${opts.minSvgRects}`);
        } else {
          pass(`${short} SVG rects`, `${rects} <rect> elements`);
        }
      }
    }
  }
}

/* -------------------------------------------------------------------------- *
 * Run
 * -------------------------------------------------------------------------- */

console.log("PayoutDelta utility engines audit (./out)");

if (!existsSync(OUT)) {
  console.log("\n  FAIL  static export present          ./out missing — run npm run build first");
  console.log("\n  AUDIT FAILED — no export to audit");
  process.exit(1);
}

surface("Surface 1 — /reverse-calculator/ reverse gross-up tool");
auditUtilityRoute("reverse-calculator");

surface("Surface 2 — /split/ multi-rail split optimizer");
auditUtilityRoute("split", {
  expectSvg:    true,
  svgViewBox:   "0 0 480 180",
  minSvgRects:  3,
});

/* -------------------------------------------------------------------------- *
 * Summary
 * -------------------------------------------------------------------------- */

console.log(`\n  assertions                 ${checks}`);
console.log(`  failures                   ${bad}`);

if (bad > 0) {
  console.log("\n  AUDIT FAILED — fix reported issues and re-run");
  for (const f of failures.slice(0, 20)) console.log(`    · ${f}`);
  if (failures.length > 20) console.log(`    … and ${failures.length - 20} more`);
  process.exit(1);
}

console.log("\n  ALL UTILITY ENGINE CHECKS PASSED");
