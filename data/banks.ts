/**
 * PayoutDelta — programmatic bank dossier registry (Phase 5 "Banks").
 *
 * Structured profiles for the institutions that actually appear in the
 * surface-area of `data/regulatoryBanking.ts` (beneficiary rails) and in the
 * correspondent registry of `lib/swiftRoutingEngine.ts` (global clearing
 * hubs). Each dossier is a statically generated `/banks/<slug>` page.
 *
 * Every BIC here is a verified ISO 9362 8-character head:
 *   - CHASUS33, CITIUS33, BOFAUS3N — USD clearing via New York
 *   - DEUTDEFF, COMMDEFF          — EUR clearing via Frankfurt
 *   - BARCGB22, SCBLGB2L, HSBCGB2L — GBP clearing via London
 *   - HABBPKKA, MEZNPKKA, ALFHPKKA, SCBLPKKA — Pakistan (SBP dealers)
 *   - ICICINBB, SBININBB          — India
 *   - BNORPHMM (BDO Philippines), CENAIDJA (Bank Central Asia)
 *   - COLOCOBM (Bancolombia), CCEYLKLX (Commercial Bank of Ceylon)
 *   - EBILAEAD (Emirates NBD), RJHISARI (Al Rajhi)
 *   - RZBSRSBG (Raiffeisen Srbija), BKTBALTR (BKT Albania)
 *
 * `connectedCorridors` reference live slugs in `data/fees.json` so each
 * dossier can deep-link straight into the wire-deduction calculator.
 */

export type BankRole = "Global Correspondent Clearing Hub" | "Domestic Beneficiary Rail";

export interface BankDossier {
  /** URL slug for `/banks/<slug>`, e.g. `jpmorgan-chase`. */
  slug: string;
  /** Legal name shown in the dossier headline. */
  name: string;
  /** Short display label, e.g. "JPMorgan Chase". */
  shortName: string;
  /** Verified 8-character ISO 9362 BIC head. */
  bic: string;
  /** Registered head-office city, e.g. "New York". */
  headquartersCity: string;
  /** ISO country name, e.g. "United States". */
  headquartersCountry: string;
  role: BankRole;
  /** Clearing / payout currency the bank moves, e.g. "USD" or "PKR". */
  clearingCurrency: string;
  /** Human band describing the typical SHA intermediary deduction. */
  typicalShaDeduction: string;
  /** Live corridor slugs from `data/fees.json` served via this bank. */
  connectedCorridors: string[];
  /** 71A (Details of Charges) guidance tailored to this bank. */
  field71aGuidance: string;
}

export const BANK_DOSSIERS: BankDossier[] = [
  /* ------------------------------------------------------------------ *
   * Global correspondent clearing hubs
   * ------------------------------------------------------------------ */
  {
    slug: "jpmorgan-chase",
    name: "JPMorgan Chase Bank N.A.",
    shortName: "JPMorgan Chase",
    bic: "CHASUS33",
    headquartersCity: "New York",
    headquartersCountry: "United States",
    role: "Global Correspondent Clearing Hub",
    clearingCurrency: "USD",
    typicalShaDeduction: "$18.00 – $35.00 SHA Cut",
    connectedCorridors: [
      "usd-to-pkr",
      "usd-to-inr",
      "usd-to-php",
      "usd-to-idr",
      "usd-to-cop",
      "usd-to-lkr",
      "usd-to-rsd",
      "usd-to-aed",
      "usd-to-sar",
      "usd-to-ngn",
      "usd-to-bdt",
      "usd-to-egp",
      "usd-to-ghs",
      "usd-to-all",
    ],
    field71aGuidance:
      "Request SHA in field 71A so USD charges are split: the sender's bank takes its fee upfront and a $18–$35 correspondence cut lands at the JPMorgan tier. Marking OUR pushes the full $18–$35 onto the beneficiary — never do this when you can negotiate SHA.",
  },
  {
    slug: "citibank",
    name: "Citibank N.A.",
    shortName: "Citibank",
    bic: "CITIUS33",
    headquartersCity: "New York",
    headquartersCountry: "United States",
    role: "Global Correspondent Clearing Hub",
    clearingCurrency: "USD",
    typicalShaDeduction: "$18.00 – $35.00 SHA Cut",
    connectedCorridors: [
      "usd-to-pkr",
      "usd-to-inr",
      "usd-to-php",
      "usd-to-idr",
      "usd-to-cop",
      "usd-to-lkr",
      "usd-to-rsd",
      "usd-to-aed",
      "usd-to-sar",
      "usd-to-ngn",
      "usd-to-bdt",
      "usd-to-egp",
      "usd-to-ghs",
      "usd-to-all",
    ],
    field71aGuidance:
      "Citi quotes a flat intermediary fee at the New York tier on most USD rails. With SHA the sender absorbs the sending fee and Citi deducts its cut from the principal — expect $18–$35 and verify the exact figure in the beneficiary's quoted MT103 before invoicing short.",
  },
  {
    slug: "bank-of-america",
    name: "Bank of America N.A.",
    shortName: "Bank of America",
    bic: "BOFAUS3N",
    headquartersCity: "Charlotte",
    headquartersCountry: "United States",
    role: "Global Correspondent Clearing Hub",
    clearingCurrency: "USD",
    typicalShaDeduction: "$15.00 – $30.00 SHA Cut",
    connectedCorridors: [
      "usd-to-pkr",
      "usd-to-inr",
      "usd-to-php",
      "usd-to-idr",
      "usd-to-cop",
      "usd-to-lkr",
      "usd-to-rsd",
      "usd-to-aed",
      "usd-to-sar",
      "usd-to-ngn",
      "usd-to-bdt",
      "usd-to-egp",
      "usd-to-ghs",
      "usd-to-all",
    ],
    field71aGuidance:
      "BOFAUS3N settles through the Charlotte/NY clearing tier. SHA keeps charges shared on USD corridors; expect a $15–$30 correspondence deduction. For large payouts compare against the 0% FX-spread rails surfaced in the calculator before choosing SWIFT.",
  },
  {
    slug: "deutsche-bank",
    name: "Deutsche Bank AG",
    shortName: "Deutsche Bank",
    bic: "DEUTDEFF",
    headquartersCity: "Frankfurt",
    headquartersCountry: "Germany",
    role: "Global Correspondent Clearing Hub",
    clearingCurrency: "EUR",
    typicalShaDeduction: "$15.00 – $35.00 SHA Cut",
    connectedCorridors: ["usd-to-eur", "usd-to-bam", "usd-to-me-eur", "usd-to-xk-eur"],
    field71aGuidance:
      "EUR corridors clear via the Frankfurt tier — SHA on EUR payments keeps the correspondence cut (typically €8–€30) off the beneficiary. On euroized corridors in Bosnia, Montenegro and Kosovo the retail FX spread drops to 0%, so SHA on SWIFT is the only real friction left.",
  },
  {
    slug: "commerzbank",
    name: "Commerzbank AG",
    shortName: "Commerzbank",
    bic: "COMMDEFF",
    headquartersCity: "Frankfurt",
    headquartersCountry: "Germany",
    role: "Global Correspondent Clearing Hub",
    clearingCurrency: "EUR",
    typicalShaDeduction: "$15.00 – $35.00 SHA Cut",
    connectedCorridors: ["usd-to-eur", "usd-to-bam", "usd-to-me-eur", "usd-to-xk-eur"],
    field71aGuidance:
      "COMMDEFF is a common EUR clearing agent. With SHA the beneficiary keeps the payout whole apart from any domestic leg; with OUR the Frankfurt cut lands on them. Prefer SHA and price any flat retail FX spread against the rail comparison in the calculator.",
  },
  {
    slug: "barclays",
    name: "Barclays Bank UK PLC",
    shortName: "Barclays",
    bic: "BARCGB22",
    headquartersCity: "London",
    headquartersCountry: "United Kingdom",
    role: "Global Correspondent Clearing Hub",
    clearingCurrency: "GBP",
    typicalShaDeduction: "$15.00 – $35.00 SHA Cut",
    connectedCorridors: ["usd-to-gbp"],
    field71aGuidance:
      "GBP wires clear through the London tier. SHA in field 71A keeps the correspondence cut off the beneficiary on GBP corridors; OUR pushes it onto them. For converted USD→GBP payouts cross-check the FX margin against the rails bench before committing to SWIFT.",
  },
  {
    slug: "standard-chartered-uk",
    name: "Standard Chartered Bank",
    shortName: "Standard Chartered (UK)",
    bic: "SCBLGB2L",
    headquartersCity: "London",
    headquartersCountry: "United Kingdom",
    role: "Global Correspondent Clearing Hub",
    clearingCurrency: "GBP",
    typicalShaDeduction: "$15.00 – $35.00 SHA Cut",
    connectedCorridors: ["usd-to-gbp"],
    field71aGuidance:
      "SCBLGB2L also anchors Standard Chartered's own Pakistani rail (SCBLPKKA). On GBP corridors mark SHA so the charge split is explicit; the SCB network can also offer an on-us route where the wire stays inside the group and skips external intermediary tiers.",
  },
  {
    slug: "hsbc-bank-uk",
    name: "HSBC UK Bank PLC",
    shortName: "HSBC",
    bic: "HSBCGB2L",
    headquartersCity: "London",
    headquartersCountry: "United Kingdom",
    role: "Global Correspondent Clearing Hub",
    clearingCurrency: "GBP",
    typicalShaDeduction: "$15.00 – $35.00 SHA Cut",
    connectedCorridors: ["usd-to-gbp"],
    field71aGuidance:
      "HSBC's GBP business clears through HSBCGB2L. On USD→GBP wires use SHA so the intermediary deduction is split by agreement; if the counterparty defaults to OUR the beneficiary absorbs the full $15–$35 cut instead of a modest sender-side fee.",
  },

  /* ------------------------------------------------------------------ *
   * Domestic beneficiary rails
   * ------------------------------------------------------------------ */
  {
    slug: "habib-bank",
    name: "Habib Bank Limited (HBL)",
    shortName: "HBL (Pakistan)",
    bic: "HABBPKKA",
    headquartersCity: "Karachi",
    headquartersCountry: "Pakistan",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "PKR",
    typicalShaDeduction: "$18.00 SHA Cut",
    connectedCorridors: ["usd-to-pkr"],
    field71aGuidance:
      "For USD→PKR, SHA is the safe default: the $18 correspondence cut lands at the intermediary tier and HBL settles the remainder via Raast with a PRC in ~24–48 hrs. Do not mark OUR — it adds the full $18 on top of the beneficiary's import-of-currency costs.",
  },
  {
    slug: "meezan-bank",
    name: "Meezan Bank Limited",
    shortName: "Meezan Bank",
    bic: "MEZNPKKA",
    headquartersCity: "Karachi",
    headquartersCountry: "Pakistan",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "PKR",
    typicalShaDeduction: "$15.00 SHA Cut",
    connectedCorridors: ["usd-to-pkr"],
    field71aGuidance:
      "Meezan quotes a flat $15 intermediary on USD→PKR with 0 PKR local fee on the Raast inward leg. SHA keeps the cut at the intermediate tier; with OUR the beneficiary swallows $15 they would otherwise never see. Ask the branch for the e-PRC to lock the purpose code on the record.",
  },
  {
    slug: "bank-alfalah",
    name: "Bank Alfalah Limited",
    shortName: "Bank Alfalah",
    bic: "ALFHPKKA",
    headquartersCity: "Lahore",
    headquartersCountry: "Pakistan",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "PKR",
    typicalShaDeduction: "$15.00 SHA Cut",
    connectedCorridors: ["usd-to-pkr"],
    field71aGuidance:
      "Alfalah runs a $15 intermediary on USD→PKR with PRC turnaround of 24–48 hrs. Mandate SHA so charges split at the correspondent tier; avoid OUR unless the recipient explicitly requests to absorb all fees. Track the e-PRC alongside the invoice for the annual tax ledger.",
  },
  {
    slug: "standard-chartered-pakistan",
    name: "Standard Chartered Bank (Pakistan) Limited",
    shortName: "Standard Chartered (Pakistan)",
    bic: "SCBLPKKA",
    headquartersCity: "Karachi",
    headquartersCountry: "Pakistan",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "PKR",
    typicalShaDeduction: "$10.00 – $12.00 SHA Cut",
    connectedCorridors: ["usd-to-pkr"],
    field71aGuidance:
      "SCB's Pakistani arm (SCBLPKKA) shares the Group's correspondent backbone, so an on-us USD→PKR wire often keeps the cut at $10–$12 instead of the external $15–$18 band. Quote SHA and the PKR leg converts at the branch's quoted rate — compare that margin against the calculator's rails before locking.",
  },
  {
    slug: "icici-bank",
    name: "ICICI Bank Limited",
    shortName: "ICICI Bank",
    bic: "ICICINBB",
    headquartersCity: "Mumbai",
    headquartersCountry: "India",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "INR",
    typicalShaDeduction: "$15.00 SHA Cut",
    connectedCorridors: ["usd-to-inr"],
    field71aGuidance:
      "USD→INR clears via ICICINBB; with SHA the intermediary deduction stays off the FEMA-compliant export credit (purpose code P0802 under a GST LUT). Confirm the breakdown in the MT103 so the net landed INR matches the 44ADA / presumptive-tax income booked in the ledger.",
  },
  {
    slug: "state-bank-of-india",
    name: "State Bank of India",
    shortName: "SBI",
    bic: "SBININBB",
    headquartersCity: "Mumbai",
    headquartersCountry: "India",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "INR",
    typicalShaDeduction: "$15.00 SHA Cut",
    connectedCorridors: ["usd-to-inr"],
    field71aGuidance:
      "SBI (SBININBB) intermediates most USD→INR export wires. Use SHA so the $15 cut lands at the correspondent rather than on the beneficiary; the INR credit then arrives whole under purpose code P0802 with 0% TDS when the exporter holds a valid LUT.",
  },
  {
    slug: "bdo-unibank",
    name: "BDO Unibank Inc.",
    shortName: "BDO (Philippines)",
    bic: "BNORPHMM",
    headquartersCity: "Makati",
    headquartersCountry: "Philippines",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "PHP",
    typicalShaDeduction: "$12.00 SHA Cut",
    connectedCorridors: ["usd-to-php"],
    field71aGuidance:
      "BNORPHMM receives USD→PHP with a ~$12 intermediary cut under SHA. The site defaults to 1% of gross for the BIR 2307 withholding on freelancer income — keep the MT103 and the bank credit slip so the net PHP reconciles with what you book.",
  },
  {
    slug: "bank-central-asia",
    name: "PT Bank Central Asia Tbk (BCA)",
    shortName: "BCA (Indonesia)",
    bic: "CENAIDJA",
    headquartersCity: "Jakarta",
    headquartersCountry: "Indonesia",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "IDR",
    typicalShaDeduction: "$12.00 SHA Cut",
    connectedCorridors: ["usd-to-idr"],
    field71aGuidance:
      "USD→IDR clears through CENAIDJA. Quote SHA so the correspondence cut stays at the USD intermediary tier; BCA then credits IDR at its BI reference rate. Cross-check the effective rate against the calculator's rail comparison — BCA quotes can lag the mid-rate on larger payouts.",
  },
  {
    slug: "bancolombia",
    name: "Bancolombia S.A.",
    shortName: "Bancolombia",
    bic: "COLOCOBM",
    headquartersCity: "Medellín",
    headquartersCountry: "Colombia",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "COP",
    typicalShaDeduction: "$35.00 SHA Cut",
    connectedCorridors: ["usd-to-cop"],
    field71aGuidance:
      "USD→COP is one of the most expensive SWIFT rails: expect a $30–$35 SHA cut plus a retail FX spread near 4% unless you route via USD-COP fintech clearers. Always run the rail comparison first — at $1,000+ a modern flat-fee route can save $20+ per payout over Bank of America-tier wires into Bancolombia.",
  },
  {
    slug: "commercial-bank-of-ceylon",
    name: "Commercial Bank of Ceylon PLC",
    shortName: "CB Ceylon",
    bic: "CCEYLKLX",
    headquartersCity: "Colombo",
    headquartersCountry: "Sri Lanka",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "LKR",
    typicalShaDeduction: "$18.00 SHA Cut",
    connectedCorridors: ["usd-to-lkr"],
    field71aGuidance:
      "CCEYLKLX settles USD→LKR via the Colombo head office. With SHA the intermediary deduction lands before the LKR conversion; keep the MT103 so the Sri-Lankan remittance credit (and the standard 14% domestic withholding on export services) reconciles cleanly.",
  },
  {
    slug: "emirates-nbd",
    name: "Emirates NBD (PJSC)",
    shortName: "Emirates NBD",
    bic: "EBILAEAD",
    headquartersCity: "Dubai",
    headquartersCountry: "United Arab Emirates",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "AED",
    typicalShaDeduction: "$10.00 – $18.00 SHA Cut",
    connectedCorridors: ["usd-to-aed"],
    field71aGuidance:
      "Emirates NBD (EBILAEAD) quotes $10–$18 on USD→AED and settles through UAEFTS instantly once the USD leg clears. SHA keeps the cut off the beneficiary; on the 0% corporate tax QFZP regime the FX margin is the only real friction, so compare rail FX before routing out of your free-zone entity.",
  },
  {
    slug: "al-rajhi",
    name: "Al Rajhi Bank",
    shortName: "Al Rajhi",
    bic: "RJHISARI",
    headquartersCity: "Riyadh",
    headquartersCountry: "Saudi Arabia",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "SAR",
    typicalShaDeduction: "$20.00 SHA Cut",
    connectedCorridors: ["usd-to-sar"],
    field71aGuidance:
      "USD→SAR via RJHISARI typically carries a $18–$20 intermediary under SHA. The SAR leg lands through the local SARIE settlement; on the Saudi 0% export-withholding regime the FX margin is the main cost driver, so benchmark the calculator's rails before committing.",
  },
  {
    slug: "raiffeisen-srbija",
    name: "Raiffeisen banka a.d.",
    shortName: "Raiffeisen (Serbia)",
    bic: "RZBSRSBG",
    headquartersCity: "Belgrade",
    headquartersCountry: "Serbia",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "RSD",
    typicalShaDeduction: "$10.00 – $18.00 SHA Cut",
    connectedCorridors: ["usd-to-rsd"],
    field71aGuidance:
      "RZBSRSBG settles USD→RSD with a $10–$18 SHA band and instant NBS IPS domestic payout. SHA keeps the cut at the correspondent; under the Serbian freelance regime the landed RSD is what you book as gross income before the 20% freelance tax — reconcile the MT103 against the ledger.",
  },
  {
    slug: "bkt-albania",
    name: "Banka Kombëtare Tregtare (BKT)",
    shortName: "BKT (Albania)",
    bic: "BKTBALTR",
    headquartersCity: "Tirana",
    headquartersCountry: "Albania",
    role: "Domestic Beneficiary Rail",
    clearingCurrency: "ALL",
    typicalShaDeduction: "$13.00 – $18.00 SHA Cut",
    connectedCorridors: ["usd-to-all"],
    field71aGuidance:
      "BKTBALTR receives USD→ALL with a $13–$18 SHA cut plus a ~200 ALL local booking fee. Quote SHA so intermediary charges never compound on the beneficiary; the AIPS RTGS leg lands same-day, and the flat 15% Albanian withholding applies on the gross income you book.",
  },
];

export const GLOBAL_CLEARING_HUBS: BankDossier[] = BANK_DOSSIERS.filter(
  (bank) => bank.role === "Global Correspondent Clearing Hub"
);

export const DOMESTIC_BENEFICIARY_RAILS: BankDossier[] = BANK_DOSSIERS.filter(
  (bank) => bank.role === "Domestic Beneficiary Rail"
);

/** Resolve a single dossier for `/banks/<slug>` routing. */
export function getBankDossierBySlug(slug: string): BankDossier | undefined {
  return BANK_DOSSIERS.find((bank) => bank.slug === slug);
}

/** Simple case-insensitive search across name, BIC, city, country and role. */
export function searchBankDossiers(query: string): BankDossier[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return BANK_DOSSIERS;
  return BANK_DOSSIERS.filter((bank) =>
    [bank.name, bank.shortName, bank.bic, bank.headquartersCity, bank.headquartersCountry, bank.role]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
}
export const GITHUB_REPO = 'https://github.com/AhmadBilalDSA/payout-delta';

