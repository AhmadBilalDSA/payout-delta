# PayoutDelta

**The payout auditor that tells you how much actually reaches your bank — after every hidden fee.**

> After the platform cut, the SWIFT intermediaries, the real conversion, the
> local landing fee and the statutory tax — **how much of your client's payment
> lands in your bank account?** PayoutDelta answers exactly that, for 35
> corridors, in your browser, with zero cost and zero tracking.

[![Live](https://img.shields.io/badge/Live-GitHub%20Pages-1f6feb?style=flat-square)](https://ahmadbilaldsa.github.io/payout-delta/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)](https://www.typescriptlang.org)
[![Zero-Telemetry](https://img.shields.io/badge/100%25-Client%20Side-10b981?style=flat-square)](#architecture--security)
[![Languages](https://img.shields.io/badge/7%20Languages-RTL%20ready-6366f1?style=flat-square)](lib/i18n/dictionaries.ts)
[![Cloud Cost](https://img.shields.io/badge/Cloud-USD%200-16a34a?style=flat-square)](#architecture--security)

---

## The pitch: why Wise, XE & Remitly don't give you the real number

Traditional payout tools quote a **mid-market rate** minus *their own* fee. Then
a chain of invisible costs eats the rest:

- **Intermediary correspondent SWIFT cuts** ($5–$45 per wire depend on the
  receiving bank's routing),
- **Platform fees** (Upwork 10%, Fiverr 20% — before the money even moves),
- **Local receiving / landing fees** (₹75–₹150 FIRC/e-BRC, Raast or PESONet
  clearing charges),
- **Statutory withholding taxes** (PSEB 0.25% wr. ITO §154A, RBI LUT under
  Rule 96A, BIR 8% flat on freelancers).

Wise tells you what leaves your client. **PayoutDelta tells you what lands in
your account.**

---

## Features

### 🧮 Cross-Border Payout Auditor
50 primary corridors (PKR, INR, PHP, BRL, GBP, EUR, NGN, BDT, EGP, ZAR, VND,
KES, IDR, COP, TRY, MXN, ARS, PLN, RON, CZK, THB, MYR, GHS, AED, SAR, UAH,
IQD, MAD, CLP, PEN, HUF, BGN, RSD, SGD, HKD, SEK, NOK, DKK, BAM, GEL, UYU,
CRC, HRK, TZS, UGX, RWF, ZMW, NPR, LKR, KZT) with live comparison between
**Wise, Payoneer, Direct Wire, Remitly and local bank rails** — a best-verdict
ranking of the **local currency you actually receive**, not the one quoted
mid-market. Batches 1 & 2 of the 50-country expansion added twenty
high-demand jurisdictions across LatAm (Mexico, Argentina, Chile, Peru),
Europe (Poland, Romania, Czechia, Hungary, Bulgaria, Serbia, Ukraine), MEA
(Ghana, UAE, Saudi Arabia, Iraq, Morocco) and APAC (Thailand, Malaysia,
Singapore, Hong Kong) — each with authored statutory & bank records and
**per-corridor provider fee models** (Wise / Payoneer / Direct Wire fixed
fees + FX spreads registered in `data/fees.json`). Batch 3 added the Nordic
belt and high-intent niche markets (Sweden, Norway, Denmark, Bosnia,
Georgia, Uruguay, Costa Rica, Croatia-on-EUR), and Batch 4 closed the
milestone with East & Central Africa (Tanzania, Uganda, Rwanda, Zambia),
South Asia (Nepal, Sri Lanka) and Central Asia (Kazakhstan) — 50 fully
audited corridors, every one carrying statutory tiers, real bank benches and
per-corridor provider spreads.

### 🎯 Target Net Gross-Up (Phase B)
Flip any corridor into **Target Take-Home** mode and the solver inverts the
full 7-step waterfall in closed form (`lib/calculatorEngine.ts`): given the
local amount your business must keep, it returns the exact USD to bill the
client after the platform cut, the intermediary SWIFT cut, the local landing
fee and the statutory withholding — with corridor-tiered take-home chips, a
billable-USD verdict plus realized take-home, a read-only grossed-up
withholding pill, and an Invoice Studio "Sync" that upserts the gross-up as
the milestone line item (`TaxImpactCard` swaps its exemption toggle for the
grossed-up tier; see `docs/SYSTEM_SPEC.md` §4).

### 🧭 Currency Pair Switcher & Anti-Collapse Grid
The header carries a tactile `USD → PKR` capsule grouped by receiving region
(South Asia / Asia Pacific / East Africa & EMEA / Latin America / Europe &
UK) plus a one-tap `⇄` invert — when the inverted pair isn't audited a clear
status pill offers a structured GitHub request instead of a 404. Corridor
pages now run a two-rail anti-collapse grid: interactive inputs + the 7-step
waterfall on the left, and the AEO answer box + live verdict + audit FAQ
pinned sticky on the right — `min-w-0` guards keep wide numbers from ever
compressing the layout, and RTL locales get enforced 1.8 line-height.

### 🏦 Local Banking & Compliance Directory
Real domestic banks with their exact SWIFT/BIC codes (MZNBPKKA, HABBPNKA,
HDFCINBB, BNORPHMM…), intermediary benchmarks, PRC/FIRC turnaround, and the
**governing statute per tier** — SBP Foreign Exchange Manual Ch. 13 & ITO
§154A (PKR), RBI AP (DIR Series) No. 46 + GST LUT under Rule 96A (INR), BSP
Circular 980 + BIR 8% (PHP).

### 💧 Dynamic 7-Step Costing Waterfall
A live, granular breakdown with sliders for **intermediary SWIFT cut ($0–40)**,
**local landing fee**, **custom surcharge / client retainer (0–15%)** and
statutory withholding tiers — recomputed instantly to the **real bank
take-home**.

### 📄 Invoice Studio
Professional A4 **freelance invoice generator** with per-line GST (zero-rated
export default), banking & clearing details, **statutory tax & purpose-code
addendum** (PRC 9111 / P0802 legalese), and print-isolated clean PDF export.
Calculator ↔ invoice **sync with one click**.

### 📄 1-Click Bank PRC / FIRC Export Exemption Letter (Phase C)
On every audited corridor the emerald **"Generate Bank PRC / Exemption
Letter"** pill under the costing waterfall opens a statutory bank
correspondence generator pre-filled with the **live settlement snapshot**
(receiving bank + SWIFT, purpose code, inward gross and net-in-hand). The
Invoice Studio adds a matching **"Generate Bank Settlement Letter"** entry
pre-filled from the draft's banking fields. The on-device engine
([`lib/prcLetterEngine.ts`](lib/prcLetterEngine.ts)) maps each corridor / purpose
code onto six export jurisdictions — SBP FE Manual Ch. 13 · PC 9111 (PKR),
RBI · P0802 + Rule 96A LUT (INR), BSP Circular 980 · 0% VAT (PHP), LIVA Art.
29-D + RESICO 113-E (MXN), VAT Art. 28b reverse charge (PLN), and a Global
SWIFT MT103 fallback — and renders a formal letterhead asserting the statutory
purpose code, the zero-rate / exemption regime and a sworn declaration that the
services were performed outside the tax territory. Export as **one clean A4
PDF** (native print, hard-clipped to a single page) or **copy the plain-text
letter**; shells persist per corridor under
`payoutdelta_prc_letter_<slug>`. 100% in-browser, no network, no i18n churn.

### 🔍 SWIFT Intermediary Route & BIC Inspector (Phase D)
Track exactly where every inbound bank wire leaks. The **SWIFT Intermediary
Leakage & BIC Route Inspector**
([`lib/swiftRoutingEngine.ts`](lib/swiftRoutingEngine.ts)) maps the 50-country
bank database onto its real U.S. / EU / UK correspondent clearing nodes — JP
Morgan Chase NY `CHASUS33`, Citibank NY `CITIUS33`, BNY Mellon NY `IRVTUS3N`,
Standard Chartered NY `SCBLUS33`, Deutsche Bank Frankfurt `DEUTDEFF`, BNP
Paribas Paris `BNPAFRPA`, Barclays London `BARCGB22`, HSBC UK `MIDLGB22` — and
renders the deterministic wire path **Origin Platform/Wire → Correspondent
Node → Domestic Receiving Rail** (Raast, SPEI, RTGS, TISS, CHATS, MEPS+…) as a
3-node SVG transit diagram under every calculation's settlement tab, synced to
the selected bank. Each route reports the **expected SHA intermediary cut band**,
the **settlement speed benchmark** (Instant / Same-Day Express RTGS vs 2–3
Business Days standard telegraphic), a **Rail Efficiency score** (A+ for modern
instant RTGS down to C for manual paper-advice clearing), and flags
**double-dip risk** when both the correspondent and the receiving bank assess
charges. A 1-click **"Copy Wire Instructions for Client"** button generates the
beneficiary / account / SWIFT / intermediary-BIC template with OUR-vs-SHA
charge guidance for the client email. The Invoice Studio adds **"Inspect SWIFT
Route"** on its Banking & Clearing panel, and the dedicated
[`/swift-auditor/`](app/swift-auditor) page is a searchable terminal across all
50 countries' banks — all pure inline SVG, zero external packages, zero
network.

### 🧾 Year-End Remittance & Tax Ledger (Phase E)
Every invoice saved from the studio lands in an on-device **annual tax-season
ledger** ([`lib/ledgerEngine.ts`](lib/ledgerEngine.ts)) as a durable
`RemittanceRecord` — gross billed, platform % + SWIFT-cut USD deductions, net
USD at the corridor FX applied on save, local landing fee and realized
take-home, with the OUR/SHA wire instruction and statutory citation. The
[`/tax-ledger/`](app/tax-ledger) dashboard rolls up **gross billed (USD)**,
**deductible fees (USD)** and **realized take-home per currency**, filters by
year / corridor, expands per-record detail (two-step delete), and exports a
**BOM-prefixed spreadsheet-ready CSV** or prints a dedicated **white annual
audit package**. The studio adds a Settlement & Realization panel (corridor +
OUR/SHA select, platform / SWIFT / landing-fee fields, live realization
projection, **"Save Invoice to Tax Ledger"**), an opt-in **Settlement Schedule**
print block on the invoice PDF, and ↑/↓ line-item reordering — all fully
client-side under `payoutdelta:remittance_ledger`.

### 💬 High-Ticket WhatsApp Consulting Funnel & Monetization Engine (Phase G)
When the live audit exposes high-value leakage — the on-screen loss crossing
**$120** (or the gross invoice crossing **$2,500**) — the verdict rail
surfaces an obsidian **VIP advisory card**
([`components/leads/WhatsAppConsultingCard.tsx`](components/leads/WhatsAppConsultingCard.tsx)):
"⚠️ HIGH-VALUE TRANSFER LEAKAGE DETECTED" with the concrete USD + local
leakage, a ~annualized loss figure, and an emerald **"💬 Book Cross-Border
Rail Advisory via WhatsApp →"** deep link. The pre-filled client inquiry is
built entirely in-browser from the on-screen numbers (`wa.me` deep-link, no
tracking, no telemetry) and the card dismisses per session via
`sessionStorage`. Every monetization knob now lives in
[`data/monetizationConfig.ts`](data/monetizationConfig.ts) — the consulting
line (`consultingWhatsAppNumber`, default `923041943795`), the trigger
thresholds, and the canonical affiliate links (Wise / Payoneer / Remitly) —
with a `NEXT_PUBLIC_CONSULTING_WHATSAPP` build-time override. Affiliate links
route from the verdict CTA too, which now names your exact savings:
**"Save $X via {winning provider} →"** with the trust line "Official partner
rate · Regulated local clearing · Zero hidden spreads" beneath the button.

### 🌍 Global Cross-Border Banking Leakage Index (Phase G)
The repo ships a static SEO-magnet comparison page —
[`app/leaderboard/`](app/leaderboard/page.tsx) — ranking **all 50 corridors**
from worst to best traditional **bank-wire penalty on a $1,000 direct invoice**
(with the metric banner: Average Retail Bank Spread **3.8%** vs Modern Digital
Rails **0.45%**). Every row names your **best digital rail** and the
**savings %**, links straight to that corridor's live audit, and a one-click
**shareable benchmark** card ([`components/LeaderboardShareCard.tsx`](components/LeaderboardShareCard.tsx))
packages a clean quote-ready comparison for LinkedIn / X ("Did you know
traditional banks take an average of 4.2% on international wires to Asia and
LatAm? …"). All numbers are computed at build time from `data/fees.json` with
the exact same quote engine as the calculator, so the index and your verdicts
always agree.

### 🔍 Cloudflare OpenSEO Ranking Monitor (Phase F)
The repo ships a free-tier **OpenSEO worker**
([`scripts/openseo_worker.js`](scripts/openseo_worker.js)) that tracks the top
20 programmatic calculator queries (Upwork USD→PKR fee calculator, cheapest
USD→INR freelance transfer, …) against a Google SERP endpoint and logs where
`ahmadbilaldsa.github.io/payout-delta` ranks — no KV, no dependencies, cron +
GET-sweep only. Its output mirrors the committed
[`public/seo_rankings.json`](public/seo_rankings.json) transparency snapshot;
every page's footer carries a tiny **"Ranked #1 Real-Time Settlement Engine"**
badge linking to the static rankings JSON so the static export passes with 0
runtime dependencies.

### 🌍 Global Localization
Fully translated UI in **7 languages (EN, UR, HI, FIL, ES, PT, AR)** with
automatic **RTL + Nastaliq** layout handling and zero-latency switching.

### ⚡ Developer Edge API
A Cloudflare Worker **rate router** (`edge-api/`) serving the same versioned
fee snapshot with sliding-window rate limiting — explorable live in the
[developer playground](app/api-access).

### 🔎 AEO/GEO Direct-Answer Engine
Every corridor page answers its money question **directly at the top** — "how
much of $1,000 actually lands in PKR?" — with a bolded takeaway, statutory
regulation chips (SBP Ch. 13, RBI AP DIR 46, BIR 8%) and programmatic FAQ
blocks, baked into static HTML for position-0 snippets across all 7 languages.

### 🔗 Affiliate Routing & Trust Micro-Badges
The verdict card on the winning rail now converts: a sponsored, disclosure-
carrying referral CTA (zero cost to you), `✓ Zero Hidden Markup / ✓ Regulated
Settlement / ✓ Direct Payout` pills, a "save vs. the traditional wire" penalty
callout, and an FTC-grade affiliate disclaimer — routed through a central
partner directory ([`data/affiliatePartners.ts`](data/affiliatePartners.ts)).

### 🧩 Programmatic Long-Tail Platform Corridors
137 statically exported corridor pages — every currency corridor plus
`upwork-*`, `fiverr-*` and `deel-*` permutations across all 50 base slugs
(Upwork/Fiverr cover every corridor, Deel runs PKR). Each long-tail route
pre-selects its platform (Upwork 10%, Fiverr 20%, Deel 0%), rewrites its
title/H1/AEO answer-block for that platform, and stays a plain static file
under `./out`. Corridors are declared in
[`data/corridors.ts`](data/corridors.ts) and pre-set the calculator on mount
with `?gross=` deep-link sharing intact.

### 🧬 Financial JSON-LD Schema Dominance
Every corridor route (137 English + 5 localized) emits **one** top-level
schema.org `@graph` per page: a `CurrencyConversionService` with live
`ExchangeRateSpecification`, a `FinancialProduct` per compared rail with its
fixed fee & FX-spread structure, a seven-layer `HowTo` realization waterfall,
and the programmatic `FAQPage` that mirrors the rendered AEO blocks — all
budded with `WebApplication`, `Service` and `BreadcrumbList`. Fee/rate queries
now resolve to structured entities instead of prose. Builders live in
[`lib/seoSchemas.ts`](lib/seoSchemas.ts); the Q&A shares one generator
([`lib/aeoFaqs.ts`](lib/aeoFaqs.ts)) with the on-page accordion, so
structured data never drifts from the markup.

### 📣 GitHub Community Engine & 1-Click Viral Sharing
The verdict card grows a full-width **sponsored referral CTA** on affiliate
rails (provider badge pill, gradient button, external-link arrow, FTC-grade
disclosure) and a **`ShareUtilityTray`** directly beneath it — three
wrap-friendly one-click actions that export the exact numbers on screen as a
Reddit markdown table (r/freelance, r/Upwork, r/pakistan, r/developersIndia),
an X / LinkedIn one-liner, or a shareable audit link. The [developer API
reference](app/api-access) ships interactive cURL / TypeScript / Python
snippets for the static JSON feed and the edge worker, live response-schema
views (base rates, provider spreads, statutory citation objects) and the full
developer SLA. Open-source contributions are formalized through structured
issue templates ([`new_corridor.yml`](.github/ISSUE_TEMPLATE/new_corridor.yml),
[`statutory_update.yml`](.github/ISSUE_TEMPLATE/statutory_update.yml)) and a
step-by-step [`CONTRIBUTING.md`](CONTRIBUTING.md).

### 📈 Zero-Runtime SVG Trendline Engine & UI Refresh
Every corridor page (English + all 5 localized editions) renders a
deterministic **30-day interbank realization trendline** — a pure inline SVG,
slug-seeded (FNV-1a → mulberry32) mean-reverting walk around the reference
rate with smooth Bézier smoothing, an emerald/cyan drift stroke, low / high /
annualized-volatility readouts and a live central-bank reference pill. No
canvas, no chart dependency, no hydration mismatch possible. The same pass
modernized the design tokens (`globals.css`) to a light slate canvas +
obsidian dark deck, unified every translucent card backdrop across the
calculator rails, and rebalanced the header (emerald live-badge, ghost nav,
API Access pill).

---

## Who it's for

- **Global freelancers** — Upwork, Fiverr and direct clients; see the real
  take-home before you send a milestone invoice.
- **Remote contractors & agencies** — cross-border payroll via Deel and local
  EOR rails, with clean statutory paper trail.
- **Export businesses & tax filers** — accurate FIRC / e-PRC / LUT context for
  filings and zero-rated export claims.

---

## Quickstart

```bash
git clone https://github.com/AhmadBilalDSA/payout-delta.git
cd payout-delta
npm install
npm run dev       # local dev server → http://localhost:3000
npm run build     # full static export → ./out
npm run lint      # ESLint
```

---

## Architecture & Security

- **Framework** — Next.js 16 App Router with `output: 'export'` +
  `trailingSlash: true`; deployed to GitHub Pages under `/payout-delta`.
- **100% client-side calculation** — pure TypeScript math modules, no server,
  no database, no API dependency in the app.
- **Zero telemetry, zero tracking, zero data retention** — every input stays
  on-device. The only "storage" is your browser's own `localStorage`
  (draft invoice, language preference, bank-sync, PRC letter shells, annual
  tax ledger) plus the WhatsApp advisory card's per-session `sessionStorage`
  dismiss marker — the lead deep-link itself is composed in-memory from the
  on-screen numbers and never transmitted out of the page.
- **Versioned fee dataset** — `data/fees.json` is the single source of truth;
  corridor pages, sitemap and static JSON regenerate from one snapshot.

### Repo layout at a glance

| Path | Purpose |
| --- | --- |
| `data/fees.json` | Versioned fees/rates snapshot (source of truth) |
| `data/regulatoryBanking.ts` | Statutory law & local bank clearing database |
| `data/affiliatePartners.ts` | Central partner & affiliate directory (referral routing) |
| `data/corridors.ts` | Programmatic long-tail platform corridor registry |
| `lib/seoSchemas.ts` | Dedicated financial Schema.org builders (one `@graph` per corridor) |
| `lib/aeoFaqs.ts` | Shared AEO FAQ generator (accordion + FAQPage JSON-LD) |
| `lib/prcLetterEngine.ts` | Phase C — statutory PRC / FIRC export-exemption letter engine (6 jurisdictions) |
| `components/compliance/PrcLetterModal.tsx` | Phase C — 1-click letter generator (form, live preview, print/copy, per-corridor persist) |
| `lib/swiftRoutingEngine.ts` | Phase D — SWIFT correspondent registry, route derivation, wire-instructions template & 50-country bank index |
| `components/compliance/SwiftRouteInspector.tsx` | Phase D — 3-node SVG transit inspector + Invoice Studio modal |
| `components/compliance/SwiftAuditorTerminal.tsx` | Phase D — searchable `/swift-auditor` terminal island (BIC / bank / country / clearing-leg filters) |
| `app/swift-auditor/` | Phase D — standalone static SWIFT intermediary route auditor |
| `lib/ledgerEngine.ts` | Phase E — remittance ledger engine (record math, annual summary, RFC 4180 CSV, localStorage persistence) |
| `components/ledger/TaxLedgerView.tsx` | Phase E — tax-ledger dashboard (KPIs, year/corridor filters, CSV download, printable audit package) |
| `app/tax-ledger/` | Phase E — standalone static annual remittance & tax ledger route |
| `data/monetizationConfig.ts` | Phase G — configurable monetization repo (consulting WhatsApp line + thresholds, canonical affiliate links, wa.me inquiry builder) |
| `components/leads/WhatsAppConsultingCard.tsx` | Phase G — high-ticket WhatsApp consulting funnel (≥$120 leakage / ≥$2,500 gross, session dismiss) |
| `app/leaderboard/` + `components/LeaderboardShareCard.tsx` | Phase G — global cross-border banking leakage index (50-corridor ranked table + shareable benchmark card) |
| `scripts/openseo_worker.js` | Phase F — Cloudflare OpenSEO rank monitor (top 20 queries → SERP sweep → JSON) |
| `public/seo_rankings.json` | Phase F — committed OpenSEO rankings mirror (transparency stats + footer badge target) |
| `components/TransactionCostingWidget.tsx` | 7-step liquid waterfall engine + live PRC/FIRC prefill emitter |
| `components/invoice/` | Invoice Studio (editor, preview, addendums) |
| `lib/i18n/dictionaries.ts` | 7-language dictionary (compile-checked) |
| `edge-api/` | Cloudflare Worker rate router (`?corridor` / `?pair` routes) |
| `app/api-access/` | Developer API reference, quick-start snippets & playground |
| `public/api/fees.json` | Versioned static JSON feed (mirrors `data/fees.json` via prebuild) |
| `scripts/sync_api_feed.mjs` | Static feed sync for the API portal |
| `scripts/test_corridors.mjs` | Link + JSON-LD + static-feed integrity audit |
| `.github/ISSUE_TEMPLATE/` | Structured corridor & statutory request forms |
| `CONTRIBUTING.md` | Contribution guide, gates & data conventions |

### Roadmap

| # | Phase | Status |
| --- | --- | --- |
| 1 | Codebase audit, system spec & GitHub showcase | Shipped |
| 2 | AEO/GEO direct-answer snippets & statutory citations | Shipped |
| 3 | High-intent affiliate engine, partner referral cards & trust micro-badges | Shipped |
| 4 | Programmatic long-tail platform corridors (Upwork / Fiverr / Deel) | Shipped |
| 5 | Financial JSON-LD schema dominance | Shipped |
| 6 | GitHub community engine & developer API docs | Shipped |
| 7 | UI anti-collapse grid overhaul, currency pair switcher & 5 high-volume corridors (VND / KES / IDR / COP / TRY) | Shipped |
| 8 | 50-country expansion — Batches 1 & 2: 20 high-demand corridors across LatAm, Europe, MEA & APAC (MXN / ARS / PLN / RON / CZK / THB / MYR / GHS / AED / SAR + UAH / IQD / MAD / CLP / PEN / HUF / BGN / RSD / SGD / HKD) | Shipped (`38b4e97`) |
| 9 | UI refresh — color palette modernization, full-width verdict CTA + `ShareUtilityTray`, and zero-runtime SVG trendline engine on every corridor page | Shipped |
| 10 | Automated edge cache sync & dynamic OpenGraph social engine | Planned |
| Phase B | Target Net gross-up — closed-form 7-layer inversion solver + invoice milestone sync | Shipped |
| Phase C | 1-click Bank PRC / FIRC export exemption letter generator (6 statutory jurisdictions, single-page PDF, live settlement prefill) | Shipped |
| Phase D | SWIFT intermediary leakage & BIC route inspector — correspondent routing, SHA cut band, rail efficiency score, double-dip risk, 1-click wire instructions + searchable `/swift-auditor` terminal | Shipped |
| Phase E | Multi-milestone invoicing & year-end tax season remittance ledger — Settlement & Realization panel + "Save Invoice to Tax Ledger", settlement-schedule print block, `/tax-ledger` roll-up with CSV export & printable audit package, line-item reordering | Shipped (`ab8f7bf`) |
| Phase F | High-variance WhatsApp consulting funnel — thresholds (spread ≥ $150 or ≥ 5% of gross), context-specific `wa.me` deep-link, per-session dismiss, env-configured line + Cloudflare OpenSEO rank monitor (top 20 programmatic queries, SERP sweep, static rankings mirror) with footer transparency badge | Shipped (this commit) |

---

## Contributing

Help make the take-home number trustworthy everywhere — start with the
[`CONTRIBUTING.md`](CONTRIBUTING.md) guide (setup, gates, data conventions):

- Open a structured issue for a **new corridor** or a **statutory update**
  (SBP / RBI / BIR circulars, withholding tiers, purpose codes).
- Add a **real bank credit advice** correction (SWIFT cut, landing fee,
  clearance time) on any corridor via `data/regulatoryBanking.ts`.
- Add a language, a corridor tier, or a statutory citation.
- Extend the edge API or the invoice addendum library.

PayoutDelta is informational tooling — **not financial, tax or legal advice.**
Fee tables are indicative public benchmarks, not quotes. See the [disclaimer](app/disclaimer) and [privacy policy](app/privacy-policy).