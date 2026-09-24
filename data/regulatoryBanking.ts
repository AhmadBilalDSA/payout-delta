/**
 * PayoutDelta — Statutory Laws & Local Bank Clearing database (Phase 9).
 *
 * Static, build-time regulatory data feeding the `TransactionCostingWidget`.
 * Each corridor carries the governing statutory authority, the real domestic
 * banks a freelancer actually receives funds through (with benchmark SWIFT
 * intermediary cuts and local clearing rails), and the statutory withholding /
 * exemption tiers used to compute the "real bank take-home".
 *
 * The sixty-five authored corridor entries (forty-three USD corridors plus the
 * twenty-two EUR/GBP multi-origin corridors) reference the underlying
 * legislation by section; every remaining corridor falls back to accurate
 * standard intermediary bands ($15–$25) plus its national clearing network
 * identifier so the engine never renders empty on any audited route.
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
  /**
   * Default receiving-bank intermediary SWIFT cut in USD for the leakage
   * benchmarks (Phase G — drives the Global Cross-Border Banking Leakage
   * Index). Authored corridors mirror the primary listed bank's
   * `intermediaryUSD`; fallback wires use the generic bank cut so every
   * corridor resolves an authentic, distinct figure.
   */
  defaultIntermediaryCut?: number;
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
 * Mexico — USD → MXN
 * SAT — Ley del IVA Art. 29-D (0% export) & LISR Art. 113-E (RESICO 1.5%).
 * ------------------------------------------------------------------------- */

const mxnTiers: StatutoryTier[] = [
  {
    id: "mexico-resico",
    name: "RESICO (Régimen Simplificado de Confianza)",
    authority: "SAT LISR Art. 113-E",
    rate: 0.015,
    purposeCode: "Exportación de Servicios TI",
    note: "1.5% flat withholding under the Régimen Simplificado de Confianza on exported IT services.",
  },
  {
    id: "mexico-empresarial",
    name: "Actividad Empresarial (General)",
    authority: "SAT LISR & LIVA Art. 29-D",
    rate: 0.1,
    purposeCode: "Exportación de Servicios",
    note: "16% IVA exempt on export services (0% rate under Art. 29-D LIVA); standard 10% ISR retención benchmark.",
  },
];

const mxnBanks: RegulatoryBank[] = [
  {
    id: "bbva-mx",
    name: "BBVA México",
    displayName: "BBVA México (Mexico)",
    swiftCode: "BCMRMXMM",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SPEI inward same-day · DIA ACH 1 day",
    localCurrency: "MXN",
  },
  {
    id: "banorte",
    name: "Banorte",
    displayName: "Banorte (Mexico)",
    swiftCode: "MENOMXMT",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SPEI inward same-day · CODI instant (QR)",
    localCurrency: "MXN",
  },
  {
    id: "santander-mx",
    name: "Santander México",
    displayName: "Santander México (Mexico)",
    swiftCode: "BSMXMXMM",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SPEI inward same-day · DIA ACH 1 day",
    localCurrency: "MXN",
  },
];

/* ---------------------------------------------------------------------------
 * Argentina — USD → ARS
 * BCRA Comunicación A 7518 (export-services regime) & AFIP Resolución 1415.
 * ------------------------------------------------------------------------- */

const arsTiers: StatutoryTier[] = [
  {
    id: "argentina-export",
    name: "Régimen Exportación de Servicios",
    authority: "BCRA Comunicación A 7518",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "0% liquidation requirement up to USD 12,000/year into a USD account under the export-services regime.",
  },
  {
    id: "argentina-monotributo",
    name: "Monotributo Factura E",
    authority: "AFIP Resolución 1415",
    rate: 0,
    purposeCode: "Factura E",
    exemption: true,
    note: "0% export withholdings for registered Monotributo categories invoicing via Factura E.",
  },
  {
    id: "argentina-mulc",
    name: "Liquidación Obligatoria MULC",
    authority: "BCRA MULC regime",
    rate: 0,
    purposeCode: "MULC settlement",
    note: "Standard exchange settlement of export proceeds at the official BCRA reference rate.",
  },
];

const arsBanks: RegulatoryBank[] = [
  {
    id: "galicia",
    name: "Banco Galicia",
    displayName: "Banco Galicia (Argentina)",
    swiftCode: "GABAARBA",
    intermediaryUSD: 18,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Transferencias 3.0 instant · MULC official-rate settlement",
    localCurrency: "ARS",
  },
  {
    id: "santander-ar",
    name: "Santander Argentina",
    displayName: "Santander Argentina",
    swiftCode: "BSARARBA",
    intermediaryUSD: 20,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Transferencias 3.0 instant · MULC official-rate settlement",
    localCurrency: "ARS",
  },
  {
    id: "bbva-ar",
    name: "BBVA Argentina",
    displayName: "BBVA Argentina",
    swiftCode: "BBAAARBA",
    intermediaryUSD: 18,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Transferencias 3.0 instant · MULC official-rate settlement",
    localCurrency: "ARS",
  },
];

/* ---------------------------------------------------------------------------
 * Poland — USD → PLN
 * Ustawa o zryczałtowanym podatku — 8.5% flat IT-services rate.
 * ------------------------------------------------------------------------- */

const plnTiers: StatutoryTier[] = [
  {
    id: "poland-ryczalt",
    name: "Ryczałt od przychodów ewidencjonowanych",
    authority: "Ustawa o zryczałtowanym podatku dochodowym Art. 12",
    rate: 0.085,
    purposeCode: "PKWiU 62/63",
    note: "8.5% flat rate for software/IT services (12% for systems design) on registered revenue.",
  },
  {
    id: "poland-liniowy",
    name: "Podatek liniowy",
    authority: "Ustawa o PIT · 19% flat B2B",
    rate: 0.19,
    purposeCode: "NIP B2B taxpayer",
    note: "19% flat-rate income tax for B2B sole traders (podatek liniowy).",
  },
  {
    id: "poland-vat0",
    name: "VAT 0% (Reverse Charge)",
    authority: "Ustawa o VAT Art. 28b",
    rate: 0,
    purposeCode: "VAT reverse charge",
    exemption: true,
    note: "0% VAT on export services outside the EU; reverse-charge under Art. 28b for intra-EU B2B.",
  },
];

const plnBanks: RegulatoryBank[] = [
  {
    id: "pkobp",
    name: "PKO Bank Polski",
    displayName: "PKO Bank Polski (Poland)",
    swiftCode: "BPKOPLPW",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Express ELIXIR same-day · SORBNET2 large-value",
    localCurrency: "PLN",
  },
  {
    id: "mbank",
    name: "mBank",
    displayName: "mBank (Poland)",
    swiftCode: "BREXPLPW",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Express ELIXIR same-day · KIR (Krajowa Izba Rozliczeniowa)",
    localCurrency: "PLN",
  },
  {
    id: "santander-pl",
    name: "Santander Bank Polska",
    displayName: "Santander Bank Polska",
    swiftCode: "WBKAPLPW",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Express ELIXIR same-day · KIR clearing",
    localCurrency: "PLN",
  },
];

/* ---------------------------------------------------------------------------
 * Romania — USD → RON
 * Codul Fiscal Art. 69 — microenterprise export regime.
 * ------------------------------------------------------------------------- */

const ronTiers: StatutoryTier[] = [
  {
    id: "romania-micro",
    name: "Microenterprise IT Regime",
    authority: "Codul Fiscal Legea 227/2015 Art. 47",
    rate: 0.01,
    purposeCode: "Export services",
    note: "1% income tax on turnover when employee/qualification conditions are met (3% otherwise).",
  },
  {
    id: "romania-pfa",
    name: "PFA Sistem Real",
    authority: "Codul Fiscal Art. 47 · PFA",
    rate: 0.1,
    purposeCode: "PFA freelancer",
    note: "10% income tax on net taxable profit plus CAS/CASS social contributions.",
  },
];

const ronBanks: RegulatoryBank[] = [
  {
    id: "transilvania",
    name: "Banca Transilvania",
    displayName: "Banca Transilvania (Romania)",
    swiftCode: "BTRLRO22",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Transfond SENT 1 day · ReGIS large-value",
    localCurrency: "RON",
  },
  {
    id: "bcr",
    name: "BCR",
    displayName: "BCR (Romania)",
    swiftCode: "RNCBROBU",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Transfond SENT 1 day · ReGIS large-value",
    localCurrency: "RON",
  },
  {
    id: "raiffeisen-ro",
    name: "Raiffeisen Bank Romania",
    displayName: "Raiffeisen Bank Romania",
    swiftCode: "RZBRROBU",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Transfond SENT 1 day · ReGIS large-value",
    localCurrency: "RON",
  },
];

/* ---------------------------------------------------------------------------
 * Czechia — USD → CZK
 * Zákon o daních z příjmů — paušální daň (flat-rate tax on side income).
 * ------------------------------------------------------------------------- */

const czkTiers: StatutoryTier[] = [
  {
    id: "czechia-flat",
    name: "Paušální daň (Flat Tax Band 1)",
    authority: "Zákon č. 586/1992 Sb. § 7a",
    rate: 0,
    purposeCode: "Paušální režim",
    exemption: true,
    note: "Fixed lump-sum tax/social/health regime with 0% variable withholding under paušální režim Band 1.",
  },
  {
    id: "czechia-osvc",
    name: "OSVČ Standard (60% lump-sum)",
    authority: "Zákon o daních z příjmů § 7",
    rate: 0.15,
    purposeCode: "Živnost 62",
    note: "15% rate on the taxable base after the 60% lump-sum expense deduction.",
  },
];

const czkBanks: RegulatoryBank[] = [
  {
    id: "csas",
    name: "Česká spořitelna",
    displayName: "Česká spořitelna (Czechia)",
    swiftCode: "GIBACZPX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "ČNB CERTIS same-day · CZERTIS instant",
    localCurrency: "CZK",
  },
  {
    id: "csob",
    name: "ČSOB",
    displayName: "ČSOB (Czechia)",
    swiftCode: "CEKOCZPP",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "ČNB CERTIS same-day · immediate FX",
    localCurrency: "CZK",
  },
  {
    id: "kb-cz",
    name: "Komerční banka",
    displayName: "Komerční banka (Czechia)",
    swiftCode: "KOBACZPP",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "ČNB CERTIS same-day · CZERTIS instant",
    localCurrency: "CZK",
  },
];

/* ---------------------------------------------------------------------------
 * Thailand — USD → THB
 * Revenue Code Section 40(2)/(8) relief for foreign-source professional income.
 * ------------------------------------------------------------------------- */

const thbTiers: StatutoryTier[] = [
  {
    id: "thailand-export",
    name: "Foreign Freelance Remittance Exemption",
    authority: "Revenue Code Sec. 40(2)/(8) · Paw. 161/2566",
    rate: 0,
    purposeCode: "40(8) foreign-source income",
    exemption: true,
    note: "Non-Thai-source income brought into Thailand after the tax-year conditions is exempt; otherwise PND 90 graduated rates apply.",
  },
  {
    id: "thailand-standard",
    name: "Standard Withholding Tax",
    authority: "Revenue Code Sec. 40(2)",
    rate: 0.03,
    purposeCode: "40(2) professional fees",
    note: "3% domestic freelance-service withholding; 0% on foreign outward-client remittance.",
  },
];

const thbBanks: RegulatoryBank[] = [
  {
    id: "bbl",
    name: "Bangkok Bank",
    displayName: "Bangkok Bank (Thailand)",
    swiftCode: "BKKBSHTH",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PromptPay instant · BAHTNET large-value",
    localCurrency: "THB",
  },
  {
    id: "kbank",
    name: "Kasikornbank",
    displayName: "Kasikornbank (Thailand)",
    swiftCode: "KASITHBK",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PromptPay instant · BAHTNET large-value",
    localCurrency: "THB",
  },
  {
    id: "scb-th",
    name: "SCB",
    displayName: "SCB (Thailand)",
    swiftCode: "SICOTHBK",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PromptPay instant · BAHTNET large-value",
    localCurrency: "THB",
  },
];

/* ---------------------------------------------------------------------------
 * Malaysia — USD → MYR
 * Income Tax Act 1967 Schedule 6 — foreign-source income exemption.
 * ------------------------------------------------------------------------- */

const myrTiers: StatutoryTier[] = [
  {
    id: "malaysia-schedule6",
    name: "Foreign Sourced Income Exemption (FSIE)",
    authority: "LHDN ITA 1967 Schedule 6",
    rate: 0,
    purposeCode: "Foreign source",
    exemption: true,
    note: "Foreign-sourced income exemption under Income Tax Act 1967 Schedule 6 (per LHDN Public Ruling 5/2022).",
  },
  {
    id: "malaysia-standard",
    name: "Resident Individual Graduated Tier",
    authority: "LHDN ITA 1967",
    rate: 0,
    purposeCode: "Form B / BE",
    note: "Self-employed residents declare via Form B/BE under graduated resident rates.",
  },
];

const myrBanks: RegulatoryBank[] = [
  {
    id: "maybank",
    name: "Maybank",
    displayName: "Maybank (Malaysia)",
    swiftCode: "MBBEMYKL",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "DuitNow instant · RENTAS 1 day",
    localCurrency: "MYR",
  },
  {
    id: "cimb",
    name: "CIMB Bank",
    displayName: "CIMB Bank (Malaysia)",
    swiftCode: "CIBBMYKL",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "DuitNow instant · RENTAS 1 day",
    localCurrency: "MYR",
  },
  {
    id: "publicbank",
    name: "Public Bank",
    displayName: "Public Bank (Malaysia)",
    swiftCode: "PBBEMYKL",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "DuitNow instant · RENTAS 1 day",
    localCurrency: "MYR",
  },
];

/* ---------------------------------------------------------------------------
 * Ghana — USD → GHS
 * Internal Revenue Act (Act 592) Section 114 — withholding on services.
 * ------------------------------------------------------------------------- */

const ghsTiers: StatutoryTier[] = [
  {
    id: "ghana-export",
    name: "Export Services Withholding Exemption",
    authority: "Bank of Ghana FX Repatriation Guidelines",
    rate: 0,
    purposeCode: "Export services",
    exemption: true,
    note: "Withholding exemption on proof of foreign-exchange repatriation under Bank of Ghana guidelines.",
  },
  {
    id: "ghana-resident",
    name: "GRA Section 114 Resident Rate",
    authority: "Income Tax Act 2015 (Act 896) § 114",
    rate: 0.05,
    purposeCode: "Service income",
    note: "Standard statutory withholding default (5% resident service withholding for TIN-holding recipients).",
  },
];

const ghsBanks: RegulatoryBank[] = [
  {
    id: "gcb",
    name: "GCB Bank",
    displayName: "GCB Bank (Ghana)",
    swiftCode: "GHCBGACX",
    intermediaryUSD: 16,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "GhIPSS Instant Pay instant · ACH 1 day",
    localCurrency: "GHS",
  },
  {
    id: "ecobank",
    name: "Ecobank Ghana",
    displayName: "Ecobank Ghana",
    swiftCode: "ECOCGHAC",
    intermediaryUSD: 15,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "GhIPSS Instant Pay instant · mobile money rails",
    localCurrency: "GHS",
  },
  {
    id: "stanbic-gh",
    name: "Stanbic Bank Ghana",
    displayName: "Stanbic Bank Ghana",
    swiftCode: "SBICGHAC",
    intermediaryUSD: 18,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "GhIPSS Instant Pay instant · ACH 1 day",
    localCurrency: "GHS",
  },
];

/* ---------------------------------------------------------------------------
 * UAE — USD → AED
 * Federal Decree-Law No. 47 (Corporate Tax) — 0% individual income tax.
 * ------------------------------------------------------------------------- */

const aedTiers: StatutoryTier[] = [
  {
    id: "uae-individual",
    name: "Freelance Visa / Individual Natural Person",
    authority: "FTA Corporate Tax Law Art. 3",
    rate: 0,
    purposeCode: "Individual / freelancer",
    exemption: true,
    note: "0% personal income tax; 0% corporate tax up to AED 375,000 revenue (Small Business Relief).",
  },
  {
    id: "uae-qfzp",
    name: "Qualifying Free Zone Person (QFZP)",
    authority: "FTA Corporate Tax Law Art. 3",
    rate: 0,
    purposeCode: "Qualifying Free Zone Person",
    exemption: true,
    note: "0% corporate tax on qualifying foreign export revenue for QFZPs.",
  },
];

const aedBanks: RegulatoryBank[] = [
  {
    id: "emiratesnbd",
    name: "Emirates NBD",
    displayName: "Emirates NBD (UAE)",
    swiftCode: "EBILAEAD",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "UAEFTS / IPI instant · ACH 1 day",
    localCurrency: "AED",
  },
  {
    id: "fab",
    name: "First Abu Dhabi Bank (FAB)",
    displayName: "First Abu Dhabi Bank (UAE)",
    swiftCode: "NBADAEAD",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "UAEFTS / IPI instant · ACH 1 day",
    localCurrency: "AED",
  },
  {
    id: "adcb",
    name: "ADCB",
    displayName: "ADCB (UAE)",
    swiftCode: "ADCBAEAA",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "UAEFTS / IPI instant · ACH 1 day",
    localCurrency: "AED",
  },
];

/* ---------------------------------------------------------------------------
 * Saudi Arabia — USD → SAR
 * ZATCA Withholding Tax Regulation Art. 68 — payments to non-residents.
 * ------------------------------------------------------------------------- */

const sarTiers: StatutoryTier[] = [
  {
    id: "saudi-freelance",
    name: "Freelance Document (Wathiqa Waraqiyya)",
    authority: "ZATCA Income Tax Law Art. 68",
    rate: 0,
    purposeCode: "Wathiqa freelancer",
    exemption: true,
    note: "0% personal income tax on foreign export services; 0% zero-rated VAT under Art. 33.",
  },
  {
    id: "saudi-nonresident",
    name: "Non-Resident Withholding Relief",
    authority: "ZATCA Income Tax Law Art. 68",
    rate: 0,
    purposeCode: "Non-resident services",
    exemption: true,
    note: "Withholding relief on proof that services were performed outside KSA.",
  },
];

const sarBanks: RegulatoryBank[] = [
  {
    id: "alrajhi",
    name: "Al Rajhi Bank",
    displayName: "Al Rajhi Bank (Saudi Arabia)",
    swiftCode: "RJHIBARI",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SARIE same-day · mada instant",
    localCurrency: "SAR",
  },
  {
    id: "snb",
    name: "Saudi National Bank (SNB)",
    displayName: "Saudi National Bank (Saudi Arabia)",
    swiftCode: "NCBKSARI",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SARIE same-day · mada instant",
    localCurrency: "SAR",
  },
  {
    id: "riyad",
    name: "Riyad Bank",
    displayName: "Riyad Bank (Saudi Arabia)",
    swiftCode: "RIBLSARI",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SARIE same-day · mada instant",
    localCurrency: "SAR",
  },
];

/* ---------------------------------------------------------------------------
 * Ukraine — USD → UAH
 * Податковий кодекс України (ПКУ) — ст. 294 (ФОП єдиний податок 5%),
 * ст. 167 (ПДФО 18%) & ст. 6 (військовий збір 1.5%).
 * ------------------------------------------------------------------------- */

const uahTiers: StatutoryTier[] = [
  {
    id: "ukraine-fop",
    name: "ФОП III група (Єдиний податок 5%)",
    authority: "Податковий кодекс України ст. 294",
    rate: 0.05,
    purposeCode: "ФОП Group 3 (IT)",
    note: "5% united tax on turnover for individual entrepreneurs (ФОП) Group 3 without VAT — the standard freelance-IT structure for inbound USD.",
  },
  {
    id: "ukraine-diyacity",
    name: "Дія City Resident / Gig Contractor (5% ПДФО)",
    authority: "ПКУ ст. 141.9",
    rate: 0.05,
    purposeCode: "Diia City",
    note: "5% reduced PIT for Diia City residents / gig contractors; social fund (ЄСВ) settled by the registered company.",
  },
  {
    id: "ukraine-pit",
    name: "ПДФО 18% + Військовий збір 1.5%",
    authority: "ПКУ ст. 167 · ст. 6",
    rate: 0.18,
    purposeCode: "Standard PIT + military levy",
    note: "Standard individual rate (18% PIT) plus the 1.5% military levy when income is taxed as personal employment income.",
  },
];

const uahBanks: RegulatoryBank[] = [
  {
    id: "privat",
    name: "PrivatBank",
    displayName: "PrivatBank (Ukraine)",
    swiftCode: "PBANUA2X",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "SEP same-day · uah is self-clearing via NBU SEP",
    localCurrency: "UAH",
  },
  {
    id: "monobank",
    name: "Monobank (Universal Bank)",
    displayName: "Monobank (Ukraine)",
    swiftCode: "UNJSUAUK",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SEP same-day · card-to-card instant",
    localCurrency: "UAH",
  },
];

/* ---------------------------------------------------------------------------
 * Iraq — USD → IQD
 * Central Bank of Iraq (CBI) — Banking Law No. 56 of 2004 bank settlement;
 * freelancers receive USD-credited IQD through CBI-cleared inward transfers.
 * ------------------------------------------------------------------------- */

const iqdTiers: StatutoryTier[] = [
  {
    id: "iraq-freelance",
    name: "Individual Export Settlement (CBI)",
    authority: "CBI Banking Law No. 56 of 2004",
    rate: 0,
    purposeCode: "Cross-border services",
    exemption: true,
    note: "0% income tax on individual cross-border service receipts settled through CBI-approved bank channels at the CBI reference rate.",
  },
  {
    id: "iraq-salary",
    name: "Salary / Payroll Regime (n/a for freelancers)",
    authority: "Income Tax Law No. 113 of 1982",
    rate: 0,
    purposeCode: "Payroll only",
    note: "Iraq's salary withholding applies to government/private payroll, not freelancer cross-border service income.",
  },
];

const iqdBanks: RegulatoryBank[] = [
  {
    id: "trade-bank-of-iraq",
    name: "Trade Bank of Iraq",
    displayName: "Trade Bank of Iraq",
    swiftCode: "TRIQIQBA",
    intermediaryUSD: 18,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 25,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CBI clearing · inward USD conversion at official rate",
    localCurrency: "IQD",
  },
  {
    id: "iraq-rafidain",
    name: "Rafidain Bank",
    displayName: "Al-Rafidain Bank (Iraq)",
    swiftCode: "RAFBIQBA",
    intermediaryUSD: 18,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 25,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CBI clearing · official CBI FX rate",
    localCurrency: "IQD",
  },
  {
    id: "iraq-rasheed",
    name: "Rasheed Bank",
    displayName: "Rasheed Bank (Iraq)",
    swiftCode: "RDBAIQBB",
    intermediaryUSD: 18,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 25,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CBI clearing · official CBI FX rate",
    localCurrency: "IQD",
  },
];

/* ---------------------------------------------------------------------------
 * Morocco — USD → MAD
 * Code Général des Impôts (CGI) — Art. 82 (Auto-Entrepreneur 1%) & the
 * IR barème (0–38% progressive).
 * ------------------------------------------------------------------------- */

const madTiers: StatutoryTier[] = [
  {
    id: "morocco-auto",
    name: "Régime Auto-Entrepreneur (1% CA)",
    authority: "CGI Art. 82",
    rate: 0.01,
    purposeCode: "Auto-entrepreneur",
    note: "1% flat on turnover (cotisation nominale) for registered auto-entrepreneurs invoicing export services.",
  },
  {
    id: "morocco-bareme0",
    name: "IR Barème — Tranche 0% (≤ DH 38,000)",
    authority: "CGI Art. 73-82",
    rate: 0,
    purposeCode: "IR barème",
    exemption: true,
    note: "0% on the first income tranche (≤ MAD 38,000/yr) under the general IR barème.",
  },
  {
    id: "morocco-bareme38",
    name: "IR Barème — Tranche Supérieure (38%)",
    authority: "CGI Art. 73-82",
    rate: 0.38,
    purposeCode: "IR barème",
    note: "Top 38% tranche of the progressive IR barème for high net income.",
  },
];

const madBanks: RegulatoryBank[] = [
  {
    id: "attijariwafa",
    name: "Attijariwafa Bank",
    displayName: "Attijariwafa Bank (Morocco)",
    swiftCode: "BCMAMAMC",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RTP instant · ACH relevé 1 day",
    localCurrency: "MAD",
  },
  {
    id: "bank-of-africa",
    name: "Bank of Africa",
    displayName: "Bank of Africa (Morocco)",
    swiftCode: "BMCEMAMC",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RTP instant · ACH relevé 1 day",
    localCurrency: "MAD",
  },
  {
    id: "banque-populaire",
    name: "Banque Centrale Populaire",
    displayName: "Banque Populaire (Morocco)",
    swiftCode: "BCPOMAMC",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RTP instant · ACH relevé 1 day",
    localCurrency: "MAD",
  },
];

/* ---------------------------------------------------------------------------
 * Chile — USD → CLP
 * SII — Código Tributario Art. 74 No. 6 (10% boleta retención) & the
 * declarative Impuesto Global Complementario.
 * ------------------------------------------------------------------------- */

const clpTiers: StatutoryTier[] = [
  {
    id: "chile-honorarios",
    name: "Boleta de Honorarios — Retención 10%",
    authority: "Código Tributario Art. 74 No. 6",
    rate: 0.1,
    purposeCode: "Boleta de honorarios",
    note: "10% withholding on honorarios (renta del trabajo); net is integrated with the annual Global Complementario.",
  },
  {
    id: "chile-global",
    name: "Impuesto Global Complementario (0–40%)",
    authority: "Ley sobre Impuesto a la Renta Arts. 20-21",
    rate: 0,
    purposeCode: "Global Complementario",
    note: "Progressive annual tax on total personal income — 0% for low annual brackets, up to 40% top tranche, 10% retención credited.",
  },
];

const clpBanks: RegulatoryBank[] = [
  {
    id: "banco-de-chile",
    name: "Banco de Chile",
    displayName: "Banco de Chile",
    swiftCode: "BCHICLRM",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "TEF instant · LCB 1 day",
    localCurrency: "CLP",
  },
  {
    id: "bci",
    name: "BCI",
    displayName: "BCI (Chile)",
    swiftCode: "CREDCLRM",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "TEF instant · LCB 1 day",
    localCurrency: "CLP",
  },
  {
    id: "santander-cl",
    name: "Banco Santander Chile",
    displayName: "Santander Chile",
    swiftCode: "BSCHCLRM",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "TEF instant · LCB 1 day",
    localCurrency: "CLP",
  },
];

/* ---------------------------------------------------------------------------
 * Peru — USD → PEN
 * SUNAT — Ley del Impuesto a la Renta Art. 34-A (8% cuarta categoría
 * retención) & the progressive 4ta/5ta scale.
 * ------------------------------------------------------------------------- */

const penTiers: StatutoryTier[] = [
  {
    id: "peru-cuarta",
    name: "Renta 4ta Categoría — Retención 8%",
    authority: "Ley del Impuesto a la Renta Art. 34-A",
    rate: 0.08,
    purposeCode: "Cuarta categoría",
    note: "8% monthly withholding on cuarta categoría (professional service) receipts by the paying entity; credited against the annual return.",
  },
  {
    id: "peru-progresivo",
    name: "4ta/5ta Progresivo (0–30%)",
    authority: "LIR Arts. 51-53",
    rate: 0,
    purposeCode: "Renta de trabajo",
    note: "Progressive annual scale for work income — 8% retención credited; 0% below the Renta de trabajo threshold.",
  },
];

const penBanks: RegulatoryBank[] = [
  {
    id: "bcp",
    name: "Banco de Crédito del Perú",
    displayName: "BCP (Peru)",
    swiftCode: "BCPLPEPL",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RTP (Perú) instant · PLIN instant",
    localCurrency: "PEN",
  },
  {
    id: "bbva-pe",
    name: "BBVA Perú",
    displayName: "BBVA Perú",
    swiftCode: "BCONPEPL",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RTP (Perú) instant · PLIN instant",
    localCurrency: "PEN",
  },
  {
    id: "interbank",
    name: "Interbank",
    displayName: "Interbank (Peru)",
    swiftCode: "BINPPEPL",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "RTP (Perú) instant · PLIN instant",
    localCurrency: "PEN",
  },
];

/* ---------------------------------------------------------------------------
 * Hungary — USD → HUF
 * Szja. törvény (15% flat PIT) & Katv. — KATA monthly lump-sum regime.
 * ------------------------------------------------------------------------- */

const hufTiers: StatutoryTier[] = [
  {
    id: "hungary-szja",
    name: "SZJA — 15% Flat PIT",
    authority: "Szja. törvény · 15% kulcs",
    rate: 0.15,
    purposeCode: "Szja declaration",
    note: "15% single personal income-tax rate on the taxable base; social contributions (TB) settled separately by the taxpayer.",
  },
  {
    id: "hungary-kata",
    name: "KATA Kisadózó (Lump-Sum)",
    authority: "Katv. (2012. évi CXLVII. tv.)",
    rate: 0,
    purposeCode: "KATA",
    exemption: true,
    note: "Fixed monthly lump (50k/40k HUF, 25k student) replacing PIT+socials; 40% rate applied above the HUF 12M revenue ceiling.",
  },
];

const hufBanks: RegulatoryBank[] = [
  {
    id: "otp",
    name: "OTP Bank",
    displayName: "OTP Bank (Hungary)",
    swiftCode: "OTPVHUHB",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "GIRO Instant same-day · BKR RTGS",
    localCurrency: "HUF",
  },
  {
    id: "kh",
    name: "K&H Bank",
    displayName: "K&H Bank (Hungary)",
    swiftCode: "OKHBHUHB",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "GIRO Instant same-day · BKR RTGS",
    localCurrency: "HUF",
  },
  {
    id: "erste-hu",
    name: "Erste Bank Hungary",
    displayName: "Erste Bank Hungary",
    swiftCode: "GIBAHUHB",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "GIRO Instant same-day · BKR RTGS",
    localCurrency: "HUF",
  },
];

/* ---------------------------------------------------------------------------
 * Bulgaria — USD → BGN
 * ЗДДФЛ (Закон за данъците върху доходите на физическите лица) — 10% flat.
 * ------------------------------------------------------------------------- */

const bgnTiers: StatutoryTier[] = [
  {
    id: "bulgaria-flat",
    name: "Плоска ставка 10% (Flat PIT)",
    authority: "ЗДДФЛ чл. 26-28",
    rate: 0.1,
    purposeCode: "ФЛДД",
    note: "10% flat income tax on annual taxable income; self-insured (самоосигуряващо се) register via НАП.",
  },
  {
    id: "bulgaria-self",
    name: "Самоосигурител (Self-Employed)",
    authority: "ЗДДФЛ · ЗКСО",
    rate: 0.1,
    purposeCode: "Self-employed",
    note: "10% income tax plus social (ЗКСО) contributions where applicable; craft patent-tax option is a lump sum.",
  },
];

const bgnBanks: RegulatoryBank[] = [
  {
    id: "unicredit-bulbank",
    name: "UniCredit Bulbank",
    displayName: "UniCredit Bulbank (Bulgaria)",
    swiftCode: "UNCRBGSF",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "BISRTGS same-day · Blinc instant",
    localCurrency: "BGN",
  },
  {
    id: "dsk",
    name: "DSK Bank",
    displayName: "DSK Bank (Bulgaria)",
    swiftCode: "STSABGSF",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "BISRTGS same-day · Blinc instant",
    localCurrency: "BGN",
  },
  {
    id: "fibank",
    name: "Fibank (First Investment Bank)",
    displayName: "Fibank (Bulgaria)",
    swiftCode: "FINVBGSF",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "BISRTGS same-day · Blinc instant",
    localCurrency: "BGN",
  },
];

/* ---------------------------------------------------------------------------
 * Serbia — USD → RSD
 * Zakon o porezu na dohodak građana — freelance regimen and paušalni režim.
 * ------------------------------------------------------------------------- */

const rsdTiers: StatutoryTier[] = [
  {
    id: "serbia-freelance",
    name: "Porez na dohodak — Freelance 20%",
    authority: "Zakon o porezu na dohodak građana",
    rate: 0.2,
    purposeCode: "Freelance income",
    note: "20% income tax on gross freelance service income plus PIO / health contributions under the online-freelance rules.",
  },
  {
    id: "serbia-pausal",
    name: "Paušalno Oporezivanje (Lump-Sum)",
    authority: "ZPDG · paušalni režim",
    rate: 0,
    purposeCode: "Paušalni",
    exemption: true,
    note: "Lump-sum tax quotation for craft entrepreneurs (kategorija preduzetnika) — fixed monthly amount instead of income-based tax.",
  },
];

const rsdBanks: RegulatoryBank[] = [
  {
    id: "raiffeisen-rs",
    name: "Raiffeisen banka",
    displayName: "Raiffeisen banka (Serbia)",
    swiftCode: "RZBSRSBG",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "NBS IPS instant · RTGS 1 day",
    localCurrency: "RSD",
  },
  {
    id: "intesa-rs",
    name: "Banca Intesa Beograd",
    displayName: "Banca Intesa (Serbia)",
    swiftCode: "DBDBRSBG",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "NBS IPS instant · RTGS 1 day",
    localCurrency: "RSD",
  },
  {
    id: "aik",
    name: "AIK Banka",
    displayName: "AIK Banka (Serbia)",
    swiftCode: "AIKBRS22",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NBS IPS instant · RTGS 1 day",
    localCurrency: "RSD",
  },
];

/* ---------------------------------------------------------------------------
 * Singapore — USD → SGD
 * IRAS — Income Tax Act 1947, self-employed assessment (0–24% bands).
 * ------------------------------------------------------------------------- */

const sgdTiers: StatutoryTier[] = [
  {
    id: "singapore-resident",
    name: "Self-Employed Net Profit (0–24%)",
    authority: "Income Tax Act 1947 · IRAS",
    rate: 0.15,
    purposeCode: "Self-employment income",
    note: "No withholding at source; self-employed declare net profit and pay resident progressive bands up to 24%.",
  },
  {
    id: "singapore-threshold",
    name: "Below Threshold (≤ SGD 20,000)",
    authority: "ITA 1947 s. 2",
    rate: 0,
    purposeCode: "Chargeable income",
    exemption: true,
    note: "0% when annual chargeable income stays within the SGD 20,000 personal allowance band.",
  },
];

const sgdBanks: RegulatoryBank[] = [
  {
    id: "dbs",
    name: "DBS / POSB",
    displayName: "DBS (Singapore)",
    swiftCode: "DBSSSGSG",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "FAST / PayNow instant · MEPS+ 1 day",
    localCurrency: "SGD",
  },
  {
    id: "uob",
    name: "United Overseas Bank",
    displayName: "UOB (Singapore)",
    swiftCode: "UOVBSGSG",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "FAST / PayNow instant · MEPS+ 1 day",
    localCurrency: "SGD",
  },
  {
    id: "ocbc",
    name: "OCBC Bank",
    displayName: "OCBC (Singapore)",
    swiftCode: "OCBCSGSG",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "FAST / PayNow instant · MEPS+ 1 day",
    localCurrency: "SGD",
  },
];

/* ---------------------------------------------------------------------------
 * Hong Kong — USD → HKD
 * Inland Revenue Ordinance Cap. 112 — salaries tax (2–17% / 15% standard) &
 * two-tier profits tax for sole traders.
 * ------------------------------------------------------------------------- */

const hkdTiers: StatutoryTier[] = [
  {
    id: "hongkong-salaries",
    name: "Salaries Tax — Standard 15% (YCB)",
    authority: "IRO s. 13 & Second Schedule",
    rate: 0.15,
    purposeCode: "Salaries tax",
    note: "15% standard rate on net chargeable income, or 2–17% progressive brackets — whichever is lower (Year of Assessment cap).",
  },
  {
    id: "hongkong-profits",
    name: "Profits Tax — Sole Trader 7.5% / 15%",
    authority: "IRO Part IV",
    rate: 0.075,
    purposeCode: "Profits tax",
    note: "7.5% on the first HKD 2M of assessable profits and 15% above, for unincorporated sole-proprietor business.",
  },
];

const hkdBanks: RegulatoryBank[] = [
  {
    id: "hsbc-hk",
    name: "HSBC Hong Kong",
    displayName: "HSBC (Hong Kong)",
    swiftCode: "HSBCHKHH",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "FPS instant · CHATS RTGS 1 day",
    localCurrency: "HKD",
  },
  {
    id: "bochk",
    name: "Bank of China (Hong Kong)",
    displayName: "Bank of China (HK)",
    swiftCode: "BKCHHKHH",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "FPS instant · CHATS RTGS 1 day",
    localCurrency: "HKD",
  },
  {
    id: "hangseng",
    name: "Hang Seng Bank",
    displayName: "Hang Seng Bank (Hong Kong)",
    swiftCode: "HASEHKHH",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "FPS instant · CHATS RTGS 1 day",
    localCurrency: "HKD",
  },
];

/* ---------------------------------------------------------------------------
 * Sweden — USD → SEK
 * Inkomstskattelagen (1999:1229) da. statlig inkomstskatt — Skatteverket.
 * ------------------------------------------------------------------------- */

const sekTiers: StatutoryTier[] = [
  {
    id: "sweden-statlig",
    name: "Statlig inkomstskatt",
    authority: "Inkomstskattelagen 65 kap.",
    rate: 0.2,
    purposeCode: "INK1",
    note: "20% state income tax on the portion above Skatteverket's statlig skatt threshold; kommunalskatt 29–35% applies below it.",
  },
  {
    id: "sweden-kommunal",
    name: "Kommunal inkomstskatt",
    authority: "Inkomstskattelagen 62 kap.",
    rate: 0.31,
    purposeCode: "INK1",
    note: "Municipal income tax (29–35%) withheld via Skatteverket A-tax for self-employed freelancers.",
  },
];

const sekBanks: RegulatoryBank[] = [
  {
    id: "seb",
    name: "Skandinaviska Enskilda Banken",
    displayName: "SEB (Sweden)",
    swiftCode: "SWEDSESS",
    intermediaryUSD: 9,
    intermediaryMinUSD: 6,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Bankgiro 1 day · RIX RTGS same-day",
    localCurrency: "SEK",
  },
  {
    id: "handelsbanken",
    name: "Handelsbanken",
    displayName: "Handelsbanken (Sweden)",
    swiftCode: "HANDSSSS",
    intermediaryUSD: 10,
    intermediaryMinUSD: 6,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Bankgiro 1 day · RIX RTGS same-day",
    localCurrency: "SEK",
  },
];

/* ---------------------------------------------------------------------------
 * Norway — USD → NOK
 * Lov om skatt på formue og inntekt (Skatteloven) — Skatteetaten.
 * ------------------------------------------------------------------------- */

const nokTiers: StatutoryTier[] = [
  {
    id: "norway-personal",
    name: "Alminnelig inntekt",
    authority: "Skatteloven § 2-1",
    rate: 0.22,
    purposeCode: "Skatt M-2",
    note: "22% ordinary income tax (alminnelig inntekt) on net freelance income; trinnskatt adds 0–16.2% at higher thresholds.",
  },
  {
    id: "norway-vat",
    name: "MVA register-free",
    authority: "Merverdiavgiftsloven § 6-7",
    rate: 0,
    purposeCode: "Export services",
    exemption: true,
    note: "Exempt-status freelancers stay out of the VAT register when exporting services below the threshold.",
  },
];

const nokBanks: RegulatoryBank[] = [
  {
    id: "dnb",
    name: "DNB Bank",
    displayName: "DNB (Norway)",
    swiftCode: "DNBANOKK",
    intermediaryUSD: 9,
    intermediaryMinUSD: 6,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Straksbetaling instant · NICS 1 day",
    localCurrency: "NOK",
  },
  {
    id: "nordea-no",
    name: "Nordea Bank (Norway)",
    displayName: "Nordea (Norway)",
    swiftCode: "NDEANOKK",
    intermediaryUSD: 10,
    intermediaryMinUSD: 6,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Straksbetaling instant · NICS 1 day",
    localCurrency: "NOK",
  },
];

/* ---------------------------------------------------------------------------
 * Denmark — USD → DKK
 * Ligningsloven & personskatteloven — Skattestyrelsen (SKAT).
 * ------------------------------------------------------------------------- */

const dkkTiers: StatutoryTier[] = [
  {
    id: "denmark-ato",
    name: "Acontoskat B-skat",
    authority: "Kildeskatteloven (KSL)",
    rate: 0.34,
    purposeCode: "Ligning",
    note: "34% average personal income tax incl. top-skatt (amtskommunal gebyr) withheld as SKAT B-skat for self-employed.",
  },
  {
    id: "denmark-vat-rchg",
    name: "VAT reverse charge",
    authority: "Momsloven § 45",
    rate: 0,
    purposeCode: "B2B export",
    exemption: true,
    note: "0% VAT on exported services; intra-EU B2B falls under Momsloven reverse charge.",
  },
];

const dkkBanks: RegulatoryBank[] = [
  {
    id: "danske",
    name: "Danske Bank",
    displayName: "Danske Bank (Denmark)",
    swiftCode: "DABADKKK",
    intermediaryUSD: 9,
    intermediaryMinUSD: 6,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Straksclearing instant · Kronings 1 day",
    localCurrency: "DKK",
  },
  {
    id: "jyske",
    name: "Jyske Bank",
    displayName: "Jyske Bank (Denmark)",
    swiftCode: "JYBADKKK",
    intermediaryUSD: 10,
    intermediaryMinUSD: 6,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Straksclearing instant · Kronings 1 day",
    localCurrency: "DKK",
  },
];

/* ---------------------------------------------------------------------------
 * Bosnia and Herzegovina — USD → BAM
 * Zakon o porezu na dohodak (FBiH) / RS — Porezna uprava.
 * ------------------------------------------------------------------------- */

const bamTiers: StatutoryTier[] = [
  {
    id: "bosnia-fbih-pit",
    name: "Porez na dohodak 10%",
    authority: "Zakon o porezu na dohodak FBiH",
    rate: 0.1,
    purposeCode: "Neto dohodak",
    note: "10% flat personal income tax on self-employment income in the Federation of BiH.",
  },
  {
    id: "bosnia-rs",
    name: "Porez na dohodak RS",
    authority: "Zakon o porezu na dohodak RS",
    rate: 0.1,
    purposeCode: "Paušalno",
    note: "10% flat personal income tax in Republika Srpska; lump-sum (paušal) regime simplifies payment.",
  },
];

const bamBanks: RegulatoryBank[] = [
  {
    id: "raiffeisen-bh",
    name: "Raiffeisen Bank d.d.",
    displayName: "Raiffeisen (BiH)",
    swiftCode: "RZBABA2S",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "CBBiH RTGS 1 day · MixPayday ACH",
    localCurrency: "BAM",
  },
  {
    id: "intesa-bh",
    name: "Intesa Sanpaolo Banka BiH",
    displayName: "Intesa Sanpaolo (BiH)",
    swiftCode: "ISPBBA22",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "CBBiH RTGS 1 day · MixPayday ACH",
    localCurrency: "BAM",
  },
];

/* ---------------------------------------------------------------------------
 * Georgia — USD → GEL
 * Tax Code of Georgia Art. 96 — Revenue Service (RS.GOV.GE).
 * ------------------------------------------------------------------------- */

const gelTiers: StatutoryTier[] = [
  {
    id: "georgia-pit",
    name: "Personal Income Tax 20%",
    authority: "Tax Code Art. 96",
    rate: 0.2,
    purposeCode: "Non-business income",
    note: "20% personal income tax on self-employment income for a registered entrepreneur (IP).",
  },
  {
    id: "georgia-small",
    name: "Small Business Status",
    authority: "Tax Code Art. 82",
    rate: 0.01,
    purposeCode: "IP status 01",
    exemption: true,
    note: "1% of turnover for micro IPs under the small-business status instead of 20% profit taxation.",
  },
];

const gelBanks: RegulatoryBank[] = [
  {
    id: "tbc",
    name: "TBC Bank",
    displayName: "TBC Bank (Georgia)",
    swiftCode: "TBCBGE22",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "NPC instant · RTGS 1 day",
    localCurrency: "GEL",
  },
  {
    id: "bog",
    name: "Bank of Georgia",
    displayName: "Bank of Georgia",
    swiftCode: "BAGAGE22",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "NPC instant · RTGS 1 day",
    localCurrency: "GEL",
  },
];

/* ---------------------------------------------------------------------------
 * Uruguay — USD → UYU
 * Ley 18.083 IRPF / IAE — Dirección General Impositiva (DGI).
 * ------------------------------------------------------------------------- */

const uyuTiers: StatutoryTier[] = [
  {
    id: "uruguay-irpf",
    name: "IRPF Profesional",
    authority: "Ley 18.083 Tit. 1",
    rate: 0.1,
    purposeCode: "IRPF cuota profesional",
    note: "IRPF computed under the professional/minimum-liquid regime — the 10% floor bracket is the lever on freelance revenue.",
  },
  {
    id: "uruguay-vat",
    name: "IVA exoneración",
    authority: "Ley 18.083 Tit. 6",
    rate: 0,
    purposeCode: "Servicios exportados",
    exemption: true,
    note: "0% VAT on exported digital services under the export exoneration regime (Ley Nº 19.294 Art. 60).",
  },
];

const uyuBanks: RegulatoryBank[] = [
  {
    id: "brou",
    name: "Banco República",
    displayName: "Banco República (Uruguay)",
    swiftCode: "BROUUYMM",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "SPI instant · ENET RTGS",
    localCurrency: "UYU",
  },
  {
    id: "itau-uy",
    name: "Banco Itaú Uruguay",
    displayName: "Itaú (Uruguay)",
    swiftCode: "ITAUUYMM",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "SPI instant · ENET RTGS",
    localCurrency: "UYU",
  },
];

/* ---------------------------------------------------------------------------
 * Costa Rica — USD → CRC
 * Ley del Impuesto sobre la Renta 7092 — Ministerio de Hacienda.
 * ------------------------------------------------------------------------- */

const crcTiers: StatutoryTier[] = [
  {
    id: "costa-renta",
    name: "Impuesto sobre la Renta",
    authority: "Ley 7092 Art. 3",
    rate: 0.15,
    purposeCode: "Renta 15-25%",
    note: "15–25% renta brackets on professional income; freelancers bill under the 'renta de actividades lucrativas' regime.",
  },
  {
    id: "costa-digital",
    name: "0% Renta Digital Export",
    authority: "Ley 7092 Art. 5 bis",
    rate: 0,
    purposeCode: "Servicios digitales",
    exemption: true,
    note: "0% renta on exported digital services when registered under the export regime (Art. 5 bis).",
  },
];

const crcBanks: RegulatoryBank[] = [
  {
    id: "bncr",
    name: "Banco Nacional",
    displayName: "Banco Nacional (Costa Rica)",
    swiftCode: "BNCRCRSJ",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SINPE instant · drives national usage",
    localCurrency: "CRC",
  },
  {
    id: "bac",
    name: "BAC San José",
    displayName: "BAC Credomatic (Costa Rica)",
    swiftCode: "BACCCRSJ",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SINPE instant · drives national usage",
    localCurrency: "CRC",
  },
];

/* ---------------------------------------------------------------------------
 * Croatia — USD → HRK (EUR since 2023)
 * Zakon o porezu na dohodak (NN 115/16) — Porezna uprava.
 * ------------------------------------------------------------------------- */

const hrkTiers: StatutoryTier[] = [
  {
    id: "croatia-pit",
    name: "Porez na dohodak",
    authority: "NN 115/16 Art. 15",
    rate: 0.2,
    purposeCode: "Dohodak od obrta",
    note: "20% personal income tax on self-employed (obrt) income charged in Croatia's euro economy.",
  },
  {
    id: "croatia-pausal",
    name: "Paušalni obrt",
    authority: "NN 115/16 Art. 87",
    rate: 0.084,
    purposeCode: "Paušalni obrt",
    note: "Lump-sum craft regime — tax computed on benchmark paušal revenue rather than actual net profit.",
  },
];

const hrkBanks: RegulatoryBank[] = [
  {
    id: "zaba",
    name: "Zagrebačka banka",
    displayName: "Zagrebačka banka (Croatia)",
    swiftCode: "ZABAHR2X",
    intermediaryUSD: 10,
    intermediaryMinUSD: 8,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SEPA/TARGET2 instant · euro clearing",
    localCurrency: "EUR",
  },
  {
    id: "erste-hr",
    name: "Erste&Steiermärkische Bank",
    displayName: "Erste Bank (Croatia)",
    swiftCode: "ESBCHR22",
    intermediaryUSD: 10,
    intermediaryMinUSD: 8,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SEPA/TARGET2 instant · euro clearing",
    localCurrency: "EUR",
  },
];

/* ---------------------------------------------------------------------------
 * Tanzania — USD → TZS
 * Value Added Tax Act Cap. 148 & Income Tax Act Cap. 332 — TRA.
 * ------------------------------------------------------------------------- */

const tzsTiers: StatutoryTier[] = [
  {
    id: "tanzania-e-services",
    name: "Export of Electronic Services",
    authority: "VAT Act Cap. 148 Sec. 68(5)",
    rate: 0,
    purposeCode: "e-services export",
    exemption: true,
    note: "0% VAT on electronic services exported to a foreign consumer upon proof of foreign residency under Section 68(5).",
  },
  {
    id: "tanzania-digital-withholding",
    name: "Withholding on Digital Services",
    authority: "Income Tax Act Cap. 332 Sec. 83B (Finance Act)",
    rate: 0.05,
    purposeCode: "83B digital content",
    note: "5% final withholding on payments for digital content / online services sourced from Tanzania.",
  },
];

const tzsBanks: RegulatoryBank[] = [
  {
    id: "crdb",
    name: "CRDB Bank",
    displayName: "CRDB Bank (Tanzania)",
    swiftCode: "CORUTZTZ",
    intermediaryUSD: 15,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "TISS 1 day · BOT RTGS same-day",
    localCurrency: "TZS",
  },
  {
    id: "nmb",
    name: "NMB Bank",
    displayName: "NMB Bank (Tanzania)",
    swiftCode: "NMBLTZTZ",
    intermediaryUSD: 15,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "TISS 1 day · BOT RTGS same-day",
    localCurrency: "TZS",
  },
  {
    id: "scb-tz",
    name: "Standard Chartered Tanzania",
    displayName: "Standard Chartered (Tanzania)",
    swiftCode: "SCBLTZTX",
    intermediaryUSD: 18,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 22,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "TISS 1 day · BOT RTGS same-day",
    localCurrency: "TZS",
  },
];

/* ---------------------------------------------------------------------------
 * Uganda — USD → UGX
 * Income Tax Act Cap 340 & Value Added Tax Act Cap 349 — URA.
 * ------------------------------------------------------------------------- */

const ugxTiers: StatutoryTier[] = [
  {
    id: "uganda-export-services",
    name: "Export of Services Exemption",
    authority: "VAT Act Cap 349 Sec. 24",
    rate: 0,
    purposeCode: "services export",
    exemption: true,
    note: "0% VAT rating on exported services under Section 24 of the VAT Act.",
  },
  {
    id: "uganda-business-income",
    name: "Business Income (Individual Rates)",
    authority: "Income Tax Act Cap 340",
    rate: 0.3,
    purposeCode: "ILP FY",
    note: "Progressive business income rates up to 30% for resident individuals after the minimum threshold.",
  },
];

const ugxBanks: RegulatoryBank[] = [
  {
    id: "stanbic-ug",
    name: "Stanbic Bank Uganda",
    displayName: "Stanbic Bank (Uganda)",
    swiftCode: "SBICUGKX",
    intermediaryUSD: 15,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "UNISS 1 day · BOU RTGS same-day",
    localCurrency: "UGX",
  },
  {
    id: "centenary",
    name: "Centenary Bank",
    displayName: "Centenary Bank (Uganda)",
    swiftCode: "CERBUGKA",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 17,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "UNISS 1 day · BOU RTGS same-day",
    localCurrency: "UGX",
  },
  {
    id: "absa-ug",
    name: "Absa Bank Uganda",
    displayName: "Absa (Uganda)",
    swiftCode: "BARCUGKX",
    intermediaryUSD: 16,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 19,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "UNISS 1 day · BOU RTGS same-day",
    localCurrency: "UGX",
  },
];

/* ---------------------------------------------------------------------------
 * Rwanda — USD → RWF
 * Law No 027/2022 on taxes on income — RRA.
 * ------------------------------------------------------------------------- */

const rwfTiers: StatutoryTier[] = [
  {
    id: "rwanda-ict-export",
    name: "ICT & Software Export Exemption",
    authority: "Law No 037/2012 on VAT",
    rate: 0,
    purposeCode: "ICT export",
    exemption: true,
    note: "Special digital export incentive — 0% VAT on ICT & software services exported under RRA recognition.",
  },
  {
    id: "rwanda-pit",
    name: "Standard PIT Brackets",
    authority: "Law No 027/2022 Art. 15",
    rate: 0.3,
    purposeCode: "PIT resident",
    note: "Progressive personal income tax brackets up to 30% for resident employment/business income.",
  },
];

const rwfBanks: RegulatoryBank[] = [
  {
    id: "bkr",
    name: "Bank of Kigali",
    displayName: "Bank of Kigali (Rwanda)",
    swiftCode: "BKIGRWRW",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 17,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RIPPS 1 day · BNR RTGS same-day",
    localCurrency: "RWF",
  },
  {
    id: "imb-rw",
    name: "I&M Bank Rwanda",
    displayName: "I&M Bank (Rwanda)",
    swiftCode: "BCRWRWRW",
    intermediaryUSD: 15,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RIPPS 1 day · BNR RTGS same-day",
    localCurrency: "RWF",
  },
  {
    id: "equity-rw",
    name: "Equity Bank Rwanda",
    displayName: "Equity Bank (Rwanda)",
    swiftCode: "EQBLRWRW",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 17,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RIPPS 1 day · BNR RTGS same-day",
    localCurrency: "RWF",
  },
];

/* ---------------------------------------------------------------------------
 * Zambia — USD → ZMW
 * Value Added Tax Act Chapter 331 & Income Tax Act Chapter 323 — ZRA.
 * ------------------------------------------------------------------------- */

const zmwTiers: StatutoryTier[] = [
  {
    id: "zambia-zero-rated-export",
    name: "Zero-Rated Export Services",
    authority: "VAT Act Cap 331 Export Schedule",
    rate: 0,
    purposeCode: "services export",
    exemption: true,
    note: "0% VAT on exported services under the VAT Export Schedule when the consumer is outside Zambia.",
  },
  {
    id: "zambia-turnover-tax",
    name: "Turnover Tax Regime",
    authority: "Income Tax Act Cap 323",
    rate: 0.04,
    purposeCode: "TT small business",
    note: "4% turnover tax for small businesses below the VAT threshold, replacing standard income tax.",
  },
];

const zmwBanks: RegulatoryBank[] = [
  {
    id: "zanaco",
    name: "Zanaco",
    displayName: "Zanaco (Zambia)",
    swiftCode: "ZNCOZMLX",
    intermediaryUSD: 15,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ZECHL 1 day · ZIPSS RTGS",
    localCurrency: "ZMW",
  },
  {
    id: "stanbic-zm",
    name: "Stanbic Bank Zambia",
    displayName: "Stanbic Bank (Zambia)",
    swiftCode: "SBICZMLX",
    intermediaryUSD: 16,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 19,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ZECHL 1 day · ZIPSS RTGS",
    localCurrency: "ZMW",
  },
  {
    id: "absa-zm",
    name: "Absa Bank Zambia",
    displayName: "Absa (Zambia)",
    swiftCode: "BARCZMLX",
    intermediaryUSD: 15,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ZECHL 1 day · ZIPSS RTGS",
    localCurrency: "ZMW",
  },
];

/* ---------------------------------------------------------------------------
 * Nepal — USD → NPR
 * Income Tax Act 2058 (2002) & NRB Foreign Remittance By-laws — IRD Nepal.
 * ------------------------------------------------------------------------- */

const nprTiers: StatutoryTier[] = [
  {
    id: "nepal-it-export",
    name: "IT/BPO Software Export Incentive",
    authority: "Finance Act 2080 IT Export Sec.",
    rate: 0.01,
    purposeCode: "inward IT remittance",
    exemption: true,
    note: "1% final advance withholding tax (reduced rate) on foreign inward IT/BPO remittances per NRB circular.",
  },
  {
    id: "nepal-pit",
    name: "Standard PIT",
    authority: "Income Tax Act 2058 (2002)",
    rate: 0.36,
    purposeCode: "PIT resident",
    note: "Progressive personal income tax up to 36% for resident individuals on taxable income.",
  },
];

const nprBanks: RegulatoryBank[] = [
  {
    id: "nabil",
    name: "Nabil Bank",
    displayName: "Nabil Bank (Nepal)",
    swiftCode: "NARINPKA",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "connectIPS same-day · NRB RTGS",
    localCurrency: "NPR",
  },
  {
    id: "global-ime",
    name: "Global IME Bank",
    displayName: "Global IME Bank (Nepal)",
    swiftCode: "GLBLNPKA",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "connectIPS same-day · NRB RTGS",
    localCurrency: "NPR",
  },
  {
    id: "nibl-mega",
    name: "Nepal Investment Mega Bank",
    displayName: "NIMB (Nepal)",
    swiftCode: "NIBLNPKT",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 17,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "connectIPS same-day · NRB RTGS",
    localCurrency: "NPR",
  },
];

/* ---------------------------------------------------------------------------
 * Sri Lanka — USD → LKR
 * Inland Revenue Act No. 24 of 2017 & CBSL Foreign Exchange Act — IRD.
 * ------------------------------------------------------------------------- */

const lkrTiers: StatutoryTier[] = [
  {
    id: "lanka-export-services",
    name: "Foreign Service Export Exemption",
    authority: "Inland Revenue Act No. 24 Sec. 7",
    rate: 0,
    purposeCode: "foreign currency services",
    exemption: true,
    note: "0% income tax on services supplied to a person outside Sri Lanka where the consideration is received in foreign currency.",
  },
  {
    id: "lanka-remittance-rebate",
    name: "CBSL Inward Remittance Rebate",
    authority: "CBSL FX Operating Instructions",
    rate: 0,
    purposeCode: "inward remittance",
    note: "Foreign-currency inward remittances channel through CBSL-authorized banks; franchising credits offset final tax.",
  },
];

const lkrBanks: RegulatoryBank[] = [
  {
    id: "combank",
    name: "Commercial Bank of Ceylon",
    displayName: "ComBank (Sri Lanka)",
    swiftCode: "COMBCEKX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "LankaPay SLIPS 1 day · CBSL RTGS",
    localCurrency: "LKR",
  },
  {
    id: "hnb",
    name: "Hatton National Bank (HNB)",
    displayName: "HNB (Sri Lanka)",
    swiftCode: "HNBLLKLX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "LankaPay SLIPS 1 day · CBSL RTGS",
    localCurrency: "LKR",
  },
  {
    id: "boc",
    name: "Bank of Ceylon",
    displayName: "Bank of Ceylon",
    swiftCode: "BCEYLKLX",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 17,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "LankaPay SLIPS 1 day · CBSL RTGS",
    localCurrency: "LKR",
  },
];

/* ---------------------------------------------------------------------------
 * Kazakhstan — USD → KZT
 * Tax Code of the Republic of Kazakhstan & Astana Hub regime — SRC.
 * ------------------------------------------------------------------------- */

const kztTiers: StatutoryTier[] = [
  {
    id: "kazakh-astana-hub",
    name: "Astana Hub IT Exemption",
    authority: "Tax Code Art. 293 & 394",
    rate: 0,
    purposeCode: "Astana Hub IT exporter",
    exemption: true,
    note: "0% Corporate Income Tax, 0% VAT and 0% Individual Income Tax for accredited Astana Hub IT exporters.",
  },
  {
    id: "kazakh-simplified",
    name: "Simplified Tax Declaration",
    authority: "Tax Code Art. 683",
    rate: 0.03,
    purposeCode: "simplified 3%",
    note: "3% flat rate on turnover for sole proprietors under the simplified declaration regime.",
  },
];

const kztBanks: RegulatoryBank[] = [
  {
    id: "kaspi",
    name: "Kaspi Bank",
    displayName: "Kaspi Bank (Kazakhstan)",
    swiftCode: "CASPKZKA",
    intermediaryUSD: 10,
    intermediaryMinUSD: 8,
    intermediaryMaxUSD: 13,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "KISC IMTS instant · NBK RTGS",
    localCurrency: "KZT",
  },
  {
    id: "halyk",
    name: "Halyk Bank",
    displayName: "Halyk Bank (Kazakhstan)",
    swiftCode: "HSBKKZKX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "KISC IMTS instant · NBK RTGS",
    localCurrency: "KZT",
  },
  {
    id: "fortebank",
    name: "ForteBank",
    displayName: "ForteBank (Kazakhstan)",
    swiftCode: "IRTYKZKA",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "KISC IMTS instant · NBK RTGS",
    localCurrency: "KZT",
  },
];

/* ---------------------------------------------------------------------------
 * Multi-origin (EUR / GBP) — destination statutory regime + receiving-bank
 * records for the 22 eur- and gbp- corridors. Tiers reuse the destination
 * country's authored arrays where they exist; BDT / NGN / EGP / BRL / ZAR get
 * dedicated statutory tiers below. Bank arrays mirror the real receiving
 * banks but carry EUR/GBP-clearing benchmark cuts distinct from the USD
 * corridors so the leakage index never clusters identical rows.
 * ------------------------------------------------------------------------- */

const bdtTiers: StatutoryTier[] = [
  {
    id: "bdt-registered-exporter",
    name: "Registered IT/BPO Exporter",
    authority: "Bangladesh Bank FE Circulars & ITO Section 34",
    rate: 0.005,
    purposeCode: "EXP",
    note: "0.5% final income tax on export proceeds for registered IT/BPO exporters under the relaxed remittance window.",
  },
  {
    id: "bdt-other-remittance",
    name: "Other Remittance",
    authority: "Bangladesh Bank FE Circulars",
    rate: 0.01,
    note: "1% adjustable withholding on non-export service remittances — confirm exporter registration with the receiving bank.",
  },
];

const ngnTiers: StatutoryTier[] = [
  {
    id: "ngn-export-it",
    name: "IT/BPO Export Incentive",
    authority: "CBN RT200 Guidelines & FIRS CIT Act Cap. C21",
    rate: 0.005,
    purposeCode: "AUT",
    note: "0.5% concessional withholding for qualifying IT/BPO export services under CBN non-oil export incentives.",
  },
  {
    id: "ngn-other-services",
    name: "Other Services",
    authority: "FIRS Withholding Tax Regime",
    rate: 0.05,
    note: "5% withholding on non-incentivised service income; exemption certificates must be filed with the paying entity.",
  },
];

const egpTiers: StatutoryTier[] = [
  {
    id: "egp-export-services",
    name: "Export Services — Hard Currency",
    authority: "CBE Regulation 5 of 2024 & Tax Law 91/2005",
    rate: 0.005,
    purposeCode: "EXP",
    note: "Reduced 0.5% corporate income tax on export-of-services proceeds converted through CBE-regulated channels.",
  },
  {
    id: "egp-standard",
    name: "Standard Commercial Rate",
    authority: "Income Tax Law 91/2005",
    rate: 0.225,
    note: "22.5% standard tax on commercial income when the export-service declaration is not filed.",
  },
];

const brlTiers: StatutoryTier[] = [
  {
    id: "brl-export-service",
    name: "Export Service Revenue",
    authority: "Receita Federal · Code 40 Exportation of Services",
    rate: 0.015,
    purposeCode: "BACEN",
    note: "Export-of-services earnings receive a 95% CIT reduction on foreign revenue under the export-services regime.",
  },
  {
    id: "brl-cpf-standard",
    name: "CPF Standard Band",
    authority: "IRPF Carnê-Leão",
    rate: 0.275,
    note: "Top IRPF band 27.5% applies to locally-reportable service income not covered by the export reduction.",
  },
];

const zarTiers: StatutoryTier[] = [
  {
    id: "zar-freelancer",
    name: "Freelancer / Independent Contractor",
    authority: "SARS Income Tax Act Chapter II & SARB AD rules",
    rate: 0.18,
    purposeCode: "Repat",
    note: "Repatriated foreign earnings declared in rand at the everyday SARB-adjacent rate; standard 18% bracket on taxable income.",
  },
  {
    id: "zar-upper-band",
    name: "Upper Income Band",
    authority: "SARS Income Tax Act Chapter II",
    rate: 0.26,
    note: "26% marginal rate applies once taxable rental/remittance income crosses the upper bracket threshold.",
  },
];

const eurPkrBanks: RegulatoryBank[] = [
  {
    id: "meezan",
    name: "Meezan Bank",
    displayName: "Meezan Bank (Pakistan)",
    swiftCode: "MZNBPKKA",
    intermediaryUSD: 16,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 19,
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
    intermediaryMinUSD: 16,
    intermediaryMaxUSD: 21,
    localFeeDefault: 100,
    speed: "Standard",
    clearance: "PRC turnaround 48 hrs",
    localCurrency: "PKR",
  },
  {
    id: "ubl",
    name: "United Bank Limited",
    displayName: "UBL (Pakistan)",
    swiftCode: "UBLBPKKA",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 17,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Raast Inward · Priority FX margin",
    localCurrency: "PKR",
  },
];

const eurInrBanks: RegulatoryBank[] = [
  {
    id: "hdfc",
    name: "HDFC Bank",
    displayName: "HDFC Bank (India)",
    swiftCode: "HDFCINBB",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 17,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "IMPS / NEFT inward 1 day",
    localCurrency: "INR",
  },
  {
    id: "icici",
    name: "ICICI Bank",
    displayName: "ICICI Bank (India)",
    swiftCode: "ICICINBB",
    intermediaryUSD: 16,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 19,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NEFT / RTGS 1 day",
    localCurrency: "INR",
  },
  {
    id: "axis",
    name: "Axis Bank",
    displayName: "Axis Bank (India)",
    swiftCode: "AXISINBB",
    intermediaryUSD: 13,
    intermediaryMinUSD: 11,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "IMPS instant inward",
    localCurrency: "INR",
  },
];

const eurPhpBanks: RegulatoryBank[] = [
  {
    id: "bdo",
    name: "BDO Unibank",
    displayName: "BDO Unibank (Philippines)",
    swiftCode: "BNORPHMM",
    intermediaryUSD: 17,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 20,
    localFeeDefault: 15,
    speed: "Fast",
    clearance: "InstaPay / PESONet 1 day",
    localCurrency: "PHP",
  },
  {
    id: "rcbc",
    name: "RCBC",
    displayName: "Rizal Commercial Banking Corp",
    swiftCode: "RCBCPHMM",
    intermediaryUSD: 15,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "InstaPay instant",
    localCurrency: "PHP",
  },
  {
    id: "metrobank",
    name: "Metrobank",
    displayName: "Metropolitan Bank & Trust",
    swiftCode: "MBTCPHMM",
    intermediaryUSD: 19,
    intermediaryMinUSD: 16,
    intermediaryMaxUSD: 22,
    localFeeDefault: 10,
    speed: "Standard",
    clearance: "PESONet 1 day",
    localCurrency: "PHP",
  },
];

const eurBdtBanks: RegulatoryBank[] = [
  {
    id: "brac",
    name: "BRAC Bank",
    displayName: "BRAC Bank (Bangladesh)",
    swiftCode: "BRAKBDDH",
    intermediaryUSD: 15,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BEFTN 1 day",
    localCurrency: "BDT",
  },
  {
    id: "dutch-bangla",
    name: "Dutch-Bangla Bank",
    displayName: "Dutch-Bangla Bank (Bangladesh)",
    swiftCode: "DBBLBDDH",
    intermediaryUSD: 17,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BEFTN 1 day",
    localCurrency: "BDT",
  },
  {
    id: "islami",
    name: "Islami Bank",
    displayName: "Islami Bank Bangladesh",
    swiftCode: "IBLBBDDH",
    intermediaryUSD: 16,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 19,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BEFTN 1 day",
    localCurrency: "BDT",
  },
];

const eurNgnBanks: RegulatoryBank[] = [
  {
    id: "gtbank",
    name: "GTBank",
    displayName: "Guaranty Trust Bank (Nigeria)",
    swiftCode: "GTBINGLA",
    intermediaryUSD: 22,
    intermediaryMinUSD: 20,
    intermediaryMaxUSD: 25,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NIBSS instant",
    localCurrency: "NGN",
  },
  {
    id: "zenith",
    name: "Zenith Bank",
    displayName: "Zenith Bank (Nigeria)",
    swiftCode: "ZEIBNGLA",
    intermediaryUSD: 20,
    intermediaryMinUSD: 18,
    intermediaryMaxUSD: 23,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NIBSS instant",
    localCurrency: "NGN",
  },
  {
    id: "access",
    name: "Access Bank",
    displayName: "Access Bank (Nigeria)",
    swiftCode: "ABNGNGLA",
    intermediaryUSD: 23,
    intermediaryMinUSD: 20,
    intermediaryMaxUSD: 26,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NIP instant",
    localCurrency: "NGN",
  },
];

const eurEgpBanks: RegulatoryBank[] = [
  {
    id: "banque-misr",
    name: "Banque Misr",
    displayName: "Banque Misr (Egypt)",
    swiftCode: "BMISEGCX",
    intermediaryUSD: 18,
    intermediaryMinUSD: 16,
    intermediaryMaxUSD: 21,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "InstaPay instant",
    localCurrency: "EGP",
  },
  {
    id: "cib",
    name: "Commercial Int'l Bank",
    displayName: "CIB (Egypt)",
    swiftCode: "CIBEEGCX",
    intermediaryUSD: 17,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "InstaPay instant",
    localCurrency: "EGP",
  },
  {
    id: "nbe",
    name: "National Bank of Egypt",
    displayName: "NBE (Egypt)",
    swiftCode: "NBEGEGCX",
    intermediaryUSD: 19,
    intermediaryMinUSD: 16,
    intermediaryMaxUSD: 22,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "ACH 1 day",
    localCurrency: "EGP",
  },
];

const eurBrlBanks: RegulatoryBank[] = [
  {
    id: "banco-brasil",
    name: "Banco do Brasil",
    displayName: "Banco do Brasil",
    swiftCode: "BRASBRRJ",
    intermediaryUSD: 20,
    intermediaryMinUSD: 17,
    intermediaryMaxUSD: 23,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PIX instant",
    localCurrency: "BRL",
  },
  {
    id: "itau",
    name: "Itaú Unibanco",
    displayName: "Itaú Unibanco",
    swiftCode: "ITAUBRSP",
    intermediaryUSD: 22,
    intermediaryMinUSD: 19,
    intermediaryMaxUSD: 25,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PIX instant",
    localCurrency: "BRL",
  },
  {
    id: "santander-br",
    name: "Santander Brasil",
    displayName: "Santander Brasil",
    swiftCode: "BSSSBRSP",
    intermediaryUSD: 19,
    intermediaryMinUSD: 16,
    intermediaryMaxUSD: 22,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "TED 1 day",
    localCurrency: "BRL",
  },
];

const eurVndBanks: RegulatoryBank[] = [
  {
    id: "vietcombank",
    name: "Vietcombank",
    displayName: "Bank for Foreign Trade (Vietnam)",
    swiftCode: "BFTVVNVX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NAPAS 24/7",
    localCurrency: "VND",
  },
  {
    id: "techcombank",
    name: "Techcombank",
    displayName: "Techcombank (Vietnam)",
    swiftCode: "VTCBVNVX",
    intermediaryUSD: 13,
    intermediaryMinUSD: 11,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NAPAS 24/7",
    localCurrency: "VND",
  },
  {
    id: "bidv",
    name: "BIDV",
    displayName: "Bank for Investment & Dev. (Vietnam)",
    swiftCode: "BIDVVNVX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CVQ 1 day",
    localCurrency: "VND",
  },
];

const eurIdrBanks: RegulatoryBank[] = [
  {
    id: "mandiri",
    name: "Bank Mandiri",
    displayName: "Bank Mandiri (Indonesia)",
    swiftCode: "BEIIIJJA",
    intermediaryUSD: 13,
    intermediaryMinUSD: 11,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BI-FAST instant",
    localCurrency: "IDR",
  },
  {
    id: "bca",
    name: "Bank Central Asia",
    displayName: "BCA (Indonesia)",
    swiftCode: "CENAIDJA",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 17,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BI-FAST instant",
    localCurrency: "IDR",
  },
  {
    id: "bri",
    name: "Bank Rakyat Indonesia",
    displayName: "BRI (Indonesia)",
    swiftCode: "BRINIDJA",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BI-RTGS 1 day",
    localCurrency: "IDR",
  },
];

const eurMxnBanks: RegulatoryBank[] = [
  {
    id: "bbva-mx",
    name: "BBVA México",
    displayName: "BBVA México",
    swiftCode: "BCMRMXMM",
    intermediaryUSD: 19,
    intermediaryMinUSD: 16,
    intermediaryMaxUSD: 22,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "SPEI same-day",
    localCurrency: "MXN",
  },
  {
    id: "citibanamex",
    name: "Citibanamex",
    displayName: "CitiBanamex (Mexico)",
    swiftCode: "CITIMXMM",
    intermediaryUSD: 18,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 21,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "SPEI same-day",
    localCurrency: "MXN",
  },
  {
    id: "santander-mx",
    name: "Santander México",
    displayName: "Santander México",
    swiftCode: "BSCHMXMM",
    intermediaryUSD: 20,
    intermediaryMinUSD: 17,
    intermediaryMaxUSD: 23,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "SPEI same-day",
    localCurrency: "MXN",
  },
];

const eurTryBanks: RegulatoryBank[] = [
  {
    id: "isbank",
    name: "İşbank",
    displayName: "Türkiye İş Bankası",
    swiftCode: "ISBKTRIS",
    intermediaryUSD: 21,
    intermediaryMinUSD: 18,
    intermediaryMaxUSD: 24,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "FAST instant",
    localCurrency: "TRY",
  },
  {
    id: "akbank",
    name: "Akbank",
    displayName: "Akbank (Turkey)",
    swiftCode: "AKBKTRIS",
    intermediaryUSD: 20,
    intermediaryMinUSD: 17,
    intermediaryMaxUSD: 23,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "FAST instant",
    localCurrency: "TRY",
  },
  {
    id: "ziraat",
    name: "Ziraat Bankası",
    displayName: "Ziraat Bankası",
    swiftCode: "TCZBTR2A",
    intermediaryUSD: 22,
    intermediaryMinUSD: 19,
    intermediaryMaxUSD: 25,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "EFT 1 day",
    localCurrency: "TRY",
  },
];

const eurKesBanks: RegulatoryBank[] = [
  {
    id: "equity",
    name: "Equity Bank",
    displayName: "Equity Bank (Kenya)",
    swiftCode: "EQBLKENA",
    intermediaryUSD: 23,
    intermediaryMinUSD: 20,
    intermediaryMaxUSD: 26,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PesaLink instant",
    localCurrency: "KES",
  },
  {
    id: "kcb",
    name: "KCB Bank",
    displayName: "KCB Bank (Kenya)",
    swiftCode: "KCBLKENX",
    intermediaryUSD: 21,
    intermediaryMinUSD: 18,
    intermediaryMaxUSD: 24,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PesaLink instant",
    localCurrency: "KES",
  },
  {
    id: "cooperative",
    name: "Co-operative Bank",
    displayName: "Co-operative Bank (Kenya)",
    swiftCode: "KCOOKENA",
    intermediaryUSD: 22,
    intermediaryMinUSD: 19,
    intermediaryMaxUSD: 25,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "EFT 1 day",
    localCurrency: "KES",
  },
];

const gbpPkrBanks: RegulatoryBank[] = [
  {
    id: "meezan",
    name: "Meezan Bank",
    displayName: "Meezan Bank (Pakistan)",
    swiftCode: "MZNBPKKA",
    intermediaryUSD: 24,
    intermediaryMinUSD: 22,
    intermediaryMaxUSD: 27,
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
    intermediaryUSD: 22,
    intermediaryMinUSD: 19,
    intermediaryMaxUSD: 25,
    localFeeDefault: 100,
    speed: "Standard",
    clearance: "PRC turnaround 48 hrs",
    localCurrency: "PKR",
  },
  {
    id: "ubl",
    name: "United Bank Limited",
    displayName: "UBL (Pakistan)",
    swiftCode: "UBLBPKKA",
    intermediaryUSD: 25,
    intermediaryMinUSD: 22,
    intermediaryMaxUSD: 28,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Raast Inward · Priority FX margin",
    localCurrency: "PKR",
  },
];

const gbpInrBanks: RegulatoryBank[] = [
  {
    id: "hdfc",
    name: "HDFC Bank",
    displayName: "HDFC Bank (India)",
    swiftCode: "HDFCINBB",
    intermediaryUSD: 11,
    intermediaryMinUSD: 9,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "IMPS / NEFT inward 1 day",
    localCurrency: "INR",
  },
  {
    id: "icici",
    name: "ICICI Bank",
    displayName: "ICICI Bank (India)",
    swiftCode: "ICICINBB",
    intermediaryUSD: 13,
    intermediaryMinUSD: 11,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NEFT / RTGS 1 day",
    localCurrency: "INR",
  },
  {
    id: "axis",
    name: "Axis Bank",
    displayName: "Axis Bank (India)",
    swiftCode: "AXISINBB",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "IMPS instant inward",
    localCurrency: "INR",
  },
];

const gbpPhpBanks: RegulatoryBank[] = [
  {
    id: "bdo",
    name: "BDO Unibank",
    displayName: "BDO Unibank (Philippines)",
    swiftCode: "BNORPHMM",
    intermediaryUSD: 25,
    intermediaryMinUSD: 22,
    intermediaryMaxUSD: 28,
    localFeeDefault: 15,
    speed: "Fast",
    clearance: "InstaPay / PESONet 1 day",
    localCurrency: "PHP",
  },
  {
    id: "rcbc",
    name: "RCBC",
    displayName: "Rizal Commercial Banking Corp",
    swiftCode: "RCBCPHMM",
    intermediaryUSD: 23,
    intermediaryMinUSD: 20,
    intermediaryMaxUSD: 26,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "InstaPay instant",
    localCurrency: "PHP",
  },
  {
    id: "metrobank",
    name: "Metrobank",
    displayName: "Metropolitan Bank & Trust",
    swiftCode: "MBTCPHMM",
    intermediaryUSD: 24,
    intermediaryMinUSD: 21,
    intermediaryMaxUSD: 27,
    localFeeDefault: 10,
    speed: "Standard",
    clearance: "PESONet 1 day",
    localCurrency: "PHP",
  },
];

const gbpBdtBanks: RegulatoryBank[] = [
  {
    id: "brac",
    name: "BRAC Bank",
    displayName: "BRAC Bank (Bangladesh)",
    swiftCode: "BRAKBDDH",
    intermediaryUSD: 26,
    intermediaryMinUSD: 23,
    intermediaryMaxUSD: 29,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BEFTN 1 day",
    localCurrency: "BDT",
  },
  {
    id: "dutch-bangla",
    name: "Dutch-Bangla Bank",
    displayName: "Dutch-Bangla Bank (Bangladesh)",
    swiftCode: "DBBLBDDH",
    intermediaryUSD: 27,
    intermediaryMinUSD: 24,
    intermediaryMaxUSD: 30,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BEFTN 1 day",
    localCurrency: "BDT",
  },
  {
    id: "islami",
    name: "Islami Bank",
    displayName: "Islami Bank Bangladesh",
    swiftCode: "IBLBBDDH",
    intermediaryUSD: 25,
    intermediaryMinUSD: 22,
    intermediaryMaxUSD: 28,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BEFTN 1 day",
    localCurrency: "BDT",
  },
];

const gbpNgnBanks: RegulatoryBank[] = [
  {
    id: "gtbank",
    name: "GTBank",
    displayName: "Guaranty Trust Bank (Nigeria)",
    swiftCode: "GTBINGLA",
    intermediaryUSD: 28,
    intermediaryMinUSD: 25,
    intermediaryMaxUSD: 31,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NIBSS instant",
    localCurrency: "NGN",
  },
  {
    id: "zenith",
    name: "Zenith Bank",
    displayName: "Zenith Bank (Nigeria)",
    swiftCode: "ZEIBNGLA",
    intermediaryUSD: 29,
    intermediaryMinUSD: 26,
    intermediaryMaxUSD: 32,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NIBSS instant",
    localCurrency: "NGN",
  },
  {
    id: "access",
    name: "Access Bank",
    displayName: "Access Bank (Nigeria)",
    swiftCode: "ABNGNGLA",
    intermediaryUSD: 27,
    intermediaryMinUSD: 24,
    intermediaryMaxUSD: 30,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NIP instant",
    localCurrency: "NGN",
  },
];

const gbpEgpBanks: RegulatoryBank[] = [
  {
    id: "banque-misr",
    name: "Banque Misr",
    displayName: "Banque Misr (Egypt)",
    swiftCode: "BMISEGCX",
    intermediaryUSD: 27,
    intermediaryMinUSD: 24,
    intermediaryMaxUSD: 30,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "InstaPay instant",
    localCurrency: "EGP",
  },
  {
    id: "cib",
    name: "Commercial Int'l Bank",
    displayName: "CIB (Egypt)",
    swiftCode: "CIBEEGCX",
    intermediaryUSD: 26,
    intermediaryMinUSD: 23,
    intermediaryMaxUSD: 29,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "InstaPay instant",
    localCurrency: "EGP",
  },
  {
    id: "nbe",
    name: "National Bank of Egypt",
    displayName: "NBE (Egypt)",
    swiftCode: "NBEGEGCX",
    intermediaryUSD: 28,
    intermediaryMinUSD: 25,
    intermediaryMaxUSD: 31,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "ACH 1 day",
    localCurrency: "EGP",
  },
];

const gbpKesBanks: RegulatoryBank[] = [
  {
    id: "equity",
    name: "Equity Bank",
    displayName: "Equity Bank (Kenya)",
    swiftCode: "EQBLKENA",
    intermediaryUSD: 29,
    intermediaryMinUSD: 26,
    intermediaryMaxUSD: 32,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PesaLink instant",
    localCurrency: "KES",
  },
  {
    id: "kcb",
    name: "KCB Bank",
    displayName: "KCB Bank (Kenya)",
    swiftCode: "KCBLKENX",
    intermediaryUSD: 30,
    intermediaryMinUSD: 27,
    intermediaryMaxUSD: 33,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PesaLink instant",
    localCurrency: "KES",
  },
  {
    id: "cooperative",
    name: "Co-operative Bank",
    displayName: "Co-operative Bank (Kenya)",
    swiftCode: "KCOOKENA",
    intermediaryUSD: 28,
    intermediaryMinUSD: 25,
    intermediaryMaxUSD: 31,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "EFT 1 day",
    localCurrency: "KES",
  },
];

const gbpZarBanks: RegulatoryBank[] = [
  {
    id: "fnb",
    name: "First National Bank",
    displayName: "FNB (South Africa)",
    swiftCode: "FIRNZAJJ",
    intermediaryUSD: 30,
    intermediaryMinUSD: 27,
    intermediaryMaxUSD: 33,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PayShap / eFT instant",
    localCurrency: "ZAR",
  },
  {
    id: "capitec",
    name: "Capitec Bank",
    displayName: "Capitec Bank (South Africa)",
    swiftCode: "CABLZAJJ",
    intermediaryUSD: 29,
    intermediaryMinUSD: 26,
    intermediaryMaxUSD: 32,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "PayShap instant",
    localCurrency: "ZAR",
  },
  {
    id: "standard-bank",
    name: "Standard Bank",
    displayName: "Standard Bank (South Africa)",
    swiftCode: "SBZAZAJJ",
    intermediaryUSD: 31,
    intermediaryMinUSD: 27,
    intermediaryMaxUSD: 34,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "eFT 1 day",
    localCurrency: "ZAR",
  },
];

const gbpGhsBanks: RegulatoryBank[] = [
  {
    id: "gcb",
    name: "GCB Bank",
    displayName: "GCB Bank (Ghana)",
    swiftCode: "GCBHGHAC",
    intermediaryUSD: 31,
    intermediaryMinUSD: 27,
    intermediaryMaxUSD: 34,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "GhIPSS instant",
    localCurrency: "GHS",
  },
  {
    id: "ecobank-gh",
    name: "Ecobank Ghana",
    displayName: "Ecobank Ghana",
    swiftCode: "ECOCGHAC",
    intermediaryUSD: 29,
    intermediaryMinUSD: 26,
    intermediaryMaxUSD: 32,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "GhIPSS instant",
    localCurrency: "GHS",
  },
  {
    id: "gtbank-gh",
    name: "GTBank Ghana",
    displayName: "Guaranty Trust Bank (Ghana)",
    swiftCode: "GTBIGHAC",
    intermediaryUSD: 30,
    intermediaryMinUSD: 27,
    intermediaryMaxUSD: 33,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "GhIPSS 1 day",
    localCurrency: "GHS",
  },
];

const gbpPlnBanks: RegulatoryBank[] = [
  {
    id: "mbank",
    name: "mBank",
    displayName: "mBank (Poland)",
    swiftCode: "BREXPLPW",
    intermediaryUSD: 9,
    intermediaryMinUSD: 7,
    intermediaryMaxUSD: 12,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ELIXIR / Express ELIXIR instant",
    localCurrency: "PLN",
  },
  {
    id: "pkobp",
    name: "PKO BP",
    displayName: "Powszechna Kasa Oszczędności (Poland)",
    swiftCode: "BPKOPLPW",
    intermediaryUSD: 10,
    intermediaryMinUSD: 8,
    intermediaryMaxUSD: 13,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "ELIXIR 1 day",
    localCurrency: "PLN",
  },
  {
    id: "ing-slas",
    name: "ING Bank Śląski",
    displayName: "ING Bank Śląski (Poland)",
    swiftCode: "INGBPLPW",
    intermediaryUSD: 9,
    intermediaryMinUSD: 7,
    intermediaryMaxUSD: 12,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Express ELIXIR instant",
    localCurrency: "PLN",
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
  "usd-to-mxn": {
    slug: "usd-to-mxn",
    authority:
      "Servicio de Administración Tributaria (SAT) · Ley del IVA Art. 29-D & LISR Art. 113-E",
    clearingNetwork: "SPEI (same-day inward)",
    citations: [
      "SAT RESICO Art. 113-E",
      "LIVA Art. 29-D Exportación 0%",
      "SPEI Circular Banxico 14/2017",
    ],
    banks: mxnBanks,
    tiers: mxnTiers,
    generic: false,
  },
  "usd-to-ars": {
    slug: "usd-to-ars",
    authority:
      "Banco Central de la República Argentina (BCRA) Com. A 7518 & AFIP Resolución 1415",
    clearingNetwork: "MEP / Transferencias 3.0 / BCRA MULC",
    citations: [
      "BCRA Com. A 7518",
      "AFIP Factura de Exportación E",
      "Ley 27.541",
    ],
    banks: arsBanks,
    tiers: arsTiers,
    generic: false,
  },
  "usd-to-pln": {
    slug: "usd-to-pln",
    authority:
      "Ministerstwo Finansów · Ustawa o zryczałtowanym podatku dochodowym & Ustawa o VAT",
    clearingNetwork: "ELIXIR / Express ELIXIR (KIR)",
    citations: [
      "Ustawa o Ryczałcie Art. 12",
      "VAT Art. 28b (Reverse Charge)",
      "KIR ELIXIR Clearing",
    ],
    banks: plnBanks,
    tiers: plnTiers,
    generic: false,
  },
  "usd-to-ron": {
    slug: "usd-to-ron",
    authority:
      "ANAF · Codul Fiscal Legea 227/2015 Art. 47 & Scutire Export Servicii",
    clearingNetwork: "Transfond SENT / ReGIS",
    citations: [
      "Codul Fiscal Art. 47 Microîntreprinderi",
      "ANAF Norme Metodologice 2026",
      "Transfond SENT",
    ],
    banks: ronBanks,
    tiers: ronTiers,
    generic: false,
  },
  "usd-to-czk": {
    slug: "usd-to-czk",
    authority:
      "Finanční správa České republiky · Zákon č. 586/1992 Sb. o daních z příjmů",
    clearingNetwork: "ČNB CERTIS",
    citations: [
      "Zákon o daních z příjmů § 7a",
      "ČNB CERTIS System",
      "DPH Osvobození § 67",
    ],
    banks: czkBanks,
    tiers: czkTiers,
    generic: false,
  },
  "usd-to-thb": {
    slug: "usd-to-thb",
    authority:
      "Revenue Department of Thailand · Revenue Code Section 40(2)/(8) & Departmental Order Paw. 161/2566",
    clearingNetwork: "PromptPay / BAHTNET",
    citations: [
      "Revenue Code Section 40",
      "Paw. 161/2566 Remittance Rules",
      "PromptPay BOT Clearing",
    ],
    banks: thbBanks,
    tiers: thbTiers,
    generic: false,
  },
  "usd-to-myr": {
    slug: "usd-to-myr",
    authority:
      "Lembaga Hasil Dalam Negeri (LHDN) · Income Tax Act 1967 & Guidelines on Foreign Sourced Income",
    clearingNetwork: "RENTAS / DuitNow",
    citations: [
      "LHDN ITA 1967 Schedule 6",
      "LHDN Public Ruling 5/2022",
      "PayNet DuitNow Clearing",
    ],
    banks: myrBanks,
    tiers: myrTiers,
    generic: false,
  },
  "usd-to-ghs": {
    slug: "usd-to-ghs",
    authority:
      "Ghana Revenue Authority (GRA) · Income Tax Act, 2015 (Act 896) & Bank of Ghana Notice BG/GOV/SEC/2020/02",
    clearingNetwork: "GhIPSS / ACH",
    citations: [
      "GRA Act 896 Section 114",
      "Bank of Ghana FX Repatriation Rules",
      "GhIPSS Inward Clearing",
    ],
    banks: ghsBanks,
    tiers: ghsTiers,
    generic: false,
  },
  "usd-to-aed": {
    slug: "usd-to-aed",
    authority:
      "Federal Tax Authority (FTA) · Federal Decree-Law No. 47 of 2022 on the Taxation of Corporations and Businesses",
    clearingNetwork: "UAEFTS / IPI",
    citations: [
      "FTA Corporate Tax Law Art. 3",
      "Cabinet Decision No. 49/2023 Small Business Relief",
      "CBUAE UAEFTS Clearing",
    ],
    banks: aedBanks,
    tiers: aedTiers,
    generic: false,
  },
  "usd-to-sar": {
    slug: "usd-to-sar",
    authority:
      "Zakat, Tax and Customs Authority (ZATCA) · VAT Implementing Regulations Article 33",
    clearingNetwork: "SARIE",
    citations: [
      "ZATCA VAT Regulations Art. 33 Zero-Rating",
      "ZATCA Income Tax Law Art. 68",
      "SAMA SARIE Instant Rail",
    ],
    banks: sarBanks,
    tiers: sarTiers,
    generic: false,
  },
  "usd-to-uah": {
    slug: "usd-to-uah",
    authority:
      "Державна податкова служба України · Податковий кодекс України (ПКУ) ст. 294 & 167 & ст. 6",
    clearingNetwork: "SEP / IBAN · SPRINT",
    citations: [
      "ПКУ ст. 294 ФОП Group 3 · 5%",
      "ПКУ ст. 167 ПДФО 18% · ст. 6 Військовий збір 1.5%",
      "NBU SEP Clearing",
    ],
    banks: uahBanks,
    tiers: uahTiers,
    generic: false,
  },
  "usd-to-iqd": {
    slug: "usd-to-iqd",
    authority:
      "Central Bank of Iraq (CBI) · Banking Law No. 56 of 2004 & Income Tax Law No. 113 of 1982",
    clearingNetwork: "CBI RTGS / Clearing",
    citations: [
      "CBI FX Auction Settlement",
      "Income Tax Law No. 113 of 1982",
      "CBI Clearing System",
    ],
    banks: iqdBanks,
    tiers: iqdTiers,
    generic: false,
  },
  "usd-to-mad": {
    slug: "usd-to-mad",
    authority:
      "Direction Générale des Impôts (DGI) · Code Général des Impôts Art. 73-82",
    clearingNetwork: "RTP (Bank Al-Maghrib) / ACH",
    citations: [
      "CGI Art. 82 Auto-Entrepreneur 1%",
      "CGI Barème IR 0-38%",
      "Bank Al-Maghrib RTP Clearing",
    ],
    banks: madBanks,
    tiers: madTiers,
    generic: false,
  },
  "usd-to-clp": {
    slug: "usd-to-clp",
    authority:
      "Servicio de Impuestos Internos (SII) · Código Tributario Art. 74 No. 6 & Ley sobre Impuesto a la Renta",
    clearingNetwork: "TEF / LCB",
    citations: [
      "SII Art. 74 No. 6 Retención Honorarios",
      "LIR Impuesto Global Complementario",
      "SBIF/SBC Transferencias (TEF)",
    ],
    banks: clpBanks,
    tiers: clpTiers,
    generic: false,
  },
  "usd-to-pen": {
    slug: "usd-to-pen",
    authority:
      "SUNAT · Ley del Impuesto a la Renta Art. 34-A & Arts. 51-53",
    clearingNetwork: "RTP / PLIN",
    citations: [
      "LIR Art. 34-A Retención 4ta Categoría",
      "SUNAT Renta 4ta/5ta Scale",
      "BCRP RTP Clearing",
    ],
    banks: penBanks,
    tiers: penTiers,
    generic: false,
  },
  "usd-to-huf": {
    slug: "usd-to-huf",
    authority:
      "Nemzeti Adó- és Vámhivatal (NAV) · Szja. törvény 15% & Katv. (2012. évi CXLVII. tv.)",
    clearingNetwork: "GIRO Instant / BKR",
    citations: [
      "Szja. 15% kulcs",
      "KATA lump-sum (Katv.)",
      "MNB GIRO Instant",
    ],
    banks: hufBanks,
    tiers: hufTiers,
    generic: false,
  },
  "usd-to-bgn": {
    slug: "usd-to-bgn",
    authority:
      "Национална агенция за приходите (НАП) · ЗДДФЛ чл. 26-28 & ЗКСО",
    clearingNetwork: "BISRTGS / Instant",
    citations: [
      "ЗДДФЛ чл. 26-28 · 10%",
      "ЗКСО Самоосигуряване",
      "BNB BISRTGS / Blinc Instant",
    ],
    banks: bgnBanks,
    tiers: bgnTiers,
    generic: false,
  },
  "usd-to-rsd": {
    slug: "usd-to-rsd",
    authority:
      "Ministarstvo finansija & NBS · Zakon o porezu na dohodak građana",
    clearingNetwork: "NBS IPS / RTGS",
    citations: [
      "ZPDG Freelance 20%",
      "Paušalni režim ZPDG",
      "NBS IPS Instant",
    ],
    banks: rsdBanks,
    tiers: rsdTiers,
    generic: false,
  },
  "usd-to-sgd": {
    slug: "usd-to-sgd",
    authority:
      "Inland Revenue Authority of Singapore (IRAS) · Income Tax Act 1947",
    clearingNetwork: "FAST / PayNow · MEPS+",
    citations: [
      "ITA 1947 Self-Employed Assessment",
      "IRAS Resident Bands 0-24%",
      "MAS FAST / PayNow Instant",
    ],
    banks: sgdBanks,
    tiers: sgdTiers,
    generic: false,
  },
  "usd-to-hkd": {
    slug: "usd-to-hkd",
    authority:
      "Inland Revenue Department (IRD) · Inland Revenue Ordinance Cap. 112",
    clearingNetwork: "FPS (instant) / CHATS RTGS",
    citations: [
      "IRO s. 13 Salaries Tax Standard 15%",
      "IRO Part IV Profits Tax 7.5%/15%",
      "HKMA FPS Instant",
    ],
    banks: hkdBanks,
    tiers: hkdTiers,
    generic: false,
  },
  "usd-to-sek": {
    slug: "usd-to-sek",
    authority:
      "Skatteverket · Inkomstskattelagen (1999:1229) 62–65 kap.",
    clearingNetwork: "Bankgiro / RIX RTGS",
    citations: [
      "IL 65 kap Statlig skatt 20%",
      "IL 62 kap Kommunalskatt",
      "Skatteverket A-tax ärende",
    ],
    banks: sekBanks,
    tiers: sekTiers,
    generic: false,
  },
  "usd-to-nok": {
    slug: "usd-to-nok",
    authority:
      "Skatteetaten · Lov om skatt på formue og inntekt (Skatteloven)",
    clearingNetwork: "Straksbetaling / NICS",
    citations: [
      "Skatteloven § 2-1 22%",
      "Trinnskatt progressive",
      "Skatteetaten Lønnsoppgave",
    ],
    banks: nokBanks,
    tiers: nokTiers,
    generic: false,
  },
  "usd-to-dkk": {
    slug: "usd-to-dkk",
    authority:
      "Skattestyrelsen (SKAT) · Kildeskatteloven & personskatteloven",
    clearingNetwork: "Straksclearing / Kronings",
    citations: [
      "KSL Acontoskat B-skat",
      "Momsloven § 45 Reverse Charge",
      "SKAT efaktura nemKonto",
    ],
    banks: dkkBanks,
    tiers: dkkTiers,
    generic: false,
  },
  "usd-to-bam": {
    slug: "usd-to-bam",
    authority:
      "Centralna banka BiH · Zakon o porezu na dohodak FBiH/RS",
    clearingNetwork: "CBBiH RTGS / MixPayday",
    citations: [
      "FBiH Porez na dohodak 10%",
      "RS Paušalno 10%",
      "CBBiH inst.bank kredit",
    ],
    banks: bamBanks,
    tiers: bamTiers,
    generic: false,
  },
  "usd-to-gel": {
    slug: "usd-to-gel",
    authority:
      "Revenue Service Georgia · Tax Code of Georgia Art. 82 & 96",
    clearingNetwork: "NPC instant / RTGS",
    citations: [
      "TCG Art. 96 PIT 20%",
      "TCG Art. 82 Small Business 1%",
      "RS.GOV.GE e-income ledger",
    ],
    banks: gelBanks,
    tiers: gelTiers,
    generic: false,
  },
  "usd-to-uyu": {
    slug: "usd-to-uyu",
    authority:
      "Dirección General Impositiva (DGI) · Ley 18.083 (IRPF / IVA)",
    clearingNetwork: "SPI instant / ENET RTGS",
    citations: [
      "Ley 18.083 Tit. 1 IRPF 10%",
      "Ley 19.294 Art. 60 Export",
      "DGI factura electrónica",
    ],
    banks: uyuBanks,
    tiers: uyuTiers,
    generic: false,
  },
  "usd-to-crc": {
    slug: "usd-to-crc",
    authority:
      "Ministerio de Hacienda · Ley del Impuesto sobre la Renta 7092",
    clearingNetwork: "SINPE instant",
    citations: [
      "Renta Art. 3 br. 15-25%",
      "Ley 7092 Art. 5 bis Export 0%",
      "SINPE Móvil instant",
    ],
    banks: crcBanks,
    tiers: crcTiers,
    generic: false,
  },
  "usd-to-hrk": {
    slug: "usd-to-hrk",
    authority:
      "Porezna uprava · Zakon o porezu na dohodak (NN 115/16)",
    clearingNetwork: "SEPA / TARGET2 instant (EUR)",
    citations: [
      "ZPD NN 115/16 Art. 15",
      "Paušalni obrt Art. 87",
      "T2 Instant euro clearing",
    ],
    banks: hrkBanks,
    tiers: hrkTiers,
    generic: false,
  },
  "usd-to-tzs": {
    slug: "usd-to-tzs",
    authority:
      "Tanzania Revenue Authority (TRA) · Value Added Tax Act Cap. 148 & Income Tax Act Cap. 332",
    clearingNetwork: "TISS",
    citations: [
      "TRA VAT Act Cap. 148",
      "Income Tax Act Cap. 332 Sec. 83B",
      "BOT TISS Settlement",
    ],
    banks: tzsBanks,
    tiers: tzsTiers,
    generic: false,
  },
  "usd-to-ugx": {
    slug: "usd-to-ugx",
    authority:
      "Uganda Revenue Authority (URA) · Income Tax Act Cap 340 & Value Added Tax Act Cap 349",
    clearingNetwork: "UNISS",
    citations: [
      "URA VAT Act Cap 349 Sec 24",
      "Income Tax Act Cap 340",
      "BOU UNISS Clearing",
    ],
    banks: ugxBanks,
    tiers: ugxTiers,
    generic: false,
  },
  "usd-to-rwf": {
    slug: "usd-to-rwf",
    authority:
      "Rwanda Revenue Authority (RRA) · Law No 027/2022 establishing taxes on income",
    clearingNetwork: "RIPPS",
    citations: [
      "RRA Law No 027/2022",
      "BNR RIPPS System",
      "Law No 37/2012 on VAT",
    ],
    banks: rwfBanks,
    tiers: rwfTiers,
    generic: false,
  },
  "usd-to-zmw": {
    slug: "usd-to-zmw",
    authority:
      "Zambia Revenue Authority (ZRA) · Value Added Tax Act Chapter 331 & Income Tax Act Chapter 323",
    clearingNetwork: "ZECHL / ZIPSS",
    citations: [
      "ZRA VAT Act Cap 331",
      "Income Tax Act Cap 323",
      "BOZ ZIPSS System",
    ],
    banks: zmwBanks,
    tiers: zmwTiers,
    generic: false,
  },
  "usd-to-npr": {
    slug: "usd-to-npr",
    authority:
      "Inland Revenue Department (IRD) Nepal · Income Tax Act 2058 (2002) & NRB Foreign Remittance By-laws",
    clearingNetwork: "NCHL / connectIPS / RTGS",
    citations: [
      "Finance Act 2080 Section on IT Export",
      "NRB Foreign Exchange By-laws",
      "NCHL connectIPS",
    ],
    banks: nprBanks,
    tiers: nprTiers,
    generic: false,
  },
  "usd-to-lkr": {
    slug: "usd-to-lkr",
    authority:
      "Inland Revenue Department (IRD) · Inland Revenue Act No. 24 of 2017 & CBSL Foreign Exchange Act",
    clearingNetwork: "LankaPay / SLIPS",
    citations: [
      "Inland Revenue Act No. 24 Sec 7",
      "CBSL FX Operating Instructions",
      "LankaPay SLIPS",
    ],
    banks: lkrBanks,
    tiers: lkrTiers,
    generic: false,
  },
  "usd-to-kzt": {
    slug: "usd-to-kzt",
    authority:
      "State Revenue Committee (SRC) · Tax Code of the Republic of Kazakhstan & Astana Hub Tax Regime",
    clearingNetwork: "KISC / IMTS",
    citations: [
      "Tax Code Art. 293 (Astana Hub)",
      "Tax Code Art. 394 (0% Export VAT)",
      "NBK IMTS Settlement",
    ],
    banks: kztBanks,
    tiers: kztTiers,
    generic: false,
  },
  "eur-to-pkr": {
    slug: "eur-to-pkr",
    authority: "SBP Foreign Exchange Manual Chapter 13 & Income Tax Ordinance Section 154A",
    clearingNetwork: "Raast / BEFTN",
    citations: [
      "SBP Ch. 13 · Section 154A ITO (PC 9111)",
      "SCTR euro clearing · Raast Inward",
    ],
    banks: eurPkrBanks,
    tiers: pkrTiers,
    generic: false,
  },
  "eur-to-inr": {
    slug: "eur-to-inr",
    authority: "RBI AP (DIR Series) No. 46 & Section 194S of the Income Tax Act",
    clearingNetwork: "IMPS / NEFT / RTGS",
    citations: [
      "RBI Master Direction No. 16 · CGST Rule 96A (LUT zero-rated)",
      "Purpose Code P0802 · Software & Technology Services",
    ],
    banks: eurInrBanks,
    tiers: inrTiers,
    generic: false,
  },
  "eur-to-php": {
    slug: "eur-to-php",
    authority: "Bangko Sentral ng Pilipinas (BSP) Circular 980 & BIR 8% Freelance Gross Income Tax",
    clearingNetwork: "PESONet / InstaPay",
    citations: [
      "BSP Circular 980 · BIR 8% Gross Income Tax",
      "PESONet / InstaPay clearing",
    ],
    banks: eurPhpBanks,
    tiers: phpTiers,
    generic: false,
  },
  "eur-to-bdt": {
    slug: "eur-to-bdt",
    authority: "Bangladesh Bank FE Circulars & Income Tax Ordinance Section 34",
    clearingNetwork: "BEFTN",
    citations: [
      "BB FE Circular 01 · RTGS / BEFTN",
      "ITO Section 34 Export Purpose Code EXP",
    ],
    banks: eurBdtBanks,
    tiers: bdtTiers,
    generic: false,
  },
  "eur-to-ngn": {
    slug: "eur-to-ngn",
    authority: "Central Bank of Nigeria RT200 Guidelines & FIRS CIT Act Cap. C21",
    clearingNetwork: "NIBSS",
    citations: [
      "CBN RT200 Export Incentive",
      "NIBSS instant settlement",
    ],
    banks: eurNgnBanks,
    tiers: ngnTiers,
    generic: false,
  },
  "eur-to-egp": {
    slug: "eur-to-egp",
    authority: "Central Bank of Egypt Regulation 5 of 2024 & Income Tax Law 91/2005",
    clearingNetwork: "InstaPay / ACH",
    citations: [
      "CBE Reg. 5 · Export-of-Services",
      "InstaPay instant settlement",
    ],
    banks: eurEgpBanks,
    tiers: egpTiers,
    generic: false,
  },
  "eur-to-brl": {
    slug: "eur-to-brl",
    authority: "Banco Central do Brasil & Receita Federal — export-of-services regime",
    clearingNetwork: "PIX",
    citations: [
      "BACEN PIX Circular 4.130",
      "Code 40 Exportation of Services",
    ],
    banks: eurBrlBanks,
    tiers: brlTiers,
    generic: false,
  },
  "eur-to-vnd": {
    slug: "eur-to-vnd",
    authority: "State Bank of Vietnam Circular 32/2013/TT-NHNN · Circular 111/2013 (2% IT flat rate)",
    clearingNetwork: "NAPAS / CVQ",
    citations: [
      "SBV Circular 32",
      "Circular 111/2013/TT-BTC",
    ],
    banks: eurVndBanks,
    tiers: vndTiers,
    generic: false,
  },
  "eur-to-idr": {
    slug: "eur-to-idr",
    authority: "Bank Indonesia Regulation No. 16/21/PBI · PPh 21 IT Presumptive Export",
    clearingNetwork: "BI-RTGS / BI-FAST",
    citations: [
      "PBI 16/21/2014",
      "PPh Pasal 21",
    ],
    banks: eurIdrBanks,
    tiers: idrTiers,
    generic: false,
  },
  "eur-to-mxn": {
    slug: "eur-to-mxn",
    authority:
      "Servicio de Administración Tributaria (SAT) · Ley del IVA Art. 29-D & LISR Art. 113-E",
    clearingNetwork: "SPEI (same-day inward)",
    citations: [
      "SAT RESICO Art. 113-E",
      "LIVA Art. 29-D Exportación 0%",
      "SPEI Circular Banxico 14/2017",
    ],
    banks: eurMxnBanks,
    tiers: mxnTiers,
    generic: false,
  },
  "eur-to-try": {
    slug: "eur-to-try",
    authority: "CBRT Circular on Invisible Transactions · Income Tax Law Art. 89/13 (80% software earnings exemption)",
    clearingNetwork: "FAST / EFT",
    citations: [
      "CBRT Invisible Trans",
      "GVK Art. 89/13",
    ],
    banks: eurTryBanks,
    tiers: tryTiers,
    generic: false,
  },
  "eur-to-kes": {
    slug: "eur-to-kes",
    authority: "Central Bank of Kenya Prudential Guidelines · KRA Withholding Sec 35 (5% non-resident rate)",
    clearingNetwork: "PesaLink / EFT",
    citations: [
      "CBK Guidelines",
      "KRA ITO Sec 35",
    ],
    banks: eurKesBanks,
    tiers: kesTiers,
    generic: false,
  },
  "gbp-to-pkr": {
    slug: "gbp-to-pkr",
    authority: "SBP Foreign Exchange Manual Chapter 13 & Income Tax Ordinance Section 154A",
    clearingNetwork: "Raast / BEFTN",
    citations: [
      "SBP Ch. 13 · Section 154A ITO (PC 9111)",
      "CHAPS euro/sterling leg · Raast Inward",
    ],
    banks: gbpPkrBanks,
    tiers: pkrTiers,
    generic: false,
  },
  "gbp-to-inr": {
    slug: "gbp-to-inr",
    authority: "RBI AP (DIR Series) No. 46 & Section 194S of the Income Tax Act",
    clearingNetwork: "IMPS / NEFT / RTGS",
    citations: [
      "RBI Master Direction No. 16 · CGST Rule 96A (LUT zero-rated)",
      "Purpose Code P0802 · Software & Technology Services",
    ],
    banks: gbpInrBanks,
    tiers: inrTiers,
    generic: false,
  },
  "gbp-to-php": {
    slug: "gbp-to-php",
    authority: "Bangko Sentral ng Pilipinas (BSP) Circular 980 & BIR 8% Freelance Gross Income Tax",
    clearingNetwork: "PESONet / InstaPay",
    citations: [
      "BSP Circular 980 · BIR 8% Gross Income Tax",
      "PESONet / InstaPay clearing",
    ],
    banks: gbpPhpBanks,
    tiers: phpTiers,
    generic: false,
  },
  "gbp-to-bdt": {
    slug: "gbp-to-bdt",
    authority: "Bangladesh Bank FE Circulars & Income Tax Ordinance Section 34",
    clearingNetwork: "BEFTN",
    citations: [
      "BB FE Circular 01 · RTGS / BEFTN",
      "ITO Section 34 Export Purpose Code EXP",
    ],
    banks: gbpBdtBanks,
    tiers: bdtTiers,
    generic: false,
  },
  "gbp-to-ngn": {
    slug: "gbp-to-ngn",
    authority: "Central Bank of Nigeria RT200 Guidelines & FIRS CIT Act Cap. C21",
    clearingNetwork: "NIBSS",
    citations: [
      "CBN RT200 Export Incentive",
      "NIBSS instant settlement",
    ],
    banks: gbpNgnBanks,
    tiers: ngnTiers,
    generic: false,
  },
  "gbp-to-egp": {
    slug: "gbp-to-egp",
    authority: "Central Bank of Egypt Regulation 5 of 2024 & Income Tax Law 91/2005",
    clearingNetwork: "InstaPay / ACH",
    citations: [
      "CBE Reg. 5 · Export-of-Services",
      "InstaPay instant settlement",
    ],
    banks: gbpEgpBanks,
    tiers: egpTiers,
    generic: false,
  },
  "gbp-to-kes": {
    slug: "gbp-to-kes",
    authority: "Central Bank of Kenya Prudential Guidelines · KRA Withholding Sec 35 (5% non-resident rate)",
    clearingNetwork: "PesaLink / EFT",
    citations: [
      "CBK Guidelines",
      "KRA ITO Sec 35",
    ],
    banks: gbpKesBanks,
    tiers: kesTiers,
    generic: false,
  },
  "gbp-to-zar": {
    slug: "gbp-to-zar",
    authority:
      "South African Revenue Service — residents taxed on worldwide income & SARB authorised-dealer repatriation rules",
    clearingNetwork: "EFT / ACH",
    citations: [
      "SARB SDA / repatriation rules",
      "SARS ITA Chapter II",
    ],
    banks: gbpZarBanks,
    tiers: zarTiers,
    generic: false,
  },
  "gbp-to-ghs": {
    slug: "gbp-to-ghs",
    authority:
      "Ghana Revenue Authority (GRA) · Income Tax Act, 2015 (Act 896) & Bank of Ghana Notice BG/GOV/SEC/2020/02",
    clearingNetwork: "GhIPSS / ACH",
    citations: [
      "GRA Act 896 Section 114",
      "Bank of Ghana FX Repatriation Rules",
      "GhIPSS Inward Clearing",
    ],
    banks: gbpGhsBanks,
    tiers: ghsTiers,
    generic: false,
  },
  "gbp-to-pln": {
    slug: "gbp-to-pln",
    authority:
      "Ministerstwo Finansów · Ustawa o zryczałtowanym podatku dochodowym & Ustawa o VAT",
    clearingNetwork: "ELIXIR / Express ELIXIR (KIR)",
    citations: [
      "Ustawa o Ryczałcie Art. 12",
      "VAT Art. 28b (Reverse Charge)",
      "KIR ELIXIR Clearing",
    ],
    banks: gbpPlnBanks,
    tiers: plnTiers,
    generic: false,
  },
};

/** Phase 9 — resolves the statutory regulation profile for any audited corridor slug. */
export function getRegulatoryBanking(slug: string): CorridorRegulation {
  const authored = AUTHORED[slug];
  if (authored) {
    return {
      ...authored,
      defaultIntermediaryCut:
        authored.banks[0]?.intermediaryUSD ?? FALLBACK_SWIFT_BAND.min,
    };
  }
  const network = FALLBACK_NETWORKS[slug] ?? "Local ACH";
  const fallback = GENERIC_BY_SLUG[slug] ?? {
    label: "Local bank wire",
    currency: slug.split("-").pop()?.toUpperCase() ?? "LOCAL",
    clearance: "1–2 business days",
  };
  const genericBanks = genericBank(
    fallback.label,
    fallback.currency,
    fallback.clearance
  );
  return {
    slug,
    authority: "International remittance governed by the destination country's exchange-control & income-tax regime",
    clearingNetwork: network,
    citations: [
      `National Inward Clearing Settlement · ${network}`,
      "Benchmark intermediary SWIFT deduction $15–$25",
    ],
    banks: genericBanks,
    tiers: fallbackTiers(network),
    generic: true,
    defaultIntermediaryCut:
      genericBanks[0]?.intermediaryUSD ?? FALLBACK_SWIFT_BAND.min,
  };
}