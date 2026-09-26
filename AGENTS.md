# AGENTS.md — PayoutDelta High-Efficiency Symbol Map & Agent Contract

## 1. TOKEN PRESERVATION PROTOCOL (MANDATORY FOR ALL SESSIONS)
- SURGICAL EDITS ONLY: Never rewrite an entire file to change a few lines. Always use search/replace or targeted line edits.
- ZERO FILE-TREE DISCOVERY: Do not run recursive grep, glob, or directory tree discovery commands. All file locations, exported functions, and data schemas are defined below in Section 3.
- NO RE-READING UNMODIFIED FILES: If a type or helper is documented in this file, trust its signature without reading the source file.
- NO RUNAWAY TASK LISTS: Do not invoke recursive todo-list tools. Execute planned file edits directly.

## 2. INFRASTRUCTURE & REPO INVARIANTS
- Framework: Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript strict.
- Static Export: output: 'export', trailingSlash: true, images.unoptimized: true.
- Deployment: GitHub Pages under basePath: '/payout-delta'. Always use root-relative paths in next/link (/invoice/, /dashboard/).
- Zero-Dependency Rule: 0 runtime chart, icon, or animation packages. All icons and charts must be hand-rolled inline SVG.

## 3. CODEBASE AST & SYMBOL REGISTRY (DO NOT DISCOVER VIA FS)
### Core Data Models:
- `data/fees.json`: Array of 131 corridor objects.
  `Corridor`: { slug: string, from: string, to: string, country: string, banks: Bank[], defaultIntermediaryUSD: number, primaryCorrespondent?: string }
- `data/banks.ts`:
  Exports: `BANK_DOSSIERS: BankDossier[]` (22 dossiers), `GITHUB_REPO: string`, `getBankDossierBySlug(slug: string): BankDossier | undefined`
- `data/regulatoryBanking.ts`:
  Exports: `getRegulatoryBanking(slug: string): CorridorRegulation` (returns clearingNetwork, taxPurposeCodes, localSettlementRail, intermediaryTransitCuts)

### Math & Query Engines:
- `lib/db.ts`:
  Exports: `getDataset(): Dataset`, `getCorridors(): Corridor[]`, `getCorridorBySlug(slug: string): Corridor | undefined`
- `lib/calculatorEngine.ts`:
  Exports: `calculateWaterfall(input: WaterfallInput): WaterfallResult` (7-step deduction solver), `calculateGrossUp(targetNet: number, corridor: Corridor): GrossUpResult`
- `lib/directoryData.ts`:
  Exports: `buildDirectoryIndex(): DirectoryItem[]` (indexes corridors, rails, and BICs in memory)
- `lib/ledgerEngine.ts`:
  Exports: localStorage-backed client ledger functions for invoice tracking

### Internationalization & SEO Gates:
- `lib/i18n/dictionaries.ts`:
  Contains dictionary catalog across 7 locales. ANY new UI string must be registered here.
- `app/sitemap.ts`:
  Exports static sitemap route array.
- `scripts/ping_indexnow.mjs`:
  Automated script for pinging Bing/Yandex on build.

## 4. UI SHELL COMPONENTS
- `components/Header.tsx`: Global navigation bar with Open Data pill and theme toggle.
- `components/Footer.tsx`: 4-column canonical link hub.
- `components/DirectoryExplorer.tsx`: Instant in-memory search and sticky category navigation.
- `components/dashboard/Icons.tsx`: Hand-rolled inline SVGs (CalculatorIcon, InvoiceIcon, LedgerIcon, LeaderboardIcon, BankBuildingIcon, CompareIcon, AgencyIcon, TerminalIcon).
- `components/dashboard/Dock.tsx`: Frosted macOS-style bottom application launcher.
