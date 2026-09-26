/**
 * PayoutDelta — Statutory Laws & Local Bank Clearing database (Phase 9).
 *
 * Static, build-time regulatory data feeding the `TransactionCostingWidget`.
 * Each corridor carries the governing statutory authority, the real domestic
 * banks a freelancer actually receives funds through (with benchmark SWIFT
 * intermediary cuts and local clearing rails), and the statutory withholding /
 * exemption tiers used to compute the "real bank take-home".
 *
 * The ninety-six authored corridor entries (seventy-four USD corridors plus the
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

/**
 * A destination's domestic settlement rail, as published by its own central
 * bank / system operator. This is the leg the correspondent MT103 hands off to
 * once it leaves the SWIFT network — the reason a corridor's intermediary cut
 * and its local realization time differ so much.
 */
export interface RailSeed {
  /** Named rail, e.g. "Raast", "IMPS / NEFT / RTGS", "InstaPay / PESONet". */
  rail: string;
  /** System operator or central bank, e.g. "State Bank of Pakistan". */
  operator: string;
  /** True when the rail credits in (near) real time. */
  instant: boolean;
  /** Published realization window, e.g. "T+0 (seconds)" or "T+1 (business day)". */
  window: string;
  /**
   * Settlement finality class:
   *   - `IRG` — irrevocable, gross, real-time settlement (RTGS / IPS style).
   *     Funds are final at the instant they are booked.
   *   - `RTH` — retail deferred settlement (ACH / net-clearing style). Legs are
   *     netted and become final only at the end of the clearing window.
   */
  finality: "IRG" | "RTH";
}

/** SWIFT field 71A (Details of Charges) guidance for one corridor. */
export interface Field71ABand {
  /** Charge code to request in field 71A. */
  code: "SHA" | "OUR" | "BEN";
  /** Plain-English instruction for the sender. */
  instruction: string;
  /** Lowest published intermediary cut for the primary bank (USD). */
  minUSD: number;
  /** Highest published intermediary cut for the primary bank (USD). */
  maxUSD: number;
  /** Published point estimate for the primary bank (USD). */
  typicalUSD: number;
}

/** One audited receiving bank and the SHA band it publishes. */
export interface TransitCut {
  /** 1-based hop order as listed in `banks[]`. */
  hop: number;
  bank: string;
  swiftCode: string;
  minUSD: number;
  maxUSD: number;
  typicalUSD: number;
}

/**
 * Phase 2 — domestic settlement rail per payout currency.
 *
 * One entry for every destination currency in `data/fees.json` (105 audited
 * currencies across the 131 corridors), so `railFor()` can never fall through to
 * `DEFAULT_RAIL` on a real route. Each row names the rail the destination's own
 * central bank or system operator runs — Raast for PKR, IMPS / NEFT / RTGS for
 * INR, InstaPay / PESONet for PHP, Pix for BRL, SEPA for EUR, Fedwire / CHIPS
 * for USD — plus its operator, whether it credits in real time, the published
 * realization window and its settlement finality class.
 *
 * `window` is the published clearing/realization window, not a PayoutDelta SLA.
 */
export const RAILS_BY_CURRENCY: Record<string, RailSeed> = {
  AED: { rail: "UAEFTS / IPI", operator: "Central Bank of the UAE", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  ALL: { rail: "AIPS", operator: "Bank of Albania", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  AMD: { rail: "RTGS", operator: "Central Bank of Armenia", instant: false, window: "T+1 (business day)", finality: "IRG" },
  AOA: { rail: "BNA RTGS", operator: "Banco Nacional de Angola", instant: false, window: "T+1 (business day)", finality: "IRG" },
  ARS: { rail: "Pagos en Línea / LCU clearing", operator: "Banco Central de la República Argentina", instant: false, window: "T+1 (business day)", finality: "RTH" },
  AZN: { rail: "AZ-IPS", operator: "State Bank of the Republic of Azerbaijan", instant: false, window: "T+1 (business day)", finality: "IRG" },
  BAM: { rail: "CBBIH RTGS", operator: "Central Bank of Bosnia and Herzegovina", instant: false, window: "T+1 (business day)", finality: "IRG" },
  BBD: { rail: "BACS", operator: "Central Bank of Barbados", instant: false, window: "T+2 (business days)", finality: "RTH" },
  BDT: { rail: "BEFTN", operator: "Bangladesh Bank", instant: false, window: "T+1 (business day)", finality: "RTH" },
  BGN: { rail: "BIS", operator: "Bulgarian National Bank", instant: false, window: "T+0 (same day)", finality: "IRG" },
  BHD: { rail: "BIPS", operator: "Central Bank of Bahrain", instant: false, window: "T+1 (business day)", finality: "IRG" },
  BND: { rail: "BECS-CBN", operator: "Borneo Clearing House Network", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  BOB: { rail: "BACS", operator: "Banco Central de Bolivia", instant: false, window: "T+1 (business day)", finality: "RTH" },
  BRL: { rail: "Pix", operator: "Banco Central do Brasil", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  BSD: { rail: "ACH clearing", operator: "Central Bank of The Bahamas", instant: false, window: "T+1 (business day)", finality: "RTH" },
  BTN: { rail: "BICHC", operator: "Bhutan Interbank Clearing House", instant: false, window: "T+2 (business days)", finality: "RTH" },
  BWP: { rail: "BACS", operator: "Bank of Botswana", instant: false, window: "T+1 (business day)", finality: "RTH" },
  BZD: { rail: "ACH / RAPS", operator: "Central Bank of Belize", instant: false, window: "T+1 (business day)", finality: "IRG" },
  CLP: { rail: "ACH", operator: "Banco Central de Chile", instant: false, window: "T+1 (business day)", finality: "RTH" },
  COP: { rail: "ACH SEBRA", operator: "Superintendencia Financiera de Colombia", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  CRC: { rail: "SINVI", operator: "Banco Central de Costa Rica", instant: false, window: "T+1 (business day)", finality: "IRG" },
  CZK: { rail: "CNB settlement system", operator: "Czech National Bank", instant: false, window: "T+1 (business day)", finality: "IRG" },
  DKK: { rail: "Kroner (RTGS)", operator: "Danmarks Nationalbank", instant: false, window: "T+1 (business day)", finality: "IRG" },
  DOP: { rail: "ACH Dominicano", operator: "Banco Central de la República Dominicana", instant: false, window: "T+1 (business day)", finality: "RTH" },
  DZD: { rail: "SATIM", operator: "Banque d'Algérie", instant: false, window: "T+1 (business day)", finality: "IRG" },
  EGP: { rail: "InstaPay / CBE", operator: "Central Bank of Egypt", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  ETB: { rail: "RTGS", operator: "National Bank of Ethiopia", instant: false, window: "T+1 (business day)", finality: "IRG" },
  EUR: { rail: "T2 / SEPA Instant", operator: "European Central Bank · EPC", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  FJD: { rail: "RITS", operator: "Reserve Bank of Fiji", instant: false, window: "T+1 (business day)", finality: "IRG" },
  GBP: { rail: "CHAPS / FPS", operator: "Bank of England · Pay.UK", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  GEL: { rail: "TBC", operator: "National Bank of Georgia", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  GHS: { rail: "GhIPSS Instant Pay", operator: "Bank of Ghana · GhIPSS", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  GTQ: { rail: "STP", operator: "Sistema de Información Bancaria de Guatemala", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  GYD: { rail: "ACH", operator: "Bank of Guyana", instant: false, window: "T+1 (business day)", finality: "RTH" },
  HKD: { rail: "HKDATS", operator: "Hong Kong Interbank Clearing Limited", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  HNL: { rail: "ACH", operator: "Banco Central de Honduras", instant: false, window: "T+1 (business day)", finality: "RTH" },
  HUF: { rail: "HKN instant / BKR", operator: "Magyar Nemzeti Bank", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  IDR: { rail: "BI-FAST / BI-RTGS", operator: "Bank Indonesia", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  INR: { rail: "IMPS / NEFT / RTGS", operator: "Reserve Bank of India", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  IQD: { rail: "RTGS", operator: "Central Bank of Iraq", instant: false, window: "T+1 (business day)", finality: "IRG" },
  ISK: { rail: "Icelandic Clearing House", operator: "Central Bank of Iceland", instant: false, window: "T+1 (business day)", finality: "RTH" },
  JMD: { rail: "ACH", operator: "Bank of Jamaica", instant: false, window: "T+1 (business day)", finality: "RTH" },
  JOD: { rail: "JoCC / BITS", operator: "Jordanian Clearing Company", instant: false, window: "T+1 (business day)", finality: "IRG" },
  KES: { rail: "PesaLink / RTGS", operator: "Central Bank of Kenya", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  KGS: { rail: "ELEST", operator: "National Bank of the Kyrgyz Republic", instant: false, window: "T+1 (business day)", finality: "IRG" },
  KHR: { rail: "BACS", operator: "National Bank of Cambodia", instant: false, window: "T+1 (business day)", finality: "RTH" },
  KWD: { rail: "NBK RTGS", operator: "Central Bank of Kuwait", instant: false, window: "T+1 (business day)", finality: "IRG" },
  KZT: { rail: "KISS", operator: "National Bank of the Republic of Kazakhstan", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  LAK: { rail: "RTGS", operator: "Bank of the Lao PDR", instant: false, window: "T+1 (business day)", finality: "IRG" },
  LBP: { rail: "RTGS / interbank clearing", operator: "Banque du Liban", instant: false, window: "T+1 (business day)", finality: "IRG" },
  LKR: { rail: "SIPS", operator: "Central Bank of Sri Lanka", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  LSL: { rail: "Clearing House Lesotho", operator: "Central Bank of Lesotho", instant: false, window: "T+1 (business day)", finality: "RTH" },
  MAD: { rail: "CMI", operator: "Bank Al-Maghrib", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  MDL: { rail: "BNM settlement", operator: "National Bank of Moldova", instant: false, window: "T+1 (business day)", finality: "IRG" },
  MGA: { rail: "BAM RTGS", operator: "Banque Centrale de Madagascar", instant: false, window: "T+1 (business day)", finality: "IRG" },
  MKD: { rail: "MIPS", operator: "National Bank of the Republic of North Macedonia", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  MNT: { rail: "Interbank clearing", operator: "Bank of Mongolia", instant: false, window: "T+1 (business day)", finality: "IRG" },
  MUR: { rail: "Clearing House", operator: "Bank of Mauritius", instant: false, window: "T+1 (business day)", finality: "RTH" },
  MVR: { rail: "Domestic Banking Network", operator: "Monetary Authority of the Maldives", instant: false, window: "T+1 (business day)", finality: "IRG" },
  MWK: { rail: "RTGS", operator: "Reserve Bank of Malawi", instant: false, window: "T+1 (business day)", finality: "IRG" },
  MXN: { rail: "SPEI / CODI", operator: "Banco de México", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  MYR: { rail: "DuitNow / PayNet", operator: "Bank Negara Malaysia", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  MZN: { rail: "BMO RTGS", operator: "Banco de Moçambique", instant: false, window: "T+1 (business day)", finality: "IRG" },
  NAD: { rail: "NAMRTGS", operator: "Bank of Namibia", instant: false, window: "T+1 (business day)", finality: "IRG" },
  NGN: { rail: "NIBSS Instant Payment", operator: "NIBSS · Central Bank of Nigeria", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  NIO: { rail: "Interbank clearing", operator: "Banco Central de Nicaragua", instant: false, window: "T+1 (business day)", finality: "RTH" },
  NOK: { rail: "RTGS", operator: "Norges Bank", instant: false, window: "T+1 (business day)", finality: "IRG" },
  NPR: { rail: "NRTSS", operator: "Nepal Rastra Bank", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  OMR: { rail: "Interbank RTGS", operator: "Central Bank of Oman", instant: false, window: "T+1 (business day)", finality: "IRG" },
  PAB: { rail: "ACH / transferencia interbancaria", operator: "Banco Nacional de Panamá", instant: false, window: "T+1 (business day)", finality: "IRG" },
  PEN: { rail: "Sistema de Transferencias DEPE", operator: "BCRP · sistema interbancario", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  PGK: { rail: "RTGS", operator: "Bank of Papua New Guinea", instant: false, window: "T+1 (business day)", finality: "IRG" },
  PHP: { rail: "InstaPay / PESONet / PhilPaSS", operator: "Bangko Sentral ng Pilipinas", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  PKR: { rail: "Raast", operator: "State Bank of Pakistan", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  PLN: { rail: "Express ELIXIR", operator: "Narodowy Bank Polski · KIR", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  PYG: { rail: "BACP", operator: "Banco Central del Paraguay", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  QAR: { rail: "NPS (national payments)", operator: "Qatar National Bank · QCHP", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  RON: { rail: "RoTGS", operator: "Banca Națională a României", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  RSD: { rail: "IPS / NBS", operator: "National Bank of Serbia", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  RWF: { rail: "RTGS", operator: "National Bank of Rwanda", instant: false, window: "T+1 (business day)", finality: "IRG" },
  SAR: { rail: "SARN", operator: "Saudi Central Bank · SAMA", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  SBD: { rail: "SICH", operator: "Solomon Islands Clearing House", instant: false, window: "T+1 (business day)", finality: "RTH" },
  SEK: { rail: "RIX", operator: "Sveriges Riksbank", instant: false, window: "T+1 (business day)", finality: "IRG" },
  SGD: { rail: "FAST / PayNow", operator: "Monetary Authority of Singapore", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  SRD: { rail: "Surclear", operator: "Centrale Bank van Suriname", instant: false, window: "T+1 (business day)", finality: "RTH" },
  SZL: { rail: "Clearing House / SADC-RTGS", operator: "Central Bank of Eswatini", instant: false, window: "T+1 (business day)", finality: "IRG" },
  THB: { rail: "PromptPay / BAHTNET", operator: "Bank of Thailand", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  TJS: { rail: "RTGS / BRT", operator: "National Bank of Tajikistan", instant: false, window: "T+1 (business day)", finality: "IRG" },
  TND: { rail: "BCT RTGS", operator: "Banque Centrale de Tunisie", instant: false, window: "T+1 (business day)", finality: "IRG" },
  TOP: { rail: "RTGS", operator: "National Reserve Bank of Tonga", instant: false, window: "T+1 (business day)", finality: "IRG" },
  TRY: { rail: "EFT / ZIB", operator: "CBRT · Takasbank", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  TTD: { rail: "Interbank settlement", operator: "Central Bank of Trinidad and Tobago", instant: false, window: "T+1 (business day)", finality: "IRG" },
  TZS: { rail: "TIPS", operator: "Bank of Tanzania", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  UAH: { rail: "SEP", operator: "National Bank of Ukraine", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  UGX: { rail: "RTGS", operator: "Bank of Uganda", instant: false, window: "T+1 (business day)", finality: "IRG" },
  USD: { rail: "Fedwire / CHIPS", operator: "Federal Reserve Banks · The Clearing House", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  UYU: { rail: "SIDE", operator: "Banco Central del Uruguay", instant: false, window: "T+1 (business day)", finality: "IRG" },
  UZS: { rail: "NCHRT", operator: "Central Bank of the Republic of Uzbekistan", instant: false, window: "T+1 (business day)", finality: "IRG" },
  VND: { rail: "NAPAS", operator: "State Bank of Vietnam", instant: true, window: "T+0 (seconds)", finality: "IRG" },
  VUV: { rail: "VANWETS", operator: "Reserve Bank of Vanuatu", instant: false, window: "T+1 (business day)", finality: "IRG" },
  WST: { rail: "EFT / CHS", operator: "Central Bank of Samoa", instant: false, window: "T+2 (business days)", finality: "RTH" },
  XAF: { rail: "BEAC RTGS", operator: "Banque des États de l'Afrique Centrale", instant: false, window: "T+1 (business day)", finality: "IRG" },
  XOF: { rail: "BCEAO RTGS", operator: "Banque Centrale des États de l'Afrique de l'Ouest", instant: false, window: "T+1 (business day)", finality: "IRG" },
  ZAR: { rail: "NRTGS", operator: "South African Reserve Bank", instant: false, window: "T+1 (business day)", finality: "IRG" },
  ZMW: { rail: "RTGS", operator: "Bank of Zambia", instant: false, window: "T+1 (business day)", finality: "IRG" },
};

/**
 * Last-resort rail for a currency with no authored row. `data/fees.json` is
 * fully covered by `RAILS_BY_CURRENCY`, so this only guards a future currency
 * added to the dataset before its rail row is authored — and it is named
 * explicitly so an unaudited corridor is visible rather than silent.
 */
export const DEFAULT_RAIL: RailSeed = {
  rail: "Local interbank clearing (rail row pending)",
  operator: "Destination central bank",
  instant: false,
  window: "T+1–T+2 (business days)",
  finality: "RTH",
};

/** Standard notice attached wherever no verified treaty exemption is on file. */
export const REGULATORY_DISCLAIMER =
  "No bilateral tax-treaty exemption is on file for this corridor. Withholding, " +
  "turnover tax and VAT treatment are the destination's own published rates; the " +
  "figures shown are informational benchmarks compiled from the open regulatory " +
  "record and must be confirmed with the receiving bank, the destination revenue " +
  "authority or a local accountant before invoicing. Nothing here is legal, tax or " +
  "financial advice.";

/** Payout currency for a corridor slug, derived from its slug contract. */
export function destinationCurrency(slug: string): string {
  return slug.split("-").pop()?.toUpperCase() ?? "";
}

/** Resolves the destination's own settlement rail, never `undefined`. */
export function railFor(currency: string): RailSeed {
  return RAILS_BY_CURRENCY[currency.toUpperCase()] ?? DEFAULT_RAIL;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Phase 2 — projects the SWIFT field 71A (Details of Charges) guidance for a
 * corridor out of its own primary receiving bank's published SHA band, so the
 * 71A chip, the leakage index and the waterfall can never quote three different
 * numbers for the same wire.
 *
 * `SHA` is the modelled default across the dataset because it is what actually
 * dominates cross-border payout leakage: the sender pays its own institution's
 * fee and the beneficiary pays theirs, so a single MT103 quietly loses up to
 * twice the correspondent cut. `OUR` and `BEN` are retained in the type because
 * a bank that supports them must be able to say so — see `chargeCodeSupport` on
 * the bank dossiers in `data/banks.ts`.
 */
export function field71AFor(bank: RegulatoryBank | undefined): Field71ABand {
  const minUSD = bank?.intermediaryMinUSD ?? FALLBACK_SWIFT_BAND.min;
  const maxUSD = bank?.intermediaryMaxUSD ?? FALLBACK_SWIFT_BAND.max;
  const typicalUSD = bank?.intermediaryUSD ?? round2((minUSD + maxUSD) / 2);
  const label = bank?.name ?? "the receiving bank";
  return {
    code: "SHA",
    instruction:
      `Request 71A = SHA and reconcile against the published band for ${label}: ` +
      `$${minUSD}–$${maxUSD} per wire, ~$${typicalUSD} typical. Under SHA the ` +
      `ordering institution and the beneficiary institution are each charged ` +
      `their own fee, so one MT103 can deduct up to twice this band. Escalate ` +
      `anything above $${maxUSD} to the receiving bank before release.`,
    minUSD,
    maxUSD,
    typicalUSD,
  };
}

/**
 * Phase 2 — de-duplicates the statutory purpose codes a corridor's own tiers
 * declare, preserving tier order. Corridors whose regime declares no code (the
 * generic fallback rows) resolve to an empty list rather than an invented one.
 */
export function purposeCodesFrom(tiers: StatutoryTier[]): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const tier of tiers) {
    const code = tier.purposeCode?.trim();
    if (code && !seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}

/**
 * Phase 2 — projects the ordered transit-cut ladder for a corridor straight off
 * its `banks[]` array. Every row carries the audited bank's own published band,
 * so a hop can never be displayed with a figure that is not in the data.
 */
export function transitCutsFrom(banks: RegulatoryBank[]): TransitCut[] {
  return banks.map((bank, index) => ({
    hop: index + 1,
    bank: bank.name,
    swiftCode: bank.swiftCode,
    minUSD: bank.intermediaryMinUSD,
    maxUSD: bank.intermediaryMaxUSD,
    typicalUSD: bank.intermediaryUSD,
  }));
}

export interface CorridorRegulation {
  slug: string;
  /** Opening statutory authority reference (seductive shorthands kept). */
  authority: string;
  /** National clearing network identifier. */
  clearingNetwork: string;
  /**
   * Phase 2 — the destination's own settlement rail, resolved from
   * `RAILS_BY_CURRENCY` by the corridor's payout currency. Every authored
   * currency in `data/fees.json` has an entry, so no corridor ever renders an
   * empty rail chip.
   */
  localSettlementRail: RailSeed;
  /**
   * Phase 2 — SWIFT field 71A (Details of Charges) guidance for this corridor.
   * The band is projected from the corridor's own primary receiving bank
   * (`intermediaryMinUSD` / `intermediaryMaxUSD`), never from a global
   * constant, so the 71A chip and the leakage index cannot disagree.
   */
  field71A: Field71ABand;
  /**
   * Statutory purpose codes declared by the corridor's tiers, de-duplicated in
   * tier order. Corridors whose regime declares no code resolve to an empty
   * list rather than an invented one.
   */
  taxPurposeCodes: string[];
  /**
   * Ordered intermediary transit cuts a wire can traverse on this corridor —
   * one row per audited receiving bank, each carrying that bank's own
   * published SHA band. Never a synthetic figure: it is a projection of
   * `banks[]`.
   */
  intermediaryTransitCuts: TransitCut[];
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
  /**
   * Authorised retail FX spread (%). Euroized corridors (Montenegro,
   * Kosovo) convert USD→EUR at par with a 0.0% retail spread — matching the
   * provider fxSpread of 0 set in data/fees.json.
   */
  retailSpreadPercent?: number;
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
 * Global Expansion Wave 2 — Americas (USD → DOP, GTQ, PAB, USD, BOB, PYG,
 * JMD, TTD, HNL, BSD, BBD) statutory regimes + receiving-bank records.
 * ------------------------------------------------------------------------- */

const dopTiers: StatutoryTier[] = [
  {
    id: "dr-renta",
    name: "Renta Tercera Categoría (10–25%)",
    authority: "DGII · Ley 111 de Impuesto sobre la Renta (mod.)",
    rate: 0.1,
    purposeCode: "Servicios al exterior",
    note: "10% first band of the 10/15/20/25% personal-income scale on professional & other income; withholdings are credited on the annual return filed with the DGII.",
  },
  {
    id: "dr-itbis",
    name: "ITBIS 0% — Exportación de Servicios",
    authority: "Código Tributario · operaciones exentas de ITBIS",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "18% ITBIS standard — services consumed outside the Dominican Republic are exempt; invoice with the export legend and retain the USD credit advice.",
  },
];

const dopBanks: RegulatoryBank[] = [
  {
    id: "bpd",
    name: "Banco Popular Dominicano",
    displayName: "Banco Popular (Dominican Republic)",
    swiftCode: "POPDDOSD",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ACH Dominicano · SEM transferencias (T+1)",
    localCurrency: "DOP",
  },
  {
    id: "banreservas",
    name: "Banco de Reservas",
    displayName: "Banreservas (Dominican Republic)",
    swiftCode: "BANRDOSD",
    intermediaryUSD: 13,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ACH Dominicano · SEM transferencias (T+1)",
    localCurrency: "DOP",
  },
  {
    id: "bhd-do",
    name: "Banco BHD",
    displayName: "Banco BHD (Dominican Republic)",
    swiftCode: "BHDDDOSD",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "ACH Dominicano · clearing (T+1)",
    localCurrency: "DOP",
  },
];

const gtqTiers: StatutoryTier[] = [
  {
    id: "gt-isr",
    name: "ISR — Personas Naturales (5–20%)",
    authority: "SAT · Decreto 12-2002 (Ley del ISR)",
    rate: 0.05,
    purposeCode: "Actividad económica",
    note: "5% first band of the personal ISR scale on business & professional income (5/10/15/20% on progressive slices); declare on the annual income-tax return.",
  },
  {
    id: "gt-itbis",
    name: "ITBIS 0% — Exportación de Servicios",
    authority: "SAT · Decreto 37-92 (Ley de ITBIS)",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "12% ITBIS does not apply to services consumed outside Guatemala; invoice with the export legend and keep the SWIFT credit advice.",
  },
];

const gtqBanks: RegulatoryBank[] = [
  {
    id: "bi-gt",
    name: "Banco Industrial",
    displayName: "Banco Industrial (Guatemala)",
    swiftCode: "BICTGTGC",
    intermediaryUSD: 13,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "STP interbancario · clearing (T+1)",
    localCurrency: "GTQ",
  },
  {
    id: "bancagro-gt",
    name: "Banco Agromercantil",
    displayName: "Banco Agromercantil (Guatemala)",
    swiftCode: "AGROGTGC",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "STP interbancario · clearing (T+1)",
    localCurrency: "GTQ",
  },
];

const pabTiers: StatutoryTier[] = [
  {
    id: "pa-territorial",
    name: "Territorialidad — Renta del Exterior",
    authority: "Ley 69 de 1984 (Código Fiscal) · régimen territorial",
    rate: 0,
    purposeCode: "Renta de fuente externa",
    exemption: true,
    note: "Panama taxes only Panama-source income; personal earnings from foreign clients sit outside the renta base entirely.",
  },
  {
    id: "pa-itbms",
    name: "ITBMS 7% — Servicios al Exterior Exentos",
    authority: "Ley 47 de 2003 (ITBMS) · Ministerio de Economía y Finanzas",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "Dollarized domestic rails — zero FX conversion markup; intermediary wire deductions still apply.",
  },
];

const pabBanks: RegulatoryBank[] = [
  {
    id: "banco-general",
    name: "Banco General",
    displayName: "Banco General (Panama)",
    swiftCode: "BGEPPAPX",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "ACH interbancario · USD clearing (T+1)",
    localCurrency: "PAB",
  },
  {
    id: "bnp-pa",
    name: "Banco Nacional de Panamá",
    displayName: "Banco Nacional (Panama)",
    swiftCode: "BNPAPAPA",
    intermediaryUSD: 13,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ACH interbancario · USD clearing (T+1)",
    localCurrency: "PAB",
  },
  {
    id: "scotia-pa",
    name: "Scotiabank Panamá",
    displayName: "Scotiabank (Panama)",
    swiftCode: "NOSCPAPX",
    intermediaryUSD: 12,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ACH interbancario · USD clearing (T+1)",
    localCurrency: "PAB",
  },
];

const ecTiers: StatutoryTier[] = [
  {
    id: "ec-exterior",
    name: "Ingresos del Exterior — Exento de Renta",
    authority: "Ley para el Desarrollo Económico y la Sostenibilidad Fiscal (2023) · SRI",
    rate: 0,
    purposeCode: "Ingresos del exterior",
    exemption: true,
    note: "Service income earned from non-resident clients is excluded from the personal income-tax base under the 2023 development-law regime; declare Form 102 when filing is required.",
  },
  {
    id: "ec-iva",
    name: "IVA 15% — Exportación de Servicios 0%",
    authority: "Ley de Régimen Tributario Interno · SRI",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "Dollarized domestic rails — zero FX conversion markup; intermediary wire deductions still apply.",
  },
];

const ecBanks: RegulatoryBank[] = [
  {
    id: "pacifico",
    name: "Banco del Pacífico",
    displayName: "Banco del Pacífico (Ecuador)",
    swiftCode: "PACIECUA",
    intermediaryUSD: 13,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "ACH BCE transferencias · USD clearing (T+1)",
    localCurrency: "USD",
  },
  {
    id: "pichincha",
    name: "Banco Pichincha",
    displayName: "Banco Pichincha (Ecuador)",
    swiftCode: "PICHECUQ",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "ACH BCE transferencias · USD clearing (T+1)",
    localCurrency: "USD",
  },
];

const bobTiers: StatutoryTier[] = [
  {
    id: "bo-r10",
    name: "Régimen 10% — Personas Naturales",
    authority: "Ley 843 (Impuesto a las Utilidades) · SIN",
    rate: 0.1,
    purposeCode: "Régimen 10% sobre utilidades",
    note: "10% flat levy on gross utilidades for natural persons under the régimen 10% (25% standard for companies); service exporters invoice in USD and settle through the national banks.",
  },
  {
    id: "bo-it",
    name: "IT 3% — Exportaciones Exentas",
    authority: "Ley 843 (Impuesto a las Transacciones) · SIN",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "3% transaction tax hits domestic turnover — services invoiced to foreign clients sit outside the IT base; retain the invoice and the credit advice.",
  },
];

const bobBanks: RegulatoryBank[] = [
  {
    id: "mercantil-sc",
    name: "Banco Mercantil Santa Cruz",
    displayName: "Mercantil Santa Cruz (Bolivia)",
    swiftCode: "MERZBOLV",
    intermediaryUSD: 16,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BCB interbank transfers · ACH clearing (T+1)",
    localCurrency: "BOB",
  },
  {
    id: "union-bo",
    name: "Banco Unión",
    displayName: "Banco Unión (Bolivia)",
    swiftCode: "BANBOB22",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BCB interbank transfers · ACH clearing (T+1)",
    localCurrency: "BOB",
  },
  {
    id: "bnb",
    name: "Banco Nacional de Bolivia",
    displayName: "BNB (Bolivia)",
    swiftCode: "BNBOBOLV",
    intermediaryUSD: 14,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BCB interbank transfers · ACH clearing (T+1)",
    localCurrency: "BOB",
  },
];

const pygTiers: StatutoryTier[] = [
  {
    id: "py-iraga",
    name: "IRAGA — Rentas del Exterior",
    authority: "Ley 1259/98 (IRAGA) · DNIT",
    rate: 0,
    purposeCode: "Renta de fuente exterior",
    exemption: true,
    note: "Paraguay taxes only Paraguayan-source income (10% IRAGA rate on the local base) — foreign-client service fees are outside the charge; report the FX credit in the annual affidavit.",
  },
  {
    id: "py-iva",
    name: "IVA 5% — Exportaciones Exentas",
    authority: "Ley 1341/99 (Código Tributario Nacional) · DNIT",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "5% IVA standard — exported services are exempt; issue the factura de exportación and keep the bank credit advice.",
  },
];

const pygBanks: RegulatoryBank[] = [
  {
    id: "continental-py",
    name: "Banco Continental",
    displayName: "Banco Continental (Paraguay)",
    swiftCode: "BACNPYPA",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "DECEP · CENDEE clearing (T+1)",
    localCurrency: "PYG",
  },
  {
    id: "bbva-py",
    name: "BBVA Paraguay",
    displayName: "BBVA Paraguay",
    swiftCode: "BBVAPYPA",
    intermediaryUSD: 14,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "DECEP · CENDEE clearing (T+1)",
    localCurrency: "PYG",
  },
];

const jmdTiers: StatutoryTier[] = [
  {
    id: "jm-pit",
    name: "Income Tax — Graduated Resident Scale",
    authority: "Income Tax Act · Tax Administration Jamaica (TAJ)",
    rate: 0.25,
    purposeCode: "Worldwide income · TRN",
    note: "Residents are taxed on worldwide income under the graduated schedule (25% standard band plus the surcharge above the statutory threshold — verify with TAJ); foreign-currency fees are declared in JMD at the BOJ rate.",
  },
  {
    id: "jm-gct",
    name: "GCT 15% — Exported Services 0%",
    authority: "Goods and Services Tax Act · TAJ",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "15% GCT applies to Jamaican consumption — a service consumed by a non-resident client is outside the charge / zero-rated; invoice without GCT and keep the FX advice.",
  },
];

const jmdBanks: RegulatoryBank[] = [
  {
    id: "ncb-jm",
    name: "National Commercial Bank Jamaica",
    displayName: "NCB (Jamaica)",
    swiftCode: "JNCBJMKX",
    intermediaryUSD: 14,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BOJ RTGS · JMD clearing (T+1)",
    localCurrency: "JMD",
  },
  {
    id: "sagicor-jm",
    name: "Sagicor Bank Jamaica",
    displayName: "Sagicor (Jamaica)",
    swiftCode: "SAGAJMKX",
    intermediaryUSD: 13,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BOJ RTGS · JMD clearing (T+1)",
    localCurrency: "JMD",
  },
];

const ttdTiers: StatutoryTier[] = [
  {
    id: "tt-pit",
    name: "Income Tax — Individual (0–25%)",
    authority: "Income Tax Act Ch. 75:01 · Board of Inland Revenue",
    rate: 0.25,
    purposeCode: "Foreign service income",
    note: "Graduated personal scale topping out at the 25% band — resident sole traders declare foreign-currency service fees on the annual return (BIR) in TTD at the Central Bank reference rate.",
  },
  {
    id: "tt-vat",
    name: "VAT 12.5% — Exported Services 0%",
    authority: "Value Added Tax Act · Ministry of Finance",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "12.5% VAT standard — services delivered to a non-resident are zero-rated; issue the tax invoice marked 'zero-rated export' and keep the FX credit advice.",
  },
];

const ttdBanks: RegulatoryBank[] = [
  {
    id: "republic-tt",
    name: "Republic Bank",
    displayName: "Republic Bank (Trinidad & Tobago)",
    swiftCode: "RBLTTTPA",
    intermediaryUSD: 13,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Interbank Payment System · ACH clearing (T+1)",
    localCurrency: "TTD",
  },
  {
    id: "first-citizens-tt",
    name: "First Citizens Bank",
    displayName: "First Citizens (Trinidad & Tobago)",
    swiftCode: "FCITTTPA",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Interbank Payment System · ACH clearing (T+1)",
    localCurrency: "TTD",
  },
];

const hnlTiers: StatutoryTier[] = [
  {
    id: "hn-isr",
    name: "ISR — Rentas de Servicios",
    authority: "Ley del Impuesto sobre la Renta (D.S. 152-2002) · SAR",
    rate: 0.15,
    purposeCode: "Renta de servicios",
    note: "15% effective band on individual service income under the general ISR regime (25% for companies) — document the contract, invoice and FX credit; the annual return settles any balance.",
  },
  {
    id: "hn-isv",
    name: "ISV 15% — Exportación de Servicios 0%",
    authority: "Ley del Impuesto sobre las Ventas (D.S. 158-2002) · SAR",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "15% ISV on domestic supply — services consumed abroad are exempt (no ISV on export invoicing); keep the FX credit advice.",
  },
];

const hnlBanks: RegulatoryBank[] = [
  {
    id: "atlantida-hn",
    name: "Banco Atlántida",
    displayName: "Banco Atlántida (Honduras)",
    swiftCode: "ATLAHNAP",
    intermediaryUSD: 17,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 22,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Interbank ACH transfer · clearing (T+1)",
    localCurrency: "HNL",
  },
  {
    id: "ficohsa-hn",
    name: "Banco Ficohsa",
    displayName: "Ficohsa (Honduras)",
    swiftCode: "FICOHNAP",
    intermediaryUSD: 16,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Interbank ACH transfer · clearing (T+1)",
    localCurrency: "HNL",
  },
];

const svTiers: StatutoryTier[] = [
  {
    id: "sv-isr",
    name: "ISR — Personas con Actividad Económica",
    authority: "Ley de Impuesto sobre la Renta · Ministerio de Hacienda",
    rate: 0.1,
    purposeCode: "Actividad económica",
    note: "10% lower band of the personal ISR scale for natural persons with economic activity (rising to 30% on higher profits) — dollars only, so no currency conversion enters the tax base.",
  },
  {
    id: "sv-iva",
    name: "IVA 13% — Exportación de Servicios 0%",
    authority: "Ley del Impuesto sobre el Valor Agregado · Ministerio de Hacienda",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "Dollarized domestic rails — zero FX conversion markup; intermediary wire deductions still apply.",
  },
];

const svBanks: RegulatoryBank[] = [
  {
    id: "cuscatlan",
    name: "Banco Cuscatlán",
    displayName: "Banco Cuscatlán (El Salvador)",
    swiftCode: "CUSCSVCA",
    intermediaryUSD: 15,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "BCRD transferencias · ACH (T+1)",
    localCurrency: "USD",
  },
  {
    id: "agricola-sv",
    name: "Banco Agrícola",
    displayName: "Banco Agrícola (El Salvador)",
    swiftCode: "AGRISVCA",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BCRD transferencias · ACH (T+1)",
    localCurrency: "USD",
  },
  {
    id: "davivienda-sv",
    name: "Davivienda El Salvador",
    displayName: "Davivienda (El Salvador)",
    swiftCode: "DAVISVCA",
    intermediaryUSD: 13,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BCRD transferencias · ACH (T+1)",
    localCurrency: "USD",
  },
];

const nioTiers: StatutoryTier[] = [
  {
    id: "ni-renta",
    name: "Renta — Personas con Actividad Económica",
    authority: "Ley 475 · Dirección General de Ingresos (DGII)",
    rate: 0.15,
    purposeCode: "Renta de servicios",
    note: "15% band on service income of natural persons under the actividad-económica regime — declare annually with the DGII; foreign-currency receipts are converted at the BCR reference rate.",
  },
  {
    id: "ni-iva",
    name: "IVA — Exportación de Servicios 0%",
    authority: "Ley 405 (Impuesto al Valor Agregado) · DGII",
    rate: 0,
    purposeCode: "Exportación de servicios",
    exemption: true,
    note: "The IVA does not hit services invoiced to non-residents; retain the contract, invoice and BCR credit advice.",
  },
];

const nioBanks: RegulatoryBank[] = [
  {
    id: "banpro",
    name: "Banco de la Producción (BANPRO)",
    displayName: "BANPRO (Nicaragua)",
    swiftCode: "BANPNICA",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "BCR transferencias · ACH (T+1)",
    localCurrency: "NIO",
  },
  {
    id: "atlantida-ni",
    name: "Banco Atlántida",
    displayName: "Banco Atlántida (Nicaragua)",
    swiftCode: "ATLANICA",
    intermediaryUSD: 13,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BCR transferencias · ACH (T+1)",
    localCurrency: "NIO",
  },
];

const bsdTiers: StatutoryTier[] = [
  {
    id: "bs-no-pit",
    name: "No Personal Income Tax",
    authority: "The Bahamas · Ministry of Finance (no income tax statute)",
    rate: 0,
    purposeCode: "Foreign-source earnings",
    exemption: true,
    note: "The Bahamas levies no personal income tax, no withholding tax and no capital-gains tax — inward service payments arrive at face value less bank charges only.",
  },
  {
    id: "bs-peg",
    name: "BSD Peg — 1:1 with the USD",
    authority: "Central Bank of The Bahamas (currency-board peg)",
    rate: 0,
    purposeCode: "BSD peg · USD par",
    exemption: true,
    note: "The Bahamian dollar is pegged 1:1 and fully reserved against the USD — local USD↔BSD conversion carries no FX spread at ACH level; intermediary wire deductions still apply.",
  },
];

const bsdBanks: RegulatoryBank[] = [
  {
    id: "fcib-bs",
    name: "CIBC FirstCaribbean",
    displayName: "FirstCaribbean (Bahamas)",
    swiftCode: "FCIBBSBS",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Interbank ACH clearing · BSD (T+1)",
    localCurrency: "BSD",
  },
  {
    id: "scotia-bs",
    name: "Scotiabank Bahamas",
    displayName: "Scotiabank (Bahamas)",
    swiftCode: "NOSCBSBS",
    intermediaryUSD: 11,
    intermediaryMinUSD: 11,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Interbank ACH clearing · BSD (T+1)",
    localCurrency: "BSD",
  },
];

const bbdTiers: StatutoryTier[] = [
  {
    id: "bb-pit",
    name: "Personal Income Tax (12.5–33.75%)",
    authority: "Income Tax Act · Barbados Revenue Authority (BRA)",
    rate: 0.125,
    purposeCode: "Worldwide income",
    note: "Residents are taxed on worldwide income under the 12.5 / 28 / 33.75% scale — declare foreign-currency service fees in BBD at the Central Bank of Barbados reference rate.",
  },
  {
    id: "bb-vat",
    name: "VAT 17.5% — Exported Services 0%",
    authority: "VAT Act · Barbados Revenue Authority",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "17.5% VAT standard — services supplied to a non-resident outside Barbados are zero-rated; issue the tax invoice marked zero-rated and keep the credit advice.",
  },
];

const bbdBanks: RegulatoryBank[] = [
  {
    id: "fcib-bb",
    name: "CIBC FirstCaribbean",
    displayName: "FirstCaribbean (Barbados)",
    swiftCode: "FCIBBBBS",
    intermediaryUSD: 11,
    intermediaryMinUSD: 11,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Barbados clearing house · ACH (T+1)",
    localCurrency: "BBD",
  },
  {
    id: "butterfield-bb",
    name: "Bank of Butterfield",
    displayName: "Butterfield (Barbados)",
    swiftCode: "BUTTBBBS",
    intermediaryUSD: 10,
    intermediaryMinUSD: 10,
    intermediaryMaxUSD: 14,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Barbados clearing house · ACH (T+1)",
    localCurrency: "BBD",
  },
];

/* ---------------------------------------------------------------------------
 * Global Expansion Wave 2 — Asia & Pacific (USD → UZS, KHR, MNT, AMD, AZN,
 * KGS, TJS, MVR, BND, LAK, BTN, FJD, PGK, WST, TOP, VUV, SBD, MUR).
 * ------------------------------------------------------------------------- */

const uzsTiers: StatutoryTier[] = [
  {
    id: "uz-pit",
    name: "Personal Income Tax 12% (resident)",
    authority: "Tax Code of the Republic of Uzbekistan · State Tax Committee",
    rate: 0.12,
    purposeCode: "Service export",
    note: "12% resident PIT on individual income (20% for non-residents); IT-service exporters invoice under the foreign-trade contract and services to non-residents are VAT-exempt.",
  },
  {
    id: "uz-vat",
    name: "VAT 0% — Export of Services",
    authority: "Tax Code · State Tax Committee (VAT export regime)",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "Uzbekistan's VAT is not charged on services delivered to non-residents; retain the contract, invoice and the converted FX credit advice.",
  },
];

const uzsBanks: RegulatoryBank[] = [
  {
    id: "ipak-yuli",
    name: "Ipak Yuli Bank",
    displayName: "Ipak Yuli (Uzbekistan)",
    swiftCode: "IJUBUZ22",
    intermediaryUSD: 16,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "FISS interbank RTGS · UzCard clearing",
    localCurrency: "UZS",
  },
  {
    id: "ipoteka-uz",
    name: "Ipoteka Bank",
    displayName: "Ipoteka Bank (Uzbekistan)",
    swiftCode: "IPOTUZ22",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "FISS interbank RTGS · UzCard clearing",
    localCurrency: "UZS",
  },
];

const khrTiers: StatutoryTier[] = [
  {
    id: "kh-profession",
    name: "Personal Income Tax 20% — Profession Income",
    authority: "Law on Taxation · General Department of Taxation (GDT)",
    rate: 0.2,
    purposeCode: "Profession / self-employment",
    note: "20% on professional-service income (salaries use the 0–20% scale); residents are taxed on worldwide income and foreign receipts convert at the NBC reference rate.",
  },
  {
    id: "kh-vat",
    name: "VAT 10% — Export of Services 0%",
    authority: "Law on Value Added Tax · GDT",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "10% VAT — services supplied to non-residents for use outside Cambodia are zero-rated; retain the client contract and the NBC credit advice.",
  },
];

const khrBanks: RegulatoryBank[] = [
  {
    id: "aba-kh",
    name: "ABA Bank",
    displayName: "ABA Bank (Cambodia)",
    swiftCode: "ABPPKHPP",
    intermediaryUSD: 16,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Instant",
    clearance: "NBC RTGS · Bakong / KHQR instant",
    localCurrency: "KHR",
  },
  {
    id: "acleda",
    name: "ACLEDA Bank",
    displayName: "ACLEDA (Cambodia)",
    swiftCode: "ACLEKHPH",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NBC RTGS · Bakong / KHQR instant",
    localCurrency: "KHR",
  },
];

const mntTiers: StatutoryTier[] = [
  {
    id: "mn-pit",
    name: "Personal Income Tax 10%",
    authority: "Law on Personal Income Taxes · General Administration of Taxation",
    rate: 0.1,
    purposeCode: "Foreign-source income",
    note: "10% base PIT on individual income (progressive surcharges apply above the high-income cut-off); residents declare worldwide income in MNT.",
  },
  {
    id: "mn-vat",
    name: "VAT 10% — Exported Services 0%",
    authority: "Law on Value Added Tax · GAT",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "10% VAT — services for non-resident consumers are exports of services at 0%; keep the foreign transfer advice.",
  },
];

const mntBanks: RegulatoryBank[] = [
  {
    id: "tdb-mn",
    name: "Trade & Development Bank",
    displayName: "TDB (Mongolia)",
    swiftCode: "TDBMMNUB",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "IPS interbank transfer · MNT clearing (T+1)",
    localCurrency: "MNT",
  },
  {
    id: "khan-bank",
    name: "Khan Bank",
    displayName: "Khan Bank (Mongolia)",
    swiftCode: "KHNBMNUB",
    intermediaryUSD: 14,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "IPS interbank transfer · MNT clearing (T+1)",
    localCurrency: "MNT",
  },
];

const amdTiers: StatutoryTier[] = [
  {
    id: "am-pit",
    name: "Personal Income Tax 20%",
    authority: "RA Tax Code · State Revenue Committee (SRC)",
    rate: 0.2,
    purposeCode: "Service income",
    note: "20% flat PIT on resident employment/professional income (the tax-free personal threshold applies first); IT-sector profit-tax reliefs cover registered entities, not sole freelancers.",
  },
  {
    id: "am-vat",
    name: "VAT 0% — Export of Services",
    authority: "RA Tax Code · VAT export regime",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "20% standard VAT — services delivered to non-resident clients qualify as an export (0%); invoice in the contract currency and keep the bank credit advice.",
  },
];

const amdBanks: RegulatoryBank[] = [
  {
    id: "ameriabank",
    name: "Ameriabank",
    displayName: "Ameriabank (Armenia)",
    swiftCode: "ABARMN22",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "CBA interbank transfers · ArCa clearing (T+1)",
    localCurrency: "AMD",
  },
  {
    id: "acba-am",
    name: "ACBA Bank",
    displayName: "ACBA Bank (Armenia)",
    swiftCode: "ACBAMN22",
    intermediaryUSD: 14,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CBA interbank transfers · ArCa clearing (T+1)",
    localCurrency: "AMD",
  },
];

const aznTiers: StatutoryTier[] = [
  {
    id: "az-pit",
    name: "Personal Income Tax 14% (lower band)",
    authority: "Tax Code of the Republic of Azerbaijan · State Tax Service",
    rate: 0.14,
    purposeCode: "Service income",
    note: "14% on the first AZN 8,000 of annual income, rising through the 20/25/30/36% bands — residents declare worldwide income in AZN.",
  },
  {
    id: "az-vat",
    name: "VAT 18% — Export of Services 0%",
    authority: "Tax Code · VAT export provision",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "18% VAT — exported services are zero-rated under the Tax Code's export provision; retain the contract and the AZIPS credit advice.",
  },
];

const aznBanks: RegulatoryBank[] = [
  {
    id: "kapital-az",
    name: "Kapital Bank",
    displayName: "Kapital Bank (Azerbaijan)",
    swiftCode: "KAPBAZ22",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "AZIPS interbank RTGS",
    localCurrency: "AZN",
  },
  {
    id: "iba-az",
    name: "International Bank of Azerbaijan",
    displayName: "IBA (Azerbaijan)",
    swiftCode: "IBAZAZ22",
    intermediaryUSD: 13,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "AZIPS interbank RTGS",
    localCurrency: "AZN",
  },
];

const kgsTiers: StatutoryTier[] = [
  {
    id: "kg-pit",
    name: "Personal Income Tax 10%",
    authority: "Tax Code of the Kyrgyz Republic · State Tax Service",
    rate: 0.1,
    purposeCode: "Service income",
    note: "10% resident PIT (20% for non-residents without a permanent establishment); the inbound USD credit converts at the National Bank of the Kyrgyz Republic reference rate.",
  },
  {
    id: "kg-vat",
    name: "VAT 12% — Export of Services 0%",
    authority: "Tax Code · VAT",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "12% VAT — services delivered to non-residents are zero-rated as an export of services; keep the contract and the interbank credit slip.",
  },
];

const kgsBanks: RegulatoryBank[] = [
  {
    id: "optima",
    name: "Optima Bank",
    displayName: "Optima Bank (Kyrgyzstan)",
    swiftCode: "OPTMKG22",
    intermediaryUSD: 16,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "IPS interbank transfer · ElCard clearing",
    localCurrency: "KGS",
  },
  {
    id: "aiyl-kg",
    name: "Aiyl Bank",
    displayName: "Aiyl Bank (Kyrgyzstan)",
    swiftCode: "AIYLKG22",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "IPS interbank transfer · ElCard clearing",
    localCurrency: "KGS",
  },
];

const tjsTiers: StatutoryTier[] = [
  {
    id: "tj-pit",
    name: "Personal Income Tax 12% (resident)",
    authority: "Tax Code of the Republic of Tajikistan · Tax Committee",
    rate: 0.12,
    purposeCode: "Service income",
    note: "12% resident PIT on the lower band rising to the 25% top rate — residents are taxed on worldwide income; foreign receipts convert at the National Bank of Tajikistan rate.",
  },
  {
    id: "tj-vat",
    name: "VAT 18% — Export of Services 0%",
    authority: "Tax Code · VAT",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "18% VAT — services supplied to non-residents are zero-rated (export of services); retain the contract and the credit advice.",
  },
];

const tjsBanks: RegulatoryBank[] = [
  {
    id: "orienbank",
    name: "Orienbank",
    displayName: "Orienbank (Tajikistan)",
    swiftCode: "ORIETJ22",
    intermediaryUSD: 17,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 22,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NBT interbank RTGS · electronic clearing",
    localCurrency: "TJS",
  },
  {
    id: "amonatbonk",
    name: "Amonatbonk",
    displayName: "Amonatbonk (Tajikistan)",
    swiftCode: "AMONTJ22",
    intermediaryUSD: 16,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NBT interbank RTGS · electronic clearing",
    localCurrency: "TJS",
  },
];

const mvrTiers: StatutoryTier[] = [
  {
    id: "mv-no-pit",
    name: "No Personal Income Tax",
    authority: "Maldives Inland Revenue Authority (MIRA) — no personal income tax",
    rate: 0,
    purposeCode: "Offshore service income",
    exemption: true,
    note: "The Maldives levies no personal income tax — inbound professional fees are not taxed at source; MIRA administers the GST regime instead.",
  },
  {
    id: "mv-gst",
    name: "GST 16% — Offshore Services Out of Scope",
    authority: "Goods and Services Tax Act · MIRA",
    rate: 0,
    purposeCode: "Offshore service supply",
    exemption: true,
    note: "16% TGST applies to supplies consumed in the Maldives — services for a non-resident client are outside the GST charge; document the offshore engagement.",
  },
];

const mvrBanks: RegulatoryBank[] = [
  {
    id: "bml",
    name: "Bank of Maldives",
    displayName: "BML (Maldives)",
    swiftCode: "BMLMMVMV",
    intermediaryUSD: 15,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 19,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Interbank payment system (IPS) · MVR (T+1)",
    localCurrency: "MVR",
  },
  {
    id: "mib-mv",
    name: "Maldives Islamic Bank",
    displayName: "MIB (Maldives)",
    swiftCode: "MIBMMVMV",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Interbank payment system (IPS) · MVR (T+1)",
    localCurrency: "MVR",
  },
];

const bndTiers: StatutoryTier[] = [
  {
    id: "bn-no-pit",
    name: "No Personal Income Tax",
    authority: "Brunei Darussalam · Ministry of Finance & Economy",
    rate: 0,
    purposeCode: "Service income",
    exemption: true,
    note: "Brunei imposes no personal income tax on individuals — companies pay 18.5% corporate tax, but freelance service earnings are untaxed.",
  },
  {
    id: "bn-no-vat",
    name: "No VAT/GST — Export Services",
    authority: "Royal Customs and Excise Department, Brunei",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "Brunei has no VAT or GST regime — only imported goods attract customs & excise charges, so offshore digital services carry no indirect tax.",
  },
];

const bndBanks: RegulatoryBank[] = [
  {
    id: "bibd",
    name: "Bank Islam Brunei Darussalam",
    displayName: "BIBD (Brunei)",
    swiftCode: "BIBDBNBN",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Brunei interbank clearing (AMBD) · T+1",
    localCurrency: "BND",
  },
  {
    id: "baiduri",
    name: "Baiduri Bank",
    displayName: "Baiduri Bank (Brunei)",
    swiftCode: "BAIDBNBN",
    intermediaryUSD: 11,
    intermediaryMinUSD: 11,
    intermediaryMaxUSD: 15,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Brunei interbank clearing (AMBD) · T+1",
    localCurrency: "BND",
  },
];

const lakTiers: StatutoryTier[] = [
  {
    id: "la-pit",
    name: "Personal Income Tax (0–25% scale)",
    authority: "Law on Income Tax · Ministry of Finance & Planning",
    rate: 0.1,
    purposeCode: "Service income",
    note: "Progressive personal scale (0/5/10/15/20/25% bands) — residents declare worldwide income and banks convert the USD credit at the Bank of Lao reference rate.",
  },
  {
    id: "la-vat",
    name: "VAT 10% — Export of Services 0%",
    authority: "Law on Tax on Goods and Services · Ministry of Finance",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "10% standard VAT (7% reduced rate on essentials) — services delivered to non-residents are exempt / zero-rated; keep the contract and credit advice.",
  },
];

const lakBanks: RegulatoryBank[] = [
  {
    id: "bcel",
    name: "Banque pour le Commerce Extérieur Lao",
    displayName: "BCEL (Laos)",
    swiftCode: "BCELLAOX",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Interbank ACH clearing · LAK (T+1)",
    localCurrency: "LAK",
  },
  {
    id: "phongsavanh",
    name: "Phongsavanh Bank",
    displayName: "Phongsavanh Bank (Laos)",
    swiftCode: "PHONLAXX",
    intermediaryUSD: 14,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Interbank ACH clearing · LAK (T+1)",
    localCurrency: "LAK",
  },
];

const btnTiers: StatutoryTier[] = [
  {
    id: "bt-pit",
    name: "Personal Income Tax (0–25% scale)",
    authority: "Income Tax Act 2001 · Department of Revenue & Customs",
    rate: 0.15,
    purposeCode: "Service income",
    note: "Progressive personal schedule with an exempt first bracket and a 25% top rate; foreign-currency service income converts at the RMA Ngultrum reference (BTN tracks the INR peg).",
  },
  {
    id: "bt-no-vat",
    name: "Export of Services — No Indirect Tax",
    authority: "Department of Revenue & Customs · excise & customs regime",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "Bhutan has no VAT/GST on services — import-side customs duties fund the fisc, so offshore service income carries no indirect tax; income tax is the only charge.",
  },
];

const btnBanks: RegulatoryBank[] = [
  {
    id: "bubl",
    name: "Bank of Bhutan",
    displayName: "Bank of Bhutan",
    swiftCode: "BUBLBHBT",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "RMA interbank clearing · BTN (T+1)",
    localCurrency: "BTN",
  },
  {
    id: "druk-pnb",
    name: "Druk PNB Bank",
    displayName: "Druk PNB (Bhutan)",
    swiftCode: "DPBHBHBT",
    intermediaryUSD: 13,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "RMA interbank clearing · BTN (T+1)",
    localCurrency: "BTN",
  },
];

const fjdTiers: StatutoryTier[] = [
  {
    id: "fj-resident",
    name: "Resident Income Tax (18–20%)",
    authority: "Income Tax Act 1974 · Fiji Revenue & Customs Authority (FRCA)",
    rate: 0.18,
    purposeCode: "Foreign employment income",
    note: "Resident individuals are taxed from 18% on the lower slices up to 20% — self-employment income is declared annually in FJD while PAYE covers wages.",
  },
  {
    id: "fj-vat",
    name: "VAT 15% — Export of Services 0%",
    authority: "Value Added Tax Act 1991 · FRCA",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "15% VAT — exported services are zero-rated (not charged); issue the tax invoice marked 'export' and keep the BSP credit advice.",
  },
];

const fjdBanks: RegulatoryBank[] = [
  {
    id: "anz-fj",
    name: "ANZ Fiji",
    displayName: "ANZ (Fiji)",
    swiftCode: "ANZFFJSX",
    intermediaryUSD: 15,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 19,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RBF interbank RTGS · ACH clearing (T+1)",
    localCurrency: "FJD",
  },
  {
    id: "bsp-fj",
    name: "Bank of South Pacific Fiji",
    displayName: "BSP (Fiji)",
    swiftCode: "BSPFFJFJ",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "RBF interbank RTGS · ACH clearing (T+1)",
    localCurrency: "FJD",
  },
];

const pgkTiers: StatutoryTier[] = [
  {
    id: "pg-pit",
    name: "Personal Income Tax (0–42% scale)",
    authority: "Income Tax Act 1989 · Internal Revenue Commission (IRC)",
    rate: 0.3,
    purposeCode: "Service income",
    note: "Progressive resident scale — 0% on the first tranche, middle bands up to 42% at the top (non-residents start at 42% from the first kina); declare in PGK.",
  },
  {
    id: "pg-vgst",
    name: "VGST — Export of Services 0%",
    authority: "Internal Revenue Commission · VGST",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "VGST does not apply to services delivered outside PNG (zero-rated export of services) — the standard VGST rate covers domestic consumption only; confirm the current rate with the IRC.",
  },
];

const pgkBanks: RegulatoryBank[] = [
  {
    id: "bsp-pg",
    name: "Bank South Pacific PNG",
    displayName: "BSP (Papua New Guinea)",
    swiftCode: "BSPUPGPA",
    intermediaryUSD: 16,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 21,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BPNG interbank clearing · PGK (T+1)",
    localCurrency: "PGK",
  },
  {
    id: "westpac-pg",
    name: "Westpac PNG",
    displayName: "Westpac (Papua New Guinea)",
    swiftCode: "WPACPUPA",
    intermediaryUSD: 15,
    intermediaryMinUSD: 15,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "BPNG interbank clearing · PGK (T+1)",
    localCurrency: "PGK",
  },
];

const wstTiers: StatutoryTier[] = [
  {
    id: "ws-pit",
    name: "Resident Income Tax — progressive",
    authority: "Income Tax Act · Samoa Inland Revenue Division",
    rate: 0.15,
    purposeCode: "Foreign-source income",
    note: "Progressive resident schedule with an exempt first slice — residents declare worldwide income in WST at the Central Bank of Samoa reference rate.",
  },
  {
    id: "ws-vat",
    name: "VAT — Export of Services 0%",
    authority: "Value Added Tax Act · Samoa Ministry of Revenue",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "Samoa's VAT covers domestic consumption — services supplied to non-resident clients are outside the local VAT charge (zero-rated); keep the foreign credit advice.",
  },
];

const wstBanks: RegulatoryBank[] = [
  {
    id: "nbs-ws",
    name: "National Bank of Samoa",
    displayName: "National Bank of Samoa",
    swiftCode: "NBSAWSWS",
    intermediaryUSD: 16,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 21,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Central Bank of Samoa clearing · ACH (T+1)",
    localCurrency: "WST",
  },
  {
    id: "scb-ws",
    name: "Samoa Commercial Bank",
    displayName: "Samoa Commercial Bank",
    swiftCode: "SCBWWSST",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Central Bank of Samoa clearing · ACH (T+1)",
    localCurrency: "WST",
  },
];

const topTiers: StatutoryTier[] = [
  {
    id: "to-pit",
    name: "Personal Income Tax — progressive",
    authority: "Income Tax Act · Ministry of Revenue",
    rate: 0.15,
    purposeCode: "Foreign-source income",
    note: "Progressive resident schedule with an exempt threshold — residents declare worldwide income in TOP at the National Reserve Bank of Tonga reference rate.",
  },
  {
    id: "to-vat",
    name: "VAT — Export of Services 0%",
    authority: "Value Added Tax Act · Tonga Ministry of Revenue",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "VAT covers domestic consumption only — services supplied to non-resident clients are outside the local charge; keep the foreign credit advice.",
  },
];

const topBanks: RegulatoryBank[] = [
  {
    id: "tdb-to",
    name: "Tonga Development Bank",
    displayName: "Tonga Development Bank",
    swiftCode: "TDBTTOXX",
    intermediaryUSD: 15,
    intermediaryMinUSD: 14,
    intermediaryMaxUSD: 20,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "NRBT clearing · TOP (T+1)",
    localCurrency: "TOP",
  },
  {
    id: "anz-to",
    name: "ANZ Tonga",
    displayName: "ANZ (Tonga)",
    swiftCode: "ANZTTOTO",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "NRBT clearing · TOP (T+1)",
    localCurrency: "TOP",
  },
];

const vuvTiers: StatutoryTier[] = [
  {
    id: "vu-no-pit",
    name: "No Personal Income Tax",
    authority: "Vanuatu · Commissioner of Taxation (no income tax regime)",
    rate: 0,
    purposeCode: "Service income",
    exemption: true,
    note: "Vanuatu levies no personal income tax, no capital gains tax and no withholding tax — only Vanuatu-sourced company income and VAT are chargeable.",
  },
  {
    id: "vu-vat",
    name: "VAT 15% — Offshore Services",
    authority: "Value Added Tax Act · Vanuatu Taxation Office",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "15% VAT on domestic supplies — services provided to non-resident clients consumed outside Vanuatu fall outside the VAT net (confirm with the Tax Office); no income tax ever applies.",
  },
];

const vuvBanks: RegulatoryBank[] = [
  {
    id: "anz-vu",
    name: "ANZ Vanuatu",
    displayName: "ANZ (Vanuatu)",
    swiftCode: "ANZVVUVU",
    intermediaryUSD: 13,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "Reserve Bank of Vanuatu clearing · VUV (T+1)",
    localCurrency: "VUV",
  },
  {
    id: "bov",
    name: "Bank of Vanuatu",
    displayName: "Bank of Vanuatu",
    swiftCode: "BOVUVUVU",
    intermediaryUSD: 12,
    intermediaryMinUSD: 12,
    intermediaryMaxUSD: 16,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "Reserve Bank of Vanuatu clearing · VUV (T+1)",
    localCurrency: "VUV",
  },
];

const sbdTiers: StatutoryTier[] = [
  {
    id: "sb-pit",
    name: "Resident Income Tax (0–40%)",
    authority: "Income Tax Act · Inland Revenue Division (IRD), Solomon Islands",
    rate: 0.3,
    purposeCode: "Service income",
    note: "Progressive resident schedule topping out at 40% (non-residents are taxed at 40% from the first dollar); convert the USD credit at the CBSI reference rate.",
  },
  {
    id: "sb-gst",
    name: "GST — Export of Services 0%",
    authority: "Goods and Services Tax Act · IRD, Solomon Islands",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "The GST applies to domestic consumption — services for non-resident clients are outside the charge (confirm with the IRD); no withholding applies on inward remittances.",
  },
];

const sbdBanks: RegulatoryBank[] = [
  {
    id: "anz-sb",
    name: "ANZ Solomon Islands",
    displayName: "ANZ (Solomon Islands)",
    swiftCode: "ANZSSBBI",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 19,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CBSI clearing · SBD (T+1)",
    localCurrency: "SBD",
  },
  {
    id: "bsp-sb",
    name: "Bank South Pacific Solomon Islands",
    displayName: "BSP (Solomon Islands)",
    swiftCode: "BSPSSBBI",
    intermediaryUSD: 13,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "CBSI clearing · SBD (T+1)",
    localCurrency: "SBD",
  },
];

const murTiers: StatutoryTier[] = [
  {
    id: "mu-no-pit",
    name: "No Personal Income Tax",
    authority: "Mauritius Revenue Authority (MRA) — no personal income tax on individuals",
    rate: 0,
    purposeCode: "Service income",
    exemption: true,
    note: "Mauritius does not levy a personal income tax on individuals — remote-service earnings are not taxed at source; corporate and indirect taxes target registered entities instead.",
  },
  {
    id: "mu-vat",
    name: "VAT 15% — Export of Services 0%",
    authority: "Value Added Tax Act · MRA",
    rate: 0,
    purposeCode: "Export of services",
    exemption: true,
    note: "15% VAT — exports of goods and services are zero-rated with full input credits; invoice as a zero-rated export and keep the credit advice.",
  },
];

const murBanks: RegulatoryBank[] = [
  {
    id: "mcb-mu",
    name: "Mauritius Commercial Bank",
    displayName: "MCB (Mauritius)",
    swiftCode: "MCBLMUMU",
    intermediaryUSD: 15,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 19,
    localFeeDefault: 0,
    speed: "Fast",
    clearance: "MIBOS interbank RTGS · MUR (T+1)",
    localCurrency: "MUR",
  },
  {
    id: "sbm-mu",
    name: "State Bank of Mauritius",
    displayName: "SBM (Mauritius)",
    swiftCode: "SBMUMUMU",
    intermediaryUSD: 14,
    intermediaryMinUSD: 13,
    intermediaryMaxUSD: 18,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "MIBOS interbank RTGS · MUR (T+1)",
    localCurrency: "MUR",
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

/* ---------------------------------------------------------------------------
 * Global Expansion Wave 3 — Sub-Saharan Africa & Middle East (authored banks + tiers)
 * ------------------------------------------------------------------------- */

const etbTiers: StatutoryTier[] = [
  { id: "etb-export", name: "Export Services — Zero-Rated VAT", authority: "Ethiopian Revenue & Customs Authority (ERCA) VAT Directive", rate: 0, purposeCode: "Export of services", exemption: true, note: "0% VAT on exported digital services; confirm with Commercial Bank of Ethiopia." },
  { id: "etb-pit", name: "Standard PIT Bracket", authority: "ERCA Income Tax Proclamation Art. 58", rate: 0.15, purposeCode: "Service income", note: "Progressive PIT up to 35%; foreign-service remittances cleared via CBE." },
];
const etbBanks: RegulatoryBank[] = [
  { id: "cbe", name: "Commercial Bank of Ethiopia", displayName: "CBE (Ethiopia)", swiftCode: "CBETETAA", intermediaryUSD: 16, intermediaryMinUSD: 14, intermediaryMaxUSD: 20, localFeeDefault: 0, speed: "Standard", clearance: "CBE RTGS / ACH 1–2 days", localCurrency: "ETB" },
  { id: "dashen", name: "Dashen Bank", displayName: "Dashen Bank (Ethiopia)", swiftCode: "DASHETAA", intermediaryUSD: 15, intermediaryMinUSD: 12, intermediaryMaxUSD: 18, localFeeDefault: 50, speed: "Standard", clearance: "CBE clearing · local fee 50 ETB", localCurrency: "ETB" },
];

const xafTiers: StatutoryTier[] = [
  { id: "xaf-export", name: "Export of Services — VAT Exempt", authority: "CEMAC VAT Regime Art. 13", rate: 0, purposeCode: "CEMAC export", exemption: true, note: "CFA-zone VAT exemption on exported IT services; cleared via BEAC." },
];
const xafBanks: RegulatoryBank[] = [
  { id: "bicec", name: "Bank of Central African States (BEAC)", displayName: "BEAC / BICEC (Cameroon)", swiftCode: "BICECMCM", intermediaryUSD: 15, intermediaryMinUSD: 12, intermediaryMaxUSD: 18, localFeeDefault: 0, speed: "Standard", clearance: "BEAC RTGS / ACH same-day", localCurrency: "XAF" },
];

const xofTiers: StatutoryTier[] = [
  { id: "xof-export", name: "Export Services — VAT 0%", authority: "UEMOA VAT Regime Art. 12", rate: 0, purposeCode: "UEMOA export", exemption: true, note: "West African CFA export exemption; settled via BCEAO." },
];
const xofBanks: RegulatoryBank[] = [
  { id: "bceao", name: "Central Bank of West African States", displayName: "BCEAO / BICIS (Senegal)", swiftCode: "BCEAOOLS", intermediaryUSD: 15, intermediaryMinUSD: 12, intermediaryMaxUSD: 18, localFeeDefault: 0, speed: "Standard", clearance: "BCEAO RTGS / ACH 1 day", localCurrency: "XOF" },
];

const bwpTiers: StatutoryTier[] = [
  { id: "bwp-export", name: "Export Services Exemption", authority: "Botswana Revenue Service (BURS) VAT Act", rate: 0, purposeCode: "Export service", exemption: true, note: "0% VAT on exported digital services; cleared via Bank of Botswana." },
];
const bwpBanks: RegulatoryBank[] = [
  { id: "stanbic-bw", name: "Stanbic Bank Botswana", displayName: "Stanbic Bank (Botswana)", swiftCode: "SBICBWGZ", intermediaryUSD: 14, intermediaryMinUSD: 12, intermediaryMaxUSD: 18, localFeeDefault: 0, speed: "Fast", clearance: "BOB RTGS / ACH 1 day", localCurrency: "BWP" },
];

const nadTiers: StatutoryTier[] = [
  { id: "nad-export", name: "Export Services — Zero VAT", authority: "NamRA VAT Act Section 12", rate: 0, purposeCode: "Export of services", exemption: true, note: "Namibia VAT exemption on exported services; Bank of Namibia settlement." },
];
const nadBanks: RegulatoryBank[] = [
  { id: "fnb-na", name: "First National Bank Namibia", displayName: "FNB (Namibia)", swiftCode: "FIRNNANX", intermediaryUSD: 14, intermediaryMinUSD: 12, intermediaryMaxUSD: 18, localFeeDefault: 0, speed: "Fast", clearance: "NAMRTGS / ACH same-day", localCurrency: "NAD" },
];

const mznTiers: StatutoryTier[] = [
  { id: "mzn-export", name: "Export Services VAT Exempt", authority: "Mozambique VAT Code Art. 15", rate: 0, purposeCode: "Export VAT", exemption: true, note: "0% VAT on exported IT services; Banco de Moçambique clearing." },
];
const mznBanks: RegulatoryBank[] = [
  { id: "bci-mz", name: "Commercial and Investment Bank", displayName: "BCI (Mozambique)", swiftCode: "BCIOMZMC", intermediaryUSD: 15, intermediaryMinUSD: 13, intermediaryMaxUSD: 18, localFeeDefault: 0, speed: "Standard", clearance: "BM RTGS / ACH 1–2 days", localCurrency: "MZN" },
];

const mwkTiers: StatutoryTier[] = [
  { id: "mwk-export", name: "Export Services — VAT 0%", authority: "Malawi Revenue Authority (MRA) VAT Act", rate: 0, purposeCode: "MRA export", exemption: true, note: "Malawi VAT zero-rating on exported services; Reserve Bank of Malawi clearing." },
];
const mwkBanks: RegulatoryBank[] = [
  { id: "nbs-mw", name: "National Bank of Malawi", displayName: "NBS (Malawi)", swiftCode: "NBSMMLNX", intermediaryUSD: 16, intermediaryMinUSD: 14, intermediaryMaxUSD: 20, localFeeDefault: 0, speed: "Standard", clearance: "RBM RTGS / ACH 1 day", localCurrency: "MWK" },
];

const aoaTiers: StatutoryTier[] = [
  { id: "aoa-export", name: "Export Services — VAT Exempt", authority: "Angolan Tax Authority (AGT) VAT Code", rate: 0, purposeCode: "AGT export", exemption: true, note: "Angola VAT exemption on exported digital services; BNA settlement." },
];
const aoaBanks: RegulatoryBank[] = [
  { id: "bfa-ao", name: "Banco de Fomento Angola", displayName: "BFA (Angola)", swiftCode: "BFAOAOAL", intermediaryUSD: 18, intermediaryMinUSD: 15, intermediaryMaxUSD: 22, localFeeDefault: 0, speed: "Standard", clearance: "BNA RTGS 2 days", localCurrency: "AOA" },
];

const mgaTiers: StatutoryTier[] = [
  { id: "mga-export", name: "Export Services — VAT 0%", authority: "Madagascar Revenue Authority (DGI) VAT Act", rate: 0, purposeCode: "DGI export", exemption: true, note: "Madagascar VAT exemption on exported services; Bank of Madagascar clearing." },
];
const mgaBanks: RegulatoryBank[] = [
  { id: "boa-mg", name: "Bank of Africa Madagascar", displayName: "BOA (Madagascar)", swiftCode: "BOAMMGMA", intermediaryUSD: 15, intermediaryMinUSD: 12, intermediaryMaxUSD: 18, localFeeDefault: 0, speed: "Standard", clearance: "BAM RTGS / ACH 1 day", localCurrency: "MGA" },
];

const jodTiers: StatutoryTier[] = [
  { id: "jod-export", name: "Export Services — Zero Withholding", authority: "Jordan Income Tax Law Art. 12 & BITS Code 1300", rate: 0, purposeCode: "BITS 1300 Foreign Inflow", exemption: true, note: "Jordanian Dinar wires settle via BITS with purpose code 1300 for foreign service export." },
];
const jodBanks: RegulatoryBank[] = [
  { id: "arab-jordan", name: "Arab Bank Jordan", displayName: "Arab Bank (Jordan)", swiftCode: "ARABJOAX", intermediaryUSD: 12, intermediaryMinUSD: 10, intermediaryMaxUSD: 16, localFeeDefault: 0, speed: "Fast", clearance: "BITS / JOCC 1 day", localCurrency: "JOD" },
];

const omrTiers: StatutoryTier[] = [
  { id: "omr-export", name: "Export Services Exemption", authority: "Oman Income Tax Law Art. 8 & CBU Code 900", rate: 0, purposeCode: "Oman export remittance", exemption: true, note: "Omani Rial clearing via CBU; no withholding on foreign-service export." },
];
const omrBanks: RegulatoryBank[] = [
  { id: "nbk-om", name: "National Bank of Oman", displayName: "NBO (Oman)", swiftCode: "NBOBOMRX", intermediaryUSD: 12, intermediaryMinUSD: 10, intermediaryMaxUSD: 16, localFeeDefault: 0, speed: "Fast", clearance: "CBU / Oman Clearing 1 day", localCurrency: "OMR" },
];

const kwdTiers: StatutoryTier[] = [
  { id: "kwd-export", name: "Export Services — Zero Tax", authority: "Kuwait Income Tax Decree Art. 3 & NBK Code 700", rate: 0, purposeCode: "Kuwait foreign inflow", exemption: true, note: "Kuwaiti Dinar settled via NBK; purpose code 700 for foreign-service remittance." },
];
const kwdBanks: RegulatoryBank[] = [
  { id: "nbk-kw", name: "National Bank of Kuwait", displayName: "NBK (Kuwait)", swiftCode: "NBOKKWKW", intermediaryUSD: 12, intermediaryMinUSD: 10, intermediaryMaxUSD: 16, localFeeDefault: 0, speed: "Fast", clearance: "NBK RTGS / ACH 1 day", localCurrency: "KWD" },
];

const bhdTiers: StatutoryTier[] = [
  { id: "bhd-export", name: "Export Services — Zero VAT", authority: "Bahrain VAT Law (zero-rated exports) & BIB Code 900", rate: 0, purposeCode: "Bahrain export remittance", exemption: true, note: "Bahraini Dinar cleared via BIB / B NHB; zero VAT on exported digital services." },
];
const bhdBanks: RegulatoryBank[] = [
  { id: "bib-bh", name: "Bahrain Islamic Bank", displayName: "BIB (Bahrain)", swiftCode: "BHBLBHBK", intermediaryUSD: 12, intermediaryMinUSD: 10, intermediaryMaxUSD: 16, localFeeDefault: 0, speed: "Fast", clearance: "BIB / B NHB clearing 1 day", localCurrency: "BHD" },
];

const qarTiers: StatutoryTier[] = [
  { id: "qar-export", name: "Export Services — VAT 0%", authority: "Qatar VAT Law Art. 10 & QNB Code 900", rate: 0, purposeCode: "Qatar export remittance", exemption: true, note: "Qatari Riyal settlement via QNB; zero VAT on exported services." },
];
const qarBanks: RegulatoryBank[] = [
  { id: "qnb-qa", name: "Qatar National Bank", displayName: "QNB (Qatar)", swiftCode: "QNBQQQHB", intermediaryUSD: 12, intermediaryMinUSD: 10, intermediaryMaxUSD: 16, localFeeDefault: 0, speed: "Fast", clearance: "QNB / QCHP 1 day", localCurrency: "QAR" },
];

const tndTiers: StatutoryTier[] = [
  { id: "tnd-export", name: "Export Services — Reduced Rate", authority: "Tunisia VAT Code Art. 14 & BCT Code 700", rate: 0, purposeCode: "Tunisia foreign service", exemption: true, note: "Tunisian Dinar cleared via BCT; reduced VAT on exported IT services." },
];
const tndBanks: RegulatoryBank[] = [
  { id: "bct-tn", name: "Central Bank of Tunisia", displayName: "BCT (Tunisia)", swiftCode: "BCTNTNTT", intermediaryUSD: 14, intermediaryMinUSD: 12, intermediaryMaxUSD: 18, localFeeDefault: 0, speed: "Standard", clearance: "BCT RTGS / ACH 1–2 days", localCurrency: "TND" },
];

const dzdTiers: StatutoryTier[] = [
  { id: "dzd-export", name: "Export Services — VAT Exempt", authority: "Algeria VAT Regime Art. 20 & BADR Code 700", rate: 0, purposeCode: "Algeria export remittance", exemption: true, note: "Algerian Dinar settled via BADR; VAT exemption on exported services." },
];
const dzdBanks: RegulatoryBank[] = [
  { id: "bad-za", name: "Banque de l'Agriculture et du Développement Rural", displayName: "BADR (Algeria)", swiftCode: "BADZADAL", intermediaryUSD: 16, intermediaryMinUSD: 14, intermediaryMaxUSD: 20, localFeeDefault: 0, speed: "Standard", clearance: "BADR / SATIM 2 days", localCurrency: "DZD" },
];

const lbpTiers: StatutoryTier[] = [
  { id: "lbp-export", name: "Foreign Inflow — No Withholding", authority: "Lebanon Tax Law Art. 11 & BDL Code 900", rate: 0, purposeCode: "BDL foreign inflow", exemption: true, note: "Lebanese Pound cleared via BDL correspondent; no withholding on foreign-service exports." },
];
const lbpBanks: RegulatoryBank[] = [
  { id: "bl-om", name: "Banque Libano-Française", displayName: "BLF (Lebanon)", swiftCode: "BLOMLEBB", intermediaryUSD: 18, intermediaryMinUSD: 15, intermediaryMaxUSD: 22, localFeeDefault: 0, speed: "Standard", clearance: "BDL clearing / SWIFT 2–3 days", localCurrency: "LBP" },
];


/* Global Expansion Wave 4 - Non-Euro Europe & Extended Frontier Corridors ------------------------------------------------
 * Euroized Montenegro (CBCG IPN) and Kosovo (CBK KIPS) settle USD->EUR at par with a 0.0% retail
 * spread (fees.json provider fxSpread 0). ICS-frontier markets clear via national ACH / RTGS rails.
 * --------------------------------------------------------------------------- */

const allTiers: StatutoryTier[] = [
  { id: "all-export", name: "Export Services \u2014 VAT Exempt", authority: "Ligji p\u00ebr TVSH nr. 92/2014 Art. 59", rate: 0, purposeCode: "Export of services", exemption: true, note: "0% VAT on exported digital/IT services; AIPS settlement via the Bank of Albania." },
  { id: "all-se", name: "Self-Employment Advance", authority: "Ligji p\u00ebr Tatimin mbi t\u00eb Ardhurat Art. 15", rate: 0.15, purposeCode: "Freelance income", note: "15% taxing rate on income from self-employment; cleared via Bank of Albania AIPS." },
];
const allBanks: RegulatoryBank[] = [
  { id: "bkt", name: "Banka Komb\u00ebtare Tregtare", displayName: "BKT (Albania)", swiftCode: "BKTBALTR", intermediaryUSD: 15, intermediaryMinUSD: 13, intermediaryMaxUSD: 18, localFeeDefault: 200, speed: "Fast", clearance: "AIPS RTGS (Bank of Albania) / ACH", localCurrency: "ALL" },
];

const mkdTiers: StatutoryTier[] = [
  { id: "mkd-export", name: "Export Services \u2014 VAT 0%", authority: "ZDDV Art. 30 (exports)", rate: 0, purposeCode: "MKD export", exemption: true, note: "Zero-rated export of digital services; MIPS clearing via NBRM." },
  { id: "mkd-pit", name: "Flat PIT 10%", authority: "Zakon za danok na lichniot dohod Art. 8", rate: 0.1, purposeCode: "Service income", note: "Flat 10% tax on self-employment income; MIPS (NBRM) instant settlement." },
];
const mkdBanks: RegulatoryBank[] = [
  { id: "komsk", name: "Komercijalna banka ad Skopje", displayName: "Komercijalna banka (North Macedonia)", swiftCode: "KOBSMK2X", intermediaryUSD: 15, intermediaryMinUSD: 13, intermediaryMaxUSD: 18, localFeeDefault: 120, speed: "Fast", clearance: "MIPS / RTGS (NBRM)", localCurrency: "MKD" },
];

const mdlTiers: StatutoryTier[] = [
  { id: "mdl-export", name: "Export Services \u2014 VAT 0%", authority: "Codul fiscal Art. 104 (zero VAT on exports)", rate: 0, purposeCode: "MDL export", exemption: true, note: "0% VAT on exported services; NBM RTGS settlement." },
  { id: "mdl-cas", name: "Flat Income 12%", authority: "Codul fiscal Art. 15", rate: 0.12, purposeCode: "Prestation of services", note: "12% income tax on self-employment; verify micro-enterprise regime before invoicing." },
];
const mdlBanks: RegulatoryBank[] = [
  { id: "maib", name: "moldova-agroindbank (MAIB)", displayName: "MAIB (Moldova)", swiftCode: "AGRNMD2X", intermediaryUSD: 17, intermediaryMinUSD: 15, intermediaryMaxUSD: 20, localFeeDefault: 50, speed: "Standard", clearance: "NBM RTGS / Interbank clearing", localCurrency: "MDL" },
];

const meEurTiers: StatutoryTier[] = [
  { id: "me-eur-par", name: "Euroized \u2014 0.0% USD\u2192EUR FX Spread", authority: "CBCG (Central Bank of Montenegro)", rate: 0, purposeCode: "EUR par settlement", exemption: true, note: "Montenegro uses EUR as legal tender; incoming USD\u2192EUR conversion settles at par with a 0.0% retail spread \u2014 only intermediary wire deductions apply." },
  { id: "me-cit", name: "Income / Corporate Tax 15%", authority: "Zakon o porezu na dohodak gra\u0111ana & Zakon o porezu na dobit", rate: 0.15, purposeCode: "Service income", note: "15% income/corporate tax; resident freelancers report worldwide income, foreign-source remittances held at par." },
];
const meEurBanks: RegulatoryBank[] = [
  { id: "ckb", name: "Crnogorska komercijalna banka ad (NLB Group)", displayName: "CKB (Montenegro)", swiftCode: "CKBCMEPG", intermediaryUSD: 16, intermediaryMinUSD: 14, intermediaryMaxUSD: 19, localFeeDefault: 0, speed: "Fast", clearance: "CBCG RTGS / IPN \u2014 EUR par settlement", localCurrency: "EUR" },
];

const xkEurTiers: StatutoryTier[] = [
  { id: "xk-eur-par", name: "Euroized \u2014 0.0% USD\u2192EUR FX Spread", authority: "CBK (Central Bank of Kosovo)", rate: 0, purposeCode: "EUR par settlement", exemption: true, note: "Kosovo unilaterally adopted EUR; incoming USD\u2192EUR conversion at par with a 0.0% retail spread \u2014 intermediary wire deductions still apply." },
  { id: "xk-pit", name: "PIT 10%", authority: "Ligji p\u00ebr Tatimin n\u00eb t\u00eb Ardhurat Personale Art. 14", rate: 0.1, purposeCode: "Service income", note: "10% tax on income above the annual threshold; KIPS clearing via CBK." },
];
const xkEurBanks: RegulatoryBank[] = [
  { id: "rbko", name: "Raiffeisen Bank Kosova", displayName: "Raiffeisen (Kosovo)", swiftCode: "RBKOXKPR", intermediaryUSD: 18, intermediaryMinUSD: 15, intermediaryMaxUSD: 21, localFeeDefault: 0, speed: "Fast", clearance: "KIPS Clearing (CBK) \u00b7 EUR par settlement", localCurrency: "EUR" },
];

const iskTiers: StatutoryTier[] = [
  { id: "isk-export", name: "Export Services \u2014 VAT 0%", authority: "VSK nr. 163/2024 (0% export VAT)", rate: 0, purposeCode: "ISK export", exemption: true, note: "Zero-rated export of services; SEPA-mirrored Iceland clearing." },
  { id: "isk-pit", name: "Progressive PIT", authority: "L\u00f6g um tekjuskatt nr. 90/2003", rate: 0.16, purposeCode: "Service income", note: "16% base rate plus municipal surcharge; foreign-source remittances assessable for residents." },
];
const iskBanks: RegulatoryBank[] = [
  { id: "landsb", name: "Landsbankinn hf.", displayName: "Landsbankinn (Iceland)", swiftCode: "LAISISRE", intermediaryUSD: 14, intermediaryMinUSD: 12, intermediaryMaxUSD: 16, localFeeDefault: 150, speed: "Fast", clearance: "SEPA credit / Iceland Clearing House", localCurrency: "ISK" },
];

const gydTiers: StatutoryTier[] = [
  { id: "gyd-export", name: "Export Services \u2014 VAT 0%", authority: "Guyana VAT Act Art. 46 (zero-rated exports)", rate: 0, purposeCode: "GYD export", exemption: true, note: "0% VAT on exported services; Bank of Guyana ACH settlement." },
  { id: "gyd-cit", name: "Corporate Income Tax 25%", authority: "Income Tax Act Cap. 81:01", rate: 0.25, purposeCode: "Service income", note: "25% corporate income tax for companies; remittance treated as income when resident-engaged." },
];
const gydBanks: RegulatoryBank[] = [
  { id: "rbgy", name: "Republic Bank Guyana", displayName: "Republic Bank (Guyana)", swiftCode: "RBGLGYGG", intermediaryUSD: 22, intermediaryMinUSD: 19, intermediaryMaxUSD: 25, localFeeDefault: 0, speed: "Standard", clearance: "Bank of Guyana ACH / RTGS", localCurrency: "GYD" },
];

const srdTiers: StatutoryTier[] = [
  { id: "srd-export", name: "Export Services \u2014 outside VAT scope", authority: "Surinamese VAT Act (2023)", rate: 0, purposeCode: "SRD export", exemption: true, note: "Suriname VAT 10%; exported services generally outside scope \u2014 Surclear clearing." },
  { id: "srd-pit", name: "Progressive Income Tax", authority: "Wet Inkomstenbelasting Suriname", rate: 0.1, purposeCode: "Service income", note: "Progressive PIT up to 45%; foreign-earned digital income assessed for resident taxpayers." },
];
const srdBanks: RegulatoryBank[] = [
  { id: "rbnk", name: "Republic Bank Suriname NV", displayName: "Republic Bank (Suriname)", swiftCode: "RBNKSRPA", intermediaryUSD: 22, intermediaryMinUSD: 19, intermediaryMaxUSD: 26, localFeeDefault: 0, speed: "Standard", clearance: "Surclear Clearing / CBvS ACH", localCurrency: "SRD" },
];

const bzdTiers: StatutoryTier[] = [
  { id: "bzd-export", name: "Export Services \u2014 GST 0%", authority: "Belize GST Act Part III (zero-rated exports)", rate: 0, purposeCode: "BZD export", exemption: true, note: "0% GST on exported services; Belize dollar pegged 2:1 to USD." },
  { id: "bzd-peg", name: "Currency-Board Peg 2:1", authority: "Central Bank of Belize", rate: 0, purposeCode: "BZD peg \u00b7 USD 2:1", note: "BZD is pegged 2.00/USD with a currency-board reserve \u2014 retail USD\u2194BZD spreads are ~0%." },
];
const bzdBanks: RegulatoryBank[] = [
  { id: "bblz", name: "Belize Bank Limited", displayName: "Belize Bank", swiftCode: "BBLZBZBZ", intermediaryUSD: 18, intermediaryMinUSD: 15, intermediaryMaxUSD: 21, localFeeDefault: 0, speed: "Fast", clearance: "CBB ACH / RTGS (2:1 peg)", localCurrency: "BZD" },
];

const szlTiers: StatutoryTier[] = [
  { id: "szl-export", name: "Export Services \u2014 no employee tax", authority: "Eswatini VAT Act 2018 \u00a7 6(3)", rate: 0, purposeCode: "SZL export", exemption: true, note: "Eswatini has no general personal income tax on individuals; exports zero-rated under the VAT Act." },
  { id: "szl-cit", name: "Corporate Income Tax", authority: "Income Tax Order 1975", rate: 0.275, purposeCode: "Service income", note: "27.5% corporate rate; SADC-RTGS settlement via CBE." },
];
const szlBanks: RegulatoryBank[] = [
  { id: "sbiec", name: "Standard Bank Eswatini", displayName: "Standard Bank (Eswatini)", swiftCode: "SBICSZMX", intermediaryUSD: 19, intermediaryMinUSD: 16, intermediaryMaxUSD: 22, localFeeDefault: 20, speed: "Standard", clearance: "SADC-RTGS \u00b7 CBE EFT (Clearing)", localCurrency: "SZL" },
];

const lslTiers: StatutoryTier[] = [
  { id: "lsl-export", name: "Export Services \u2014 VAT 0%", authority: "Lesotho VAT Act 2009 (exports zero-rated)", rate: 0, purposeCode: "LSL export", exemption: true, note: "Exported services zero-rated; Lesotho Loti pegs 1:1 to ZAR \u2014 SADC-RTGS clearing." },
  { id: "lsl-pit", name: "PIT Progressive", authority: "Income Tax Act 1993 (Lesotho)", rate: 0.1, purposeCode: "Service income", note: "Individuals taxed above M 45,000 threshold (~10\u201325%); foreign income assessable for residents." },
];
const lslBanks: RegulatoryBank[] = [
  { id: "fnbls", name: "First National Bank Lesotho", displayName: "FNB (Lesotho)", swiftCode: "FIRNLSMX", intermediaryUSD: 19, intermediaryMinUSD: 16, intermediaryMaxUSD: 22, localFeeDefault: 20, speed: "Standard", clearance: "SADC-RTGS \u00b7 CBL EFT (Clearing)", localCurrency: "LSL" },
];

/**
 * The authored literal shape. The four Phase 2 projections (`localSettlementRail`,
 * `field71A`, `taxPurposeCodes`, `intermediaryTransitCuts`) are deliberately
 * excluded: they are derived from the corridor's own currency and banks inside
 * `getRegulatoryBanking()` rather than hand-written, so they cannot drift out of
 * sync with the rails table or the audited bank bands.
 */
export type AuthoredRegulation = Omit<
  CorridorRegulation,
  "localSettlementRail" | "field71A" | "taxPurposeCodes" | "intermediaryTransitCuts"
>;

const AUTHORED: Record<string, AuthoredRegulation> = {
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
  "usd-to-dop": {
    slug: "usd-to-dop",
    authority: "DGII · Ley 111 de Impuesto sobre la Renta (Régimen 1060)",
    clearingNetwork: "ACH Dominicano / SEM",
    citations: [
      "DIAN Form 1060 · Ingresos del exterior",
      "Ley 111 Art. 28 (escala progresiva)",
      "Ley 488 Art. 346 (ITBIS exportación de servicios)",
    ],
    banks: dopBanks,
    tiers: dopTiers,
    generic: false,
  },
  "usd-to-gtq": {
    slug: "usd-to-gtq",
    authority: "SAT Guatemala · Decreto 12-2002 (ISR) & Decreto 37-92 (ITBIS)",
    clearingNetwork: "STP Interbancario",
    citations: [
      "Decreto 12-2002 Ley del ISR · escala personas naturales",
      "Decreto 37-92 Ley del ITBIS · Art. 26 (exención exportaciones)",
      "SAT declaración anual de renta",
    ],
    banks: gtqBanks,
    tiers: gtqTiers,
    generic: false,
  },
  "usd-to-pab": {
    slug: "usd-to-pab",
    authority: "Ley 69 de 1984 (régimen territorial) · Banco Nacional de Panamá",
    clearingNetwork: "ACH Interbancario",
    citations: [
      "Ley 69 de 1984 · rentas de fuente externa exentas",
      "Ley 47 de 2003 · ITBMS (operaciones exentas)",
      "ACH Panamá · caja de compensación USD",
    ],
    banks: pabBanks,
    tiers: pabTiers,
    generic: false,
  },
  "usd-to-ec-usd": {
    slug: "usd-to-ec-usd",
    authority: "SRI · Ley para el Desarrollo Económico y la Sostenibilidad Fiscal (2023)",
    clearingNetwork: "ACH BCE Transferencias",
    citations: [
      "Ley de Desarrollo Económico 2023 · ingresos del exterior exentos",
      "Ley del Régimen Tributario Interno · IVA exportación servicios 0%",
      "BCE instrucciones operativas de transferencias",
    ],
    banks: ecBanks,
    tiers: ecTiers,
    generic: false,
  },
  "usd-to-bob": {
    slug: "usd-to-bob",
    authority: "SIN Bolivia · Ley 843 (régimen 10% de personas naturales)",
    clearingNetwork: "ACH BCB Interbancario",
    citations: [
      "Ley 843 Art. 45 (régimen 10%)",
      "Ley 843 Art. 52 (IT — exportaciones exentas)",
      "BCB transferencias interbancarias",
    ],
    banks: bobBanks,
    tiers: bobTiers,
    generic: false,
  },
  "usd-to-pyg": {
    slug: "usd-to-pyg",
    authority: "DNIT Paraguay · Ley 1259/98 (IRAGA) & Ley 1341/99 (CTN)",
    clearingNetwork: "DECEP / CENDEE",
    citations: [
      "Ley 1259/98 Art. 5 (renta de fuente extranjera)",
      "Ley 1341/99 Art. 69 (exportación de servicios)",
      "DECEP caja de compensación · tipo de cambio BCN",
    ],
    banks: pygBanks,
    tiers: pygTiers,
    generic: false,
  },
  "usd-to-jmd": {
    slug: "usd-to-jmd",
    authority: "TAJ Jamaica · Income Tax Act & GCT Act",
    clearingNetwork: "BOJ RTGS",
    citations: [
      "Income Tax Act · escalas graduadas residentes",
      "GCT Act s.13 (zero-rating servicios exportados)",
      "BOJ Real-Time Gross Settlement",
    ],
    banks: jmdBanks,
    tiers: jmdTiers,
    generic: false,
  },
  "usd-to-ttd": {
    slug: "usd-to-ttd",
    authority: "Board of Inland Revenue · Income Tax Act Ch. 75:01",
    clearingNetwork: "Interbank Payment System",
    citations: [
      "Income Tax Act Ch. 75:01 · escala individuos",
      "VAT Act · zero-rating servicios exportados",
      "Interbank Payment System (IPS) clearing",
    ],
    banks: ttdBanks,
    tiers: ttdTiers,
    generic: false,
  },
  "usd-to-hnl": {
    slug: "usd-to-hnl",
    authority: "SAR Honduras · D.S. 152-2002 (ISR) & D.S. 158-2002 (ISV)",
    clearingNetwork: "ACH Interbancario",
    citations: [
      "D.S. 152-2002 Ley del ISR · servicios",
      "D.S. 158-2002 Ley del ISV · exportación exenta",
      "Banco Central de Honduras · transferencias ACH",
    ],
    banks: hnlBanks,
    tiers: hnlTiers,
    generic: false,
  },
  "usd-to-sv-usd": {
    slug: "usd-to-sv-usd",
    authority: "Ministerio de Hacienda de El Salvador · ISR & IVA",
    clearingNetwork: "BCRD Transferencias",
    citations: [
      "Ley de Impuesto sobre la Renta · personas actividad económica",
      "Ley del IVA · exportación de servicios al 0%",
      "Banco Central de Reserva · ACH en USD",
    ],
    banks: svBanks,
    tiers: svTiers,
    generic: false,
  },
  "usd-to-nio": {
    slug: "usd-to-nio",
    authority: "DGII Nicaragua · Ley 475 (Renta) & Ley 405 (IVA)",
    clearingNetwork: "BCR Transferencias",
    citations: [
      "Ley 475 · personas con actividad económica",
      "Ley 405 · IVA exportación de servicios",
      "Banco Central de Reserva · ACH NIO",
    ],
    banks: nioBanks,
    tiers: nioTiers,
    generic: false,
  },
  "usd-to-bsd": {
    slug: "usd-to-bsd",
    authority: "Commonwealth of The Bahamas · no income tax (currency board peg)",
    clearingNetwork: "Interbank ACH (BSD)",
    citations: [
      "Bahamas · no PIT / no withholding statute",
      "Central Bank of The Bahamas · BSD peg 1:1 USD",
      "Interbank ACH clearing house",
    ],
    banks: bsdBanks,
    tiers: bsdTiers,
    generic: false,
  },
  "usd-to-bbd": {
    slug: "usd-to-bbd",
    authority: "Barbados Revenue Authority · Income Tax Act & VAT Act",
    clearingNetwork: "Barbados Clearing House",
    citations: [
      "Income Tax Act · escalas 12.5/28/33.75%",
      "VAT Act · zero-rating servicios exportados",
      "Barbados Clearing House · ACH BBD",
    ],
    banks: bbdBanks,
    tiers: bbdTiers,
    generic: false,
  },
  "usd-to-uzs": {
    slug: "usd-to-uzs",
    authority: "State Tax Committee · Tax Code of the Republic of Uzbekistan",
    clearingNetwork: "FISS Interbank RTGS",
    citations: [
      "Tax Code · PIT 12% residentes",
      "Tax Code · exportación servicios IVA 0%",
      "Uzbekistan FISS · transferencias UzCard",
    ],
    banks: uzsBanks,
    tiers: uzsTiers,
    generic: false,
  },
  "usd-to-khr": {
    slug: "usd-to-khr",
    authority: "General Department of Taxation · Law on Taxation (Kampuchea)",
    clearingNetwork: "NBC RTGS / Bakong",
    citations: [
      "Law on Taxation · profession income PIT 20%",
      "Law on VAT · exportación servicios 0%",
      "Bakong / KHQR instant payments",
    ],
    banks: khrBanks,
    tiers: khrTiers,
    generic: false,
  },
  "usd-to-mnt": {
    slug: "usd-to-mnt",
    authority: "General Administration of Taxation · Law on Personal Income Taxes",
    clearingNetwork: "IPS Interbank Transfer",
    citations: [
      "Law on Personal Income Taxes · PIT 10%",
      "Law on VAT · servicios exportados 0%",
      "Mongolia IPS · clearing MNT",
    ],
    banks: mntBanks,
    tiers: mntTiers,
    generic: false,
  },
  "usd-to-amd": {
    slug: "usd-to-amd",
    authority: "State Revenue Committee · RA Tax Code",
    clearingNetwork: "CBA Interbank / ArCa",
    citations: [
      "RA Tax Code · PIT 20% residentes",
      "RA Tax Code · exportación servicios IVA 0%",
      "CBA transferencias · ArCa clearing",
    ],
    banks: amdBanks,
    tiers: amdTiers,
    generic: false,
  },
  "usd-to-azn": {
    slug: "usd-to-azn",
    authority: "State Tax Service · Tax Code of the Republic of Azerbaijan",
    clearingNetwork: "AZIPS RTGS",
    citations: [
      "Tax Code · PIT 14% (banda inicial)",
      "Tax Code · IVA 18% exportación servicios 0%",
      "AZIPS interbank RTGS",
    ],
    banks: aznBanks,
    tiers: aznTiers,
    generic: false,
  },
  "usd-to-kgs": {
    slug: "usd-to-kgs",
    authority: "State Tax Service · Tax Code of the Kyrgyz Republic",
    clearingNetwork: "IPS Interbank Transfer",
    citations: [
      "Tax Code · PIT 10% residentes",
      "Tax Code · IVA 12% exportación servicios 0%",
      "Kyrgyz IPS · ElCard clearing",
    ],
    banks: kgsBanks,
    tiers: kgsTiers,
    generic: false,
  },
  "usd-to-tjs": {
    slug: "usd-to-tjs",
    authority: "Tax Committee · Tax Code of the Republic of Tajikistan",
    clearingNetwork: "NBT Interbank RTGS",
    citations: [
      "Tax Code · PIT 12% residentes (escala)",
      "Tax Code · IVA 18% exportación servicios 0%",
      "NBT interbank RTGS · clearing electrónico",
    ],
    banks: tjsBanks,
    tiers: tjsTiers,
    generic: false,
  },
  "usd-to-mvr": {
    slug: "usd-to-mvr",
    authority: "MIRA Maldives · no personal income tax (GST regime only)",
    clearingNetwork: "IPS Interbank Payment System",
    citations: [
      "MIRA · sin impuesto a la renta personal",
      "GST Act 2011 · servicios offshore fuera del alcance",
      "Maldives IPS · clearing MVR",
    ],
    banks: mvrBanks,
    tiers: mvrTiers,
    generic: false,
  },
  "usd-to-bnd": {
    slug: "usd-to-bnd",
    authority: "Brunei · no personal income tax (Ministry of Finance & Economy)",
    clearingNetwork: "AMBD Interbank Clearing",
    citations: [
      "Brunei · sin PIT para personas naturales",
      "Royal Customs & Excise · sin IVA/GST",
      "AMBD interbank clearing · T+1",
    ],
    banks: bndBanks,
    tiers: bndTiers,
    generic: false,
  },
  "usd-to-lak": {
    slug: "usd-to-lak",
    authority: "Ministry of Finance & Planning · Law on Income Tax (Laos)",
    clearingNetwork: "Interbank ACH Clearing",
    citations: [
      "Law on Income Tax · escala progresiva 0–25%",
      "Law on Tax on Goods & Services · exportación 0%",
      "Banco de Laos · ACH LAK",
    ],
    banks: lakBanks,
    tiers: lakTiers,
    generic: false,
  },
  "usd-to-btn": {
    slug: "usd-to-btn",
    authority: "Department of Revenue & Customs · Income Tax Act 2001 (Bhutan)",
    clearingNetwork: "RMA Interbank Clearing",
    citations: [
      "Income Tax Act 2001 · escala personal 0–25%",
      "Bhutan · sin GST/VAT sobre servicios",
      "RMA interbank clearing · BTN peg INR",
    ],
    banks: btnBanks,
    tiers: btnTiers,
    generic: false,
  },
  "usd-to-fjd": {
    slug: "usd-to-fjd",
    authority: "FRCA Fiji · Income Tax Act 1974 & VAT Act 1991",
    clearingNetwork: "RBF RTGS / ACH",
    citations: [
      "Income Tax Act 1974 · resident tax 18–20%",
      "VAT Act 1991 · exportación servicios 0%",
      "RBF RTGS · ACH clearing FJD",
    ],
    banks: fjdBanks,
    tiers: fjdTiers,
    generic: false,
  },
  "usd-to-pgk": {
    slug: "usd-to-pgk",
    authority: "Internal Revenue Commission · Income Tax Act 1989 (PNG)",
    clearingNetwork: "BPNG Clearing",
    citations: [
      "Income Tax Act 1989 · escala personal 0–42%",
      "VGST · exportación servicios 0%",
      "BPNG interbank clearing · PGK",
    ],
    banks: pgkBanks,
    tiers: pgkTiers,
    generic: false,
  },
  "usd-to-wst": {
    slug: "usd-to-wst",
    authority: "Samoa Inland Revenue · Income Tax Act & VAT Act",
    clearingNetwork: "Central Bank of Samoa ACH",
    citations: [
      "Income Tax Act · escala residente progresiva",
      "VAT Act · servicios exportados 0%",
      "CBS clearing · ACH WST",
    ],
    banks: wstBanks,
    tiers: wstTiers,
    generic: false,
  },
  "usd-to-top": {
    slug: "usd-to-top",
    authority: "Ministry of Revenue · Income Tax Act (Tonga)",
    clearingNetwork: "NRBT Clearing",
    citations: [
      "Income Tax Act · escala personal con umbral exento",
      "Tonga · servicios offshore sin IVA aplicable",
      "NRBT clearing · TOP",
    ],
    banks: topBanks,
    tiers: topTiers,
    generic: false,
  },
  "usd-to-vuv": {
    slug: "usd-to-vuv",
    authority: "Vanuatu Taxation Office · no income tax (VAT Act 1998)",
    clearingNetwork: "RBV Clearing",
    citations: [
      "Vanuatu · sin PIT ni capital gains tax",
      "VAT Act 1998 · servicios offshore fuera del alcance",
      "Reserve Bank of Vanuatu clearing · VUV",
    ],
    banks: vuvBanks,
    tiers: vuvTiers,
    generic: false,
  },
  "usd-to-sbd": {
    slug: "usd-to-sbd",
    authority: "Inland Revenue Division · Income Tax Act & GST Act (Solomon Islands)",
    clearingNetwork: "CBSI Clearing",
    citations: [
      "Income Tax Act · escala residente 0–40%",
      "GST Act · servicios exportados 0%",
      "CBSI clearing · SBD",
    ],
    banks: sbdBanks,
    tiers: sbdTiers,
    generic: false,
  },
  "usd-to-mur": {
    slug: "usd-to-mur",
    authority: "Mauritius Revenue Authority · no personal income tax (VAT Act)",
    clearingNetwork: "MIBOS RTGS",
    citations: [
      "MRA · sin impuesto a la renta personal",
      "VAT Act · exportación servicios 0%",
      "MIBOS interbank RTGS · MUR",
    ],
    banks: murBanks,
    tiers: murTiers,
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
  "usd-to-etb": { slug: "usd-to-etb", authority: "ERCA / CBE · Ethiopia Tax Proclamation", clearingNetwork: "CBE RTGS / ACH", citations: ["ERCA VAT Directive", "Income Tax Proclamation Art. 58"], banks: etbBanks, tiers: etbTiers, generic: false },
  "usd-to-xaf": { slug: "usd-to-xaf", authority: "CEMAC VAT / BEAC · Cameroon", clearingNetwork: "BEAC RTGS / ACH", citations: ["CEMAC VAT Regime Art. 13", "BEAC Clearing"], banks: xafBanks, tiers: xafTiers, generic: false },
  "usd-to-xof": { slug: "usd-to-xof", authority: "UEMOA VAT / BCEAO · Senegal", clearingNetwork: "BCEAO RTGS / ACH", citations: ["UEMOA VAT Art. 12", "BCEAO Clearing"], banks: xofBanks, tiers: xofTiers, generic: false },
  "usd-to-bwp": { slug: "usd-to-bwp", authority: "BURS VAT · Botswana", clearingNetwork: "BOB RTGS / ACH", citations: ["BURS VAT Act", "Bank of Botswana Clearing"], banks: bwpBanks, tiers: bwpTiers, generic: false },
  "usd-to-nad": { slug: "usd-to-nad", authority: "NamRA VAT / Bank of Namibia · Namibia", clearingNetwork: "NAMRTGS / ACH", citations: ["NamRA VAT Art. 12", "Bank of Namibia Clearing"], banks: nadBanks, tiers: nadTiers, generic: false },
  "usd-to-mzn": { slug: "usd-to-mzn", authority: "Mozambique VAT / BNM · Mozambique", clearingNetwork: "BM RTGS / ACH", citations: ["Mozambique VAT Code Art. 15", "Banco de Moçambique Clearing"], banks: mznBanks, tiers: mznTiers, generic: false },
  "usd-to-mwk": { slug: "usd-to-mwk", authority: "MRA VAT / RBM · Malawi", clearingNetwork: "RBM RTGS / ACH", citations: ["MRA VAT Act", "Reserve Bank of Malawi Clearing"], banks: mwkBanks, tiers: mwkTiers, generic: false },
  "usd-to-aoa": { slug: "usd-to-aoa", authority: "AGT VAT / BNA · Angola", clearingNetwork: "BNA RTGS", citations: ["AGT VAT Code", "Banco Nacional de Angola Clearing"], banks: aoaBanks, tiers: aoaTiers, generic: false },
  "usd-to-mga": { slug: "usd-to-mga", authority: "DGI VAT / BAM · Madagascar", clearingNetwork: "BAM RTGS / ACH", citations: ["DGI VAT Act", "Bank of Madagascar Clearing"], banks: mgaBanks, tiers: mgaTiers, generic: false },
  "usd-to-jod": { slug: "usd-to-jod", authority: "Jordan Income Tax / BITS · Jordan", clearingNetwork: "BITS / JOCC", citations: ["Income Tax Law Art. 12", "BITS Code 1300"], banks: jodBanks, tiers: jodTiers, generic: false },
  "usd-to-omr": { slug: "usd-to-omr", authority: "Oman Tax / CBU · Oman", clearingNetwork: "CBU / Oman Clearing", citations: ["Oman Income Tax Art. 8", "CBU Clearing"], banks: omrBanks, tiers: omrTiers, generic: false },
  "usd-to-kwd": { slug: "usd-to-kwd", authority: "Kuwait Tax / NBK · Kuwait", clearingNetwork: "NBK RTGS / ACH", citations: ["Kuwait Income Tax Decree", "NBK Code 700"], banks: kwdBanks, tiers: kwdTiers, generic: false },
  "usd-to-bhd": { slug: "usd-to-bhd", authority: "Bahrain VAT / BIB · Bahrain", clearingNetwork: "BIB / B NHB", citations: ["Bahrain VAT Law", "BIB Clearing"], banks: bhdBanks, tiers: bhdTiers, generic: false },
  "usd-to-qar": { slug: "usd-to-qar", authority: "Qatar VAT / QNB · Qatar", clearingNetwork: "QNB / QCHP", citations: ["Qatar VAT Art. 10", "QNB Clearing"], banks: qarBanks, tiers: qarTiers, generic: false },
  "usd-to-tnd": { slug: "usd-to-tnd", authority: "Tunisia VAT / BCT · Tunisia", clearingNetwork: "BCT RTGS / ACH", citations: ["Tunisia VAT Art. 14", "BCT Clearing"], banks: tndBanks, tiers: tndTiers, generic: false },
  "usd-to-dzd": { slug: "usd-to-dzd", authority: "Algeria VAT / BADR · Algeria", clearingNetwork: "BADR / SATIM", citations: ["Algeria VAT Art. 20", "BADR Clearing"], banks: dzdBanks, tiers: dzdTiers, generic: false },
  "usd-to-lbp": { slug: "usd-to-lbp", authority: "Lebanon Tax / BDL · Lebanon", clearingNetwork: "BDL clearing / SWIFT", citations: ["Lebanon Tax Art. 11", "BDL Code 900"], banks: lbpBanks, tiers: lbpTiers, generic: false },
  "usd-to-all": { slug: "usd-to-all", authority: "Banka e Shqipërisë · Ligji për TVSH nr. 92/2014", clearingNetwork: "AIPS RTGS (Bank of Albania) / ACH", citations: ["TVSH Art. 59 export exemption", "PIT Art. 15 flat 15%", "AIPS instant (Bank of Albania)"], banks: allBanks, tiers: allTiers, generic: false },
  "usd-to-mkd": { slug: "usd-to-mkd", authority: "NBRM · Zakon za danok na lichniot dohod", clearingNetwork: "MIPS / RTGS (NBRM)", citations: ["ZDDV Art. 30 exports", "PIT Art. 8 flat 10%", "MIPS instant clearing"], banks: mkdBanks, tiers: mkdTiers, generic: false },
  "usd-to-mdl": { slug: "usd-to-mdl", authority: "BNM — Codul fiscal", clearingNetwork: "NBM RTGS / Interbank clearing", citations: ["Codul fiscal Art. 104 exports", "Codul fiscal Art. 15 flat 12%", "NBM RTGS"], banks: mdlBanks, tiers: mdlTiers, generic: false },
  "usd-to-me-eur": { slug: "usd-to-me-eur", authority: "CBCG · Zakon o porezu na dohodak građana", clearingNetwork: "CBCG RTGS / IPN — EUR par settlement", citations: ["PIT 15% (građani)", "EUR legal tender", "0.0% retail spread"], banks: meEurBanks, tiers: meEurTiers, generic: false, retailSpreadPercent: 0 },
  "usd-to-xk-eur": { slug: "usd-to-xk-eur", authority: "CBK · Ligji për Tatimin në të Ardhurat Personale", clearingNetwork: "KIPS Clearing (CBK) · EUR par settlement", citations: ["PIT Art. 14 10%", "EUR unilateral adoption", "0.0% retail spread"], banks: xkEurBanks, tiers: xkEurTiers, generic: false, retailSpreadPercent: 0 },
  "usd-to-isk": { slug: "usd-to-isk", authority: "Ríkisskattstjóri · lög um tekjuskatt nr. 90/2003", clearingNetwork: "SEPA credit / Iceland Clearing House", citations: ["VSK nr. 163/2024 exports", "Tekjuskattur nr. 90/2003", "SEPA-mirrored Iceland"], banks: iskBanks, tiers: iskTiers, generic: false },
  "usd-to-gyd": { slug: "usd-to-gyd", authority: "Guyana Revenue Authority · Income Tax Act", clearingNetwork: "Bank of Guyana ACH / RTGS", citations: ["VAT Act Art. 46 exports", "Income Tax Act Cap. 81:01", "BoG ACH"], banks: gydBanks, tiers: gydTiers, generic: false },
  "usd-to-srd": { slug: "usd-to-srd", authority: "CBvS · Wet Inkomstenbelasting Suriname", clearingNetwork: "Surclear Clearing / CBvS ACH", citations: ["VAT Act 2023 services", "Income Tax non-resident", "Surclear ACH"], banks: srdBanks, tiers: srdTiers, generic: false },
  "usd-to-bzd": { slug: "usd-to-bzd", authority: "Central Bank of Belize · GST Act", clearingNetwork: "CBB ACH / RTGS (2:1 peg)", citations: ["GST Part III exports", "2:1 currency-board peg", "CBB ACH/RTGS"], banks: bzdBanks, tiers: bzdTiers, generic: false },
  "usd-to-szl": { slug: "usd-to-szl", authority: "Central Bank of Eswatini · VAT Act 2018", clearingNetwork: "SADC-RTGS · CBE EFT (Clearing)", citations: ["VAT § 6(3) exports", "Income Tax Order 1975", "SADC-RTGS"], banks: szlBanks, tiers: szlTiers, generic: false },
  "usd-to-lsl": { slug: "usd-to-lsl", authority: "Central Bank of Lesotho · Income Tax Act 1993", clearingNetwork: "SADC-RTGS · CBL EFT (Clearing)", citations: ["VAT Act 2009 exports", "Income Tax Act 1993", "SADC-RTGS"], banks: lslBanks, tiers: lslTiers, generic: false },
};

/** Phase 9 — resolves the statutory regulation profile for any audited corridor slug. */
export function getRegulatoryBanking(slug: string): CorridorRegulation {
  const authored = AUTHORED[slug];
  if (authored) {
    return {
      ...authored,
      // Phase 2 — rail, 71A and the transit ladder are all derived from the
      // corridor's own destination currency and its own audited banks, so an
      // authored profile can never disagree with the rails table.
      localSettlementRail: railFor(destinationCurrency(authored.slug)),
      field71A: field71AFor(authored.banks[0]),
      taxPurposeCodes: purposeCodesFrom(authored.tiers),
      intermediaryTransitCuts: transitCutsFrom(authored.banks),
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
    localSettlementRail: railFor(fallback.currency),
    field71A: field71AFor(genericBanks[0]),
    taxPurposeCodes: purposeCodesFrom(fallbackTiers(network)),
    intermediaryTransitCuts: transitCutsFrom(genericBanks),
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