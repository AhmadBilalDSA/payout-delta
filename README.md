# PayoutDelta

A free, zero-signup auditor of freelance payout fees. PayoutDelta decomposes
every client payment into the three leaks that eat earnings — **platform
commission**, **channel fixed fee** and **FX spread** — across 10 currency
corridors, and ranks 5 withdrawal channels by the local currency you actually
receive.

Phase 1 is a **fully static export** (`next build` → `out/`) deployed to
GitHub Pages. There is no server, no database, no tracking: every calculation
runs in your browser. Phase 2 B2B hooks are scaffolded as commented stubs.

## Stack

- Next.js 16.3.5 (App Router, `output: "export"`, `trailingSlash: true`)
- React 19 · TypeScript 5 (strict) · Tailwind CSS v4
- Radix UI primitives (accordion, slider, toggle-group)
- CI/CD: GitHub Actions → static GitHub Pages (branch `master`)

## Commands

```bash
npm run dev       # local dev server (localhost:3000)
npm run build     # static export to ./out
npm run lint      # ESLint (flat config; run `npx eslint .` to lint all)
```

## Data: `data/fees.json`

The dataset is the single source of truth for every fee shown on the site,
and the only thing that changes between revisions.

```jsonc
{
  "schemaVersion": 1,
  "dataset": "payoutdelta-fees",
  "updatedAt": "2026-09-22",        // bump on every rate/fee change
  "currency": { "base": "USD" },
  "platforms": [
    { "id": "upwork", "name": "Upwork", "feePercent": 10 },
    { "id": "fiverr", "name": "Fiverr", "feePercent": 20 },
    { "id": "direct", "name": "Direct Client Invoice", "feePercent": 0 }
  ],
  "channels": [
    // fixedFeeUSD = flat deduction · fxSpread = fraction off the mid rate
    { "id": "wise", "name": "Wise", "fixedFeeUSD": 2.99, "fxSpread": 0.0045 }
  ],
  "corridors": [
    { "slug": "usd-pkr", "from": "USD", "to": "PKR", "rate": 278.5, ... }
  ]
}
```

Rules for updating fees:

1. Edit `data/fees.json` and bump `updatedAt` to today.
2. Re-run `npm run build` — every corridor page, sitemap entry and static
   JSON regenerates from the new snapshot. No other code changes.
3. Commit, push to `master`; the GitHub Actions workflow builds and deploys.

`lib/db.ts` is the only consumer of the JSON (backed by a documented Phase 2
star-schema migration plan); `scripts/playwright_scraper.py` is the Phase 2
ETL that will eventually replace manual edits.

## Project layout

| Path | Purpose |
| --- | --- |
| `data/fees.json` | Versioned fee/rate snapshot (the source of truth) |
| `lib/types.ts` | Domain types shared by data + UI |
| `lib/db.ts` | Data-access seam over the JSON (Phase 2 star-schema notes) |
| `lib/corridorContent.ts` | Per-corridor editorial prose + FAQs (SEO, ≥60% unique) |
| `utils/calculateRoute.ts` | Pure fee mathematics (clamped, finite-guarded) |
| `app/calculator/[slug]/page.tsx` | Dynamic corridor auditor pages (`dynamicParams = false`) |
| `components/Calculator.tsx` | Client calculator island (Radix slider + toggle) |
| `middleware.ts` | Pass-through placeholder (unsupported in static export; see file) |
| `app/api/v1/rates/route.ts` | Phase 2 API stub — returns 501 |
| `.github/workflows/deploy.yml` | Build + deploy to GitHub Pages on `master` |

## SEO / content notes

- Each corridor page ships unique editorial copy (local tax considerations,
  clearance times, SWIFT rules) from `lib/corridorContent.ts` to stay >60%
  unique per page.
- Per-page `FAQPage` + `SoftwareApplication` JSON-LD is emitted as raw
  `<script>` tags (Metadata APIs cannot inject into `<head>`).
- `metadataBase` is pinned to `https://payoutdelta.com` so canonical/OG URLs
  resolve correctly on GitHub Pages.

## Privacy

No accounts, no analytics, no server-side persistence. Calculator inputs stay
on-device. Details in `app/privacy-policy/page.tsx`.

## Disclaimer

Fee tables are indicative aggregates from public rate cards — not quotes,
quotes-quality nor financial/tax advice. See `app/disclaimer/page.tsx`.