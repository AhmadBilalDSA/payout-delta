/**
 * PayoutDelta — Freelance Invoice Studio (Phase 4).
 *
 * Pure document model + persistence layer for the invoice studio. Framework
 * free and synchronous so the math can run anywhere; every browser-only API
 * (localStorage, FileReader, window.location) lives behind a guarded function
 * so this module stays importable during the static-export prerender.
 *
 * Zero-server promise: drafts persist only to the client's own localStorage
 * under the Phase S3 `payoutdelta:invoice_draft` namespace key, and logo
 * uploads are converted to data URLs in-browser. No invoice data ever leaves
 * the device. All storage keys are owned by `lib/privacyGuard.ts` (as are the
 * guarded read/write/remove accessors that self-heal legacy keys), and every
 * user-entered string is run through `utils/sanitize.ts` so the printed sheet
 * can never carry markup.
 */

import {
  BANK_SYNC_KEY,
  INVOICE_DRAFT_KEY,
  INVOICE_SYNC_KEY,
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "@/lib/privacyGuard";
import { sanitizeText, stripHtml } from "@/utils/sanitize";

export { BANK_SYNC_KEY, INVOICE_SYNC_KEY };
export const INVOICE_STORAGE_KEY = INVOICE_DRAFT_KEY;
export const INVOICE_SYNC_EVENT = "payoutdelta:synced";
export const INVOICE_LOGO_LIMIT_BYTES = 500 * 1024;

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const CURRENCIES: readonly CurrencyConfig[] = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
];

export type AccentKey = "obsidian" | "slate" | "emerald" | "cobalt";

export interface AccentPalette {
  key: AccentKey;
  label: string;
  value: string;
  tint: string;
}

export const ACCENT_PALETTES: readonly AccentPalette[] = [
  { key: "obsidian", label: "Obsidian", value: "#0D0D11", tint: "#F5F5F7" },
  { key: "slate", label: "Slate", value: "#334155", tint: "#F1F5F9" },
  { key: "emerald", label: "Emerald", value: "#059669", tint: "#ECFDF5" },
  { key: "cobalt", label: "Cobalt", value: "#2563EB", tint: "#EFF6FF" },
];

export function accentByKey(key: AccentKey): AccentPalette {
  return (
    ACCENT_PALETTES.find((palette) => palette.key === key) ??
    ACCENT_PALETTES[0]
  );
}

export interface InvoiceIdentity {
  freelancerName: string;
  freelancerEmail: string;
  freelancerAddress: string;
  freelancerTaxId: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
}

export interface InvoiceMeta {
  number: string;
  issueDate: string;
  dueDate: string;
  currency: CurrencyCode;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string;
  unitRate: string;
  /**
   * Per line-item GST/VAT percentage (default "0" — zero-rated export).
   * Layers on top of the invoice-level `taxPercent` so export invoices stay
   * 0% while a domestic line can carry its own rate.
   */
  gstPercent: string;
}

/** Phase 9 — banking & clearing details synced from the calculator. */
export interface InvoiceBanking {
  beneficiaryAccount: string;
  receivingBank: string;
  swiftCode: string;
  correspondentNote: string;
  /** Statutory export purpose code, e.g. "9111" / "P0802". */
  purposeCode: string;
  /** Governing statutory authority / tax basis, e.g. "ITO Section 154A". */
  authority: string;
  /** Human tier label, e.g. "PSEB Registered IT Exporter · 0.25%". */
  tierLabel: string;
}

/** SWIFT charge instruction — bearer (OUR) or shared (SHA). */
export type WireProtocol = "OUR" | "SHA";

/**
 * Phase E — settlement & realization parameters captured per invoice so the
 * studio can project, print and persist a multi-milestone remittance ledger
 * entry. All amounts are user-typed strings (matching the studio convention);
 * `platformPercent` and `swiftCutUsd` are USD-side, `landingFeeLocal` lives in
 * the corridor's target currency.
 */
export interface InvoiceSettlement {
  /** Platform commission % applied to the gross (e.g. "10"). */
  platformPercent: string;
  /** Intermediary correspondent SWIFT cut, USD ("0" default). */
  swiftCutUsd: string;
  /** Local receiving-bank landing fee, target currency ("0" default). */
  landingFeeLocal: string;
  wireProtocol: WireProtocol;
  /** Corridor the settlement realizes on, matching a `Corridor.slug`. */
  corridorSlug: string;
}

export const DEFAULT_SETTLEMENT: InvoiceSettlement = {
  platformPercent: "0",
  swiftCutUsd: "0",
  landingFeeLocal: "0",
  wireProtocol: "OUR",
  corridorSlug: "usd-to-pkr",
};

export interface InvoiceDraft {
  identity: InvoiceIdentity;
  meta: InvoiceMeta;
  lineItems: InvoiceLineItem[];
  taxPercent: string;
  note: string;
  accent: AccentKey;
  logoDataUrl: string | null;
  includeTransparencyClause: boolean;
  /** Phase 8 — append the currency-matched bank settlement & tax note. */
  includeBankTaxNote: boolean;
  /** Phase 9 — banking, purpose code & statutory withholding addendum. */
  banking: InvoiceBanking;
  includeStatutoryAddendum: boolean;
  /** Phase E — settlement & realization schedule shown on the document. */
  settlement: InvoiceSettlement;
  includeSettlementSchedule: boolean;
}

/** `INV-2026-001` — default invoice numbering, editable in the studio. */
export function createInvoiceNumber(year = new Date().getFullYear()): string {
  return `INV-${year}-001`;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Issue "today", due in 14 days. */
export function defaultDates(): { issueDate: string; dueDate: string } {
  const issue = new Date();
  const due = new Date(issue);
  due.setDate(due.getDate() + 14);
  return { issueDate: toISODate(issue), dueDate: toISODate(due) };
}

let itemSeq = 0;

export function createLineItem(
  description = "",
  quantity = "1",
  unitRate = ""
): InvoiceLineItem {
  itemSeq += 1;
  return {
    id: `item-${Date.now().toString(36)}-${itemSeq}`,
    description,
    quantity,
    unitRate,
    gstPercent: "0",
  };
}

export function createEmptyDraft(): InvoiceDraft {
  const { issueDate, dueDate } = defaultDates();
  return {
    identity: {
      freelancerName: "",
      freelancerEmail: "",
      freelancerAddress: "",
      freelancerTaxId: "",
      clientName: "",
      clientCompany: "",
      clientEmail: "",
    },
    meta: {
      number: createInvoiceNumber(),
      issueDate,
      dueDate,
      currency: "USD",
    },
    lineItems: [createLineItem()],
    taxPercent: "0",
    note: "",
    accent: "emerald",
    logoDataUrl: null,
    includeTransparencyClause: true,
    includeBankTaxNote: false,
    banking: {
      beneficiaryAccount: "",
      receivingBank: "",
      swiftCode: "",
      correspondentNote: "",
      purposeCode: "",
      authority: "",
      tierLabel: "",
    },
    includeStatutoryAddendum: false,
    settlement: {
      platformPercent: "0",
      swiftCutUsd: "0",
      landingFeeLocal: "0",
      wireProtocol: "OUR",
      corridorSlug: "usd-to-pkr",
    },
    includeSettlementSchedule: false,
  };
}

/* ---------------------------------------------------------------------------
 * Money math — single source of truth for the editor + preview + print.
 * ------------------------------------------------------------------------- */

/** Parse a user-typed amount, tolerating thousands separators. */
export function parseAmount(value: string): number {
  const normalized = value.replace(/,/g, "").trim();
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function lineTotal(item: InvoiceLineItem): number {
  return parseAmount(item.quantity) * parseAmount(item.unitRate);
}

/** Per line-item GST/VAT as a clamped decimal fraction (0–100%). */
export function lineGstFraction(item: InvoiceLineItem): number {
  return Math.min(100, Math.max(0, parseAmount(item.gstPercent))) / 100;
}

/** Per line-item GST/VAT in the invoice currency. */
export function lineGst(item: InvoiceLineItem): number {
  return lineTotal(item) * lineGstFraction(item);
}

/** Sum of every line-item's GST/VAT. */
export function totalLineGst(draft: InvoiceDraft): number {
  return draft.lineItems.reduce((sum, item) => sum + lineGst(item), 0);
}

export function subtotal(draft: InvoiceDraft): number {
  return draft.lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
}

/** Invoice-level tax/VAT applied on the subtotal (`draft.taxPercent`). */
export function globalTaxAmount(draft: InvoiceDraft): number {
  return subtotal(draft) * (parseAmount(draft.taxPercent) / 100);
}

export function taxAmount(draft: InvoiceDraft): number {
  return totalLineGst(draft) + globalTaxAmount(draft);
}

export function grandTotal(draft: InvoiceDraft): number {
  return subtotal(draft) + taxAmount(draft);
}

/** Fixed-locale currency string, `$1,234.56` / `€1,234.56` etc. */
export function formatCurrency(value: number, code: CurrencyCode): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** `2026-09-22` → `Sep 22, 2026` for the printed document. */
export function formatHumanDate(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ---------------------------------------------------------------------------
 * localStorage persistence + URL prefill bridge (FeeBreakdownList → studio).
 * ------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asCurrencyCode(value: unknown): CurrencyCode {
  return CURRENCIES.some((c) => c.code === value)
    ? (value as CurrencyCode)
    : "USD";
}

function asAccentKey(value: unknown): AccentKey {
  return ACCENT_PALETTES.some((a) => a.key === value)
    ? (value as AccentKey)
    : "emerald";
}

function asDataUrl(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Normalize a line-item GST % string to a clamped numeric string. */
function asGstPercent(value: unknown): string {
  if (typeof value !== "string") return "0";
  const n = Number.parseFloat(value.replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return "0";
  return String(Math.min(100, Math.max(0, n)));
}

/** Normalize the invoice-level tax/VAT % string to a clamped numeric string.
 * Guarantees the studio default is a clean `"0"` — a malformed persisted
 * value like `"0s"` collapses to `0` instead of leaking into print/PDF. */
function asTaxPercent(value: unknown): string {
  if (typeof value !== "string") return "0";
  const n = Number.parseFloat(value.replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return "0";
  return String(Math.min(100, Math.max(0, n)));
}

/** Normalize a settlement % / fee string to a clamped non-negative string. */
function asFeeString(value: unknown, maxPercent = false): string {
  if (typeof value !== "string") return "0";
  const n = Number.parseFloat(value.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return "0";
  return maxPercent ? String(Math.min(100, n)) : String(n);
}

/** Coerce a persisted settlement block into the phase-E shape. */
function sanitizeSettlement(parsed: unknown): InvoiceSettlement {
  const block = isRecord(parsed) ? parsed : {};
  return {
    platformPercent: asFeeString(block.platformPercent, true),
    swiftCutUsd: asFeeString(block.swiftCutUsd),
    landingFeeLocal: asFeeString(block.landingFeeLocal),
    wireProtocol: block.wireProtocol === "SHA" ? "SHA" : "OUR",
    corridorSlug: asString(block.corridorSlug, DEFAULT_SETTLEMENT.corridorSlug),
  };
}

export function persistInvoiceDraft(draft: InvoiceDraft): void {
  if (typeof window === "undefined") return;
  writeLocalStorage(INVOICE_STORAGE_KEY, JSON.stringify(draft));
}

export function clearInvoiceDraft(): void {
  if (typeof window === "undefined") return;
  removeLocalStorage(INVOICE_STORAGE_KEY);
}

/** Read a pasted/selected logo into a base64 data URL. */
export function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Merge a parsed JSON blob with a pristine draft so older/malformed drafts
 * from a prior session never crash the studio.
 *
 * Phase S3 — every user-entered string read back from the wallet is re-run
 * through `sanitizeText` so a stale or tampered local draft can never carry
 * markup onto the printable sheet.
 */
function sanitizeDraft(parsed: unknown, fallback: InvoiceDraft): InvoiceDraft {
  if (!isRecord(parsed)) return fallback;
  const identity = isRecord(parsed.identity) ? parsed.identity : {};
  const meta = isRecord(parsed.meta) ? parsed.meta : {};
  const rawItems: unknown[] = Array.isArray(parsed.lineItems)
    ? parsed.lineItems
    : [];
  const lineItems: InvoiceLineItem[] =
    rawItems.filter(isRecord).length > 0
      ? rawItems.filter(isRecord).map((item) => ({
          id: asString(item.id, createLineItem().id),
          description: sanitizeText(asString(item.description, "")),
          quantity: asString(item.quantity, "1"),
          unitRate: asString(item.unitRate, ""),
          gstPercent: asGstPercent(item.gstPercent),
        }))
      : [createLineItem()];
  const banking = isRecord(parsed.banking) ? parsed.banking : {};

  return {
    identity: {
      freelancerName: sanitizeText(asString(identity.freelancerName, "")),
      freelancerEmail: sanitizeText(asString(identity.freelancerEmail, "")),
      freelancerAddress: sanitizeText(asString(identity.freelancerAddress, "")),
      freelancerTaxId: sanitizeText(asString(identity.freelancerTaxId, "")),
      clientName: sanitizeText(asString(identity.clientName, "")),
      clientCompany: sanitizeText(asString(identity.clientCompany, "")),
      clientEmail: sanitizeText(asString(identity.clientEmail, "")),
    },
    meta: {
      number: sanitizeText(asString(meta.number, fallback.meta.number), 64),
      issueDate: asString(meta.issueDate, fallback.meta.issueDate),
      dueDate: asString(meta.dueDate, fallback.meta.dueDate),
      currency: asCurrencyCode(meta.currency),
    },
    lineItems,
    taxPercent: asTaxPercent(parsed.taxPercent),
    note: sanitizeText(asString(parsed.note, ""), 600),
    accent: asAccentKey(parsed.accent),
    logoDataUrl: asDataUrl(parsed.logoDataUrl),
    includeTransparencyClause:
      typeof parsed.includeTransparencyClause === "boolean"
        ? parsed.includeTransparencyClause
        : fallback.includeTransparencyClause,
    includeBankTaxNote:
      typeof parsed.includeBankTaxNote === "boolean"
        ? parsed.includeBankTaxNote
        : fallback.includeBankTaxNote,
    banking: {
      beneficiaryAccount: sanitizeText(asString(banking.beneficiaryAccount, fallback.banking.beneficiaryAccount), 64),
      receivingBank: sanitizeText(asString(banking.receivingBank, fallback.banking.receivingBank)),
      swiftCode: sanitizeText(asString(banking.swiftCode, fallback.banking.swiftCode), 32),
      correspondentNote: sanitizeText(asString(banking.correspondentNote, fallback.banking.correspondentNote), 600),
      purposeCode: sanitizeText(asString(banking.purposeCode, fallback.banking.purposeCode), 32),
      authority: sanitizeText(asString(banking.authority, fallback.banking.authority)),
      tierLabel: sanitizeText(asString(banking.tierLabel, fallback.banking.tierLabel)),
    },
    includeStatutoryAddendum:
      typeof parsed.includeStatutoryAddendum === "boolean"
        ? parsed.includeStatutoryAddendum
        : fallback.includeStatutoryAddendum,
    settlement: sanitizeSettlement(parsed.settlement),
    includeSettlementSchedule:
      typeof parsed.includeSettlementSchedule === "boolean"
        ? parsed.includeSettlementSchedule
        : fallback.includeSettlementSchedule,
  };
}

/**
 * Optional deep link from the audit tool: `/invoice/?gross=1234&ccy=USD&channel=Wise`
 * prefills a single line item so "Open in Invoice Studio" flows seamlessly.
 */
export function draftFromUrlParams(): InvoiceDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const gross = Number.parseFloat(params.get("gross") ?? "");
    if (!Number.isFinite(gross) || gross <= 0) return null;

    const ccy = params.get("ccy");
    const currency: CurrencyCode = CURRENCIES.some((c) => c.code === ccy)
      ? (ccy as CurrencyCode)
      : "USD";
    const channel = params.get("channel");
    const description = sanitizeText(
      channel && channel.trim() !== ""
        ? `Milestone payment (${channel.trim()}) — net of platform fees`
        : "Project milestone — net of platform fees",
      160
    );

    const draft = createEmptyDraft();
    draft.meta.currency = currency;
    draft.lineItems = [createLineItem(description, "1", String(gross))];
    return draft;
  } catch {
    return null;
  }
}

/**
 * Load the wallet draft. Priority: saved localStorage draft → URL prefill →
 * pristine empty invoice. Client-only; never invoked during prerender.
 */
export function loadInvoiceDraft(): InvoiceDraft {
  const fallback = createEmptyDraft();
  if (typeof window === "undefined") return fallback;
  const raw = readLocalStorage(INVOICE_STORAGE_KEY);
  if (raw) {
    try {
      return sanitizeDraft(JSON.parse(raw), fallback);
    } catch {
      // fall through to URL prefill / empty draft
    }
  }
  return draftFromUrlParams() ?? fallback;
}

/* ---------------------------------------------------------------------------
 * Calculator → Invoice Studio sync bridge (Phase 9).
 *
 * The costing widget's "Sync to Invoice" button persists the selected bank,
 * purpose code and statutory tier here; the Invoice Studio auto-fills its
 * Banking & Clearing section on the next visit. Payload stays on-device.
 * ------------------------------------------------------------------------- */

export interface BankSyncPayload {
  bankName: string;
  swiftCode: string;
  bankSpeed: string;
  intermediaryUSD: number;
  clearingFee: number;
  currency: string;
  tierName: string;
  tierRate: number;
  purposeCode: string | null;
  authority: string;
  corridorSlug: string;
  savedAt: string;
}

function sanitizeBankSync(parsed: unknown): BankSyncPayload | null {
  if (!isRecord(parsed)) return null;
  if (parsed.savedAt !== null && typeof parsed.savedAt !== "string") return null;
  if (typeof parsed.bankName !== "string" || parsed.bankName.trim() === "") return null;
  const toNumber = (value: unknown, fallback: number): number => {
    const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    return Number.isFinite(n) ? n : fallback;
  };
  const toCleanString = (value: unknown, fallback = ""): string =>
    typeof value === "string" ? stripHtml(value) : fallback;
  const toNullableString = (value: unknown): string | null => {
    const cleaned = toCleanString(value);
    return cleaned.trim() !== "" ? cleaned : null;
  };
  return {
    bankName: stripHtml(parsed.bankName),
    swiftCode: toCleanString(parsed.swiftCode),
    bankSpeed: toCleanString(parsed.bankSpeed),
    intermediaryUSD: toNumber(parsed.intermediaryUSD, 0),
    clearingFee: toNumber(parsed.clearingFee, 0),
    currency: toCleanString(parsed.currency, "USD"),
    tierName: toCleanString(parsed.tierName),
    tierRate: toNumber(parsed.tierRate, 0),
    purposeCode: toNullableString(parsed.purposeCode),
    authority: toCleanString(parsed.authority),
    corridorSlug: toCleanString(parsed.corridorSlug),
    savedAt: toCleanString(parsed.savedAt),
  };
}

/** Persist a calculator "Sync to Invoice" payload. Client-only. */
export function writeBankSync(payload: BankSyncPayload): void {
  if (typeof window === "undefined") return;
  writeLocalStorage(BANK_SYNC_KEY, JSON.stringify(payload));
}

/** Read the latest calculator bank-sync payload, or `null`. Client-only. */
export function readBankSync(): BankSyncPayload | null {
  if (typeof window === "undefined") return null;
  const raw = readLocalStorage(BANK_SYNC_KEY);
  if (!raw) return null;
  try {
    return sanitizeBankSync(JSON.parse(raw));
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * Phase 9 · UI polish — live calculator → studio sync bridge.
 *
 * Alongside the deep `BankSyncPayload` the costing widget writes a lean, flat
 * payload under `payoutdelta:invoice_sync` and fires `payoutdelta:synced` so
 * the Invoice Studio can apply it instantly (even while already open). The
 * payload uses exactly the field names the Banking & Clearing section needs.
 * ------------------------------------------------------------------------- */

export interface InvoiceSyncPayload {
  receivingBank: string;
  swiftBic: string;
  statutoryAuthority: string;
  purposeCode: string;
  taxRate: number;
  currency: string;
  timestamp: number;
  /** Phase B — optional target-net line item (USD-milestone invoice). */
  lineItemAmount?: number;
  lineItemDescription?: string;
}

function sanitizeInvoiceSync(parsed: unknown): InvoiceSyncPayload | null {
  if (!isRecord(parsed)) return null;
  if (
    typeof parsed.receivingBank !== "string" ||
    parsed.receivingBank.trim() === ""
  ) {
    return null;
  }
  const toNumber = (value: unknown, fallback: number): number => {
    const n =
      typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    return Number.isFinite(n) ? n : fallback;
  };
  const toCleanString = (value: unknown, fallback = ""): string =>
    typeof value === "string" ? stripHtml(value) : fallback;
  return {
    receivingBank: stripHtml(parsed.receivingBank),
    swiftBic: toCleanString(parsed.swiftBic),
    statutoryAuthority: toCleanString(parsed.statutoryAuthority),
    purposeCode: toCleanString(parsed.purposeCode),
    taxRate: toNumber(parsed.taxRate, 0),
    currency: toCleanString(parsed.currency, "USD"),
    timestamp: toNumber(parsed.timestamp, 0),
    lineItemAmount:
      typeof parsed.lineItemAmount === "number" &&
      Number.isFinite(parsed.lineItemAmount)
        ? parsed.lineItemAmount
        : undefined,
    lineItemDescription:
      typeof parsed.lineItemDescription === "string" &&
      parsed.lineItemDescription.trim() !== ""
        ? stripHtml(parsed.lineItemDescription)
        : undefined,
  };
}

/** Read the latest live calculator sync payload, or `null`. Client-only. */
export function readInvoiceSync(): InvoiceSyncPayload | null {
  if (typeof window === "undefined") return null;
  const raw = readLocalStorage(INVOICE_SYNC_KEY);
  if (!raw) return null;
  try {
    return sanitizeInvoiceSync(JSON.parse(raw));
  } catch {
    return null;
  }
}