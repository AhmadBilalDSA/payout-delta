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

### 2.1 Corridors (25 standard, `data/fees.json`)

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

Authoring of banks & statutory tiers (`data/regulatoryBanking.ts`): **PKR, INR,
PHP, VND, KES, IDR, COP, TRY, MXN, ARS, PLN, RON, CZK, THB, MYR, GHS, AED,
SAR are fully audited** (18); all other corridors run the global fallback
engine (standard $15–$25 intermediary band + national clearing rail).
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
- MXN — SAT CFF Art. 29 & RESICO 1.5%; banks BCMRMXMM (BBVA México),
  MENOMXMT (Banorte); SPEI.
- ARS — BCRA Comunicación A 7518 freelance export-earnings FX exemption; banks
  GABAARBA (Banco Galicia), BSARARBA (Santander); CBU / COELSA.
- PLN — Ustawa o zryczałtowanym podatku 8.5% IT rate; banks BPKOPLPW (PKO BP),
  BREXPLPW (mBank); Elixir / SORBNET2.
- RON — Codul Fiscal Art. 69 Microenterprise export; banks BTRLRO22 (Banca
  Transilvania), RNCBROBU (BCR); SENT / TransFond.
- CZK — Zákon o daních z příjmů Paušální daň; banks GIBACZPX (Česká
  spořitelna), CEKOCZPP (ČSOB); CERTIS / CZERTIS.
- THB — Revenue Code Sec. 40(2)/(8) export relief; banks BKKBSHTH (Bangkok
  Bank), KASITHBK (Kasikornbank); PromptPay / BAHTNET.
- MYR — ITA 1967 Schedule 6 foreign-source exemption; banks MBBEMYKL
  (Maybank), CIBBMYKL (CIMB); DuitNow / MEPS.
- GHS — Internal Revenue Act Sec 114 withholding; banks GHCBGACX (GCB Bank),
  ECOCGHAC (Ecobank); GhIPSS / Instant Pay (5% resident / 15% non-resident).
- AED — Federal Decree-Law No. 47 on Corporate Tax / 0% Individual; banks
  EBILAEAD (Emirates NBD), NBADAEAD (FAB); IPS / ACH.
- SAR — ZATCA WHT Reg. Art. 68; banks RJHIBARI (Al Rajhi), NCBKSARI (SNB);
  mada / SARIE (5% non-resident WHT).
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
| Persistence | `localStorage` only (`payoutdelta_draft_invoice`, `payoutdelta_lang`, `payoutdelta_banksync`) | Zero-server promise |
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

---

## 5. Nine-Phase Dominance Roadmap

| # | Phase | Status |
| --- | --- | --- |
| 1 | **Codebase Audit, System Memory & GitHub Showcase** — this spec + README overhaul (AEO/GEO-friendly, GitHub-search discoverable) | **Shipped** (`92f8f7f`) |
| 2 | **AEO/GEO Direct-Answer Snippets & Statutory Citations** — question-answered copy, statute-linked answers, position 0 targeting | **Shipped** (`c081371`) |
| 3 | **High-Intent Affiliate Engine, Partner Referral Cards & Trust Micro-Badges** — privacy-safe provider routing, sponsored disclosure CTAs, wire-penalty callouts | **Shipped** (`d51faba`) |
| 4 | **Programmatic Long-Tail Platform Corridors (Upwork / Fiverr / Deel)** — `data/corridors.ts` registry, pre-set calculator + platform-tailored AEO copy + search metadata, 17 static corridor routes (est. Phase 4; expanded to 32 in Phase 7, 62 in Phase 8) | **Shipped** (`6a71b4e`) |
| 5 | **Financial JSON-LD Schema Dominance** — one top-level `@graph` per corridor route (`CurrencyConversionService` + live `ExchangeRateSpecification`, per-rail `FinancialProduct`, 7-layer `HowTo` waterfall, programmatic `FAQPage` mirroring AEO Q&As, `WebApplication`, `Service`, `BreadcrumbList`) via `lib/seoSchemas.ts` | **Shipped** (`5e68dc0`) |
| 6 | **GitHub Community Engine & Developer API Documentation** — 1-click viral Reddit/X/LinkedIn audit export on the verdict card, full API reference (cURL / TypeScript / Python quick-start, response-schema & SLA panels, static feed + edge worker), structured `.github/ISSUE_TEMPLATE` forms, `CONTRIBUTING.md`, `?pair=` alias + statutory citation objects on the edge worker, static `api/fees.json` feed | **Shipped** (`9ef48f6`) |
| 7 | **UI Anti-Collapse Grid Overhaul, Currency Pair Switcher & 5 High-Volume Corridors (VND / KES / IDR / COP / TRY)** — two-rail anti-collapse corridor grid (interactive waterfall left, sticky AEO + verdict + FAQ right, `min-w-0` guards, enforced 1.8 RTL line-height), header currency capsule grouped by region + one-tap `⇄` invert with "not audited" status pill, five new fully-audited corridors with real banks/SWIFT/statutory tiers (15 base + 17 long-tail → 32 English corridor routes), corpus & long-tail audit expanded | **Shipped** (`8fc8730`) |
| 8 | **50-Country Expansion — Batch 1: 10 High-Demand International Corridors (MXN / ARS / PLN / RON / CZK / THB / MYR / GHS / AED / SAR)** — LatAm, Europe, MEA & APAC authored statutory/bank records (10 new base corridors + 20 long-tail → 25 base & 62 English corridor pages; regional currency capsule regrouped), corpus & long-tail audit extended | **Shipped** (`@@FEATURE_HASH@@`) |
| 9 | **Automated Edge Cache Sync & Dynamic OpenGraph Social Engine** — edge-fresh dataset + social cards | Planned |

---

## 6. Verification Gates (run before every commit)

```bash
npm run lint                  # 0 errors (baseline: 1 pre-existing edge-api warning)
npm run build                 # 81 static routes → ./out
node scripts/test_corridors.mjs  # 0 broken links, valid single @graph JSON-LD, static feed mirror, exit 0
```

Commit convention follows the project template
`feat(scope): summary of what actually changed`. Subpath/static-export
compatibility is a merge blocker.

---

## 7. Existing Commits That Anchor This Spec

- `92f8f7f` — Phase 1: full repo audit, system spec, open-source showcase README.
- `c081371` — Phase 2: AEO/GEO structured answer engine, statutory citation blocks, targeted audit FAQs (`aeoTemplate`, `AeoFaqSection`, `regulatoryBanking.citations`).
- `d51faba` — Phase 3: high-intent affiliate engine, partner referral cards, trust micro-badges, regulatory disclosures (`data/affiliatePartners.ts`, `VerdictCard` CTA panel + 6 i18n keys ×7 languages).
- `6a71b4e` — Phase 4: programmatic long-tail platform corridors for Upwork/Fiverr/Deel (`data/corridors.ts`, 7 extra static routes → 17 corridor pages, platform pre-set + tailored metadata/AEO copy, audit extended).
- `5e68dc0` — Phase 5: financial JSON-LD schema dominance (`lib/seoSchemas.ts` builders + `lib/aeoFaqs.ts` shared generator → one top-level `@graph` on every corridor & localized route; audit requires the full entity set + single-graph consolidation).
- `9ef48f6` — Phase 6: GitHub community engine & developer API docs (`AuditExportMenu` Reddit/X/LinkedIn exporters, expanded `/api-access` reference with cURL/TS/Python quick-start + SLA, `.github/ISSUE_TEMPLATE` forms + `CONTRIBUTING.md`, `?pair=` alias + statutory citation objects on the edge worker, static `api/fees.json` feed via `prebuild`/`sync_api_feed.mjs`).
- `8fc8730` — Phase 7: UI anti-collapse grid overhaul, currency pair switcher & 5 high-volume corridors (`Calculator.tsx` two-rail shell with `bluf`/`faq` slots, anti-collapse `min-w-0` guards across verdict/costing/BLUF/FAQ cards + 1.8 RTL line-height, `CorridorSwitcher` regional capsule + `⇄` invert + status pill, 5 fully-audited corridors in `fees.json` + `regulatoryBanking.ts` + 10 new long-tail routes in `corridors.ts`, corpus/long-tail audit extended).
- `@@FEATURE_HASH@@` — Phase 8 (Batch 1 of 50): 10 high-demand corridors MXN / ARS / PLN / RON / CZK / THB / MYR / GHS / AED / SAR (`data/fees.json` rates, authored statutory & bank records in `regulatoryBanking.ts`, 20 new long-tail slugs in `corridors.ts` → 25 base & 62 English corridor routes, regional `CorridorSwitcher` capsule regrouped, corpus/long-tail audit + docs totals updated).
- `d74a248` — i18n: dictionary, auto-locale detection, trust badges, corridor selector.
- `a66422c` — sitemap `/api-access/` entry.
- `4ccd72b` — regional bank directory + provincial tax selector + costing formula engine.
- `acf8c60` — statutory settlement engine, dynamic waterfall, invoice sync, UI stabilization.