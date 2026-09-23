/**
 * PayoutDelta — Phase E "Multi-Milestone Invoicing & Year-End Tax Season
 * Remittance Ledger".
 *
 * Deterministic, framework-free remittance ledger. Every invoice the studio
 * saves becomes a `RemittanceRecord`: a durable, year-attributable receipt of
 * what was billed, what the platform / SWIFT corridor took in USD, at what
 * realized FX rate it landed, and the local take-home after the landing fee.
 * The records accumulate across the tax year so a freelancer can filter by
 * year, aggregate the annual totals their accountant needs, and export the
 * whole season as a spreadsheet-ready CSV.
 *
 * Zero-server promise (identical to the invoice studio): records persist only
 * to the visitor's own `localStorage` under `payoutdelta:remittance_ledger`
 * and never leave the device. Every browser-only API (localStorage, Blob,
 * URL.createObjectURL, document) lives behind a `typeof window === "undefined"`
 * guard or a caller-gated function, so this module stays importable during
 * the static-export prerender.
 *
 * Pure math + synchronous persistence, mirroring `lib/invoiceTypes.ts`.
 */

import type { Corridor } from "@/lib/types";
import type {
  CurrencyCode,
  InvoiceDraft,
  WireProtocol,
} from "@/lib/invoiceTypes";
import { grandTotal, parseAmount } from "@/lib/invoiceTypes";

/** localStorage key for the accumulated remittance ledger. */
export const LEDGER_STORAGE_KEY = "payoutdelta:remittance_ledger";

/** Realization status derived from the record's realized take-home. */
export type LedgerStatus = "Pending" | "Realized";

/**
 * Approximate USD→currency anchors used ONLY to aggregate non-USD origin
 * invoices into the annual `totalGrossUsd` / `totalDeductibleFeesUsd` KPIs.
 * These are indicative interbank mid-ranges (units of currency per 1 USD),
 * the same convention as `Corridor.rate` — not live quotes, and never used to
 * price a corridor (the live dataset owns that).
 */
export const USD_ANCHOR_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.8,
  CAD: 1.36,
  AUD: 1.52,
};

/**
 * Statutory citation per corridor slug — the short regulatory anchor printed
 * on the ledger row and its CSV export. Ties into `lib/prcLetterEngine.ts`
 * (SBP / RBI / BSP / LIVA / VAT purpose-code jurisdictions).
 */
const STATUTORY_CITATIONS: Record<string, string> = {
  "usd-to-pkr": "SBP PC 9111",
  "usd-to-inr": "RBI P0802",
  "usd-to-php": "BSP Cir. 980",
  "usd-to-mxn": "LIVA 29-D",
  "usd-to-pln": "VAT Art. 28b",
};

const DEFAULT_CITATION = "SWIFT MT103";

/** One saved, year-attributable remittance receipt. */
export interface RemittanceRecord {
  /** Opaque sortable id — timestamp base36 + randomness. */
  id: string;
  /** ISO date (`YYYY-MM-DD`) the record was saved into the ledger. */
  savedAt: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  /** Invoice currency the gross was billed in. */
  invoiceCurrency: CurrencyCode;
  /** Gross invoice total in `invoiceCurrency`. */
  grossAmount: number;
  /** Gross converted to USD via the anchor table (aggregation only). */
  grossUsd: number;
  /** Platform commission, USD (`grossUsd × platformPercent / 100`). */
  platformFeeUsd: number;
  /** Intermediary correspondent SWIFT cut, USD. */
  swiftCutUsd: number;
  /** Gross − platform fee − SWIFT cut, floored at 0, USD. */
  netUsd: number;
  /** Corridor slug the settlement lands on. */
  corridor: string;
  /** Target (local) currency of the corridor, e.g. "PKR". */
  targetCurrency: string;
  /** USD→local realized FX rate captured at save time. */
  appliedExchangeRate: number;
  /** `netUsd × appliedExchangeRate`, in `targetCurrency`. */
  convertedLocal: number;
  /** Local receiving-bank landing fee, in `targetCurrency`. */
  landingFeeLocal: number;
  /** `convertedLocal − landingFeeLocal`, floored at 0, in `targetCurrency`. */
  realizedTakeHome: number;
  /** SWIFT charge instruction captured on the invoice. */
  wireProtocol: WireProtocol;
  /** Short statutory anchor, e.g. "SBP PC 9111". */
  statutoryCitation: string;
}

/* ---------------------------------------------------------------------------
 * Money math — single source of truth for the ledger rows + annual summary.
 * ------------------------------------------------------------------------- */

/** Convert an invoice-currency amount to USD via the anchor table. */
export function usdEquivalent(amount: number, currency: CurrencyCode): number {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const anchor = USD_ANCHOR_RATES[currency] ?? 1;
  return safeAmount / anchor;
}

/** `usd-to-pkr` → `SBP PC 9111 · 9111` when a purpose code is present. */
export function statutoryCitationForCorridor(
  corridorSlug: string,
  purposeCode?: string
): string {
  const base = STATUTORY_CITATIONS[corridorSlug] ?? DEFAULT_CITATION;
  const code = (purposeCode ?? "").trim();
  return code !== "" ? `${base} · ${code}` : base;
}

/** Realized once a positive take-home landed at a usable FX rate. */
export function ledgerRecordStatus(record: RemittanceRecord): LedgerStatus {
  return record.realizedTakeHome > 0 && record.appliedExchangeRate > 0
    ? "Realized"
    : "Pending";
}

/** Opaque sortable id: millisecond timestamp base36 + randomness. */
export function createLedgerRecordId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `rem-${Date.now().toString(36)}-${random}`;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Project an invoice draft + its resolved corridor into a durable ledger
 * record. All settlement math happens here so the editor, the dashboard and
 * the CSV export can never disagree.
 */
export function buildLedgerRecordFromDraft(
  draft: InvoiceDraft,
  corridor: Corridor
): RemittanceRecord {
  const settlement = draft.settlement;
  const grossAmount = grandTotal(draft);
  const grossUsd = usdEquivalent(grossAmount, draft.meta.currency);
  const platformFeeUsd =
    grossUsd * (Math.min(100, Math.max(0, parseAmount(settlement.platformPercent))) / 100);
  const swiftCutUsd = Math.max(0, parseAmount(settlement.swiftCutUsd));
  const netUsd = Math.max(0, grossUsd - platformFeeUsd - swiftCutUsd);
  const appliedExchangeRate = Number.isFinite(corridor.rate) ? corridor.rate : 0;
  const convertedLocal = netUsd * appliedExchangeRate;
  const landingFeeLocal = Math.max(0, parseAmount(settlement.landingFeeLocal));
  const realizedTakeHome = Math.max(0, convertedLocal - landingFeeLocal);

  return {
    id: createLedgerRecordId(),
    savedAt: toISODate(new Date()),
    invoiceNumber: draft.meta.number,
    issueDate: draft.meta.issueDate,
    dueDate: draft.meta.dueDate,
    clientName:
      draft.identity.clientCompany.trim() !== ""
        ? draft.identity.clientCompany
        : draft.identity.clientName,
    invoiceCurrency: draft.meta.currency,
    grossAmount,
    grossUsd,
    platformFeeUsd,
    swiftCutUsd,
    netUsd,
    corridor: corridor.slug,
    targetCurrency: corridor.to,
    appliedExchangeRate,
    convertedLocal,
    landingFeeLocal,
    realizedTakeHome,
    wireProtocol: settlement.wireProtocol === "SHA" ? "SHA" : "OUR",
    statutoryCitation: statutoryCitationForCorridor(
      corridor.slug,
      draft.banking.purposeCode
    ),
  };
}

/* ---------------------------------------------------------------------------
 * localStorage persistence (client-only, guarded for SSR + malformed data).
 * ------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asCurrencyCode(value: unknown): CurrencyCode {
  const known: CurrencyCode[] = ["USD", "EUR", "GBP", "CAD", "AUD"];
  return known.some((code) => code === value) ? (value as CurrencyCode) : "USD";
}

/** Coerce a parsed JSON node into a record, or `null` when unusable. */
export function sanitizeLedgerRecord(parsed: unknown): RemittanceRecord | null {
  if (!isRecord(parsed)) return null;
  const id = asString(parsed.id, "").trim();
  const invoiceNumber = asString(parsed.invoiceNumber, "").trim();
  if (id === "" || invoiceNumber === "") return null;

  return {
    id,
    savedAt: asString(parsed.savedAt, ""),
    invoiceNumber,
    issueDate: asString(parsed.issueDate, ""),
    dueDate: asString(parsed.dueDate, ""),
    clientName: asString(parsed.clientName, ""),
    invoiceCurrency: asCurrencyCode(parsed.invoiceCurrency),
    grossAmount: asNumber(parsed.grossAmount, 0),
    grossUsd: asNumber(parsed.grossUsd, 0),
    platformFeeUsd: asNumber(parsed.platformFeeUsd, 0),
    swiftCutUsd: asNumber(parsed.swiftCutUsd, 0),
    netUsd: asNumber(parsed.netUsd, 0),
    corridor: asString(parsed.corridor, ""),
    targetCurrency: asString(parsed.targetCurrency, ""),
    appliedExchangeRate: asNumber(parsed.appliedExchangeRate, 0),
    convertedLocal: asNumber(parsed.convertedLocal, 0),
    landingFeeLocal: asNumber(parsed.landingFeeLocal, 0),
    realizedTakeHome: asNumber(parsed.realizedTakeHome, 0),
    wireProtocol: parsed.wireProtocol === "SHA" ? "SHA" : "OUR",
    statutoryCitation: asString(parsed.statutoryCitation, DEFAULT_CITATION),
  };
}

/** Read every saved ledger record, newest first. Client-only. */
export function getLedgerRecords(): RemittanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeLedgerRecord)
      .filter((record): record is RemittanceRecord => record !== null)
      .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  } catch {
    return [];
  }
}

/** Append a record to the ledger. Returns the persisted record. Client-only. */
export function addLedgerRecord(record: RemittanceRecord): RemittanceRecord {
  if (typeof window === "undefined") return record;
  try {
    const current = getLedgerRecords();
    const next = [record, ...current];
    window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(next));
    return record;
  } catch {
    // Quota exceeded / private browsing — record stays in memory only.
    return record;
  }
}

/** Remove one record by id. Client-only. */
export function deleteLedgerRecord(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = getLedgerRecords().filter((record) => record.id !== id);
    window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** Wipe the whole ledger (tax-season reset). Client-only. */
export function clearLedger(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEDGER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ---------------------------------------------------------------------------
 * Annual summary — the tax-season roll-up surfaced by the ledger dashboard.
 * ------------------------------------------------------------------------- */

export interface AnnualSummary {
  /** Number of records aggregated. */
  recordCount: number;
  /** Gross billed, converted to USD via the anchor table. */
  totalGrossUsd: number;
  /**
   * Platform + SWIFT + landing-fee deductions in USD. The local landing fee
   * is converted back at each record's `appliedExchangeRate`.
   */
  totalDeductibleFeesUsd: number;
  /** Realized take-home keyed by target currency (PKR, INR, …). */
  totalRealizedLocal: Record<string, number>;
}

/** Roll a set of records into the annual tax-season totals. */
export function calculateAnnualSummary(
  records: RemittanceRecord[]
): AnnualSummary {
  const summary: AnnualSummary = {
    recordCount: records.length,
    totalGrossUsd: 0,
    totalDeductibleFeesUsd: 0,
    totalRealizedLocal: {},
  };

  for (const record of records) {
    summary.totalGrossUsd += Number.isFinite(record.grossUsd)
      ? record.grossUsd
      : 0;

    const landingFeeUsd =
      record.appliedExchangeRate > 0
        ? record.landingFeeLocal / record.appliedExchangeRate
        : 0;
    summary.totalDeductibleFeesUsd +=
      (Number.isFinite(record.platformFeeUsd) ? record.platformFeeUsd : 0) +
      (Number.isFinite(record.swiftCutUsd) ? record.swiftCutUsd : 0) +
      (Number.isFinite(landingFeeUsd) ? landingFeeUsd : 0);

    const currency = record.targetCurrency || "LOCAL";
    summary.totalRealizedLocal[currency] =
      (summary.totalRealizedLocal[currency] ?? 0) +
      (Number.isFinite(record.realizedTakeHome) ? record.realizedTakeHome : 0);
  }

  return summary;
}

/* ---------------------------------------------------------------------------
 * CSV export — RFC 4180 quoted, CRLF-terminated, spreadsheet-ready.
 * ------------------------------------------------------------------------- */

/** Escape a single CSV field per RFC 4180 (quote when required). */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvNumber(value: number, digits = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toFixed(digits);
}

const CSV_HEADERS = [
  "Saved",
  "Invoice #",
  "Client",
  "Issue date",
  "Due date",
  "Invoice ccy",
  "Gross",
  "Gross (USD)",
  "Platform fee (USD)",
  "SWIFT cut (USD)",
  "Net (USD)",
  "Corridor",
  "Target ccy",
  "FX rate",
  "Converted local",
  "Landing fee (local)",
  "Realized take-home",
  "Wire protocol",
  "Statutory citation",
  "Status",
];

/** Render the ledger as an RFC 4180 CSV document (CRLF line endings). */
export function exportLedgerToCsv(records: RemittanceRecord[]): string {
  const rows: string[] = [CSV_HEADERS.map(csvField).join(",")];

  for (const record of records) {
    rows.push(
      [
        record.savedAt,
        record.invoiceNumber,
        record.clientName,
        record.issueDate,
        record.dueDate,
        record.invoiceCurrency,
        csvNumber(record.grossAmount),
        csvNumber(record.grossUsd),
        csvNumber(record.platformFeeUsd),
        csvNumber(record.swiftCutUsd),
        csvNumber(record.netUsd),
        record.corridor,
        record.targetCurrency,
        csvNumber(record.appliedExchangeRate, 6),
        csvNumber(record.convertedLocal),
        csvNumber(record.landingFeeLocal),
        csvNumber(record.realizedTakeHome),
        record.wireProtocol,
        record.statutoryCitation,
        ledgerRecordStatus(record),
      ]
        .map((cell) => csvField(String(cell)))
        .join(",")
    );
  }

  return `${rows.join("\r\n")}\r\n`;
}

/**
 * Trigger a browser download of the ledger CSV with a UTF-8 BOM so Excel
 * opens accented / non-Latin client names correctly. Client-only.
 */
export function downloadLedgerCsv(
  records: RemittanceRecord[],
  filename = "payoutdelta-tax-ledger.csv"
): void {
  if (typeof window === "undefined") return;
  try {
    const csv = exportLedgerToCsv(records);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Download unavailable — caller surfaces the failure state.
  }
}
