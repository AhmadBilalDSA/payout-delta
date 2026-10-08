# PayoutDelta Changelog & Architectural Ledger

## [1.0.0-rc.1] - 2026-10-08

### Added
- Pure calculation engine (\src/lib/engine/math.ts\) implementing R1–R4 invariants.
- 39 deterministic unit test assertions covering forward waterfall, reverse target, and epsilon guards.
- Fee-absorption alert badges across interactive calculator and iframe embed routes.
- Schema.org \FinancialProduct\ and \Dataset\ JSON-LD structures.
- Machine-readable discovery via \public/llms.txt\ and static fee registry.

### Verified
- Zero `any` types across engine and UI interfaces.
- Static export build pipeline with explicit worker concurrency limits.

## [1.0.0-rc.2] - 2026-10-08

### Added
- **AEO FAQPattern injection**: New `src/components/seo/CorridorFaqSchema.tsx` component emitting three programmatic FAQPage JSON-LD entries per corridor — intermediary fees (with correspondent bank/BIC citations), statutory tax obligations (referencing Section 154A for Pakistan, Section 195 for India), and engine methodology (R1–R4 waterfall explanation).
- **Static Sitemap Generator** (`app/sitemap.ts`): Rewrote to read corridor definitions directly from `lib/db.ts` (`getCorridorSlugs()`) and emit deterministic `MetadataRoute.Sitemap` with home (priority 1.0, daily), calculator routes (priority 0.8, daily), and embed routes (priority 0.5, monthly).
- **Calculator page integration**: Mounts `FinancialSchema` and `CorridorFaqSchema` on every `/calculator/[slug]` route with corridor-specific regulatory citations.

### Changed
- `app/sitemap.ts`: Replaced multi-source slug aggregation with single-source dataset. Removed manually authored static page entries; sitemap now mirrors `data/fees.json` corridors as the source of truth.
