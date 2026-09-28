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
  index.push({
    id: `corridor-${c.slug}`,
    title: `${c.from} to ${c.to}`,
    subtitle: c.country,
    badge: "Corridor",
    url: `/payout-delta/calculator/${c.slug}/`,
    keywords: [c.slug, c.from, c.to, c.country, c.countryCode, c.currencyName, c.currencySymbol].filter(Boolean)
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
  id: "util-matrix",
  title: "Intermediary Deductions Sensitivity Matrix",
  subtitle: "Evaluate cross-border wire friction",
  badge: "Utility",
  url: "/payout-delta/matrix/",
  keywords: ["matrix", "sensitivity", "deductions", "friction", "wire"]
});

index.push({
  id: "util-fx",
  title: "Canonical FX Converter",
  subtitle: "Compare Mid-market against Platform Rails",
  badge: "Utility",
  url: "/payout-delta/fx/",
  keywords: ["fx", "converter", "exchange", "mid-market", "compare"]
});

index.push({
  id: "util-tax",
  title: "Tax Clearance Ledger",
  subtitle: "Sovereign WHT bands",
  badge: "Utility",
  url: "/payout-delta/tax-clearance/",
  keywords: ["tax", "clearance", "withholding", "wht", "ledger", "jurisdictions"]
});

const outPath = join(ROOT, "public", "api", "search-index.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(index));
console.log(`static search index built -> public/api/search-index.json (${index.length} entries)`);
