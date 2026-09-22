/**
 * PayoutDelta — Statutory Laws & Local Bank Clearing database (Phase 9).
 *
 * Static, build-time regulatory data feeding the `TransactionCostingWidget`.
 * Each corridor carries the governing statutory authority, the real domestic
 * banks a freelancer actually receives funds through (with benchmark SWIFT
 * intermediary cuts and local clearing rails), and the statutory withholding /
 * exemption tiers used to compute the "real bank take-home".
 *
 * The eight fully-audited corridors (PKR, INR, PHP, VND, KES, IDR, COP, TRY)
 * reference the underlying legislation by section; every remaining corridor
 * falls back to accurate standard intermediary bands ($15–$25) plus its
 * national clearing network identifier so the engine never renders empty on
 * any audited route.
 *
 * All monetary figures are informational benchmarks — the actual deduction
 * lands on the bank's credit advice (CRF) and must be verified before
 * invoicing. No legal advice is expressed here.
 */

export interface StatutoryTier {
  id: string;
  /** Short selector label, e.g. "PSEB Registered IT Exporter". */
  name: string;
  /** Governing authority / statutory basis, e.g. "ITO Section 154A". */
  authority: string;
  /** Withholding as a decimal fraction (0.0025 = 0.25%). */
  rate: number;
  /** Export purpose code when one applies (9111, P0802, …). */
  purposeCode?: string;
  /** True for exemption tiers (PSEB / GST LUT). */
  exemption?: boolean;
  /** Compliance detail line. */
  note: string;
}

export interface RegulatoryBank {
  id: string;
  /** Short name, e.g. "Meezan Bank". */
  name: string;
  /** Dropdown label, e.g. "Meezan Bank (Pakistan)". */
  displayName: string;
  /** Real SWIFT / BIC accounted in the country's directory. */
  swiftCode: string;
  /** Benchmark intermediary SWIFT cut in USD. */
  intermediaryUSD: number;
  /** Typical band used for the benchmark chip. */
  intermediaryMinUSD: number;
  intermediaryMaxUSD: number;
  /** Default receiving-bank fee in the destination currency (0 = free rail). */
  localFeeDefault: number;
  /** Speed rating for the selector, e.g. "Fast". */
  speed: string;
  /** Clearance / realization timeline detail. */
  clearance: string;
  /** Destination currency. */
  localCurrency: string;
}

export interface CorridorRegulation {
  slug: string;
  /** Opening statutory authority reference (seductive shorthands kept). */
  authority: string;
  /** National clearing network identifier. */
  clearingNetwork: string;
  /**
   * Phase 2 — extractable statutory evidence anchors for the AEO citation
   * chips: named regulator + section + purpose-code shorthand per corridor.
   */
  citations: string[];
  /** Banks offered in the recipient dropdown. */
  banks: RegulatoryBank[];
  /** Statutory tax / exemption tiers. */
  tiers: StatutoryTier[];
  /** True for the generic fallback entries. */
  generic: boolean;
}

/* ---------------------------------------------------------------------------
 * Pakistan — USD → PKR
 * SBP Foreign Exchange Manual Chapter 13 & Income Tax Ordinance Section 154A.
 * ------------------------------------------------------------------------- */

const pkrTiers: StatutoryTier[] = [
  {
    id: "pseb",
    name: "PSEB Registered IT Exporter",
    authority: "ITO Section 154A",
    rate: 0.0025,
    purposeCode: "9111",
    exemption: true,
    note: "0.25% final withholding · PRC Purpose Code 9111 (Computer & Information Services) · provincial PST exemption verified under PRA (Punjab), SRB (Sindh) & KPRA (KP).",
  },
  {
    id: "filer",
    name: "Non-PSEB Active Filer",
    authority: "ITO Section 154A",
    rate: 0.01,
    purposeCode: "9111",
    note: "1% final withholding on export bank remittances · Purpose Code 9111 · active NTN filer status required.",
  },
  {
    id: "nonfiler",
    name: "Non-Filer",
    authority: "ITO — adjustable withholding",
    rate: 0.02,
    purposeCode: "9111",
    note: "2% adjustable withholding · confirm NTN / active-filer status with your bank.",
  },
];

const pkrBanks: RegulatoryBank[] = [
  {
    id: "meezan",
    name: "Meezan Bank",
    displayName: "Meezan Bank (Pakistan)",
    swiftCode: "MZNBPKKA",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Raast Inward: 0 PKR · e-PRC 24 hrs",
    localCurrency: "PKR",
  },
  {
    id: "hbl",
    name: "Habib Bank Limited",
    displayName: "HBL (Pakistan)",
    swiftCode: "HABBPNKA",
    intermediaryUSD: 18,
    intermediaryMinUSD: 18,
    intermediaryMaxUSD: 18,
    localFeeDefault: 100,
    speed: "Standard",
    clearance: "PRC turnaround 48 hrs",
    localCurrency: "PKR",
  },
  {
    id: "scb-pk",
    name: "Standard Chartered",
    displayName: "Standard Chartered (Pakistan)",
    swiftCode: "SCBLPKKA",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 12,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Priority FX margin",
    localCurrency: "PKR",
  },
  {
    id: "alfalah",
    name: "Bank Alfalah",
    displayName: "Bank Alfalah (Pakistan)",
    swiftCode: "ALFHPKKA",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "PRC turnaround 24–48 hrs",
    localCurrency: "PKR",
  },
];

/* ---------------------------------------------------------------------------
 * India — USD → INR
 * RBI AP (DIR Series) No. 46 & Section 194S of the Income Tax Act.
 * ------------------------------------------------------------------------- */

const inrTiers: StatutoryTier[] = [
  {
    id: "lut",
    name: "GST LUT Zero-Rated Export",
    authority: "Rule 96A of CGST Rules",
    rate: 0,
    purposeCode: "P0802",
    exemption: true,
    note: "0% GST + 0% export TDS under a valid Letter of Undertaking · Purpose Code P0802 (Software & Technology Services).",
  },
  {
    id: "presumptive",
    name: "Standard IT Presumptive",
    authority: "Section 44ADA",
    rate: 0,
    purposeCode: "P0802",
    note: "0% at source · 50% of gross considered net profit for assessment.",
  },
  {
    id: "tds-194",
    name: "Standard Freelancer TDS",
    authority: "u/s 194J / 194C",
    rate: 0.01,
    purposeCode: "P0802",
    note: "1% TDS for non-exempt freelancer IT service exports · Purpose Code P0802.",
  },
];

const inrBanks: RegulatoryBank[] = [
  {
    id: "hdfc",
    name: "HDFC Bank",
    displayName: "HDFC Bank (India)",
    swiftCode: "HDFCINBB",
    intermediaryUSD: 14,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 14,
    localFeeDefault: 75,
    speed: "Fast",
    clearance: "Inward ₹75 + GST · FIRC / e-BRC ₹100",
    localCurrency: "INR",
  },
  {
    id: "icici",
    name: "ICICI Bank",
    displayName: "ICICI Bank (India)",
    swiftCode: "ICICINBB",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 15,
    localFeeDefault: 50,
    speed: "Fast",
    clearance: "FIRC ₹50",
    localCurrency: "INR",
  },
  {
    id: "sbi",
    name: "State Bank of India",
    displayName: "SBI (India)",
    swiftCode: "SBININBB",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 12,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Inward 1–2 days",
    localCurrency: "INR",
  },
];

/* ---------------------------------------------------------------------------
 * Philippines — USD → PHP
 * Bangko Sentral ng Pilipinas (BSP) Circular 980 & BIR 8% Freelance Gross Tax.
 * ------------------------------------------------------------------------- */

const phpTiers: StatutoryTier[] = [
  {
    id: "bir8",
    name: "BIR 8% Gross Flat Rate",
    authority: "BIR 8% Freelance Gross Income Tax",
    rate: 0.08,
    note: "Flat 8% gross income tax for income over ₱250,000 per annum.",
  },
  {
    id: "osd",
    name: "BIR Graduated Rates + OSD",
    authority: "BIR graduated rates with OSD",
    rate: 0,
    note: "Graduated income tax brackets with the Optional Standard Deduction.",
  },
];

const phpBanks: RegulatoryBank[] = [
  {
    id: "bdo",
    name: "BDO Unibank",
    displayName: "BDO Unibank (Philippines)",
    swiftCode: "BNORPHMM",
    intermediaryUSD: 5,
    intermediaryMinUSD: 5,
    intermediaryMaxUSD: 5,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Inward foreign charge $5.00 · PESONet clearing 0 PHP",
    localCurrency: "PHP",
  },
  {
    id: "bpi",
    name: "BPI",
    displayName: "BPI (Philippines)",
    swiftCode: "BOFIPHMM",
    intermediaryUSD: 5.5,
    intermediaryMinUSD: 5.5,
    intermediaryMaxUSD: 5.5,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Inward foreign charge $5.50",
    localCurrency: "PHP",
  },
  {
    id: "unionbank",
    name: "UnionBank",
    displayName: "UnionBank of the Philippines",
    swiftCode: "UBPHPHMM",
    intermediaryUSD: 5,
    intermediaryMinUSD: 5,
    intermediaryMaxUSD: 5,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "Inward foreign charge $5.00 · InstaPay instant crediting",
    localCurrency: "PHP",
  },
];

/* ---------------------------------------------------------------------------
 * Vietnam — USD → VND
 * State Bank of Vietnam Circular 32/2013/TT-NHNN (fund transfer rules) &
 * Circular 111/2013/TT-BTC (2% flat rate on IT services).
 * ------------------------------------------------------------------------- */

const vndTiers: StatutoryTier[] = [
  {
    id: "vietnam-export",
    name: "Software / IT Export Presumptive",
    authority: "Circular 111/2013/TT-BTC",
    rate: 0.02,
    purposeCode: "SW / IT services",
    note: "2% flat rate on cross-border IT / software service income from foreign clients.",
  },
  {
    id: "vietnam-exempt",
    name: "Zero-Rated Software Service",
    authority: "Circular 111/2013/TT-BTC · 0% VAT export",
    rate: 0,
    purposeCode: "Software export",
    exemption: true,
    note: "0% VAT on exported software / IT services — confirm with the servicing bank.",
  },
];

const vndBanks: RegulatoryBank[] = [
  {
    id: "vcb",
    name: "Vietcombank",
    displayName: "Vietcombank (Vietnam)",
    swiftCode: "BFTVVNVX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 12,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NAPAS instant · CVQ inward 1 day",
    localCurrency: "VND",
  },
  {
    id: "tcb",
    name: "Techcombank",
    displayName: "Techcombank (Vietnam)",
    swiftCode: "TCBVVNVX",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 10,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NAPAS instant · CVQ inward 1 day",
    localCurrency: "VND",
  },
  {
    id: "vpb",
    name: "VPBank",
    displayName: "VPBank (Vietnam)",
    swiftCode: "VPBKVNVX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 12,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NAPAS clearing 1 day",
    localCurrency: "VND",
  },
];

/* ---------------------------------------------------------------------------
 * Kenya — USD → KES
 * Central Bank of Kenya Prudential Guidelines & KRA Income Tax Act Section 35
 * (5% non-resident withholding on SWIFT service remittances).
 * ------------------------------------------------------------------------- */

const kesTiers: StatutoryTier[] = [
  {
    id: "kenya-nonresident",
    name: "Non-Resident Service Withholding",
    authority: "KRA ITO Section 35",
    rate: 0.05,
    purposeCode: "SWIFT service remittance",
    note: "5% non-resident tax on service payments from foreign clients.",
  },
  {
    id: "kenya-resident",
    name: "Resident Freelancer",
    authority: "KRA ITO normal rates",
    rate: 0,
    purposeCode: "Resident individual",
    exemption: true,
    note: "Standard resident rates / P.A.Y.E. on local remittances.",
  },
];

const kesBanks: RegulatoryBank[] = [
  {
    id: "equity",
    name: "Equity Bank",
    displayName: "Equity Bank (Kenya)",
    swiftCode: "EQBLKENA",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PesaLink instant · EFT 1 day",
    localCurrency: "KES",
  },
  {
    id: "kcb",
    name: "KCB Bank",
    displayName: "KCB Bank (Kenya)",
    swiftCode: "KCBLKENX",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PesaLink instant · EFT 1 day",
    localCurrency: "KES",
  },
];

/* ---------------------------------------------------------------------------
 * Indonesia — USD → IDR
 * Bank Indonesia Regulation No. 16/21/PBI (BI-FAST) & PPh 21 presumptive
 * export tax on IT income.
 * ------------------------------------------------------------------------- */

const idrTiers: StatutoryTier[] = [
  {
    id: "indonesia-pph21",
    name: "PPh 21 IT Presumptive Export",
    authority: "PPh Pasal 21",
    rate: 0.05,
    purposeCode: "IT service export",
    note: "5% presumptive income tax on IT service export income.",
  },
  {
    id: "indonesia-exempt",
    name: "Zero-Rated Export Service",
    authority: "PPh Pasal 21 · export certificate",
    rate: 0,
    purposeCode: "IT service export",
    exemption: true,
    note: "0% where an export service certificate (PEB / PPJK) is held.",
  },
];

const idrBanks: RegulatoryBank[] = [
  {
    id: "bca",
    name: "Bank Central Asia",
    displayName: "BCA (Indonesia)",
    swiftCode: "CENAIDJA",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 12,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BI-FAST instant · BI-RTGS 1 day",
    localCurrency: "IDR",
  },
  {
    id: "mandiri",
    name: "Bank Mandiri",
    displayName: "Bank Mandiri (Indonesia)",
    swiftCode: "BMRIIDJA",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BI-FAST instant · BI-RTGS 1 day",
    localCurrency: "IDR",
  },
];

/* ---------------------------------------------------------------------------
 * Colombia — USD → COP
 * Banco de la República Circular DCIN-83 Formulario 5 (declaración de cambio)
 * & DIAN Article 392 retención en la fuente.
 * ------------------------------------------------------------------------- */

const copTiers: StatutoryTier[] = [
  {
    id: "colombia-dian",
    name: "DIAN Retención — Export Services",
    authority: "DIAN Art. 392",
    rate: 0.01,
    purposeCode: "Declaración de cambio",
    note: "1% source withholding on foreign-currency export service income.",
  },
  {
    id: "colombia-exempt",
    name: "Zero-Rated Export Service",
    authority: "DIAN Art. 392 · export certificate",
    rate: 0,
    purposeCode: "Declaración de cambio",
    exemption: true,
    note: "0% where the exporter holds a valid export-services certificate.",
  },
];

const copBanks: RegulatoryBank[] = [
  {
    id: "bancolombia",
    name: "Bancolombia",
    displayName: "Bancolombia (Colombia)",
    swiftCode: "COLOCOBM",
    intermediaryUSD: 14,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "SEBRA 1 day · ACH same-day",
    localCurrency: "COP",
  },
  {
    id: "davivienda",
    name: "Davivienda",
    displayName: "Davivienda (Colombia)",
    swiftCode: "CAVHCOBM",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "SEBRA 1 day · domiciliação 1–2 days",
    localCurrency: "COP",
  },
];

/* ---------------------------------------------------------------------------
 * Turkey — USD → TRY
 * CBRT Circular on Invisible Transactions & Income Tax Law Article 89/13
 * (80% software earnings exemption).
 * ------------------------------------------------------------------------- */

const tryTiers: StatutoryTier[] = [
  {
    id: "turkey-software",
    name: "Software Earnings Exemption",
    authority: "GVK Art. 89/13",
    rate: 0,
    purposeCode: "Software / IT export",
    exemption: true,
    note: "80% of software-production income exempt under Art. 89/13.",
  },
  {
    id: "turkey-standard",
    name: "Standard Slab",
    authority: "GVK normal rates",
    rate: 0.15,
    purposeCode: "Non-exempt income",
    note: "Indicative 15% standard band when the software exemption does not apply.",
  },
];

const tryBanks: RegulatoryBank[] = [
  {
    id: "garanti",
    name: "Garanti BBVA",
    displayName: "Garanti BBVA (Turkey)",
    swiftCode: "TGBATRIS",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "FAST instant · EFT 1 day",
    localCurrency: "TRY",
  },
  {
    id: "isbank",
    name: "İşbank",
    displayName: "İşbank (Turkey)",
    swiftCode: "ISBKTRIS",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 12,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "FAST instant · EFT 1 day",
    localCurrency: "TRY",
  },
];

/* ---------------------------------------------------------------------------
 * Global fallback engine — EUR / GBP / BRL / NGN / BDT / EGP / ZAR.
 * Standard intermediary deduction $15–$25, national clearing network, and a
 * statutory export-tax compliance notice.
 * ------------------------------------------------------------------------- */

export const FALLBACK_SWIFT_BAND = { min: 15, max: 25 };

const FALLBACK_NETWORKS: Record<string, string> = {
  "usd-to-eur": "SEPA",
  "usd-to-gbp": "BACS / FPS",
  "usd-to-brl": "PIX",
  "usd-to-ngn": "NIBSS",
  "usd-to-bdt": "BEFTN",
  "usd-to-egp": "InstaPay / ACH",
  "usd-to-zar": "EFT / ACH",
};

function fallbackTiers(network: string): StatutoryTier[] {
  return [
    {
      id: "export-compliance",
      name: "Export Tax Compliance",
      authority: "Statutory export-tax compliance",
      rate: 0,
      note: `Standard inbound ${network} remittance — confirm local withholding / VAT status with the receiving bank before invoicing.`,
    },
  ];
}

function genericBank(label: string, currency: string, clearance: string): RegulatoryBank[] {
  return [
    {
      id: "local-wire",
      name: "Local bank wire",
      displayName: `${label} (local clearing)`,
      swiftCode: "—",
      intermediaryUSD: 18,
      intermediaryMinUSD: FALLBACK_SWIFT_BAND.min,
      intermediaryMaxUSD: FALLBACK_SWIFT_BAND.max,
      localFeeDefault: 0,
      speed: "Standard",
      clearance,
      localCurrency: currency,
    },
  ];
}

const GENERIC_BY_SLUG: Record<string, { label: string; currency: string; clearance: string }> = {
  "usd-to-eur": { label: "SEPA IBAN bank", currency: "EUR", clearance: "SEPA credit 1 business day" },
  "usd-to-gbp": { label: "FPS sort-code bank", currency: "GBP", clearance: "BACS 2–3 days · FPS same-day" },
  "usd-to-brl": { label: "PIX key bank", currency: "BRL", clearance: "PIX instant · TED 1 day" },
  "usd-to-ngn": { label: "NIBSS bank", currency: "NGN", clearance: "NIBSS instant" },
  "usd-to-bdt": { label: "BEFTN bank", currency: "BDT", clearance: "BEFTN 1 day" },
  "usd-to-egp": { label: "InstaPay bank", currency: "EGP", clearance: "InstaPay / ACH 1 day" },
  "usd-to-zar": { label: "Local EFT bank", currency: "ZAR", clearance: "EFT / ACH 1 day" },
};

const AUTHORED: Record<string, CorridorRegulation> = {
  "usd-to-pkr": {
    slug: "usd-to-pkr",
    authority: "SBP Foreign Exchange Manual Chapter 13 & Income Tax Ordinance Section 154A",
    clearingNetwork: "Raast / BEFTN",
    citations: [
      "SBP Foreign Exchange Manual Ch. 13 · Section 154A ITO (PC 9111)",
      "PRC Purpose Code 9111 · PSEB 0.25% final tax",
    ],
    banks: pkrBanks,
    tiers: pkrTiers,
    generic: false,
  },
  "usd-to-inr": {
    slug: "usd-to-inr",
    authority: "RBI AP (DIR Series) No. 46 & Section 194S of the Income Tax Act",
    clearingNetwork: "IMPS / NEFT / RTGS",
    citations: [
      "RBI Master Direction No. 16 · CGST Rule 96A (LUT zero-rated)",
      "Purpose Code P0802 · Software & Technology Services",
    ],
    banks: inrBanks,
    tiers: inrTiers,
    generic: false,
  },
  "usd-to-php": {
    slug: "usd-to-php",
    authority: "Bangko Sentral ng Pilipinas (BSP) Circular 980 & BIR 8% Freelance Gross Income Tax",
    clearingNetwork: "PESONet / InstaPay",
    citations: [
      "BSP Circular 980 · BIR 8% Gross Income Tax",
      "PESONet / InstaPay clearing · 8% flat on gross",
    ],
    banks: phpBanks,
    tiers: phpTiers,
    generic: false,
  },
  "usd-to-vnd": {
    slug: "usd-to-vnd",
    authority: "State Bank of Vietnam Circular 32/2013/TT-NHNN · Circular 111/2013 (2% IT flat rate)",
    clearingNetwork: "NAPAS / CVQ",
    citations: [
      "SBV Circular 32",
      "Circular 111/2013/TT-BTC",
    ],
    banks: vndBanks,
    tiers: vndTiers,
    generic: false,
  },
  "usd-to-kes": {
    slug: "usd-to-kes",
    authority: "Central Bank of Kenya Prudential Guidelines · KRA Withholding Sec 35 (5% non-resident rate)",
    clearingNetwork: "PesaLink / EFT",
    citations: [
      "CBK Guidelines",
      "KRA ITO Sec 35",
    ],
    banks: kesBanks,
    tiers: kesTiers,
    generic: false,
  },
  "usd-to-idr": {
    slug: "usd-to-idr",
    authority: "Bank Indonesia Regulation No. 16/21/PBI · PPh 21 IT Presumptive Export",
    clearingNetwork: "BI-RTGS / BI-FAST",
    citations: [
      "PBI 16/21/2014",
      "PPh Pasal 21",
    ],
    banks: idrBanks,
    tiers: idrTiers,
    generic: false,
  },
  "usd-to-cop": {
    slug: "usd-to-cop",
    authority: "Banco de la República Circular DCIN-83 (Formulario 5) · DIAN Retención",
    clearingNetwork: "SEBRA / ACH",
    citations: [
      "DCIN-83 Form 5",
      "DIAN Art. 392",
    ],
    banks: copBanks,
    tiers: copTiers,
    generic: false,
  },
  "usd-to-try": {
    slug: "usd-to-try",
    authority: "CBRT Circular on Invisible Transactions · Income Tax Law Art. 89/13 (80% software earnings exemption)",
    clearingNetwork: "FAST / EFT",
    citations: [
      "CBRT Invisible Trans",
      "GVK Art. 89/13",
    ],
    banks: tryBanks,
    tiers: tryTiers,
    generic: false,
  },
};

/** Phase 9 — resolves the statutory regulation profile for any audited corridor slug. */
export function getRegulatoryBanking(slug: string): CorridorRegulation {
  const authored = AUTHORED[slug];
  if (authored) {
    return authored;
  }
  const network = FALLBACK_NETWORKS[slug] ?? "Local ACH";
  const fallback = GENERIC_BY_SLUG[slug] ?? {
    label: "Local bank wire",
    currency: slug.split("-").pop()?.toUpperCase() ?? "LOCAL",
    clearance: "1–2 business days",
  };
  return {
    slug,
    authority: "International remittance governed by the destination country's exchange-control & income-tax regime",
    clearingNetwork: network,
    citations: [
      `National Inward Clearing Settlement · ${network}`,
      "Benchmark intermediary SWIFT deduction $15–$25",
    ],
    banks: genericBank(fallback.label, fallback.currency, fallback.clearance),
    tiers: fallbackTiers(network),
    generic: true,
  };
}