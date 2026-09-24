# Contributing to PayoutDelta

Thanks for helping make the take-home number trustworthy everywhere. Everything
is static-first, privacy-first and open — one versioned dataset drives the
corridor pages, the structured-data audit and the edge API.

## Local setup

```bash
git clone https://github.com/AhmadBilalDSA/payout-delta.git
cd payout-delta
npm install
npm run dev       # local dev server → http://localhost:3000
```

`npm run build` runs `prebuild` first, which syncs the static API feed from
`data/fees.json` into `public/api/fees.json` before the export.

## Before you open a PR

Run the full gate set — every one must pass:

```bash
npm run lint                          # 0 errors
npm run build                         # 159+ static routes → ./out
node scripts/test_corridors.mjs       # ALL CHECKS PASSED (exit 0)
node scripts/simulate_edge_cases.mjs  # ALL INVARIANTS HELD (exit 0)
```

Or run the unified suite in one command: `npm run test` (lint → corridor
audit → headless S4 simulation).

The audit verifies routes, assets, links, JSON-LD (`@graph` per corridor) and
that `public/api/fees.json` still mirrors `data/fees.json`. Never commit an
`out/` or `.next/` directory — they are gitignored build artifacts.

## Where things live

| Path | What it is |
| --- | --- |
| `data/fees.json` | Versioned fees / rates snapshot (single source of truth) |
| `data/regulatoryBanking.ts` | Statutory law & local bank clearing database |
| `data/corridors.ts` | Long-tail platform corridor registry |
| `data/affiliatePartners.ts` | Partner & affiliate referral directory |
| `edge-api/` | Cloudflare Worker rate router (`wrangler dev` / `deploy`) |
| `lib/i18n/dictionaries.ts` | 7-language UI dictionary (compile-checked) |
| `scripts/test_corridors.mjs` | Output integrity audit |
| `scripts/sync_api_feed.mjs` | Static feed mirror for the API portal |

## Open data schemas

When you add or update data, keep the shapes below in sync with the live
files. These are the JSON equivalents of the TypeScript interfaces used by the
site.

### `data/fees.json`

```json
{
  "schemaVersion": 1,
  "dataset": "payoutdelta-fees",
  "updatedAt": "2026-09-25T00:00:00Z",
  "description": "Open dataset of freelance payout fees: platform commission, withdrawal channel fees, and foreign-exchange spreads per payout corridor (USD, EUR and GBP base rails).",
  "disclaimer": "Rates and fee schedules are indicative aggregates compiled from public merchant/commercial rate cards and are not quotes or guaranteed mid-market rates. Always confirm live rates and fees with your provider before transacting.",
  "currency": {
    "base": "USD",
    "symbol": "$"
  },
  "platforms": [
    {
      "id": "upwork",
      "name": "Upwork",
      "feePercent": 10,
      "feeType": "client-platform-gross-cut"
    }
  ],
  "channels": [
    {
      "id": "swift",
      "name": "Direct SWIFT Wire",
      "fixedFeeUSD": 45,
      "fxSpread": 0.035
    }
  ],
  "corridors": [
    {
      "slug": "usd-to-pkr",
      "from": "USD",
      "to": "PKR",
      "rate": 277.425913,
      "country": "Pakistan",
      "countryCode": "PK",
      "currencyName": "Pakistani Rupee",
      "currencySymbol": "Rs"
    }
  ]
}
```

### `data/banks.ts`

```json
{
  "slug": "jpmorgan-chase",
  "name": "JPMorgan Chase Bank N.A.",
  "shortName": "JPMorgan Chase",
  "bic": "CHASUS33",
  "headquartersCity": "New York",
  "headquartersCountry": "United States",
  "role": "Global Correspondent Clearing Hub",
  "clearingCurrency": "USD",
  "typicalShaDeduction": "$18.00 – $35.00 SHA Cut",
  "connectedCorridors": ["usd-to-pkr", "usd-to-inr"],
  "field71aGuidance": "Request SHA in field 71A so USD charges are split: the sender's bank takes its fee upfront and a $18–$35 correspondence cut lands at the JPMorgan tier. Marking OUR pushes the full $18–$35 onto the beneficiary — never do this when you can negotiate SHA."
}
```

### `data/regulatoryBanking.ts`

```json
{
  "slug": "usd-to-pkr",
  "authority": "SBP Foreign Exchange Manual Chapter 13 & Income Tax Ordinance Section 154A",
  "clearingNetwork": "Raast / BEFTN",
  "citations": ["SBP Foreign Exchange Manual Ch. 13", "ITO Section 154A"],
  "banks": [
    {
      "id": "meezan",
      "name": "Meezan Bank",
      "displayName": "Meezan Bank (Pakistan)",
      "swiftCode": "MZNBPKKA",
      "intermediaryUSD": 15,
      "intermediaryMinUSD": 15,
      "intermediaryMaxUSD": 15,
      "localFeeDefault": 0,
      "speed": "Fast",
      "clearance": "Raast Inward: 0 PKR · e-PRC 24 hrs",
      "localCurrency": "PKR"
    }
  ],
  "tiers": [
    {
      "id": "pseb",
      "name": "PSEB Registered IT Exporter",
      "authority": "ITO Section 154A",
      "rate": 0.0025,
      "purposeCode": "9111",
      "exemption": true,
      "note": "0.25% final withholding · PRC Purpose Code 9111 (Computer & Information Services) · provincial PST exemption verified under PRA (Punjab), SRB (Sindh) & KPRA (KP)."
    }
  ],
  "generic": false
}
```

## Adding a new bank definition

Banks live in `data/regulatoryBanking.ts`. Add an entry to the corridor's bank
array (or author a new corridor block), following the existing shape:

```ts
{
  id: "mznb",
  name: "Meezan Bank",
  displayName: "Meezan Bank (Pakistan)",
  swiftCode: "MZNBPKKA",
  intermediaryUSD: 15,
  intermediaryMinUSD: 15,
  intermediaryMaxUSD: 15,
  localFeeDefault: 0,
  speed: "Fast",
  clearance: "Raast Inward: 0 PKR · e-PRC 24 hrs",
  localCurrency: "PKR",
},
```

All figures must be verifiable public benchmarks. If a corridor is not yet
verbatim-audited it falls back to the accurate `$15–$25` intermediary band plus
its national clearing network — keep the fallback working when you add a new
country.

## Adding a corridor

1. Add the corridor object to `data/fees.json` (`corridors[]`).
2. Register the regulatory profile in `data/regulatoryBanking.ts`
   (`AUTHORED`) or confirm the fallback covers it.
3. If it should get a programmatic platform route (Upwork / Fiverr / Deel),
   add it to `data/corridors.ts`.
4. Re-run `npm run prebuild` so `public/api/fees.json` stays in sync.
5. Run the full gate set above — the audit derives its expected slugs from the
   same registry, so a corridor update is covered automatically.

## Proposing changes to regulations

Use the `.github/ISSUE_TEMPLATE/statutory_update.yml` form (or label an issue
`statutory`): quote the circular / section, link a primary source (SBP, RBI,
BIR, or a peer regulator), and describe the delta. Withholding rates, purpose
codes (9111 / P0802), clearing networks and exemption tiers all live in
`data/regulatoryBanking.ts`.

## Commit conventions

- One logical change per commit, message in the template:
  `feat(scope): summary of what actually changed`.
- Keep `output: 'export'`, `basePath: '/payout-delta'` and
  `dynamicParams = false` intact — static-export compatibility is a merge
  blocker.
- Never alter the core calculation math without a reproduction in the issue.
- No secrets, keys or personal data, ever. The project is zero-telemetry by
  design.

## Code of conduct

Be constructive. PayoutDelta is informational tooling, not financial, tax or
legal advice — keep figures factual, sourced and labeled as benchmarks.