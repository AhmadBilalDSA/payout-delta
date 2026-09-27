/**
 * PayoutDelta — Hexagonal normalization contracts (Phase 1 & 2).
 *
 * The payout engine is modelled as a set of hexagons. Each hexagon owns one
 * normalized registry and is expressed in this file as an immutable contract so
 * the build, the audit (`scripts/test_corridors.mjs`) and every UI surface read
 * the same shape:
 *
 *   - `ClearingRailNode`      -> data/rails.json         (110 rails)
 *   - `SovereignJurisdictionNode` -> data/jurisdictions.json (195 states)
 *   - `StatutoryRule`         -> embedded per jurisdiction, not a standalone file
 *   - `BankNode`              -> data/banksRegistry.json  (verified ISO 9362 heads)
 *
 * Ports (pure functions over these records) live in `lib/`; adapters (React
 * components, static routes) never mutate a node. All collection fields are
 * `readonly` so a registry is safe to share across the static render pass, the
 * client bundle and the build-time auditor.
 *
 * Every monetary figure below is an informational benchmark derived from public
 * statute. It is not legal or tax advice: the deduction actually lands on the
 * bank's credit advice (CRF) and must be confirmed with the paying bank's
 * compliance desk and the resident tax authority before invoicing.
 */

/** Settlement family of a clearing rail. */
export type RailProtocol = "RTGS" | "INSTANT" | "BATCH" | "CHAPS";

/**
 * Statutory withholding / export-compliance framework of one sovereign
 * jurisdiction. `baselineWhtPct` is the domestic statutory band that applies to
 * a cross-border service remittance absent relief; `treatyWhtPct` is the reduced
 * band available once treaty or domestic exemption conditions are evidenced.
 * Both are percentages (0–100), never decimal fractions.
 */
export interface StatutoryRule {
  /** Year the governing act was first enacted. */
  enactmentYear: number;
  /** Year of the most recent in-force amendment to the governing act. */
  lastAmendedYear: number;
  /** Governing statute, e.g. "Income Tax Ordinance 2001, Section 154A". */
  statutoryAct: string;
  /** Regulator purpose / transaction code, e.g. "9111", "P0802". */
  purposeCode: string;
  /** Statutory withholding band as a percentage (0–100). */
  baselineWhtPct: number;
  /** Treaty or exemption-relief band as a percentage (0–100). */
  treatyWhtPct: number;
  /** Conditions that must hold before the relief band applies. */
  exemptionConditions: readonly string[];
  /** Documented routes that a remittance desk may rely on as a safe harbour. */
  safeHarborRules: readonly string[];
  /** Certificate the beneficiary must hold for the credit to be creditable. */
  mandatoryAuditCert: string;
  /** Practical exposure of a mis-declared remittance. */
  nonComplianceRisk: string;
}

/**
 * One sovereign state in the hexagon. `primaryRailId` is a foreign key into
 * `data/rails.json`; `primaryBankBics` holds ISO 9362 BICs (8 or 11 characters)
 * and may be empty where no rail-local BIC is published for the market.
 */
export interface SovereignJurisdictionNode {
  /** ISO 3166-1 alpha-2. */
  iso2: string;
  /** English short name of the state. */
  name: string;
  /** ISO 4217 alphabetic currency code. */
  currency: string;
  /** Issuing monetary authority (central bank). */
  centralBank: string;
  /** Foreign key into the clearing-rail registry. */
  primaryRailId: string;
  /** Statutory withholding / export-compliance framework. */
  tax: StatutoryRule;
  /** ISO 9362 BICs of the principal receiving banks. */
  primaryBankBics: readonly string[];
}

/**
 * One domestic or correspondent clearing rail. `baseHopCutUSD` is the local
 * deduction a rail imposes on a credit that arrives over that same rail: every
 * registered rail is a zero local-deduction sentinel (0) because a domestic
 * clearing rail adds no correspondent hop. Any non-zero hop cost is modelled
 * upstream in `data/fees.json` (`defaultIntermediaryUSD`), never here.
 */
export interface ClearingRailNode {
  /** Stable rail identifier, e.g. "RAAST", "FEDWIRE", "ESAS". */
  id: string;
  /** Operating institution or scheme. */
  operator: string;
  /** Settlement family. */
  protocol: RailProtocol;
  /** Human-readable finality window, e.g. "T+0 intraday", "Seconds (24/7)". */
  finalityWindow: string;
  /** True when the rail credits the beneficiary without a value date. */
  instant: boolean;
  /** Local deduction sentinel — always 0 for a registered clearing rail. */
  baseHopCutUSD: number;
}

/**
 * One receiving institution in the hexagon. `bic` is the institution's real,
 * publisher-listed ISO 9362 head (8 characters, optionally 11) and
 * `countryIso2` is a foreign key into `data/jurisdictions.json`; the build-time
 * auditor rejects any head that does not parse, so a typo can never reach a
 * static route.
 *
 * PROVENANCE — why this registry is small on purpose
 * Only BICs the project can actually evidence are published here. A BIC is a
 * routing instruction: inventing one to inflate a count would put a
 * non-existent institution into a financial reference, so the registry is
 * sourced exclusively from the records already carried in this repository
 * (`data/regulatoryBanking.ts`, `data/banks.ts`, `data/jurisdictions.json`) plus
 * the major global systemically-important banks. `data/banksRegistry.json`
 * states the verified count and the sourcing in its own `meta` block, and a
 * jurisdiction with no evidenced head simply publishes an empty
 * `primaryBankBics` array rather than a guess.
 */
export interface BankNode {
  /** Real ISO 9362 institution identifier, 8 or 11 characters. */
  bic: string;
  /** Short institution name as published by the institution. */
  name: string;
  /** Foreign key into the sovereign-jurisdiction registry. */
  countryIso2: string;
  /** 1 = global systemically important bank, 2 = domestic settlement bank. */
  tier: 1 | 2;
  /** SWIFT correspondent that carries this institution's USD leg. */
  usdGsibCorrespondent: string;
  /** Charge codes the institution accepts on an inbound credit advice. */
  supportedCharges: readonly ("OUR" | "SHA" | "BEN")[];
  /** Benchmark intermediary cut in USD on the correspondent hop. */
  defaultIntermediaryCutUSD: number;
  /** Typical correspondent transit to a credited account, in hours. */
  avgTransitHours: number;
}
