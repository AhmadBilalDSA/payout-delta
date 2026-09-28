/**
 * PayoutDelta — hexagonal sovereign mesh audit (Phase 7).
 *
 * WHAT THIS GATE IS FOR
 * The four-layer sovereign dossier is assembled from four registries and is
 * therefore exposed to the same class of silent failure as the registry seam
 * itself: everything renders, nothing is wrong-looking, and the thing that
 * broke is the property nobody re-read by eye. Two of those properties are
 * *content* properties and cannot be caught by a parse check:
 *
 *   - an AEO block that has drifted outside its word budget, and
 *   - a routing SVG whose viewBox clips the third hop.
 *
 * Both were real during development. The word-budget guard was unguarded
 * against its own fallback and trimmed a block to 34 words, failing the floor
 * it was written to protect. So this gate measures the rendered artifact, not
 * the source, and it measures *the answer block* rather than the section that
 * contains it — a `<section id="quick-verdict">` also carries three labels, an
 * authority name and a stamp, and counting those would assert a budget no block
 * could satisfy.
 *
 * SCOPE. Every bank route (`/banks/<slug>/`) and the tax-clearance route, which
 * are the two inbound adapters of `lib/hexagonalDossier.ts`. A market dossier
 * is asserted per route, not per jurisdiction: 195 jurisdictions are built into
 * the tax route's featured selection, and asserting all 195 appear in the HTML
 * would assert a page the design deliberately does not print.
 *
 * Usage:  node scripts/audit_hexagonal_mesh.mjs
 * Exit:   0 when every assertion passes, 1 otherwise.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Static export root. Every route below is relative to it, without the
 *  deployment prefix — the prefix is applied by the host, not present in the
 *  exported tree, so asserting against it here would assert against nothing. */
const OUT = join(ROOT, "out");

/* -------------------------------------------------------------------------- *
 * Tiny result harness
 * -------------------------------------------------------------------------- */

let checks = 0;
let bad = 0;
const failures = [];

function pass(label, detail) {
  checks += 1;
  console.log(`  PASS  ${label.padEnd(38)}${detail}`);
}

function fail(label, detail) {
  checks += 1;
  bad += 1;
  failures.push(`${label} — ${detail}`);
  console.log(`  FAIL  ${label.padEnd(38)}${detail}`);
}

function surface(title) {
  console.log(`\n${title}`);
}

function readOut(route) {
  const path = join(OUT, route, "index.html");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

/**
 * Strip tags and decode the handful of entities React escapes into text nodes.
 *
 * A word count taken over raw HTML counts class names and attribute values, which
 * would report a 15-word block as a 60-word one — so the count is taken over
 * text, the same string a reader or an answer engine actually receives.
 */
function textOf(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (text) => text.split(/\s+/).filter(Boolean).length;

/* -------------------------------------------------------------------------- *
 * The four assertions, applied per route
 * -------------------------------------------------------------------------- */

/**
 * Assert one dossier route.
 *
 * Each check is reported per route rather than aggregated, because the useful
 * failure message is "these 4 routes lost their verdict block", not "a route
 * somewhere failed" — this gate runs over 267 routes and a bare failure count
 * would send the reader hunting.
 */
function auditDossierRoute(route, kind) {
  const html = readOut(route);
  if (!html) {
    fail(`${route} exported`, "index.html missing from the static export");
    return;
  }
  const short = route.length > 44 ? `…${route.slice(-40)}` : route;

  /* -- 1. The AEO extraction layer ---------------------------------------- */
  if (!html.includes('id="quick-verdict"')) {
    fail(`${short} quick-verdict`, "no <section id=\"quick-verdict\"> in the export");
  } else {
    // The block is the `data-hex-aeo` paragraph, not the enclosing section.
    const block = html.match(/<p[^>]*data-hex-aeo="verdict"[^>]*>([\s\S]*?)<\/p>/);
    if (!block) {
      fail(
        `${short} quick-verdict`,
        "section present but the data-hex-aeo answer block is missing"
      );
    } else {
      const text = textOf(block[1]);
      const count = words(text);
      if (count < 35 || count > 65) {
        fail(
          `${short} answer budget`,
          `${count} words, need 35-65 (the kernel targets 45-50)`
        );
      } else {
        pass(`${short} answer budget`, `${count} words in 35-65`);
      }
      if (text.length < 80) {
        fail(`${short} answer text`, `block is ${text.length} chars — too thin to quote`);
      }
    }
  }

  /* -- 2. The data ledger: mono + tabular on every figure ------------------ */
  const ledger = html.match(/<table[^>]*class="[^"]*hex-ledger[^"]*"[\s\S]*?<\/table>/);
  if (!ledger) {
    fail(`${short} data ledger`, "no .hex-ledger <table> in the export");
  } else {
    // Every value cell in the ledger body must carry both numeric classes.
    // `tabular-nums` without `font-mono` gives aligned digits in a proportional
    // face; `font-mono` without `tabular-nums` gives a monospace face whose
    // advance widths still differ for glyphs like `.` and `%`. Both are needed,
    // so both are asserted rather than either.
    //
    // Counted against the row count, not against the raw <td> count: every row
    // contributes THREE cells (a <th scope="row"> label, a <td> value and a <td>
    // basis), so the basis column alone makes "all <td>" the wrong denominator.
    // An earlier version of this check used a fixed offset and reported 10/18 on
    // a table that was in fact correct on all ten rows.
    const valueCells = ledger[0].match(/<td[^>]*font-mono[^>]*tabular-nums[^>]*>/g) ?? [];
    const bodyRows =
      (ledger[0].match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr/g) ?? []).length;
    if (bodyRows === 0) {
      fail(`${short} data ledger`, "ledger rendered no rows");
    } else if (valueCells.length < bodyRows) {
      fail(
        `${short} mono figures`,
        `${valueCells.length}/${bodyRows} value cells lack font-mono + tabular-nums`
      );
    } else {
      pass(
        `${short} mono figures`,
        `${valueCells.length} value cells carry font-mono + tabular-nums across ${bodyRows} rows`
      );
    }
    if (!/<caption/.test(ledger[0])) {
      fail(`${short} ledger caption`, "no <caption> — the table is unlabelled for a11y");
    }
  }

  /* -- 3. The vector routing map ------------------------------------------- */
  // Located by the hex mesh's own viewBox, not by "the first <svg> on the
  // page" — the bank route also carries the commercial `BankRoutingDiagram`,
  // and a positional match would assert against whichever happened to render
  // first.
  const mesh = html.match(/<svg[^>]*viewBox="0 0 824 224"[\s\S]*?<\/svg>/);
  if (!mesh) {
    fail(`${short} routing map`, "no inline <svg viewBox=\"0 0 824 224\"> found");
  } else {
    const viewBox = mesh[0].match(/viewBox="0 0 (\d+) (\d+)"/);
    const width = Number(viewBox[1]);
    const height = Number(viewBox[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      fail(`${short} viewBox`, `degenerate viewBox "0 0 ${viewBox[1]} ${viewBox[2]}"`);
    } else if (width < 820) {
      // The third box runs from x=592 to x=824; a narrower viewBox clips it.
      fail(
        `${short} viewBox`,
        `width ${width} clips hop 2 (needs >= 820 for the 592..824 box)`
      );
    } else {
      pass(`${short} viewBox`, `0 0 ${width} ${height} fits all three hop boxes`);
    }

    const hops = ["Hop 0", "Hop 1", "Hop 2"].filter((hop) => mesh[0].includes(hop));
    const textNodes = (mesh[0].match(/<text/g) ?? []).length;
    if (hops.length !== 3) {
      fail(`${short} hop labels`, `${hops.length}/3 hop roles labelled (need all three)`);
    } else {
      pass(`${short} hop labels`, `${hops.length}/3 hop roles, ${textNodes} <text> nodes`);
    }

    // Directional connectors. Every mesh needs the arrowhead marker; a dashed
    // stroke is required only where the registry actually leaves a leg
    // unevidenced, and is then required on the FIRST connector — the
    // origin→correspondent hop. Asserting a dashed stroke unconditionally was
    // wrong and failed every tier-1 self-clearing hub, which has no open leg.
    // The amber node fill is the marker for "this hop is unevidenced", so the
    // pair is checked against each other rather than against the whole route.
    const hasUnresolvedHop = /fill-amber-500/.test(mesh[0]);
    if (!/marker-end="url\(#hex-hop\)"/.test(mesh[0])) {
      fail(`${short} connectors`, "no directional marker-end on the hop connectors");
    } else if (hasUnresolvedHop && !/stroke-dasharray="5 4"/.test(mesh[0])) {
      fail(
        `${short} connectors`,
        "an unevidenced hop is drawn as a solid leg — the open leg must be dashed"
      );
    } else if (hasUnresolvedHop) {
      pass(`${short} connectors`, "unevidenced hop drawn with a dashed leg");
    } else {
      pass(`${short} connectors`, "directional, all legs evidenced (solid)");
    }
  }

  /* -- 4. JSON-LD parse integrity ------------------------------------------ */
  const blocks = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) ?? [];
  if (blocks.length === 0) {
    fail(`${short} JSON-LD`, "no application/ld+json blocks in the export");
  } else {
    let malformed = 0;
    for (const block of blocks) {
      const body = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
      try {
        JSON.parse(body);
      } catch {
        malformed += 1;
      }
    }
    if (malformed > 0) {
      fail(`${short} JSON-LD`, `${malformed}/${blocks.length} blocks fail JSON.parse`);
    } else {
      pass(`${short} JSON-LD`, `${blocks.length} blocks parse`);
    }

    // The sovereign graph is the point of the kernel, so its three node types
    // are asserted present rather than assumed from "it parsed".
    const allLd = blocks.join("");
    const missing = ["FinancialProduct", "GovernmentService", "FAQPage"].filter(
      (type) => !allLd.includes(`"${type}"`)
    );
    if (missing.length > 0) {
      fail(`${short} sovereign graph`, `missing node type(s): ${missing.join(", ")}`);
    } else {
      pass(`${short} sovereign graph`, "FinancialProduct + GovernmentService + FAQPage");
    }
  }

  /* -- 5. Print layer ------------------------------------------------------ */
  if (!html.includes("hex-dossier-sheet")) {
    fail(`${short} print layer`, "no .hex-dossier-sheet in the export");
  } else {
    const sheet = html.match(/<section[^>]*hex-dossier-sheet[\s\S]*?<\/section>/);
    const stamp = sheet ? sheet[0].match(/PD-SOV-[0-9A-F]{4}-[0-9A-F]{8}/) : null;
    if (!stamp) {
      fail(`${short} print stamp`, "no FNV-1a PD-SOV-XXXX-XXXXXXXX stamp in the sheet");
    } else if (!/hex-signoff/.test(sheet[0])) {
      fail(`${short} sign-off`, "print sheet has no signature sign-off block");
    } else {
      pass(`${short} print layer`, `stamp ${stamp[0]} + sign-off present`);
    }
  }

  void kind;
}

/* -------------------------------------------------------------------------- *
 * Run
 * -------------------------------------------------------------------------- */

console.log("PayoutDelta hexagonal sovereign mesh audit (./out)");

if (!existsSync(OUT)) {
  console.log("\n  FAIL  static export present        ./out missing — run npm run build first");
  console.log("\n  AUDIT FAILED — no export to audit");
  process.exit(1);
}

/* -- Surface 1: every bank route -------------------------------------------- */
surface("Surface 1 — /banks/<slug>/ sovereign dossier (all routes)");
const banksDir = join(OUT, "banks");
const bankRoutes = readdirSync(banksDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `banks/${entry.name}`)
  .filter((route) => existsSync(join(OUT, route, "index.html")));

if (bankRoutes.length === 0) {
  fail("bank routes discovered", "no /banks/<slug>/ routes in the export");
} else {
  for (const route of bankRoutes) auditDossierRoute(route, "bank");
  console.log(
    `\n  bank routes audited        ${bankRoutes.length} (expected 266 verified heads)`
  );
}

/* -- Surface 2: the tax-clearance country dossier --------------------------- */
surface("Surface 2 — /tax-clearance/ country-scoped dossier");
auditDossierRoute("tax-clearance", "country");

/* -- Surface 3: the print stylesheet actually shipped ----------------------- */
surface("Surface 3 — print contract in the exported stylesheet");
/**
 * The exported CSS sits in `_next/static/chunks/`, not directly in
 * `_next/static/`. Both levels are read explicitly rather than with a
 * `recursive: true` walk: this is a verification script, so the set of paths it
 * inspects should be a fixed, readable list rather than whatever a walker
 * happens to find under `out/`.
 */
const staticDir = join(OUT, "_next", "static");
const chunksDir = join(staticDir, "chunks");
const cssFiles = [];
for (const dir of [staticDir, chunksDir]) {
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".css")) {
      cssFiles.push(join(dir, entry.name));
    }
  }
}
if (cssFiles.length === 0) {
  fail("print stylesheet", `no exported CSS bundle found under _next/static{,/chunks}`);
} else {
  const css = cssFiles.map((file) => readFileSync(file, "utf8")).join("\n");
  const rules = [
    ["@media print", "no @media print block in the exported stylesheet"],
    [".hex-dossier-sheet", "no .hex-dossier-sheet print rule"],
    [".hex-ledger", "no .hex-ledger print rule"],
    ["table-header-group", "ledger column heads do not repeat across pages"],
    ["counter(pages)", "no native page numbering in the print layer"],
  ];
  for (const [needle, message] of rules) {
    if (css.includes(needle)) {
      pass("print stylesheet", `${needle} present in ${cssFiles.length} bundle(s)`);
    } else {
      fail("print stylesheet", message);
    }
  }
}

/* -------------------------------------------------------------------------- *
 * Summary
 * -------------------------------------------------------------------------- */

console.log(`\n  assertions                 ${checks}`);
console.log(`  failures                   ${bad}`);

if (bad > 0) {
  console.log("\n  AUDIT FAILED — fix reported issues and re-run");
  for (const failure of failures.slice(0, 25)) console.log(`    · ${failure}`);
  if (failures.length > 25) {
    console.log(`    … and ${failures.length - 25} more`);
  }
  process.exit(1);
}

console.log("\n  ALL HEX MESH CHECKS PASSED");
