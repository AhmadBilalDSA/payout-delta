/**
 * PayoutDelta — headless UI/DOM audit over the static export.
 *
 * `scripts/test_corridors.mjs` audits the *corridor* surfaces: JSON-LD parse
 * integrity, asset prefixing, internal-link resolution, hreflang wiring. This
 * script audits the *registry* surfaces, and it exists because those two features
 * are client islands whose entire value is what actually lands in the DOM. A
 * green corridor audit says nothing about whether the 195-state listbox really
 * rendered 195 options, or whether a bank dossier really drew its routing
 * diagram — a regression that drops the roster, or renders a diagram with a
 * clipped viewBox, passes every other gate in this repository silently.
 *
 * WHAT IT ASSERTS
 *   Surface 1  /tax-clearance/   195 sovereign states present in the listbox
 *                               DOM (option id + name), and the statutory
 *                               strings (purpose codes, realization certs) are
 *                               in *rendered* markup.
 *   Surface 2  /banks/           266 bank rows, every row carrying the
 *                               tabular-nums / font-mono numeric treatment.
 *   Surface 3  /banks/<slug>/    a 20-page sample, each with an inline <svg>
 *                               carrying a valid viewBox and >= 3 routing hop
 *                               <text> labels.
 *
 * WHY IT PARSES HTML INSTEAD OF USING A HEADLESS BROWSER
 * The static export is fully prerendered and the pages under audit are React
 * server components whose critical content is in the initial HTML, so a
 * byte-level read is the whole surface — and it keeps the audit dependency-free
 * in a repository whose zero-runtime-dependency rule is an invariant, not a
 * preference. What a browser would add (hydration, focus order) is out of scope
 * for a DOM-presence audit.
 *
 * TWO THINGS THAT MATTER FOR CORRECTNESS HERE
 * 1. `<script>` bodies are stripped before matching. Next.js serialises the
 *    client component props into inline `self.__next_f.push(...)` calls, so
 *    almost any string in a client island's data is present in the raw file
 *    whether or not it rendered. Matching the raw file would make every
 *    assertion here vacuous; this is the single most important line in the file.
 * 2. HTML entities are decoded before matching. A jurisdiction name with an
 *    apostrophe ("Côte d'Ivoire") is exported as `C&#x27;Ivoire`, so a naive
 *    `includes()` would report a false failure on exactly the rows with the
 *    most interesting tax rules.
 *
 * Usage:  node scripts/audit_ui_surfaces.mjs        (run after `npm run build`)
 * Exit:   0 when every assertion passes, 1 otherwise.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "out");
/** Published prefix. Files are written without it; URLs and routes carry it. */
const BASE_PATH = "/payout-delta";

/* -------------------------------------------------------------------------- *
 * Reporting
 * -------------------------------------------------------------------------- */

let failures = 0;
let checks = 0;

function pass(label, detail = "") {
  checks += 1;
  console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail) {
  checks += 1;
  failures += 1;
  console.log(`  FAIL  ${label} — ${detail}`);
}

function surface(title) {
  console.log(`\n${title}\n${"-".repeat(title.length)}`);
}

/* -------------------------------------------------------------------------- *
 * HTML helpers
 * -------------------------------------------------------------------------- */

/**
 * Remove `<script>` / `<style>` bodies and decode entities, yielding the text a
 * reader would actually see. See the file header: this is what keeps the audit
 * from matching React's serialised flight payload instead of the DOM.
 */
function renderedText(html) {
  return decodeEntities(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  );
}

function decodeEntities(text) {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

/** Body rows of the first `<tbody>` — excludes the `<thead>` header row. */
function tableBodyRows(html) {
  const body = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(html);
  if (!body) return [];
  return body[1].split(/<tr[\s>]/i).filter((row) => row.trim().length > 0);
}

function readOut(relativeRoute) {
  const file = join(OUT, ...relativeRoute.split("/").filter(Boolean), "index.html");
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8");
}

/* -------------------------------------------------------------------------- *
 * Inputs
 * -------------------------------------------------------------------------- */

if (!existsSync(OUT)) {
  console.error(`No static export at ${OUT}. Run \`npm run build\` first.`);
  process.exit(1);
}

const jurisdictions = JSON.parse(
  readFileSync(join(ROOT, "data", "jurisdictions.json"), "utf8")
).jurisdictions;
const registry = JSON.parse(
  readFileSync(join(ROOT, "data", "banksRegistry.json"), "utf8")
).banks;
const dossiers = readFileSync(join(ROOT, "data", "banks.ts"), "utf8");

/** Authored dossier slugs, which take precedence over BIC-derived slugs. */
const DOSSIER_SLUGS = new Set(
  [...dossiers.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1])
);

const BANK_COUNT = registry.length;
const JURISDICTION_COUNT = jurisdictions.length;

console.log(`\nPayoutDelta headless UI/DOM audit (${OUT})`);
console.log(
  `Corpus under audit: ${BANK_COUNT} verified heads · ${JURISDICTION_COUNT} sovereign states`
);

/* -------------------------------------------------------------------------- *
 * Surface 1 — /tax-clearance/ statutory wizard
 * -------------------------------------------------------------------------- */

surface("Surface 1 · /payout-delta/tax-clearance/ — statutory wizard roster");

const wizardHtml = readOut("tax-clearance");
if (!wizardHtml) {
  fail("tax-clearance page exported", `${BASE_PATH}/tax-clearance/index.html missing`);
} else {
  pass("tax-clearance page exported", `${BASE_PATH}/tax-clearance/index.html`);

  const listboxes = wizardHtml.match(/role="listbox"/g) ?? [];
  if (listboxes.length === 1) pass("single ARIA listbox", "role=\"listbox\" × 1");
  else fail("single ARIA listbox", `found ${listboxes.length}, expected 1`);

  const text = renderedText(wizardHtml);

  // Every sovereign state must be an addressable option, not just present in
  // the payload. The id is the row's DOM identity and the focus target the
  // arrow-key handler calls scrollIntoView on, so a dropped row here is a
  // keyboard-navigation dead end as well as a content gap.
  const missingOptions = [];
  const missingNames = [];
  for (const jurisdiction of jurisdictions) {
    if (!wizardHtml.includes(`id="wizard-option-${jurisdiction.iso2}"`)) {
      missingOptions.push(jurisdiction.iso2);
    }
    if (!text.includes(jurisdiction.name)) missingNames.push(jurisdiction.iso2);
  }

  if (missingOptions.length === 0) {
    pass("all sovereign options in listbox DOM", `${JURISDICTION_COUNT}/${JURISDICTION_COUNT} option ids`);
  } else {
    fail(
      "all sovereign options in listbox DOM",
      `${missingOptions.length} absent: ${missingOptions.slice(0, 12).join(", ")}`
    );
  }

  if (missingNames.length === 0) {
    pass("all sovereign names rendered", `${JURISDICTION_COUNT}/${JURISDICTION_COUNT} names in rendered text`);
  } else {
    fail(
      "all sovereign names rendered",
      `${missingNames.length} absent: ${missingNames.slice(0, 12).join(", ")}`
    );
  }

  // Statutory strings. These are asserted against rendered markup so a
  // regression that stops *displaying* the purpose code is caught, rather than
  // one that merely drops it from the island's props.
  for (const label of [
    { id: "purpose code 9111", needle: "9111" },
    { id: "purpose code P0802", needle: "P0802" },
    { id: "purpose code CIR-1089", needle: "CIR-1089" },
    { id: "realization cert ePRC", needle: "ePRC" },
    { id: "realization cert FIRC", needle: "FIRC" },
  ]) {
    if (text.includes(label.needle)) pass(`${label.id} rendered`);
    else fail(`${label.id} rendered`, `"${label.needle}" absent from rendered markup`);
  }
}

/* -------------------------------------------------------------------------- *
 * Surface 2 — /banks/ institution registry table
 * -------------------------------------------------------------------------- */

surface("Surface 2 · /payout-delta/banks/ — verified institution registry");

const banksHtml = readOut("banks");
if (!banksHtml) {
  fail("banks index exported", `${BASE_PATH}/banks/index.html missing`);
} else {
  pass("banks index exported", `${BASE_PATH}/banks/index.html`);

  const rows = tableBodyRows(banksHtml);
  if (rows.length === BANK_COUNT) {
    pass("registry row count", `${rows.length} rows == ${BANK_COUNT} verified heads`);
  } else {
    fail("registry row count", `${rows.length} rows, expected ${BANK_COUNT}`);
  }

  // Money columns are compared vertically down a 266-row table, so the numeric
  // treatment is load-bearing rather than decorative: without tabular-nums the
  // decimal points do not line up and a cut is misread at a glance.
  const unstyled = [];
  for (const [index, row] of rows.entries()) {
    if (!row.includes("tabular-nums") || !row.includes("font-mono")) unstyled.push(index);
  }
  if (unstyled.length === 0) {
    pass("numeric treatment on every row", "tabular-nums + font-mono × " + rows.length);
  } else {
    fail(
      "numeric treatment on every row",
      `${unstyled.length} row(s) lack it, first at #${unstyled[0]}`
    );
  }
}

/* -------------------------------------------------------------------------- *
 * Surface 3 — /banks/<slug>/ routing diagram
 * -------------------------------------------------------------------------- */

surface("Surface 3 · /payout-delta/banks/<slug>/ — correspondent routing diagram");

/**
 * Resolve a requested anchor to a real route.
 *
 * The anchors below are given as human shorthand ("hbl", "meezan", "itablsp"),
 * but a route is addressed by slug, and a slug is *not* the BIC when an authored
 * dossier exists: CHASUS33 publishes at `/banks/jpmorgan-chase/`. So an anchor
 * is resolved against, in order, the authored slug, the lowercased BIC, the
 * BIC's 4-letter institution code, and an authored dossier name. An anchor that
 * matches nothing is reported and failed — an audit that quietly drops a
 * requested sample point is worse than no audit, because it reports a clean run
 * over a smaller surface than the one it was asked to check.
 */
function resolveAnchor(token) {
  const wanted = token.toLowerCase();
  const bySlug = registry.find((bank) => bank.bic.toLowerCase() === wanted);
  if (bySlug) return { bank: bySlug, slug: slugFor(bySlug) };
  if (DOSSIER_SLUGS.has(wanted)) {
    const byDossier = registry.find((bank) => findDossierSlug(bank.bic) === wanted);
    if (byDossier) return { bank: byDossier, slug: wanted };
  }
  const byBankCode = registry.find((bank) => bank.bic.slice(0, 4).toLowerCase() === wanted);
  if (byBankCode) return { bank: byBankCode, slug: slugFor(byBankCode) };
  const byName = registry.find(
    (bank) =>
      (findDossierName(bank.bic) ?? "").toLowerCase().includes(wanted) ||
      bank.name.toLowerCase().includes(wanted)
  );
  if (byName) return { bank: byName, slug: slugFor(byName) };
  return null;
}

/** A head publishes at its authored dossier slug when one exists, else at its BIC. */
function slugFor(bank) {
  return findDossierSlug(bank.bic) ?? bank.bic.toLowerCase();
}

function findDossierSlug(bic) {
  // `data/banks.ts` pairs each dossier with its BIC in a `swiftBic` literal, and
  // the slug in the same object literal; pairing them positionally is fragile,
  // so the dossier block is matched on its own BIC.
  const block = dossierBlockFor(bic);
  if (!block) return null;
  const slug = /slug:\s*"([^"]+)"/.exec(block);
  return slug ? slug[1] : null;
}

function findDossierName(bic) {
  const block = dossierBlockFor(bic);
  if (!block) return null;
  const name = /shortName:\s*"([^"]+)"/.exec(block);
  return name ? name[1] : null;
}

const DOSSIER_BLOCKS = dossiers.split(/\n(?=\s*\{\s*\n?\s*slug:)/);
function dossierBlockFor(bic) {
  return DOSSIER_BLOCKS.find((block) => block.includes(`swiftBic: "${bic}"`)) ?? null;
}

/**
 * Requested sample points, each named the way a person would type it rather
 * than the way the route is addressed: `hbl` is a BIC bank code, `meezan` is
 * half a dossier slug, `chasus33` is a BIC whose route is owned by a dossier.
 * The list deliberately spans the three slug regimes — authored dossier,
 * lowercased BIC, and an 11-character head with a branch qualifier — because
 * those are the three ways `getBankProfileBySlug` can miss a route.
 *
 * Note on coverage: these anchors are *resolved* against the registry, never
 * hardcoded, so an anchor naming a head that is not in the 266 fails loudly
 * rather than being silently skipped. A sample that quietly shrinks is worse
 * than no sample, because it reports a clean run over a smaller surface.
 */
const REQUESTED_ANCHORS = ["hbl", "meezan", "chasus33", "uncritmmxxx"];
const resolved = [];
const unresolved = [];
for (const anchor of REQUESTED_ANCHORS) {
  const hit = resolveAnchor(anchor);
  if (hit) resolved.push(hit);
  else unresolved.push(anchor);
}

for (const anchor of unresolved) {
  fail(
    `anchor "${anchor}" resolves to a route`,
    `no bank in data/banksRegistry.json matches "${anchor}" as a slug, BIC, BIC bank code or name`
  );
}

// Fill the sample deterministically: resolved anchors first, then a fixed stride
// across the remaining heads. A fixed stride (rather than Math.random) keeps the
// sample identical run to run, so a failure is reproducible, and it spreads the
// 20 picks across the whole registry instead of clustering them at the head of
// the file the way a leading slice would.
const sampledSlugs = new Set(resolved.map((entry) => entry.slug));
const stride = Math.max(1, Math.floor(registry.length / 20));
for (let i = 0; sampledSlugs.size < 20 && i < registry.length; i += stride) {
  sampledSlugs.add(slugFor(registry[i]));
}

/**
 * Force both routing-diagram branches into the sample.
 *
 * The diagram has two data-driven shapes: a tier-1 hub that carries its own USD
 * leg (the anchor node *is* the institution), and a tier-2 bank whose registry
 * row publishes no correspondent, drawn as an explicit dashed "not published"
 * gap. In the current registry all 36 tier-1 heads are self-anchored and all
 * 230 tier-2 rows carry no anchor, so a plain stride sample proves only one
 * branch. Both are asserted below: the self-anchored hop must name the head, and
 * the unresolved hop must say so rather than quietly substituting a plausible
 * bank, which would be a fabricated correspondent relationship.
 */
const selfAnchoredTier1 = registry.find((b) => b.tier === 1 && b.usdGsibCorrespondent === b.bic);
const unanchoredTier2 = registry.find((b) => b.tier === 2 && !b.usdGsibCorrespondent);
for (const forced of [selfAnchoredTier1, unanchoredTier2]) {
  if (forced) sampledSlugs.add(slugFor(forced));
}

console.log(
  `  sample  ${sampledSlugs.size} routes · anchors ${REQUESTED_ANCHORS.map((a) => {
    const hit = resolved.find((entry) => anchorMatches(a, entry));
    return hit ? `${a}→${hit.slug}` : `${a}→UNRESOLVED`;
  }).join(" ")}`
);

function anchorMatches(anchor, entry) {
  return (
    entry.bank.bic.toLowerCase() === anchor ||
    entry.bank.bic.slice(0, 4).toLowerCase() === anchor ||
    entry.slug === anchor ||
    entry.bank.name.toLowerCase().includes(anchor)
  );
}

const branchCoverage = { selfAnchored: 0, unresolved: 0 };

for (const slug of sampledSlugs) {
  const html = readOut(`banks/${slug}`);
  if (!html) {
    fail(`${BASE_PATH}/banks/${slug}/`, "route not exported");
    continue;
  }

  // The routing diagram is the only <svg> carrying a 776x190 viewBox, so it is
  // located by its own geometry rather than by being the first svg on the page
  // (a bank page also carries header, breadcrumb and CTA icons).
  const diagrams = html.match(/<svg[^>]*viewBox="0 0 (\d+) (\d+)"[\s\S]*?<\/svg>/g) ?? [];
  const routing = diagrams.find((svg) => /viewBox="0 0 776 190"/.test(svg));

  if (!routing) {
    fail(`${BASE_PATH}/banks/${slug}/ routing diagram`, "no inline <svg viewBox=\"0 0 776 190\"> found");
    continue;
  }

  const [, width, height] = /viewBox="0 0 (\d+) (\d+)"/.exec(routing);
  if (Number(width) > 0 && Number(height) > 0) {
    // A viewBox smaller than the widest node clips the third hop: the boxes run
    // 216 wide at x = 0 / 272 / 544, so anything under 760 truncates the last.
    if (Number(width) < 760) {
      fail(`${BASE_PATH}/banks/${slug}/ viewBox`, `width ${width} clips the third hop (needs >= 760)`);
    } else {
      pass(`${BASE_PATH}/banks/${slug}/ viewBox`, `0 0 ${width} ${height} fits 3 hop boxes`);
    }
  } else {
    fail(`${BASE_PATH}/banks/${slug}/ viewBox`, `degenerate viewBox "${width} ${height}"`);
  }

  const hopLabels = (routing.match(/<text/g) ?? []).length;
  const hops = ["Hop 0", "Hop 1", "Hop 2"].filter((hop) => routing.includes(hop));
  if (hopLabels >= 3 && hops.length === 3) {
    pass(`${BASE_PATH}/banks/${slug}/ hop labels`, `${hopLabels} <text> · 3/3 hop roles`);
  } else {
    fail(
      `${BASE_PATH}/banks/${slug}/ hop labels`,
      `${hopLabels} <text> (need >= 3), ${hops.length}/3 hop roles labelled`
    );
  }

  if (/Tier 1 · own USD leg/.test(routing)) branchCoverage.selfAnchored += 1;
  if (/Not published/.test(routing)) branchCoverage.unresolved += 1;
}

// Both diagram shapes must have been exercised, or the sample only proved the
// common case. See the forced-sample note above.
if (branchCoverage.selfAnchored > 0) {
  pass("tier-1 self-anchored branch rendered", `${branchCoverage.selfAnchored} route(s)`);
} else {
  fail("tier-1 self-anchored branch rendered", "no sampled route drew its own USD leg");
}
if (branchCoverage.unresolved > 0) {
  pass("tier-2 unpublished-anchor branch rendered", `${branchCoverage.unresolved} route(s) drew an explicit gap`);
} else {
  fail("tier-2 unpublished-anchor branch rendered", "no sampled route drew the explicit gap");
}

/* -------------------------------------------------------------------------- *
 * Summary
 * -------------------------------------------------------------------------- */

console.log(
  `\n  surfaces audited        3 (tax-clearance, banks index, ${sampledSlugs.size} bank routes)`
);
console.log(`  assertions              ${checks}`);
console.log(`  failures                ${failures}`);
console.log(
  failures === 0 ? "\n  ALL UI SURFACES PASSED\n" : "\n  UI SURFACE AUDIT FAILED\n"
);

process.exit(failures === 0 ? 0 : 1);
