/**
 * PayoutDelta — Statutory Laws & Local Bank Clearing database (Phase 9).
 *
 * Static, build-time regulatory data feeding the `TransactionCostingWidget`.
 * Each corridor carries the governing statutory authority, the real domestic
 * banks a freelancer actually receives funds through (with benchmark SWIFT
 * intermediary cuts and local clearing rails), and the statutory withholding /
 * exemption tiers used to compute the "real bank take-home".
 *
 * The eighteen fully-audited corridors (PKR, INR, PHP, VND, KES, IDR, COP,
 * TRY, MXN, ARS, PLN, RON, CZK, THB, MYR, GHS, AED, SAR) reference the
 * underlying legislation by section; every remaining corridor falls back to
 * accurate standard intermediary bands ($15–$25) plus its national clearing
 * network identifier so the engine never renders empty on any audited route.
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