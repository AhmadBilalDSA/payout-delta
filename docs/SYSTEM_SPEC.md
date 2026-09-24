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
- **Phase H — FX Contract Protection Addendum Generator**
  (`components/invoice/ContractAddendumModal.tsx`) — a legal-tech companion to
  the PRC letter: a "📜 Generate Contract Addendum" button sitting beside
  "Generate Bank Settlement Letter" in the studio's Banking & Clearing panel
  opens a client-only generator pre-filled from the draft (contractor name,
  client name, reference invoice #, settlement currency). Three fixed statutory
  English clauses — (A) strict OUR wire-fee allocation, (B) 3.0% currency
  devaluation buffer, (C) statutory purpose & tax-exemption affirmation — render
  as a live formal executive-typography preview on white (`#FFFFFF`, in
  contrast to the obsidian surfaces) plus a plain-text copy for pasting into
  contracts/email. Actions: "📋 Copy Legal Addendum Text" (clipboard + 2.5s
  "✓ Copied to clipboard" toast), "🖨️ Print / Download PDF Addendum" via
  `window.print()` (the `.contract-addendum` `@media print` rule hard-clips the
  print-only copy to a fixed 210×297mm box with `overflow: hidden`, mirroring
  `.prc-letter`, so one clean A4 sheet and zero trailing blank pages), and
  Escape/backdrop dismiss. Field shells persist under `payoutdelta:addendum_form`.
- **Phase H — Local-First Rate Alert Watchlist**
  (`components/RateWatchlistWidget.tsx`) — a "alert me when the rate hits X"
  widget mounted in the calculator's Tab 2 (Local Bank & Tax Settlement)
  directly below the costing waterfall. For the active corridor it shows the
  current mid-market rate (`corridor.rate`), lets the contractor pin a target
  above/below threshold, and persists alerts on-device under
  `payoutdelta:rate_alerts`. On every page load it re-checks the threshold and,
  when met, renders an emerald "🎯 Target Rate Triggered: {current} (Above/Below
  target {X})" badge; an explicit "🔔 Enable Desktop Rate Alerts" button asks the
  browser for native `Notification` permission and a fire-and-forget desktop
  notification accompanies the badge. Both the alert map and the notification
  permission hydrate through `useSyncExternalStore` (localStorage `storage`
  events + an external permission store), so thresholds stay in sync across
  tabs with zero `setState`-in-effect cascades. 100% client-side: no polling
  loop, no network, no telemetry — the static-export budget stays intact.
- **Phase S1 — Enterprise Fault Isolation & Defensive Mathematical Guards**
  (`components/ErrorBoundary.tsx` + `lib/safeMath.ts`) — a systems-reliability
  layer on top of the interactive surfaces. `lib/safeMath.ts` centralizes
  fault-tolerant arithmetic (`safeDivide`, which clamps a zero / sub-epsilon
  denominator to `Number.EPSILON` and returns a `fallback` for null / NaN /
  non-finite operands; `safeMultiply`; `clampNumber`; `sanitizeFinancialInput`
  which strips commas / symbols from user input). `lib/calculatorEngine.ts`
  routes every division through `safeDivide` and bails to a safe zero stack the
  instant `targetNetLocal <= 0` or `baseRate <= 0`; `utils/inverseMath.ts` runs
  its platform-cut and cost-percentage divisions through the same guards and
  clamps the target through `clampNumber`. Every interactive module on the
  primary routes is wrapped in `components/ErrorBoundary.tsx` — a native React
  class boundary (`getDerivedStateFromError` + `componentDidCatch`) that
  renders the obsidian "Component Fault Guard" fallback card (slate-900/90
  surface, red-500 accent, emerald ↻ Reset Module to Defaults re-mount) and
  confines a render crash to one module instead of blanking the whole route:
  `<Calculator>` (English + localized corridor pages, "Payout Calculator
  Guard"), `<InvoiceEditor>` ("Invoice Studio Guard") and the leaderboard
  index table ("Leaderboard Guard"). Zero external packages.

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
| 12 | **FX Contract Protection Addendum Generator & Local-First Rate Alert Watchlist** — legal-tech: "📜 Generate Contract Addendum" in the studio (Clauses A/B/C fixed statutory English, white executive preview + plain-text copy, single-page `.contract-addendum` PDF print); "alert me when the rate hits X" watchlist in the calculator settlement tab (mid-market base rate, above/below threshold pill, `payoutdelta:rate_alerts` localStorage, emerald triggered badge, optional native desktop notification via `useSyncExternalStore` hydration, zero setState-in-effect) | **Shipped** (this commit) |
| 13 | **AEO/LLM-Agents: llms.txt Manifests, Automated Generator & IndexNow Ping** — `public/llms.txt` + `public/llms-full.txt` auto-compiled by `scripts/generate_llms_manifest.mjs` on every `npm run build` (prebuild chain) from `data/fees.json` + the authored `data/regulatoryBanking.ts` + the `lib/swiftRoutingEngine.ts` BIC registry (Node-20/CI-safe regex extraction, no TS dynamic import): llms.txt = title/description + Guides/References/Legal link sections; llms-full.txt = the full 50-corridor table (slug → rate, benchmark intermediary cut, correspondent clearing BICs by currency group, statutory tax purpose code in "SBP 9111" / "RBI P0802" / "RESICO Art. 113-E" style, recommended direct-vs-SWIFT rail). IndexNow: `public/indexnow-key.txt` + runtime-served `public/<key>.txt` verification file, and `scripts/ping_indexnow.mjs` (`npm run indexnow`) that POSTs all 153 canonical `https://payoutdelta.com` routes to `https://api.indexnow.org/indexnow` — offline-safe (warns, never fails a deploy) | **Shipped** (this commit) |
| S1 | **Enterprise Fault Isolation & Defensive Mathematical Guards** — centralized `lib/safeMath.ts` primitives (`safeDivide` epsilon-clamps zero/sub-epsilon denominators + finite-guards, `safeMultiply`, `clampNumber`, `sanitizeFinancialInput`), every division in `lib/calculatorEngine.ts` + `utils/inverseMath.ts` wrapped through the guards with an early zero-stack bail on `targetNetLocal <= 0` / `baseRate <= 0`, and a native React class `ErrorBoundary` (obsidian "Component Fault Guard" card + ↻ reset) wired around `<Calculator>` (English + localized corridor pages), `<InvoiceEditor>` and the leaderboard index table | **Shipped** (this commit) |
| S3 | **Static CSP Headers, Client-Side XSS Sanitization & Isolated Storage Purge** — `public/_headers` Cloudflare Pages security headers (strict CSP `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` blocking camera/microphone/geolocation); zero-dependency `utils/sanitize.ts` sanitizer (`stripHtml` decodes entities + strips active markup/URIs, `sanitizeText` clamps with newline preservation) wired into every Invoice Studio input boundary (shared `Field` onChange, `correspondentNote` textarea, sync-to-invoice payloads, draft read/save paths); `lib/privacyGuard.ts` centralizes all storage under the `payoutdelta:*` namespace (`invoice_draft`, `bank_sync`, `invoice_sync`, `tax_ledger`, `rate_alerts`, `prc_letter_`, `addendum_form`, `theme`, `language`), quota-safe no-throw `readLocalStorage` / `writeLocalStorage` / `removeLocalStorage` wrappers + one-time-session legacy-key migration (`payoutdelta_draft_invoice`, `payoutdelta_banksync`, `payoutdelta_prc_letter_*`, `payoutdelta-theme`, `payoutdelta_lang` → namespaced), and `purgeAllLocalData()` counting every `payoutdelta*` entry; footer "🔒 Clear Local Cache" island (`ClearLocalCacheButton.tsx`) with aria-live count toast; no-FOUC inline bootstrap reads canonical keys with legacy fallback | **Shipped** (this commit) |
| S2 | **Static Schema SRE Gates, ISO 9362 SWIFT Validation & Financial Range Invariants** — three build-time SRE gate batteries in `scripts/test_corridors.mjs` Phase S2: (1) every authored receiving-bank `swiftCode` + correspondent-node `bic` literal (read straight off the TS source, CI-safe on Node 20) validated against ISO 9362 8/11-char syntax — no lowercase, no spaces, no malformed lengths; (2) financial range invariants across the full static surface (`baseRate > 0` finite, `0 ≤ platformFee ≤ 50%`, `0 ≤ fxSpread ≤ 15%`, `0 ≤ intermediaryUSD ≤ $100`); (3) a `buildLeaderboard()` replication asserting 50/50 corridors ranked with positive savings %, non-zero `≥ $25` wire penalties and no 10-consecutive identical cluster. Includes the corrected Bosnia & Herzegovina BIC (`RZBAB2B` → `RZBABA2S`), and a client-side no-throw `lib/schemaValidator.ts` `validateCorridorRuntime` that hydrates malformed corridor props before `Calculator.tsx` / `InvoiceEditor.tsx` render | **Shipped** (this commit) |
| S4 | **Headless Simulation & Regression Guards** — zero-dependency pure-Node stress simulator `scripts/simulate_edge_cases.mjs` that imports the shipped math engine directly from `lib/safeMath.ts` + `lib/calculatorEngine.ts` (`calculateGrossFromTargetNet`) + `utils/calculateRoute.ts` (`quoteChannel`/`computeRoute`) by stripping the TS surface in-memory and executing the fused plain-JS module via data URL (CI-safe on Node 20, no Puppeteer/Cypress); stresses USD→PKR · INR · BRL · PHP · EUR across Upwork/Fiverr/Direct × 5 rails × $1 / $1,000 / $5,000 / $50,000 boundaries in both directions (forward + inverse) plus a raw sub-clamp micro fee-consumption sweep and a degenerate guard battery. Enforced invariants (any violation → exit 1): realized take-home always `> 0` unless fully consumed by fixed fees; no generated value may be NaN/±Infinity/null/undefined (incl. the `JSON.stringify(NaN) → "null"` corruption path); effective total fee deduction inside `[0.1%, 15%]` on Direct (Standard+) and Upwork (High+), with Fiverr's 20% cut + fixed-fee-dominated micro amounts as documented exclusions. Wired as `npm run test:simulation` and the terminal stage of the unified `npm run test` suite | **Shipped** (this commit) |

---

## 6. Verification Gates (run before every commit)

```bash
npm run lint                  # 0 errors (baseline: 1 pre-existing edge-api warning)
npm run build                 # static export → ./out (prebuild re-syncs api/fees.json AND regenerates public/llms*.txt)
node scripts/generate_llms_manifest.mjs  # AEO gate — public/llms.txt + llms-full.txt recompile from live data, 0 diff
npm run test                  # unified SRE suite — lint → static corridor/JSON-LD audit → Phase S4 headless simulation, exit 0
node scripts/test_corridors.mjs  # 0 broken links, valid single @graph JSON-LD, static feed mirror, ledger/tax-ledger audits, Phase S2 schema gates (ISO 9362 BICs · financial ranges · leaderboard consistency), exit 0
npm run indexnow              # OPTIONAL deploy-time — offline-safe IndexNow ping of all 153 canonical routes (warns only, never fails)
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

**Phase F (AEO/LLM-Agents: llms.txt Manifests & IndexNow Ping Protocol)** is
delivered on top of the same roadmap as the machine-readable agent surface:
`scripts/generate_llms_manifest.mjs` (prebuild step 2 after
`sync_api_feed.mjs`) parses `data/fees.json` + the authored
`data/regulatoryBanking.ts` + the `lib/swiftRoutingEngine.ts` correspondent
registry with the same Node-20/CI-safe regex extraction `test_corridors.mjs`
uses (no dynamic `.ts` import on GitHub Actions), then writes
`public/llms.txt` (LLM-facing intro + Guides/References/Legal link sections)
and `public/llms-full.txt` (the full 50-corridor table — slug, base→target,
1 USD export rate, benchmark SHA intermediary cut, correspondent clearing BICs
per clearing-currency group, statutory tax purpose code in "SBP 9111" /
"RBI P0802" / "RESICO Art. 113-E" style, and the recommended direct-clearing
vs traditional-SWIFT rail). IndexNow: `public/indexnow-key.txt` plus the
runtime-served `public/<key>.txt` verification file, and
`scripts/ping_indexnow.mjs` (`npm run indexnow`) which derives the complete
canonical route set (11 static + 50 base + 87 long-tail + 5 localized = 153
URLs at `https://payoutdelta.com`, matching the sitemap trailing-slash
canonicals) and POSTs it to `https://api.indexnow.org/indexnow` — offline-safe
by design (warns, never exits non-zero, never takes a deploy down), and kept
out of `prebuild` so local builds don't sweep remote search caches.

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

**Phase S2 (Static Schema SRE Gates, ISO 9362 SWIFT Validation & Financial
Range Invariants)** hardens the build against silent data drift with three
static schema gate batteries added to `scripts/test_corridors.mjs`:

`auditBicSource` (S2.1) reads the literal comma-separated TypeScript corpus on
disk — the `data/regulatoryBanking.ts` `swiftCode:` literals across the 43
authored bank benches plus the 7 fallback benches, and the
`lib/swiftRoutingEngine.ts` correspondent-node `bic:` literals (USD — CHASUS33
/ CITIUS33 / IRVTUS3N / SCBLUS33, EUR — DEUTDEFF / BNPAFRPA, GBP — BARCGB22 /
MIDLGB22) — and requires every non-sentinel value to match ISO 9362
(`^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$`), rejecting lowercase characters,
spaces and malformed 1/7-character lengths while exempting the authored Local
Clearing sentinels (`""` / `-` / `—`). The gate caught and fixed the Bosnia &
Herzegovina receiving-bank BIC on the Raiffeisen Bank d.d. bench
(`RZBAB2B` → `RZBABA2S`).

The financial-range pass (S2.2) enforces the statutory bounds over the full
static surface: every corridor `rate` is finite and `> 0`; every platform
`feePercent / 100 ∈ [0, 0.50]`; every global channel and per-corridor provider
`fxSpread ∈ [0, 0.15]`; and every authored bank `intermediaryUSD` literal plus
every derived per-corridor `defaultIntermediaryCut` lies in `[0, 100]`.

`buildLeaderboardRows` (S2.3) replicates `buildLeaderboard()` from the same
`data/fees.json` corpus + first-bank intermediary map and asserts the index
claims: all 50 corridors ranked, every row's wire penalty non-zero and `≥ $25`
(realistic SWIFT leakage floor), every `savingsPct > 0`, and the ranked list
shows variance — the gate fails if any 10 consecutive corridors share
identical penalty + savings values.

The same doctrine ships to the client: `lib/schemaValidator.ts` exposes a
non-throwing `validateCorridorRuntime(corridor)` that silently hydrates any
missing or malformed corridor field to safe statutory fallbacks, and both
`components/Calculator.tsx` and `components/invoice/InvoiceEditor.tsx` run
every incoming corridor prop through it before rendering — so a stale static
payload can never take down an island.

**Phase S3 (Static CSP Headers, Client-Side XSS Sanitization & Isolated
Storage Purge)** adds a defense-in-depth hardening layer on top of that
reliability work:

`public/_headers` (S3.1) ships Cloudflare Pages security headers on every
static response: a strict `Content-Security-Policy` (`default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self'
'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:`),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy`
that blocks camera, microphone and geolocation.

`utils/sanitize.ts` (S3.2) is a zero-dependency sanitizer: `stripHtml`
decodes entities (`&amp;lt;` double-encoding included) and strips scriptable
elements, all generic tags, inline `on*` handlers and `javascript:` /
`vbscript:` / `data:` URIs; `sanitizeText(input, maxLen)` clamps length while
preserving newlines (required by the `whitespace-pre-line` invoice note). It
is wired into the Invoice Studio boundary in four places: the shared `Field`
component (every text/number/date keystroke), the `correspondentNote`
textarea, the sync-to-invoice payload merge in `applySync`, and the draft
read/save paths in `lib/invoiceTypes.ts` (`sanitizeDraft`, `loadInvoiceDraft`,
`sanitizeBankSync`, `sanitizeInvoiceSync`, `draftFromUrlParams`).

`lib/privacyGuard.ts` (S3.3) is the single owner of every storage key. All
ten are namespaced `payoutdelta:*` — `invoice_draft`, `bank_sync`,
`invoice_sync`, `tax_ledger`, `rate_alerts`, `prc_letter_` (prefix),
`addendum_form`, `whatsapp_consulting_dismissed`, `theme`, `language`. The
quota-safe no-throw `readLocalStorage` / `writeLocalStorage` /
`removeLocalStorage` wrappers run a one-time-per-session
`migrateLegacyStorage()` that remaps the shipped legacy spellings
(`payoutdelta_draft_invoice`, `payoutdelta_banksync`, `payoutdelta_prc_letter_*`
→ `payoutdelta:prc_letter_*`, `payoutdelta-theme` → `payoutdelta:theme`,
`payoutdelta_lang` → `payoutdelta:language`) onto the canonical keys without
ever overwriting a newer value, then deletes the legacy entry. All Phase
D/E/F/H/7 consumers (`ledgerEngine`, `prcLetterEngine`, `RateWatchlistWidget`,
`ContractAddendumModal`, `ThemeToggle`, `LanguageProvider`,
`WhatsAppConsultingCard`) now route through these wrappers; the no-FOUC
inline bootstrap in `app/layout.tsx` reads the canonical keys with a legacy
fallback chain.

The visitor-facing control is the footer "🔒 Clear Local Cache" island
(`components/ClearLocalCacheButton.tsx`, S3.4): `purgeAllLocalData()` removes
every localStorage key prefixed `payoutdelta` (both spellings) + the
sessionStorage dismiss marker and reports the entry count in an `aria-live`
toast — placing the on-device financial footprint under the visitor's control.

**Phase S4 (Headless Simulation & Regression Guards)** closes the loop on the
Phase B closed-form solver and the Phase S1/S2 guards with a zero-dependency
pure-Node stress simulator that runs against the exact shipping math engine —
no browser, no Puppeteer/Cypress, no bundled URL.

`scripts/simulate_edge_cases.mjs` (S4.1) builds the engine in-memory: the
Node 20 CI baseline cannot import TypeScript with `@/` aliases, so the driver
reads the three engine sources (`lib/safeMath.ts`,
`lib/calculatorEngine.ts`, `utils/calculateRoute.ts`), strips the TS surface
(comments, `import`/`import type` lines, `interface` blocks, parameter/return
/`as`-cast annotations) and fuses them into one plain-JS module executed via a
`data:text/javascript` data URL — the same `calculateGrossFromTargetNet`,
`quoteChannel`, `computeRoute`, `clampGrossUSD` and `safe*` primitives the
site ships, with the corpus read from the single source of truth
`data/fees.json`.

S4.2 stresses five high-volume corridors (USD→PKR, USD→INR, USD→BRL, USD→PHP,
USD→EUR) across three platforms (Upwork, Fiverr, Direct), five rails, and four
boundaries ($1 micro, $1,000 standard, $5,000 high, $50,000 corporate) in both
directions: a forward quote sweep (300 quotes), a raw inverse gross-up solve
using `calculateGrossFromTargetNet` (600 solves across a legacy 0/0/0 stack and
a realistic wire-$18 + landing-fee + tier-capped stack), plus a micro sweep of
375 raw identities below the $100 engine floor (where fixed fees may legitimately
consume the whole transfer) and a degenerate battery of zero/negative/NaN/
Infinity inputs that must trip the Phase S1 zero-stack guards without throwing.

S4.3 enforces the invariant set (any violation stops the suite with exit 1):
- **R1 — take-home**: realized net local currency is always `> 0`, with a
  single documented carve-out for micro amounts below the slider floor whose
  entire transfer is consumed by fixed fees.
- **R2 — finiteness**: no produced value may be NaN, ±Infinity, `null` or
  `undefined` — including the JSON serialization corruption path where
  `JSON.stringify(NaN)` silently becomes the string `"null"`.
- **R3 — fee bounds**: the effective total deduction (full fee stack, fixed +
  platform + spread leakage) stays inside `[0.1%, 15%]` on Direct (Standard+)
  and Upwork (High+); Fiverr's inherent 20% platform cut and fixed-fee-dominated
  micro amounts are documented exclusions.
- **R4 — sanitization parity**: engine-side guards must sanitize a non-finite
  `fixedFeeUSD` (e.g. `Infinity`) down to a zero fee and solve identically to
  the fee-0 input, never propagating the non-finite value into a quote.

S4.4 wires the simulator as `npm run test:simulation`, the terminal stage of the
unified `npm run test` suite (lint → static corridor/JSON-LD audit → S4
simulation) and a standalone CI target. 2,401 independent parity checks also
recompute every inverse solve through an identity relation, cross-checking the
engine numerically rather than against itself.

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
- *this commit* — **Phase H**: FX Contract Protection Addendum Generator & Local-First Rate Alert Watchlist (`components/invoice/ContractAddendumModal.tsx` + `components/RateWatchlistWidget.tsx`: "📜 Generate Contract Addendum" studio button beside "Generate Bank Settlement Letter", Clauses A/B/C fixed statutory English, live white-card executive preview, "📋 Copy Legal Addendum Text" + 2.5s toast, "🖨️ Print / Download PDF" via single-page `.contract-addendum` `@media print` hard-clip in `globals.css`, prefill from draft identity/meta, `payoutdelta:addendum_form` persistence; calculator Tab 2 `RateWatchlistWidget` under the costing waterfall — mid-market `corridor.rate`, above/below target pills, `payoutdelta:rate_alerts` localStorage keyed by corridor slug, emerald "🎯 Target Rate Triggered" badge, "🔔 Enable Desktop Rate Alerts" native notification, rendered via `useSyncExternalStore` with `storage`-event + external-permission stores (no setState-in-effect), docs).
- *this commit* — **Phase S1**: Enterprise Fault Isolation & Defensive Mathematical Guards (`lib/safeMath.ts` centralized primitives — `safeDivide` epsilon-clamps zero / sub-epsilon denominators and finite-guards null/NaN/Infinity operands with a caller `fallback`, `safeMultiply`, `clampNumber`, `sanitizeFinancialInput`; `lib/calculatorEngine.ts` routes every division through `safeDivide` + bails to the safe zero stack when `targetNetLocal <= 0` or `baseRate <= 0`, `utils/inverseMath.ts` guards platform-cut / cost-percentage divisions and clamps the target via `clampNumber`; `components/ErrorBoundary.tsx` native React class boundary (`getDerivedStateFromError` + `componentDidCatch`) rendering the obsidian "Component Fault Guard" fallback card with an emerald ↻ Reset Module to Defaults action, wired around `<Calculator>` on English + localized corridor pages ("Payout Calculator Guard"), `<InvoiceEditor>` ("Invoice Studio Guard") and the leaderboard index table ("Leaderboard Guard"), docs).
- *this commit* — **Phase S2**: Static Schema SRE Gates, ISO 9362 SWIFT Validation & Financial Range Invariants (`scripts/test_corridors.mjs` Phase S2 batteries — `auditBicSource` ISO 9362 BIC syntax gate over the literal TS receiving-bank + correspondent corpus (caught + fixed Bosnia & Herzegovina `RZBAB2B` → `RZBABA2S`), financial range invariants across rates / platform cuts / fx spreads / `intermediaryUSD` literals + derived `defaultIntermediaryCut`, and a `buildLeaderboard()` replication asserting 50/50 corridors with positive savings %, non-zero `≥ $25` wire penalties and no 10-row identical cluster; `lib/schemaValidator.ts` non-throwing `validateCorridorRuntime` hydrating malformed corridor props before `components/Calculator.tsx` + `components/invoice/InvoiceEditor.tsx` render, docs).
- *this commit* — **Phase S3**: Static CSP Headers, Client-Side XSS Sanitization & Isolated Storage Purge (`public/_headers` Cloudflare Pages security headers — strict CSP `default-src 'self'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` camera/microphone/geolocation deny; `utils/sanitize.ts` zero-dependency `stripHtml` / `sanitizeText` sanitizer wired into every Invoice Studio input boundary (`Field` onChange choke point, `correspondentNote` textarea, `applySync` payload merge, draft read/save paths); `lib/privacyGuard.ts` `payoutdelta:*` namespace registry (10 canonical keys) + quota-safe no-throw storage wrappers + one-time-session `migrateLegacyStorage()` remapping legacy spellings (`payoutdelta_draft_invoice`, `payoutdelta_banksync`, `payoutdelta_prc_letter_*`, `payoutdelta-theme`, `payoutdelta_lang`) + `purgeAllLocalData()`; `lib/ledgerEngine.ts` → `payoutdelta:tax_ledger`, `lib/prcLetterEngine.ts` → `payoutdelta:prc_letter_` prefix, `RateWatchlistWidget`/`ContractAddendumModal`/`ThemeToggle`/`LanguageProvider`/`WhatsAppConsultingCard` centralized on wrappers, `PrcLetterModal` display key + `app/layout.tsx` no-FOUC bootstrap canonical-with-legacy-fallback reads; `components/ClearLocalCacheButton.tsx` footer "🔒 Clear Local Cache" island with aria-live count toast; README + spec docs).
- *this commit* — **Phase S4**: Headless Simulation & Regression Guards (`scripts/simulate_edge_cases.mjs` zero-dependency pure-Node engine importer that strips the TS surface in-memory and fuses `lib/safeMath.ts` + `lib/calculatorEngine.ts` + `utils/calculateRoute.ts` into one plain-JS module executed via data URL — CI-safe on Node 20, no Puppeteer/Cypress; forward stress on USD→PKR/INR/BRL/PHP/EUR × Upwork/Fiverr/Direct × 5 rails × $1/$1,000/$5,000/$50,000 (300 quotes) + 600 inverse `calculateGrossFromTargetNet` closed-form solves (legacy + realistic wire/landing/tier stacks) + 375 raw micro fee-consumption identities below the $100 floor + 11-input degenerate guard battery; invariants R1 take-home > 0 (fixed-fee carve-out), R2 no NaN/±Infinity/null/undefined incl. `JSON.stringify(NaN)→"null"`, R3 effective fee stack inside [0.1%, 15%] on Direct (Standard+) / Upwork (High+, Fiverr 20% cut + micro excluded), R4 `Infinity` fixed-fee sanitization parity; 2,401 independent identity parity checks; wired as `npm run test:simulation` = terminal stage of unified `npm run test`; README + spec docs).