# PayoutDelta — Rules & Financial Guardrails

> **Motto**: Deterministic math. Zero surprise deductions. Every number auditable.
> **Scope**: Calculation constraints, code quality rules, build gates, and data invariants that every commit must satisfy.

---

## 1. Financial Calculation Rules

### 1.1 Amount Bounds

| Parameter | Minimum | Maximum | Clamp Behavior |
| --- | --- | --- | --- |
| `grossUSD` (input) | $1.00 | $10,000,000 | Values below $1 clamp to $1 with amber warning; values above $10M clamp to $10M |
| `targetNetLocal` (input) | Local equivalent of $1 | Local equivalent of $10M | Same clamp; shown as "Minimum transfer: {ccy} 1" when clamped |
| `surchargePct` (slider) | 0% | 15% | Hard UI clamp; slider thumb stops at boundaries |
| `wireUSD` (slider) | $0 | $40 | Hard UI clamp; reflects realistic SWIFT intermediary band |
| `withholdingTax` (tier) | 0% | 15% | Capped at 15%; higher statutory rates use the 15% cap with a footnote |

**Rationale**: Amounts below $1 are economically meaningless for cross-border wires (fixed fees dominate). Amounts above $10M enter corporate treasury territory outside the product scope.

### 1.2 Negative Landing Balance Guard

**Rule**: `takeHomeLocal` is never displayed as a negative number.

```typescript
// In the forward waterfall:
const landedLocal   = Math.max(0, convertedLocal - localLandingFee);
const takeHomeLocal = Math.max(0, landedLocal * (1 - withholdingTax));
```

When `takeHomeLocal === 0`, surface an explicit warning card:

> ⚠️ **Fee Absorption Warning**: Fixed fees and spreads exceed your transfer amount. The entire $X.XX is consumed by banking charges. Increase your gross or switch to a lower-cost channel (e.g., Wise).

### 1.3 Weekday vs. Weekend FX Spread Buffer

**Rule**: No automatic weekend spread buffer is applied. The dataset stores a single `baseRate` snapshot per corridor (updated nightly via the edge worker). The UI surfaces the date of the last rate refresh:

> Rate snapshot: 2026-09-27 · Updated nightly · Not a live quote

Users are expected to manually check rate freshness before relying on the calculation for time-sensitive decisions. The disclaimer is rendered in the `market-status` aside on every corridor page.

### 1.4 Rounding Strategy

All financial intermediate values retain full floating-point precision through the pipeline. Rounding to 2 decimal places (or the local currency's natural precision) occurs **only at render time**, never in the engine:

```typescript
// Engine: raw precision preserved
const takeHomeLocal = netAfterWireUSD * effectiveRate * (1 - withholdingTax);

// Render: formatted for display
const formatted = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: targetCurrency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(takeHomeLocal);
```

**Exception**: Currency amounts with 0 fractional digits (JPY, KRW, VND) use `minimumFractionDigits: 0`. The `Intl.NumberFormat` currency resolution handles this automatically when the `currency` option is set.

### 1.5 Zero-Denominator Protection

Every division in the engine passes through `safeDivide`:

```typescript
// lib/safeMath.ts
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback: number = 0
): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return fallback;
  if (Math.abs(denominator) < Number.EPSILON) return fallback;
  return numerator / denominator;
}
```

The reverse solver bails to a safe zero stack when `targetNetLocal <= 0` or `baseRate <= 0` rather than producing Infinity:

```typescript
if (targetNetLocal <= 0 || baseRate <= 0) {
  return { feasible: false, ...zeroStack };
}
```

---

## 2. Code Quality Rules

### 2.1 Zero `any` Types

**Rule**: No `any` type anywhere in `src/`, `lib/`, `utils/`, or `components/`.

**Allowed alternatives**:
- `unknown` for genuinely untyped external data (must be narrowed before use)
- Type predicates (`isCorridor(obj): obj is Corridor`)
- Generic type parameters (`<T extends Record<string, unknown>`)
- `never` for exhaustive switch statements

**Enforcement**: ESLint rule `@typescript-eslint/no-explicit-any` is enabled with `allowImplicit: false`.

### 2.2 Explicit Return Types

**Rule**: Every exported function must declare its return type. No inferred return types on public API boundaries.

```typescript
// ✅ Correct
export function calculateGrossFromTargetNet(input: GrossUpInput): GrossUpResult {
  // ...
}

// ❌ Forbidden
export function calculateGrossFromTargetNet(input: GrossUpInput) {
  // inferred return type — rejected by lint
}
```

**Exception**: Arrow functions assigned to React event handlers (`onClick`, `onChange`) may omit return types when the handler returns `void`.

### 2.3 No Temporal Coupling in Hooks

**Rule**: `useState` initializers must be synchronous and side-effect-free. Lazy initialization is required for expensive computations:

```typescript
// ✅ Correct
const [result, setResult] = useState<GrossUpResult>(() => computeInitialResult());

// ❌ Forbidden
const result = computeInitialResult();  // runs on every render
const [state, setState] = useState(result);
```

### 2.4 Memoization Discipline

**Rule**: Expensive computations inside component bodies must be wrapped in `useMemo` or `useCallback`. The calculator engine runs in a single `useMemo` pass per input change:

```typescript
const quote = useMemo(() => {
  return computeRoute({ grossUSD, platformID, channelID, corridor, bank, tier });
}, [grossUSD, platformID, channelID, corridor.id, bank.id, tier.id]);
```

**Exception**: Computations under 10μs (simple arithmetic, array lookups) do not require memoization.

### 2.5 Event Handler Registration

**Rule**: All `addEventListener` calls must be paired with a cleanup in `useEffect` return:

```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => { /* ... */ };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

**Exception**: `storage` events for `useSyncExternalStore` hydration (RateWatchlistWidget) use the external store pattern and do not require manual cleanup.

---

## 3. Build Gates

### 3.1 Prebuild Must Succeed

Every `npm run build` begins with `npm run prebuild`. If the prebuild script exits non-zero, the build fails. The prebuild chain:

1. `sync_api_feed.mjs` — regenerates `out/api/fees.json` from `data/fees.json`
2. `generate_search_index.mjs` — builds the client-side search index
3. `generate_llms_manifest.mjs` — compiles `public/llms.txt` and `public/llms-full.txt`

**Gate**: All three scripts must exit 0. Any script failure aborts the build.

### 3.2 Test Suite Order

```bash
npm run test
# Equivalent to:
npm run lint                      # Step 1: 0 errors
node scripts/test_corridors.mjs   # Step 2: static corridor audit
npm run test:simulation           # Step 3: headless edge-case simulation
```

**Failure behavior**: Each step is a hard gate. If lint fails, the corridor audit does not run. If the corridor audit fails, the simulation does not run. This gives immediate feedback on the earliest failure point.

### 3.3 Static Export Validation

After `next build`, the following are asserted in `test_corridors.mjs`:

| Check | Assertion |
| --- | --- |
| `out/` contains `index.html` | Build produced static output |
| `out/api/fees.json` matches `data/fees.json` schema | Feed mirror is consistent |
| `out/llms.txt` is non-empty | LLM manifest regenerated |
| `out/llms-full.txt` has 50+ corridor lines | Full manifest complete |
| `out/embed/*/index.html` exists for all 50 slugs | Embed routes pre-rendered |
| `out/calculator/*/index.html` exists for all base corridors | Calculator routes pre-rendered |
| `out/[lang]/*/index.html` exists for localized routes | i18n routes pre-rendered |

---

## 4. Data Invariants

### 4.1 Corridor Schema Invariants

Every entry in `data/fees.json` must satisfy:

| Field | Invariant | Enforcement |
| --- | --- | --- |
| `id` | Matches regex `^[a-z]{3}-to-[a-z]{3}$` | Build-time regex assertion |
| `baseCurrency` | 3-letter ISO 4217 code | Schema validation in `test_corridors.mjs` |
| `targetCurrency` | 3-letter ISO 4217 code; must differ from `baseCurrency` | Schema validation |
| `baseRate` | Finite, `> 0` | Financial range gate (S2.2) |
| `fxSpread` (if present) | `0 ≤ fxSpread ≤ 0.15` | Financial range gate |
| `intermediaryUSD` (if present) | `0 ≤ intermediaryUSD ≤ 100` | Financial range gate |
| `providers[].fxSpread` | `0 ≤ spread ≤ 0.15` | Financial range gate |
| `providers[].fixedFeeUSD` | `0 ≤ fee ≤ 50` | Financial range gate |

### 4.2 BIC / SWIFT Code Invariants

Every `swiftCode` literal in `data/regulatoryBanking.ts` and `lib/swiftRoutingEngine.ts` must match ISO 9362:

```
^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$
```

**Enforced by**: `auditBicSource` in `scripts/test_corridors.mjs` (Phase S2.1). Rejects:
- Lowercase characters
- Spaces
- Lengths other than 8 or 11
- Non-alphanumeric characters in the country/code position

**Exempted sentinels**: Empty string `""`, hyphen `"-"`, em-dash `"—"` (used for local clearing rails with no SWIFT involvement).

### 4.3 Platform Fee Invariants

| Platform | `feePercent` | Invariant |
| --- | --- | --- |
| `upwork` | 10 | Fixed; no corridor override |
| `fiverr` | 20 | Fixed; no corridor override |
| `direct` | 0 | Fixed; no corridor override |

**Rule**: Platform fees are constant across all corridors. Corridor-specific overrides are not permitted (the dataset schema does not include a `platformOverride` field).

### 4.4 Channel Fee Invariants

| Channel | `fixedFeeUSD` | `fxSpread` | Invariant |
| --- | --- | --- | --- |
| `swift` | 30 | 0.035 | Fixed; base channel |
| `local-bank` | 0.99 | 0.032 | Fixed; base channel |
| `wise` | 2.99 | 0.0045 | Fixed; base channel |
| `payoneer` | 3.15 | 0.05 | Fixed; base channel |
| `remitly` | 1.99 | 0.012 | Fixed; base channel |

Per-corridor provider overrides in `fees.json` may deviate from these base values but must still satisfy the financial range gates (`fixedFeeUSD ∈ [0, 50]`, `fxSpread ∈ [0, 0.15]`).

---

## 5. Simulation Invariants (Phase S4)

The headless simulator (`scripts/simulate_edge_cases.mjs`) enforces four hard invariants. Any violation exits with code 1.

### R1 — Take-Home Positivity

```typescript
// Asserted for every forward quote and every inverse solve:
assert(result.takeHomeLocal > 0, 'Take-home must be positive');
```

**Carve-out**: Micro amounts where the entire transfer is consumed by fixed fees. These are documented but not asserted as failures.

### R2 — Finiteness

```typescript
// No produced value may be NaN, ±Infinity, null, or undefined:
assert(Number.isFinite(result.grossRequired), 'grossRequired must be finite');
assert(Number.isFinite(result.takeHomeLocal), 'takeHomeLocal must be finite');
assert(result.platformCutUsd !== null, 'platformCutUsd must not be null');
// Also: JSON.stringify(NaN) must not produce the string "null"
assert(JSON.stringify(result) !== '"null"', 'JSON serialization must not corrupt NaN');
```

### R3 — Fee Bounds

```typescript
// Effective total deduction must stay within [0.1%, 15%] on Direct (Standard+)
// and Upwork (High+). Fiverr's 20% cut is a documented exclusion.
const effectiveFeePct = (totalDeductions / grossUSD) * 100;
if (platform !== 'fiverr') {
  assert(effectiveFeePct >= 0.1 && effectiveFeePct <= 15, `Fee pct ${effectiveFeePct}% out of range`);
}
```

### R4 — Sanitization Parity

```typescript
// An Infinity fixedFeeUSD must sanitize to 0 and produce identical results:
const sanitized = sanitizeFinancialInput('Infinity');
assert(parseFee(sanitized) === 0, 'Infinity must sanitize to 0');
```

---

## 6. Storage Rules

### 6.1 Namespace Lockdown

All `localStorage` keys must begin with `payoutdelta:`. Keys without this prefix are forbidden in application code:

```typescript
// ✅ Correct
writeLocalStorage(INVOICE_DRAFT_KEY, draft);

// ❌ Forbidden
localStorage.setItem('myApp_draft', JSON.stringify(draft));  // rejected by lint guard
```

### 6.2 Migration One-Time Only

Legacy key migration (`migrateLegacyStorage()`) runs exactly once per session. After the first run, the session flag is set and subsequent calls are no-ops:

```typescript
let _migrated = false;
export function migrateLegacyStorage(): void {
  if (_migrated) return;
  _migrated = true;
  // perform remapping...
}
```

### 6.3 Quota Safety

All storage wrappers catch `QuotaExceededError` and log to console without throwing:

```typescript
export function writeLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn(`[payoutdelta] Storage quota exceeded for key: ${key}`);
    }
  }
}
```

---

## 7. Commit Convention

```
feat(scope): concise description of what changed (closes #<issue_id>)
fix(scope): concise description of the bug fixed (closes #<issue_id>)
test(scope): add reproduction and edge case tests
docs(scope): update documentation
chore(scope): build configuration, script changes, dependency updates
refactor(scope): code restructuring with no behavior change
```

**Scope values**: `calculator`, `engine`, `invoice`, `ledger`, `compliance`, `embed`, `i18n`, `data`, `scripts`, `build`, `lint`, `security`.

**Body format** (optional but required for non-trivial changes):
```
Problem: <one sentence on what was broken or missing>
Root Cause: <one sentence on why it broke>
Solution: <one sentence on the fix>
Verification: <command to run, e.g. npm run test>
```

---

## 8. Prohibited Patterns

| Pattern | Reason | Alternative |
| --- | --- | --- |
| `eval()` or `new Function()` | CSP violation; XSS vector | Dynamic imports only for code-split bundles |
| `innerHTML` with user content | XSS vector | `textContent` or React JSX |
| Direct `localStorage` access outside `privacyGuard.ts` | Namespace pollution | Use `writeLocalStorage()` / `readLocalStorage()` |
| Hardcoded API keys in source | Credential leak | Environment variables only; never committed |
| `console.log()` in production paths | Token bloat; telemetry risk | `console.warn()` for recoverable errors; silent for expected paths |
| Unbounded `setInterval` loops | Memory leak; battery drain | `requestAnimationFrame` for animations; `setTimeout` for debounced logic |
| `any` type annotations | Type safety loss | `unknown` with type predicates |
| Inline `style={{ }}` with computed values | JIT CSS generation; bundle bloat | Tailwind utility classes; CSS variables for dynamic values |

---

## 9. Verification Checklist (Pre-Commit)

Run these commands before every commit. All must pass:

```bash
# 1. Lint — 0 errors (1 pre-existing edge-api warning is acceptable)
npm run lint

# 2. Build — static export succeeds, all routes pre-render
npm run build

# 3. Corridor audit — schema gates, BIC validation, financial ranges
node scripts/test_corridors.mjs

# 4. Simulation — headless regression guard
npm run test:simulation

# 5. (Optional) IndexNow ping — warns only, never fails
npm run indexnow
```

**Merge blocker**: Steps 1–4 must exit 0. Step 5 is advisory.
