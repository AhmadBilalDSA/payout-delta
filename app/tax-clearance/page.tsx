import type { Metadata } from "next";
import Link from "next/link";

import Dock from "@/components/dashboard/Dock";
import TaxClearanceView from "@/components/tax-clearance/TaxClearanceView";
import type {
  ClearanceBank,
  ClearanceDocument,
  ClearanceJurisdiction,
  ClearanceStats,
  ClearanceStep,
  ClearanceTier,
  ClearanceTrack,
} from "@/components/tax-clearance/payload";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import { getCorridorBySlug, getDataset } from "@/lib/db";
import { SITE_URL } from "@/lib/seoSchemas";

export const dynamic = "force-static";

/**
 * Track 4 — Statutory Purpose Code & Tax Clearance Hub.
 *
 * SERVER SHELL ONLY, for the same reason `/dashboard` is: this route must not
 * ship `data/fees.json` or the ~226KB statutory banking directory to the
 * browser. Every corridor, statutory tier, receiving bank, BIC and rate below is
 * resolved here at module scope from the two data sources, merged with the
 * authored clearance playbooks, and handed to `TaxClearanceView` as flat
 * numbers and short strings.
 *
 * The playbooks are the part that cannot be derived. The dataset already knows
 * that Pakistan's clearance is `e-PRC 24 hrs` under purpose code 9111 and that
 * India zero-rates under P0802; it does not know that the FIRC is downloaded
 * from the bank's net-banking portal, that Form 'R' is the inward-receipt
 * declaration (FEM Appendix V-121) rather than the export declaration, or that
 *Formato 1060 is the goods-export exogenous format. Those are the filings a
 * contractor actually gets stuck on, so they are authored here and cited by
 * regulator and section.
 *
 * Everything on the page is informational. Statutory tiers, certificates and
 * deadlines change without notice — always confirm with the regulator, the
 * authorised dealer bank or a local accountant before filing.
 */

/** Authored playbook content, keyed by the statutory track it belongs to. */
interface TrackContent {
  id: string;
  region: string;
  eyebrow: string;
  title: string;
  codeLabel: string;
  summary: string;
  /** Audited corridor slugs backing this track (1 for most, 2 for LATAM). */
  corridors: string[];
  /** Regulator chip per corridor slug, in the same order. */
  regulators: string[];
  steps: ClearanceStep[];
  documents: ClearanceDocument[];
  faqs: { question: string; answer: string }[];
}

/**
 * Regional-indicator flag from an ISO country code.
 *
 * Local copy on purpose: `lib/directoryData.ts` also exports `flagOf`, but
 * importing that module would pull the whole in-memory directory index into this
 * route's server graph for one six-line helper. EU is the one non-derivable case.
 */
function flagOf(code: string): string {
  if (code.toUpperCase() === "EU") return "🇪🇺";
  const base = 0x1f1e6;
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(base + char.charCodeAt(0) - 65)
    );
}

/**
 * Merge one corridor's dataset facts into a renderable jurisdiction record.
 *
 * `getRegulatoryBanking` resolves authored profiles and falls back to a generic
 * band, so every track is guaranteed to resolve a tier table and at least one
 * receiving bank even if a slug is later re-categorised.
 */
function buildJurisdiction(
  slug: string,
  regulator: string
): ClearanceJurisdiction {
  const corridor = getCorridorBySlug(slug);
  const regulation = getRegulatoryBanking(slug);

  const tiers: ClearanceTier[] = regulation.tiers.map((tier) => ({
    name: tier.name,
    authority: tier.authority,
    rate: tier.rate,
    purposeCode: tier.purposeCode,
    exemption: tier.exemption === true,
    note: tier.note,
  }));

  const banks: ClearanceBank[] = regulation.banks.map((bank) => ({
    name: bank.displayName,
    swiftCode: bank.swiftCode,
    clearance: bank.clearance,
    localFee: bank.localFeeDefault,
    localCurrency: bank.localCurrency,
  }));

  return {
    id: slug,
    country: corridor?.country ?? regulation.clearingNetwork,
    countryCode: corridor?.countryCode ?? "",
    flag: flagOf(corridor?.countryCode ?? ""),
    currency: corridor?.to ?? "",
    currencyName: corridor?.currencyName ?? "",
    regulator,
    authority: regulation.authority,
    clearingNetwork: regulation.clearingNetwork,
    citations: regulation.citations,
    corridorSlug: slug,
    pair: corridor ? `${corridor.from} → ${corridor.to}` : slug,
    rate: corridor?.rate ?? 0,
    tiers,
    banks,
  };
}

const TRACK_CONTENT: TrackContent[] = [
  /* ------------------------------------------------------------------ *
   * 1 — Pakistan / SBP
   * ------------------------------------------------------------------ */
  {
    id: "pakistan",
    region: "South Asia",
    eyebrow: "SBP · 9111",
    title: "Form 'R' clearance & the PRC bank certificate",
    codeLabel: "Purpose Code 9111 · Form 'R' · ePRC",
    summary:
      "State Bank of Pakistan clears IT export proceeds through the Authorized Dealer that credits your account. The export is evidenced by the bank's electronic Proceeds Realization Certificate; Form 'R' is the separate inward-receipt declaration the dealer files for foreign receipts that are not exports.",
    corridors: ["usd-to-pkr"],
    regulators: ["SBP"],
    steps: [
      {
        title: "Register the IT export activity",
        body: "Register with the Pakistan Software Export Board (PSEB) or P@SHA and hold the registration and export-processing certificate on file. SBP's Foreign Exchange Manual Chapter 12 (Exports), paragraphs 12(iii) and 36, is the instruction set the dealer applies to exports of software, IT and IT-enabled services, and PSEB registration is the credential it asks for.",
        meta: "PSEB / P@SHA",
      },
      {
        title: "Open the exporter's special FCY account",
        body: "SBP has directed Authorized Dealers to open a special foreign-currency account for IT exporters and freelancers so a defined share of export proceeds can be retained and spent on legitimate business outflows. Your remaining proceeds are converted and credited to the PKR account at the dealer's quoted rate.",
        meta: "Authorized Dealer",
      },
      {
        title: "Invoice the client and let the proceeds land",
        body: "The foreign client remits into the FCY account against your contract and invoice. The dealer matches the credit before it can issue any certificate, so keep the signed contract, the invoice and delivery evidence (SOW, timesheets, commit log, acceptance email) in the same folder.",
        meta: "Contract + invoice",
      },
      {
        title: "Purpose code 9111 on the declaration",
        body: "9111 is the BPM6 invisible-receipts code for computer and information services. The dealer codes your credit under 9111 and reports export proceeds on Schedule A-I of the ITRS return, matching the purpose code to the intention declared by the customer. A mismatch between the code on the wire and the nature of your invoice is the usual reason a credit is held for verification.",
        meta: "SBP ITRS · Schedule J",
      },
      {
        title: "File Form 'R' where it actually applies",
        body: "Form 'R' (FEM Appendix V-121) is the declaration for inward remittance receipts above USD 10,000 for purposes other than exports and family maintenance — the dealer files it to SBP through the International Transaction Reporting System. It is not the export declaration, and export proceeds do not need one; if a dealer asks you for Form 'R' on an export receipt, ask them to confirm which purpose group is being reported.",
        meta: "Appendix V-121",
      },
      {
        title: "Collect the ePRC / S-PRC",
        body: "Since August 2022 the dealer issues an electronic Proceeds Realization Certificate (ePRC) as proof that the foreign currency was received and converted. From 1 October 2025 the certificate is issued in the revised format that reports the realization in both local and foreign currency, and the Statement of PRCs (S-PRC) covers a whole period rather than a single credit. This is the document the FBR return and your withholding computation are built on.",
        meta: "ePRC · S-PRC",
      },
      {
        title: "Apply the right ITO s.154A tier",
        body: "Final withholding on export bank remittances is 0.25% for a PSEB-registered IT exporter, 1% for a non-PSEB active filer with a valid NTN, and 2% adjustable for a non-filer. Sales tax on services is separately exempt under the provincial PRA (Punjab), SRB (Sindh) and KPRA (Khyber Pakhtunkhwa) regimes. The bank applies the tier your filer status resolves to — it is not negotiable per bank.",
        meta: "ITO s.154A",
      },
    ],
    documents: [
      {
        name: "PSEB / P@SHA registration & export-processing certificate",
        issuer: "PSEB · P@SHA",
        purpose:
          "Proves the IT export registration the Authorized Dealer requires before it will clear export proceeds.",
      },
      {
        name: "Form 'R' (FEM Appendix V-121)",
        issuer: "State Bank of Pakistan, via the Authorized Dealer",
        purpose:
          "Inward-receipt declaration for foreign currency above USD 10,000 received for purposes other than exports; carries the purpose code on Schedule J.",
      },
      {
        name: "ePRC (electronic Proceeds Realization Certificate)",
        issuer: "Authorized Dealer bank",
        purpose:
          "Proof of funds for each realized export credit, in local and foreign currency since 1 Oct 2025; attach to the FBR annual return.",
      },
      {
        name: "Statement of PRCs (S-PRC)",
        issuer: "Authorized Dealer bank",
        purpose:
          "Period certificate summarising several ePRCs — the cleanest attachment for a full-year income computation.",
      },
      {
        name: "NTN certificate & withholding slip",
        issuer: "FBR / your bank",
        purpose:
          "Establishes the s.154A tier (0.25% / 1% / 2%) the bank applied, so the amount withheld can be claimed as credit against your annual liability.",
      },
    ],
    faqs: [
      {
        question: "What is purpose code 9111, and who assigns it?",
        answer:
          "9111 is the BPM6 invisible-receipts code for computer and information services. Your bank, as the Authorized Dealer, assigns it when it codes the inward credit and reports it to SBP; your job is to make sure the invoice, the contract and the remittance narrative all describe the same service so the code is correct.",
      },
      {
        question: "Do I need Form 'R' for export income from a client?",
        answer:
          "Form 'R' is the declaration for inward remittance receipts above USD 10,000 for purposes other than exports and family maintenance. Export proceeds are reported by the bank on the export schedule and evidenced by the ePRC, so a pure client export does not need Form 'R'. If the bank asks for one, ask which purpose group it is reporting under.",
      },
      {
        question: "How long does the PRC take?",
        answer:
          "The benchmark banks in our directory publish e-PRC turnaround of 24 to 48 hours after the export proceeds are realized — Meezan Bank at 24 hours, HBL and Bank Alfalah at 24 to 48, Standard Chartered on a priority FX margin. The clock starts when the credit is cleared, not when the client wires.",
      },
      {
        question: "Can I choose a lower withholding tier by changing bank?",
        answer:
          "No. The 0.25% PSEB-registered rate, the 1% active-filer rate and the 2% non-filer rate are set by section 154A of the Income Tax Ordinance and depend on your registration and NTN filer status. A bank will apply the tier your documents resolve to and cannot negotiate it — switching bank changes the fee and the FX rate, not the statutory rate.",
      },
    ],
  },

  /* ------------------------------------------------------------------ *
   * 2 — India / RBI
   * ------------------------------------------------------------------ */
  {
    id: "india",
    region: "South Asia",
    eyebrow: "RBI · P0802",
    title: "Purpose code P0802 & FIRC download flow",
    codeLabel: "Purpose Code P0802 · FIRC / e-FIRC",
    summary:
      "The Reserve Bank classifies every inward remittance with a five-character purpose code. Software implementation and consultancy is P0802 under group 08, and the FIRC your bank issues on the strength of that code is the document the tax department asks for first.",
    corridors: ["usd-to-inr"],
    regulators: ["RBI"],
    steps: [
      {
        title: "Classify the receipt as P0802",
        body: "P0802 is software implementation and consultancy other than those covered in a SOFTEX form, under group 08 (Computer and Information Services). The neighbouring codes are not interchangeable: P0801 is hardware consultancy, P0803 database and data-processing charges, P0804 repair and maintenance, P0807 off-site software exports reported through SOFTEX, and P1006 business and management consultancy. Choosing the wrong one is the most common reason a bank rejects a FIRC request or re-cuts the certificate later.",
        meta: "RBI purpose code",
      },
      {
        title: "Hand the dealer the FEMA evidence pack",
        body: "The Authorised Dealer asks for the service contract or SOW, the commercial invoice, your PAN, KYC and a FEMA declaration describing the services. Export-linked inward credits are reported by AD Category-I banks to the Export Data Processing and Monitoring System (EDPMS) daily, where the remittance is matched to the export declaration so the shipping bill can be closed out.",
        meta: "AD bank · EDPMS",
      },
      {
        title: "Take delivery of the FIRC / e-FIRC",
        body: "The FIRC is the Foreign Inward Remittance Certificate: the bank's confirmation that the foreign currency was received, converted at the booked rate and credited to your account. Export-related inward remittances are generated as an electronic FIRC inside the EDPMS flow and downloaded from your bank's net-banking portal; where a bank still issues the paper original, collect it from the branch, typically three to seven business days after the credit. HDFC Bank publishes FIRC / e-BRC at ₹100 and ICICI Bank at ₹50.",
        meta: "Net banking portal",
      },
      {
        title: "Zero-rate the export with a LUT",
        body: "File Form RFD-09 for a Letter of Undertaking to freeze your export LUT. With a valid LUT, exports under section 16(2)(a) IGST are zero-rated under Rule 96A of the CGST Rules and you neither pay IGST nor chase a refund; without it you pay 18% up front and recover it through a refund claim. File GSTR-1/IFF with the shipping invoice, and use the amendment window if the bond is broken.",
        meta: "RFD-09 · Rule 96A",
      },
      {
        title: "Reconcile the certificate to the return",
        body: "The FIRC is the evidence chain behind Form 15CA and, above ₹50 lakh of gross receipts, Form 15CB, and it is what substantiates the foreign remittance in your income-tax return — Schedule FSI for income received from abroad, and Schedule FA for any foreign bank account or asset held at year end. Keep the FIRC with the invoice it settles; a certificate without its matching invoice is the most common audit gap.",
        meta: "15CA · 15CB · ITR",
      },
      {
        title: "Check who withholds at source",
        body: "A valid LUT and section 194J / 194C treatment can put the professional's own withholding at zero, but the platform is a separate layer: section 194S, introduced by the Finance Act 2025, imposes 1% TDS on specified services paid through an e-commerce operator, rising to 2% from 1 October 2026. Reconcile both against the FIRC so the withheld amount is not taxed twice.",
        meta: "s.194J · s.194S",
      },
    ],
    documents: [
      {
        name: "Purpose code P0802 declaration",
        issuer: "You → Authorised Dealer",
        purpose:
          "Selects group 08 (Computer & Information Services) code P0802 for software implementation and consultancy, distinct from P0807 SOFTEX exports.",
      },
      {
        name: "FIRC / e-FIRC",
        issuer: "Authorised Dealer bank",
        purpose:
          "Evidence that the inward remittance was received, converted and credited — download the e-FIRC from net banking, or collect the paper original.",
      },
      {
        name: "GST Letter of Undertaking (Form RFD-09)",
        issuer: "GST portal",
        purpose:
          "Freezes the export LUT so the service is zero-rated under Rule 96A without paying 18% IGST and claiming a refund.",
      },
      {
        name: "Form 15CA / 15CB",
        issuer: "You and your chartered accountant",
        purpose:
          "Cross-border payment certificate; 15CB is required only once gross receipts exceed ₹50 lakh in the financial year.",
      },
      {
        name: "EDPMS inward-credit confirmation",
        issuer: "AD bank / RBI EDPMS",
        purpose:
          "Shows the remittance credited and matched against the export declaration, closing the shipping bill on the bank's side.",
      },
    ],
    faqs: [
      {
        question: "P0802 or P0807 — which one applies to me?",
        answer:
          "P0802 is for software implementation and consultancy services other than those covered in a SOFTEX form, which is where a freelance developer, consultant or agency belongs. P0807 is for off-site software exports reported through the SOFTEX process, used by software exporters shipping packaged product. If your client is paying for work, not for a licensed product export, P0802 is the code.",
      },
      {
        question: "How do I download the FIRC?",
        answer:
          "Sign in to your bank's net-banking portal and open the inward remittance or foreign remittance section, filter to the credit you need and download the e-FIRC or e-CIR as a PDF. Reference the UTR or remittance reference number, confirm the purpose code printed on it matches what you declared, and check the rate and value date against your invoice. Banks that still issue the paper FIRC require a branch request and typically charge a fee — HDFC Bank publishes ₹100 for FIRC / e-BRC and ICICI Bank ₹50.",
      },
      {
        question: "Do I need SOFTEX and an export declaration as a freelancer?",
        answer:
          "No. SOFTEX and the export declaration form sit in the goods and off-site software export regime. An individual or LLP providing services falls under the FEMA export-of-services rules, so the declaration is the P0802 purpose-code record plus the FIRC, not an export declaration. You still have to realize and repatriate the proceeds, which is exactly what the FIRC evidences.",
      },
      {
        question: "Does a LUT remove all withholding?",
        answer:
          "No — it removes the GST you pay on the export and supports zero export TDS, but the platform's own withholding is a separate question. Section 194C or 194J at the reduced professional rate can still apply to your client-to-freelancer payment, and section 194S adds 1% when an e-commerce operator is in the chain, rising to 2% from 1 October 2026. Reconcile each against the FIRC.",
      },
    ],
  },

  /* ------------------------------------------------------------------ *
   * 3 — Philippines / BSP
   * ------------------------------------------------------------------ */
  {
    id: "philippines",
    region: "Asia Pacific",
    eyebrow: "BSP · FX Form 1",
    title: "BPO inward remittance declaration rules",
    codeLabel: "FX Form 1 / 1A · CIR · BIR 1901",
    summary:
      "For cross-border tech and BPO remittances, the reporting obligation sits with the receiving bank, not the individual: under the BSP FX Manual every inward receipt is reported to the central bank on FX Form 1 or 1A against the purpose you declared. The freelancer's own filing is with the Bureau of Internal Revenue.",
    corridors: ["usd-to-php"],
    regulators: ["BSP"],
    steps: [
      {
        title: "Onboard through an Authorized Agent Bank",
        body: "Inward foreign currency is received through an AAB — a universal/commercial bank or its forex corporation. The AAB performs the AML screening, converts to pesos and reports the receipt. Circular 980 and the FX Manual (MORFXT) set the framework; the reporting is done by the bank, but it is reported against the purpose and the documents you supply, so a mismatch between the declared purpose and the contract slows the credit.",
        meta: "AAB · BSP Circular 980",
      },
      {
        title: "Declare the purpose of the remittance",
        body: "All FX receipts, disbursements, sales, payments and remittances are reported by the receiving or remitting bank under the relevant schedule of FX Form 1 (universal and commercial banks) or FX Form 1A (thrifts), based on the purpose the customer declares. Certain remittances must reach the central bank within two banking days of the actual remittance on the prescribed annex form, so a 'service export' narrative and a service contract are the minimum a compliant declaration can be built on.",
        meta: "FX Form 1 / 1A",
      },
      {
        title: "Take the Certificate of Inward Remittance",
        body: "The AAB issues a Certificate of Inward Remittance on the form prescribed in the FX Manual (Appendix 10.1) or an equivalent remittance advice, stating the remitter, the reference, the foreign amount, the peso proceeds and the conversion rate. It is the document that ties pesos in your account to a specific foreign credit — the Philippine equivalent of the FIRC and the ePRC, and the attachment your accountant will ask for.",
        meta: "CIR · Appendix 10.1",
      },
      {
        title: "Entity registration if you invoice through a BPO",
        body: "A technology/BPO entity that wants the PEZA or Board of Investments incentives must be registered with the agency; that registration sits on the bank's onboarding file and is what connects the inward credit to an IT-BPMO business rather than a personal receipt. A solo freelancer has no PEZA step — the same receipts are declared personally with the BIR.",
        meta: "PEZA / BOI",
      },
      {
        title: "Pick the 8% flat or graduated + OSD",
        body: "A resident freelancer earning above ₱250,000 a year can elect the 8% flat tax on gross compensation under the TRAIN regime, filed quarterly on BIR Form 1901 with the 1903 / 1904 schedules, or stay on graduated rates with the Optional Standard Deduction, filed annually on 1701 / 1702. The quarterly 1902 return is a summary of the 1901 — it does not replace the annual income tax return. The 1904 detail schedule is where the source and nature of the freelance income gets documented for the file.",
        meta: "BIR 1901 · 1701",
      },
      {
        title: "Collect the certificate of tax withheld",
        body: "Where the client withholds on your behalf, get the Certificate of Income Tax Withholding at the end of the year. It is the offset against the 8% or graduated liability you declared, and without it the withheld amount is easy to be taxed twice. The certificate and the CIR together are the complete evidence pack for a Philippine tax filing.",
        meta: "Certificate of withholding",
      },
    ],
    documents: [
      {
        name: "FX Form 1 / FX Form 1A report",
        issuer: "Authorized Agent Bank → BSP",
        purpose:
          "The bank's statutory report of the inward receipt against the declared purpose; your contract and invoice are the evidence behind that purpose code.",
      },
      {
        name: "Certificate of Inward Remittance (CIR)",
        issuer: "Authorized Agent Bank",
        purpose:
          "Proves the foreign credit, the peso proceeds and the conversion rate for one remittance — the Philippine substitute for an FIRC or ePRC.",
      },
      {
        name: "PEZA / BOI registration",
        issuer: "PEZA · Board of Investments",
        purpose:
          "Required for an IT-BPMO entity to claim incentives; sits on the bank's onboarding file and links the inward credit to a registered business.",
      },
      {
        name: "BIR Form 1901 + 1903 / 1904 (quarterly)",
        issuer: "Bureau of Internal Revenue",
        purpose:
          "The 8% flat tax route, filed quarterly on gross compensation above the ₱250,000 threshold.",
      },
      {
        name: "BIR Form 1701 / 1702 (annual)",
        issuer: "Bureau of Internal Revenue",
        purpose:
          "The graduated-rates-with-OSD route; 1702 is the summary return, not a replacement for the annual ITR.",
      },
      {
        name: "Certificate of Income Tax Withholding",
        issuer: "Client / paying entity",
        purpose:
          "Offsets the tax your client already withheld, so the same income is not taxed twice.",
      },
    ],
    faqs: [
      {
        question: "As a Filipino freelancer, do I report the remittance to BSP?",
        answer:
          "No. The BSP reporting obligation sits with the receiving Authorized Agent Bank, which reports every inward FX receipt to the central bank on FX Form 1 or 1A against the purpose you declared. Your own obligation is with the Bureau of Internal Revenue — 1901 quarterly if you elect the 8% flat rate, or 1701 annually if you stay on graduated rates with the Optional Standard Deduction.",
      },
      {
        question: "BPO entity or individual — who declares the receipt?",
        answer:
          "Whichever party received the money. If the credit lands on a PEZA- or BOI-registered BPO account, the entity declares it to the BIR and the AAB reports the inward remittance to the BSP. If the credit lands on your personal account, the receipts are your personal freelance income and you declare them personally — a BPO registration is not a substitute for your own return.",
      },
      {
        question: "Is the 8% rate on gross or on net income?",
        answer:
          "Gross. The 8% flat tax applies to gross compensation from freelance work above ₱250,000 a year, which is why the taxable base is the invoice total before any deduction. If you would rather deduct real expenses, take graduated rates with the Optional Standard Deduction on the annual 1701 and report the expenses there instead.",
      },
    ],
  },

  /* ------------------------------------------------------------------ *
   * 4 — Latin America / BanRep + DIAN (Colombia) and BCB (Brazil)
   * ------------------------------------------------------------------ */
  {
    id: "latam",
    region: "Latin America",
    eyebrow: "DIAN 1060 · BCB SCE",
    title: "Statutory foreign exchange reporting",
    codeLabel: "Declaración de Cambio · Formato 1060 · SCE",
    summary:
      "Both countries treat a foreign-currency receipt as a reportable event, not just a bank credit. Colombia declares the operation to the market intermediary and the exogenous reporting reaches DIAN on Formato 1060; Brazil registers the contract in the BCB's SCE and the taxable income is declared to the Receita Federal through the Carnê-Leão and the annual return.",
    corridors: ["usd-to-cop", "usd-to-brl"],
    regulators: ["BanRep · DIAN", "BCB · Receita Federal"],
    steps: [
      {
        title: "Contract and invoice before the bank",
        body: "In both countries the FX operation is registered against a real agreement, so the service contract, the invoice and evidence of delivery come first. This is the same evidence discipline as the SBP and RBI tracks — the difference is that here the declaration is a separate regulatory act with its own deadline, not a side effect of the credit advice.",
        meta: "Contract · factura",
      },
      {
        title: "COLOMBIA — file the Declaración de Cambio",
        body: "Residents and non-residents transacting in Colombia must present a Declaración de Cambio, signed personally or by a representative, with the amount and characteristics of the operation. Under Circular Externa DCIN-83 the exporter supplies the minimum data to the intermediario del mercado cambiario within five business days of the pesos being credited; a correction not filed within fifteen business days of the original is treated as final.",
        meta: "5 business days",
      },
      {
        title: "COLOMBIA — know what Formato 1060 is",
        body: "Formato 1060 is the exogenous FX information format for payments for exports of goods, coded with numeral cambiario 1060 ('Pago de exportaciones de bienes en moneda legal colombiana'), and the market intermediary delivers it to DIAN quarterly — in the month after the quarter, on the 10th to 19th business day of April, July, October and January depending on the last digit of the NIT. A software or consulting exporter has no DEX and no shipping bill, so the format that matters to you personally is the Declaración de Cambio with the service numeral cambiario; use Formato 1060 as the template for what the intermediary must capture, and confirm the correct service numeral with your intermediario rather than filing 1060 yourself.",
        meta: "Resolución DIAN 9147/2006",
      },
      {
        title: "BRAZIL — register the contract in the SCE",
        body: "Foreign-exchange operations are contracted only through institutions authorized by the Central Bank of Brasil, under the consolidated rules in Resolução BCB 277/2022, and the contract is registered in the Sistema de Câmbio Eletrônico. The institution is the reporting party for the operation; your obligation is to be able to evidence the service that produced the foreign currency.",
        meta: "Resolução BCB 277/2022",
      },
      {
        title: "BRAZIL — declare the income, not just the credit",
        body: "Foreign-source income received by a resident individual is reported on the annual IRPF in the 'rendimentos recebidos de pessoa física do exterior' group, with monthly payments through the Carnê-Leão. Foreign amounts are converted at the PTAX purchase rate published for the month the income is received, and assets held abroad at 31 December go into Bens e Direitos — the devaluation of the balance is taxed even when no income was remitted.",
        meta: "IRPF · Carnê-Leão",
      },
      {
        title: "Both — collect the withholding certificate",
        body: "Colombia applies 1% retención en la fuente on service payments under article 392 of the Estatuto Tributario, and the paying entity issues the certificado de retención that offsets your annual return. Brazil does not withhold on a self-employed provider's own receipts, which is why the Carnê-Leão model exists. Ask the client for the certificate before the fiscal year closes in either country.",
        meta: "Art. 392 ET",
      },
    ],
    documents: [
      {
        name: "Declaración de Cambio",
        issuer: "You → intermediario del mercado cambiario",
        purpose:
          "The FX declaration for the operation, filed within five business days of the peso credit; corrections must be filed within fifteen business days.",
      },
      {
        name: "Formato 1060 (Anexo 2)",
        issuer: "Intermediario del mercado cambiario → DIAN",
        purpose:
          "Exogenous FX information for payments for exports of goods, under numeral cambiario 1060, delivered quarterly. Use it as the data template for a service export, not as a self-filed goods form.",
      },
      {
        name: "Certificado de retención en la fuente",
        issuer: "Client / paying entity",
        purpose:
          "Proves the 1% withholding under article 392 ET was applied, so it is credited against your annual income tax return.",
      },
      {
        name: "Contrato y factura de servicios",
        issuer: "You",
        purpose:
          "The evidence pack behind the declaration: agreement, invoice and delivery evidence for the services exported.",
      },
      {
        name: "SCE contract registration",
        issuer: "BCB-authorized institution",
        purpose:
          "Registration of the FX contract for services in the electronic FX system under Resolução BCB 277/2022.",
      },
      {
        name: "Comprovante de Rendimentos",
        issuer: "Paying institution (IN RFB 1.500/2014)",
        purpose:
          "Declares the income received, the amount in reais and the conversion rate — the Brazilian counterpart of the FIRC and the ePRC.",
      },
      {
        name: "PTAX rate for the receipt month",
        issuer: "Banco Central do Brasil",
        purpose:
          "Official purchase rate used to convert foreign income in the Carnê-Leão; the rate your client paid is not the tax rate.",
      },
    ],
    faqs: [
      {
        question: "Is Formato 1060 the form a Colombian software exporter files?",
        answer:
          "Not directly. Formato 1060 is the exogenous information format for payments for exports of goods, filed by the market intermediary with DIAN quarterly and coded with numeral cambiario 1060. As a service exporter you file the Declaración de Cambio with the intermediary within five business days of the peso credit, using the service numeral cambiario, and the intermediary carries the information to DIAN. Use Formato 1060 as the data template for what the intermediary has to capture, and confirm the correct service numeral with your intermediario.",
      },
      {
        question: "Which exchange rate converts my USD income in Brazil?",
        answer:
          "The PTAX purchase rate published by the Central Bank of Brazil for the month in which the income is received — that is the rate the Carnê-Leão uses. The rate your client agreed in the contract and the rate your bank actually converted at are both irrelevant to the tax computation, which is why the Comprovante de Rendimentos needs to state the amount in reais separately from the foreign amount.",
      },
      {
        question: "Do I need a registered company to receive foreign payments in Brazil?",
        answer:
          "The foreign exchange operation itself must be contracted through a BCB-authorized institution regardless of whether you are an individual or a company, and the institution is the reporting party. The taxable income is yours either way. Many freelancers invoice through a MEI or a regular company for contract and invoicing reasons, but that is a commercial decision — it is not a precondition for the declaration.",
      },
      {
        question: "What changes at 31 December in both countries?",
        answer:
          "Both regimes treat the year-end position, not just the year's income. In Brazil the balance of foreign assets goes into Bens e Direitos and the exchange-rate devaluation is taxable even with no remittance. In Colombia the accumulated foreign-currency balances held in a cuenta de compensación are disclosed in the exogenous return. Reconcile both against the year's certificates at filing time.",
      },
    ],
  },
];

/** Every track, with its dataset-derived jurisdictions merged in at build time. */
const TRACKS: ClearanceTrack[] = TRACK_CONTENT.map((content) => ({
  id: content.id,
  region: content.region,
  eyebrow: content.eyebrow,
  title: content.title,
  codeLabel: content.codeLabel,
  summary: content.summary,
  jurisdictions: content.corridors.map((slug, index) =>
    buildJurisdiction(slug, content.regulators[index] ?? "")
  ),
  steps: content.steps,
  documents: content.documents,
  faqs: content.faqs,
}));

/** Hero totals, derived from the same payload the island renders. */
const STATS: ClearanceStats = {
  corridors: new Set(
    TRACKS.flatMap((track) => track.jurisdictions.map((j) => j.corridorSlug))
  ).size,
  tiers: TRACKS.reduce(
    (total, track) =>
      total + track.jurisdictions.reduce((sum, j) => sum + j.tiers.length, 0),
    0
  ),
  banks: TRACKS.reduce(
    (total, track) =>
      total + track.jurisdictions.reduce((sum, j) => sum + j.banks.length, 0),
    0
  ),
  revisedOn: getDataset().updatedAt,
};

const TITLE =
  "Statutory Purpose Codes & Tax Clearance — SBP 9111, RBI P0802, BSP, DIAN & BCB";
const DESCRIPTION =
  "Client-side reference for cross-border contractor tax clearance: SBP Form 'R' and the ePRC bank certificate, RBI purpose code P0802 and the FIRC download flow, BSP inward remittance reporting for BPO receipts, and the DIAN Formato 1060 and BACEN declarations for LATAM exporters. Every tier, bank and clearing rail read live from the audited corridor dataset.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/tax-clearance/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/tax-clearance/`,
    siteName: "PayoutDelta",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/** Every FAQ pair on the page, flattened for the FAQPage graph. */
const FAQ_ENTRIES = TRACKS.flatMap((track) => track.faqs).map((faq) => ({
  "@type": "Question" as const,
  name: faq.question,
  acceptedAnswer: {
    "@type": "Answer" as const,
    text: faq.answer,
  },
}));

export default function TaxClearancePage() {
  /** TechArticle — the hub as a reference work, dated to the dataset revision. */
  const techArticleLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/tax-clearance/`,
    datePublished: STATS.revisedOn,
    dateModified: STATS.revisedOn,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    license: "https://opensource.org/licenses/mit",
    proficiencyLevel: "Expert",
    articleSection: "Cross-border tax compliance",
    keywords: [
      "SBP purpose code 9111",
      "Form R export declaration Pakistan",
      "ePRC proceeds realization certificate",
      "RBI purpose code P0802",
      "FIRC e-FIRC download",
      "GST LUT RFD-09 export",
      "BSP FX Form 1 inward remittance",
      "BIR 1901 8% freelance tax",
      "DIAN Formato 1060",
      "declaracion de cambio Colombia",
      "BACEN SCE foreign exchange registration",
    ],
    author: {
      "@type": "Organization",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
    },
    publisher: {
      "@type": "Organization",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
    },
    about: TRACKS.map((track) => ({
      "@type": "Thing",
      name: `${track.eyebrow} — ${track.title}`,
    })),
    mainEntity: {
      "@type": "Dataset",
      name: "PayoutDelta Statutory Purpose Code Registry",
      description: `Statutory withholding tiers, purpose codes, clearing networks and receiving banks for ${STATS.corridors} audited clearance corridors, ${STATS.tiers} statutory tiers and ${STATS.banks} receiving banks.`,
      dateModified: STATS.revisedOn,
      inLanguage: "en-US",
      isAccessibleForFree: true,
      license: "https://opensource.org/licenses/mit",
      creator: {
        "@type": "Organization",
        name: "PayoutDelta",
        url: `${SITE_URL}/`,
      },
    },
  };

  /** FAQPage — one Question per authored pair, reused by the on-page accordion. */
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ENTRIES,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Statutory Purpose Codes & Tax Clearance",
        item: `${SITE_URL}/tax-clearance/`,
      },
    ],
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(techArticleLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c"),
          }}
        />

        {/* ---------------------------------------------------------------- *
         * Hero — value proposition and the two ways in.
         * ---------------------------------------------------------------- */}
        <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 sm:p-8 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Track 4 · Compliance
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
            Statutory Purpose Code &amp; Tax Clearance Hub
          </h1>
          <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
            A contractor&apos;s payout is not cleared because the money arrived —
            it is cleared because the bank could file a return against it. This
            is the paperwork layer under the rail: SBP purpose code 9111 with Form
            &apos;R&apos; and the ePRC, RBI purpose code P0802 with the FIRC
            download, BSP inward remittance reporting for BPO receipts, and the
            DIAN Formato 1060 and BACEN declarations in Latin America. Every
            statutory tier, receiving bank and clearing network below is read live
            from the audited corridor dataset.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Clearance corridors", value: String(STATS.corridors) },
              { label: "Statutory tiers", value: String(STATS.tiers) },
              { label: "Receiving banks", value: String(STATS.banks) },
              { label: "Statutory tracks", value: String(TRACKS.length) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-black/[0.06] bg-black/[0.02] px-3.5 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]"
              >
                <dt className="text-[11px] font-medium uppercase tracking-wider text-black/45 dark:text-white/45">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-black dark:text-white">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-emerald-600"
            >
              Open the clearing terminal
            </Link>
            <Link
              href="/tax-ledger/"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] px-4 py-2 text-sm font-semibold text-black/70 transition-colors duration-200 ease-out hover:bg-black/[0.04] dark:border-white/[0.12] dark:text-white/75 dark:hover:bg-white/[0.06]"
            >
              Reconcile against the tax ledger
            </Link>
          </div>
        </section>

        <div className="mt-8">
          <TaxClearanceView tracks={TRACKS} stats={STATS} />
        </div>

        <p className="no-print mt-10 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
          PayoutDelta is informational tooling, not financial, tax or legal
          advice. Statutory tiers, purpose codes, certificate formats and filing
          deadlines are published benchmarks compiled from the open regulatory
          record and change without notice — confirm the current requirement with
          the regulator, your authorized dealer bank or a local accountant before
          you file. PayoutDelta is never a party to your transaction and does not
          handle funds.
        </p>
      </div>

      {/* Floating module launcher — chrome above the whole page. */}
      <Dock />
    </>
  );
}
