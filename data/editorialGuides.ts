/**
 * PayoutDelta — Editorial Comparison Guides repository (Milestone 9).
 *
 * Single source of truth for the high-intent `/compare/<slug>/` editorial
 * guides. Every guide is authored here as a schema-backed record so the route
 * renderer, the sitemap, the IndexNow batch and the QA audit all derive from
 * the same copy — the guide set can never drift from the routes that exist.
 *
 * Content contract:
 *   - zero third-party packages, pure TypeScript + static HTML (consistent
 *     with the static export),
 *   - published/updated ISO dates feed the Schema.org Article/TechArticle
 *     timeline,
 *   - `exampleGrossUSD` drives the same pure benchmark the calculator's
 *     Alternative Rails card uses, so the editorial numbers and the monetized
 *     recommendation card share one deterministic engine,
 *   - `recommendation.partnerId` resolves through `data/affiliatePartners.ts`
 *     (FTC-compliant `rel="noopener noreferrer sponsored"` + disclosure).
 *
 * The three guides target the exact high-intent comparison queries:
 *   1. SWIFT wire vs Wise Business  — real transit deductions
 *   2. SHA vs OUR                   — SWIFT Field 71A charge allocation
 *   3. Direct bank wire vs Payoneer — the true cross-border payout cost
 */

export interface GuideCompareRow {
  label: string;
  optionA: string;
  optionB: string;
  /** Which side is cheaper/more favourable for that single line item. */
  winner: "a" | "b" | "tie";
}

export interface GuideMetric {
  label: string;
  optionA: string;
  optionB: string;
}

export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

/** Partner ids resolvable through the central affiliate directory. */
export type GuidePartnerId = "wise" | "payoneer" | "remitly" | "elevate";

export interface EditorialGuide {
  /** Route slug (`/compare/<slug>/`). */
  slug: string;
  title: string;
  metaDescription: string;
  readingTimeMinutes: number;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  /** Benchmark gross the recommendation card quantifies. */
  exampleGrossUSD: number;
  optionA: { label: string; shortLabel: string };
  optionB: { label: string; shortLabel: string };
  quickMetrics: GuideMetric[];
  comparisonTable: {
    headings: [string, string, string];
    rows: GuideCompareRow[];
  };
  /** "What you'll learn" bullets rendered above the table. */
  focus: string[];
  sections: GuideSection[];
  verdict: string[];
  recommendation: {
    partnerId: GuidePartnerId;
    headline: string;
    body: string;
    claimCopy: string;
  };
  /** Schema.org subtype: TechArticle for wire-engineering, Article otherwise. */
  isTechArticle: boolean;
}

export const EDITORIAL_GUIDES: readonly EditorialGuide[] = [
  {
    slug: "swift-wire-vs-wise-business",
    title:
      "SWIFT Wire vs Wise Business: Real Transit Deductions for International Contractors",
    metaDescription:
      "Where a $15–$35 correspondent SHA cut and a 2.5%–4.2% retail FX spread disappear from your invoice, and how Wise Business keeps the mid-market rate behind a flat ~0.45%–0.7% transparent fee.",
    readingTimeMinutes: 7,
    tags: ["SWIFT", "Wise Business", "correspondent banking", "FX spread", "international contractors"],
    publishedAt: "2026-09-20",
    updatedAt: "2026-09-24",
    exampleGrossUSD: 5000,
    optionA: { label: "Classic SWIFT wire", shortLabel: "SWIFT wire" },
    optionB: { label: "Wise Business", shortLabel: "Wise" },
    quickMetrics: [
      {
        label: "Correspondent transit cuts",
        optionA: "$15–$35 per hop, stacking across the chain",
        optionB: "$0 — no correspondent chain",
      },
      {
        label: "Retail FX spread",
        optionA: "2.5%–4.2% over mid-market",
        optionB: "~0.45%–0.7% flat on mid-market",
      },
      { label: "$5,000 all-in cost", optionA: "≈$140–$250", optionB: "≈$23–$35" },
      { label: "Settlement window", optionA: "3–5 business days", optionB: "1–2 business days" },
    ],
    comparisonTable: {
      headings: ["Line item", "Classic SWIFT wire", "Wise Business"],
      rows: [
        {
          label: "Intermediary correspondent cut",
          optionA: "$15–$35 per hop; multi-hop routes compound the deduction",
          optionB: "$0 — direct local-currency clearing, no correspondent route",
          winner: "b",
        },
        {
          label: "Retail FX spread on the interbank rate",
          optionA: "2.5%–4.2%",
          optionB: "~0.45%–0.7% transparent conversion fee",
          winner: "b",
        },
        {
          label: "Fee discovery",
          optionA: "Confirmed only on the bank credit advice, after the transfer",
          optionB: "Quoted in full before you send",
          winner: "b",
        },
        {
          label: "Settlement time",
          optionA: "3–5 business days across the chain",
          optionB: "1–2 business days on local rails",
          winner: "b",
        },
        {
          label: "Net on a $5,000 invoice",
          optionA: "≈$4,750–$4,860",
          optionB: "≈$4,965–$4,977",
          winner: "b",
        },
      ],
    },
    focus: [
      "How a quotable \"bank wire fee\" understates the real bill — the intermediary SHA hop is invisible until the credit advice arrives.",
      "Why the retail FX spread of 2.5%–4.2% over the interbank rate is the largest single cost layer on a contractor invoice.",
      "What Wise Business actually charges: a flat ~0.45%–0.7% conversion fee at the mid-market rate over direct local clearing.",
      "The narrow cases where the classic wire still wins, and the receiving-bank landing fees no comparison shows.",
    ],
    sections: [
      {
        heading: "The transit row nobody quotes",
        paragraphs: [
          "When a client pays an international contractor by SWIFT, the quoted \"wire fee\" in the client's banking portal almost never describes the full journey. Between the sender's bank and your receiving bank sit one or more correspondent banks — each of which can apply its own charge under the SWIFT SHA (shared) instruction. On a typical USD transfer to South Asia or the Middle East, that cut runs $15–$35 per hop, and multi-currency corridors can stack two hops onto one transfer.",
          "The deduction is real cash leaving your invoice. It is not displayed by the sending platform, it is not part of the contract price, and it usually surfaces only as a line on the receiving bank's credit advice days later. That gap — quoted price versus landed amount — is the \"transit deduction\" this guide is about. See SWIFT Field 71A in the companion guide on SHA vs OUR charges for the instruction that decides who eats it.",
        ],
      },
      {
        heading: "Where the FX spread comes from",
        paragraphs: [
          "Every wire converts your USD into the receiving currency at the bank's retail rate, not the interbank (mid-market) rate. For cross-border contractor corridors that markup runs 2.5%–4.2% of the transferred amount. On a $5,000 invoice the spread alone is $125–$210 in silent leakage before a single correspondent fee is added.",
          "Because the spread scales linearly with the amount, it grows faster than any fixed fee. Contractors who chase a flat \"wire fee\" of $25–$40 on their banking portal are optimizing the wrong line item — the FX markup on a six-figure annual remittance flow is the dominant cost.",
        ],
      },
      {
        heading: "How Wise Business prices the same transfer",
        paragraphs: [
          "Wise Business settles on the mid-market rate and charges a single, disclosed conversion fee of roughly 0.45%–0.7% depending on the corridor. There is no correspondent leg: the service converts into local currency and clears through local rails, so the $15–$35 per-hop intermediary deduction does not exist. The fee is quoted in full before the transfer is confirmed — the exact opposite of the wire's post-hoc credit advice.",
          "On the $5,000 benchmark, Wise lands at an all-in cost of roughly $23–$35 against the wire's $140–$250: 85–90% cheaper on the transit tail, over and above the settlement speed (1–2 days versus 3–5).",
        ],
      },
      {
        heading: "When the wire still wins",
        paragraphs: [
          "None of this is absolute. Some receiving banks waive or reduce landing fees for SWIFT arrivals, a few clients require wire-only payment rails for treasury reasons, and a receiving bank's inward clearing fee applies in some corridors regardless of rail. If your bank operates a genuine partnership with the correspondent leg, or your corridor lacks a Wise local-clearing partner, the wire's real cost can sit well inside the benchmark band.",
          "The honest way to decide is not a rule of thumb but a per-corridor reckoning: benchmark your exact bank schedule over the calculator, then look at the corridor's receiving-bank landing fee before committing. That number, not the poster rate, is what the recommendation engine below shows.",
        ],
      },
    ],
    verdict: [
      "For a recurring invoice flow, the classic SWIFT wire leaks two layers a modern rail removes: the correspondent SHA cut and the retail FX spread. On a $5,000 international contractor invoice, the difference is roughly $100–$220 of silent cash.",
      "Run your exact bank wire schedule through the calculator to get the corridor-specific figure, then compare it against the flat ~0.45%–0.7% Wise Business conversion fee at the mid-market rate.",
    ],
    recommendation: {
      partnerId: "wise",
      headline: "Bypass the correspondent chain on your next invoice",
      body: "Every recurring contractor transfer compounds the $15–$35 SHA cut and the 2.5%–4.2% retail spread. Wise Business settles on the mid-market rate with a single disclosed fee and no correspondent hop — benchmark your corridor, then lock the rate before the client pays.",
      claimCopy: "Claim the mid-market rate via Wise Business →",
    },
    isTechArticle: false,
  },

  {
    slug: "sha-vs-our-swift-charges",
    title: "SHA vs OUR SWIFT Wire Charges: How to Prevent Missing Cash on Foreign Invoices",
    metaDescription:
      "SWIFT field 71A decides who eats the correspondent bank's charges. SHA lets $15–$35+ of intermediary cuts land on your payout; OUR forces the sender to cover every charge. Here is the contract clause that locks the full amount down.",
    readingTimeMinutes: 6,
    tags: ["SWIFT", "SHA", "OUR", "Field 71A", "invoice clause", "MT103"],
    publishedAt: "2026-09-20",
    updatedAt: "2026-09-24",
    exampleGrossUSD: 1000,
    optionA: { label: "SHA (shared charges)", shortLabel: "SHA" },
    optionB: { label: "OUR (sender pays all)", shortLabel: "OUR" },
    quickMetrics: [
      {
        label: "Who pays the intermediary",
        optionA: "Receiving side pays — cuts land on your payout",
        optionB: "Sender pays every charge",
      },
      { label: "Field 71A value", optionA: "SHA", optionB: "OUR" },
      {
        label: "Amount that arrives",
        optionA: "Invoice minus $15–$35+ in intermediary deductions",
        optionB: "Full invoice amount",
      },
      {
        label: "Default in most contracts",
        optionA: "SHA (unless the clause says otherwise)",
        optionB: "Never assumed — must be negotiated",
      },
    ],
    comparisonTable: {
      headings: ["Factor", "SHA", "OUR"],
      rows: [
        {
          label: "Charge allocation",
          optionA: "Each party pays their own bank; receiving bank + intermediaries bill the beneficiary",
          optionB: "Sender pays their bank, every intermediary and the beneficiary bank's charges",
          winner: "b",
        },
        {
          label: "What nets in your bank",
          optionA: "Invoice amount minus the intermediary SHA cut and local liens",
          optionB: "The full invoice amount",
          winner: "b",
        },
        {
          label: "Typical shortfall on $1,000",
          optionA: "$15–$35+ (plus any receiving-bank commission)",
          optionB: "$0",
          winner: "b",
        },
        {
          label: "Enforcement in practice",
          optionA: "The bank default when the contract is silent",
          optionB: "Requires an explicit clause + the sender instructing Field 71A = OUR",
          winner: "b",
        },
        {
          label: "Bank verification",
          optionA: "Confirmed on the MT103 / credit advice",
          optionB: "Confirmed on the MT103 / credit advice",
          winner: "tie",
        },
      ],
    },
    focus: [
      "What SWIFT Field 71A actually means and where the two charge codes behave differently end-to-end.",
      "Quantifying the SHA shortfall: $15–$35+ that silently leaves your invoice per transfer.",
      "The copy-paste contract clause that forces OUR, plus the MT103 audit step that proves it.",
      "Why moving off the correspondent chain removes the argument completely.",
    ],
    sections: [
      {
        heading: "Field 71A: the line that reroutes your cash",
        paragraphs: [
          "Every SWIFT wire carries a Field 71A (Details of Charges) instruction. Three values exist: BEN (beneficiary pays all charges), OUR (sender pays all charges), and SHA (charges are shared — the sender pays their own bank's fees, the receiving bank and any intermediaries bill the beneficiary). Contracts that say nothing default to SHA, because that is the corridor standard most originating banks apply.",
          "SHA sounds symmetrical, but it is the practical trap for the contractor: the receiving-side deductions — intermediary correspondent cuts plus the receiving bank's own commission — leave your payout. The sender's portal never shows them. You discover the damage when the landed amount is less than the invoice.",
        ],
      },
      {
        heading: "The SHA shortfall, quantified",
        paragraphs: [
          "On the $1,000 benchmark this guide uses, the SHA shortfall lands in the $15–$35 band for a single correspondent hop and climbs with multi-hop routing and under-banked corridors. Add a receiving-bank commission or a local landing fee and the true leakage exceeds the headline intermediary cut.",
          "Because the deduction happens outside the platform, neither Upwork, Fiverr nor a direct-client portal can correct it after the fact — the money is already dispersed through the chain. Recovering it means changing the instruction upstream, which is a contract question before it is a banking one.",
        ],
      },
      {
        heading: "The contract clause (copy-paste)",
        paragraphs: [
          "Map the SWIFT instruction into the fee language of your engagement letter so the sender's finance team executes it without interpretation:",
          "> \"Payments shall be made by bank wire in [CURRENCY] to the account named on the invoice. All transfer fees and charges, including but not limited to the sender's bank charges, any correspondent or intermediary bank charges, and the beneficiary bank's receiving commission, shall be borne entirely by the Client. The sender must instruct the transfer with SWIFT Field 71A set to OUR, and produce a copy of the SWIFT MT103 upon request.\"",
          "The MT103 is the sender's payment order; its Field 71A must read OUR. When the landed amount still falls short, the MT103 is your evidence: the receiving bank applies charges that violate the instruction, and you can push them back to the sender to settle the difference.",
        ],
      },
      {
        heading: "The practical escape hatch",
        paragraphs: [
          "The strongest fix is structural: a modern direct-clearing rail has no correspondent bank in the route, so there is no intermediary to split charges and no Field 71A negotiation. The route converts at the mid-market rate with a disclosed fee, and the full invoice amount arrives. Contract CARL the outcome — net delivery in the bank — instead of leaving it to a SWIFT instruction the counterparty may not honor.",
        ],
      },
    ],
    verdict: [
      "Under SHA, receiving-side banks and intermediaries bill the contractor; under OUR, the sender covers every charge. The difference is $15–$35+ per wire, pure leakage from the invoiced amount.",
      "Negotiate OUR in writing, request the MT103 as proof, and — where the client allows any rail at all — prefer a non-correspondent route that makes the argument moot.",
    ],
    recommendation: {
      partnerId: "wise",
      headline: "Skip the Field 71A argument entirely",
      body: "The cleanest fix is to stop routing money across the correspondent chain altogether — a direct-clearing rail has no intermediary bank to split charges, so the full invoice amount arrives on the mid-market rate with one disclosed fee.",
      claimCopy: "Compare a no-intermediary rail →",
    },
    isTechArticle: true,
  },

  {
    slug: "direct-bank-wire-vs-payoneer",
    title: "Direct Bank Wire vs Payoneer: Calculating the Real Cost of Cross-Border Payouts",
    metaDescription:
      "A direct bank wire drags a $15–$35 SHA cut and a 2.0%–4.2% retail spread through your invoice. Payoneer bills 2–3% to withdraw and a conversion markup on top. The number neither side quotes — the true all-in cost — is what this guide reckons.",
    readingTimeMinutes: 7,
    tags: ["Payoneer", "bank wire", "withdrawal fee", "FX markup", "cross-border payout"],
    publishedAt: "2026-09-20",
    updatedAt: "2026-09-24",
    exampleGrossUSD: 2500,
    optionA: { label: "Payoneer withdrawal", shortLabel: "Payoneer" },
    optionB: { label: "Direct bank wire", shortLabel: "Bank wire" },
    quickMetrics: [
      {
        label: "Platform withdrawal fee",
        optionA: "2%–3% of the amount withdrawn",
        optionB: "None — but the wire chain bills separately",
      },
      {
        label: "Conversion pricing",
        optionA: "Markup over mid-market (quoted at checkout)",
        optionB: "2.0%–4.2% retail spread over mid-market",
      },
      {
        label: "Correspondent cut",
        optionA: "$0 — balance withdrawals use local rails",
        optionB: "$15–$35 SHA intermediary",
      },
      { label: "$2,500 all-in cost", optionA: "≈$75–$125", optionB: "≈$65–$140" },
    ],
    comparisonTable: {
      headings: ["Cost layer", "Payoneer", "Direct bank wire"],
      rows: [
        {
          label: "Entry / withdrawal fee",
          optionA: "2%–3% for bank-account withdrawals",
          optionB: "No platform percentage — the wire route",
          winner: "b",
        },
        {
          label: "Currency conversion",
          optionA: "Up to ~1%–2% markup over the mid-market rate",
          optionB: "2.0%–4.2% retail spread over mid-market",
          winner: "a",
        },
        {
          label: "Correspondent intermediary cut",
          optionA: "$0 — local-rail balance withdrawals",
          optionB: "$15–$35 SHA per transfer",
          winner: "a",
        },
        {
          label: "Fee visibility",
          optionA: "Quoted at checkout before you confirm",
          optionB: "Only on the bank credit advice after the fact",
          winner: "a",
        },
        {
          label: "$2,500 ALL-IN cost",
          optionA: "≈$75–$125",
          optionB: "≈$65–$140",
          winner: "tie",
        },
      ],
    },
    focus: [
      "Why a bank wire's \"no fee\" facade hides the two largest cost layers: the correspondent SHA cut and the retail FX spread.",
      "Payoneer's two visible tolls — the 2–3% withdrawal fee and the conversion markup — and what they add to a real payout.",
      "The receiving-wire reimbursement credit that changes the comparison for client-paid wires.",
      "The corridor-specific calculator path that nets both bills down to a single number.",
    ],
    sections: [
      {
        heading: "What a \"bank wire\" actually costs end-to-end",
        paragraphs: [
          "A direct bank wire quotes beautifully because the client's portal shows a flat fee — often $0 on the sending side of a business card. The real bill is assembled further downstream: a $15–$35 SHA intermediary cut from the correspondent chain, a receiving-bank landing fee in several markets, and a retail FX spread of 2.0%–4.2% applied when your USD converts into the local currency.",
          "On a $2,500 invoice those downstream layers total roughly $65–$140 — the equivalent of a hidden 2.6%–5.6% rake on the whole transfer, discovered only on the credit advice.",
        ],
      },
      {
        heading: "Payoneer's two visible tolls",
        paragraphs: [
          "Payoneer prices simply: bank withdrawals bill 2%–3% of the amount, and currency conversions are quoted at checkout with a markup over the mid-market rate. There is no correspondent leg on balance withdrawals — the money comes off a local rail — so the $15–$35 SHA cut does not exist on that side of the ledger.",
          "The flip side is that the percentage applies to the principal. On the $2,500 benchmark, Payoneer's withdrawal plus markup lands an all-in cost near $75–$125; the wire lands $65–$140. The two bands genuinely overlap — which is why the next section matters.",
        ],
      },
      {
        heading: "The inbound wire credit that flips the math",
        paragraphs: [
          "One asymmetry changes the spreadsheet: when a client pays an invoice directly into a Payoneer receiving account by wire, Payoneer's plan reimburses up to $15–$25 of the inbound wire fee monthly (terms vary by plan and market — verify your account's current schedule). The client sees a clean wire, you keep the reimbursement, and the correspondent cut disappears from your side of the bill.",
          "That converts Payoneer's only flat-fee weakness — the inbound leg — into the strongest argument for it on client-paid invoices. The lingering 2–3% applies at withdrawal time, so the real number still comes down to the corridor and the amount.",
        ],
      },
      {
        heading: "Run it, don't guess it",
        paragraphs: [
          "Both rails hide part of their bill behind a different wall: the wire hides it in the correspondent chain, Payoneer reveals it at checkout but as a percentage of the whole balance. The decision rule is a two-variable calculation — bank fee schedule versus withdrawal percentage — on the corridors you actually invoice.",
          "Drop the exact amounts into the PayoutDelta calculator and read the gross-to-net waterfall: the intermediary cut, the conversion, the landing fee and the withdrawal charge all layering in a single number you can compare honestly.",
        ],
      },
    ],
    verdict: [
      "Neither rail publishes a single comparable price. The direct bank wire hides 2.6%–5.6% of downstream leakage behind its $0 facade; Payoneer quotes clearly but bills 2–3% plus a conversion markup on the whole balance.",
      "On a $2,500 invoice the honest all-in bands overlap near $65–$140 (wire) and $75–$125 (Payoneer) — so the winner is corridor- and amount-specific. Model your real schedule, then decide.",
    ],
    recommendation: {
      partnerId: "payoneer",
      headline: "Model the real deposit before you pick",
      body: "Neither bill appears on the client's PDF. Run your bank's exact wire schedule against Payoneer's 2–3% withdrawal plus markup, then check whether your plan reimburses the inbound wire fee — the calculator nets both down to one number.",
      claimCopy: "Open an account & run the comparison →",
    },
    isTechArticle: false,
  },
] as const;

/** Resolves a guide by its editorially-authored slug, or undefined. */
export function getEditorialGuideBySlug(slug: string): EditorialGuide | undefined {
  return EDITORIAL_GUIDES.find((guide) => guide.slug === slug);
}