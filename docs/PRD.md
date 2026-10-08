# PayoutDelta — Product Requirements Document (PRD)

> **Product**: PayoutDelta — Open Cross-Border Banking Dataset & Fee Engine
> **Version**: 1.0
> **Status**: Live on [ahmadbilaldsa.github.io/payout-delta](https://ahmadbilaldsa.github.io/payout-delta)
> **Build target**: Next.js static export · Zero-backend serverless · 100/100 Lighthouse

---

## 1. Problem Definition

### 1.1 The Hidden Cost of Cross-Border Payments

When a remote contractor invoices a client in New York and a business in Berlin wires a payment to a freelancer in Karachi, the quoted amount rarely arrives intact. Three distinct fee layers extract value without explicit disclosure:

| Fee Layer | Typical Range | Who Sees It |
| --- | --- | --- |
| Platform commission (Upwork 10%, Fiverr 20%) | 0–20% of gross | Visible on the platform dashboard |
| Intermediary banking deduct (CHASUS33, CITIUS33, etc.) | $15–$45 per SWIFT hop | Buried in the bank credit advice (CRF) |
| Retail FX spread markup (local bank conversion) | 2–5% embedded in the rate | Hidden in the "mid-market" rate quote |
| Statutory withholding tax mismatch | 0–20% by jurisdiction | Required on the tax return; unpredictable at quote time |

Traditional tools (Wise, XE, Remitly, Payoneer) expose their own fee and quote a mid-market rate—but they do not model the intermediary chain that sits between the sender's bank and the receiver's bank. The result: a $1,000 invoice commonly lands as $870–$930, with the delta untraceable to a single line item.

### 1.2 Statutory Tax Blind Spots

Remote contractors and digital exporters routinely file incorrect withholding returns because the statutory purpose code (SBP 9111, RBI P0802, BSP Circular 980) is unknown at the point of pricing. A contractor who defaults to the non-filer rate (2% in PKR, 15% in TRY) instead of the exporter exemption tier (0.25%) loses tens of dollars per transaction—silently.

### 1.3 Product Goal

Answer the question no existing tool answers:

> After the platform cut, the wire intermediaries, the real conversion rate, the landing fee and the statutory tax — what money actually lands in my local bank account?

The answer must be deterministic, auditable, and reproducible without a backend.

---

## 2. User Personas

### Persona 1: Remote Contractor / Exporter

**Name**: Aisha, 28, Lahore
**Situation**: Bills US clients via Upwork; receives USD → PKR monthly.
**Pain**: Can't tell if her bank is absorbing the SWIFT intermediary fee or if the spread is eating her payout. Withholding tax filings are a guess.
**Needs**:
- Exact net-receipt calculation before accepting a project rate.
- Confirmation that her statutory purpose code (PSEB 9111) qualifies for the 0.25% tier.
- A bank settlement letter (PRC/FIRC) she can present to her bank to prevent double-withholding.
**Workflow**: Quote amount → select platform → pick receiving bank → see real take-home → sync to invoice → generate PRC letter.

### Persona 2: SME Finance Team

**Name**: Marcus, 35, London
**Situation**: Manages contractor payouts for a 12-person remote team across 6 currencies.
**Pain**: Needs to gross-up invoices so each contractor lands a consistent net; current spreads are unpredictable month-to-month.
**Needs**:
- Reverse (target-net) solver: given a desired local take-home, return the exact gross USD to bill.
- Corridor comparison ledger sorted by net payout to pick the cheapest rail.
- A standardized settlement schedule that appears on every invoice for audit trails.
**Workflow**: Target take-home → compute gross bill → sync to invoice studio → save to annual ledger.

### Persona 3: Fintech Developer

**Name**: Priya, 30, Bangalore
**Situation**: Building a remittance comparison app; needs structured fee data and an embeddable widget.
**Pain**: No open dataset with corridor-level platform/channel/tax detail; existing APIs require sign-up and rate limits.
**Needs**:
- `/api/fees.json` with complete corridor + channel + platform data.
- `llms.txt` / `llms-full.txt` for LLM agent consumption.
- An embeddable `<iframe>` widget that shows live corridor fees on third-party sites with a backlink.
**Workflow**: Fetch `/api/fees.json` → build comparison table → drop embed iframe into marketing page.

---

## 3. Functional Requirements

### FR-1: Forward & Reverse Calculation Engine

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-1.1 | Forward mode: Given gross USD, compute net local receipt | 7-step waterfall renders: Gross → Platform Cut → Intermediary SWIFT → Net USD → FX Conversion → Landing Fee → Withholding Tax → Real Take-Home |
| FR-1.2 | Reverse mode (Target Net): Given desired local net, compute required gross USD | Closed-form inversion in O(1); `realizedTakeHomeLocal === targetNetLocal` exactly |
| FR-1.3 | Platform selection: Upwork (10%), Fiverr (20%), Direct (0%) | Toggle switches update all downstream calculations immediately |
| FR-1.4 | Channel selection: SWIFT Wire, Local Bank Transfer, Wise, Payoneer, Remitly Economy | Each channel has distinct `fixedFeeUSD` and `fxSpread` values from the dataset |
| FR-1.5 | Amount input bounded: $1 – $10,000,000 | Inputs outside range clamp to boundary with a visible warning |

### FR-2: Intermediary SWIFT Hop Cost Modeler

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-2.1 | Author per-corridor receiving bank with benchmark intermediary cut | Each corridor's `RegulatoryBank` record carries `intermediaryUSD`, `intermediaryMinUSD`, `intermediaryMaxUSD` |
| FR-2.2 | Visual hop-chain diagram: Sender → Correspondent Node → Domestic Receiving Rail | SVG-based 3-node transit diagram renders without network requests |
| FR-2.3 | Double-dip risk flag | When both the correspondent node and the receiving bank declare a charge, surface an amber warning |
| FR-2.4 | Rail-speed benchmark (Instant / Same-Day / 2–3 Business Days) | `RailSeed.window` field drives the speed badge |

### FR-3: Statutory Tax & Exemption Rules

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-3.1 | Per-jurisdiction withholding tiers with purpose codes | `StatutoryTier` array includes `rate`, `purposeCode`, `exemption` flags |
| FR-3.2 | Tier selector with labeled chips (e.g., "PSEB 0.25%", "Filer 1%", "Non-Filer 2%") | Chips render with statutory authority citations |
| FR-3.3 | PRC / FIRC export exemption letter generator | One-click modal builds formal bank letterhead with governing citation; printable as single A4 page |
| FR-3.4 | FX Contract Protection Addendum Generator | Three fixed clauses (OUR allocation, 3% devaluation buffer, statutory affirmation) renderable as legal-text PDF |

### FR-4: Corridor Comparison Ledger

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-4.1 | Sort corridors by net payout (highest first) | Leaderboard table ranks all 50 corridors on a $1,000 direct wire benchmark |
| FR-4.2 | Show wire penalty vs. best digital rail | Column: "Bank Wire Penalty ($ on $1k)" with savings % vs. Wise |
| FR-4.3 | Shareable benchmark card | One-click Reddit/X/LinkedIn export with deterministic SVG sparkline |
| FR-4.4 | Schema.org `Dataset` JSON-LD on every corridor page | Single `@graph` with `CurrencyConversionService`, `FinancialProduct`, `FAQPage` nodes |

### FR-5: Embeddable Widget Engine

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-5.1 | 50 static `/embed/<slug>/` pages pre-rendered at build time | `generateStaticParams` + `dynamicParams = false`; zero JS runtime |
| FR-5.2 | Dark-card layout with rate, intermediary cut, net take-home on $1,000 | Forced-dark theme; `header`/`footer`/`market-status` chrome suppressed via document-global CSS |
| FR-5.3 | "Verified by PayoutDelta" backlink badge links to full calculator | Click navigates to the source corridor page (basePath-aware) |
| FR-5.4 | Iframe snippet generator with one-click copy | `EmbedSnippetModal.tsx` produces `<iframe>` HTML; copy action triggers 2.5s toast |

### FR-6: Invoice Studio & Tax Ledger

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-6.1 | A4 invoice editor with per-line GST %, logo upload, bank-clearing section | Print-isolated `@page { size: A4 portrait; margin: 0 }`; draft persisted to `localStorage` |
| FR-6.2 | Settlement & Realization panel with "Save Invoice to Tax Ledger" | Builds a `RemittanceRecord` with gross USD anchor, platform %, SWIFT cut, net USD, corridor FX, landing fee, take-home, OUR/SHA instruction |
| FR-6.3 | Year-end tax ledger dashboard with KPI rollups | Filters by year/corridor; two-step delete guard; RFC 4180 CSV download; multi-page audit package print |
| FR-6.4 | Rate Alert Watchlist with desktop notification opt-in | Thresholds persisted under `payoutdelta:rate_alerts`; fire-and-forget `Notification` API; synced via `useSyncExternalStore` |

---

## 4. Non-Functional Requirements

### NFR-1: Static Export Compatibility

| ID | Requirement | Verification |
| --- | --- | --- |
| NFR-1.1 | `next export` succeeds with zero server-runtime dependencies | `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }` in `next.config.mjs` |
| NFR-1.2 | All routes pre-rendered via `generateStaticParams` + `dynamicParams = false` | 158+ static HTML files in `./out/` on every build |
| NFR-1.3 | Client-side features delegate to SSR English → hydration-safe post-mount flip | `LanguageProvider` flips `document.documentElement.lang/dir` after first paint |

### NFR-2: Performance

| ID | Metric | Target | Measurement |
| --- | --- | --- | --- |
| NFR-2.1 | First Contentful Paint (FCP) | < 0.3s | Lighthouse CI on every commit |
| NFR-2.2 | Largest Contentful Paint (LCP) | < 0.6s | Lighthouse CI |
| NFR-2.3 | Total Blocking Time (TBT) | 0 ms | Lighthouse CI (no long tasks) |
| NFR-2.4 | Interaction to Next Paint (INP) | < 50 ms per calculator tick | `useMemo`-bound engine pass; no layout thrash |

### NFR-3: Privacy & Zero Telemetry

| ID | Requirement | Enforcement |
| --- | --- | --- |
| NFR-3.1 | Zero analytics cookies, zero tracking pixels | No Google Analytics, no Mixpanel, no Sentry |
| NFR-3.2 | All persistence scoped to `payoutdelta:*` localStorage namespace | `lib/privacyGuard.ts` centralizes all reads/writes; legacy-key migration runs once per session |
| NFR-3.3 | Visitor-controlled data purge | Footer "Clear Local Cache" island calls `purgeAllLocalData()`; aria-live toast reports entry count |

### NFR-4: Accessibility

| ID | Requirement | Standard |
| --- | --- | --- |
| NFR-4.1 | Keyboard-accessible corridor quick-switcher | `tabIndex` + `onKeyDown` for ArrowDown/ArrowUp on ISO currency flags |
| NFR-4.2 | RTL support for Urdu and Arabic | `[dir="rtl"]` Nastaliq-first font stack; numeric tables stay LTR |
| NFR-4.3 | Semantic HTML landmarks on every route | `<main>`, `<nav>`, `<header>`, `<footer>` present in SSR output |

### NFR-5: Security Hardening

| ID | Requirement | Implementation |
| --- | --- | --- |
| NFR-5.1 | Strict CSP served on every static response | `public/_headers`: `default-src 'self'`; `X-Frame-Options: DENY`; `Permissions-Policy` blocks camera/mic/geolocation |
| NFR-5.2 | Zero `eval()`, zero `new Function()` | Static analysis in CI; `scripts/test_corridors.mjs` grep patterns |
| NFR-5.3 | Invoice Studio inputs sanitized at the boundary | `utils/sanitize.ts` `stripHtml()` on every keystroke via shared `Field` component |
| NFR-5.4 | SVG asset sanitization | Inline SVG only; no `<foreignObject>` with user content; no external image refs in assets |

---

## 5. Success Metrics

| Metric | Baseline | Target |
| --- | --- | --- |
| Lighthouse score (all 4 metrics) | 95–98 | 100/100 |
| Static routes pre-rendered | 50 corridors | 158+ routes (corridors + embeds + tools) |
| Corridor dataset coverage | 50 USD corridors | 50 USD + 22 EUR/GBP multi-origin = 72 base routes |
| Authored statutory banks | 28 corridors | 43 fully-audited corridors with 3 receiving banks each |
| Time-to-first-calculation (INP) | N/A | < 50 ms |
| Embed widget installs (external) | 0 | Community-driven (tracked via backlink click-through) |

---

## 6. Out of Scope (Explicit)

- Real-time rate fetching from any FX API provider (all rates are static snapshot data)
- User accounts, sign-in, or server-side session management
- Multi-currency base rails beyond USD/EUR/GBP
- Mobile-native applications (PWA is not required; browser-only)
- Payment processing or escrow (informational only; links to partner providers)
