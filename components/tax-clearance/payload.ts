/**
 * PayoutDelta — Track 4 client payload contract (Statutory Purpose Code & Tax
 * Clearance Hub).
 *
 * Same discipline as `components/dashboard/payload.ts`: this route is a static
 * export, so the ~226KB statutory banking directory and `data/fees.json` are
 * resolved ONCE on the server and the client island reads a flat, serializable
 * shape of numbers and short strings. Nothing here reaches back into
 * `data/regulatoryBanking.ts` from the browser.
 *
 * The split matters for this page in particular: the authored clearance
 * playbooks (Form 'R' + ePRC, P0802 + FIRC, BSP FX Form 1, DIAN Formato 1060 /
 * BCB SCE) are regulatory prose, while the rate, the statutory tier table, the
 * receiving banks and the BIC list are dataset facts. The server merges the two
 * here and the island only lays them out.
 */

/** One numbered step of a clearance playbook. */
export interface ClearanceStep {
  title: string;
  body: string;
  /** Short right-aligned label: the form, deadline or filing channel. */
  meta?: string;
}

/** One document the exporter or freelancer must hold, and who issues it. */
export interface ClearanceDocument {
  name: string;
  issuer: string;
  /** What the document proves or which obligation it satisfies. */
  purpose: string;
}

/** One FAQ pair, reused verbatim for the on-page accordion and the FAQPage JSON-LD. */
export interface ClearanceFaq {
  question: string;
  answer: string;
}

/** A statutory withholding / exemption tier resolved from the regulatory database. */
export interface ClearanceTier {
  name: string;
  authority: string;
  /** Withholding as a decimal fraction (0.0025 = 0.25%). */
  rate: number;
  purposeCode?: string;
  exemption: boolean;
  note: string;
}

/** A receiving bank resolved from the statutory bank directory. */
export interface ClearanceBank {
  name: string;
  swiftCode: string;
  /** Clearance / realization timeline, straight from the directory. */
  clearance: string;
  /** Default landing fee in the domestic currency (0 = free local rail). */
  localFee: number;
  localCurrency: string;
}

/**
 * A single filing jurisdiction inside a track.
 *
 * A track maps 1:1 to a statute in South Asia (SBP, RBI) or the Philippines
 * (BSP), and 2:1 to a statute pair in Latin America — Colombia files the
 * Declaraci&oacute;n de Cambio with the Banco de la Rep&uacute;blica / DIAN while
 * Brazil registers the operation with a BCB-authorized institution and declares
 * the income to the Receita Federal. Each jurisdiction carries its own corridor,
 * rate, tiers and banks, so both halves of the LATAM track stay data-driven.
 */
export interface ClearanceJurisdiction {
  id: string;
  country: string;
  countryCode: string;
  /** Regional-indicator flag for the beneficiary market. */
  flag: string;
  /** Local currency code of the corridor (COP / BRL / …). */
  currency: string;
  currencyName: string;
  /** Short regulator label, e.g. "SBP", "RBI", "BSP", "BanRep · DIAN". */
  regulator: string;
  /** Governing authority string as published in the regulatory database. */
  authority: string;
  /** National clearing network identifier. */
  clearingNetwork: string;
  /** Extractable statutory evidence anchors (regulator + section). */
  citations: string[];
  /** Audited corridor this jurisdiction is priced against. */
  corridorSlug: string;
  /** `USD → PKR` */
  pair: string;
  /** Interbank reference rate (local units per USD). */
  rate: number;
  /** Statutory tier table for the corridor. */
  tiers: ClearanceTier[];
  /** Receiving banks a freelancer can actually be paid through. */
  banks: ClearanceBank[];
}

/**
 * One statutory track — the unit the reader switches between.
 *
 * `jurisdictions` holds one entry for the single-statute tracks and two for
 * Latin America, so the island renders the same grid shape everywhere instead of
 * branching on a flag.
 */
export interface ClearanceTrack {
  id: string;
  /** Receiving region, used for grouping and the rail label. */
  region: string;
  /** Regulator chip shown in the tab, e.g. "SBP · 9111". */
  eyebrow: string;
  title: string;
  /** Headline purpose-code / form label, e.g. "Purpose Code 9111 · ePRC". */
  codeLabel: string;
  summary: string;
  jurisdictions: ClearanceJurisdiction[];
  steps: ClearanceStep[];
  documents: ClearanceDocument[];
  faqs: ClearanceFaq[];
}

/** Build-time corpus totals shown in the page hero. */
export interface ClearanceStats {
  /** Corridors priced across the tracks. */
  corridors: number;
  /** Authored statutory tiers surfaced. */
  tiers: number;
  /** Receiving banks with a BIC behind the certificates. */
  banks: number;
  /** Dataset revision date (ISO). */
  revisedOn: string;
}
