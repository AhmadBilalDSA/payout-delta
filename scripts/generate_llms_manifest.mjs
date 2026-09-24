/**
 * PayoutDelta — AEO manifest generator (Milestone 3).
 *
 * Compiles `public/llms.txt` and `public/llms-full.txt` from the same data the
 * site is built from — `data/fees.json` (multi-origin corridors across USD,
 * EUR and GBP, rates, providers), the authored regulatory database in
 * `data/regulatoryBanking.ts` (SHA intermediary cuts, statutory purpose codes,
 * clearing networks) and the correspondent clearing registry in
 * `lib/swiftRoutingEngine.ts` (public BIC pool). No dynamic `.ts` imports (the
 * GitHub Actions build still runs on Node 20), so the hand-written regulatory
 * TS is parsed with the same regex extraction that `test_corridors.mjs`
 * already uses.
 *
 * Runs automatically before every `npm run build` via "prebuild", so the AEO
 * manifests can never drift from the dataset the site publishes.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://ahmadbilaldsa.github.io/payout-delta"
).replace(/\/+$/, "");
const FEED_URL = "https://ahmadbilaldsa.github.io/payout-delta/api/fees.json";
const DEFAULT_INTERMEDIARY_CUT_USD = 18;

const fees = JSON.parse(readFileSync(join(ROOT, "data", "fees.json"), "utf8"));
const bankingSource = readFileSync(
  join(ROOT, "data", "regulatoryBanking.ts"),
  "utf8"
);
const routingSource = readFileSync(
  join(ROOT, "lib", "swiftRoutingEngine.ts"),
  "utf8"
);
const corridorsSource = readFileSync(join(ROOT, "data", "corridors.ts"), "utf8");

/** Short statutory-regulator label per receiving currency (task format "SBP 9111"). */
const REGULATOR = {
  PKR: "SBP",
  INR: "RBI",
  MXN: "SAT",
  PHP: "BSP",
  BRL: "BCB",
  GBP: "HMRC",
  EUR: "ECB",
  NGN: "CBN",
  BDT: "BB",
  EGP: "CBE",
  ZAR: "SARB",
  VND: "SBV",
  KES: "CBK",
  IDR: "BI",
  COP: "BanRep",
  TRY: "CBRT",
  ARS: "BCRA",
  PLN: "NBP",
  RON: "BNR",
  CZK: "CNB",
  THB: "BOT",
  MYR: "BNM",
  GHS: "BoG",
  AED: "CBUAE",
  SAR: "SAMA",
  UAH: "NBU",
  IQD: "CBI",
  MAD: "BAM",
  CLP: "CMF",
  PEN: "BCRP",
  HUF: "MNB",
  BGN: "BNB",
  RSD: "NBS",
  SGD: "MAS",
  HKD: "HKMA",
  SEK: "Riksbank",
  NOK: "Norges Bank",
  DKK: "Danmarks Nationalbank",
  BAM: "CBBiH",
  GEL: "NBG",
  UYU: "BCU",
  CRC: "BCCR",
  HRK: "CNB",
  TZS: "BoT",
  UGX: "BoU",
  RWF: "NBR",
  ZMW: "BoZ",
  NPR: "NRB",
  LKR: "CBSL",
  KZT: "NBK",
  DOP: "DGII",
  GTQ: "SAT",
  PAB: "MEF",
  BOB: "SIN",
  PYG: "DNIT",
  JMD: "TAJ",
  TTD: "BIR",
  HNL: "SAR",
  NIO: "DGII",
  BSD: "MOF",
  BBD: "BRA",
  UZS: "STC",
  KHR: "GDT",
  MNT: "GAT",
  AMD: "SRC",
  AZN: "STS",
  KGS: "STS",
  TJS: "TC",
  MVR: "MIRA",
  BND: "MOFE",
  LAK: "MOF",
  BTN: "DRC",
  FJD: "FRCA",
  PGK: "IRC",
  WST: "IRD",
  TOP: "MOR",
  VUV: "CTO",
  SBD: "IRD",
  MUR: "MRA",
};

/** Mirrors `clearingCurrencyFor()` in lib/swiftRoutingEngine.ts. */
function clearingCurrencyFor(targetCurrency, sourceCurrency) {
  const source = String(sourceCurrency ?? "").toUpperCase();
  if (source === "EUR") return "EUR";
  if (source === "GBP") return "GBP";
  const code = String(targetCurrency).toUpperCase();
  if (code === "EUR") return "EUR";
  if (code === "GBP") return "GBP";
  if (code === "HRK" || code === "BAM") return "EUR";
  return "USD";
}

/** BIC pool per clearing currency, parsed from the correspondent registry. */
function parseCorrespondentBics() {
  const groups = {};
  for (const group of ["USD", "EUR", "GBP"]) {
    const blockRe = new RegExp(
      `${group}:\\s*\\[[\\s\\S]*?bic:\\s*"([A-Z0-9]{8})"[\\s\\S]*?\\n\\s{2}\\],`
    );
    const match = blockRe.exec(routingSource);
    const bics = [];
    if (match) {
      const all = new RegExp(`bic:\\s*"([A-Z0-9]{8})"`, "g");
      let one;
      while ((one = all.exec(match[0])) !== null) bics.push(one[1]);
    }
    groups[group] = bics.length ? bics : ["—"];
  }
  return groups;
}
const CORRESPONDENT_BICS = parseCorrespondentBics();

/**
 * Regulatory per-corridor facts extracted the same way `test_corridors.mjs`
 * audits them: statutory-tier arrays → first purpose code / regime / authority,
 * bank arrays → first SHA intermediary cut, and the authored slug entries →
 * clearing network + array references.
 */
function parseRegulatory() {
  const bankArrays = new Map();
  const arrayRe =
    /const\s+(\w+)\s*:\s*(?:RegulatoryBank|StatutoryTier)\[\]\s*=\s*\[([\s\S]*?)\n\];/g;
  let arrayMatch;
  while ((arrayMatch = arrayRe.exec(bankingSource)) !== null) {
    const body = arrayMatch[2];
    const banks = /RegulatoryBank/.test(arrayMatch[0]);
    bankArrays.set(arrayMatch[1], {
      banks,
      firstCut: /\bintermediaryUSD:\s*([0-9]+(?:\.[0-9]+)?)/.exec(body)?.[1]
        ? Number(/\bintermediaryUSD:\s*([0-9]+(?:\.[0-9]+)?)/.exec(body)[1])
        : DEFAULT_INTERMEDIARY_CUT_USD,
      purposeCode: /\bpurposeCode:\s*"([^"]*)"/.exec(body)?.[1] ?? null,
      tierName: /\bname:\s*"([^"]*)"/.exec(body)?.[1] ?? null,
      tierAuthority: /\bauthority:\s*"([^"]*)"/.exec(body)?.[1] ?? null,
    });
  }

  const entryRe =
    /"([a-z0-9-]+)":\s*\{\s*slug:\s*"[^"]*",([\s\S]*?)generic:\s*(?:true|false),/g;
  const authored = new Map();
  let entry;
  while ((entry = entryRe.exec(bankingSource)) !== null) {
    const block = entry[2];
    const banksRef = /\bbanks:\s*(\w+)/.exec(block)?.[1] ?? null;
    const tiersRef = /\btiers:\s*(\w+)/.exec(block)?.[1] ?? null;
    authored.set(entry[1], {
      clearingNetwork: /clearingNetwork:\s*"([^"]*)"/.exec(block)?.[1] ?? null,
      authority: /authority:\s*"([^"]*)"/.exec(block)?.[1] ?? null,
      bankArray: banksRef && bankArrays.has(banksRef) ? bankArrays.get(banksRef) : null,
      tierArray:
        tiersRef && bankArrays.has(tiersRef) ? bankArrays.get(tiersRef) : null,
    });
  }
  return authored;
}
const REGULATORY = parseRegulatory();

/** Direct-clearing network markers — anything that settles on a local RTGS/ACH/instant rail. */
const DIRECT_RAIL_RE =
  /Raast|BEFTN|IMPS|NEFT|RTGS|SPEI|CODI|\bPIX\b|BI\s?-?\s?FAST|InstaPay|PESONet|ePESO|SEPA|TARGET2|CHAPS|\bFPS\b|GIRO|\bRAP\b|KITTS|\bACH\b|\bEFT\b|\bFAST\b|Papara|OTC settlement|\bNIBSS\b|ELIXIR|\bNAPAS\b|PesaLink|GhIPSS|\bCVQ\b|\bKISC\b|\bIMTS\b|\bSTP\b|DECEP|CENDEE|\bIPS\b|Interbank|Clearing|\bBCRD?\b/i;

function railFor(clearingNetwork) {
  if (!clearingNetwork) return "Traditional SWIFT (fallback)";
  return DIRECT_RAIL_RE.test(clearingNetwork)
    ? "Direct local clearing"
    : "Traditional SWIFT (SHA)";
}

function formatRate(rate) {
  const rounded = Number(rate).toFixed(4);
  return String(Number(rounded));
}

function formatCut(cut) {
  return `$${Number(Number(cut).toFixed(2))}`;
}

/** Statutory purpose-code cell: honour the "SBP 9111" / "RESICO Art. 113-E" style. */
function purposeDisplay(corridor, facts) {
  if (!facts) return "Benchmark (not statutory)";
  const tier = facts.tierArray ?? null;
  const code = tier?.purposeCode?.trim() ?? null;
  const codeHasArticle = /\bArt\.?\b/.test(code ?? "");
  const artMatch = /Art\.\s*[^,;]+/.exec(tier?.tierAuthority ?? "");
  if (artMatch && !codeHasArticle) {
    const regime = (tier?.tierName ?? "").split(" (")[0].trim();
    if (regime) return `${regime} ${artMatch[0]}`;
  }
  if (!code) {
    return (
      tier?.tierAuthority?.trim() ||
      tier?.tierName?.trim() ||
      "Statutory tier (no purpose code)"
    );
  }
  const regulator = REGULATOR[corridor.to] ?? null;
  if (/^[A-Z0-9][A-Z0-9 ._#-]*$/.test(code) && regulator) {
    return `${regulator} ${code}`;
  }
  return code;
}

const longTailCount =
  [...corridorsSource.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].length;

const corridors = fees.corridors.map((corridor) => {
  const facts = REGULATORY.get(corridor.slug);
  const group = clearingCurrencyFor(corridor.to, corridor.from);
  const clearingNetwork = facts?.clearingNetwork ?? null;
  return {
    slug: corridor.slug,
    from: corridor.from,
    to: corridor.to,
    rate: corridor.rate,
    country: corridor.country,
    currencyName: corridor.currencyName,
    intermediaryCutUSD:
      facts?.bankArray?.firstCut ?? DEFAULT_INTERMEDIARY_CUT_USD,
    correspondentBics: CORRESPONDENT_BICS[group],
    purposeCode: purposeDisplay(corridor, facts),
    rail: railFor(clearingNetwork),
    clearingNetwork,
  };
});

const updatedISO = fees.updatedAt ?? new Date().toISOString();

/**
 * Compose both manifests. Both lead with the mandated llms.txt framing line so
 * the files visibly describe themselves to any agent reader.
 */
function head(isFull) {
  return [
    "# PayoutDelta - Cross-Border Remittance & Intermediary Fee Benchmark",
    "",
    `> This is an ${isFull ? "llms-full.txt" : "llms.txt"} file. It is a standardized way to present information about a website to LLMs. Read more at https://llmstxt.org`,
    "",
    !isFull
      ? `> PayoutDelta benchmarks exactly what a contractor payout loses inside the banking rail before it lands in the recipient's local account: correspondent SWIFT intermediary deductions (SHA), FX spreads, platform cuts and statutory withholding. The dataset covers ${corridors.length} currency corridors across USD, EUR and GBP origins — USD, EUR and GBP to Pakistan, India, the Philippines, Brazil, Mexico, Nigeria, the EU and beyond — and is restated every time \`data/fees.json\` refreshes (dataset ${updatedISO.slice(0, 10)}, ${corridors.length} corridors, ${longTailCount} platform routes).`
      : `> PayoutDelta is a cross-border remittance and intermediary-fee benchmarking engine for independent contractors: it models the settlement delta between direct local clearing (Raast, IMPS/NEFT/RTGS, SPEI, PIX, SEPA...) and a traditional SWIFT MT103 routed through JPMorgan Chase (CHASUS33), Citibank (CITIUS33), BNY Mellon (IRVTUS3N) or Standard Chartered (SCBLUS33). This full manifest enumerates every corridor in the dataset (${corridors.length} corridors across USD, EUR and GBP origins as of ${updatedISO.slice(0, 10)}) with its benchmark intermediary deduction, correspondent BIC pool, statutory tax purpose code and recommended rail. Figures are informational benchmarks, not offers, and must be verified against the beneficiary bank's credit advice before invoicing.`,
  ];
}

function guidesSection() {
  return [
    "## PayoutDelta Guides",
    "",
    `- [Rate Leaderboard](${SITE_URL}/leaderboard): ranks all ${corridors.length} corridors by the local-currency shortfall a USD 1,000 payout incurs across intermediary, invoice and direct rails.`,
    `- [Payout Calculator](${SITE_URL}/calculator/usd-to-pkr): models intermediary cuts, FX spreads and statutory withholding per corridor, with platform presets (Upwork, Fiverr, Deel) across ${longTailCount} long-tail routes.`,
    `- [Invoice Studio](${SITE_URL}/invoice): contract-grade compliant invoices carrying the statutory purpose code and withholding for the selected corridor.`,
    `- [Regulatory / Tax Ledger](${SITE_URL}/tax-ledger): per-corridor statutory purpose codes, tolerances and withholding rationale.`,
    `- [SWIFT Auditor](${SITE_URL}/swift-auditor): reverse-engineers the correspondent route (direct vs SHA) for any destination BIC.`,
    `- [Embeddable Payout Widget](${SITE_URL}/embed/usd-to-pkr): a static backlink card for any publisher — active mid-market rate, SWIFT intermediary cut and the real net take-home on a $1,000 invoice in a single iframe (all ${corridors.length} corridors live at /embed/<slug>/).`,
  ];
}

function mentionsSection() {
  return [
    "## PayoutDelta References",
    "",
    `- [Machine-readable corridor + rate feed (JSON)](${FEED_URL}): the full ${corridors.length}-corridor dataset with per-platform fees and FX spreads, refreshed daily.`,
    `- [API access & webhook contract](${SITE_URL}/api-access): integration reference for the static feed and derived endpoints.`,
    `- [Full ${corridors.length}-corridor manifest](${SITE_URL}/llms-full.txt): the complete table of intermediary cuts, correspondent BICs, purpose codes and recommended rails below.`,
  ];
}

function legalSection() {
  return [
    "## PayoutDelta Legal",
    "",
    `- [Terms of Service](${SITE_URL}/terms-of-service)`,
    `- [Privacy Policy](${SITE_URL}/privacy-policy)`,
    `- [Disclaimer](${SITE_URL}/disclaimer)`,
    "",
    `## Contact`,
    "",
    `- [Contact](${SITE_URL}/contact)`,
  ];
}

const llmsTxt =
  [
    head(false).join("\n"),
    guidesSection().join("\n"),
    mentionsSection().join("\n"),
    legalSection().join("\n"),
  ].join("\n\n") + "\n";

const table = [
  "| Corridor | Base → Target | Export Rate (per 1 base unit) | Intermediary Cut (USD) | Correspondent Clearing BICs | Statutory Tax Purpose Code | Recommended Rail |",
  "|---|---|---|---|---|---|---|",
  ...corridors.map(
    (c) =>
      `| [${c.slug}](${SITE_URL}/calculator/${c.slug}) | ${c.from} → ${c.to} | ${formatRate(c.rate)} | ${formatCut(c.intermediaryCutUSD)} | ${c.correspondentBics.join(", ")} | ${c.purposeCode} | ${c.rail} |`
  ),
];

const correspondentLegend = [
  "### Correspondent clearing nodes",
  "",
  "Public SWIFT/BIC identifiers a traditional MT103 may clear through before the recipient bank. The pool listed per corridor matches its clearing currency (USD, EUR or GBP).",
  "",
  `- USD · JPMorgan Chase New York (CHASUS33), Citibank New York (CITIUS33), BNY Mellon New York (IRVTUS3N), Standard Chartered New York (SCBLUS33)`,
  `- EUR · Deutsche Bank Frankfurt (DEUTDEFF), BNP Paribas Paris (BNPAFRPA), Commerzbank Frankfurt (COMMDEFF), Santander Frankfurt (SANBDEFF), BBVA Frankfurt (BBVADEFF)`,
  `- GBP · Barclays London (BARCGB22), HSBC UK (MIDLGB22), Standard Chartered London (SCBLGB2L), HSBC Bank London (HSBCGB2L)`,
];

const notes = [
  "### Notes on the numbers",
  "",
  `- Intermediary Cut is the median SHA deduction benchmarked from each corridor's audited bank records; the actual deduction appears on the beneficiary bank's credit advice (CRF).`,
  `- Export Rate is quoted per one unit of the corridor's Base currency (USD, EUR or GBP given in the "Base → Target" column); it is the local-currency equivalent of one unit delivered through the modern rail.`,
  `- Recommended Rail is derived from the corridor's published clearing network: local RTGS / instant / ACH rails (Raast, BEFTN, IMPS, NEFT, RTGS, SPEI, PIX, BI-FAST, InstaPay, SEPA, CHAPS) are classified direct; anything else is classified as a traditional SWIFT MT103.`,
  `- Statutory Tax Purpose Code lists the first statutory tier's purpose code plus an article reference where the regime is statute-specific (e.g. "RESICO Art. 113-E" for Mexico's LISR regime).`,
  "- Nothing on this site is legal or financial advice.",
];

const llmsFullTxt =
  [
    head(true).join("\n"),
    guidesSection().join("\n"),
    mentionsSection().join("\n"),
    [
      "## Corridor Database",
      "",
      `Dataset snapshot: ${updatedISO} — ${corridors.length} corridors.`,
    ].join("\n"),
    table.join("\n"),
    correspondentLegend.join("\n"),
    notes.join("\n"),
  ].join("\n\n") + "\n";

writeFileSync(join(ROOT, "public", "llms.txt"), llmsTxt, "utf8");
writeFileSync(join(ROOT, "public", "llms-full.txt"), llmsFullTxt, "utf8");

console.log(
  `AEO manifests generated -> public/llms.txt (${llmsTxt.length} bytes), public/llms-full.txt (${llmsFullTxt.length} bytes, ${corridors.length} corridors)`
);