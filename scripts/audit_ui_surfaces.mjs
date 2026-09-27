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
 *   Surface 4  /agencies/        the Phase 5 executive treasury memorandum —
 *                               its print container and required print classes
 *                               are present, the seven-column roster ledger
 *                               carries the mono/tabular numeric treatment on
 *                               every money cell, and the statutory purpose
 *                               codes / realization certificates it cites are
 *                               the ones the roster's own destinations declare
 *                               in data/jurisdictions.json.
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
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

/**
 * Collapse every whitespace run to a single space.
 *
 * JSX formats a long interpolation across several source lines, and the HTML it
 * prerenders preserves the line breaks between text nodes. A statutory string
 * such as "FIRC / Inward Advice evidencing …" is therefore emitted with a
 * newline inside it, so a literal `includes()` on the raw text reports a false
 * failure for a string that rendered perfectly. Both the haystack and every
 * needle go through this before matching, which compares content rather than
 * source formatting.
 */
function collapse(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * What a reader actually sees: scripts, styles and *tags* removed, entities
 * decoded, whitespace collapsed.
 *
 * Distinct from `renderedText` on purpose. `renderedText` keeps tags, which is
 * right for a presence check on a single element's subtree but wrong for
 * asserting a phrase a reader reads across a boundary — a `//` label and its
 * value live in sibling `<dt>`/`<dd>` elements, so a text-spanning match needs
 * the tag that separates them collapsed to a single space first. Keeping the
 * two helpers separate means the doc-level assertions cannot accidentally start
 * matching markup.
 */
function visibleText(html) {
  return collapse(
    decodeEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
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
const fees = JSON.parse(readFileSync(join(ROOT, "data", "fees.json"), "utf8"));

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
 * Surface 4 — /agencies/ executive treasury memorandum (print / PDF engine)
 * -------------------------------------------------------------------------- */

surface("Surface 4 · /payout-delta/agencies/ — executive treasury report print engine");

/**
 * The default roster `AgencyAuditCalculator` mounts on first render, declared
 * here rather than scraped from the page: the assertions below are about the
 * *default* population, and a scrape would make a regression that emptied the
 * roster vacuously pass by having nothing left to check.
 *
 * `DESTINATIONS` is the distinct corridors on that roster (4 PKR + 2 INR + 1 COP
 * contractors collapse to three jurisdictions), which is what the statutory
 * checklist is keyed on. `CONTRACTORS` is the row count of the ledger itself —
 * kept separate from the destination count on purpose: conflating them is how a
 * de-duplicated compliance register gets mistaken for a seven-line payroll table.
 */
const DEFAULT_ROSTER_DESTINATIONS = ["usd-to-pkr", "usd-to-inr", "usd-to-cop"];
const DEFAULT_ROSTER_CONTRACTORS = 7;

/** The exact utility contract the print container is specified to carry. */
const REQUIRED_PRINT_CLASSES = [
  "hidden",
  "print:block",
  "text-black",
  "bg-white",
  "p-8",
  "max-w-[210mm]",
  "mx-auto",
];

const agenciesHtml = readOut("agencies");
if (!agenciesHtml) {
  fail("agencies page exported", `${BASE_PATH}/agencies/index.html missing`);
} else {
  pass("agencies page exported", `${BASE_PATH}/agencies/index.html`);

  // The print container is located by its own class, then its *whole* class
  // attribute is read: asserting the classes one `includes()` at a time across
  // the file would pass even if the utilities were scattered over unrelated
  // elements, which is precisely the regression that leaves the memorandum
  // visible on screen or unconstrained on paper.
  const container = /<div class="([^"]*exec-report-print-area[^"]*)"/.exec(agenciesHtml);
  if (!container) {
    fail(
      "executive report print container",
      'no <div> carrying "exec-report-print-area" in the exported markup'
    );
  } else {
    pass("executive report print container", container[1].split(" ").slice(0, 2).join(" "));

    const missingClasses = REQUIRED_PRINT_CLASSES.filter(
      (token) => !container[1].split(/\s+/).includes(token)
    );
    if (missingClasses.length === 0) {
      pass("print container utility contract", `${REQUIRED_PRINT_CLASSES.length}/7 classes on the container`);
    } else {
      fail(
        "print container utility contract",
        `missing ${missingClasses.join(", ")} from class="${collapse(container[1])}"`
      );
    }

    // `hidden` (screen) and `print:block` (sheet) only behave as specified
    // together, and only if nothing overrides the print display. The
    // stylesheet is the other half of the contract, so it is asserted from the
    // compiled CSS the export actually ships rather than from the source: a
    // rule dropped from globals.css leaves the markup perfectly valid and the
    // memorandum invisible on the sheet.
    const printCss = readPrintCss();
    const printRules = [
      {
        id: "container forced visible in print",
        pattern: /\.agency-print-area\{[^}]*display:\s*block\s*!important/,
        hint: "no .agency-print-area rule forces display:block !important",
      },
      {
        id: "container pinned to a 210mm measure",
        pattern: /\.exec-report-print-area\{[^}]*max-width:\s*210mm\s*!important/,
        hint: "no .exec-report-print-area rule pins max-width to 210mm",
      },
      {
        id: "page numbering resolves per page",
        pattern: /\.exec-report-page-number::?after\{[^}]*counter\(page\)[^}]*counter\(pages\)/,
        hint: "no .exec-report-page-number::after rule emits counter(page)/counter(pages)",
      },
    ];
    for (const rule of printRules) {
      if (rule.pattern.test(printCss)) pass(`print stylesheet — ${rule.id}`);
      else fail(`print stylesheet — ${rule.id}`, `${rule.hint} in ${OUT}/_next/static/**/*.css`);
    }
  }

  const text = visibleText(agenciesHtml);

  // --- Masthead: the institutional identity of the document ---------------
  for (const needle of [
    "PAYOUTDELTA // CROSS-BORDER TREASURY LEAKAGE AUDIT",
    "RESTRICTED FINANCIAL MEMORANDUM",
    "Executive Treasury Memorandum",
    "Prepared by",
    "Approved by",
  ]) {
    if (text.includes(collapse(needle))) pass(`masthead "${needle}"`, "in rendered text");
    else fail(`masthead "${needle}"`, "absent from rendered markup");
  }

  // The reference ID is a derived digest, not a hardcoded string, so it is
  // matched by shape. A report that silently fell back to a placeholder would
  // still print the label; only the shape proves the hash ran.
  if (/\bPD-ETR-[0-9A-F]{4}-[0-9A-F]{8}\b/.test(text)) {
    pass("deterministic reference ID", "PD-ETR-XXXX-XXXXXXXX digest present");
  } else {
    fail("deterministic reference ID", 'no PD-ETR-XXXX-XXXXXXXX token in rendered text');
  }

  // The ISO 8601 stamp is a prop minted on the server, so it must be a real
  // instant rather than a default: this also catches a report that dropped the
  // prop and fell back to the epoch placeholder.
  const issued = /Issued \(ISO 8601\)\s*(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/.exec(text);
  if (issued && !issued[1].startsWith("1970-01-01")) {
    pass("ISO 8601 issue stamp", issued[1]);
  } else {
    fail("ISO 8601 issue stamp", issued ? `stuck on the epoch fallback ${issued[1]}` : "no ISO 8601 stamp rendered");
  }

  // --- Section II: the granular contractor ledger -------------------------
  const ledger = /<table class="exec-report-table">([\s\S]*?)<\/table>/.exec(agenciesHtml);
  if (!ledger) {
    fail("contractor roster ledger", 'no <table class="exec-report-table"> in the export');
  } else {
    pass("contractor roster ledger", "exec-report-table present");

    const head = /<thead>([\s\S]*?)<\/thead>/.exec(ledger[1]);
    const columns = head
      ? [...head[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => collapse(m[1]))
      : [];
    const REQUIRED_COLUMNS = [
      "Contractor ID",
      "Jurisdiction / Destination Rail",
      "Monthly Gross",
      "Correspondent SHA Loss",
      "FX Spread Markup",
      "Net Landing Yield",
      "Recommended Action",
    ];
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
    if (missingColumns.length === 0) {
      pass("roster ledger column set", `${columns.length}/7 institutional columns`);
    } else {
      fail(
        "roster ledger column set",
        `missing ${missingColumns.join(", ")}; found [${columns.join(" | ")}]`
      );
    }

    // Money is compared down the column, so the numeric treatment is
    // load-bearing, exactly as on the bank registry: without tabular-nums the
    // decimal points do not line up and a deduction is misread at a glance.
    const ledgerBody = /<tbody>([\s\S]*?)<\/tbody>/.exec(ledger[1]);
    const ledgerRows = ledgerBody
      ? ledgerBody[1].split(/<tr[\s>]/i).filter((row) => row.trim().length > 0)
      : [];
    if (ledgerRows.length === DEFAULT_ROSTER_CONTRACTORS) {
      pass("roster ledger row count", `${ledgerRows.length} rows == default roster`);
    } else {
      fail(
        "roster ledger row count",
        `${ledgerRows.length} rows, expected ${DEFAULT_ROSTER_CONTRACTORS} for the default roster`
      );
    }

    // Money is compared down the column, so the numeric treatment is
    // load-bearing, exactly as on the bank registry: without tabular-nums the
    // decimal points do not line up and a deduction is misread at a glance.
    //
    // Checked by *column position*, not by "contains a dollar sign". The
    // Recommended Action column is prose that quotes a retained amount, so a
    // content sniff would demand tabular-nums of a sentence and fail a sheet
    // that is entirely correct. Index 2..5 are Monthly Gross, Correspondent
    // SHA Loss, FX Spread Markup and Net Landing Yield.
    const MONEY_COLUMNS = [2, 3, 4, 5];
    const unstyled = [];
    for (const [index, row] of ledgerRows.entries()) {
      const cells = [...row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map((m) => ({
        attrs: m[1],
        body: collapse(m[2]),
      }));
      for (const column of MONEY_COLUMNS) {
        const cell = cells[column];
        if (!cell) {
          unstyled.push(`#${index} has no column ${column}`);
          continue;
        }
        if (!/^\$[\d,]+(\.\d{2})?$/.test(cell.body)) {
          unstyled.push(`#${index} col ${column} is not a money value ("${cell.body.slice(0, 24)}")`);
          continue;
        }
        if (!/tabular-nums/.test(cell.attrs) || !/font-mono/.test(cell.attrs)) {
          unstyled.push(`#${index} col ${column} lacks the numeric treatment`);
        }
      }
    }
    if (unstyled.length === 0) {
      pass(
        "numeric treatment on every money cell",
        `tabular-nums + font-mono × ${ledgerRows.length} rows × ${MONEY_COLUMNS.length} money columns`
      );
    } else {
      fail(
        "numeric treatment on every money cell",
        `${unstyled.length} defect(s), first: ${unstyled.slice(0, 3).join("; ")}`
      );
    }
  }

  // --- Section III: statutory compliance checklist ------------------------
  // The codes and certificates are read from the registry rather than hardcoded
  // here. An audit that asserts "9111 is on the page" would keep passing after
  // a destination was swapped for one whose regime says something else, which
  // is the one change this gate exists to catch. Each slug is resolved through
  // data/fees.json to its country, then to that market's authored statute.
  const jurisdictionByIso2 = new Map(jurisdictions.map((entry) => [entry.iso2, entry]));
  const corridorBySlugAudit = new Map(fees.corridors.map((corridor) => [corridor.slug, corridor]));

  const missingStatutes = [];
  const unresolvedSlugs = [];
  for (const slug of DEFAULT_ROSTER_DESTINATIONS) {
    const corridor = corridorBySlugAudit.get(slug);
    if (!corridor) {
      unresolvedSlugs.push(slug);
      continue;
    }
    const market = jurisdictionByIso2.get(corridor.countryCode);
    if (!market) {
      unresolvedSlugs.push(`${slug}→${corridor.countryCode}`);
      continue;
    }
    for (const [kind, needle] of [
      ["purpose code", market.tax.purposeCode],
      ["realization certificate", market.tax.mandatoryAuditCert],
    ]) {
      if (text.includes(collapse(needle))) {
        pass(`${corridor.countryCode} ${kind} rendered`, collapse(needle));
      } else {
        missingStatutes.push(`${corridor.countryCode} ${kind}`);
      }
    }
  }

  for (const slug of unresolvedSlugs) {
    fail(`roster slug "${slug}" resolves to a statute`, "not present in fees.json / jurisdictions.json");
  }
  if (missingStatutes.length === 0) {
    pass(
      "statutory checklist matches the roster",
      `${DEFAULT_ROSTER_DESTINATIONS.length} destinations · purpose code + realization certificate each`
    );
  } else {
    fail("statutory checklist matches the roster", `absent from the report: ${missingStatutes.join(", ")}`);
  }

  // --- Print isolation ----------------------------------------------------
  // The memorandum is the only thing that may reach the sheet. Any interactive
  // region that survives printing (a number field, a Remove button, the dark
  // KPI tiles) would print as a filled-in form or a black box over the audit.
  if ((agenciesHtml.match(/print:hidden/g) ?? []).length >= 6) {
    pass("interactive UI hidden from print", `${(agenciesHtml.match(/print:hidden/g) ?? []).length} print:hidden regions`);
  } else {
    fail(
      "interactive UI hidden from print",
      `${(agenciesHtml.match(/print:hidden/g) ?? []).length} print:hidden regions, expected >= 6`
    );
  }

  if (/window\.print\(\)/.test(agenciesHtml)) {
    pass("print trigger wired", "window.print() inlined in the page");
  } else {
    // The trigger lives in the island's code, not in the document, so it can
    // only be proven in the chunks this page actually loads — an unscoped scan
    // of out/_next would find the call in some unrelated island and pass on a
    // page whose button does nothing. Matching the page's own <script src>
    // list is the only assertion that ties the trigger to *this* route.
    const pageChunks = [...agenciesHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/g)]
      .map((m) => m[1].replace(BASE_PATH, ""))
      .map((src) => join(OUT, ...src.split("/").filter(Boolean)))
      .filter((file) => existsSync(file));
    const wired = pageChunks.some((file) => /window\.print\(\)/.test(readFileSync(file, "utf8")));
    if (wired) {
      pass("print trigger wired", `window.print() in ${pageChunks.length} chunk(s) this page loads`);
    } else {
      fail(
        "print trigger wired",
        `window.print() not in any of the ${pageChunks.length} script chunks ${BASE_PATH}/agencies/ loads`
      );
    }
  }
}

/**
 * The compiled print rules for the memorandum, read from the stylesheets the
 * export actually ships. `class="..."` alone proves the *markup* contract; the
 * half of the contract that decides whether the sheet is legible on paper lives
 * here, and reading the built CSS is what makes a dropped rule a test failure
 * rather than a surprise in the print dialog.
 *
 * Next.js does not guarantee a `_next/static/css/` directory — the bundles in
 * this build land in `_next/static/chunks/` — so the whole static tree is
 * walked rather than one hardcoded path, which would have made this gate
 * vacuously pass (`readPrintCss()` returning "") on a bundler change.
 */
function readPrintCss() {
  return readStaticAssets(".css").join("\n");
}

/** Concatenate every file under `_next/static` with the given extension. */
function readStaticAssets(extension) {
  const root = join(OUT, "_next", "static");
  const found = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(extension)) found.push(readFileSync(full, "utf8"));
    }
  };
  walk(root);
  return found;
}

/* -------------------------------------------------------------------------- *
 * Summary
 * -------------------------------------------------------------------------- */

console.log(
  `\n  surfaces audited        4 (tax-clearance, banks index, ${sampledSlugs.size} bank routes, agencies print engine)`
);
console.log(`  assertions              ${checks}`);
console.log(`  failures                ${failures}`);
console.log(
  failures === 0 ? "\n  ALL UI SURFACES PASSED\n" : "\n  UI SURFACE AUDIT FAILED\n"
);

process.exit(failures === 0 ? 0 : 1);
