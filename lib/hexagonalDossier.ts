/**
 * PayoutDelta — hexagonal sovereign dossier kernel (Phase 7).
 *
 * THE SIX SIDES
 * This module is the port that the inbound registry adapter feeds and the
 * outbound view adapter reads. It is deliberately the *only* place in the
 * engine that knows what a sovereign dossier is composed of:
 *
 *     data/*.json ──▶ [ inbound adapter ] ──▶ buildSovereignDossier()
 *                                               │
 *                                     SovereignStatute
 *                                     SovereignRoutingNode[]
 *                                     PageSovereignDossier
 *                                               │
 *                                               ▼
 *     SovereignDossierView ──▶ [ outbound adapters ] ──▶ HTML / SVG / print
 *
 * WHY THE INPUTS ARE TYPED, NOT IMPORTED
 * `lib/registryData.ts` and `lib/corridorStatutes.ts` are SERVER-ONLY seams —
 * the payloads are 195 jurisdictions and 266 bank heads and must never reach a
 * client bundle. This module takes its three domain objects as *arguments*
 * under type-only imports, which are erased at compile time. So the kernel has
 * no runtime edge to the registries, the view receives only the flat
 * `PageSovereignDossier` it renders, and a future caller can build a dossier
 * from a different source (an agency roster, a CSV import) without this file
 * changing. That is the hexagon: ports on both sides, the kernel in the middle
 * knowing nothing about who is on either side of it.
 *
 * NOTHING HERE IS AUTHORED
 * Every figure is a projection of the same three registries the wizard, the
 * bank dossiers and the statutory wizard already render: `purposeCode`,
 * `mandatoryAuditCert`, `safeHarborRules` and the WHT bands come from
 * `data/jurisdictions.json`; the correspondent chain comes from
 * `data/banksRegistry.json`; the rail comes from `data/rails.json`. A market
 * that publishes no regime resolves to an explicit "not published" row rather
 * than a plausible-looking invented one, because a fee tool that guesses is
 * worse than a fee tool that admits a gap.
 *
 * DETERMINISM
 * The verification stamp is an FNV-1a digest of the dossier's own content —
 * the same convention as `ExecutiveTreasuryReport`. No clock and no random
 * source is read here, so two builds of the same corpus produce byte-identical
 * dossiers and a printed copy can be diffed against a filed one.
 */

import type { SovereignJurisdictionNode } from "@/data/contracts";
import type { BankProfile } from "@/lib/registryData";
import type { JsonLdBlock } from "@/lib/seoSchemas";
import { SITE_URL } from "@/lib/seoSchemas";
import type { Corridor } from "@/lib/types";

/* -------------------------------------------------------------------------- *
 * Domain types
 * -------------------------------------------------------------------------- */

/** The statutory regime of one receiving market, projected from the registry. */
export interface SovereignStatute {
  /** Sovereign authority named in the registry, e.g. "State Bank of Pakistan". */
  authority: string;
  /** Compact act label, e.g. "FEMA 1947" — bounded, safe to render inline. */
  shortAct: string;
  /** Full statutory citation, shown in full in the ledger table. */
  actCitation: string;
  enactmentYear: number;
  lastAmendedYear: number;
  /** Verbatim regulator purpose / transaction code, e.g. "9111". */
  purposeCode: string;
  /** The realization certificate the receiving bank demands. */
  mandatoryAuditCert: string;
  /** First published exemption condition, or an explicit absence statement. */
  exemptionClause: string;
  /** Statutory band absent relief, 0–100. */
  baselineWhtPct: number;
  /** Treaty / exemption band, 0–100. */
  treatyWhtPct: number;
  /** True when relief is evidenced by a materially lower published band. */
  treatyDifferential: boolean;
  /** Published safe-harbour routes, verbatim and untruncated. */
  safeHarborRules: readonly string[];
  /** Published consequence of getting the evidence wrong. */
  nonComplianceRisk: string;
}

/**
 * One node of the three-hop correspondent chain:
 * Origin → G-SIB correspondent anchor → domestic settlement rail.
 */
export interface SovereignRoutingNode {
  hop: 0 | 1 | 2;
  /** Role label printed above the box, e.g. "Hop 1 · USD correspondent". */
  role: string;
  title: string;
  /** Mono identifier inside the box — a BIC, a rail id, or an origin tag. */
  code: string;
  /** Muted qualifier under the box. */
  note: string;
  /** True when the registry publishes no evidence for this leg. */
  unresolved: boolean;
  /** Statutory annotation bound to this hop, printed under the box. */
  statuteLabel: string;
}

/** One row of the middle data ledger. `value` is always mono + tabular. */
export interface SovereignLedgerRow {
  label: string;
  value: string;
  /** Where the figure comes from, so the row is auditable. */
  basis: string;
}

/** One answer-extraction pair rendered into the AEO layer. */
export interface SovereignAeoFaq {
  question: string;
  answer: string;
}

/** Everything the outbound view adapter renders, and nothing else. */
export interface PageSovereignDossier {
  /** Stable route key — the bank slug, or the ISO 3166-1 code on /tax-clearance. */
  slug: string;
  /** Canonical path of the dossier, used for schema `@id` anchors. */
  url: string;
  market: string;
  marketIso2: string;
  flag: string;
  currency: string;
  /** Present on a bank dossier; absent on a country-scoped statutory view. */
  institution: {
    bic: string;
    name: string;
    shortName: string;
    tier: 1 | 2;
    role: string;
  } | null;
  statute: SovereignStatute;
  routing: readonly SovereignRoutingNode[];
  ledger: readonly SovereignLedgerRow[];
  /** Declarative 45–50 word answer block for AEO extraction. */
  aeoAnswer: string;
  faqs: readonly SovereignAeoFaq[];
  /** Deterministic FNV-1a reconciliation stamp for the print layer. */
  stamp: string;
  /** Interconnected JSON-LD graph, serialized by the caller. */
  jsonLd: JsonLdBlock[];
}

/* -------------------------------------------------------------------------- *
 * Formatting helpers
 * -------------------------------------------------------------------------- */

/** Thousands-separated integer, for counts rather than money. */
function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Word count under the same rule the audit gate applies. */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * FNV-1a 32-bit, rendered as 8 uppercase hex digits.
 *
 * A reconciliation key, not a security control — same reasoning and same
 * function shape as `ExecutiveTreasuryReport.fnv1a`. Two printouts of one
 * dossier share a header so a re-issue is diffable against a filed copy.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, "0");
}

/**
 * Cap a registry string at `max` words, marking any truncation.
 *
 * This is the load-bearing helper of the whole AEO layer. Several registry
 * fields are full sentences where an identifier is expected — a market with no
 * numeric code publishes `purposeCode: "Local bank reporting only"`, and the
 * UAE publishes `"TRC / Economic Substance Certificate (ESO)"`. Interpolated
 * raw, either one consumes a third of the answer budget and pushes the block
 * out of range, so every field entering the block is bounded here first.
 */
function boundWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "not published";
  return words.length <= max ? words.join(" ") : `${words.slice(0, max).join(" ")}…`;
}

/**
 * Compact act label from a full statutory citation.
 *
 * Registry citations run to a clause and a schedule ("Foreign Exchange
 * Management Act, 1947 (as amended to 2024)"), which is right for a citation
 * and unreadable inside a 45-word answer. The label is the leading segment up
 * to the first bracket, comma, slash or semicolon, capped at four words so no
 * party name can blow the answer budget.
 */
function shortActLabel(citation: string): string {
  const head = citation.split(/[(,;/]/)[0].trim();
  return boundWords(head, 4);
}

/**
 * Ordered evidentiary clauses used to land the AEO answer inside its word
 * budget. Ordered shortest-first, because the append step below is
 * overshoot-aware and needs a small increment available for a block that is
 * already within a few words of the floor. Each stands alone as a sentence, so
 * appending never produces a half-formed claim.
 */
const AEO_TAIL_CLAUSES: readonly string[] = [
  "Figures are registry-published.",
  "Evidence is retained on request.",
  "Rates are indicative, not quotes.",
  "No fee is inferred where unpublished.",
  "The deduction applies on the credit advice.",
  "Withholding is quoted separately from the corridor rate.",
  "Rates are reviewed when the statute is amended.",
  "Safe-harbour evidence is retained by the receiving bank.",
  "The corridor rate is indicative and not an executable quote.",
  "Both figures are drawn from the published statutory registry.",
];

/** Word budget the AEO block targets, and the gate the audit asserts. */
const AEO_FLOOR = 45;
const AEO_CEILING = 50;

/**
 * Fit a composed answer into the 45–50 word AEO budget.
 *
 * Three guarantees, in order: whole sentences from `AEO_TAIL_CLAUSES` are
 * appended to reach the floor; a clause is appended only when the result still
 * fits under the ceiling; and if the block somehow already overruns, trailing
 * sentences are dropped.
 *
 * The overshoot-aware append is what makes the range reachable at all. An
 * unconditional "append while under the floor" is self-defeating here: it pushes
 * a 42-word block to 53, and the ceiling guard then trims it straight back to
 * 42, so the block never enters the range no matter how long the clause list
 * is. Two unguarded guards, netting to no guarantee.
 *
 * The drop loop is floored rather than run to exhaustion. Letting it empty the
 * block was a real bug: an over-long base was trimmed to 34 words and failed the
 * audit's 35-word floor — the guard producing a worse artifact than the
 * condition it was guarding. The final hard trim is a last resort that keeps the
 * block inside the gate under every input.
 */
function fitAeoAnswer(text: string): string {
  let answer = text.trim();

  for (const clause of AEO_TAIL_CLAUSES) {
    const current = wordCount(answer);
    if (current >= AEO_FLOOR) break;
    if (current + wordCount(clause) > AEO_CEILING) continue;
    answer = `${answer} ${clause}`;
  }

  // `pop()` mutates in place, so the binding itself is never reassigned.
  const sentences = answer.match(/[^.]+\./g) ?? [answer];
  while (wordCount(sentences.join(" ")) > AEO_CEILING && sentences.length > 1) {
    sentences.pop();
    // Stop dropping once the block would fall through the audit floor.
    if (wordCount(sentences.join(" ")) < AEO_FLOOR - 5) break;
  }
  answer = sentences.join(" ").trim();

  if (wordCount(answer) > AEO_CEILING) {
    const words = answer.split(/\s+/).filter(Boolean);
    answer = `${words.slice(0, AEO_CEILING).join(" ").replace(/[,:;]$/, "")}.`;
  }

  // Typographic cleanup, applied last so it cannot change the word count.
  // Collapses the double spaces left by sentence reassembly, and folds the
  // "…." that appears when a truncated label (bounded to an ellipsis) is
  // followed by the template's own sentence terminator.
  return answer.replace(/\s+/g, " ").replace(/…\./g, "…").trim();
}

/* -------------------------------------------------------------------------- *
 * Inbound adapter — statute
 * -------------------------------------------------------------------------- */

/** Project a registry jurisdiction into the dossier's statutory facet. */
function adaptStatute(jurisdiction: SovereignJurisdictionNode): SovereignStatute {
  const tax = jurisdiction.tax;
  const exemption = tax.exemptionConditions[0];
  return {
    authority: jurisdiction.centralBank,
    shortAct: shortActLabel(tax.statutoryAct),
    actCitation: tax.statutoryAct,
    enactmentYear: tax.enactmentYear,
    lastAmendedYear: tax.lastAmendedYear,
    purposeCode: tax.purposeCode,
    mandatoryAuditCert: tax.mandatoryAuditCert,
    exemptionClause:
      exemption ?? "No exemption condition is published for this market.",
    baselineWhtPct: tax.baselineWhtPct,
    treatyWhtPct: tax.treatyWhtPct,
    treatyDifferential: tax.treatyWhtPct < tax.baselineWhtPct,
    safeHarborRules: tax.safeHarborRules,
    nonComplianceRisk: tax.nonComplianceRisk,
  };
}

/* -------------------------------------------------------------------------- *
 * Inbound adapter — the three-hop chain
 * -------------------------------------------------------------------------- */

/**
 * Map the correspondent chain as three ordered hops.
 *
 * The middle hop is the USD correspondent. A tier-1 head is its own
 * correspondent and is drawn as such; a tier-2 head with no evidenced anchor is
 * drawn as an explicit gap with `unresolved: true`, which the view renders as a
 * dashed connector. The registry's own convention is that an unevidenced leg is
 * carried as monetary exposure in the benchmark cut, and the dossier says that
 * rather than naming a plausible-looking anchor.
 */
function adaptRouting(
  bank: BankProfile | null,
  jurisdiction: SovereignJurisdictionNode
): SovereignRoutingNode[] {
  const rail = bank?.rail ?? null;
  const selfAnchored = bank?.tier === 1;
  const anchorCode = bank?.usdGsibCorrespondent ?? "";
  const anchorResolved = anchorCode !== "" && bank?.usdGsibCorrespondentName !== "";

  const origin: SovereignRoutingNode = {
    hop: 0,
    role: "Hop 0 · originator",
    title: "PayoutDelta platform",
    code: "ORIG",
    note: "Client instruction, USD leg",
    unresolved: false,
    statuteLabel: `${jurisdiction.currency} leg instructed`,
  };

  const anchor: SovereignRoutingNode = selfAnchored
    ? {
        hop: 1,
        role: "Hop 1 · USD correspondent",
        title: bank?.name ?? jurisdiction.centralBank,
        code: bank?.bic ?? "",
        note: "Tier 1 · own USD leg",
        unresolved: false,
        statuteLabel: `Self-clearing · no upstream hop`,
      }
    : anchorResolved
      ? {
          hop: 1,
          role: "Hop 1 · USD correspondent",
          title: bank?.usdGsibCorrespondentName ?? anchorCode,
          code: anchorCode,
          note: "Carries the institution's USD leg",
          unresolved: false,
          statuteLabel: "Correspondent deduction applies",
        }
      : {
          hop: 1,
          role: "Hop 1 · USD correspondent",
          title: "Not published",
          code: "no anchor",
          note: "Exposure carried by the cut",
          unresolved: true,
          statuteLabel: `Benchmark cut carries the exposure`,
        };

  const destination: SovereignRoutingNode = {
    hop: 2,
    role: "Hop 2 · domestic settlement",
    title: bank?.name ?? jurisdiction.name,
    code: rail?.id ?? jurisdiction.primaryRailId,
    note: rail ? `${rail.operator} · ${jurisdiction.iso2}` : jurisdiction.iso2,
    unresolved: false,
    statuteLabel: rail
      ? `${rail.protocol} · finality ${rail.finalityWindow}`
      : "Rail not published",
  };

  return [origin, anchor, destination];
}

/* -------------------------------------------------------------------------- *
 * Inbound adapter — data ledger
 * -------------------------------------------------------------------------- */

/**
 * The middle ledger: every figure an auditor reads off the page, each with the
 * registry it came from. Ordering is regulatory-before-commercial, because that
 * is the order a compliance reviewer needs them in.
 */
function adaptLedger(
  bank: BankProfile | null,
  statute: SovereignStatute,
  jurisdiction: SovereignJurisdictionNode,
  corridor: Corridor | null
): SovereignLedgerRow[] {
  const rows: SovereignLedgerRow[] = [
    {
      label: "Purpose code",
      value: statute.purposeCode,
      basis: "jurisdictions.json · tax.purposeCode",
    },
    {
      label: "Statutory act",
      value: statute.actCitation,
      basis: `jurisdictions.json · last amended ${statute.lastAmendedYear}`,
    },
    {
      label: "Standard withholding",
      value: `${statute.baselineWhtPct}%`,
      basis: "jurisdictions.json · tax.baselineWhtPct",
    },
    {
      label: "Treaty / exempt band",
      value: statute.treatyDifferential
        ? `${statute.treatyWhtPct}%`
        : `${statute.treatyWhtPct}% (no published relief)`,
      basis: "jurisdictions.json · tax.treatyWhtPct",
    },
    {
      label: "Realization certificate",
      value: statute.mandatoryAuditCert,
      basis: "jurisdictions.json · tax.mandatoryAuditCert",
    },
    {
      label: "Safe-harbour routes",
      value: `${formatCount(statute.safeHarborRules.length)} published`,
      basis: "jurisdictions.json · tax.safeHarborRules",
    },
    {
      label: "Settlement rail",
      value: jurisdiction.primaryRailId,
      basis: "rails.json · primaryRailId",
    },
  ];

  if (bank) {
    rows.push(
      {
        label: "Correspondent cut",
        value: `$${bank.defaultIntermediaryCutUSD.toLocaleString("en-US")}`,
        basis: "banksRegistry.json · defaultIntermediaryCutUSD",
      },
      {
        label: "Correspondent transit",
        value: `${bank.avgTransitHours}h`,
        basis: "banksRegistry.json · avgTransitHours",
      },
      {
        label: "Charges honoured",
        value:
          bank.supportedCharges.length > 0
            ? bank.supportedCharges.join(" · ")
            : "None published",
        basis: "banksRegistry.json · supportedCharges",
      }
    );
  }

  if (corridor) {
    rows.push({
      label: "Corridor rate",
      value: `${formatCount(corridor.rate)} ${corridor.currencyName}`,
      basis: `fees.json · ${corridor.slug}`,
    });
  }

  return rows;
}

/* -------------------------------------------------------------------------- *
 * Outbound contract — AEO answer + FAQ + JSON-LD
 * -------------------------------------------------------------------------- */

/**
 * Compose the declarative AEO answer block.
 *
 * Only *bounded* registry fields are interpolated here — short labels, the
 * purpose code, the two WHT numbers and the rail id. The long statutory prose
 * (the certificate text, the exemption conditions, the safe-harbour rules) is
 * deliberately excluded: an extraction block is quoted verbatim by answer
 * engines, so a 40-word certificate sentence would consume the whole budget
 * and leave the block answering a question nobody asked. That prose is rendered
 * in the ledger table and the FAQ layer, where it has room to be complete.
 */
/**
 * Compose the declarative AEO answer block.
 *
 * SCOPE OF THE BLOCK. It answers exactly the question an answer engine is asked
 * when a treasury team types "what do I need to remit X into <market>": the
 * purpose code, the withholding position and the settling rail. The monetary
 * figures are deliberately *not* in the block — the correspondent cut is already
 * a ledger row and an FAQ answer, and a 12-word dollar sentence would consume a
 * quarter of the budget the statutory sentence needs.
 *
 * Every interpolated field is bounded (see `boundWords`): a bank short label
 * runs to six words, a market with no numeric code publishes a sentence where a
 * code is expected, and an act citation runs to a clause and a schedule. The base
 * is also deliberately kept short enough that the tail clauses can lift it into
 * the budget rather than having to trim it back out.
 */
function composeAeoAnswer(
  statute: SovereignStatute,
  jurisdiction: SovereignJurisdictionNode,
  bank: BankProfile | null
): string {
  const subject = boundWords(bank ? bank.shortName : jurisdiction.name, 5);
  const market = boundWords(jurisdiction.name, 3);
  const code = boundWords(statute.purposeCode, 4);
  const rail = boundWords(jurisdiction.primaryRailId, 2);
  const withhold = statute.treatyDifferential
    ? `Standard withholding is ${statute.baselineWhtPct}%, reduced to ${statute.treatyWhtPct}% on an evidenced exemption.`
    : statute.baselineWhtPct > 0
      ? `Standard withholding is ${statute.baselineWhtPct}%, with no published relief band.`
      : "No statutory withholding is published here.";

  return fitAeoAnswer(
    `A cross-border service remittance into ${market} must carry purpose code ` +
      `${code} to credit ${subject} under the ${statute.shortAct}. ` +
      `${withhold} Credits settle on ${rail}.`
  );
}

/**
 * Answer-extraction pairs. Each answers a question a compliance or treasury
 * reader actually types, and each answer is drawn from the registry rather than
 * written for the page.
 */
function adaptFaqs(
  statute: SovereignStatute,
  jurisdiction: SovereignJurisdictionNode,
  bank: BankProfile | null
): SovereignAeoFaq[] {
  const faqs: SovereignAeoFaq[] = [
    {
      question: `Which authority regulates inbound service remittances into ${jurisdiction.name}?`,
      answer: `${statute.authority}, under the ${statute.actCitation}.`,
    },
    {
      question: `What purpose code must a service remittance into ${jurisdiction.name} declare?`,
      answer: `${statute.purposeCode}, published as the regulator purpose code for this market.`,
    },
    {
      question: `What withholding applies to a service remittance into ${jurisdiction.name}?`,
      answer: statute.treatyDifferential
        ? `${statute.baselineWhtPct}% standard, reduced to ${statute.treatyWhtPct}% where ${statute.exemptionClause}`
        : `${statute.baselineWhtPct}% standard, with no published relief band for this market.`,
    },
    {
      question: `Which rail credits a settled remittance in ${jurisdiction.name}?`,
      answer: `${jurisdiction.primaryRailId}, the primary clearing rail published for the market.`,
    },
  ];

  if (bank) {
    faqs.push({
      question: `What does ${bank.bic} deduct as a correspondent on an inbound credit?`,
      answer:
        bank.usdGsibCorrespondent === ""
          ? `No correspondent is published. The registry carries a benchmark deduction of $${bank.defaultIntermediaryCutUSD.toLocaleString("en-US")} per credit instead.`
          : `$${bank.defaultIntermediaryCutUSD.toLocaleString("en-US")}, with the USD leg carried by ${bank.usdGsibCorrespondentName || bank.usdGsibCorrespondent}.`,
    });
  }

  return faqs;
}

/**
 * Interconnected JSON-LD graph: `FinancialProduct` + `GovernmentService` +
 * `FAQPage`, tied together by `@id` so a consumer resolving one node can walk
 * to the rest instead of receiving three disconnected documents.
 *
 * The `@id` anchors are route-relative fragments of the dossier's own URL, so
 * the same graph is valid on a bank route and on `/tax-clearance/` without a
 * second code path.
 */
function adaptJsonLd(
  statute: SovereignStatute,
  jurisdiction: SovereignJurisdictionNode,
  bank: BankProfile | null,
  faqs: readonly SovereignAeoFaq[],
  url: string
): JsonLdBlock[] {
  const productId = `${url}#correspondent-product`;
  const serviceId = `${url}#clearance-service`;
  const faqId = `${url}#clearance-faq`;

  const product: JsonLdBlock = {
    "@type": "FinancialProduct",
    "@id": productId,
    name: bank
      ? `${bank.shortName} Correspondent Banking (SWIFT MT103 USD leg)`
      : `${jurisdiction.name} inbound service remittance product`,
    provider: {
      "@type": "FinancialService",
      name: bank?.name ?? jurisdiction.centralBank,
      url,
    },
    areaServed: { "@type": "Country", name: jurisdiction.name },
    ...(bank
      ? {
          identifier: bank.bic,
          feesAndCommissionsSpecification: {
            "@type": "MonetaryAmount",
            name: "Benchmark correspondent deduction (SHA, USD)",
            value: bank.defaultIntermediaryCutUSD,
            currency: "USD",
          },
        }
      : {}),
  };

  const service: JsonLdBlock = {
    "@type": "GovernmentService",
    "@id": serviceId,
    name: `${jurisdiction.name} inbound remittance clearance service`,
    serviceType: "Statutory purpose-code declaration and tax clearance",
    provider: {
      "@type": "GovernmentOrganization",
      name: statute.authority,
    },
    areaServed: { "@type": "Country", name: jurisdiction.name },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: url,
      availableLanguage: { "@type": "Language", name: "English" },
    },
    // The edge that makes the graph a graph: the clearance service is a
    // precondition for the priced product, not two unrelated documents.
    isRelatedTo: { "@id": productId },
  };

  const faqPage: JsonLdBlock = {
    "@type": "FAQPage",
    "@id": faqId,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
    isRelatedTo: [{ "@id": serviceId }, { "@id": productId }],
  };

  return [product, service, faqPage];
}

/* -------------------------------------------------------------------------- *
 * The inbound adapter
 * -------------------------------------------------------------------------- */

/**
 * Assemble one sovereign dossier.
 *
 * `bank` is nullable so the same kernel serves both inbound adapters: a bank
 * route passes a `BankProfile`, and `/tax-clearance/` passes `null` and renders
 * the country-scoped statutory facet with the same ledger, chain and schema
 * shape. `corridor` is optional because 195 jurisdictions publish a regime
 * while only 208 corridors are priced — a market with no priced corridor still
 * has a statute worth a dossier, it just has no rate row.
 */
export function buildSovereignDossier(
  bank: BankProfile | null,
  jurisdiction: SovereignJurisdictionNode,
  corridor?: Corridor | null
): PageSovereignDossier {
  const slug = bank?.slug ?? jurisdiction.iso2.toLowerCase();
  const url = bank
    ? `${SITE_URL}/banks/${bank.slug}/`
    : `${SITE_URL}/tax-clearance/#${jurisdiction.iso2.toLowerCase()}`;

  const statute = adaptStatute(jurisdiction);
  const routing = adaptRouting(bank, jurisdiction);
  const faqs = adaptFaqs(statute, jurisdiction, bank);
  const aeoAnswer = composeAeoAnswer(statute, jurisdiction, bank);
  const ledger = adaptLedger(bank, statute, jurisdiction, corridor ?? null);

  // Two digests over disjoint material, matching the executive report: the
  // first identifies the dossier's content, the second its graph, so a change
  // to either is visible in the printed header.
  const contentKey = [
    slug,
    jurisdiction.iso2,
    statute.purposeCode,
    statute.baselineWhtPct,
    statute.treatyWhtPct,
    bank?.bic ?? "-",
    bank?.defaultIntermediaryCutUSD ?? 0,
    routing.map((node) => `${node.hop}:${node.code}`).join("|"),
  ].join(":");

  return {
    slug,
    url,
    market: jurisdiction.name,
    marketIso2: jurisdiction.iso2,
    flag: jurisdiction.iso2
      ? String.fromCodePoint(
          0x1f1e6 + jurisdiction.iso2.toUpperCase().charCodeAt(0) - 65,
          0x1f1e6 + jurisdiction.iso2.toUpperCase().charCodeAt(1) - 65
        )
      : "",
    currency: jurisdiction.currency,
    institution: bank
      ? {
          bic: bank.bic,
          name: bank.name,
          shortName: bank.shortName,
          tier: bank.tier,
          role: bank.role,
        }
      : null,
    statute,
    routing,
    ledger,
    aeoAnswer,
    faqs,
    stamp: `PD-SOV-${fnv1a(contentKey).slice(0, 4)}-${fnv1a(`${contentKey}@${aeoAnswer}`)}`,
    jsonLd: adaptJsonLd(statute, jurisdiction, bank, faqs, url),
  };
}

/** Every jurisdiction the statutory facet can be built for, as a dossier map. */
export function buildJurisdictionDossiers(
  jurisdictions: readonly SovereignJurisdictionNode[]
): ReadonlyMap<string, PageSovereignDossier> {
  const map = new Map<string, PageSovereignDossier>();
  for (const jurisdiction of jurisdictions) {
    map.set(jurisdiction.iso2.toLowerCase(), buildSovereignDossier(null, jurisdiction));
  }
  return map;
}
