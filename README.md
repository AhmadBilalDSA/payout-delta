# PayoutDelta

**The payout auditor that tells you how much actually reaches your bank — after every hidden fee.**

> After the platform cut, the SWIFT intermediaries, the real conversion, the
> local landing fee and the statutory tax — **how much of your client's payment
> lands in your bank account?** PayoutDelta answers exactly that, for 10
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
10 primary corridors (PKR, INR, PHP, BRL, GBP, EUR, NGN, BDT, EGP, ZAR) with
live comparison between **Wise, Payoneer, Direct Wire, Remitly and local bank
rails** — a best-verdict ranking of the **local currency you actually
receive**, not the one quoted mid-market.

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
  (draft invoice, language preference, bank-sync).
- **Versioned fee dataset** — `data/fees.json` is the single source of truth;
  corridor pages, sitemap and static JSON regenerate from one snapshot.

### Repo layout at a glance

| Path | Purpose |
| --- | --- |
| `data/fees.json` | Versioned fees/rates snapshot (source of truth) |
| `data/regulatoryBanking.ts` | Statutory law & local bank clearing database |
| `data/affiliatePartners.ts` | Central partner & affiliate directory (referral routing) |
| `components/TransactionCostingWidget.tsx` | 7-step liquid waterfall engine |
| `components/invoice/` | Invoice Studio (editor, preview, addendums) |
| `lib/i18n/dictionaries.ts` | 7-language dictionary (compile-checked) |
| `edge-api/` | Cloudflare Worker rate router |
| `app/api-access/` | Developer playground |
| `scripts/test_corridors.mjs` | Link + JSON-LD integrity audit |

### Roadmap

| # | Phase | Status |
| --- | --- | --- |
| 1 | Codebase audit, system spec & GitHub showcase | Shipped |
| 2 | AEO/GEO direct-answer snippets & statutory citations | Shipped |
| 3 | High-intent affiliate engine, partner referral cards & trust micro-badges | Shipped |
| 4 | Programmatic long-tail corridor engine (Upwork / Fiverr / Deel) | Planned |
| 5 | Financial JSON-LD schema dominance | Planned |
| 6 | GitHub community engine & full developer API docs | Planned |
| 7 | Automated edge cache sync & dynamic OpenGraph social engine | Planned |

---

## Contributing

Help make the take-home number trustworthy everywhere:

- Open an issue for a **real bank credit advice** correction (SWIFT cut, landing
  fee, clearance time) on any corridor.
- Add a language, a corridor tier, or a statutory citation.
- Extend the edge API or the invoice addendum library.

PayoutDelta is informational tooling — **not financial, tax or legal advice.**
Fee tables are indicative public benchmarks, not quotes. See the [disclaimer](app/disclaimer) and [privacy policy](app/privacy-policy).