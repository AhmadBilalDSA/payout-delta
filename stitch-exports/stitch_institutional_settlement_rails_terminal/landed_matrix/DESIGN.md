---
name: Landed Matrix
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-numeric:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  label-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system targets modern global businesses, contractors, and individuals moving capital internationally. The experience prioritizes radical fee transparency, computational speed, and uncompromised clarity over ornamentation. The UI evokes a sense of algorithmic precision, financial trustworthiness, and friction-free interaction, inspired by the high-density utility of Stripe and the customer-centric transparency of Wise.

The visual style is **Technical Minimalism with Soft Dark Precision**. It pairs deep obsidian slate surfaces with subtle translucent stroke boundaries, avoiding visual clutter while delivering immediate readability of complex FX spreads, payment rail alternatives, and landed net payouts.

## Colors

The color system uses deep slate tones as the foundational canvas, establishing contrast without eye strain:
- **Canvas Base (`#0b0f19` / Slate-950)**: Deep void background that allows foreground interactive elements to pop.
- **Surface Elevation 1 (`#111827` / Slate-900)**: Container background for calculator panels, fee breakdowns, and modular cards.
- **Surface Elevation 2 (`#1e293b` / Slate-800)**: Input fields, currency select triggers, and hover states.
- **Primary Accent (`#10b981` / Emerald-500) & Highlight (`#34d399` / Emerald-400)**: Reserved for positive financial values—such as recipient net landed amount, cost savings versus traditional banks, and completed execution states.
- **Secondary (`#38bdf8` / Sky-400)**: Used sparingly for informative rate-lock timers, FX spread indicators, and active payment rail tabs.
- **Tertiary (`#f59e0b` / Amber-500)**: Contextual warnings for market volatility, intermediate bank deductions, or weekend settlement delays.
- **Structural Lines (`rgba(255, 255, 255, 0.08)` / `#1e293b`)**: Crisp, low-contrast borders defining cards and input groups without distracting visual weight.
- **Text Palette**: Primary headers and amounts use `#f8fafc` (Slate-50), secondary labels use `#94a3b8` (Slate-400), and disabled/placeholder elements use `#64748b` (Slate-500).

## Typography

The type system blends Geist for structural headers, tabular figures, and currency amounts with Inter for high-legibility descriptive copy, tooltips, and legal disclosures.

- **Tabular Numerics**: All numeric inputs, currency amounts, fee breakdowns, and exchange rates require `font-feature-settings: "tnum" 1` to prevent jitter during live rate recalculations.
- **Hierarchy Rules**: The primary amount input and final landed payout amount dominate the visual weight, styled in `headline-xl` and `label-numeric` respectively. Auxiliary fees and FX spreads are styled in `body-sm` and `label-md` to maintain hierarchy.

## Layout & Spacing

The layout is built around a centralized, fixed-width responsive calculator container with structured margin safety zones:
- **Desktop (>= 1024px)**: Single calculator card maxes out at 580px width for simple transfers, expanding to a 2-column comparison layout (max 1080px) when displaying multi-rail side-by-side benchmarking.
- **Tablet (768px - 1023px)**: Centered column with `1.5rem` gutters and dynamic scaling containers.
- **Mobile (< 768px)**: Fluid full-width container respecting `1rem` edge margins. Input blocks stack vertically, and currency dropdowns open into bottom sheets.
- **Rhythm**: Payout breakdowns rely on an 8pt vertical spacing grid (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 16px, `space-lg` = 24px, `space-xl` = 40px) to establish visual grouping between calculation inputs, dynamic deductions, and execution triggers.

## Elevation & Depth

Visual hierarchy is maintained through subtle tonal layering and hairline borders rather than heavy drop shadows:
- **Ground Floor (Base Canvas)**: Flat `#0b0f19` surface.
- **Layer 1 (Card & Calculator Shell)**: Background `#111827` combined with a `1px` continuous border of `rgba(255, 255, 255, 0.08)`. An ultra-diffused ambient glow (`box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7)`) grounds the main calculator.
- **Layer 2 (Interactive Input Blocks & Flyouts)**: Background `#1e293b` with a default `1px` border of `rgba(255, 255, 255, 0.06)`. On focus, transitions to a border of `#10b981` paired with a focused glow (`box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15)`).
- **Floating Modals & Dropdowns**: Background `#182234` with `backdrop-filter: blur(12px)`, bordered by `rgba(255, 255, 255, 0.12)` with depth shadow `0 12px 28px -6px rgba(0, 0, 0, 0.85)`.

## Shapes

The interface embraces modern, rounded geometry to soften dark-mode technical density:
- **Outer Calculator Containers**: Styled with `rounded-2xl` (1.5rem) to create an approachable, encapsulated application feel.
- **Input Fields & Currency Selectors**: Styled with `rounded-xl` (1rem) for comfortable tap targets and cohesive nesting inside parent panels.
- **Badges, Pills & Currency Flags**: Styled with full pills (`rounded-full`) to differentiate metadata tags (e.g., "Guaranteed Rate", "Fastest") from actionable UI elements.

## Components

### Dual-Currency Input Field
- Combines a numeric payout amount input with an integrated currency selector button inside a unified `rounded-xl` container.
- Background: `#1e293b` with an inset `1px` border (`border-white/10`).
- Text size: Geist `label-numeric` for currency digits, right-aligned or left-aligned depending on locale, with high contrast `#f8fafc`.
- Focus State: Smooth 150ms ease transition to emerald ring highlight.

### Stepper Breakdown (The "Wire" Thread)
- A connected vertical chain connecting the "You Send" and "Recipient Gets" modules.
- Displays line-item fees (Wise-style): transfer fee, payment method fee, and guaranteed FX rate.
- Uses subtle circular nodes connected by a `1px` dashed line (`border-slate-700`).
- Sub-labels use `body-sm` (`#94a3b8`) with clickable popover links to explain spread definitions.

### Result / Payout Callout
- The landed recipient output box is visually anchored using a slight emerald tint overlay: `linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)`.
- Final recipient sum is displayed in `headline-xl` emerald (`#34d399`), accompanied by a pill badge showing the exact savings versus standard wire transfers.

### Buttons & Interactive CTA
- **Primary CTA**: Emerald fill (`#10b981`), hover state (`#059669`), text color deep slate (`#022c22`) at `fontWeight: 600`. Full width with `rounded-xl` geometry and generous `1rem` vertical padding.
- **Secondary / Ghost Button**: Transparent background, `1px` border of `border-white/10`, text color `#f8fafc`, hover background `rgba(255, 255, 255, 0.05)`.

### Currency Selector Drawer / Menu
- Trigger: Contains the country flag icon, ISO code in bold Geist (`USD`, `EUR`, `SGD`), and a downward chevron.
- Flyout: Includes an instant filter search input at the top, followed by a vertically scrolling list of supported currencies with currency names and localized symbol notation.

### Rate-Lock Timer Chip
- Compact pill element (`rounded-full`) featuring a pulsing emerald or amber dot.
- Text uses `label-sm` font with tabular numbering to display remaining rate-lock duration (e.g., "Rate locked for 48:00").