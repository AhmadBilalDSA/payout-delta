# PayoutDelta — Design System & UI/UX Specification

> **Design philosophy**: High-density financial terminal. Every pixel earns its place.
> **No decorative gradients, no icon libraries, no stock photography.**
> **All colors reference the Tailwind slate/zinc/emerald/rose/amber palette.**

---

## 1. Visual System

### 1.1 Color Tokens

| Token | Light Mode | Dark Mode | Usage |
| --- | --- | --- | --- |
| `--surface` | `#ffffff` | `#0f172a` (slate-900) | Page background |
| `--card` | `#f8fafc` (slate-50) | `#1e293b` (slate-800/70) | Card backdrops |
| `--card-border` | `#e2e8f0` (slate-200) | `#334155` (slate-700) | Card borders |
| `--foreground` | `#0f172a` (slate-900) | `#f8fafc` (slate-50) | Primary text |
| `--muted-foreground` | `#64748b` (slate-500) | `#94a3b8` (slate-400) | Secondary text |
| `--accent` | `#059669` (emerald-600) | `#10b981` (emerald-500) | Primary CTAs, positive deltas |
| `--accent-muted` | `#d1fae5` (emerald-100) | `#064e3b` (emerald-900) | Positive badges |
| `--danger` | `#dc2626` (rose-600) | `#f43f5e` (rose-500) | High fees, double-dip warnings |
| `--danger-muted` | `#fee2e2` (rose-100) | `#881337` (rose-900) | Danger badges |
| `--warning` | `#d97706` (amber-600) | `#f59e0b` (amber-500) | Intermediary cuts, non-filer rates |
| `--warning-muted` | `#fef3c7` (amber-100) | `#78350f` (amber-900) | Warning badges |
| `--border` | `#cbd5e1` (slate-300) | `#475569` (slate-600) | Input borders |
| `--input-bg` | `#ffffff` | `#0f172a` (slate-900) | Input fields |

**Dark deck token** (`[data-theme="dark"]` in `globals.css`):
```css
:root {
  --background: #f8fafc;
  --foreground: #0f172a;
}
[data-theme="dark"] {
  --background: #0b0f19;       /* obsidian navy */
  --foreground: #f8fafc;
}
```

### 1.2 Typography

| Type Scale | Size | Weight | Usage |
| --- | --- | --- | --- |
| Display | `text-3xl` (30px) | `font-bold` | Page titles, corridor slug headers |
| Heading 1 | `text-2xl` (24px) | `font-semibold` | Section titles |
| Heading 2 | `text-xl` (20px) | `font-semibold` | Card titles |
| Body | `text-base` (16px) | `font-normal` | Paragraph text, labels |
| Mono | `text-sm` (14px) | `font-mono tabular-nums` | **All monetary values, rates, percentages** |
| Caption | `text-xs` (12px) | `font-medium` | Badges, footnote citations |
| Micro | `text-xs` (11px) | `font-mono` | BIC codes, purpose codes, timestamps |

**Mono rule**: Every balance, rate, fee, and percentage in a table or breakdown row uses `font-mono tabular-nums`. No exceptions. This aligns decimal points across rows and makes at-a-glance comparison possible.

### 1.3 Spacing & Density

| Element | Padding | Margin |
| --- | --- | --- |
| Card | `p-4` (16px) | `mb-4` |
| Field label | `mb-1` (4px) | — |
| Field input | `py-2 px-3` (8px 12px) | `w-full` |
| Button | `px-4 py-2` (16px 8px) | `gap-2` |
| Table cell | `px-3 py-2` | — |
| Section gap | `gap-6` (24px) | — |
| Rail gap (two-column) | `gap-4` | — |

**RTL spacing**: `[dir="rtl"]` adds `line-height: 1.8` to body text; mono numerics remain at `line-height: normal` (LTR inside RTL context).

---

## 2. Interactive Patterns

### 2.1 Corridor Selector

**Layout**: Horizontal capsule bar in the `Header` component. Each capsule is a region-grouped chip:

```
[ 🇺🇸 USD → 🇵🇰 PKR ⇄ ]  [ 🇺🇸 USD → 🇮🇳 INR ]  [ 🇪🇺 EUR → 🇵🇰 PKR ]  …
```

**Interaction**:
- Click any capsule → navigate to `/[slug]/calculator`
- `⇄` invert button swaps base/target currencies (only available for corridors with a reverse entry)
- "Not audited" status pill (amber) appears on long-tail corridors without authored bank records
- Keyboard: `Tab` cycles capsules; `Enter` activates; `ArrowRight`/`ArrowLeft` moves between capsules

**Visual state**:
- Active corridor: emerald border + emerald background tint (`bg-emerald-50 dark:bg-emerald-950/30`)
- Inverted corridor: `transform rotate-180` spin animation on the `⇄` icon (150ms)

### 2.2 Visual Banking Hop Chain

**SVG diagram** (rendered inside `SwiftRouteInspector.tsx` and the calculator's Tab 2):

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Sender     │────▶│  Correspondent   │────▶│  Receiving      │
│  (Client)   │     │  Node            │     │  Bank           │
│  e.g. Chase │     │  CHASUS33 /      │     │  Meezan Bank    │
│  NY         │     │  CITIUS33 /      │     │  MZNBPKKA       │
│             │     │  $15–$25 cut     │     │  Raast → account│
└─────────────┘     └──────────────────┘     └─────────────────┘
     ▲                                       ▲
     │                                       │
  Our wire                              Local clearing
  instruction                           fee (PKR 500)
```

**Rail badge** (right side of each node):
- 🟢 Instant (IRG) — RTGS / IPS / Fast payment rail
- 🟡 Same-Day Express — standard telegraphic
- 🔴 2–3 Business Days — manual paper advice

**Double-dip flag**: Amber triangle with "$$" icon when both the correspondent node and receiving bank declare a charge. Emerald checkmark when the correspondent absorbs the fee (OUR mode).

### 2.3 Dynamic Breakdown Drawer

**Location**: Below the verdict card in the calculator; expandable row per fee layer.

| Row | Label | Value Format | Color |
| --- | --- | --- | --- |
| Gross Billed | `$1,000.00` | `font-mono tabular-nums` | foreground |
| Platform Cut | `−$100.00 (10%)` | `font-mono tabular-nums` | muted-foreground |
| Intermediary SWIFT | `−$25.00` | `font-mono tabular-nums` | warning (amber) |
| Net After Wire | `$875.00` | `font-mono tabular-nums` | foreground |
| FX Spread Leak | `−$31.25 (3.5%)` | `font-mono tabular-nums` | danger (rose) |
| Converted Local | `Rs 243,750` | `font-mono tabular-nums` | foreground |
| Landing Fee | `−Rs 500` | `font-mono tabular-nums` | warning (amber) |
| Statutory Withholding | `−Rs 609` (0.25%) | `font-mono tabular-nums` | warning (amber) |
| **Real Take-Home** | **Rs 242,641** | `font-mono tabular-nums font-bold` | **accent (emerald)** |

**Animation**: Drawer rows stagger-fade in (50ms delay per row) on calc update. No spring physics; deterministic layout shifts.

### 2.4 Slider Controls

**Surcharge/Retainer slider** (0–15%):
- Track: `h-2 rounded-full bg-slate-200 dark:bg-slate-700`
- Thumb: `w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-emerald-300`
- Label: `text-xs font-mono tabular-nums` showing current percent
- Step: `0.5` (half-percent granularity)

**SWIFT wire cost slider** ($0–$40):
- Same visual treatment
- Defaults to the corridor's `intermediaryUSD` benchmark
- Drags update the waterfall in real time (debounced at 16ms via `requestAnimationFrame`)

### 2.5 Verdict Card

**Layout** (full-width, gradient CTA):
```
┌─────────────────────────────────────────────────────────┐
│  To receive exactly Rs 242,641, invoice for             │
│  $1,000.00 USD via Upwork · Wise                        │
│                                                         │
│  [ Save $31.25 via Wise →  Official partner rate ·      │
│                          Regulated local clearing ]     │
│                                                         │
│  🔗 Copy Link  📤 Reddit  𝕏 X  💼 LinkedIn              │
└─────────────────────────────────────────────────────────┘
```

**CTA gradient**: `bg-gradient-to-r from-emerald-600 to-emerald-500` (light) / `from-emerald-500 to-emerald-400` (dark). Internal text: white. External-link arrow icon on the right.

**Trust subtext** (below CTA, `text-xs muted-foreground`):
> Official partner rate · Regulated local clearing · Zero hidden spreads

---

## 3. Embed Widget Guidelines

### 3.1 Iframe Container

**Dimensions**: `width: 100%`; height synchronized via `postMessage`:
```javascript
// Inside embed page
window.parent.postMessage({ type: 'payoutdelta-height', height: document.documentElement.scrollHeight }, '*');
```
```javascript
// Inside parent (consumer page)
window.addEventListener('message', (e) => {
  if (e.data?.type === 'payoutdelta-height') {
    iframe.style.height = `${e.data.height}px`;
  }
});
```

### 3.2 Chrome Suppression

The embed layout (`app/embed/layout.tsx`) injects a document-global `<style>` block:

```css
/* Zero-JS chrome suppression for embed context */
header, footer, .market-status, .nav, .sidebar, .footer-columns {
  display: none !important;
}
```

This runs before any React hydration; the iframe content is clean HTML from the first byte.

### 3.3 Forced-Dark Card

Embed cards use `data-theme="dark"` regardless of the consumer's preference:

```html
<div data-theme="dark" class="payoutdelta-embed-card">
  <!-- Card content -->
</div>
```

CSS variables are overridden in the embed layout's `<style>` to fix the dark palette. Transparent `body` background ensures the card blends with any consumer page.

### 3.4 Backlink Badge

Every embed card includes:
```html
<a href="https://ahmadbilaldsa.github.io/payout-delta/calculator/usd-to-pkr"
   class="payoutdelta-backlink">
  Verified by PayoutDelta ↗
</a>
```

The `basePath` is resolved at build time via `next.config.mjs` `assetPrefix` so links are correct on both `payout-delta.github.io` and any custom domain deploy.

---

## 4. Print Styles

### 4.1 Invoice Print (`@page`)

```css
@page {
  size: A4 portrait;
  margin: 0;
}

#print-area {
  display: block;
}

.no-print {
  display: none !important;
}

#invoice-document {
  width: 210mm;
  min-height: 297mm;
  padding: 20mm;
  background: #FFFFFF;
  color: #0f172a;
}
```

### 4.2 PRC Letter Print

```css
.prc-letter {
  width: 210mm;
  min-height: 297mm;
  padding: 25mm 20mm;
  background: #FFFFFF;
  color: #0f172a;
  font-family: "Times New Roman", serif;
  line-height: 1.6;
}

@media print {
  .prc-letter {
    page: prc-letter;
    break-after: page;
  }
  /* Hide everything else */
  body *:not(.prc-letter) { display: none !important; }
  .prc-letter { display: block !important; }
}
```

### 4.3 Contract Addendum Print

Same pattern as PRC letter but with executive typography (system sans-serif, `font-size: 11pt`, `line-height: 1.5`):

```css
.contract-addendum {
  width: 210mm;
  min-height: 297mm;
  padding: 25mm 20mm;
  background: #FFFFFF;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

### 4.4 Tax Ledger Print

Multi-page white audit package. The dashboard chrome hides via `.no-print`; the `.tax-ledger-print-area` re-renders as a dedicated white multi-page flow with row banding and a summary footer per page.

---

## 5. Component Anatomy Reference

### 5.1 Card Shell

```tsx
<div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
    {badge && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{badge}</span>}
  </div>
  {children}
</div>
```

### 5.2 Field Component (shared across all forms)

```tsx
interface FieldProps {
  label: string;
  value: string;
  onChange: (raw: string) => void;   // raw string → sanitizeFinancialInput → parse
  type?: 'text' | 'number' | 'email' | 'date';
  placeholder?: string;
  helpText?: string;
  error?: string;
}
```

On every `onChange`: `const sanitized = sanitizeFinancialInput(raw); props.onChange(sanitized);`

### 5.3 Badge Variants

| Variant | Class | Use Case |
| --- | --- | --- |
| `badge-emerald` | `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300` | Positive deltas, verified status, low spreads |
| `badge-amber` | `bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300` | Warnings, non-filer rates, not-audited corridors |
| `badge-rose` | `bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300` | High intermediary cuts, double-dip risk |
| `badge-slate` | `bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300` | Neutral metadata, ISO codes |

---

## 6. Motion & Transition Policy

| Element | Transition | Duration |
| --- | --- | --- |
| Card hover | `transform scale(1.01)` + shadow increase | 150ms ease-out |
| Drawer row appear | `opacity: 0 → 1`, `translateY: 4px → 0` | 50ms stagger |
| Theme toggle | CSS `color-scheme` swap; no animated transition (avoids FOUC) | Instant |
| Currency switcher invert | `rotate-180deg` on `⇄` icon | 150ms linear |
| Slider thumb | `transform scale(1.1)` on active | 100ms ease |
| Toast appear/dismiss | `opacity: 0 → 1` / `1 → 0`, `translateY: 8px → 0` | 200ms ease |

**No motion** for: layout reflows, table row sorting, SVG sparkline redraws. These are deterministic and do not animate to avoid distracting from numerical comparison.

---

## 7. Responsive Breakpoints

| Breakpoint | Layout Shift |
| --- | --- |
| `<640px` (sm) | Single column; all cards stack vertically; slider controls full-width |
| `≥640px` (md) | Calculator two-rail grid: left rail (inputs + waterfall) / right rail (verdict + tax card, sticky `lg:top-20`) |
| `≥1024px` (lg) | Full two-rail layout; right rail sticks on scroll; corridor directory 3-column grid |
| `≥1280px` (xl) | Maximum content width `max-w-6xl`; sidebar nav visible |

**Touch targets**: Minimum `44px × 44px` for all interactive elements (slider thumbs, buttons, capsule chips) per WCAG 2.1 AA.
