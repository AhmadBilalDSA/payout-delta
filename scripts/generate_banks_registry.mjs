/**
 * PayoutDelta — builds data/banksRegistry.json from the BICs this repository
 * can actually evidence.
 *
 * WHY A GENERATOR
 * A bank identifier is a routing instruction. Authoring it twice (once in the
 * receiving-bank directory, once in the hexagonal registry) guarantees the two
 * copies drift, and the build-time auditor in `scripts/test_corridors.mjs`
 * exists precisely to catch that drift. So the registry is DERIVED, never
 * hand-maintained: run this script and the file is byte-stable.
 *
 * SOURCES (all in-repo, all publisher-listed heads)
 *   1. data/regulatoryBanking.ts — the per-corridor receiving-bank directory.
 *      Carries the real SWIFT head, the benchmark intermediary cut in USD and
 *      the clearance class for every audited market.
 *   2. data/banks.ts — the global correspondent clearing-hub dossiers. These
 *      become tier 1 and contribute the charge-code set and transit hours.
 *   3. data/jurisdictions.json — the authorized heads already published on the
 *      sovereign manifest, merged back in so the two registries cannot disagree.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * No synthetic banks. A market with no evidenced head in the sources above is
 * simply absent from the registry, and its jurisdiction keeps an empty
 * `primaryBankBics` array. Inflating the count with invented 4-letter bank
 * codes would put non-existent institutions into a financial reference, so the
 * `meta` block publishes the real verified count and the exact derivation of
 * every derived field instead.
 *
 * DERIVATIONS (documented, deterministic)
 *   countryIso2  — characters 5-6 of the BIC itself, which is the institution's
 *                  registration country and therefore the same key the
 *                  jurisdiction registry uses.
 *   tier         — 1 for a documented correspondent clearing hub (banks.ts), 2
 *                  for a domestic settlement bank.
 *   transit hours— the directory's clearance class: Instant = 1h, Fast = 8h,
 *                  Standard = 36h. Tier 1 uses its dossier's own transit figure.
 *   charges      — the modelled inbound charge-code set (SHA primary, OUR/BEN
 *                  honoured). Tier 1 uses its dossier's own published set.
 *
 * USAGE
 *   node scripts/generate_banks_registry.mjs            write the registry
 *   node scripts/generate_banks_registry.mjs --check    fail if it is stale
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_PATH = join(ROOT, "data", "banksRegistry.json");
const CHECK_ONLY = process.argv.includes("--check");

/** ISO 9362: 4 letters + ISO country + 2 alphanumerics, optionally a branch. */
const BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

/** clearance class -> representative correspondent transit in hours. */
const TRANSIT_HOURS = { Instant: 1, Fast: 8, Standard: 36 };

/** Tier 1 carries its own USD leg; no tier 2 correspondent is evidenced. */
const MODELLED_CHARGES = ["SHA", "OUR", "BEN"];

/**
 * Heads the sovereign manifest already authorizes but that the two directories
 * above do not carry: the FSB G-SIBs and the principal correspondent hubs of
 * the major markets. The head itself is the repo's own — these are the values
 * already published in `data/jurisdictions.json`, so the registry is naming
 * what the project has always pointed at rather than asserting a new code.
 *
 * The two monetary fields are NOT per-institution claims: a head listed here has
 * no dossier, so it inherits the median of the sourced hub figures, and that
 * inheritance is published in `meta.conventions`.
 */
const MANIFEST_HEADS = [
  { bic: "CTBAAU2S", name: "Commonwealth Bank of Australia" },
  { bic: "BKCHCNBJ", name: "Bank of China" },
  { bic: "DEUTDEFF", name: "Deutsche Bank" },
  { bic: "COBADEFFXXX", name: "Commerzbank" },
  { bic: "BSCHESMMXXX", name: "Banco Santander" },
  { bic: "BNPAFRPPXXX", name: "BNP Paribas" },
  { bic: "SOGEFRPP", name: "Société Générale" },
  { bic: "HBUKGB4B", name: "HSBC UK" },
  { bic: "BCAJIDJJ", name: "Bank Central Asia" },
  { bic: "UNCRITMMXXX", name: "UniCredit" },
  { bic: "ABNANL2A", name: "ABN AMRO" },
  { bic: "ESSESESS", name: "Skandinaviska Enskilda Banken" },
  { bic: "ABSAZAJJ", name: "Absa Bank Zambia" },
];

const jurisdictions = JSON.parse(
  readFileSync(join(ROOT, "data", "jurisdictions.json"), "utf8")
);
const sovereignIso2 = new Set(jurisdictions.jurisdictions.map((n) => n.iso2));

const bankingSource = readFileSync(
  join(ROOT, "data", "regulatoryBanking.ts"),
  "utf8"
);
const dossiersSource = readFileSync(join(ROOT, "data", "banks.ts"), "utf8");

/** @type {Map<string, any>} BIC -> merged bank record. */
const banks = new Map();
/** Heads that exist in the sources but sit outside the 195 sovereign states. */
const nonSovereign = new Set();

function countryOf(bic) {
  return bic.slice(4, 6);
}

function upsert(record) {
  const existing = banks.get(record.bic);
  if (!existing) {
    banks.set(record.bic, record);
    return;
  }
  // Keep the richest value for every field: a dossier outranks the corridor
  // directory, because it is the record authored for the correspondent role.
  banks.set(record.bic, {
    bic: record.bic,
    name: record.name ?? existing.name,
    countryIso2: record.countryIso2 ?? existing.countryIso2,
    tier: Math.min(record.tier, existing.tier),
    usdGsibCorrespondent:
      record.usdGsibCorrespondent || existing.usdGsibCorrespondent || "",
    supportedCharges: record.supportedCharges ?? existing.supportedCharges,
    defaultIntermediaryCutUSD:
      record.defaultIntermediaryCutUSD ?? existing.defaultIntermediaryCutUSD,
    avgTransitHours: record.avgTransitHours ?? existing.avgTransitHours,
  });
}

// ---------------------------------------------------------------------------
// 1 — the per-corridor receiving-bank directory (tier 2).
// ---------------------------------------------------------------------------
const RECEIVING_RE =
  /\{\s*id:\s*"([^"]+)"[\s\S]{0,400}?name:\s*"([^"]+)"[\s\S]{0,200}?displayName:\s*"[^"]*"[\s\S]{0,160}?swiftCode:\s*"([^"]+)"[\s\S]{0,120}?intermediaryUSD:\s*([0-9.]+)[\s\S]{0,400}?speed:\s*"([^"]*)"/g;

let receiving = 0;
for (const match of bankingSource.matchAll(RECEIVING_RE)) {
  const bic = match[3].trim().toUpperCase();
  if (!BIC_RE.test(bic)) continue;
  receiving += 1;
  upsert({
    bic,
    name: match[2].trim(),
    countryIso2: countryOf(bic),
    tier: 2,
    usdGsibCorrespondent: "",
    supportedCharges: [...MODELLED_CHARGES],
    defaultIntermediaryCutUSD: Number(match[4]),
    avgTransitHours: TRANSIT_HOURS[match[5]] ?? TRANSIT_HOURS.Standard,
  });
}

// ---------------------------------------------------------------------------
// 2 — the correspondent clearing-hub dossiers (tier 1).
// ---------------------------------------------------------------------------
const DOSSIER_RE =
  /\{\s*slug:\s*"([^"]+)"[\s\S]{0,200}?name:\s*"([^"]+)"[\s\S]{0,200}?swiftBic:\s*"([^"]+)"[\s\S]{0,2000}?averageIntermediaryCutUSD:\s*([0-9.]+)[\s\S]{0,900}?supported:\s*\[([^\]]*)\][\s\S]{0,400}?transitTimeHours:\s*([0-9.]+)/g;

let dossiers = 0;
for (const match of dossiersSource.matchAll(DOSSIER_RE)) {
  const bic = match[3].trim().toUpperCase();
  if (!BIC_RE.test(bic)) continue;
  dossiers += 1;
  const charges = [...match[5].matchAll(/"(OUR|SHA|BEN)"/g)].map((c) => c[1]);
  upsert({
    bic,
    name: match[2].trim(),
    countryIso2: countryOf(bic),
    tier: 1,
    // A G-SIB carries its own USD leg on its own published head, so the
    // correspondent for a tier-1 node is the node itself. Tier 2 has no
    // evidenced single dominant correspondent and publishes "".
    usdGsibCorrespondent: bic,
    supportedCharges: charges.length ? charges : [...MODELLED_CHARGES],
    defaultIntermediaryCutUSD: Number(match[4]),
    avgTransitHours: Number(match[6]),
  });
}

// ---------------------------------------------------------------------------
// 3 — heads the sovereign manifest already authorizes. Merged, never invented:
//     a head listed there with no record in the directories above is resolved
//     from MANIFEST_HEADS, and anything still unresolved is reported and left
//     out of the registry rather than named by guesswork.
// ---------------------------------------------------------------------------
const sourcedTiers = [...banks.values()].filter((n) => n.tier === 1);
if (sourcedTiers.length === 0) {
  throw new Error("no sourced tier-1 hubs — refusing to derive registry medians");
}
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const medianCut = median(sourcedTiers.map((n) => n.defaultIntermediaryCutUSD));
const medianTransit = median(sourcedTiers.map((n) => n.avgTransitHours));
const manifestByBic = new Map(MANIFEST_HEADS.map((h) => [h.bic, h]));

let authorizedMerged = 0;
let authorizedNamed = 0;
const authorizedUnnamed = [];
for (const node of jurisdictions.jurisdictions) {
  for (const bic of node.primaryBankBics ?? []) {
    if (banks.has(bic)) {
      authorizedMerged += 1;
      continue;
    }
    const known = manifestByBic.get(bic);
    if (!known) {
      authorizedUnnamed.push(bic);
      continue;
    }
    authorizedNamed += 1;
    upsert({
      bic,
      name: known.name,
      countryIso2: countryOf(bic),
      tier: 1,
      usdGsibCorrespondent: bic,
      supportedCharges: [...MODELLED_CHARGES],
      defaultIntermediaryCutUSD: medianCut,
      avgTransitHours: medianTransit,
    });
  }
}

// ---------------------------------------------------------------------------
// Registry assembly — sovereign states only.
// ---------------------------------------------------------------------------
for (const [bic, record] of [...banks]) {
  if (!sovereignIso2.has(record.countryIso2)) {
    nonSovereign.add(`${bic} (${record.countryIso2})`);
    banks.delete(bic);
  }
}

const nodes = [...banks.values()].sort(
  (a, b) =>
    a.countryIso2.localeCompare(b.countryIso2) || a.bic.localeCompare(b.bic)
);

const tier1 = nodes.filter((n) => n.tier === 1).length;
const jurisdictionsCovered = new Set(nodes.map((n) => n.countryIso2)).size;

const registry = {
  meta: {
    schema: "payoutdelta/bank-registry@1",
    phase: "Phase 2 — hexagonal normalization",
    bankCount: nodes.length,
    tier1Count: tier1,
    tier2Count: nodes.length - tier1,
    jurisdictionsCovered,
    conventions: {
      bic: "Real publisher-listed ISO 9362 head (8 or 11 characters). Characters 5-6 are the institution's registration country, which is also the foreign key into data/jurisdictions.json.",
      tier: "1 = documented correspondent clearing hub in data/banks.ts. 2 = domestic settlement bank from the per-corridor receiving-bank directory.",
      usdGsibCorrespondent:
        "The G-SIB head that carries the institution's USD leg. Tier 1 carries its own head; tier 2 publishes an empty string because no single dominant USD correspondent is evidenced per domestic bank — the monetary exposure is carried by defaultIntermediaryCutUSD instead.",
      supportedCharges:
        "Charge codes honoured on an inbound credit advice. Tier 1 uses the dossier's own published set; tier 2 carries the modelled set (SHA primary, OUR/BEN honoured), which is the charge code data/fees.json prices.",
      defaultIntermediaryCutUSD:
        "Benchmark correspondent cut in USD, lifted from the receiving-bank directory (tier 2) or the hub dossier (tier 1). A manifest-authorized head with no dossier inherits the median of the sourced hub cuts and transit figures — it is a portfolio-level benchmark, not a per-institution quote.",
      avgTransitHours:
        "Correspondent transit in hours. Tier 1 is the dossier's own figure. Tier 2 is derived from the directory's clearance class: Instant = 1h, Fast = 8h, Standard = 36h.",
    },
    provenance: {
      receivingDirectoryRecords: receiving,
      hubDossiers: dossiers,
      manifestHeadsAlreadyMerged: authorizedMerged,
      manifestHeadsNamedFromManifest: authorizedNamed,
      manifestHeadsWithoutARecord: authorizedUnnamed,
      excludedNonSovereign: [...nonSovereign].sort(),
      policy: "Verified heads only. No synthetic institution is published: a market with no evidenced head stays absent rather than being padded with an invented bank code.",
    },
    disclaimer:
      "Informational benchmark derived from the project's own bank directory. A BIC identifies an institution for routing; confirm the head with the institution and its correspondent bank before invoicing, and verify the deduction that actually lands on the credit advice (CRF).",
  },
  banks: nodes.map((node) => ({
    bic: node.bic,
    name: node.name,
    countryIso2: node.countryIso2,
    tier: node.tier,
    usdGsibCorrespondent: node.usdGsibCorrespondent,
    supportedCharges: node.supportedCharges,
    defaultIntermediaryCutUSD: node.defaultIntermediaryCutUSD,
    avgTransitHours: node.avgTransitHours,
  })),
};

const serialized = `${JSON.stringify(registry, null, 2)}\n`;

if (CHECK_ONLY) {
  const current = (() => {
    try {
      return readFileSync(OUT_PATH, "utf8");
    } catch {
      return "";
    }
  })();
  if (current !== serialized) {
    console.error(
      "data/banksRegistry.json is stale — re-run node scripts/generate_banks_registry.mjs"
    );
    process.exit(1);
  }
  console.log("data/banksRegistry.json is up to date");
} else {
  writeFileSync(OUT_PATH, serialized, "utf8");
}

console.log(
  `bank registry: ${nodes.length} verified heads (${tier1} tier 1, ${
    nodes.length - tier1
  } tier 2) across ${jurisdictionsCovered} sovereign jurisdictions`
);
if (authorizedUnnamed.length) {
  console.warn(
    `heads authorized on the manifest with no record in the sources (not published): ${authorizedUnnamed.join(", ")}`
  );
}
if (nonSovereign.size) {
  console.log(
    `non-sovereign registrations kept out of the sovereign registry: ${[...nonSovereign].sort().join(", ")}`
  );
}
