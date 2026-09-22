/**
 * Corridor-specific editorial content (Phase 1).
 *
 * Every `/calculator/[slug]` page renders substantive, location-specific prose
 * sourced from this module — local tax considerations, domestic clearance
 * times and inbound-SWIFT rules for the receiving country. This guarantees
 * each page is a genuinely different document (> 60% unique copy) rather than
 * a thin template swap, protecting the corridor indexes from Google doorway-
 * page penalties. The copy is deliberately hedged ("check with your bank /
 * accountant") because laws and schedules change faster than a static dataset.
 *
 * ---------------------------------------------------------------------------
 * PHASE 2 — CONTENT PIPELINE
 * ---------------------------------------------------------------------------
 * Phase 2 replaces manually edited strings with a `dim_content` table
 * (corridor_id, section_key, copy, locale, reviewed_at) hydrated by an ETL:
 * one scraped/crowd-sourced fact page per country, reviewed and normalized
 * before publishing. The export-facing selectors below keep the same
 * signature so `page.tsx` doesn't care where the copy lives.
 * ---------------------------------------------------------------------------
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface CorridorContent {
  /** H2 slug-friendly headline tailored to the receiving market. */
  pageHeadline: string;
  /** Lead paragraph under the calculator (unique angle per corridor). */
  overview: string;
  /** Local tax considerations — country-specific bullets. */
  taxConsiderations: string[];
  /** Domestic clearance times for the receiving country. */
  clearanceTimes: string;
  /** Inbound SWIFT / central-bank rules for the receiving country. */
  swiftRules: string;
  /** Corridor-specific FAQ entries (also emitted as FAQPage JSON-LD). */
  faqs: FaqItem[];
}

const DEFAULT_CONTENT: CorridorContent = {
  pageHeadline: 'Withdrawal fee audit for your remittance',
  overview:
    'Compare the real, all-in cost of converting freelance earnings against the provider rate tables published in data/fees.json, then pick the channel that leaves the most local currency in your account.',
  taxConsiderations: [
    'Consult a local accountant before filing; fee data is not tax advice.',
    'Withholding and income tax treatment varies between residents and non-residents.',
  ],
  clearanceTimes:
    'Domestic clearing generally lands within one to two business days once USD leaves the sender. Verify your receiving bank limits before scheduling a large payout.',
  swiftRules:
    'Inbound international wires normally require the recipient to quote their IBAN/account number and the intermediary bank fees are commonly deducted on top of the fixed fee listed here.',
  faqs: [
    {
      q: 'How up to date are the fees?',
      a: 'The rate tables in data/fees.json carry an updatedAt timestamp and are refreshed on a scheduled cadence; the badge on this page shows the dataset revision covering the corridor.',
    },
    {
      q: 'Why does the cheapest channel change with amount?',
      a: 'Fixed flat fees amortize as the amount grows while percentage FX spreads scale linearly, so the optimum shifts depending on the payout size. The slider spans $100 to $100,000 to make the crossover visible.',
    },
  ],
};

const corridorContent: Record<string, CorridorContent> = {
  'usd-pkr': {
    pageHeadline: 'Getting paid in PKR: audit every 10% and every spread',
    overview:
      'Pakistani freelancers overwhelmingly invoice in USD and convert back through bank transfers, wallet providers and licensed money-transfer operators. Because the State Bank of Pakistan (SBP) publishes an official interbank reference while commercial desks quote narrower buy rates, the effective rate you receive can sit a hair below the headline 278.50 figure — and platform commissions are taken before any conversion happens. This page isolates those two leaks so you can see, in rupees, what a $10,000 Upwork payout actually preserves.',
    taxConsiderations: [
      'Export-of-services income falls under Pakistan\u2019s presumptive tax regime for freelancers: filers are taxed at a lower rate on export proceeds, non-filers face a higher deduction — keep your FBR tax profile active.',
      'Withholding drops are applied at source on payment service payouts (e.g., via banks and PSEB-registered gateways), so a mismatch between your declared NTN and the payer name delays credit and increases deduction.',
      'Report USD income in PKR using the SBP interbank rate for the tax year; exchange gain/loss on conversion is generally part of your taxable income calculus.',
    ],
    clearanceTimes:
      'SBP-licensed channels typically credit rupee accounts within one to two business days of the USD leaving Upwork/Fiverr. Bank-originated transfers land slower than wallet-style instant rails; on public holidays in Pakistan (and the send-side market) expect an extra business day.',
    swiftRules:
      'Inbound SWIFT for freelancers enters through SBP-regulated Authorised Dealers; demanding branches may require the "remittance purpose" narration and a valid NTN. Banks can also route intermediary charges back to your USD balance, inflating the effective cost — the "$45 fixed fee" column assumes no third-party intermediary deduction.',
    faqs: [
      {
        q: 'Do Pakistani freelancers pay tax on the full invoice or the net after platform fees?',
        a: 'Generally the taxable supply is the service income before platform commissions; the card above cannot substitute for the FBR freelance/export provisions relevant to your filer status.',
      },
      {
        q: 'Why is the local rate I receive sometimes below 278.50?',
        a: 'Provider bid rates, receives-currency conversion, and the FX spread column each shave value off the interbank reference; the effective rate column shows your true per-USD conversion.',
      },
      {
        q: 'Is remittance-period clearance different for big payouts?',
        a: 'Larger wires are more likely to trip an AML step (beneficiary verification or source-of-funds check), adding hours to the one-to-two-day window. Splitting is not advised under SBP rules.',
      },
    ],
  },
  'usd-inr': {
    pageHeadline: 'INR payouts: FEMA disclosures and the bank margin no one quotes',
    overview:
      'Indian freelancers operate inside the Foreign Exchange Management Act (FEMA), which channels export proceeds through eligible banks. The Reserve Bank of India (RBI) explicitly monitors rupee-dollar conversion margins, yet payment providers still price a shadow spread that balloons on $10,000+ invoices. With 83.40 as the reference, this audit ranks each of the five channels by the rupees actually landing in your account — before your NRE or domestic account has its say.',
    taxConsiderations: [
      'Services rendered to foreign clients are professional income; TDS under section 194J (professional/technical fees) can apply when the counterparty is an Indian entity, while most inbound exports-by-invoice are taxed on a presumptive or slab basis.',
      'Maintain a single "Sole Proprietorship / FY 2026-27" ledger and an active GST registration only if your turnover crosses the service threshold; conversion gains are recognized on the interbank rate.',
      'FEMA requires substantiation of inward remittances — keep the invoice, the bank advice and the FC-TRS/payment gateway report for at least six assessment years.',
    ],
    clearanceTimes:
      'Inward remittance credit is usually same-day via NEFT/IMPS once the USD converts, plus the day the send-side confirms withdrawal. Weekend arrivals from US rails slip to Monday-night clearance under RBI working-day rules.',
    swiftRules:
      'Inbound SWIFT requires the exporter to maintain a compliant bank mandate (Overseas/ECB-linked or NRO-driven). AD-III branches apply the RBI reference minus a margin; demanding those banks list an IBAN is a common setup stall — most Indian accounts accept a 12-digit numeric account with the 11-digit IFSC for incoming wires.',
    faqs: [
      {
        q: 'Is there a tax cost to converting USD myself?',
        a: 'No specific conversion tax, but the gain is measured at the RBI reference rate; the channel spread you lose is simply cost of conversion, not a credit.',
      },
      {
        q: 'Can I keep the payout in USD?',
        a: 'Residents generally convert export proceeds to INR unless an RBI-cleared USD account is maintained; the slider audit always shows the INR conversion assumption.',
      },
      {
        q: 'What is the biggest hidden charge for Indian freelancers?',
        a: 'The bank\u2019s conversion margin (advertising-free) plus any beneficiary-account receiving fee — often an extra 1\u20132% that the five channels here model explicitly.',
      },
    ],
  },
  'usd-php': {
    pageHeadline: 'PHP take-home math for Filipino remote workers',
    overview:
      'Filipino freelancers get paid through a dense network of banks, e-wallets and remittance operators registered with the Bangko Sentral ng Pilipinas (BSP). With the peso reference pinned at 56.80, the race between a "$2.99 Wise-style" markup and a bank wire shows up as hundreds of pesos per transfer. This corridor audit converts the full commission chain into pesos so you can compare providers honestly — including the days they hold your funds in transit.',
    taxConsiderations: [
      'Income from services rendered while you are a resident of the Philippines is generally taxable whether the client is abroad or local; foreign-source income rules differ, so confirm your residency position.',
      'Electronic wallet withdrawals (GCash/Maya) can attract cash-out fees and per-transaction caps that this page models as the fixed-fee column; large payouts almost always favor a bank account.',
      'Keep the freight-forwarding-style invoice trail: BIR examinations of online earners focus on undeclared foreign income and missing TIN-based receipts.',
    ],
    clearanceTimes:
      'BSP-Supervised Financial Institutions usually credit peso accounts the same banking day; domestic inter-bank (InstaPay) is near-real-time, while remittance aggregators add a 1\u20132 day float before the peso becomes spendable.',
    swiftRules:
      'Inbound US wires to Philippine banks arrive via correspondent routing; the receiving bank applies PESONet/IBFT domestically. "Beneficiary fees" are permitted and routinely deducted from the principal, so a quoted $45 wire can effectively cost more than the card states if the sending institution adds a correspondent leg.',
    faqs: [
      {
        q: 'Why does my peso amount vary day to day?',
        a: 'Providers reprice the peso multiple times daily; this audit fixes 56.80 as the reference so the channel comparison stays apples-to-apples until the dataset revision shifts.',
      },
      {
        q: 'Is wise-style receipt better than a local bank in the Philippines?',
        a: 'Often yes on spread, but physical delivery and cash-in limits can flip the result; slide the amount above to see the crossover per peso.',
      },
    ],
  },
  'usd-brl': {
    pageHeadline: 'Real receipts: IOF, PIX and the BRL corridor',
    overview:
      'Brazilian freelancers receiving earnings from aboard typically convert USD through licensed currency brokers or the local bank desk. Two taxes shadow every transaction — the Taxa sobre Operações de Câmbio (IOF) on FX conversion and IRRF withholding on certain foreign-earned income — so the headline number, 5.45, is never what you actually receive. This page ranks the five channel options in reais after IOF-style deductions and measures the true damage of platform commission at scale.',
    taxConsiderations: [
      'IOF is charged on foreign-exchange transactions (including money transfers), typically 0.38% for standard conversions; several providers re-quote it inside their spread, so compare gross-to-net, not list rates.',
      'Freelance income from exports of services is taxable under IRPF (resident world income) — elected regimes matter; keep the incoming TED/PIX proof of funding aligned with your declared receipts.',
      'The BCB requires conversion through an authorized operator (instituição de pagamento licenciada); the informal "blue"-style shops aren\u2019t compliant venues for reportable income.',
    ],
    clearanceTimes:
      'With PIX dominating domestic rails, the BRL leg clears in seconds once converted; the USD-to-operator float is the bottleneck — 1\u20132 banking days for a bank corridor, half a day for a licensed fintech desk.',
    swiftRules:
      'Inbound SWIFT to Brazil requires a verified CCP (Código de Identificação) plus the operator\u2019s instructions; the bank may demand source-of-funds documentation for amounts above monitoring thresholds, adding latency to large freelancer invoices.',
    faqs: [
      {
        q: 'Is IOF in the fees shown here?',
        a: 'IOF is a country-level deduction on top of the modeled fixed fee and spread; treat the verdict as a relative ranking and add IOF separately for your absolute tax planning.',
      },
      {
        q: 'When does the cheapest BRL channel change?',
        a: 'The fixed-fee/spread crossover mirrors the global behavior — wire-style channels win at very high amounts, spread-light channels win at low amounts; the slider reveals your breakeven.',
      },
    ],
  },
  'usd-gbp': {
    pageHeadline: 'Pounds in hand: Faster Payments, SWIFT and the UK audit',
    overview:
      'UK-based freelancers have the rare luxury of mature domestic plumbing: once USD lands and converts, pounds move by Faster Payment in seconds or CHAPS same-day for specials. The British market also quotes tight spreads, so the difference between channels is dominated by the platform cut and flat fees rather than FX slippage. With 0.79 as the reference, this page ranks all five withdrawal routes by the pounds that settle in your account after tax withholdings are later accounted in your Self Assessment.',
    taxConsiderations: [
      'Freelance income from foreign clients is taxable in the UK under Self Assessment; consider the Trading Allowance if your gross turnover stays below its threshold.',
      'HMRC expects all worldwide income reported in GBP; the spot rate used must be a reasonable consistent method — keep the invoice FX audit trail.',
      'If a client incorrectly deducts US withholding, you may have US withholding-relief treaty claims to pursue; don\u2019t pay foreign tax twice without reviewing the double-taxation agreement.',
    ],
    clearanceTimes:
      'Faster Payments settles almost instantly and runs nearly 24/7; CHAPS same-day for the large-wire tier; SWIFT inbound from US banks typically clears within one UK business day plus the send-side processing window.',
    swiftRules:
      'Inbound USD wires cite the UK bank\u2019s SWIFT BIC plus account/IBAN; correspondent fees often arrive pre-deducted. Many UK banks default to receiving USD in a USD account — the nicest outcome if you want to time the conversion yourself.',
    faqs: [
      {
        q: 'Should I convert immediately or hold USD in a USD account?',
        a: 'Holding dollar balances defers FX timing but leaves currency risk open; the audit assumes immediate conversion at corridor reference 0.79.',
      },
      {
        q: 'Why compare UK channels at all if spreads are tight?',
        a: 'Flat fees of $45 vs $0.99 dominate at the $100\u2013$1,000 range, where most early freelancers operate; the slider makes the crossover explicit.',
      },
    ],
  },
  'usd-eur': {
    pageHeadline: 'Eurozone payouts: SEPA overnight — or seconds — after the FX leak',
    overview:
      'Freelancers seated in the Eurozone receive client USD that must cross to EUR before any of SEPA\u2019s famous rails apply. PSD2 and MiFID-style transparency make providers publish markups, yet the effective rate still wanders from the 0.92 reference depending on the desk. Because SEPA Instant tames the domestic leg, the entire audit here comes down to conversion discipline — the fixed fee and spread you tolerate before your euro is spendable.',
    taxConsiderations: [
      'Cross-border services are generally taxable where you are established; B2B digital services often trigger the EU reverse charge with your foreign client instead of local VAT.',
      'Income is reported in EUR; the ECB/EBA reference rates are an accepted basis for converting USD income across member states.',
      'Holding receivables in foreign currency can create unrealized FX gains/losses under local accounting rules for inquartile/professionals — track them consistently.',
    ],
    clearanceTimes:
      'SEPA Credit Transfer settles the next business day; SEPA Instant in seconds. The USD-to-EUR conversion float (a few hours to one business day) plus the send-side payout window is the real scheduling cost.',
    swiftRules:
      'Inbound SWIFT USD to the SEPA layer exits through the correspondent network; banks may levy incoming-FX credit memos. Provide IBAN + BIC, and be precise on the beneficiary street address — SWIFT 2025 standards prune some unstructured fields for US-origin wires, which can stall interbank matching.',
    faqs: [
      {
        q: 'Do eurozone banks charge to receive foreign wires?',
        a: 'Frequently a small incoming-conversion credit memo is applied; the $45 vs $0.99 flat effect in the card models the same leak generically.',
      },
      {
        q: 'What matters most in the EUR corridor?',
        a: 'Spread discipline. At 0.92 reference, a 2% vs 0.45% spread on $10,000 moves ~€142 — larger than any flat fee in the dataset.',
      },
    ],
  },
  'usd-ngn': {
    pageHeadline: 'Naira reality check: the 1550 reference and who quotes it',
    overview:
      'Nigerian freelancers face the most volatile gulf in this dataset: the official reference (1550) versus the parallel street rate that informal operators quote can move materially within weeks. CBN-permitted channels convert through official (NAFEM-adjacent) windows or licensed fintech rails, each posting a slightly different naira crisis of trust. This page quantifies the honest five-way comparison at the official rate and flags the discipline required to audit FX timing instead of chasing arbitrage — neither legal nor this tool\u2019s job.',
    taxConsiderations: [
      'Self-employed licensed earners file under the personal income tax of their state; foreign inbound earnings are taxable income regardless of how it arrives.',
      'BVN and KYC documentation matter — wallet rails freeze accounts whose declared occupation doesn\u2019t match transaction narratives.',
      'Gains from currency movements on US-held funds are a reporting nuance; compute your naira income at the CBN-validated rate for the year.',
    ],
    clearanceTimes:
      'Official-window conversion plus domestic credit commonly spans one to two business days; licensed fintech wallets credit naira on the same day once USD is matched, subject to CBN liquidity windows.',
    swiftRules:
      'Incoming USD wires reach domiciliary/r-Personal accounts through CBN-introduced upgrade windows; the bank applies the reference minus margin. Intermediary bank hops on certain corridors can double-apply fees, making straight-through "$45" wires costlier — a known naira-corridor trap.',
    faqs: [
      {
        q: 'Why is the official rate far from the rate I see on the street?',
        a: 'The official closes to the CBN window price while informal operators price scarcity; this tool audits official-channel efficiency and never compares street rates.',
      },
      {
        q: 'Is it legal to use the difference between windows?',
        a: 'Exploiting parallel-rate arbitrage can breach CBN FX rules. Use only CBN-sanctioned conversion routes documented here; tax and regulatory exposure is real.',
      },
    ],
  },
  'usd-bdt': {
    pageHeadline: 'Taka transfers: Bangladesh Bank rails and the 110 reference',
    overview:
      'Bangladeshi freelancers convert USD remittances through Bangladesh Bank regulated channels — often via Payoneer-style aggregators that later sweep to a local bank account. The 110 reference rate is the official border, but aggregator receipt and local settlement each skim value the way the fee table here models. This corridor page ranks the five options in taka so the true platform-plus-conversion leak is visible before the money spends.',
    taxConsiderations: [
      'Freelance earnings from abroad are taxable income; remittance-incentive programs (e.g., cash incentive on bank-channeled inward remittance) hinge on using formal rails — document every sweep.',
      'Keep your source-of-earning attestation (e-banking, invoice) so KYC reviews at settlement don\u2019t trigger frozen-wallet incidents.',
      'Under the Digital Security and money-laundering frameworks, unexplained foreign inflows draw scrutiny; file returns that substantiate the US-origin narrative.',
    ],
    clearanceTimes:
      'Bank-credited remittances typically clear within one to two business days; aggregator-to-wallet (bKash/Nagad) sweeps are near-instant locally but add a settlement float on the USD leg.',
    swiftRules:
      'Inbound USD arrives through Bangladesh Bank authorized dealer banks for conversion to taka; wire narration citing freelancer services helps the payable clear without a compliance stall. Foreign-currency account options exist but conversion remains the default for residents.',
    faqs: [
      {
        q: 'Is there an incentive for receiving remittances in Bangladesh?',
        a: 'Yes — bank-channeled inward remittances have historically carried cash incentives; those add value on top of this fee audit but require formal rails.',
      },
      {
        q: 'Which payout size favors wallets over banks in BDT?',
        a: 'Smaller, frequent sweeps suit wallet rails for speed; large single invoices amortize bank fixed fees better — the slider shows the breakeven in taka.',
      },
    ],
  },
  'usd-egp': {
    pageHeadline: 'Egyptian pounds: CBE-compliant conversion and the 47.50 edge',
    overview:
      'Egyptian freelancers convert overseas earnings through CBE-supervised channels, where the official pound reference (47.50) governs bank-and-licensed-operator pricing while automated platforms quote app-to-app spreads. Because so much of the Egyptian market runs through mobile banking and the national instant rails, the user experience gap is smaller than the FX leak — this corridor audit makes that leak legible in pounds on every slider tick.',
    taxConsiderations: [
      'Egypt taxes residents on worldwide income; freelancer receipts require an active tax-card profile and declared turnover for the applicable service schedules.',
      'Receipts arriving in USD convert to EGP at the bank\u2019s official buy rate; reporting the conversion at CBE-published rates shields your file from revaluation disputes.',
      'KYC ("know your customer") verification at Egyptian banks is strict; registers and matching names across payment wallets avoid transfer reversals.',
    ],
    clearanceTimes:
      'The domestic EGP leg rides the national instant-payment infrastructure in near-real time; the USD-to-EGP conversion and send-side window add one banking day on standard rails.',
    swiftRules:
      'Inbound USD to Egyptian banks resolves through correspondent clearing with CBE-mandated conversion policy; beneficiary narration plus a matching commercial invoice keeps wires out of compliance holds, and bank receipt of foreign currency for services is lawful via the trading regime.',
    faqs: [
      {
        q: 'Do Egyptian banks apply an extra fee on US wires?',
        a: 'Incoming Swift entries sometimes carry an incoming-credit memo; the fixed-fee column is your lever, and the spread column their silent one.',
      },
      {
        q: 'Can I hold the USD instead of converting?',
        a: 'Some accounts allow foreign-currency receipts under CBE rules; the audit assumes immediate conversion to EGP at 47.50.',
      },
    ],
  },
  'usd-zar': {
    pageHeadline: 'Rand discipline: SARB repatriation and the 18.90 corridor',
    overview:
      'South African freelancers earning USD face the classic tightrope: undrawn foreign earnings and single discretionary allowance (SDA) rules frame what may sit offshore, while SARB-aligned rails repatriate the rest into rand through authorised dealers. At an 18.90 reference, spread and fixed fees still dwarf nothing — this page prices the five channels in rand so the repatriation decision is a financial one, not a guess.',
    taxConsiderations: [
      'Residents are taxed on worldwide income, so the USD earned offshore is already South African taxable income; declaring it in consistent rand terms (SARB-adjacent rate) keeps assessments predictable.',
      'The annual single discretionary allowance and separate foreign-investment allowances govern outward flows; inward repatriation of earnings is the compliance-clean route for freelancer proceeds.',
      'Keep invoices and the bank SWIFT advices — SARS increasingly asks online earners to substantiate foreign income against e-wallet statements.',
    ],
    clearanceTimes:
      'Rand credit follows the PayShap/eFT rails in near real time for domestic legs; the USD repatriation leg lands within one to two business days on authorised-dealer rails, plus a compliance gate on first-time recipients.',
    swiftRules:
      'Inbound wires must be marked against your repatriation narrative at an authorised dealer (Form A lineage) or the deposit may be treated as a foreign liability — a surprisingly common freelancer pitfall. Choose banks that accept USD receipts without forcing a conversion at once if you want timing control.',
    faqs: [
      {
        q: 'Must South African residents convert USD earnings?',
        a: 'No — the rules govern what may stay offshore and how earnings are declared; conversion control is yours, which makes the rate column your personal decision input.',
      },
      {
        q: 'What is the single discretionary allowance for this audit?',
        a: 'It limits outward transfers, not inward earnings; it matters if you plan to sweep funds back out in USD later.',
      },
    ],
  },
};

/**
 * Returns the editorial bundle for a corridor slug, or `null` when the slug
 * has no authored copy (callers fall back to `DEFAULT_CONTENT`, never throw).
 */
export function getCorridorContent(slug: string): CorridorContent {
  return corridorContent[slug] ?? DEFAULT_CONTENT;
}

/** Slugs that have bespoke authored content (used by the FAQ 404 grid). */
export function getAuthoredContentSlugs(): string[] {
  return Object.keys(corridorContent);
}