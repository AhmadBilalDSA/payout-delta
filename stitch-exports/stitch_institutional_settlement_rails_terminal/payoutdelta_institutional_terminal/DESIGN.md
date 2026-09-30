---
name: PayoutDelta Institutional Terminal
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#bbcac0'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#85948b'
  outline-variant: '#3c4a42'
  surface-tint: '#45dfa4'
  primary: '#5af0b3'
  on-primary: '#003825'
  primary-container: '#34d399'
  on-primary-container: '#00563b'
  inverse-primary: '#006c4b'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#ffd16d'
  on-tertiary: '#402d00'
  tertiary-container: '#ecb210'
  on-tertiary-container: '#614700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#68fcbf'
  primary-fixed-dim: '#45dfa4'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 1.25rem
    fontWeight: '500'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: 0.01em
  mono-num-xl:
    fontFamily: JetBrains Mono
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  mono-num-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.25rem
    fontWeight: '500'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  mono-num-md:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0em
  mono-num-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style
This design system defines an institutional-grade financial operations surface built for corporate treasury officers, liquidity managers, and payment operations engineers. The visual atmosphere balances the utilitarian density of Linear with the precision polish of Stripe and the cross-border clarity of Wise.

The interface prioritizes immediate legibility, high color distinction for transaction flows, and zero decorative noise. Interaction models must communicate real-time solvency, execution finality, and settlement transparency without decorative artifacts or futuristic styling.

## Colors
The color architecture relies on a specialized dark workspace engineered to reduce eye strain during extended reconciliation sessions while maintaining strict WCAG AAA contrast ratios for all critical figures.

- **Canvas & Structural Surfaces**: Deep obsidian `#0a0e17` serves as the base layer, overlaid by `#121826` for functional panels and card surfaces. Elevated flyouts and tooltips utilize `#1a2234`.
- **Borders & Dividers**: Hairline borders strictly utilize `rgba(255, 255, 255, 0.08)` to segment information without drawing visual priority away from data.
- **Semantic Accents**:
  - **Emerald-400 (`#34d399`)**: Net received volume, positive FX spread, executed settlement, and direct low-friction rails.
  - **Sky-400 (`#38bdf8`)**: Interbank corridors, routing hops, messaging states, and selected active rails.
  - **Amber-400 (`#fbbf24`)**: Intermediary correspondent bank fees, SWIFT parsing delays, and escrow pending statuses.
  - **Rose-400 (`#f87171`)**: Bank deductions, lifted margin alerts, compliance holds, and route failures.
- **Typography Tones**: Slate-50 (`#f8fafc`) for primary amounts, Slate-400 (`#94a3b8`) for secondary labels and currency ISO codes, and Slate-600 (`#475569`) for disabled states and metadata stamps.

## Typography
Typography is split into two specialized engines:
1. **Structural Text & Interface Copy**: Built on Geist for optical balance, compact vertical height, and clear neutral letterforms that keep dense layouts uncluttered.
2. **Numeric Data & Transaction Payloads**: Built on JetBrains Mono with explicit `tabular-nums` alignment enabled. All currency values, fee schedules, timestamps, SWIFT/BIC codes, blockchain hashes, and basis point metrics are strictly locked to the monospace stack to allow immediate visual reconciliation down column grids.

## Layout & Spacing
The layout follows a fluid-dense approach across 12 structured columns with tight component spacing to support institutional data density.

- **Breakpoints**: Mobile (320px–639px), Tablet/Laptop (640px–1023px), Enterprise Desktop (1024px–1440px), and Ultra-wide Multi-terminal (1441px+).
- **Desktop Grid**: 12-column layout with 24px outer margins and 16px to 24px gutters. Key modules (e.g., Cross-Border Corridor Map, Cost Breakdown Waterfall, and Real-Time Settlement Ledger) span 8:4 or 6:6 layouts.
- **Mobile Reflow**: On screens below 768px, horizontal corridor cascades reflow into stacked vertical steps. Tabular data pivots to sticky-header virtualized lists with numeric values pinned along the right margin.
- **Rhythm**: Spacing primitives adhere strictly to a 4px baseline, defaulting to `0.5rem` (`space-sm`) and `0.75rem` (`space-md`) for interior card controls to maximize visible metrics above the fold.

## Elevation & Depth
This design system avoids diffused blurs, drop shadows, and glassmorphic filters in favor of architectural surface hierarchy:

1. **Level 0 (Canvas Base)**: `#0a0e17` solid background. Holds global telemetry status bars and navigation rails.
2. **Level 1 (Card & Module Layer)**: `#121826` with a uniform `1px solid rgba(255, 255, 255, 0.08)` outline. All operational modules exist at this layer.
3. **Level 2 (Internal Wells & Inset Fields)**: `#0c121e` inset with a sub-surface `1px solid rgba(255, 255, 255, 0.04)` border for input wells, code inspectors, and FX delta boxes.
4. **Level 3 (Overlays & Context Panels)**: `#1a2234` bounded by `1px solid rgba(255, 255, 255, 0.14)` and a single sharp directional shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.6)`. Used exclusively for transaction detail drawers, audit drill-downs, and currency pickers.

## Shapes
The terminal uses a compact, structured geometry. Corner radiuses follow subtle transitions:
- Base controls, buttons, table row highlights, and form fields use `rounded` (4px / 0.25rem).
- Analytical cards, routing step modules, and settlement wrappers use `rounded-md` (6px / 0.375rem) to `rounded-lg` (8px / 0.5rem).
- Status indicators, execution chips, and badge markers use `rounded-full` or strict rectangular tags with 2px radiuses. Never apply aggressive rounded-2xl or pill curves to functional treasury tables.

## Components

### Buttons
- **Primary Execution (Direct Route)**: Emerald-400 background (`#34d399`), black text (`#0a0e17`), font-weight 600, 4px border radius. Hover: `#22c55e`. Active: Scale to 98% with ring indicator.
- **Secondary (Routing Analysis/Export)**: Surface-card background (`#121826`), Slate-200 text, 1px border (`rgba(255, 255, 255, 0.08)`). Hover: Border changes to `rgba(255, 255, 255, 0.2)`.
- **Destructive/Halt**: Rose-500/10 background, Rose-400 text, 1px border (`rgba(248, 113, 113, 0.2)`). Hover: Rose-500/20.

### Input Fields & Selectors
- Background: Inset surface `#0c121e`.
- Border: `1px solid rgba(255, 255, 255, 0.08)`, transitioning to `1px solid #38bdf8` (Sky-400) on focus, with zero external blur ring.
- Numeric inputs use JetBrains Mono exclusively, right-aligned with fixed currency unit tokens locked to the left margin.

### Chips & Semantic Status Badges
- Displayed with JetBrains Mono `label-caps`. Height: 20px. Padding: 2px 6px.
- **Low Friction/Settled**: `bg-emerald-950/40 border border-emerald-500/30 text-emerald-400`.
- **Intermediary Fee Applied**: `bg-amber-950/40 border border-amber-500/30 text-amber-400`.
- **Deduction/Lifting Fee**: `bg-rose-950/40 border border-rose-500/30 text-rose-400`.
- **Active Corridor**: `bg-sky-950/40 border border-sky-500/30 text-sky-400`.

### Cards & Data Panels
- Surface: `#121826`.
- Structural Border: `1px solid rgba(255, 255, 255, 0.08)`.
- Header section separated by a horizontal `1px solid rgba(255, 255, 255, 0.06)` rule with 12px vertical padding.

### Settlement Ledger & Lists
- Row heights locked to 40px for dense view and 48px for standard view.
- Alternating subtle stripe pattern or clean row border-bottom `1px solid rgba(255, 255, 255, 0.04)`.
- Hover row state: Background switches to `rgba(255, 255, 255, 0.02)`.

### Route Breakdown Waterfall (Domain-Specific)
- Linear chain visualization linking Sender Bank → Intermediary Correspondent(s) → Clearing System (ACH/SEPA/FedNow) → Beneficiary Bank.
- Line connectors: `1px solid rgba(255, 255, 255, 0.15)`, highlighted dynamically in Sky-400 or Amber-400 to indicate fee deduction stages.