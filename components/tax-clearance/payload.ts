/**
 * PayoutDelta — Track 4 client payload contract (Statutory Purpose Code & Tax
 * Clearance Wizard).
 *
 * Same discipline as `components/dashboard/payload.ts`: this route is a static
 * export, so the 195-state statutory manifest, the 110-rail registry, the
 * 266-head bank registry and `data/fees.json` are resolved ONCE on the server
 * and the client island reads a flat, serializable shape of numbers and short
 * strings. Nothing here reaches back into `data/jurisdictions.json`,
 * `data/rails.json`, `data/banksRegistry.json` or `lib/registryData.ts` from the
 * browser.
 *
 * The split matters for this page in particular: the authored clearance
 * playbooks (Form 'R' + ePRC, P0802 + FIRC, BSP FX Form 1 + BIR Form 2307, DIAN
 * Formato 1060 / BCB Contrato de Câmbio) are regulatory prose, while the
 * statute, purpose code, band, rail and institution list are registry facts. The
 * server merges the two here and the island only lays them out.
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

/* ========================================================================== *
 * Phase 3 — the statutory tax wizard: one record per sovereign state.
 * ========================================================================== */

/** The domestic clearing rail a credit into the market lands on. */
export interface StatuteRail {
  /** Registry id, e.g. "RAAST", "IMPS", "TARGET2". */
  id: string;
  /** Operating institution or scheme. */
  operator: string;
  /** Settlement family: RTGS / INSTANT / BATCH / CHAPS. */
  protocol: string;
  /** Published finality window, e.g. "T+0 intraday". */
  finalityWindow: string;
  /** True when the rail credits without a value date. */
  instant: boolean;
}

/** One verified institution receiving credits in the market. */
export interface StatuteBank {
  /** `/banks/<slug>/` target, so a wizard selection deep-links to the dossier. */
  slug: string;
  bic: string;
  name: string;
  /** 1 = global correspondent clearing hub, 2 = domestic settlement bank. */
  tier: 1 | 2;
  /** Charge codes honoured on an inbound credit advice. */
  charges: string[];
  /** Benchmark correspondent cut in USD. */
  cutUSD: number;
  /** Typical correspondent transit in hours. */
  transitHours: number;
}

/** The live priced corridor terminating in this market, when one is published. */
export interface StatuteCorridor {
  slug: string;
  /** `USD → PKR` */
  pair: string;
  /** Interbank reference rate (local units per USD). */
  rate: number;
}

/**
 * Authored field playbook for the five markets where the documentary step is
 * the hard part (ePRC, FIRC, BIR 2307, Contrato de Câmbio, Declaración de
 * Cambio). Every other market is served by the statutory record alone.
 */
export interface StatutePlaybook {
  id: string;
  region: string;
  eyebrow: string;
  title: string;
  summary: string;
  steps: ClearanceStep[];
  documents: ClearanceDocument[];
  faqs: ClearanceFaq[];
}

/**
 * The complete statutory profile of one sovereign state, merged at build time
 * from `data/jurisdictions.json`, `data/rails.json` and `data/banksRegistry.json`.
 */
export interface StatutoryProfile {
  /** ISO 3166-1 alpha-2. */
  iso2: string;
  name: string;
  flag: string;
  currency: string;
  centralBank: string;
  /** Year the governing act was first enacted. */
  enactmentYear: number;
  /** Year of the most recent in-force amendment. */
  lastAmendedYear: number;
  /** Compact act label for the badge, e.g. "FEMA 1947". */
  shortAct: string;
  /** Full statutory citation, shown in full. */
  statutoryAct: string;
  /** Regulator purpose / transaction code, verbatim from the registry. */
  purposeCode: string;
  /** The code to paste into a remittance narrative, e.g. "9111", "P0802". */
  shortCode: string;
  /** Statutory band absent relief, as a percentage (0–100). */
  baselineWhtPct: number;
  /** Treaty / exemption band, as a percentage (0–100). */
  treatyWhtPct: number;
  /** True when relief is evidenced by a materially lower band. */
  treatyDifferential: boolean;
  exemptionConditions: string[];
  safeHarborRules: string[];
  mandatoryAuditCert: string;
  nonComplianceRisk: string;
  rail: StatuteRail;
  banks: StatuteBank[];
  corridor: StatuteCorridor | null;
  playbook: StatutePlaybook | null;
}

/** Build-time corpus totals for the wizard. */
export interface StatuteWizardStats {
  /** Sovereign states in the wizard. */
  jurisdictions: number;
  /** Clearing rails reachable from them. */
  rails: number;
  /** Verified institution heads behind them. */
  banks: number;
  /** Markets with a statutory withholding band above zero. */
  withholdingMarkets: number;
  /** Markets where treaty relief is evidenced by a lower band. */
  treatyReliefMarkets: number;
  /** Markets with an instant rail. */
  instantMarkets: number;
  /** Dataset revision date (ISO). */
  revisedOn: string;
}
