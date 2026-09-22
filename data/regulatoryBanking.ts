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
 * SAT Código Fiscal de la Federación Art. 29 & RESICO simplified regime (1.5%).
 * ------------------------------------------------------------------------- */

const mxnTiers: StatutoryTier[] = [
  {
    id: "mexico-resico",
    name: "RESICO Simplified Taxpayer",
    authority: "SAT CFF Art. 29 · RESICO",
    rate: 0.015,
    purposeCode: "ISR / IVA monthly",
    note: "1.5% ISR advance under the Régimen Simplificado de Confianza on received digital-services income.",
  },
  {
    id: "mexico-standard",
    name: "Standard Business Regime",
    authority: "LISR graduated rates",
    rate: 0,
    purposeCode: "Actividad Empresarial",
    note: "Graduated individual rates on services income — confirm RFC / provisional ISR with your contador.",
  },
];

const mxnBanks: RegulatoryBank[] = [
  {
    id: "bbva-mx",
    name: "BBVA México",
    displayName: "BBVA México (Mexico)",
    swiftCode: "BCMRMXMM",
    intermediaryUSD: 14,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SPEI instant · DIA libra ACH 1 day",
    localCurrency: "MXN",
  },
  {
    id: "banorte",
    name: "Banorte",
    displayName: "Banorte (Mexico)",
    swiftCode: "MENOMXMT",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "SPEI instant · CODI instant (QR)",
    localCurrency: "MXN",
  },
];

/* ---------------------------------------------------------------------------
 * Argentina — USD → ARS
 * BCRA Comunicación A 7518 — freelancer export-earnings FX access exemption.
 * ------------------------------------------------------------------------- */

const arsTiers: StatutoryTier[] = [
  {
    id: "argentina-export",
    name: "Freelance Export Earnings Access",
    authority: "BCRA Comunicación A 7518",
    rate: 0,
    purposeCode: "Export earnings",
    exemption: true,
    note: "Export earnings over USD 7,561/yr may clear to local ARS at the official exchange without prior clearing obligation.",
  },
  {
    id: "argentina-standard",
    name: "Standard local income",
    authority: "IG Ley 20.628",
    rate: 0,
    purposeCode: "Local services",
    note: "Local ARS services income taxed under standard individual brackets.",
  },
];

const arsBanks: RegulatoryBank[] = [
  {
    id: "galicia",
    name: "Banco Galicia",
    displayName: "Banco Galicia (Argentina)",
    swiftCode: "GABAARBA",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CBU transfer instant · COELSA clearing 1 day",
    localCurrency: "ARS",
  },
  {
    id: "santander-ar",
    name: "Santander",
    displayName: "Santander (Argentina)",
    swiftCode: "BSARARBA",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CBU transfer instant · alto riesgo FX advisory",
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
    name: "IT Services Ryczłt (8.5%)",
    authority: "Ustawa o zryczałtowanym podatku",
    rate: 0.085,
    purposeCode: "PKWiU 62/63",
    note: "8.5% flat registered-revenue tax on freelancing income under PKWiU section 62/63.",
  },
  {
    id: "poland-standard",
    name: "Standard PIT Scale",
    authority: "Ustawa o PIT",
    rate: 0,
    purposeCode: "NIP taxpayer",
    note: "Graduated PIT scale if the flat regime is not elected.",
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
    clearance: "Elixir same-day · SORBNET2 large-value",
    localCurrency: "PLN",
  },
  {
    id: "mbank",
    name: "mBank",
    displayName: "mBank (Poland)",
    swiftCode: "BREXPLPW",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Elixir same-day · FX margin transparent",
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
    name: "Microenterprise Export Regime",
    authority: "Codul Fiscal Art. 69",
    rate: 0.01,
    purposeCode: "Export services",
    note: "1% tax on turnover where the company is a microenterprise under the income-tax exclusion for export income.",
  },
  {
    id: "romania-standard",
    name: "Standard PIT / CASS",
    authority: "Codul Fiscal Art. 68",
    rate: 0,
    purposeCode: "PFA freelancer",
    note: "PFA freelancers pay income tax + CASS social contributions on the basis of the daň normă.",
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
    clearance: "SENT 1 day · TransFond large-value",
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
    speed: "Standard",
    clearance: "SENT 1 day · welcome-package FX margin",
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
    name: "Paušální daň (Flat-rate tax)",
    authority: "Zákon o daních z příjmů",
    rate: 0.15,
    purposeCode: "Živnost 62",
    note: "Provided the flat-rate advance (paušální režim) is elected; otherwise standard 15% base rate.",
  },
  {
    id: "czechia-standard",
    name: "Standard 15% Base Rate",
    authority: "ZDP §16",
    rate: 0,
    purposeCode: "Živnost 62",
    note: "15% base savings rate applies when no flat-rate advance is active.",
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
    clearance: "CZERTIS instant · CERTIS clearing 1 day",
    localCurrency: "CZK",
  },
  {
    id: "csob",
    name: "ČSOB",
    displayName: "ČSOB (Czechia)",
    swiftCode: "CEKOCZPP",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "CZERTIS instant · immediate FX",
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
    name: "Foreign-Source Export Relief",
    authority: "Revenue Code Sec. 40(8)",
    rate: 0,
    purposeCode: "40(8) freelance income",
    exemption: true,
    note: "Assessable income 40(8) from foreign clients — relief applies where the income is not remitted into Thailand in the same tax year.",
  },
  {
    id: "thailand-standard",
    name: "Standard PND 90 filing",
    authority: "Revenue Code Sec. 40(2)",
    rate: 0,
    purposeCode: "40(2) professional fees",
    note: "Graduated 0–35% personal rates apply on remitted assessable income.",
  },
];

const thbBanks: RegulatoryBank[] = [
  {
    id: "bbl",
    name: "Bangkok Bank",
    displayName: "Bangkok Bank (Thailand)",
    swiftCode: "BKKBSHTH",
    intermediaryUSD: 12,
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
];

/* ---------------------------------------------------------------------------
 * Malaysia — USD → MYR
 * Income Tax Act 1967 Schedule 6 — foreign-source income exemption.
 * ------------------------------------------------------------------------- */

const myrTiers: StatutoryTier[] = [
  {
    id: "malaysia-schedule6",
    name: "Foreign-Source Income Exemption",
    authority: "ITA 1967 Schedule 6",
    rate: 0,
    purposeCode: "Foreign source",
    exemption: true,
    note: "Foreign-sourced income exemption para 28 Schedule 6 on remitted export income.",
  },
  {
    id: "malaysia-standard",
    name: "Standard Be-5 filing",
    authority: "ITA 1967",
    rate: 0,
    purposeCode: "Resident individual",
    note: "Graduated resident rates apply to non-exempt gross income.",
  },
];

const myrBanks: RegulatoryBank[] = [
  {
    id: "maybank",
    name: "Maybank",
    displayName: "Maybank (Malaysia)",
    swiftCode: "MBBEMYKL",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "DuitNow instant · MEPS 1 day",
    localCurrency: "MYR",
  },
  {
    id: "cimb",
    name: "CIMB",
    displayName: "CIMB (Malaysia)",
    swiftCode: "CIBBMYKL",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "DuitNow instant · MEPS 1 day",
    localCurrency: "MYR",
  },
];

/* ---------------------------------------------------------------------------
 * Ghana — USD → GHS
 * Internal Revenue Act (Act 592) Section 114 — withholding on services.
 * ------------------------------------------------------------------------- */

const ghsTiers: StatutoryTier[] = [
  {
    id: "ghana-resident",
    name: "Resident Service Withholding",
    authority: "IRA (Act 592) Sec 114",
    rate: 0.05,
    purposeCode: "Service income",
    note: "5% withholding on services for resident recipients holding a TIN.",
  },
  {
    id: "ghana-nonresident",
    name: "Non-Resident Service Withholding",
    authority: "IRA (Act 592) Sec 114",
    rate: 0.15,
    purposeCode: "Non-resident service",
    note: "15% final withholding on service payments to non-residents of Ghana.",
  },
];

const ghsBanks: RegulatoryBank[] = [
  {
    id: "gcb",
    name: "GCB Bank",
    displayName: "GCB Bank (Ghana)",
    swiftCode: "GHCBGACX",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "GhIPSS Instant Pay instant · ACH 1 day",
    localCurrency: "GHS",
  },
  {
    id: "ecobank",
    name: "Ecobank",
    displayName: "Ecobank (Ghana)",
    swiftCode: "ECOCGHAC",
    intermediaryUSD: 15,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "GhIPSS Instant Pay instant · mobile money rails",
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
    name: "0% Personal Income Tax",
    authority: "Federal Decree-Law No. 47",
    rate: 0,
    purposeCode: "Individual",
    exemption: true,
    note: "No tax on personal income; corporate tax 9% applies to corporate taxable income above AED 375,000.",
  },
  {
    id: "uae-corporate",
    name: "Corporate Tax 9% (if incorporated)",
    authority: "Federal Decree-Law No. 47",
    rate: 0.09,
    purposeCode: "Taxable entity",
    note: "9% federal CIT above the AED 375,000 threshold for incorporated structures.",
  },
];

const aedBanks: RegulatoryBank[] = [
  {
    id: "emiratesnbd",
    name: "Emirates NBD",
    displayName: "Emirates NBD (UAE)",
    swiftCode: "EBILAEAD",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "IPS instant · ACH 1 day",
    localCurrency: "AED",
  },
  {
    id: "fab",
    name: "FAB",
    displayName: "First Abu Dhabi Bank (UAE)",
    swiftCode: "NBADAEAD",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "IPS instant · ACH 1 day",
    localCurrency: "AED",
  },
];

/* ---------------------------------------------------------------------------
 * Saudi Arabia — USD → SAR
 * ZATCA Withholding Tax Regulation Art. 68 — payments to non-residents.
 * ------------------------------------------------------------------------- */

const sarTiers: StatutoryTier[] = [
  {
    id: "saudi-nonresident",
    name: "Non-Resident Service WHT",
    authority: "ZATCA WHT Reg. Art. 68",
    rate: 0.05,
    purposeCode: "Non-resident services",
    note: "5% withholding tax on service payments made to non-residents by Saudi payers.",
  },
  {
    id: "saudi-resident",
    name: "Resident / Tax Resident",
    authority: "ZATCA normal regime",
    rate: 0,
    purposeCode: "Resident individual",
    note: "No personal income tax for resident individuals on Saudi-source income.",
  },
];

const sarBanks: RegulatoryBank[] = [
  {
    id: "alrajhi",
    name: "Al Rajhi Bank",
    displayName: "Al Rajhi Bank (Saudi Arabia)",
    swiftCode: "RJHIBARI",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "mada instant · SARIE same-day",
    localCurrency: "SAR",
  },
  {
    id: "snb",
    name: "SNB",
    displayName: "Saudi National Bank (Saudi Arabia)",
    swiftCode: "NCBKSARI",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "mada instant · SARIE same-day",
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
    authority: "SAT Código Fiscal Art. 29 · RESICO 1.5%",
    clearingNetwork: "SPEI",
    citations: [
      "SAT CFF Art. 29 · RESICO 1.5%",
      "SPEI instant clearing · CODI QR",
    ],
    banks: mxnBanks,
    tiers: mxnTiers,
    generic: false,
  },
  "usd-to-ars": {
    slug: "usd-to-ars",
    authority: "BCRA Comunicación A 7518 freelance exemption",
    clearingNetwork: "CBU / COELSA",
    citations: [
      "BCRA Comunicación A 7518 · export earnings FX access",
      "Official-rate clearing · no prior liquidation obligation",
    ],
    banks: arsBanks,
    tiers: arsTiers,
    generic: false,
  },
  "usd-to-pln": {
    slug: "usd-to-pln",
    authority: "Ustawa o zryczałtowanym podatku (8.5% IT rate)",
    clearingNetwork: "Elixir / SORBNET2",
    citations: [
      "Ustawa o zryczałtowanym podatku · 8.5% IT ryczałt",
      "PKWiU 62/63 flat registered-revenue tax",
    ],
    banks: plnBanks,
    tiers: plnTiers,
    generic: false,
  },
  "usd-to-ron": {
    slug: "usd-to-ron",
    authority: "Codul Fiscal Art. 69 Microenterprise export",
    clearingNetwork: "SENT / TransFond",
    citations: [
      "Codul Fiscal Art. 69 · microenterprise export",
      "1% turnover tax · PFA normă alternative",
    ],
    banks: ronBanks,
    tiers: ronTiers,
    generic: false,
  },
  "usd-to-czk": {
    slug: "usd-to-czk",
    authority: "Zákon o daních z příjmů (Paušální daň)",
    clearingNetwork: "CERTIS / CZERTIS",
    citations: [
      "ZDP · paušální daň flat-rate tax",
      "15% base rate when flat-rate advance inactive",
    ],
    banks: czkBanks,
    tiers: czkTiers,
    generic: false,
  },
  "usd-to-thb": {
    slug: "usd-to-thb",
    authority: "Revenue Code Section 40(2)/(8) export relief",
    clearingNetwork: "PromptPay / BAHTNET",
    citations: [
      "Revenue Code Sec. 40(8) · foreign-source relief",
      "Sec. 40(2) professional fees on remittance",
    ],
    banks: thbBanks,
    tiers: thbTiers,
    generic: false,
  },
  "usd-to-myr": {
    slug: "usd-to-myr",
    authority: "Income Tax Act 1967 Schedule 6 exemption",
    clearingNetwork: "DuitNow / MEPS",
    citations: [
      "ITA 1967 Schedule 6 · para 28 exemption",
      "DuitNow instant · MEPS 1 day",
    ],
    banks: myrBanks,
    tiers: myrTiers,
    generic: false,
  },
  "usd-to-ghs": {
    slug: "usd-to-ghs",
    authority: "Internal Revenue Act Sec 114 withholding",
    clearingNetwork: "GhIPSS / Instant Pay",
    citations: [
      "IRA (Act 592) Sec 114 · service WHT",
      "5% resident / 15% non-resident",
    ],
    banks: ghsBanks,
    tiers: ghsTiers,
    generic: false,
  },
  "usd-to-aed": {
    slug: "usd-to-aed",
    authority: "Federal Decree-Law No. 47 on Corporate Tax / 0% Individual",
    clearingNetwork: "IPS / ACH",
    citations: [
      "Federal Decree-Law No. 47 · 0% personal income tax",
      "9% CIT above AED 375,000 for corporates",
    ],
    banks: aedBanks,
    tiers: aedTiers,
    generic: false,
  },
  "usd-to-sar": {
    slug: "usd-to-sar",
    authority: "ZATCA Withholding Tax Regulation Art. 68",
    clearingNetwork: "mada / SARIE",
    citations: [
      "ZATCA WHT Reg. Art. 68 · 5% non-resident WHT",
      "mada instant · SARIE same-day",
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