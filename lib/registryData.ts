import banksRegistryJson from "@/data/banksRegistry.json";
import jurisdictionsJson from "@/data/jurisdictions.json";
import railsJson from "@/data/rails.json";

import {
  BANK_DOSSIERS,
  type BankDossier,
  type ChargeCode,
} from "@/data/banks";
import type {
  BankNode,
  ClearingRailNode,
  RailProtocol,
  SovereignJurisdictionNode,
  StatutoryRule,
} from "@/data/contracts";

/**
 * PayoutDelta — Phase 3 ports over the hexagonal registries.
 *
 * `data/contracts.ts` declares the node shapes; this module is the single seam
 * between those three JSON registries and every consumer, exactly as
 * `lib/db.ts` is the seam for `data/fees.json`. Nothing here mutates a node and
 * nothing here reaches the network: the registries are read once at module
 * scope during the static render, normalized once, and handed out as readonly
 * arrays.
 *
 *   - `data/rails.json`         110 clearing rails
 *   - `data/jurisdictions.json` 195 sovereign states
 *   - `data/banksRegistry.json` 266 verified ISO 9362 heads
 *
 * NORMALIZATION
 * The JSON is authored data, not a typed API, so each node is validated once
 * here instead of at 195 render sites: an unknown rail protocol falls back to
 * `RTGS`, a charge code outside OUR/SHA/BEN is dropped, a tier outside {1, 2}
 * is treated as tier 2 (domestic settlement bank), and a BIC that does not
 * parse is reported as unvalidated rather than silently trusted. The build-time
 * auditor (`scripts/test_corridors.mjs`, gates S2.5–S2.7) is the hard gate; this
 * module is the soft gate that keeps a bad row from rendering a wrong label.
 *
 * Nothing in here may be imported from a client component: the payloads are
 * large. Client islands receive the flat, derived shapes in
 * `components/tax-clearance/payload.ts` and `components/banks/`.
 */

/* -------------------------------------------------------------------------- *
 * Raw JSON shapes — deliberately widened so the validators below are the only
 * place a type assertion happens.
 * -------------------------------------------------------------------------- */

interface RawStatutoryRule {
  enactmentYear: number;
  lastAmendedYear: number;
  statutoryAct: string;
  purposeCode: string;
  baselineWhtPct: number;
  treatyWhtPct: number;
  exemptionConditions: string[] | undefined;
  safeHarborRules: string[] | undefined;
  mandatoryAuditCert: string;
  nonComplianceRisk: string;
}

interface RawJurisdiction {
  iso2: string;
  name: string;
  currency: string;
  centralBank: string;
  primaryRailId: string;
  tax: RawStatutoryRule;
  primaryBankBics: string[] | undefined;
}

interface RawRail {
  id: string;
  operator: string;
  protocol: string;
  finalityWindow: string;
  instant: boolean;
  baseHopCutUSD: number;
}

interface RawBank {
  bic: string;
  name: string;
  countryIso2: string;
  tier: number;
  usdGsibCorrespondent: string;
  supportedCharges: string[] | undefined;
  defaultIntermediaryCutUSD: number;
  avgTransitHours: number;
}

/* -------------------------------------------------------------------------- *
 * Normalization
 * -------------------------------------------------------------------------- */

const RAIL_PROTOCOLS: readonly RailProtocol[] = ["RTGS", "INSTANT", "BATCH", "CHAPS"];
const CHARGE_CODES: readonly ChargeCode[] = ["SHA", "OUR", "BEN"];

function toText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toYear(value: unknown, fallback: number): number {
  const year = toNumber(value, fallback);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : fallback;
}

function toBand(value: unknown): number {
  const band = toNumber(value, 0);
  if (band < 0 || band > 50) return 0;
  return band;
}

const RAILS: readonly ClearingRailNode[] = (railsJson.rails as RawRail[]).map(
  (node): ClearingRailNode => ({
    id: toText(node.id, "UNREGISTERED_RAIL"),
    operator: toText(node.operator, "Unspecified operator"),
    protocol: (RAIL_PROTOCOLS as readonly string[]).includes(node.protocol)
      ? (node.protocol as RailProtocol)
      : "RTGS",
    finalityWindow: toText(node.finalityWindow, "Not published"),
    instant: node.instant === true,
    baseHopCutUSD: toNumber(node.baseHopCutUSD, 0),
  }),
);

const RAIL_BY_ID: ReadonlyMap<string, ClearingRailNode> = new Map(
  RAILS.map((rail) => [rail.id, rail]),
);

const JURISDICTIONS: readonly SovereignJurisdictionNode[] = (
  jurisdictionsJson.jurisdictions as RawJurisdiction[]
).map(
  (node): SovereignJurisdictionNode => {
    const tax: StatutoryRule = {
      enactmentYear: toYear(node.tax?.enactmentYear, 1900),
      lastAmendedYear: toYear(node.tax?.lastAmendedYear, 1900),
      statutoryAct: toText(node.tax?.statutoryAct, "No published statute"),
      purposeCode: toText(node.tax?.purposeCode, "Local bank reporting only"),
      baselineWhtPct: toBand(node.tax?.baselineWhtPct),
      treatyWhtPct: Math.min(
        toBand(node.tax?.treatyWhtPct),
        toBand(node.tax?.baselineWhtPct)
      ),
      exemptionConditions: toStringList(node.tax?.exemptionConditions),
      safeHarborRules: toStringList(node.tax?.safeHarborRules),
      mandatoryAuditCert: toText(
        node.tax?.mandatoryAuditCert,
        "None published"
      ),
      nonComplianceRisk: toText(
        node.tax?.nonComplianceRisk,
        "Exposure is limited to bank reporting exceptions"
      ),
    };
    return {
      iso2: toText(node.iso2, "ZZ").toUpperCase(),
      name: toText(node.name, "Unnamed jurisdiction"),
      currency: toText(node.currency, "XXX").toUpperCase(),
      centralBank: toText(node.centralBank, "Unspecified monetary authority"),
      primaryRailId: toText(node.primaryRailId, "SWIFT_RTGS"),
      tax,
      primaryBankBics: toStringList(node.primaryBankBics),
    };
  }
);

const JURISDICTION_BY_ISO2: ReadonlyMap<string, SovereignJurisdictionNode> = new Map(
  JURISDICTIONS.map((node) => [node.iso2, node]),
);

const BANK_NODES: readonly BankNode[] = (banksRegistryJson.banks as RawBank[]).map(
  (node): BankNode => ({
    bic: toText(node.bic, "UNKNOWN0XXX"),
    name: toText(node.name, "Unnamed institution"),
    countryIso2: toText(node.countryIso2, "ZZ").toUpperCase(),
    tier: node.tier === 1 ? 1 : 2,
    usdGsibCorrespondent: toText(node.usdGsibCorrespondent, ""),
    supportedCharges: toStringList(node.supportedCharges).filter(
      (code): code is ChargeCode =>
        (CHARGE_CODES as readonly string[]).includes(code)
    ),
    defaultIntermediaryCutUSD: toNumber(node.defaultIntermediaryCutUSD, 0),
    avgTransitHours: toNumber(node.avgTransitHours, 0),
  })
);

const BANK_NODE_BY_BIC: ReadonlyMap<string, BankNode> = new Map(
  BANK_NODES.map((node) => [node.bic, node])
);

const DOSSIER_BY_BIC: ReadonlyMap<string, BankDossier> = new Map(
  BANK_DOSSIERS.map((dossier) => [dossier.swiftBic, dossier])
);

/* -------------------------------------------------------------------------- *
 * Registry ports
 * -------------------------------------------------------------------------- */

/** Every registered clearing rail, in registry order. */
export function getRails(): readonly ClearingRailNode[] {
  return RAILS;
}

/** One rail by id, or `undefined` when the foreign key does not resolve. */
export function getRailById(id: string): ClearingRailNode | undefined {
  return RAIL_BY_ID.get(id);
}

/** Every sovereign jurisdiction — 193 UN members plus VA and PS. */
export function getJurisdictions(): readonly SovereignJurisdictionNode[] {
  return JURISDICTIONS;
}

/** One sovereign jurisdiction by ISO 3166-1 alpha-2 code. */
export function getJurisdictionByIso2(iso2: string): SovereignJurisdictionNode | undefined {
  return JURISDICTION_BY_ISO2.get(iso2.toUpperCase());
}

/** Every verified institution head in the bank registry. */
export function getBankNodes(): readonly BankNode[] {
  return BANK_NODES;
}

/** One institution by its real ISO 9362 head. */
export function getBankNodeByBic(bic: string): BankNode | undefined {
  return BANK_NODE_BY_BIC.get(bic.toUpperCase());
}

/** Every institution registered in one sovereign market, name-ordered. */
export function getBankNodesByCountry(iso2: string): readonly BankNode[] {
  const target = iso2.toUpperCase();
  return BANK_NODES.filter((node) => node.countryIso2 === target).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/** Registry provenance block, surfaced in the page hero and the JSON-LD. */
export function getRegistryMeta(): {
  railCount: number;
  jurisdictionCount: number;
  bankCount: number;
  tier1Count: number;
  tier2Count: number;
  jurisdictionsCovered: number;
  disclaimer: string;
} {
  return {
    railCount: RAILS.length,
    jurisdictionCount: JURISDICTIONS.length,
    bankCount: BANK_NODES.length,
    tier1Count: BANK_NODES.filter((node) => node.tier === 1).length,
    tier2Count: BANK_NODES.filter((node) => node.tier === 2).length,
    jurisdictionsCovered: new Set(
      BANK_NODES.map((node) => node.countryIso2)
    ).size,
    disclaimer: toText(
      banksRegistryJson.meta?.disclaimer,
      "Informational benchmark. Verify the head and the deduction with the institution before invoicing."
    ),
  };
}

/** Statutory framework of one market, resolved through the jurisdiction port. */
export function getStatutoryRule(iso2: string): StatutoryRule | undefined {
  return getJurisdictionByIso2(iso2)?.tax;
}

/* -------------------------------------------------------------------------- *
 * ISO 9362 validation
 * -------------------------------------------------------------------------- */

/**
 * Result of parsing one BIC against ISO 9362:2014.
 *
 * Layout is `4!a2!a2!c[3!c]` — a four-letter institution code, a two-letter
 * registration country, a two-character location code and an optional
 * three-character branch qualifier that is `XXX` at the primary office. The
 * country characters are also the foreign key into the jurisdiction registry, so
 * a head whose embedded country disagrees with its declared market is reported
 * as a mismatch rather than quietly rendered.
 */
export interface BicValidation {
  /** True when the head parses and, if given, agrees with the declared market. */
  valid: boolean;
  /** 8 (institution) or 11 (with branch qualifier), 0 when unparseable. */
  length: number;
  /** Four-character institution code, e.g. `CHAS`. */
  bankCode: string;
  /** Two-character registration country, e.g. `US`. */
  countryCode: string;
  /** Two-character primary-location code, e.g. `33`. */
  locationCode: string;
  /** Three-character branch qualifier, `XXX` at the primary office. */
  branchCode: string;
  /** True for an 8-character head or an 11-character head ending `XXX`. */
  primaryOffice: boolean;
  /** Human-readable reasons the head is not routable as declared. */
  issues: string[];
}

const BIC_RE = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const BIC_ALPHANUMERIC_RE = /^[A-Z0-9]{4,11}$/;

/** Parse and validate one BIC, optionally cross-checked against a market. */
export function validateBic(
  bic: string,
  expectedIso2?: string
): BicValidation {
  const head = (bic ?? "").trim().toUpperCase();
  const issues: string[] = [];

  if (!BIC_ALPHANUMERIC_RE.test(head)) {
    issues.push("Head is not 4–11 uppercase alphanumeric characters.");
  } else if (!BIC_RE.test(head)) {
    issues.push(
      "Head does not parse as ISO 9362 (4 letters, 2 country, 2 location, optional 3-character branch)."
    );
  }

  const expected = expectedIso2?.toUpperCase();
  if (expected && head.slice(4, 6) !== expected) {
    issues.push(
      `Embedded country ${head.slice(4, 6) || "—"} does not match the declared market ${expected}.`
    );
  }

  // An 11-character head ending XXX is the registered primary office, which is
  // the routable form; any other 3-character qualifier is a branch.
  const branch = head.length === 11 ? head.slice(8, 11) : "";
  const primaryOffice = head.length === 8 || branch === "XXX";

  return {
    valid: issues.length === 0,
    length: BIC_ALPHANUMERIC_RE.test(head) ? head.length : 0,
    bankCode: head.slice(0, 4),
    countryCode: head.slice(4, 6),
    locationCode: head.slice(6, 8),
    branchCode: branch,
    primaryOffice,
    issues,
  };
}

/* -------------------------------------------------------------------------- *
 * Unified institution profile
 * -------------------------------------------------------------------------- */

/**
 * One routable institution: the registry node merged with the authored dossier
 * when this repository has a deep-dive profile for it, plus the domestic rail
 * resolved through the jurisdiction foreign key.
 *
 * The 23 authored dossiers in `data/banks.ts` keep their published slugs so no
 * live URL moves; every other verified head is addressed by its lowercased BIC
 * (`/banks/chasus33/`), which is unique by construction and stable across
 * rebuilds because it is derived from the real institution identifier.
 */
export interface BankProfile {
  /** URL slug for `/banks/<slug>/`. */
  slug: string;
  /** Real ISO 9362 head. */
  bic: string;
  /** Legal name as published. */
  name: string;
  /** Short display label. */
  shortName: string;
  countryIso2: string;
  countryName: string;
  /** Regional-indicator flag for the registration market. */
  flag: string;
  /** 1 = global correspondent clearing hub, 2 = domestic settlement bank. */
  tier: 1 | 2;
  role: string;
  /** SWIFT correspondent carrying this institution's USD leg ("" when unpublished). */
  usdGsibCorrespondent: string;
  /** Name of the USD correspondent, resolved from the registry. */
  usdGsibCorrespondentName: string;
  /** Registration market of the USD correspondent ("" when unpublished). */
  usdGsibCountryIso2: string;
  /** Charge codes honoured on an inbound credit advice. */
  supportedCharges: readonly ChargeCode[];
  /** Benchmark correspondent cut in USD. */
  defaultIntermediaryCutUSD: number;
  /** Typical correspondent transit in hours. */
  avgTransitHours: number;
  /** Domestic rail the credit lands on, resolved through the jurisdiction. */
  rail: ClearingRailNode | null;
  railId: string;
  iso9362: BicValidation;
  /** True when this repository publishes a full authored dossier for the head. */
  hasDossier: boolean;
  /** The authored dossier, when one exists. */
  dossier: BankDossier | null;
}

/** Regional-indicator flag from an ISO 3166-1 alpha-2 code. */
export function flagOf(iso2: string): string {
  const base = 0x1f1e6;
  return (iso2 ?? "")
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(base + char.charCodeAt(0) - 65)
    );
}

/**
 * Title-case a registry institution name into a display label.
 *
 * Registry names are publisher strings ("BANQUE DE L'AGRICULTURE…"), so they are
 * downcased for the short label rather than reflowed — a mis-cased acronym is
 * worse than a long card title, and the legal name stays on the page.
 */
function shortLabelOf(name: string): string {
  return name.length <= 34 ? name : `${name.slice(0, 33).trimEnd()}…`;
}

const BANK_PROFILES: readonly BankProfile[] = BANK_NODES.map((node) => {
  const jurisdiction = JURISDICTION_BY_ISO2.get(node.countryIso2);
  const dossier = DOSSIER_BY_BIC.get(node.bic) ?? null;
  const anchor =
    node.usdGsibCorrespondent === node.bic
      ? null
      : BANK_NODE_BY_BIC.get(node.usdGsibCorrespondent) ?? null;
  return {
    slug: dossier?.slug ?? node.bic.toLowerCase(),
    bic: node.bic,
    name: dossier?.name ?? node.name,
    shortName: dossier?.shortName ?? shortLabelOf(node.name),
    countryIso2: node.countryIso2,
    countryName: jurisdiction?.name ?? node.countryIso2,
    flag: flagOf(node.countryIso2),
    tier: node.tier,
    role:
      node.tier === 1
        ? "Global Correspondent Clearing Hub"
        : "Domestic Beneficiary Rail",
    usdGsibCorrespondent: node.usdGsibCorrespondent,
    usdGsibCorrespondentName: anchor?.name ?? "",
    usdGsibCountryIso2: anchor?.countryIso2 ?? "",
    supportedCharges: node.supportedCharges,
    defaultIntermediaryCutUSD: node.defaultIntermediaryCutUSD,
    avgTransitHours: node.avgTransitHours,
    rail: jurisdiction ? RAIL_BY_ID.get(jurisdiction.primaryRailId) ?? null : null,
    railId: jurisdiction?.primaryRailId ?? "SWIFT_RTGS",
    iso9362: validateBic(node.bic, node.countryIso2),
    hasDossier: dossier !== null,
    dossier,
  };
});

const BANK_PROFILE_BY_SLUG: ReadonlyMap<string, BankProfile> = new Map(
  BANK_PROFILES.map((profile) => [profile.slug, profile])
);

/** Every routable institution — one per verified head in the registry. */
export function getBankProfiles(): readonly BankProfile[] {
  return BANK_PROFILES;
}

/** One institution by its `/banks/<slug>/` slug. */
export function getBankProfileBySlug(slug: string): BankProfile | undefined {
  return BANK_PROFILE_BY_SLUG.get(slug);
}

/** One institution by its real ISO 9362 head. */
export function getBankProfileByBic(bic: string): BankProfile | undefined {
  return BANK_PROFILES.find((profile) => profile.bic === bic.toUpperCase());
}
