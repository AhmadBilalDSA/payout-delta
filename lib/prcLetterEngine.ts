/**
 * PayoutDelta — Phase C "1-Click Bank PRC / FIRC" statutory export exemption
 * letter engine.
 *
 * Deterministic, framework-free compliance letter builder. Maps a corridor
 * slug onto one of six global export jurisdictions (Pakistan PKR, India INR,
 * Philippines PHP, Mexico MXN, Poland PLN, Global fallback), then renders the
 * official bank correspondence asserting:
 *
 *   • the beneficiary / statutory purpose code (9111, P0802, Art. 29-D, …),
 *   • the governing regulatory citation (SBP FE Manual Ch. 13, RBI Master
 *     Direction, BSP Circular 980, LIVA Art. 29-D, VAT Art. 28b, …),
 *   • the statutory zero-rate / exemption / reverse-charge treatment applied
 *     to the inward foreign remittance,
 *   • the sworn declaration that the remunerated services were performed
 *     outside the tax territory of the receiving jurisdiction.
 *
 * Pure functions + a localStorage persistence helper, so the module stays
 * importable during the static-export prerender. Every amount is formatted
 * on the client from the calculator state — no server round-trips.
 */

export type PrcSchemeId = "pkr" | "inr" | "php" | "mxn" | "pln" | "global";

export interface PrcScheme {
  id: PrcSchemeId;
  country: string;
  currency: string;
  /** Short certificate label, e.g. "PRC". */
  certificateShort: string;
  /** Full certificate / advice name requested from the bank. */
  certificateName: string;
  /** Governing statutory citation used across the letter body. */
  statutoryReference: string;
  /** Default statutory purpose code for the jurisdiction. */
  purposeCodeDefault: string;
  /** Human-purpose label for the purpose code. */
  purposeCodeLabel: string;
  /** The zero-rate / exemption / reverse-charge regime text. */
  regime: string;
  /** The official foreign-service declaration text. */
  declaration: string;
  /** Option dropdown label for the modal (scheme picker / fallback pools). */
  optionLabel: string;
}

export const PRC_SCHEMES: readonly PrcScheme[] = [
  {
    id: "pkr",
    country: "Pakistan",
    currency: "PKR",
    certificateShort: "PRC",
    certificateName: "Proceeds Realisation Certificate (PRC)",
    statutoryReference:
      "the State Bank of Pakistan (SBP) Foreign Exchange Manual — Chapter 13 (Export of Services) read with Section 154A of the Income Tax Ordinance, 2001",
    purposeCodeDefault: "9111",
    purposeCodeLabel: "Computer & IT Services",
    regime:
      "the 0.25% final-tax export regime applicable to registered IT/software exporters (PSEB-verified) under the informatized SBP PRC request flow, with no ad-hoc withholding applied at credit against the foreign-source export proceeds",
    declaration:
      "I/We hereby solemnly declare and confirm that the services remunerated by this inward remittance are computer, software and IT consultancy services rendered by me/us in Pakistan to a foreign client whose business is established wholly outside the tax territory of Pakistan; that the consideration is payable in foreign exchange and none of the services were performed or consumed inside the domestic tax territory; and that the export proceeds are being realized through the banking channel in accordance with Chapter 13 of the SBP Foreign Exchange Manual.",
    optionLabel: "Pakistan (PKR) — SBP FE Manual Ch. 13 · PC 9111",
  },
  {
    id: "inr",
    country: "India",
    currency: "INR",
    certificateShort: "FIRC",
    certificateName: "Foreign Inward Remittance Certificate (FIRC)",
    statutoryReference:
      "the Reserve Bank of India (RBI) Master Direction on Inward Remittance and the statutory purpose-code framework — Purpose Code P0802 (Software Consultancy & Implementation Services), read with Section 194S / Section 44ADA of the Income-tax Act, 1961 and Rule 96A of the CGST Rules, 2017",
    purposeCodeDefault: "P0802",
    purposeCodeLabel: "Software Consultancy & Implementation Services",
    regime:
      "zero-rated export treatment under a valid Letter of Undertaking (LUT, Rule 96A CGST) and/or the presumptive tax regime under Section 44ADA, so that no Goods & Services Tax and no Tax Deduction at Source is chargeable at the point of receipt",
    declaration:
      "I/We hereby solemnly declare and confirm that the export of software consultancy and implementation services covered by this inward remittance is supplied by me/us as a person resident in India to a foreign service recipient located outside the tax territory of India; that the service is performed and delivered outside India as a zero-rated outward supply; and that the foreign exchange so received constitutes the export proceeds of that supply, repatriated through the banking channel.",
    optionLabel: "India (INR) — RBI Master Direction · PC P0802",
  },
  {
    id: "php",
    country: "Philippines",
    currency: "PHP",
    certificateShort: "BSP Remittance Certification",
    certificateName: "Inward Foreign Remittance Certification",
    statutoryReference:
      "Bangko Sentral ng Pilipinas (BSP) Circular No. 980, as amended, read with the National Internal Revenue Code (BIR) — the 8% gross income tax on self-employment / cross-border professional services",
    purposeCodeDefault: "Cross-border IT services",
    purposeCodeLabel: "Cross-border services (0% output VAT)",
    regime:
      "0% output VAT on cross-border computer services rendered to a foreign client, with the applicable BIR income-tax treatment (8% gross income tax or graduated rates with the Optional Standard Deduction) satisfied through annual filing and supported by the remittance certification requested herein",
    declaration:
      "I/We hereby solemnly declare and confirm that the cross-border computer services covered by this inward foreign remittance were rendered by me/us in the Philippines to a foreign client wholly outside the Philippines; that the consideration was received electronically in foreign currency; that the transaction is a cross-border service realization, not a local sale of goods or services; and that no output VAT is chargeable thereon under BSP Circular No. 980 and BIR rules.",
    optionLabel: "Philippines (PHP) — BSP Circular 980 · 0% VAT",
  },
  {
    id: "mxn",
    country: "México",
    currency: "MXN",
    certificateShort: "Settlement Advice & Export Certification",
    certificateName: "Comprobante de Ingresos por Exportación de Servicios / Settlement Advice",
    statutoryReference:
      "the Ley del Impuesto al Valor Agregado (LIVA) — Artículo 29-D (Exportación de Servicios, 0% IVA), read with the Ley del Impuesto sobre la Renta (LISR) — Artículo 113-E (Régimen Simplificado de Confianza, RESICO)",
    purposeCodeDefault: "Exportación de Servicios TI",
    purposeCodeLabel: "Exportación de servicios (IVA 0%)",
    regime:
      "0% (zero-rated) IVA treatment on exported services under LIVA Artículo 29-D and, where applicable, the flat 1.5% ISR rate under the RESICO scheme (LISR Artículo 113-E)",
    declaration:
      "Por medio de la presente declaro manifiesto que los servicios de tecnología de la información y consultoría amparados por esta remesa entrante fueron prestados desde México a un cliente no residente ubicado fuera del territorio nacional; que el ingreso proviene de una contraparte en el extranjero; que tales servicios califican como exportación de servicios en términos del Artículo 29-D de la LIVA, causando IVA a la tasa 0%; y que el comprobante correspondiente se expide conforme al régimen declarado.",
    optionLabel: "México (MXN) — LIVA Art. 29-D · LISR Art. 113-E (RESICO)",
  },
  {
    id: "pln",
    country: "Poland",
    currency: "PLN",
    certificateShort: "Settlement Confirmation & VAT Certification",
    certificateName: "Settlement Confirmation & VAT Treatment Certification",
    statutoryReference:
      "the Ustawa o podatku od towarów i usług (VAT Act) — Article 28b (Eksport usług poza UE, reverse charge), read with the registered PIT scheme (ryczałt od przychodów ewidencjonowanych / podatek liniowy)",
    purposeCodeDefault: "PKWiU 62/63",
    purposeCodeLabel: "Usługi informatyczne (PKWiU 62/63)",
    regime:
      "services supplied to a business established outside Poland and outside the European Union are outside the scope of Polish VAT (reverse charge under Article 28b), with income tax settled under the documented scheme (ryczałt 8.5% / podatek liniowy 19%)",
    declaration:
      "I/We hereby solemnly declare and confirm that the software and IT services covered by this inward remittance were supplied from Poland to a client established outside the territory of the European Union; that the supply is an export of services (eksport usług) outside the EU and is therefore outside the scope of Polish VAT, chargeable by reverse charge under Article 28b of the VAT Act; and that the proceeds constitute revenue of the documented registered business activity.",
    optionLabel: "Poland (PLN) — VAT Art. 28b · PKWiU 62/63",
  },
  {
    id: "global",
    country: "the receiving jurisdiction",
    currency: "LOCAL",
    certificateShort: "SWIFT Settlement Advice",
    certificateName: "Inward Remittance Exemption & Settlement Advice Request",
    statutoryReference:
      "the applicable exchange-control and income-tax regime of the receiving jurisdiction governing cross-border service exports and SWIFT (MT103) inward settlements",
    purposeCodeDefault: "Cross-border services",
    purposeCodeLabel: "Cross-border services (export exemption)",
    regime:
      "no statutory withholding is expected at settlement where the remunerated services are performed and supplied wholly outside the tax territory of the receiving jurisdiction; the receiving bank is requested to confirm the settlement terms and treatment in its credit advice",
    declaration:
      "I/We hereby solemnly declare and confirm that the services remunerated by this inward SWIFT remittance were performed and supplied wholly outside the tax territory of the receiving jurisdiction to a foreign client established abroad; that the funds constitute export-of-services proceeds repatriated through the banking channel; and that I/we will apply for and rely upon any zero-rate, exemption or relief available to such export proceeds as per the applicable law.",
    optionLabel: "Global — Standard SWIFT Inward Exemption & Settlement Advice",
  },
];

const SCHEME_BY_SLUG: Record<string, PrcSchemeId> = {
  "usd-to-pkr": "pkr",
  "usd-to-inr": "inr",
  "usd-to-php": "php",
  "usd-to-mxn": "mxn",
  "usd-to-pln": "pln",
};

/** Resolves the statutory scheme for an audited corridor slug (global fallback). */
export function prcSchemeForSlug(slug: string): PrcScheme {
  const scheme = PRC_SCHEMES.find((item) => item.id === SCHEME_BY_SLUG[slug]);
  return scheme ?? PRC_SCHEMES[PRC_SCHEMES.length - 1];
}

/**
 * Deterministic hint-based resolver used when no corridor slug is available
 * (e.g. the Invoice Studio), so picking a purpose code / statutory authority
 * snaps the letter onto the right jurisdiction.
 */
export function prcSchemeFromHints(
  purposeCode?: string,
  authority?: string
): PrcScheme {
  const haystack = `${purposeCode ?? ""} ${authority ?? ""}`.toLowerCase();
  if (haystack.includes("9111") || haystack.includes("154a") || haystack.includes("sbp")) {
    return prcSchemeForSlug("usd-to-pkr");
  }
  if (haystack.includes("p0802") || haystack.includes("rbi") || haystack.includes("cgst") || haystack.includes("44ada") || haystack.includes("96a")) {
    return prcSchemeForSlug("usd-to-inr");
  }
  if (haystack.includes("980") || haystack.includes("bir") || haystack.includes("pesonet")) {
    return prcSchemeForSlug("usd-to-php");
  }
  if (haystack.includes("29-d") || haystack.includes("113-e") || haystack.includes("resico") || haystack.includes("liva")) {
    return prcSchemeForSlug("usd-to-mxn");
  }
  if (haystack.includes("28b") || haystack.includes("pkwiu") || haystack.includes("ryczałt")) {
    return prcSchemeForSlug("usd-to-pln");
  }
  return PRC_SCHEMES[PRC_SCHEMES.length - 1];
}

/** Combined resolver: corridor slug wins, then inferred hints, then global. */
export function resolvePrcScheme(
  corridorSlug?: string,
  purposeCode?: string,
  authority?: string
): PrcScheme {
  if (corridorSlug) {
    return prcSchemeForSlug(corridorSlug);
  }
  return prcSchemeFromHints(purposeCode, authority);
}

/* ---------------------------------------------------------------------------
 * Letter model & builder.
 * ------------------------------------------------------------------------- */

/** Merged form state passed into the document builder. */
export interface PrcLetterParts {
  beneficiaryName: string;
  accountNumber: string;
  remitter: string;
  transferRef: string;
  currency: string;
  currencySymbol: string;
  grossForeign: number;
  netRealizationLocal: number;
  date: string;
  bankName: string;
  bankBranch: string;
  bankSwift: string;
  purposeCode: string;
  authority: string;
  tierName: string;
  tierRate: number;
}

export interface PrcLetterDocument {
  scheme: PrcScheme;
  parts: PrcLetterParts;
  subject: string;
  address: string[];
  beneficiaryRows: { label: string; value: string }[];
  paragraphs: string[];
  signatureName: string;
  signatureTitle: string;
  disclaimer: string;
}

function formatMoney(value: number, symbol: string, min = 2, max = 2): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${symbol}${n.toLocaleString("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })}`;
}

const LETTER_SUBJECT =
  "Request for Proceeds Realization Certificate (PRC/FIRC) & Statutory Zero-Tax Treatment on Inward Foreign Remittance";

const LETTER_DISCLAIMER =
  "Document generated in-browser by PayoutDelta as informational drafting support. It is not financial, tax or legal advice and does not replace the bank's official credit advice, PRC/FIRC or statutory certificate. Verify the applicable rates, fees and regulatory treatment before relying on it.";

export function buildPrcLetter(
  scheme: PrcScheme,
  parts: PrcLetterParts
): PrcLetterDocument {
  const tax =
    parts.tierRate && Number.isFinite(parts.tierRate)
      ? `${(parts.tierRate * 100).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })}%`
      : null;
  const regimeLine = tax ? `${scheme.regime} (${parts.tierName ?? scheme.certificateName}, ${tax})` : scheme.regime;

  const beneficiaryRows: PrcLetterDocument["beneficiaryRows"] = [
    { label: "Beneficiary", value: parts.beneficiaryName || "—" },
    { label: "Account / IBAN", value: parts.accountNumber || "—" },
    { label: "Currency", value: parts.currency || "—" },
    {
      label: "Inward gross (foreign)",
      value: formatMoney(parts.grossForeign, "$"),
    },
    {
      label: "Net settlement",
      value: formatMoney(parts.netRealizationLocal, parts.currencySymbol || " "),
    },
  ];

  const paragraphs: string[] = [];

  paragraphs.push(
    `I am writing with reference to an inward foreign remittance credited (or to be credited) to my/our account held with you. The particulars of the remittance are as follows:`
  );

  paragraphs.push(
    [
      `Remitter / contracting party: ${parts.remitter.trim() || "—"}`,
      `Remittance reference / UETR / transfer ID: ${parts.transferRef.trim() || "—"}`,
      `Inward gross amount (foreign currency): ${formatMoney(parts.grossForeign, "$")} USD`,
      `Net settlement to be realised in local currency: ${formatMoney(parts.netRealizationLocal, parts.currencySymbol || " ")}`,
      `Receiving bank: ${parts.bankName.trim() || "—"}${parts.bankBranch.trim() ? `, ${parts.bankBranch.trim()}` : ""}${parts.bankSwift.trim() && parts.bankSwift !== "—" ? ` (SWIFT/BIC: ${parts.bankSwift.trim()})` : ""}`,
    ].join("\n")
  );

  paragraphs.push(
    `The remittance constitutes proceeds of services supplied by me/us as a service exporter and corresponds, in the banking record, to statutory purpose code “${parts.purposeCode.trim() || scheme.purposeCodeDefault}” (${scheme.purposeCodeLabel}). The transaction is governed by ${parts.authority.trim() || scheme.statutoryReference}.`
  );

  paragraphs.push(
    `I/We respectfully request that the statutory regime applicable to export proceeds be applied to this credit, namely ${regimeLine}. No further tax, adjustment or set-off should be levied on the credit beyond the treatment declared above.`
  );

  paragraphs.push(scheme.declaration);

  paragraphs.push(
    `I/We therefore request that: (1) ${parts.authority.includes("FIRC") || parts.authority.includes("e-FIRC") ? "the FIRC / e-FIRC evidence" : "the correspondent PRC / remittance certificate or settlement advice evidencing realization"} be issued and forwarded to me/us for both the revenue authorities and my/our records; and (2) the inward remittance be cleared at the applicable reference rate and credited net of only the published bank charges, with the statutory zero-tax / exemption treatment recorded on the credit advice.`
  );

  paragraphs.push(
    `I/We declare that the information furnished above is true and correct, and undertake to indemnify the bank against any loss, tax or penalty arising from any misrepresentation made herein. Without prejudice, I/we remain liable for any income tax that may finally become payable under the applicable law on the income represented by this remittance.`
  );

  return {
    scheme,
    parts,
    subject: LETTER_SUBJECT,
    address: [
      "The Branch Manager,",
      parts.bankName.trim() || "Receiving Bank",
      parts.bankBranch.trim() ? parts.bankBranch.trim() : null,
      parts.bankSwift.trim() && parts.bankSwift !== "—"
        ? `SWIFT/BIC: ${parts.bankSwift.trim()}`
        : null,
    ].filter((line): line is string => line !== null),
    beneficiaryRows,
    paragraphs,
    signatureName: parts.beneficiaryName,
    signatureTitle: parts.beneficiaryName ? "Beneficiary" : "",
    disclaimer: LETTER_DISCLAIMER,
  };
}

/** Flat plain-text rendering used by the "Copy Letter Text" action. */
export function buildPrcLetterText(doc: PrcLetterDocument): string {
  const rows = doc.parts;
  const scheme = doc.scheme;
  const dateLabel = formatHumanReadableDate(rows.date);

  const lines: string[] = [];
  lines.push("PAYOUTDELTA — STATUTORY EXPORT EXEMPTION CORRESPONDENCE");
  lines.push(`JURISDICTION: ${scheme.optionLabel}`);
  lines.push(`DATE: ${dateLabel}`);
  lines.push("");
  lines.push(doc.address.join("\n"));
  lines.push("");
  lines.push(`Subject: ${doc.subject}`);
  lines.push("");
  lines.push("Dear Sir/Madam,");
  lines.push("");
  doc.paragraphs.forEach((paragraph, index) => {
    if (index === 1) {
      lines.push(paragraph.split("\n").map((line) => `  • ${line}`).join("\n"));
    } else {
      lines.push(paragraph);
    }
    lines.push("");
  });
  lines.push("Yours faithfully,");
  lines.push("");
  lines.push("____________________");
  lines.push(rows.beneficiaryName || "____________________");
  lines.push(`Beneficiary account: ${rows.accountNumber || "—"}`);
  lines.push("");
  lines.push("-----");
  lines.push(doc.disclaimer);
  return lines.join("\n");
}

function formatHumanReadableDate(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ---------------------------------------------------------------------------
 * localStorage persistence (client-only, guarded for SSR).
 * ------------------------------------------------------------------------- */

export const PRC_STORAGE_PREFIX = "payoutdelta_prc_letter_";

export function prcStorageKey(corridorSlug?: string): string {
  return `${PRC_STORAGE_PREFIX}${corridorSlug || "global"}`;
}

export interface PrcLetterPrefill {
  corridorSlug?: string;
  beneficiaryName?: string;
  accountNumber?: string;
  remitter?: string;
  transferRef?: string;
  currency?: string;
  currencySymbol?: string;
  bankName?: string;
  bankSwift?: string;
  bankBranch?: string;
  grossUsd?: number;
  netRealizationLocal?: number;
  tierName?: string;
  tierRate?: number;
  purposeCode?: string;
  authority?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Read the persisted form shell for a corridor, or `null`. */
export function loadPrcForm(corridorSlug?: string): Partial<PrcLetterPrefill> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(prcStorageKey(corridorSlug));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const toNum = (v: unknown, fallback: number) => {
      const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
      return Number.isFinite(n) ? n : fallback;
    };
    const toStr = (v: unknown, fallback = "") =>
      typeof v === "string" && v.trim() !== "" ? v : fallback;
    return {
      beneficiaryName: toStr(parsed.beneficiaryName),
      accountNumber: toStr(parsed.accountNumber),
      remitter: toStr(parsed.remitter),
      transferRef: toStr(parsed.transferRef),
      bankName: toStr(parsed.bankName),
      bankSwift: toStr(parsed.bankSwift),
      bankBranch: toStr(parsed.bankBranch),
      currency: toStr(parsed.currency),
      currencySymbol: toStr(parsed.currencySymbol),
      purposeCode: toStr(parsed.purposeCode),
      authority: toStr(parsed.authority),
      tierName: toStr(parsed.tierName),
      tierRate: toNum(parsed.tierRate, 0),
      grossUsd: toNum(parsed.grossUsd, 0),
      netRealizationLocal: toNum(parsed.netRealizationLocal, 0),
    };
  } catch {
    return null;
  }
}

/** Persist the form shell for a corridor. Client-only, quota-safe. */
export function savePrcForm(
  corridorSlug: string | undefined,
  form: Partial<PrcLetterPrefill>
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(prcStorageKey(corridorSlug), JSON.stringify(form));
  } catch {
    // Quota / private browsing — the letter still drafts in memory.
  }
}