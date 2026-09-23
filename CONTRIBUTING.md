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