import type { CorridorStatute } from "@/components/agencies/ExecutiveTreasuryReport";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import { getJurisdictionByIso2 } from "@/lib/registryData";
import type { Corridor } from "@/lib/types";

/**
 * PayoutDelta — Phase 5 statutory context for the executive treasury report.
 *
 * WHY THIS IS A SEPARATE SERVER-ONLY SEAM
 * `lib/registryData.ts` carries the rule that the jurisdiction / rail / bank
 * registries must never be imported from a client component — the payloads are
 * large and the whole point of that module is to keep them on the server. The
 * executive report, however, is rendered *inside* the agency calculator, which
 * is a client island with live roster state. The two are reconciled here, on
 * the server, once, and the result is handed to the island as a flat
 * `slug -> statute` map: the client receives ~131 short records of statutory
 * prose it actually renders, not 195 jurisdiction nodes and 110 rails.
 *
 * Everything below is read from the same registries the wizard, the bank
 * dossiers and the directory render from, so the memorandum cannot quote a
 * purpose code that contradicts `/tax-clearance/`. Nothing is authored here:
 * `purposeCode`, `mandatoryAuditCert` and `safeHarborRules` are projections of
 * `data/jurisdictions.json`, and the rail / network lines are projections of
 * `data/regulatoryBanking.ts`. A corridor whose market is absent from the
 * statute registry resolves to `undefined` and the report prints an explicit
 * "obtain the certificate from the receiving institution" line rather than an
 * invented one.
 */

export type CorridorStatuteMap = Readonly<Record<string, CorridorStatute>>;

/**
 * Statutory context for one corridor, or `undefined` when its market declares
 * no regime. The first safe-harbour rule is carried verbatim and truncated
 * nowhere: it is the audit-defensible route, and paraphrasing it in a memo would
 * make the memo worthless as evidence.
 */
export function corridorStatute(corridor: Corridor): CorridorStatute | undefined {
  const jurisdiction = getJurisdictionByIso2(corridor.countryCode);
  if (!jurisdiction) return undefined;

  const regulation = getRegulatoryBanking(corridor.slug);
  const rail = regulation.localSettlementRail;
  const safeHarbor = jurisdiction.tax.safeHarborRules[0];

  return {
    authority: jurisdiction.centralBank,
    purposeCode: jurisdiction.tax.purposeCode,
    mandatoryAuditCert: jurisdiction.tax.mandatoryAuditCert,
    jurisdiction: jurisdiction.name,
    rail: rail.rail,
    railOperator: `${rail.operator} · ${rail.window}`,
    clearingNetwork: regulation.clearingNetwork,
    safeHarbor: safeHarbor ?? "No safe-harbour route is published for this market.",
  };
}

/** Statutory context for every corridor on the page, keyed by corridor slug. */
export function buildCorridorStatutes(
  corridors: readonly Corridor[]
): CorridorStatuteMap {
  const map: Record<string, CorridorStatute> = {};
  for (const corridor of corridors) {
    const statute = corridorStatute(corridor);
    if (statute) map[corridor.slug] = statute;
  }
  return map;
}
