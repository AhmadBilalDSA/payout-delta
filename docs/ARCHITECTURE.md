# PayoutDelta — Architecture Specification

> **Layer model**: Presentation → Component Islands → Calculation Engine → Static Dataset
> **Deployment**: `next export` → `./out/` → GitHub Pages / Cloudflare Pages
> **Runtime footprint**: Zero. No Node server, no database, no CDN origin compute.

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Reader)                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  Header      │  │  Calculator      │  │  Invoice Studio       │  │
│  │  (static)    │  │  (island)        │  │  (island)             │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│         │                   │                       │              │
│  ┌──────▼───────┐  ┌────────▼─────────┐  ┌─────────▼───────────┐  │
│  │  Corridor    │  │  Transaction     │  │  Tax Ledger          │  │
│  │  Switcher    │  │  Costing Widget  │  │  View                │  │
│  └──────┬───────┘  └────────┬─────────┘  └─────────┬───────────┘  │
│         │                   │                       │              │
│  ┌──────▼───────────────────▼───────────────────────▼───────────┐  │
│  │              React Component Layer (SSR + Client Islands)     │  │
│  └─────────────────────────────┬─────────────────────────────────┘  │
│                                 │                                   │
│  ┌─────────────────────────────▼─────────────────────────────────┐  │
│  │              Pure Calculation Engine (`src/lib/`)              │  │
│  │  calculatorEngine.ts  ·  safeMath.ts  ·  invoiceTypes.ts       │  │
│  │  ledgerEngine.ts      ·  prcLetterEngine.ts  ·  swiftRouting  │  │
│  └─────────────────────────────┬─────────────────────────────────┘  │
│                                 │                                   │
│  ┌─────────────────────────────▼─────────────────────────────────┐  │
│  │              Static Dataset (`data/`)                          │  │
│  │  fees.json           ·  regulatoryBanking.ts  ·  corridors.ts  │  │
│  │  banksRegistry.json  ·  jurisdictions.json  ·  rails.json      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Layer

### 2.1 Schema Definitions

**Corridor** (`data/fees.json` — top-level array member):
```typescript
interface Corridor {
  id: string;                    // e.g. "usd-to-pkr"
  slug: string;                  // URL-safe route param
  baseCurrency: string;          // "USD"
  targetCurrency: string;        // "PKR"
  country: string;               // "Pakistan"
  rateSource: "scraped" | "modelled";
  baseRate: number;              // 1 USD = X PKR (mid-market snapshot)
  fxSpread?: number;             // default channel spread override
  intermediaryUSD?: number;      // benchmark SWIFT cut (fallback)
  providers?: ProviderFee[];     // per-channel override fees
  purposeCode?: string;          // e.g. "9111"
  longTailSlugs?: string[];      // alias routes (e.g. "pakistan", "pk")
}
```

**ProviderFee** (`data/fees.json` — nested inside corridor):
```typescript
interface ProviderFee {
  id: string;                    // "swift" | "wise" | "payoneer" | ...
  fixedFeeUSD: number;
  fxSpread: number;              // decimal, e.g. 0.0045
}
```

**RegulatoryBank** (`data/regulatoryBanking.ts` — per-corridor bank bench):
```typescript
interface RegulatoryBank {
  id: string;
  name: string;
  displayName: string;
  swiftCode: string;             // ISO 9362, e.g. "MZNBPKKA"
  intermediaryUSD: number;
  intermediaryMinUSD: number;
  intermediaryMaxUSD: number;
  localFeeDefault: number;       // in destination currency
  speed: string;                 // "Fast" | "Standard"
  clearance: string;             // "T+1 (business day)"
  localCurrency: string;
  rail?: RailSeed;
}
```

**StatutoryTier** (`data/regulatoryBanking.ts` — per-corridor):
```typescript
interface StatutoryTier {
  id: string;
  name: string;                  // "PSEB Registered IT Exporter"
  authority: string;             // "ITO Section 154A"
  rate: number;                  // decimal, e.g. 0.0025
  purposeCode?: string;
  exemption?: boolean;
  note: string;
}
```

**RailSeed** (`data/regulatoryBanking.ts`):
```typescript
interface RailSeed {
  rail: string;                  // "Raast", "IMPS", "InstaPay"
  operator: string;              // "State Bank of Pakistan"
  instant: boolean;
  window: string;                // "T+0 (seconds)" | "T+1 (business day)"
  settlementClass: "IRG" | "RTH"; // irrevocable-gross vs retail-deferred
}
```

### 2.2 File Layout

```
data/
  fees.json              # 50 corridors × platforms × channels (primary source of truth)
  regulatoryBanking.ts   # 43 authored corridors with full bank benches + statutory tiers
  corridors.ts           # Long-tail slug registry (alias routes)
  banksRegistry.json     # Flat BIC-indexed bank lookup
  jurisdictions.json     # Country-level tax regime summaries
  rails.json             # Domestic clearing rail inventory
  affiliatePartners.ts   # Partner URLs + UTM attribution
  monetizationConfig.ts  # WhatsApp consulting thresholds + canonical affiliate links
  config.ts              # App-level constants (consulting phone, theme defaults)
  complianceGuides.ts    # Authoritative regulatory summary text per corridor
  contracts.ts           # Contract addendum clause templates
  editoralGuides.ts      # AEO FAQ corpus
  history.json           # Historical rate snapshots (for trend sparklines)
```

---

## 3. Calculation Pipeline

### 3.1 Forward Engine (`utils/calculateRoute.ts`)

```
Input:  grossUSD, platformID, channelID, corridor, bank, tier
Output: RouteResult (all 7 waterfall rows)

platformCutUSD  = platformFeeUSD + grossUSD × (surchargePct / 100)
netAfterWireUSD = max(0, grossUSD − platformCutUSD − wireUSD)
convertedLocal  = netAfterWireUSD × effectiveRate
                  where effectiveRate = baseRate × (1 − fxSpread)
landedLocal     = max(0, convertedLocal − localLandingFee)
takeHomeLocal   = max(0, landedLocal × (1 − withholdingTax))
```

**Guarantees**:
- All divisions pass through `safeDivide(denom, fallback)` from `lib/safeMath.ts`
- `clampNumber(value, min, max)` bounds all intermediate outputs
- `sanitizeFinancialInput(raw)` strips commas, symbols, and non-numeric prefixes before parsing

### 3.2 Reverse (Target-NET) Engine (`lib/calculatorEngine.ts`)

```
Input:  targetNetLocal, platformID, channelID, corridor, bank, tier
Output: GrossUpResult (gross bill + full breakdown)

realizedRate      = baseRate × (1 − channelSpread)
netUsdNeeded      = safeDivide(targetNetLocal, (1 − withholdingTax)) / realizedRate
bankAndWireCutUSD = fixedFeeUSD + intermediaryCutUSD + safeDivide(landingFeeLocal, baseRate)
usdBeforeWires    = netUsdNeeded + bankAndWireCutUSD
requiredGrossBill = safeDivide(usdBeforeWires, (1 − platformRate))
```

**Inversion invariant**: `requiredGrossBill` fed back through the forward engine reproduces `targetNetLocal` exactly (to floating-point tolerance).

### 3.3 Fault-Tolerant Math Layer (`lib/safeMath.ts`)

| Primitive | Behavior |
| --- | --- |
| `safeDivide(numerator, denominator, fallback)` | Clamps `denominator < Number.EPSILON` to `Number.EPSILON`; returns `fallback` for null/NaN/non-finite operands |
| `safeMultiply(a, b)` | Returns `0` if either operand is non-finite |
| `clampNumber(value, min, max)` | Returns `min` if `value < min`; `max` if `value > max`; else `value` |
| `sanitizeFinancialInput(raw: string)` | Strips commas, currency symbols, whitespace; returns parseable numeric string |

---

## 4. Distribution & Machine Consumption

### 4.1 Static Build-Time Generation

| Artifact | Generator | Location |
| --- | --- | --- |
| `/api/fees.json` | `scripts/sync_api_feed.mjs` (prebuild step) | `out/api/fees.json` |
| `public/llms.txt` | `scripts/generate_llms_manifest.mjs` (prebuild step 2) | `public/llms.txt` |
| `public/llms-full.txt` | Same script | `public/llms-full.txt` |
| `public/indexnow-key.txt` | Manual commit | `public/indexnow-key.txt` |

The prebuild chain runs on every `npm run build` before Next.js compilation:

```
npm run prebuild → sync_api_feed.mjs → generate_search_index.mjs → generate_llms_manifest.mjs
npm run build → next build (consumes generated files as static assets)
```

### 4.2 Machine-Readable Surfaces

| Endpoint | Format | Description |
| --- | --- | --- |
| `GET /api/fees.json` | JSON | Full corridor + channel + platform dataset |
| `GET /llms.txt` | Plaintext | LLM-facing manifest (title, description, link sections) |
| `GET /llms-full.txt` | Plaintext | Full 50-corridor table with BICs and purpose codes |
| `GET /developers/` | HTML | Open Developer Data Hub with cURL/TS/Python snippets |
| `GET /embed/<slug>/` | HTML (iframe-safe) | Forced-dark corridor card with backlink badge |

### 4.3 Structured Data (JSON-LD)

Every corridor route emits a single `@graph` via `lib/seoSchemas.ts`:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "CurrencyConversionService", ... },
    { "@type": "ExchangeRateSpecification", ... },
    { "@type": "FinancialProduct", ... },
    { "@type": "FAQPage", ... },
    { "@type": "WebApplication", ... },
    { "@type": "Dataset", "license": "MIT", ... }
  ]
}
```

The `Dataset` node declares two `DataDownload` distributions: the static `api/fees.json` and the `llms-full.txt` manifest.

---

## 5. Security & Bundle Hardening

### 5.1 Content Security Policy

Served via `public/_headers` (Cloudflare Pages):

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

`script-src 'unsafe-inline'` and `'unsafe-eval'` are retained because Radix UI primitives and the deterministic sparkline SVG engine require them; no user-supplied content reaches either pathway.

### 5.2 XSS Sanitization Boundary

`utils/sanitize.ts` provides two primitives wired into every Invoice Studio input:

| Function | Usage Point | Behavior |
| --- | --- | --- |
| `stripHtml(input)` | `Field` onChange, `correspondentNote` textarea | Decodes entities (`&amp;lt;` → `<`), strips `<script>`, `<iframe>`, inline `on*` handlers, `javascript:`/`vbscript:`/`data:` URIs |
| `sanitizeText(input, maxLen)` | Draft save/load paths | Clamps length while preserving `\n` for `whitespace-pre-line` rendering |

### 5.3 Storage Isolation

`lib/privacyGuard.ts` enforces a single namespaced key registry:

| Canonical Key | Legacy Key (migrated once) | Consumer |
| --- | --- | --- |
| `payoutdelta:invoice_draft` | `payoutdelta_draft_invoice` | InvoiceEditor |
| `payoutdelta:bank_sync` | `payoutdelta_banksync` | TransactionCostingWidget |
| `payoutdelta:invoice_sync` | — | Embed snippet sync bridge |
| `payoutdelta:tax_ledger` | — | TaxLedgerView |
| `payoutdelta:rate_alerts` | — | RateWatchlistWidget |
| `payoutdelta:prc_letter_<slug>` | `payoutdelta_prc_letter_<slug>` | PrcLetterModal |
| `payoutdelta:addendum_form` | — | ContractAddendumModal |
| `payoutdelta:theme` | `payoutdelta-theme` | ThemeToggle |
| `payoutdelta:language` | `payoutdelta_lang` | LanguageProvider |
| `payoutdelta:whatsapp_dismissed` | — | WhatsAppConsultingCard |

All wrappers are no-throw; quota-exceeded errors log to console and silently degrade.

### 5.4 SVG & Asset Sanitization

- All SVGs are inline in JSX; no `<image href>` pointing to external URLs
- No `<foreignObject>` elements in any print stylesheet
- External images only via `https:` origin (mid-market rate sparkline data)
- No third-party icon libraries; all icons are hand-authored SVG paths

---

## 6. Routing & Pre-Rendering Strategy

| Route Pattern | Generation Method | dynamicParams |
| --- | --- | --- |
| `/` | Static page | `false` (implicit) |
| `/[lang]/calculator/[slug]` | `generateStaticParams` over 7 languages × 50 corridors | `false` |
| `/calculator/[slug]` | `generateStaticParams` over 50 corridors | `false` |
| `/embed/[slug]` | `generateStaticParams` over 50 corridors | `false` |
| `/invoice/` | Static page | `false` |
| `/tax-ledger/` | Static page | `false` |
| `/swift-auditor/` | Static page | `false` |
| `/leaderboard/` | Static page | `false` |
| `/developers/` | Static page | `false` |
| `/api-access/` | Static page | `false` |

Total static HTML output: **158+ pages** across all locales and tools.

---

## 7. Build & Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Push to main                                            │
│       │                                                         │
│       ▼                                                         │
│  GitHub Actions (`.github/workflows/deploy.yml`)                │
│       │                                                         │
│       ▼                                                         │
│  npm ci                                                         │
│       │                                                         │
│       ▼                                                         │
│  npm run prebuild   ← sync_api_feed.mjs + generate_llms.mjs     │
│       │                                                         │
│       ▼                                                         │
│  npm run build    ← next build (TypeScript type-check + export) │
│       │                                                         │
│       ▼                                                         │
│  npm run test       ← lint → test_corridors.mjs → simulation    │
│       │                                                         │
│       ▼                                                         │
│  gh-pages push to ./out/                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Local dev**: `npm run dev` (Next.js dev server, HMR, no export).
**Pre-deploy gate**: `npm run test` must exit 0; lint warnings are non-blocking but the baseline is 1 pre-existing edge-api warning.

---

## 8. Module Inventory

| Module | Responsibility | Dependencies |
| --- | --- | --- |
| `lib/calculatorEngine.ts` | Forward + reverse waterfall math | `lib/safeMath.ts`, `data/fees.json` |
| `lib/safeMath.ts` | Epsilon-clamped division, clamping, sanitization | None |
| `lib/ledgerEngine.ts` | RemittanceRecord build, annual summary, CSV export | `lib/safeMath.ts`, `data/fees.json` |
| `lib/prcLetterEngine.ts` | Six-scheme PRC letter renderer | `data/regulatoryBanking.ts` |
| `lib/swiftRoutingEngine.ts` | Correspondent registry, route derivation, wire instructions | `data/regulatoryBanking.ts`, `data/banksRegistry.json` |
| `lib/schemaValidator.ts` | Runtime corridor prop hydration (non-throwing) | — |
| `lib/seoSchemas.ts` | JSON-LD `@graph` builders per page type | — |
| `lib/i18n/dictionaries.ts` | 7-language `Record<UiKey, string>` catalogs | — |
| `utils/calculateRoute.ts` | Channel quote + full route compute (calculator surface) | `lib/calculatorEngine.ts` |
| `utils/inverseMath.ts` | Target-net gross-up utility | `lib/safeMath.ts` |
| `utils/sanitize.ts` | HTML strip + text clamp | — |
| `components/Calculator.tsx` | Main calculator island (mode toggle + waterfall) | All engine modules |
| `components/TransactionCostingWidget.tsx` | 7-step interactive waterfall + bank/tier selectors | `lib/calculatorEngine.ts` |
| `components/invoice/InvoiceEditor.tsx` | A4 invoice builder + settlement panel | `lib/ledgerEngine.ts` |
| `components/ledger/TaxLedgerView.tsx` | Annual ledger dashboard + CSV/print | `lib/ledgerEngine.ts` |
| `components/compliance/PrcLetterModal.tsx` | PRC/FIRC letter generator | `lib/prcLetterEngine.ts` |
| `components/compliance/SwiftRouteInspector.tsx` | 3-node SVG transit diagram | `lib/swiftRoutingEngine.ts` |
| `components/RateWatchlistWidget.tsx` | Rate alert threshold + desktop notification | `lib/privacyGuard.ts` |
| `components/invoice/ContractAddendumModal.tsx` | FX contract addendum generator | `data/contracts.ts` |
| `components/ErrorBoundary.tsx` | Per-module crash isolation fallback | — |
| `components/leads/WhatsAppConsultingCard.tsx` | High-ticket advisory funnel | `data/monetizationConfig.ts` |
| `components/EmbedSnippetModal.tsx` | Iframe snippet generator + live preview | — |
