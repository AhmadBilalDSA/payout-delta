# PayoutDelta Changelog & Architectural Ledger

## [1.0.0-rc.1] - 2026-10-08

### Added
- Pure calculation engine (src/lib/engine/math.ts) implementing R1–R4 invariants.
- 39 deterministic unit test assertions covering forward waterfall, reverse target, and epsilon guards.
- Fee-absorption alert badges across interactive calculator and iframe embed routes.
- Schema.org \FinancialProduct\ and \Dataset\ JSON-LD structures.
- Machine-readable discovery via \public/llms.txt\ and static fee registry.

### Verified
- Zero \ny\ types across engine and UI interfaces.
- Static export build pipeline with explicit worker concurrency limits.
