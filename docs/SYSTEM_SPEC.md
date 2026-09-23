# PayoutDelta — Permanent System Specification

> Single source of truth for human engineers and AI sessions. Read this before
> any structural change. It documents the executive vision, the audited
> codebase inventory, the architecture matrix, the fee-calculus identity and
> the 7-phase dominance roadmap the repository executes against.

Last reviewed: 2026 (Roadmap Phase 3). Live at
`https://ahmadbilaldsa.github.io/payout-delta/`.

---

## 1. Executive Vision

PayoutDelta is a **zero-cost, high-precision cross-border remittance,
statutory fee-auditing and invoice-compliance suite** for global freelancers,
remote contractors and export businesses.

Traditional payout tools (Wise, XE, Remitly, Payoneer) quote a mid-market rate
plus *their own* fee, then let the intermediary SWIFT chain, the local
receiving bank and the destination withholding regime silently eat the rest.
PayoutDelta answers the question none of them do:

> *After the platform cut, the wire intermediaries, the real conversion, the
> landing fee and the statutory tax — what money actually lands in my local
> bank account?*

The entire product runs **100% client-side in the reader's browser** and is
deployed as a static export to GitHub Pages at zero cloud cost, with a
Cloudflare Worker edge API layered on for developer access. Zero telemetry,
zero tracking, zero data retention, zero sign-up.

---

## 2. Codebase Audit — Permanent Inventory

### 2.1 Corridors (50 standard, `data/fees.json`)

| Slug | From → To | Country / Currency |
| --- | --- | --- |
| `usd-to-pkr` | USD → PKR | Pakistan |
| `usd-to-inr` | USD → INR | India |
| `usd-to-php` | USD → PHP | Philippines |
| `usd-to-brl` | USD → BRL | Brazil |
| `usd-to-gbp` | USD → GBP | United Kingdom |
| `usd-to-eur` | USD → EUR | Eurozone |
| `usd-to-ngn` | USD → NGN | Nigeria |
| `usd-to-bdt` | USD → BDT | Bangladesh |
| `usd-to-egp` | USD → EGP | Egypt |
| `usd-to-zar` | USD → ZAR | South Africa |
| `usd-to-vnd` | USD → VND | Vietnam |
| `usd-to-kes` | USD → KES | Kenya |
| `usd-to-idr` | USD → IDR | Indonesia |
| `usd-to-cop` | USD → COP | Colombia |
| `usd-to-try` | USD → TRY | Türkiye |
| `usd-to-mxn` | USD → MXN | Mexico |
| `usd-to-ars` | USD → ARS | Argentina |
| `usd-to-pln` | USD → PLN | Poland |
| `usd-to-ron` | USD → RON | Romania |
| `usd-to-czk` | USD → CZK | Czechia |
| `usd-to-thb` | USD → THB | Thailand |
| `usd-to-myr` | USD → MYR | Malaysia |
| `usd-to-ghs` | USD → GHS | Ghana |
| `usd-to-aed` | USD → AED | UAE |
| `usd-to-sar` | USD → SAR | Saudi Arabia |
| `usd-to-uah` | USD → UAH | Ukraine |
| `usd-to-iqd` | USD → IQD | Iraq |
| `usd-to-mad` | USD → MAD | Morocco |
| `usd-to-clp` | USD → CLP | Chile |
| `usd-to-pen` | USD → PEN | Peru |
| `usd-to-huf` | USD → HUF | Hungary |
| `usd-to-bgn` | USD → BGN | Bulgaria |
| `usd-to-rsd` | USD → RSD | Serbia |
| `usd-to-sgd` | USD → SGD | Singapore |
| `usd-to-hkd` | USD → HKD | Hong Kong |
| `usd-to-sek` | USD → SEK | Sweden |
| `usd-to-nok` | USD → NOK | Norway |
| `usd-to-dkk` | USD → DKK | Denmark |
| `usd-to-bam` | USD → BAM | Bosnia & Herzegovina |
| `usd-to-gel` | USD → GEL | Georgia |
| `usd-to-uyu` | USD → UYU | Uruguay |
| `usd-to-crc` | USD → CRC | Costa Rica |
| `usd-to-hrk` | USD → EUR | Croatia |
| `usd-to-tzs` | USD → TZS | Tanzania |
| `usd-to-ugx` | USD → UGX | Uganda |
| `usd-to-rwf` | USD → RWF | Rwanda |
| `usd-to-zmw` | USD → ZMW | Zambia |
| `usd-to-npr` | USD → NPR | Nepal |
| `usd-to-lkr` | USD → LKR | Sri Lanka |
| `usd-to-kzt` | USD → KZT | Kazakhstan |

Authoring of banks & statutory tiers (`data/regulatoryBanking.ts`): **PKR, INR,
PHP, VND, KES, IDR, COP, TRY, MXN, ARS, PLN, RON, CZK, THB, MYR, GHS, AED,
SAR, UAH, IQD, MAD, CLP, PEN, HUF, BGN, RSD, SGD, HKD are fully audited**
(28); all other corridors run the global fallback engine (standard $15–$25
intermediary band + national clearing rail).
Localized route pairs (`app/[lang]/calculator/[slug]/`): `ur→pkr`,
`hi→inr`, `fil→php`, `pt→brl`, `es→eur` (built statically; all other pairs 404
via `dynamicParams = false`).

### 2.2 Languages (7, `lib/i18n/dictionaries.ts`)

`en`, `ur`, `hi`, `fil`, `es`, `pt`, `ar`. Right-to-left: `ur`, `ar`
(Nastaliq-first font stack for Urdu). The TypeScript `UiKey` type is derived
from `enStrings`; every catalog is a `Record<UiKey, string>`, so a missing
translation is a **compile-time error**. Interpolation uses `{curly}` variables
that every language must preserve verbatim.

### 2.3 Payment platforms & channels (5 + 3)

- Platforms (percentage take): `upwork` 10%, `fiverr` 20%, `direct` 0%.
- Channels (`fixedFeeUSD` / `fxSpread`): `swift` 45 / 3.5%, `local-bank`
  0.99 / 3.5%, `wise` 2.99 / 0.45%, `payoneer` 2 / 2%, `remitly` 1.99 / 1.2%.

### 2.4 Interactive surfaces

- **Calculator** (`components/Calculator.tsx`) — platform toggle + amount input,
  live channel ranking (best verdict), sparkline, tax impact card, and the
  Phase 8/9 **Transaction Costing Widget** mounted below the tax card. Since
  Phase 7 it owns the two-rail anti-collapse grid: left rail carries the
  interactive inputs + waterfall, the right rail (sticky `lg:top-20`,
  `order-first` on mobile) hosts the server-rendered `bluf`/`faq` slot props
  around the live verdict card.
- **Target Net (net → gross) mode — Phase B gross-up solver** — flip the
  calculator into "Target Take-Home" and the verdict solves the *inverse* of
  the full waterfall: given the local amount the business must keep, it returns
  the exact USD to bill the client after the platform cut, the intermediary
  SWIFT cut, the local landing fee and the statutory withholding — all grossed
  up in closed form (`lib/calculatorEngine.ts`, `calculateGrossFromTargetNet`).
  The solver's defaults come from the first bank / first statutory tier of
  `data/regulatoryBanking.ts`. The verdict card leads with the billable USD and
  the "Lock In Rate via {channel}" partner CTA; the Tax card swaps its
  exemption toggle for a read-only grossed-up pill; and the costing widget's
  "Sync to Invoice" upserts the gross-up as the milestone line item in the
  Invoice Studio.
- **7-step liquid waterfall** (`components/TransactionCostingWidget.tsx`) —
  bank selector, statutory tier selector (purpose code chips), SWIFT slider
  ($0–$40), local clearing fee, custom surcharge/retainer slider (0–15%), and
  the live waterfall rows: Gross → Platform → Intermediary → Net converted →
  Landing fee → Withholding → **Real bank take-home**. "Sync to Invoice"
  persists bank/purpose/tier to `localStorage`.
- **Invoice Studio** (`components/invoice/InvoiceEditor.tsx` + `InvoicePreview`)
  — A4 `aspect-[210/297]` doc, `@page { size: A4 portrait; margin: 0 }`,
  print isolation (`no-print`, `#invoice-document`), logo upload via FileReader,
  per-line GST %, bank-clearing section auto-filled from the widget sync,
  statutory addendum, local persistence under `payoutdelta_draft_invoice`.
- **Phase C — 1-Click Bank PRC / FIRC Export Exemption Letter**
  (`components/compliance/PrcLetterModal.tsx` + `lib/prcLetterEngine.ts`) — on
  every audited corridor the emerald "Generate Bank PRC / Exemption Letter"
  pill under the costing waterfall opens the generator pre-filled with the
  *live* settlement snapshot (bank, SWIFT, purpose code, gross, net-in-hand,
  streamed upward by `TransactionCostingWidget.onGenerateLetter`); the Invoice
  Studio adds a "Generate Bank Settlement Letter" button pre-filled from the
  draft's banking & clearing fields. The statutory engine maps each corridor /
  purpose code onto six export jurisdictions (SBP Ch. 13 · PC 9111, RBI ·
  P0802, BSP Circular 980, LIVA Art. 29-D / RESICO 113-E, VAT Art. 28b, Global
  SWIFT fallback) and renders a formal bank letterhead — beneficiary
  particulars, governing citation, purpose code, zero-tax / exemption
  declaration and indemnity. Actions: native one-page PDF via
  `window.print()` (`@media print` clips the `.prc-letter` overlay to exactly
  210×297mm with `overflow: hidden`, so no trailing blank page escapes),
  "Copy Letter Text" (clipboard + 2.5s toast), Escape/backdrop dismiss. Form
  shells persist per corridor under `payoutdelta_prc_letter_<slug>`; the
document text is statutory-legal English and hardcoded (i18n dictionaries
   pinned to full `Record<UiKey, string>`), so no new translation keys.
- **Phase E — Year-End Remittance & Tax Ledger** (
  `components/ledger/TaxLedgerView.tsx` + `app/tax-ledger/` + `lib/ledgerEngine.ts`)
  — every invoice saved from the studio's Settlement & Realization panel lands
  in a durable on-device ledger under `payoutdelta:remittance_ledger` as a
  `RemittanceRecord` (gross billed, gross in USD via the approximate anchor
  table, platform % and SWIFT-cut USD deductions, net USD, the corridor FX
  applied at save time, converted local, landing fee, realized take-home,
  OUR/SHA wire instruction and the statutory citation). The dashboard rolls up
  KPIs (gross USD, deductible fees USD incl. landing fee converted back at the
  record's FX, realized take-home per target currency), filters by year /
  corridor, expands per-record detail, deletes with a two-step guard, wipes the
  season with a two-step confirm, downloads a BOM-prefixed RFC 4180 CSV and
  prints a dedicated white multi-page annual audit package
  (`.tax-ledger-print-area` re-shown while the dashboard `.no-print` chrome
  hides). The editor's Settlement & Realization section (toggle, corridor
  select, platform % / SWIFT cut / landing-fee fields, OUR/SHA select, live
  realization projection, "Save Invoice to Tax Ledger") is mirrored verbatim on
  the printed invoice as a **Settlement Schedule** block when
  `includeSettlementSchedule` is on (gross → net USD → converted → take-home
  rows + status pill). Line items gained ↑/↓ reordering in the studio.

### 2.5 Statutory & banking database (`data/regulatoryBanking.ts`)

- PKR — SBP Foreign Exchange Manual Ch. 13 & ITO §154A; banks MZNBPKKA,
  HABBPNKA, SCBLPKKA, ALFHPKKA; tiers PSEB 0.25% / Filer 1% / Non-Filer 2%
  (Purpose Code 9111; PRA/SRB/KPRA exemption note).
- INR — RBI AP (DIR Series) No. 46 & §194S; banks HDFCINBB, ICICINBB,
  SBININBB; tiers GST LUT zero-rated (Rule 96A CGST), §44ADA presumptive,
  1% u/s 194J/194C (Purpose Code P0802).
- PHP — BSP Circular 980 & BIR 8% freelance gross tax; banks BNORPHMM,
  BOFIPHMM, UBPHPHMM; tiers 8% flat / graduated + OSD.
- VND — SBV Circular 32/2013/TT-NHNN & Circular 111/2013 (2% IT flat rate);
  banks BFTVVNVX (Vietcombank), TCBVVNVX (Techcombank), VPBKVNVX (VPBank);
  tiers 2% export presumptive / 0% zero-rated software service.
- KES — CBK Prudential Guidelines & KRA ITO Sec 35; banks EQBLKENA (Equity),
  KCBLKENX (KCB); tiers 5% non-resident withholding / resident standard.
- IDR — Bank Indonesia Reg. 16/21/PBI & PPh 21 IT presumptive; banks CENAIDJA
  (BCA), BMRIIDJA (Bank Mandiri); tiers 5% presumptive / 0% certificate-held.
- COP — Banco de la República Circular DCIN-83 (Formulario 5) & DIAN Art. 392;
  banks COLOCOBM (Bancolombia), CAVHCOBM (Davivienda); tiers 1% retención / 0%
  export certificate.
- TRY — CBRT Circular on Invisible Transactions & Income Tax Law Art. 89/13
  (80% software earnings exemption); banks TGBATRIS (Garanti BBVA), ISBKTRIS
  (İşbank); tiers 0% software exemption / 15% indicative standard slab.
- MXN — SAT · Ley del IVA Art. 29-D & LISR Art. 113-E; banks BCMRMXMM (BBVA
  México), MENOMXMT (Banorte), BSMXMXMM (Santander México); SPEI (RESICO 1.5% /
  Actividad Empresarial 10% ISR, IVA 0% export).
- ARS — BCRA Com. A 7518 & AFIP Resolución 1415; banks GABAARBA (Galicia),
  BSARARBA (Santander Argentina), BBAAARBA (BBVA Argentina); MEP / Transferencias
  3.0 / BCRA MULC (export regime 0% to $12k USD, Monotributo Factura E 0%).
- PLN — Ministerstwo Finansów · Ustawa o zryczałtowanym podatku dochodowym &
  Ustawa o VAT; banks BPKOPLPW (PKO BP), BREXPLPW (mBank), WBKAPLPW (Santander
  Bank Polska); ELIXIR / Express ELIXIR / KIR (Ryczałt 8.5%, Podatek liniowy
  19%, VAT 0% reverse charge).
- RON — ANAF · Codul Fiscal Legea 227/2015 Art. 47 & Scutire Export Servicii;
  banks BTRLRO22 (Banca Transilvania), RNCBROBU (BCR), RZBRROBU (Raiffeisen);
  Transfond SENT / ReGIS (microenterprise IT 1% / 3%, PFA sistem real 10% +
  CAS/CASS).
- CZK — Finanční správa · Zákon č. 586/1992 Sb. § 7a; banks GIBACZPX (Česká
  spořitelna), CEKOCZPP (ČSOB), KOBACZPP (Komerční banka); ČNB CERTIS (Paušální
  daň Band 1, OSVČ 60% lump-sum base 15%).
- THB — Revenue Code Sec. 40(2)/(8) & Departmental Order Paw. 161/2566; banks
  BKKBSHTH (Bangkok Bank), KASITHBK (Kasikornbank), SICOTHBK (SCB); PromptPay /
  BAHTNET (foreign freelance remittance exemption / 3% domestic freelance WHT).
- MYR — LHDN ITA 1967 Schedule 6 & Public Ruling 5/2022; banks MBBEMYKL
  (Maybank), CIBBMYKL (CIMB), PBBEMYKL (Public Bank); RENTAS / DuitNow (FSIE,
  resident graduated Form B/BE).
- GHS — GRA Act 896 § 114 & Bank of Ghana FX repatriation rules; banks GHCBGACX
  (GCB), ECOCGHAC (Ecobank Ghana), SBICGHAC (Stanbic); GhIPSS / ACH (export
  exemption, 5% resident rate).
- AED — FTA Federal Decree-Law No. 47 of 2022; banks EBILAEAD (Emirates NBD),
  NBADAEAD (FAB), ADCBAEAA (ADCB); UAEFTS / IPI (0% individual, AED 375k Small
  Business Relief, QFZP 0%).
- SAR — ZATCA VAT Implementing Regs Art. 33 & Income Tax Law Art. 68; banks
  RJHIBARI (Al Rajhi), NCBKSARI (SNB), RIBLSARI (Riyad Bank); SARIE (Wathiqa
  0% PIT, non-resident withholding relief).
- UAH — Податковий кодекс України ст. 294 & 167 & ст. 6; banks PBANUA2X
  (PrivatBank), UNJSUAUK (Monobank); SEP / IBAN · SPRINT (ФОП Group 3 єдиний
  податок 5%, ПДФО 18% + військовий збір 1.5%, Дія City 5%).
- IQD — CBI Banking Law No. 56 of 2004 & Income Tax Law No. 113 of 1982; banks
  TRIQIQBA (Trade Bank of Iraq), RAFBIQBA (Rafidain), RDBAIQBB (Rasheed); CBI
  RTGS / Clearing (0% individual export settlement at official rate).
- MAD — DGI · Code Général des Impôts Art. 73-82; banks BCMAMAMC
  (Attijariwafa), BMCEMAMC (Bank of Africa), BCPOMAMC (Banque Populaire); RTP
  (Bank Al-Maghrib) / ACH (Auto-Entrepreneur 1%, IR barème 0–38%).
- CLP — SII · Código Tributario Art. 74 No. 6 & LIR; banks BCHICLRM (Banco de
  Chile), CREDCLRM (BCI), BSCHCLRM (Santander Chile); TEF / LCB (Boleta 10%
  retención, Global Complementario 0–40%).
- PEN — SUNAT · LIR Art. 34-A & Arts. 51-53; banks BCPLPEPL (BCP), BCONPEPL
  (BBVA Perú), BINPPEPL (Interbank); RTP / PLIN (Renta 4ta 8% retención,
  4ta/5ta progressive 0–30%).
- HUF — NAV · Szja. törvény 15% & Katv. (2012. évi CXLVII. tv.); banks OTPVHUHB
  (OTP), OKHBHUHB (K&H), GIBAHUHB (Erste); GIRO Instant / BKR (SZJA 15% flat,
  KATA lump-sum).
- BGN — НАП · ЗДДФЛ чл. 26-28 & ЗКСО; banks UNCRBGSF (UniCredit Bulbank),
  STSABGSF (DSK), FINVBGSF (Fibank); BISRTGS / Instant (10% flat, самоосигурител).
- RSD — Ministarstvo finansija & NBS · ZPDG; banks RZBSRSBG (Raiffeisen),
  DBDBRSBG (Banca Intesa), AIKBRS22 (AIK); NBS IPS / RTGS (freelance 20%,
  paušalni lump-sum).
- SGD — IRAS · Income Tax Act 1947; banks DBSSSGSG (DBS), UOVBSGSG (UOB),
  OCBCSGSG (OCBC); FAST / PayNow · MEPS+ (self-employed 0–24%, SGD 20k
  threshold 0%).
- HKD — IRD · Inland Revenue Ordinance Cap. 112; banks HSBCHKHH (HSBC),
  BKCHHKHH (BOC HK), HASEHKHH (Hang Seng); FPS instant / CHATS RTGS (salaries
  tax standard 15% / progressive 2–17%, profits tax 7.5%/15%).
- Fallback engine — SEPA, BACS/FPS, PIX, NIBSS, BEFTN, InstaPay/ACH,
  NAPAS/CVQ, PesaLink/EFT, BI-RTGS/BI-FAST, SEBRA/ACH, FAST/EFT rails.

### 2.6 Edge API & developer surface

- `edge-api/` — Cloudflare Worker "rate router", **sliding-window rate
  limiting** (60 req/min per `cf-connecting-ip`; in-memory bucket for the
  free-tier singleton). Endpoints: `/`, `/health`, `/v1/dataset`,
  `/v1/corridors`, `/v1/corridors/:slug`, `/v1/rates` (FIFO-style
  `?corridor&gross&platform`). Quote math mirrors `utils/calculateRoute.ts`.
- `app/api-access/` — developer playground page, live API explorer.

---

## 3. Architecture Matrix

| Layer | Decision | Why |
| --- | --- | --- |
| Framework | Next.js 16.3.5, App Router, `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }` | Zero-cost static hosting on GitHub Pages |
| Runtime | React 19 · TypeScript 5 (strict) · Tailwind v4 · Radix primitives | Type safety + native-feeling controls |
| Subpath | `next.config.mjs`: `basePath`/`assetPrefix = "/payout-delta"` in production (`USE_CUSTOM_DOMAIN = false`) | Correct assets on `ahmadbilaldsa.github.io/payout-delta` |
| Routes | `generateStaticParams` + `dynamicParams = false` | Exact pre-rendered HTML, no runtime negotiation |
| Translation | Client-side `LanguageProvider`; SSR is always English (hydration-safe); stored/browser locale applied post-mount; flips `document.documentElement` `lang`/`dir` | Zero-latency switching, no network |
| RTL | `[dir="rtl"]` Nastaliq-first stack + looser line-height; mono stays LTR for numerics | Urdu/Arabic legibility |
| Finance | Pure math modules (`utils/calculateRoute.ts`, `lib/invoiceTypes.ts`) with finite guards + clamps | Deterministic, SSR-safe, no server needed |
| Persistence | `localStorage` only (`payoutdelta_draft_invoice`, `payoutdelta_lang`, `payoutdelta_banksync`, `payoutdelta_prc_letter_<slug>`) | Zero-server promise |
| CI/CD | GitHub Actions `.github/workflows/deploy.yml` on `main`; nightly rates sync (`workflow_run`) | Fully automated deploys |

**Static-export hard rules:**

1. No server runtime, no middleware, no DB — any CSR feature must be
   delegation-safe (SSR English → client flip) and guard `window`.
2. `next.config.mjs` keeps `USE_CUSTOM_DOMAIN = false`; prod basePath stays
   `/payout-delta`.
3. Print path leaves `@page { size: A4 portrait; margin: 0 }` untouched; the
   invoice document owns its own padding; `.no-print` chrome is `display: none`.

---

## 4. Fee Calculus — the 7-step Waterfall Identity

**Conceptual engine identity** (Phase 1 spec form):

```
Net = ((Gross − PlatformTakeRate − IntermediarySWIFT) · (1 − FXSpread) − LocalLandingFee) · (1 − WithholdingTax)
```

**Runtime decomposition** (as implemented in `TransactionCostingWidget`):

```
platformCutUSD  = platformFeeUSD + grossUSD · (surchargePct / 100)      // 0–15% retainer
netAfterWireUSD = max(0, grossUSD − platformCutUSD − wireUSD)           // wire $0–$40
convertedLocal  = netAfterWireUSD · effectiveRate                       // effectiveRate already nets channel FX spread off mid
landedLocal     = max(0, convertedLocal − localLandingFee)              // local currency
takeHomeLocal   = max(0, landedLocal · (1 − withholdingTax))            // statutory tier rate, clamped 0–15%
```

Ranking on the calculator uses the first two terms plus channel
`fxSpread`; the widget layers the receiving side on top. Both stay in sync
because they share the same dataset and quote math.

**Phase B — the closed-form gross-up** (`lib/calculatorEngine.ts`). Given a
target net deposit in local currency, the solver walks the identity in the
backwards direction and lands exactly on the target:

```
netUsdNeeded        = (targetNetLocal / (1 − withholdingTax)) / effectiveRate
bankAndWireCutUSD   = fixedFeeUSD + wireUSD + (localLandingFee / baseRate)
usdBeforeWires      = netUsdNeeded + bankAndWireCutUSD
requiredGrossBill   = usdBeforeWires / (1 − platformRate)   // ≈ platformFee > 0 ? usdBeforeWires + platformCut
realizedTakeHome    = netUsdNeeded · effectiveRate · (1 − withholdingTax) ≡ targetNetLocal
```

With no overrides (wire $0, landing fee 0, tier 0) this reduces exactly to the
Phase 3 `gross = ((targetNetLocal / effectiveRate) + fixedFeeUSD) / (1 −
platformRate)` solver — legacy verdict numbers are bit-for-bit preserved.
`corridorTargetPresets` tiers the local slider chips by corridor rate
(≥100 → 100k/250k/500k, ≥20 → 50k/150k/300k, ≥5 → 10k/25k/50k, <1 → 1.5k/3k/5k,
else 1k/2.5k/5k). In target mode `localSliderBounds` maxes at a $20k-equivalent
cap so both rails stay inside the 100k gross clamp regardless of rate.

---

## 5. Ten-Phase Dominance Roadmap

| # | Phase | Status |
| --- | --- | --- |
| 1 | **Codebase Audit, System Memory & GitHub Showcase** — this spec + README overhaul (AEO/GEO-friendly, GitHub-search discoverable) | **Shipped** (`92f8f7f`) |
| 2 | **AEO/GEO Direct-Answer Snippets & Statutory Citations** — question-answered copy, statute-linked answers, position 0 targeting | **Shipped** (`c081371`) |
| 3 | **High-Intent Affiliate Engine, Partner Referral Cards & Trust Micro-Badges** — privacy-safe provider routing, sponsored disclosure CTAs, wire-penalty callouts | **Shipped** (`d51faba`) |
| 4 | **Programmatic Long-Tail Platform Corridors (Upwork / Fiverr / Deel)** — `data/corridors.ts` registry, pre-set calculator + platform-tailored AEO copy + search metadata, 17 static corridor routes (est. Phase 4; expanded to 32 in Phase 7, 92 in Phase 8) | **Shipped** (`6a71b4e`) |
| 5 | **Financial JSON-LD Schema Dominance** — one top-level `@graph` per corridor route (`CurrencyConversionService` + live `ExchangeRateSpecification`, per-rail `FinancialProduct`, 7-layer `HowTo` waterfall, programmatic `FAQPage` mirroring AEO Q&As, `WebApplication`, `Service`, `BreadcrumbList`) via `lib/seoSchemas.ts` | **Shipped** (`5e68dc0`) |
| 6 | **GitHub Community Engine & Developer API Documentation** — 1-click viral Reddit/X/LinkedIn audit export on the verdict card, full API reference (cURL / TypeScript / Python quick-start, response-schema & SLA panels, static feed + edge worker), structured `.github/ISSUE_TEMPLATE` forms, `CONTRIBUTING.md`, `?pair=` alias + statutory citation objects on the edge worker, static `api/fees.json` feed | **Shipped** (`9ef48f6`) |
| 7 | **UI Anti-Collapse Grid Overhaul, Currency Pair Switcher & 5 High-Volume Corridors (VND / KES / IDR / COP / TRY)** — two-rail anti-collapse corridor grid (interactive waterfall left, sticky AEO + verdict + FAQ right, `min-w-0` guards, enforced 1.8 RTL line-height), header currency capsule grouped by region + one-tap `⇄` invert with "not audited" status pill, five new fully-audited corridors with real banks/SWIFT/statutory tiers (15 base + 17 long-tail → 32 English corridor routes), corpus & long-tail audit expanded | **Shipped** (`8fc8730`) |
| 8 | **50-Country Expansion — Batches 1 & 2: 20 High-Demand International Corridors (Batch 1: MXN / ARS / PLN / RON / CZK / THB / MYR / GHS / AED / SAR; Batch 2: UAH / IQD / MAD / CLP / PEN / HUF / BGN / RSD / SGD / HKD)** — LatAm, Europe, MEA & APAC authored statutory/bank records (20 new base corridors + 40 long-tail → 35 base & 92 English corridor pages; regional currency capsule regrouped, Asia Pacific relabel), corpus & long-tail audit extended | **Shipped** (`38b4e97` + Batch 2 `6b3892a`) |
| 9 | **UI Refresh — Color Palette Modernization, Full-Width Verdict CTA & Zero-Runtime SVG Trendline Engine** — light slate canvas + obsidian dark deck tokens in `globals.css` (`:root` / `[data-theme="dark"]`, `@custom-variant dark`), unified translucent card backdrops across VerdictCard / Calculator rails / FeeBreakdownList / TransactionCostingWidget / TaxImpactCard / ComplianceGuide / FaqAccordion / InvoiceEditor / CorridorCard / SliderControls, rebalanced `Header` (emerald live-badge, ghost nav, API Access pill·CorridorSwitcher), `VerdictCard` redesigned around a full-width gradient partner CTA (provider badge pill + external-link arrow) with the `AuditExportMenu` superseded by a wrap-friendly RTL-safe `ShareUtilityTray` (Reddit / X · LinkedIn / Copy Link), trust markers, wire-penalty callout & affiliate disclosure preserved, and a new deterministic `CurrencyTrendSparkline` (slug-seeded FNV-1a → mulberry32, 30-day mean-reverting smooth-Bézier SVG with low/high/volatility readout) mounted on every English + localized corridor page | **Shipped** (`3ef8c73`) |
| 10 | **Automated Edge Cache Sync & Dynamic OpenGraph Social Engine** — edge-fresh dataset + social cards | Planned |
| 11 | **Configurable Monetization Engine, High-Ticket WhatsApp Funnel & Global Leakage Index** — monetizationConfig repo (consulting line + thresholds + canonical affiliate links + wa.me builder), `WhatsAppConsultingCard` high-ticket advisory funnel (≥$120 leakage or ≥$2,500 gross), dynamic "Save $X via {partner} →" verdict CTA + trust subtext, Remitly partner rail, `app/leaderboard/` 50-corridor leakage index (metric banner + ranked table + one-click shareable benchmark), header nav link + sitemap + `auditLeaderboard` checks | **Shipped** (this commit) |

---

## 6. Verification Gates (run before every commit)

```bash
npm run lint                  # 0 errors (baseline: 1 pre-existing edge-api warning)
npm run build                 # 159+ static routes → ./out
node scripts/test_corridors.mjs  # 0 broken links, valid single @graph JSON-LD, static feed mirror, ledger/tax-ledger audits, exit 0
```

Commit convention follows the project template
`feat(scope): summary of what actually changed`. Subpath/static-export
compatibility is a merge blocker.

**Phase B (Target Net gross-up)** is delivered on top of the ten-phase roadmap:
a closed-form 7-layer inversion solver (`lib/calculatorEngine.ts`), UI
upserts in `SliderControls` (tiered take-home presets + new label), `VerdictCard`
(to-net billable USD + realized take-home + lock-in CTA), `TaxImpactCard`
(read-only grossed-up pill + `taxFooterTargetGrossUp`), `TransactionCostingWidget`
(target anchor + milestone line-item sync), `InvoiceEditor` (no-clobber
line-item upsert), 8 new i18n keys across all 7 catalogs, and docs.

**Phase C (1-Click Bank PRC / FIRC Export Exemption Letter)** is delivered on
top of the same roadmap as a fully client-side compliance generator:
`lib/prcLetterEngine.ts` (six statutory schemes: PKR · SBP FE Manual Ch. 13 /
PC 9111, INR · RBI / P0802 + Rule 96A LUT, PHP · BSP Circular 980 / 0% VAT,
MXN · LIVA Art. 29-D + LISR 113-E RESICO, PLN · VAT Art. 28b reverse charge,
Global SWIFT MT103 fallback; `prcSchemeForSlug` corridor mapping + purpose-code
hint inference; `buildPrcLetter`/`buildPrcLetterText` pure renderers;
localStorage load/save under `payoutdelta_prc_letter_<slug>`),
`components/compliance/PrcLetterModal.tsx` (form rail + live letterhead
preview, print-only single-page `.print-area.prc-letter` copy, clipboard copy
toast, Escape/backdrop dismiss, init-on-mount so no cascade-set effect),
`TransactionCostingWidget.onGenerateLetter` streaming the live settlement
snapshot to the parent, the exact-spec emerald pill in `Calculator.tsx`, the
Invoice Studio "Generate Bank Settlement Letter" entry point, the single-page
`@media print` rules (210×297mm hard clip, `overflow: hidden`) in
`globals.css`, and docs. All new UI text is hardcoded statutory-legal English
to keep the full-`Record` i18n catalogs untouched.

**Phase D (SWIFT Intermediary Leakage & BIC Route Inspector)** is delivered on
top of the same roadmap as a deterministic, 100% client-side correspondent
routing auditor built over the 50-country statutory bank database:
`lib/swiftRoutingEngine.ts` (central correspondent registry — USD · JP Morgan
Chase NY `CHASUS33` / Citibank NY `CITIUS33` / BNY Mellon NY `IRVTUS3N` /
Standard Chartered NY `SCBLUS33`, EUR · Deutsche Bank Frankfurt `DEUTDEFF` /
BNP Paribas Paris `BNPAFRPA`, GBP · Barclays London `BARCGB22` / HSBC UK
`MIDLGB22`; `deriveSwiftRoute` clearing-path derivation
`Origin Platform/Wire → Correspondent Node → Domestic Receiving Rail`, expected
SHA intermediary cut band, settlement-speed benchmark (Instant / Same-Day
Express RTGS vs 2–3 Business Days standard telegraphic), rail-efficiency score
(A+ for modern instant RTGS down to C for manual paper advice clearing) and the
double-dip-risk flag when both the correspondent and the receiving bank assess
charges; `buildWireInstructions` 1-click client template with OUR/SHA guidance;
`buildSwiftBankIndex`/`searchSwiftBanks`/`resolveBankRoute` 50-country search
spine), `components/compliance/SwiftRouteInspector.tsx` (interactive 3-node
SVG transit diagram with deduction badge and rail badge, routing audit metrics
and the amber "double-dip" flag + emerald "no double-dip" status; inline card
for the calculator and a `SwiftRouteInspectorModal` for the Invoice Studio),
`components/compliance/SwiftAuditorTerminal.tsx` + `app/swift-auditor/page.tsx`
(a searchable standalone static route across all 50 countries' banks with
clearing-leg filters), Calculator Tab 2 sync via
`TransactionCostingWidget.onBankChange` streaming the selected bank into the
mounted inspector, an Invoice Studio "Inspect SWIFT Route" entry point that
resolves the draft's banking fields (BIC → name → currency) back to the
directory, the sitemap `/swift-auditor/` entry, and docs. All routing icons are
inline SVG — zero external packages, zero network, static-export budget intact
(50 base + 93 long-tail + 5 localized corridor pages + invoice studio +
swift-auditor + tax-ledger + legal/utility routes = 158+ static routes).

**Phase E (Multi-Milestone Invoicing & Year-End Tax Season Remittance Ledger)**
is delivered on top of the same roadmap as a fully client-side annual records
office: `lib/ledgerEngine.ts` (deterministic `RemittanceRecord` build from any
studio draft — `grandTotal` → approximate-USD anchor conversion → platform %
fee → SWIFT cut → net USD → corridor FX → landing fee → realized take-home,
OUR/SHA wire instruction and statutory citation resolution via the
`STATUTORY_CITATIONS` map, defaulting to `SWIFT MT103`; `LedgerStatus` =
Realized when a positive take-home landed at a usable rate; sanitized
localStorage persistence under `payoutdelta:remittance_ledger`;
`calculateAnnualSummary` gross / deductible-fee / per-currency realized totals;
RFC 4180 CSV with CRLF endings + UTF-8 BOM download; browser-only APIs
guarded for the static-export prerender),
`components/invoice/InvoiceEditor.tsx` (Settlement & Realization section:
`includeSettlementSchedule` toggle, corridor select, platform % / SWIFT cut USD
/ landing-fee local fields, OUR/SHA charge-instruction select, live realization
projection box and the "Save Invoice to Tax Ledger" action with a toast;
line items gained deterministic ↑/↓ reordering),
`components/invoice/InvoicePreview.tsx` (a Settlement Schedule print block
mirroring the projection — gross billed → net USD → converted → take-home with
status pill — appended to `#invoice-document` only when toggled on),
`components/ledger/TaxLedgerView.tsx` + `app/tax-ledger/page.tsx` (KPI cards,
year / corridor filters, expandable rows, two-step delete + wipe guards,
`📥 Download Tax CSV` and `🖨️ Print Annual Audit Package` over a dedicated
white multi-page `.tax-ledger-print-area` re-shown by the `@media print`
rules in `globals.css`), a header nav "Tax Ledger" link + the `taxLedger` key
across all 7 i18n catalogs, the `/tax-ledger/` sitemap entry, `auditTaxLedger`
in the corridor audit script, and docs.

**Phase F (High-Variance WhatsApp Consulting Funnel & Cloudflare OpenSEO Rank
Monitor)** is delivered on top of the same roadmap as (a) a growth funnel that
only fires inside the calculator client island when the active route actually
loses money at meaningful scale and (b) a free-tier click-to-rank tracking
engine for the site's programmatic query footprint:

`components/leads/WhatsAppConsultingCard.tsx` — the high-ticket WhatsApp
consulting funnel, a pure client island mounted in the `Calculator` audit rail
directly beneath the `VerdictCard` share tray. Its input is derived
mode-aware from the live verdicts via a `whatsappLead` memo (tab 1 forward
audits compare `worst.totalCostUSD − best.totalCostUSD` and the realized local
payout gap `best.localAmount − worst.localAmount`; target-mode audits compare
the extra gross-usd an invoice must bill, `worst.grossRequired −
best.grossRequired`, converted at the corridor rate). The card renders *only*
when the leakage clears the monetization thresholds —
`leakageUsd ≥ consultingThresholdUsd (120)` **or**
`grossPayment ≥ consultingGrossThresholdUsd (2,500)` — and shows an obsidian
VIP advisory card ("⚠️ HIGH-VALUE TRANSFER LEAKAGE DETECTED", the yearlyized
loss figure, and an emerald "💬 Book Cross-Border Rail Advisory via WhatsApp
→" action). The pre-filled client inquiry is built inside
`data/monetizationConfig.ts` (`generateWhatsAppLeadUrl`) — "Hi! I was auditing
a $X transfer on the US → PKR corridor (Upwork) via PayoutDelta. The
calculator shows I am losing ~Rs Y (Z USD) in intermediary fees and spreads.
I'd like to consult on optimizing my cross-border payout setup and export tax
structure." — into a `https://wa.me/<phone>?text=<encoded>` deep link, with
the canonical line `consultingWhatsAppNumber` (default `923041943795`) and a
`NEXT_PUBLIC_CONSULTING_WHATSAPP` build-time override (E.164 digits, digits
stripped defensively). Everything is computed in-memory (zero telemetry, no
network beyond the visitor's own WhatsApp tab) and the card dismisses per
session via a `sessionStorage` marker read through `useSyncExternalStore`
(hydration-safe, `react-hooks/set-state-in-effect`-clean, private-browsing-
`try/catch`-guarded).

`scripts/openseo_worker.js` — a zero-dependency Cloudflare Worker whose
`TOP_20_QUERIES` list tracks the top 20 programmatic calculator queries
("upwork usd to pkr fee calculator", "cheapest transfer usd to inr freelance",
…). It fetches a Google SERP endpoint (`env.SERP_API_URL`, keyed by the
`SERP_API_KEY` worker secret; waves of 4 for free-tier CPU parity), locates
`ahmadbilaldsa.github.io/payout-delta` in `organic_results`, and emits one
deterministic JSON report: `rankedQueries`, `queriesInTopTen`, `bestRank`,
`avgRank`, and a top-ten proximity `weightedScore` (Σ `11 − rank` over ranks
≤ 10). A `scheduled` cron trigger keeps it warm; `GET /` returns the same
summary for ops to curl. The committed `public/seo_rankings.json` mirror keeps
static builds green with 0 dependencies and doubles as the footer's
"Ranked #1 Real-Time Settlement Engine" transparency badge target (linked
through `next/link` so the `/payout-delta` `basePath` is applied), and
`auditOpenSeo` in the corridor audit script verifies the exported mirror +
badge wiring on every build.

**Phase G (Configurable Monetization Engine, High-Ticket WhatsApp Funnel &
Global Leakage Index)** is delivered on top of the same roadmap as a single,
build-time monetization repository plus an SEO-magnet comparison route:

`data/monetizationConfig.ts` — the single source of truth for the consulting
line (`consultingWhatsAppNumber`, default `923041943795`; env override via
`NEXT_PUBLIC_CONSULTING_WHATSAPP`), the funnel trigger thresholds
(`consultingThresholdUsd` = 120 and `consultingGrossThresholdUsd` = 2500),
canonical affiliate links (`affiliateLinks`: Wise / Payoneer / Remitly — each
with the calculator UTM attribution) and the authoritative pre-filled client
inquiry builder `generateWhatsAppLeadUrl(grossUsd, corridor, platform,
leakageUsd, leakageLocal, targetCurrency)` returning a
`https://wa.me/<phone>?text=<encoded>` deep link. `data/affiliatePartners.ts`
now inherits its canonical URLs from this repository and adds Remitly as a
sponsored partner rail; `data/config.ts`'s WhatsApp accessor delegates to it
so the number has exactly one home.

`components/leads/WhatsAppConsultingCard.tsx` — the Phase G high-ticket
advisory card (see Phase F paragraph above): mounts under the verdict card
only for `leakageUsd ≥ $120` or `grossPayment ≥ $2,500`, shows the concrete
USD + local leakage and the ~annualized cost, and books a cross-border rail
advisory through the pre-filled `wa.me` deep link, dismissable per session.

`components/VerdictCard.tsx` — the primary affiliate CTA now names the exact
USD saved vs the traditional direct wire: "Save ${savingsUsd} via
{winningProvider} →" with the trust subtext "Official partner rate ·
Regulated local clearing · Zero hidden spreads" beneath the button (computed
via the winner's effective rate so the claim matches the on-screen local
take-home delta).

`app/leaderboard/` + `components/LeaderboardShareCard.tsx` — "The Global
Cross-Border Banking Leakage Index (2026)": a static SEO-magnet page ranking
all 50 corridors from worst to best bank-wire leakage on a $1,000 gross
direct invoice (0% platform cut isolates the banking layer), with the metric
banner (Average Retail Bank Spread 3.8% vs Modern Digital Rails 0.45%), a
ranked table (Rank # · Country & Currency · Bank Wire Penalty ($ on $1k) ·
Best Digital Rail · Savings % · Direct Audit Link), and a one-click
shareable-benchmark card ("Did you know traditional banks take an average of
4.2% on international wires to Asia and LatAm? …") with Copy / X / LinkedIn
actions — all data computed at build time from `data/fees.json` with the same
quote math as the calculator, so the index and the corridor verdicts agree.
A header nav "Leaderboard" link, the `/leaderboard/` sitemap entry, and an
`auditLeaderboard` corridor check (export, metadata, single-graph JSON-LD,
ranked rows, basePath assets/links) complete the route.

---

## 7. Existing Commits That Anchor This Spec

- `92f8f7f` — Phase 1: full repo audit, system spec, open-source showcase README.
- `c081371` — Phase 2: AEO/GEO structured answer engine, statutory citation blocks, targeted audit FAQs (`aeoTemplate`, `AeoFaqSection`, `regulatoryBanking.citations`).
- `d51faba` — Phase 3: high-intent affiliate engine, partner referral cards, trust micro-badges, regulatory disclosures (`data/affiliatePartners.ts`, `VerdictCard` CTA panel + 6 i18n keys ×7 languages).
- `6a71b4e` — Phase 4: programmatic long-tail platform corridors for Upwork/Fiverr/Deel (`data/corridors.ts`, 7 extra static routes → 17 corridor pages, platform pre-set + tailored metadata/AEO copy, audit extended).
- `5e68dc0` — Phase 5: financial JSON-LD schema dominance (`lib/seoSchemas.ts` builders + `lib/aeoFaqs.ts` shared generator → one top-level `@graph` on every corridor & localized route; audit requires the full entity set + single-graph consolidation).
- `9ef48f6` — Phase 6: GitHub community engine & developer API docs (`AuditExportMenu` Reddit/X/LinkedIn exporters, expanded `/api-access` reference with cURL/TS/Python quick-start + SLA, `.github/ISSUE_TEMPLATE` forms + `CONTRIBUTING.md`, `?pair=` alias + statutory citation objects on the edge worker, static `api/fees.json` feed via `prebuild`/`sync_api_feed.mjs`).
- `8fc8730` — Phase 7: UI anti-collapse grid overhaul, currency pair switcher & 5 high-volume corridors (`Calculator.tsx` two-rail shell with `bluf`/`faq` slots, anti-collapse `min-w-0` guards across verdict/costing/BLUF/FAQ cards + 1.8 RTL line-height, `CorridorSwitcher` regional capsule + `⇄` invert + status pill, 5 fully-audited corridors in `fees.json` + `regulatoryBanking.ts` + 10 new long-tail routes in `corridors.ts`, corpus/long-tail audit extended).
- `ac5fa8b` — Phase 8 (Batch 1 of 50): 10 high-demand corridors MXN / ARS / PLN / RON / CZK / THB / MYR / GHS / AED / SAR (`data/fees.json` rates, authored statutory & bank records in `regulatoryBanking.ts`, 20 new long-tail slugs in `corridors.ts` → 25 base & 62 English corridor routes, regional `CorridorSwitcher` capsule regrouped, corpus/long-tail audit + docs totals updated).
- `38b4e97` — Phase 8 refinement: per-corridor provider fee models (Wise / Payoneer / Direct Wire fixed + FX spread) registered on all 10 Batch 1 corridors in `data/fees.json`; `regulatoryBanking.ts` upgraded to exact bank benches (3 receiving banks per corridor), statutory tiers, local rails & citations; `lib/types.ts` exposes `ProviderFee`; spec §2.5 and README refreshed.
- `6b3892a` — Phase 8 (Batch 2 of 50): 10 fully-audited high-demand corridors UAH / IQD / MAD / CLP / PEN / HUF / BGN / RSD / SGD / HKD (provider fee models in `data/fees.json`, authored statutory/bank records in `regulatoryBanking.ts` → 28 fully-audited corridors, 20 new long-tail slugs in `corridors.ts` → 35 base & 92 English corridor routes, regional currency capsule regrouped / Asia Pacific relabel, corpus/long-tail audit + docs totals updated).
- `d74a248` — i18n: dictionary, auto-locale detection, trust badges, corridor selector.
- `58d063b` — Phase 9: UI refresh — color palette modernization & unified translucent card backdrops (`globals.css` slate canvas + obsidian dark deck), full-width verdict CTA redesign + `ShareUtilityTray` in `VerdictCard` (replaces `AuditExportMenu`, RTL-safe share actions preserved), rebalanced `Header`, and the zero-runtime `CurrencyTrendSparkline` deterministic 30-day SVG trendline on every corridor & localized page.
- `7ee27f8` — Phase 10: institutional UI overhaul + Batch 3 corridor expansion — obsidian navy `#0B0F19` dark deck & institutional slate card recipe (`bg-white / dark:bg-slate-900/70` + `shadow-slate-900/5`), interactive `CurrencyTrendSparkline` cursor (crosshair + focal dot + hover readout, Day -N + deviation %), de-bloated home hub `CorridorDirectory` (search + region pills + compact tiles with 30d micro-trend), and Batch 3 of 50 (SEK / NOK / DKK / BAM / GEL / UYU / CRC / HRK → 43 base & 116 English corridor pages, authored statutory/bank records → 36 fully-audited corridors, 16 new long-tail slugs, regional capsule regrouped, corpus/long-tail audit + docs totals updated).
- `a66422c` — sitemap `/api-access/` entry.
- `4ccd72b` — regional bank directory + provincial tax selector + costing formula engine.
- `acf8c60` — statutory settlement engine, dynamic waterfall, invoice sync, UI stabilization.
- `e753011` — Phase 10 (Batch 4 of 50): final 7 corridors complete the 50-country milestone — TZS / UGX / RWF / ZMW / NPR / LKR / KZT (per-corridor provider fee models in `data/fees.json`, authored statutory/bank records in `regulatoryBanking.ts` → 43 fully-audited corridors, 14 new long-tail slugs in `corridors.ts` → 50 base & 137 English corridor routes, `CorridorSwitcher` capsule + `CorridorDirectory` region pills regrouped / Central Asia & APAC added, corpus/long-tail audit + docs totals updated).
- `ec8c06e` — Phase B: closed-form Target Net gross-up solver + invoice sync.
- `3dd1165` — Phase C: 1-click Bank PRC / FIRC statutory export exemption letter generator (`lib/prcLetterEngine.ts` six-scheme engine, `components/compliance/PrcLetterModal.tsx`, exact-spec emerald pill in `Calculator.tsx` wired to `TransactionCostingWidget`'s live `onGenerateLetter` snapshot, Invoice Studio entry point, single-page `.prc-letter` print clip in `globals.css`, docs).
- `b92f7a6` — Phase D: SWIFT Intermediary Leakage & BIC Route Inspector (`lib/swiftRoutingEngine.ts` correspondent registry + route derivation + wire-instructions template, `components/compliance/SwiftRouteInspector.tsx` 3-node SVG transit inspector + studio modal, `components/compliance/SwiftAuditorTerminal.tsx` + `app/swift-auditor/` 50-country searchable terminal, `Calculator.tsx` Tab 2 bank-sync mount, Invoice Studio "Inspect SWIFT Route", sitemap entry, docs).
- `ab8f7bf` — **Phase E**: Multi-Milestone Invoicing & Year-End Tax Season Remittance Ledger (`lib/ledgerEngine.ts` record engine + annual summary + RFC 4180 CSV, `components/ledger/TaxLedgerView.tsx` + `app/tax-ledger/` KPI/filter/CSV/print dashboard, Invoice Studio Settlement & Realization panel + "Save Invoice to Tax Ledger" + line-item reordering, InvoicePreview Settlement Schedule print block, `globals.css` `.tax-ledger-print-area` print rules, header nav + `taxLedger` key ×7 catalogs, sitemap entry, `auditTaxLedger`, docs).
- `3ef8c73` — **Phase F**: High-Variance WhatsApp Consulting Funnel & Cloudflare OpenSEO Rank Monitor (`data/config.ts` + `NEXT_PUBLIC_CONSULTING_WHATSAPP` line, `components/leads/WhatsAppLeadCta.tsx` threshold-gated VIP advisory card with `wa.me` deep-link + session dismiss, `Calculator.tsx` `whatsappLead` mode-aware memo + audit-rail mount, `scripts/openseo_worker.js` top-20 SERP rank worker, `public/seo_rankings.json` mirror, footer "Ranked #1 Real-Time Settlement Engine" badge, Phase F `auditOpenSeo` corridor checks, docs).
- *this commit* — **Phase G**: Configurable Monetization Repository, High-Ticket WhatsApp Funnel & Global Leakage Index (`data/monetizationConfig.ts` consulting line `consultingWhatsAppNumber` default `923041943795` + `NEXT_PUBLIC_CONSULTING_WHATSAPP` override, `consultingThresholdUsd` 120 / `consultingGrossThresholdUsd` 2500, canonical `affiliateLinks` Wise/Payoneer/Remitly, `generateWhatsAppLeadUrl` builder; `components/leads/WhatsAppConsultingCard.tsx` session-dismissable high-ticket advisory card mounted under the verdict card; `VerdictCard` "Save $X via {partner} →" dynamic CTA + "Official partner rate · Regulated local clearing · Zero hidden spreads" subtext; `data/affiliatePartners.ts` consolidated onto `affiliateLinks` + Remitly partner rail; `app/leaderboard/` 50-corridor "Global Cross-Border Banking Leakage Index (2026)" + `LeaderboardShareCard` shareable benchmark, header nav link, sitemap entry, Phase G `auditLeaderboard` corridor checks; `WhatsAppLeadCta.tsx` superseded and removed, docs).