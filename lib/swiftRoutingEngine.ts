/**
 * PayoutDelta — Phase D: SWIFT Intermediary Leakage & BIC Route Inspector engine.
 *
 * Build-time deterministic routing intelligence over the 50-country statutory
 * bank database (`data/regulatoryBanking.ts`). Every audited corridor resolves
 * its wire transit path through a named U.S./EU/UK correspondent clearing node,
 * quantifies the expected SHA intermediary cut, classifies the settlement speed
 * and scores the domestic receiving rail — so the UI can render a "SWIFT
 * Intermediary Leakage" audit with zero network access (static export intact).
 *
 * Correspondent registry (public SWIFT/BIC identifiers, per the brief):
 *   USD  · JPMorgan Chase NY (CHASUS33), Citibank NY (CITIUS33),
 *          BNY Mellon NY (IRVTUS3N), Standard Chartered NY (SCBLUS33)
 *   EUR  · Deutsche Bank Frankfurt (DEUTDEDD), BNP Paribas Paris (BNPAFRPA),
 *          Commerzbank Frankfurt (COMMDEFF), Santander Frankfurt (SANBDEFF),
 *          BBVA Frankfurt (BBVADEFF)
 *   GBP  · Barclays London (BARCGB22), Standard Chartered London (SCBLGB2L),
 *          HSBC London (HSBCGB2L)
 *
 * All figures are informational benchmarks drawn from the bank records — the
 * actual deduction lands on the beneficiary bank's credit advice (CRF) and
 * must be verified before invoicing. No legal or financial advice expressed.
 */

import { FALLBACK_SWIFT_BAND, getRegulatoryBanking } from "@/data/regulatoryBanking";
import type { RegulatoryBank } from "@/data/regulatoryBanking";
import { getCorridors } from "@/lib/db";

export type ClearingCurrency = "USD" | "EUR" | "GBP";

export interface CorrespondentNode {
  id: string;
  bankName: string;
  city: string;
  bic: string;
  currency: ClearingCurrency;
  note: string;
}

/** Central correspondent / nostro clearing-node registry (Phase D brief). */
export const CORRESPONDENT_NODES: Record<ClearingCurrency, CorrespondentNode[]> = {
  USD: [
    {
      id: "jpmc-ny",
      bankName: "JPMorgan Chase",
      city: "New York, NY",
      bic: "CHASUS33",
      currency: "USD",
      note: "Primary U.S. clearing correspondent for USD-denominated MT103 inbound wires.",
    },
    {
      id: "citi-ny",
      bankName: "Citibank N.A.",
      city: "New York, NY",
      bic: "CITIUS33",
      currency: "USD",
      note: "Alternatively instructed U.S. correspondent on many PKR / PHP / VND corridors.",
    },
    {
      id: "bnym-ny",
      bankName: "Bank of New York Mellon",
      city: "New York, NY",
      bic: "IRVTUS3N",
      currency: "USD",
      note: "Institutional clearing house frequent on HKD / SGD / MYR nostros.",
    },
    {
      id: "scb-ny",
      bankName: "Standard Chartered Bank",
      city: "New York, NY",
      bic: "SCBLUS33",
      currency: "USD",
      note: "Group correspondent binding for Standard Chartered group banks across APAC / Africa.",
    },
  ],
  EUR: [
    {
      id: "db-fra",
      bankName: "Deutsche Bank",
      city: "Frankfurt, DE",
      bic: "DEUTDEDD",
      currency: "EUR",
      note: "Primary euro clearing correspondent for EUR-denominated inbound wires.",
    },
    {
      id: "bnp-par",
      bankName: "BNP Paribas",
      city: "Paris, FR",
      bic: "BNPAFRPA",
      currency: "EUR",
      note: "Alternate euro clearing correspondent on SEPA-adjacent corridors.",
    },
    {
      id: "cmzb-fra",
      bankName: "Commerzbank",
      city: "Frankfurt, DE",
      bic: "COMMDEFF",
      currency: "EUR",
      note: "Commonly instructed euro correspondent on PKR / VND / IDR receiving banks' SEPA legs.",
    },
    {
      id: "stdc-fra",
      bankName: "Santander",
      city: "Frankfurt, DE",
      bic: "SANBDEFF",
      currency: "EUR",
      note: "Euro clearing node for Iberian-linked receiving corridors (MXN, BRL nostros).",
    },
    {
      id: "bbva-fra",
      bankName: "BBVA",
      city: "Frankfurt, DE",
      bic: "BBVADEFF",
      currency: "EUR",
      note: "Group euro correspondent binding BBVA México and Latin-American receiving banks.",
    },
  ],
  GBP: [
    {
      id: "barc-lon",
      bankName: "Barclays Bank",
      city: "London, UK",
      bic: "BARCGB22",
      currency: "GBP",
      note: "Primary GBP clearing correspondent for sterling-denominated inbound wires.",
    },
    {
      id: "hsbc-lon",
      bankName: "HSBC UK",
      city: "London, UK",
      bic: "MIDLGB22",
      currency: "GBP",
      note: "Alternate GBP correspondent frequently instructed for CHAPS / FPS payouts.",
    },
    {
      id: "scb-lon",
      bankName: "Standard Chartered",
      city: "London, UK",
      bic: "SCBLGB2L",
      currency: "GBP",
      note: "Standard Chartered group GBP correspondent binding APAC / Africa receiving banks.",
    },
    {
      id: "hsbc-lon-2",
      bankName: "HSBC Bank",
      city: "London, UK",
      bic: "HSBCGB2L",
      currency: "GBP",
      note: "Sterling clearing node frequently instructed on sterling-priced PKR / INR / GHS corridors.",
    },
  ],
};

/**
 * Resolves the clearing currency for a corridor, preferring the wire's base
 * (sending) currency when it is EUR/GBP and falling back to the receiving
 * currency for USD-based corridors (so `usd-to-eur` still clears on EUR while
 * `eur-to-pkr` clears on EUR rather than the PKR leg).
 */
export function clearingCurrencyFor(
  targetCurrency: string,
  sourceCurrency?: string
): ClearingCurrency {
  const source = (sourceCurrency ?? "").toUpperCase();
  if (source === "EUR") return "EUR";
  if (source === "GBP") return "GBP";
  const code = targetCurrency.toUpperCase();
  if (code === "EUR") return "EUR";
  if (code === "GBP") return "GBP";
  // Euro-legacy corridors (HRK, BAM) price in EUR and clear on SEPA/TARGET2.
  if (code === "HRK" || code === "BAM") return "EUR";
  return "USD";
}

/** Base (sending) currency derived from a corridor slug prefix, if multi-origin. */
export function baseCurrencyFromSlug(
  slug: string
): ClearingCurrency | undefined {
  if (slug.startsWith("eur-")) return "EUR";
  if (slug.startsWith("gbp-")) return "GBP";
  return undefined;
}

/** Default correspondent node for a corridor (first in the currency group). */
export function primaryCorrespondent(
  targetCurrency: string,
  sourceCurrency?: string
): CorrespondentNode {
  const group = clearingCurrencyFor(targetCurrency, sourceCurrency);
  return CORRESPONDENT_NODES[group][0];
}

/** Deterministic per-bank correspondent pick (FNV-1a over id + BIC). */
export function correspondentForBank(
  bank: RegulatoryBank,
  targetCurrency: string,
  sourceCurrency?: string
): CorrespondentNode {
  const group = clearingCurrencyFor(targetCurrency, sourceCurrency);
  const nodes = CORRESPONDENT_NODES[group];
  const seed = `${bank.id}:${bank.swiftCode}`;
  const index = fnv1a(seed) % nodes.length;
  return nodes[index];
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export type SettlementSpeedTier = "instant" | "same-day" | "standard";

export interface RailEfficiency {
  grade: string;
  score: number;
  note: string;
  tone: "excellent" | "good" | "average" | "slow";
}

export interface SwiftRouteDerivation {
  corridorSlug: string;
  targetCurrency: string;
  clearingCurrency: ClearingCurrency;
  senderLabel: string;
  /** Named correspondent node the wire transits through. */
  correspondent: CorrespondentNode;
  /** Domestic receiving bank record. */
  beneficiaryBank: RegulatoryBank;
  /** Domestic receiving rail, e.g. "Raast / BEFTN". */
  railName: string;
  /** Compact rail badge, e.g. "Raast / BEFTN · 0 Landing Fee". */
  railBadge: string;
  /** Expected SHA intermediary cut band (USD). */
  deduction: { min: number; max: number };
  /** Settlement speed benchmark. */
  speed: { tier: SettlementSpeedTier; label: string };
  /** Domestic rail efficiency score (A+ → C). */
  efficiency: RailEfficiency;
  /** True when both the correspondent AND the receiving bank assess charges. */
  doubleDip: boolean;
  doubleDipNote: string;
}

/**
 * Derives the full wire transit path for a corridor + bank.
 *
 * `bank` defaults to the corridor's first regulatory bank; `senderLabel`
 * defaults to the generic Upwork / Fiverr / Direct platform trio; an explicit
 * `targetCurrency` overrides the corridor currency (used by the Invoice Studio
 * for drafts whose bank is not in the directory); `railNameOverride` swaps the
 * domestic rail label for manually-entered banks.
 */
export function deriveSwiftRoute(options: {
  corridorSlug: string;
  bank?: RegulatoryBank;
  targetCurrency?: string;
  senderLabel?: string;
  railNameOverride?: string;
}): SwiftRouteDerivation {
  const regulation = getRegulatoryBanking(options.corridorSlug);
  const bank: RegulatoryBank = options.bank ?? regulation.banks[0] ?? genericBench(options.corridorSlug);
  const targetCurrency = (options.targetCurrency ?? regulation.banks[0]?.localCurrency ?? "USD").toUpperCase();
  const sourceCurrency = baseCurrencyFromSlug(options.corridorSlug);
  const senderLabel =
    options.senderLabel ?? "Upwork / Fiverr / Direct Client Wire";
  const railName =
    options.railNameOverride ??
    (bank.id === "manual-wire" ? bank.clearance : regulation.clearingNetwork);

  const correspondent =
    bank.id === "manual-wire"
      ? primaryCorrespondent(targetCurrency, sourceCurrency)
      : correspondentForBank(bank, targetCurrency, sourceCurrency);

  const deduction = deductionBand(bank);
  const speed = speedBenchmark(bank);
  const efficiency = scoreRail(bank, railName);
  const doubleDip = bank.localFeeDefault > 0;
  const landingLabel =
    bank.localFeeDefault > 0
      ? `${bank.localCurrency} ${bank.localFeeDefault} Landing Charge`
      : "0 Landing Fee";

  return {
    corridorSlug: options.corridorSlug,
    targetCurrency,
    clearingCurrency: clearingCurrencyFor(targetCurrency, sourceCurrency),
    senderLabel,
    correspondent,
    beneficiaryBank: bank,
    railName,
    railBadge: `${railName} · ${landingLabel}`,
    deduction,
    speed,
    efficiency,
    doubleDip,
    doubleDipNote: doubleDip
      ? `${correspondent.bankName} (${correspondent.bic}) takes an SAP/SHA cut while ${bank.name} also assesses a ${bank.localCurrency} ${bank.localFeeDefault} landing charge — double-dip through the pair. Your client may need an "OUR" instruction or a direct-rail alternative to avoid both.`
      : "Correspondent cut only — the domestic rail lands free of a receiving-bank charge.",
  };
}

export function deductionBand(bank: RegulatoryBank): { min: number; max: number } {
  const fallbackMin = Math.max(8, FALLBACK_SWIFT_BAND.min - (bank.intermediaryUSD > 15 ? 0 : 5));
  const fallbackMax = Math.max(fallbackMin + 5, FALLBACK_SWIFT_BAND.max);
  const min = Number.isFinite(bank.intermediaryMinUSD) && bank.intermediaryMinUSD > 0 ? bank.intermediaryMinUSD : fallbackMin;
  const max = Number.isFinite(bank.intermediaryMaxUSD) && bank.intermediaryMaxUSD > 0 ? bank.intermediaryMaxUSD : fallbackMax;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

export function speedBenchmark(bank: RegulatoryBank): {
  tier: SettlementSpeedTier;
  label: string;
} {
  const clearance = `${bank.speed} ${bank.clearance}`.toLowerCase();
  if (/instant/.test(clearance)) {
    return { tier: "instant", label: "Instant · Same-Day Settlement" };
  }
  if (/same-day|rtgs|express/.test(clearance) || bank.speed.toLowerCase() === "fast") {
    return { tier: "same-day", label: "Same-Day (Express RTGS)" };
  }
  return {
    tier: "standard",
    label: "2–3 Business Days · Standard Telegraphic Transfer",
  };
}

/**
 * Scores the domestic receiving rail from the bank clearance record.
 * A+ for modern instant RTGS rails down to C for paper-advice or no-instant
 * clearance — with penalties for landing fees and missing direct BICs.
 */
export function scoreRail(
  bank: RegulatoryBank,
  railName: string
): RailEfficiency {
  const sound = `${bank.clearance} ${railName}`.toLowerCase();
  let score: number;
  if (/instant/.test(sound)) {
    score = 95;
  } else if (/same-day|rtgs|express|fps\b|rtp\b/.test(sound)) {
    score = 85;
  } else if (/chats|meps|tiss|sepa|giro|elixir|chena|spri|imts|sarie/.test(sound)) {
    score = 78;
  } else if (/ach|neft|eft|bacs|pix|1 day|next|clearing/.test(sound)) {
    score = 70;
  } else {
    score = 58;
  }
  if (bank.localFeeDefault > 0) score -= 6;
  if (bank.swiftCode === "—" || bank.swiftCode === "") score -= 5;
  const speedFloor = bank.speed.toLowerCase() === "instant" ? 85 : bank.speed.toLowerCase() === "fast" ? 72 : 50;
  score = Math.max(score, speedFloor);
  score = Math.min(100, Math.max(40, score));

  let grade: string;
  let tone: RailEfficiency["tone"];
  if (score >= 92) {
    grade = "A+";
    tone = "excellent";
  } else if (score >= 85) {
    grade = "A";
    tone = "excellent";
  } else if (score >= 78) {
    grade = "A−";
    tone = "good";
  } else if (score >= 70) {
    grade = "B+";
    tone = "good";
  } else if (score >= 62) {
    grade = "B";
    tone = "average";
  } else if (score >= 52) {
    grade = "B−";
    tone = "average";
  } else {
    grade = "C";
    tone = "slow";
  }

  const note =
    tone === "excellent"
      ? score >= 92
        ? "Modern instant rail — near-real-time crediting with no landing fee drag."
        : "Same-day RTGS-class rail — express settlement with low fee drag."
      : tone === "good"
        ? "1-day automated rail with competent clearing — minor drag only."
        : tone === "average"
          ? "Batch/ACH clearing — expect up to one working day before crediting."
          : "Paper / advice-based or slow clearing — plan for multi-day latency.";

  return { grade, score, note, tone };
}

/** Safe bench bank used when even the fallback table returns nothing. */
function genericBench(slug: string): RegulatoryBank {
  const currency = slug.split("-").pop()?.toUpperCase() ?? "LOCAL";
  const fallback = getRegulatoryBanking(slug).banks[0];
  if (fallback) return fallback;
  return {
    id: "manual-wire",
    name: "Local bank wire",
    displayName: "Local receiving bank",
    swiftCode: "—",
    intermediaryUSD: 18,
    intermediaryMinUSD: FALLBACK_SWIFT_BAND.min,
    intermediaryMaxUSD: FALLBACK_SWIFT_BAND.max,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "1–2 business days · local clearing",
    localCurrency: currency,
  };
}

/* ---------------------------------------------------------------------------
 * 50-country searchable bank index (drives `/swift-auditor`).
 * ------------------------------------------------------------------------- */

export interface SwiftBankEntry {
  id: string;
  bankId: string;
  slug: string;
  country: string;
  currency: string;
  corridorLabel: string;
  bankName: string;
  displayName: string;
  swiftCode: string;
  intermediaryUSD: number;
  intermediaryMinUSD: number;
  intermediaryMaxUSD: number;
  localFeeDefault: number;
  speed: string;
  clearance: string;
  rail: string;
  generic: boolean;
}

/** Flattens every regulatory bank across all 50 corridors into one index. */
export function buildSwiftBankIndex(): SwiftBankEntry[] {
  return getCorridors().flatMap((corridor) => {
    const regulation = getRegulatoryBanking(corridor.slug);
    return regulation.banks.map((bank) => ({
      id: `${corridor.slug}:${bank.id}`,
      bankId: bank.id,
      slug: corridor.slug,
      country: corridor.country,
      currency: bank.localCurrency !== "" ? bank.localCurrency : corridor.to,
      corridorLabel: `${corridor.from} → ${corridor.to}`,
      bankName: bank.name,
      displayName: bank.displayName,
      swiftCode: bank.swiftCode,
      intermediaryUSD: bank.intermediaryUSD,
      intermediaryMinUSD: bank.intermediaryMinUSD,
      intermediaryMaxUSD: bank.intermediaryMaxUSD,
      localFeeDefault: bank.localFeeDefault,
      speed: bank.speed,
      clearance: bank.clearance,
      rail: regulation.clearingNetwork,
      generic: regulation.generic,
    }));
  });
}

/** Case-insensitive substring search across name / BIC / country / currency / rail. */
export function searchSwiftBanks(
  query: string,
  entries: SwiftBankEntry[]
): SwiftBankEntry[] {
  const q = query.trim().toLowerCase();
  if (q === "") return entries;
  return entries.filter((entry) =>
    [
      entry.bankName,
      entry.displayName,
      entry.swiftCode,
      entry.country,
      entry.currency,
      entry.corridorLabel,
      entry.rail,
      entry.speed,
    ].some((field) => field.toLowerCase().includes(q))
  );
}

/** Counts the distinct countries covered by an index slice. */
export function countDistinctCountries(entries: SwiftBankEntry[]): number {
  return new Set(entries.map((entry) => entry.country)).size;
}

/**
 * Resolves a manually-entered bank (Invoice Studio mode) back to a corridor +
 * bank bench. Tries SWIFT/BIC, then bank-name, then corridor-by-currency; falls
 * back to a synthetic bench so the inspector always has a deterministic route.
 */
export function resolveBankRoute(options: {
  bankName?: string;
  swiftCode?: string;
  currency?: string;
}): {
  corridorSlug: string;
  bank: RegulatoryBank;
  currency: string;
  resolved: boolean;
} {
  const index = buildSwiftBankIndex();
  const rawSwift = (options.swiftCode ?? "").trim().toUpperCase();
  const rawName = (options.bankName ?? "").trim().toLowerCase();
  const currency = (options.currency ?? "").toUpperCase();

  const bySwift = rawSwift !== ""
    ? index.find((entry) => entry.swiftCode === rawSwift)
    : undefined;
  const byName = rawName !== ""
    ? index.find(
        (entry) =>
          entry.bankName.toLowerCase() === rawName ||
          entry.displayName.toLowerCase() === rawName
      )
    : undefined;

  const match = bySwift ?? byName;
  if (match) {
    const regulation = getRegulatoryBanking(match.slug);
    const bank =
      regulation.banks.find((item) => item.id === match.bankId) ??
      regulation.banks[0];
    return {
      corridorSlug: match.slug,
      bank: bank ?? genericBench(match.slug),
      currency: match.currency,
      resolved: true,
    };
  }

  const corridor =
    currency !== "" ? getCorridors().find((item) => item.to === currency) : undefined;
  const fallbackSlug = corridor?.slug ?? "usd-to-pkr";
  const synthBank: RegulatoryBank = {
    id: "manual-wire",
    name: options.bankName?.trim() || "Local receiving bank",
    displayName: `${options.bankName?.trim() || "Local receiving bank"} · manual entry`,
    swiftCode: rawSwift || "—",
    intermediaryUSD: 18,
    intermediaryMinUSD: FALLBACK_SWIFT_BAND.min,
    intermediaryMaxUSD: FALLBACK_SWIFT_BAND.max,
    localFeeDefault: 0,
    speed: "Standard",
    clearance: "1–2 business days · local clearing network",
    localCurrency: currency || "LOCAL",
  };
  return {
    corridorSlug: fallbackSlug,
    bank: synthBank,
    currency: currency || "LOCAL",
    resolved: false,
  };
}

/* ---------------------------------------------------------------------------
 * 1-click "Wire Instructions for Client" template generator.
 * ------------------------------------------------------------------------- */

export interface WireInstructionsInput {
  corridorLabel: string;
  recipientName?: string;
  account?: string;
  receivingBankName: string;
  receivingBankSwift: string;
  receivingBankCity?: string;
  correspondent: CorrespondentNode;
  railBadge: string;
  deduction: { min: number; max: number };
  targetCurrency: string;
}

export function buildWireInstructions(input: WireInstructionsInput): string {
  const chargeLine =
    input.deduction.min === input.deduction.max
      ? `$${input.deduction.min}`
      : `$${input.deduction.min}–$${input.deduction.max}`;
  const recipient = input.recipientName?.trim() || "「 Beneficiary Name 」";
  const account = input.account?.trim() || "「 Beneficiary Account / IBAN 」";
  const city = input.receivingBankCity ? `, ${input.receivingBankCity}` : "";
  return [
    "WIRE INSTRUCTIONS — PayoutDelta SWIFT Route Audit",
    "-----------------------------------------------",
    `Corridor: ${input.corridorLabel} · Settlement: ${input.targetCurrency}`,
    "",
    "INTERMEDIARY (CORRESPONDENT) BANK:",
    `  ${input.correspondent.bankName} — ${input.correspondent.city}`,
    `  SWIFT / BIC: ${input.correspondent.bic}`,
    `  Note: ${input.correspondent.note}`,
    "",
    "BENEFICIARY BANK:",
    `  ${input.receivingBankName}${city}`,
    `  SWIFT / BIC: ${input.receivingBankSwift}`,
    `  BENEFICIARY NAME: ${recipient}`,
    `  BENEFICIARY ACCOUNT / IBAN: ${account}`,
    "",
    "DOMESTIC RECEIVING RAIL:",
    `  ${input.railBadge}`,
    "",
    "CHARGE DETAILS: SHA (recommended) vs OUR",
    "  SHA — shared costs: the payer's bank takes its sending fee and the",
    `  correspondent deducts its cut (benchmark ${chargeLine}) before the`,
    "  domestic rail credits the beneficiary. No markup on your side; the",
    "  beneficiary absorbs only a statutory landing fee when one applies.",
    "  OUR — bank charges paid by the sender: guarantees the full local amount",
    "  arrives (no landing deduction) but the sending bank re-quotes a higher",
    "  up-front fee and may reject the instruction for small wires.",
    "",
    "Verified against the PayoutDelta 50-country bank directory — benchmark",
    "figure, not a quote. Confirm the landed amount on the beneficiary bank's",
    "credit advice (CRF) before issuing the final invoice.",
  ].join("\n");
}