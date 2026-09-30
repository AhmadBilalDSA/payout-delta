import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Read sources
const banksData = JSON.parse(readFileSync(join(ROOT, "data", "banksRegistry.json"), "utf8"));
const jurisData = JSON.parse(readFileSync(join(ROOT, "data", "jurisdictions.json"), "utf8"));
const feesData = JSON.parse(readFileSync(join(ROOT, "data", "fees.json"), "utf8"));
const banksTs = readFileSync(join(ROOT, "data", "banks.ts"), "utf8");

const dossierMap = new Map();
const blocks = banksTs.split("slug: ");
for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const slugMatch = block.match(/^"([^"]+)"/);
  const bicMatch = block.match(/swiftBic:\s*"([^"]+)"/);
  if (slugMatch && bicMatch) {
    dossierMap.set(bicMatch[1], slugMatch[1]);
  }
}

const index = [];

// 2. Banks
for (const b of banksData.banks) {
  const slug = dossierMap.get(b.bic) || b.bic.toLowerCase();
  index.push({
    id: `bank-${b.bic}`,
    title: b.name,
    subtitle: `${b.countryIso2} • ${b.bic}`,
    badge: "Bank",
    url: `/payout-delta/banks/${slug}/`,
    keywords: [b.bic, b.countryIso2, b.name]
  });
}

// 3. Jurisdictions
for (const j of jurisData.jurisdictions) {
  index.push({
    id: `jurisdiction-${j.iso2}`,
    title: j.name,
    subtitle: `${j.currency} • WHT: ${j.tax.baselineWhtPct}%`,
    badge: "Jurisdiction",
    url: `/payout-delta/tax-clearance/`,
    keywords: [j.iso2, j.currency, j.name, j.tax.purposeCode, j.tax.statutoryAct].filter(Boolean)
  });
}

// 4. Corridors (from fees.json)
for (const c of feesData.corridors) {
  const juris = jurisData.jurisdictions.find(j => j.iso2 === c.countryCode);
  const primaryBics = juris ? juris.primaryBankBics : [];
  const primaryRail = juris ? juris.primaryRailId : "";
  const bankDetails = primaryBics.map(bic => banksData.banks.find(b => b.bic === bic)).filter(Boolean);
  const shaDeduction = bankDetails.length > 0 ? bankDetails[0].defaultIntermediaryCutUSD : 18;

  index.push({
    id: `corridor-${c.slug}`,
    title: `${c.from} to ${c.to}`,
    subtitle: c.country,
    badge: "Corridor",
    url: `/payout-delta/calculator/${c.slug}/`,
    keywords: [c.slug, c.from, c.to, c.country, c.countryCode, c.currencyName, c.currencySymbol, primaryRail, ...primaryBics].filter(Boolean),
    meta: {
      flag: c.countryCode,
      shaDeduction: shaDeduction,
      rail: primaryRail
    }
  });
}

// 5. Utility Routes
index.push({
  id: "util-reverse",
  title: "Reverse Invoice Calculator",
  subtitle: "Gross up your target net",
  badge: "Utility",
  url: "/payout-delta/reverse-calculator/",
  keywords: ["reverse", "gross up", "calculator", "invoice", "net"]
});

index.push({
  id: "util-split",
  title: "Multi-Rail Split Optimizer",
  subtitle: "Compare SWIFT, Payoneer, FCVA",
  badge: "Utility",
  url: "/payout-delta/split/",
  keywords: ["split", "optimizer", "multi-rail", "swift", "payoneer", "wise", "fcva"]
});

index.push({
  id: "util-compare",
  title: "Multi-Rail Corridor Comparator",
  subtitle: "Compare SWIFT SHA vs OUR vs Local Clearing",
  badge: "Utility",
  url: "/payout-delta/compare/",
  keywords: ["compare", "comparator", "swift", "sha", "our", "local clearing"]
});

index.push({
  id: "util-export",
  title: "Institutional Reconciliation Ledger Export",
  subtitle: "Generate and export an institutional payment audit sheet",
  badge: "Utility",
  url: "/payout-delta/export/",
  keywords: ["export", "ledger", "audit", "sheet", "pdf", "csv"]
});

const outDir = join(ROOT, "public", "api");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "search-index.json"), JSON.stringify(index, null, 2));

console.log(`static search index built -> public/api/search-index.json (${index.length} entries)`);
