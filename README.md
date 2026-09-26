# PayoutDelta (Δ) — Institutional Cross-Border Settlement & Regulatory Clearing Engine

> **Zero-bloat, deterministic financial intelligence platform benchmarked against real-time interbank foreign exchange rates, SWIFT Field 71A intermediary deductions, and central bank statutory tax schedules.**

[![Build & Export Gate](https://github.com/AhmadBilalDSA/payout-delta/actions/workflows/deploy.yml/badge.svg)](https://github.com/AhmadBilalDSA/payout-delta/actions)
[![Live Production](https://img.shields.io/badge/Live-GitHub%20Pages-emerald.svg)](https://ahmadbilaldsa.github.io/payout-delta/)
[![Zero Runtime Bloat](https://img.shields.io/badge/Dependencies-0%20Runtime%20Libs-blue.svg)](#architecture--invariants)
[![Static Export](https://img.shields.io/badge/Next.js%2016-100%25%20SSG%20Export-black.svg)](#architecture--invariants)
[![Static Index](https://img.shields.io/badge/Routes-461%20Static%20Pages-emerald.svg)](#live-production-directory)

---

## Live Production Directory & Feature Matrix

Every route below is pre-rendered statically (`output: 'export'`), runs 100% client-side, and requires 0 third-party runtime visualization packages:

| Pillar / Feature | Live Production Link | Core Functional Capability |
| :--- | :--- | :--- |
| **Fee Auditor & Home** | [Launch Platform](https://ahmadbilaldsa.github.io/payout-delta/) | Real-time interbank FX spread auditing, fee drag calculation across 131 country corridors, and instant directory filtering. |
| **Terminal v3** | [Launch Terminal](https://ahmadbilaldsa.github.io/payout-delta/dashboard/) | Two-tier progressive disclosure clearing deck, macro SHA cut telemetry, interactive 7-step fee cascade, and live CSV ledger export. |
| **Invoice Studio** | [Launch Studio](https://ahmadbilaldsa.github.io/payout-delta/invoice/) | Deterministic gross-up solver calculating exact pre-tax invoice values needed to achieve target net landing amounts. |
| **Tax Ledger** | [Launch Ledger](https://ahmadbilaldsa.github.io/payout-delta/tax-ledger/) | Client-side persistent cross-border invoice tracker with real-time tax deduction and remittance audit trails. |
| **Tax Clearance Hub** | [Launch Tax Hub](https://ahmadbilaldsa.github.io/payout-delta/tax-clearance/) | Comprehensive central bank statutory purpose code directory (SBP 9111, RBI P0802, BSP CIR, DIAN 1060, BACEN SCE) and e-FIRC/PRC verification flows. |
| **Challenger Rails** | [Launch Rails](https://ahmadbilaldsa.github.io/payout-delta/challengers/) | Direct cost and speed benchmarking: SWIFT correspondent wires vs. Airwallex, Revolut Business, Elevate Pay, and Stablecoin (USDC/USDT) off-ramps. |
| **Bank Dossiers** | [Launch Directory](https://ahmadbilaldsa.github.io/payout-delta/banks/) | 22 in-depth correspondent routing profiles and 291 SWIFT BICs mapped to primary clearing hubs (JPMorgan Chase, Citibank, Standard Chartered, Deutsche Bank). |
| **Corridor Leaderboard** | [Launch Leaderboard](https://ahmadbilaldsa.github.io/payout-delta/leaderboard/) | Empirical ranking of all 131 international corridors sorted by intermediary transit drag, beneficiary landing fees, and FX spread. |
| **Agency Treasury** | [Launch Agency Hub](https://ahmadbilaldsa.github.io/payout-delta/agencies/) | Multi-contractor payroll leakage modeling and batch withdrawal waterfall optimization for global software consultancies. |
| **Head-to-Head Compare**| [Launch Compare](https://ahmadbilaldsa.github.io/payout-delta/compare/) | Multi-provider side-by-side settlement comparisons across Wise, Payoneer, Revolut, and direct SWIFT wires. |

---

## Complete Feature Breakdown

### 1. Terminal v3 Institutional Clearing Deck (`/dashboard/`)
- **Two-Tier Progressive Disclosure:** Clean executive summary cards up front (corridors audited, audited BICs, median spread %, max SHA cut) with technical wire forensics expandable below.
- **7-Step Waterfall Visualizer:** Hand-rolled inline SVG cascade modeling:
  `Gross Invoiced` → `Platform Cut` → `Intermediary Transit Cut (Field 71A)` → `Wholesale Interbank FX` → `Spread Skim` → `Beneficiary Landing Fee` → `Net Received`.
- **Dynamic Telemetry:** Audits 131 country corridors and 291 BICs from `data/fees.json` and `data/banks.ts`.

### 2. Statutory Purpose Code & Tax Clearance Hub (`/tax-clearance/`)
- **SBP (Pakistan):** Purpose Code `9111` (Software Consultancy / IT Services export rebate), Form 'R' FEM Appendix V-121 compliance, and ePRC/S-PRC bank certificate retrieval procedures.
- **RBI (India):** Purpose Code `P0802` (Software consultancy, data processing, and IT-enabled export remittance), EDPMS export declaration, e-FIRC portal retrieval, and GST RFD-09 LUT filing rules.
- **BSP (Philippines):** FX Form 1/1A cross-border tech contractor declaration rules, Certificate of Inward Remittance (CIR), and BIR 8% gross income tax election.
- **LATAM (Colombia & Brazil):** DIAN Formato 1060 (Declaración de Cambio) and Banco Central do Brasil (BCB) SCE registry procedures.

### 3. Challenger Rails & Alternative Settlements (`/challengers/`)
- **Airwallex:** Local clearing network routing vs. SWIFT intermediary correspondent transit cuts.
- **Revolut Business:** Multi-currency business accounts and SEPA/ACH domestic rail off-ramps.
- **Elevate Pay:** US virtual accounts (FDIC-insured partner banks) tailored for remote contractors in emerging tech hubs (PK, IN, PH, NG).
- **On-Chain Settlement (USDC/USDT):** Polygon and Arbitrum L2 settlement friction ($0.01-$0.50 gas) and P2P/CEX off-ramp spreads vs. traditional 5% to 15% correspondent bank wire leakage.

### 4. Zero-Bloat Engineering & Performance Invariants
- **0 Runtime Chart/Icon Packages:** Zero dependencies on Recharts, Chart.js, or Lucide. All histograms, comparative bars, cascades, and icons use hand-rolled native SVG.
- **Client-Side Privacy:** 100% of calculations execute in the browser. Zero user numbers, invoices, or financial inputs leave the client device.
- **Strict Weight Constraint:** All components and terminals maintain a sub-40KB gzip footprint.
- **Automated AEO & Indexing:** 461 pre-rendered static routes with automated IndexNow HTTP 200 verification, Schema.org JSON-LD structured data (`FinancialService`, `TechArticle`, `FAQPage`, `BreadcrumbList`), and synchronized `/llms.txt`.
- **Global Localization:** Full UI catalog across 7 languages: English (`en`), Urdu (`ur`), Spanish (`es`), Hindi (`hi`), Tagalog (`tl`), Arabic (`ar`), and French (`fr`).

---

## Technical Stack & Execution Architecture

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (Strict).
- **Styling:** Tailwind CSS v4 (Apple-minimalist dark mode palette).
- **Export Target:** GitHub Pages (`output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`).
- **Context Indexing:** Repomix AST compression with `.repomixignore` preventing context window overflow during autonomous agent workflows.

---

## Local Development & Audit Verification

```bash
# Clone the repository
git clone [https://github.com/AhmadBilalDSA/payout-delta.git](https://github.com/AhmadBilalDSA/payout-delta.git)
cd payout-delta

# Install dev dependencies
npm install

# Run schema validation and mathematical simulation tests
npm run test

# Perform static build and export
npm run build

# Ping search engine indexers
npm run indexnow

