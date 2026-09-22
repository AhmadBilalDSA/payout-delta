/**
 * PayoutDelta — Regional bank & jurisdiction directory (Phase 8).
 *
 * Static, build-time data feeding the `TransactionCostingWidget`. The four
 * heavily-audited corridors carry real domestic banks with SWIFT codes, typical
 * intermediary deductions and provincial/state tax regimes; the remaining
 * corridors (BRL, EUR, GBP, NGN, BDT, ZAR) fall back to generic local-clearing
 * channels so the widget never renders empty on any audited route.
 *
 * All monetary figures are informational benchmarks — the actual deduction
 * lands on the bank's credit advice and must be verified before invoicing.
 */

export interface RegionalJurisdiction {
  id: string;
  /** Short selector label, e.g. "Punjab (PRA)" — regional names are data. */
  name: string;
  /** Tax authority reference, e.g. "Punjab Revenue Authority". */
  authority: string;
  /** Withholding as a decimal fraction (0.16 = 16%). */
  rate: number;
  /** True for export-exemption tiers (PSEB/LUT). */
  exemption?: boolean;
  /** Regulatory detail line. */
  note: string;
}

export interface RegionalBank {
  id: string;
  /** Short name, e.g. "Meezan Bank". */
  name: string;
  /** Dropdown label, e.g. "Meezan Bank (Pakistan)". */
  displayName: string;
  /** SWIFT / BIC. */
  swiftCode: string;
  /** Typical intermediary deduction band in USD. */
  intermediaryMinUSD: number;
  intermediaryMaxUSD: number;
  /** Default receiving-bank fee in the destination currency. */
  localFeeDefault: number;
  /** Clearance / realization timeline, e.g. "24–48h (Raast + e-PRC)". */
  clearance: string;
  localCurrency: string;
}

export interface CorridorBanking {
  slug: string;
  corridor: string;
  banks: RegionalBank[];
  jurisdictions: RegionalJurisdiction[];
  /** True for the generic fallback entries. */
  generic: boolean;
}

const pkrJurisdictions: RegionalJurisdiction[] = [
  {
    id: "punjab",
    name: "Punjab (PRA)",
    authority: "Punjab Revenue Authority",
    rate: 0.16,
    note: "16% provincial sales tax withholding on services.",
  },
  {
    id: "sindh",
    name: "Sindh (SRB)",
    authority: "Sindh Revenue Board",
    rate: 0.13,
    note: "13% provincial withholding through SRB registration.",
  },
  {
    id: "ict",
    name: "ICT / Federal",
    authority: "Federal Board of Revenue",
    rate: 0.15,
    note: "15% federal services withholding (non-provincial filers).",
  },
  {
    id: "kp",
    name: "Khyber Pakhtunkhwa (KPRA)",
    authority: "Khyber Pakhtunkhwa Revenue Authority",
    rate: 0.15,
    note: "15% provincial withholding under the KPRA.",
  },
  {
    id: "pseb",
    name: "PSEB Export Exemption",
    authority: "Pakistan Software Export Board",
    rate: 0.0025,
    exemption: true,
    note: "0.25% final tax via SBP/FBR Section 154A — export proceeds preferential tier.",
  },
];

const inrJurisdictions: RegionalJurisdiction[] = [
  {
    id: "lut",
    name: "GST LUT Export",
    authority: "Zero-rated IT export (LUT)",
    rate: 0,
    exemption: true,
    note: "Zero-rated export supplies under a valid Letter of Undertaking.",
  },
  {
    id: "tds194",
    name: "Freelance IT TDS 1%",
    authority: "Income-tax u/s 194S / 194C (lower band)",
    rate: 0.01,
    note: "1% TDS for qualified freelancer IT service exports.",
  },
  {
    id: "standard",
    name: "Standard TCS/TDS 5%",
    authority: "Typical withholding estimate",
    rate: 0.05,
    note: "5% standard withholding band — confirm your LTU/TDS certificate.",
  },
];

const phpJurisdictions: RegionalJurisdiction[] = [
  {
    id: "none",
    name: "No regional tier",
    authority: "BIR registration dependent",
    rate: 0,
    note: "Philippine freelancers — confirm your BIR withholding registration.",
  },
];

const egpJurisdictions: RegionalJurisdiction[] = [
  {
    id: "none",
    name: "No regional tier",
    authority: "Tax card status dependent",
    rate: 0,
    note: "Egyptian IT exports — confirm bank tax card status with the receiving bank.",
  },
];

const genericJurisdictions: RegionalJurisdiction[] = [
  {
    id: "none",
    name: "No regional tier",
    authority: "Settlement-time dependent",
    rate: 0,
    note: "Generic corridor — confirm local withholding with your receiving bank.",
  },
];

const pkrBanks: RegionalBank[] = [
  {
    id: "meezan",
    name: "Meezan Bank",
    displayName: "Meezan Bank (Pakistan)",
    swiftCode: "MEZNPKKA",
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 20,
    localFeeDefault: 150,
    clearance: "24–48h (Raast + e-PRC)",
    localCurrency: "PKR",
  },
  {
    id: "hbl",
    name: "HBL",
    displayName: "HBL (Pakistan)",
    swiftCode: "HABBPKKA",
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 20,
    localFeeDefault: 150,
    clearance: "24–48h (Raast + e-PRC)",
    localCurrency: "PKR",
  },
  {
    id: "scb-pk",
    name: "Standard Chartered",
    displayName: "Standard Chartered (Pakistan)",
    swiftCode: "SCBLPKKX",
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 20,
    localFeeDefault: 150,
    clearance: "24–48h (Raast + e-PRC)",
    localCurrency: "PKR",
  },
  {
    id: "alfalah",
    name: "Bank Alfalah",
    displayName: "Bank Alfalah (Pakistan)",
    swiftCode: "ALFHPKKA",
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 20,
    localFeeDefault: 150,
    clearance: "24–48h (Raast + e-PRC)",
    localCurrency: "PKR",
  },
];

const inrBanks: RegionalBank[] = [
  {
    id: "hdfc",
    name: "HDFC Bank",
    displayName: "HDFC Bank (India)",
    swiftCode: "HDFCINBB",
    intermediaryMinUSD: 0,
    intermediaryMaxUSD: 20,
    localFeeDefault: 100,
    clearance: "1–2 days inward",
    localCurrency: "INR",
  },
  {
    id: "icici",
    name: "ICICI Bank",
    displayName: "ICICI Bank (India)",
    swiftCode: "ICICINBB",
    intermediaryMinUSD: 0,
    intermediaryMaxUSD: 20,
    localFeeDefault: 100,
    clearance: "1–2 days inward",
    localCurrency: "INR",
  },
  {
    id: "sbi",
    name: "State Bank of India",
    displayName: "SBI (India)",
    swiftCode: "SBININBB",
    intermediaryMinUSD: 0,
    intermediaryMaxUSD: 20,
    localFeeDefault: 100,
    clearance: "1–2 days inward",
    localCurrency: "INR",
  },
  {
    id: "axis",
    name: "Axis Bank",
    displayName: "Axis Bank (India)",
    swiftCode: "AXISINBB",
    intermediaryMinUSD: 0,
    intermediaryMaxUSD: 20,
    localFeeDefault: 100,
    clearance: "1–2 days inward",
    localCurrency: "INR",
  },
];

const phpBanks: RegionalBank[] = [
  {
    id: "bdo",
    name: "BDO Unibank",
    displayName: "BDO Unibank (Philippines)",
    swiftCode: "BNORPHMM",
    intermediaryMinUSD: 5,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    clearance: "PESONet same-day",
    localCurrency: "PHP",
  },
  {
    id: "bpi",
    name: "BPI",
    displayName: "BPI (Philippines)",
    swiftCode: "BOPIPHMM",
    intermediaryMinUSD: 5,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    clearance: "PESONet same-day",
    localCurrency: "PHP",
  },
  {
    id: "unionbank",
    name: "UnionBank",
    displayName: "UnionBank of the Philippines",
    swiftCode: "UBPHPHMM",
    intermediaryMinUSD: 5,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    clearance: "PESONet same-day",
    localCurrency: "PHP",
  },
];

const egpBanks: RegionalBank[] = [
  {
    id: "cib",
    name: "Commercial International Bank",
    displayName: "CIB (Egypt)",
    swiftCode: "CIBEEGCX",
    intermediaryMinUSD: 0,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    clearance: "1–2 business days",
    localCurrency: "EGP",
  },
  {
    id: "nbe",
    name: "National Bank of Egypt",
    displayName: "NBE (Egypt)",
    swiftCode: "NBEGEGCX",
    intermediaryMinUSD: 0,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    clearance: "1–2 business days",
    localCurrency: "EGP",
  },
  {
    id: "banquemisr",
    name: "Banque Misr",
    displayName: "Banque Misr (Egypt)",
    swiftCode: "BMAEEGCX",
    intermediaryMinUSD: 0,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    clearance: "1–2 business days",
    localCurrency: "EGP",
  },
];

/** Generic local-clearing channel for the unaudited corridors. */
function genericBank(slug: string, label: string, currency: string): RegionalBank[] {
  return [
    {
      id: "local-wire",
      name: "Local bank wire",
      displayName: `${label} (local clearing)`,
      swiftCode: "—",
      intermediaryMinUSD: 0,
      intermediaryMaxUSD: 30,
      localFeeDefault: 0,
      clearance: "1–3 business days",
      localCurrency: currency,
    },
  ];
}

const GENERIC_BY_SLUG: Record<string, { corridor: string; label: string; currency: string }> = {
  "usd-to-brl": { corridor: "US Dollar → Brazilian Real", label: "Itaú / Bradesco", currency: "BRL" },
  "usd-to-eur": { corridor: "US Dollar → Euro", label: "SEPA IBAN bank", currency: "EUR" },
  "usd-to-gbp": { corridor: "US Dollar → British Pound", label: "FPS sort-code bank", currency: "GBP" },
  "usd-to-ngn": { corridor: "US Dollar → Nigerian Naira", label: "Local NEFT bank", currency: "NGN" },
  "usd-to-bdt": { corridor: "US Dollar → Bangladeshi Taka", label: "RTGS bank", currency: "BDT" },
  "usd-to-zar": { corridor: "US Dollar → South African Rand", label: "Local EFT bank", currency: "ZAR" },
};

const AUTHORED: Record<string, CorridorBanking> = {
  "usd-to-pkr": {
    slug: "usd-to-pkr",
    corridor: "US Dollar → Pakistani Rupee",
    banks: pkrBanks,
    jurisdictions: pkrJurisdictions,
    generic: false,
  },
  "usd-to-inr": {
    slug: "usd-to-inr",
    corridor: "US Dollar → Indian Rupee",
    banks: inrBanks,
    jurisdictions: inrJurisdictions,
    generic: false,
  },
  "usd-to-php": {
    slug: "usd-to-php",
    corridor: "US Dollar → Philippine Peso",
    banks: phpBanks,
    jurisdictions: phpJurisdictions,
    generic: false,
  },
  "usd-to-egp": {
    slug: "usd-to-egp",
    corridor: "US Dollar → Egyptian Pound",
    banks: egpBanks,
    jurisdictions: egpJurisdictions,
    generic: false,
  },
};

/** Phase 8 — resolves the banking profile for any audited corridor slug. */
export function getRegionalBanking(slug: string): CorridorBanking {
  const authored = AUTHORED[slug];
  if (authored) {
    return authored;
  }
  const fallback = GENERIC_BY_SLUG[slug] ?? {
    corridor: slug,
    label: "Local bank wire",
    currency: slug.split("-").pop()?.toUpperCase() ?? "LOCAL",
  };
  return {
    slug,
    corridor: fallback.corridor,
    banks: genericBank(slug, fallback.label, fallback.currency),
    jurisdictions: genericJurisdictions,
    generic: true,
  };
}