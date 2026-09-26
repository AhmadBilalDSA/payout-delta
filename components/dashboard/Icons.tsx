/**
 * PayoutDelta — Dashboard v3 hand-rolled icon set.
 *
 * Zero-dependency rule (AGENTS.md §2): no icon pack, no runtime chart or
 * animation dependency. Every glyph below is inline `<svg>` geometry on a
 * shared 24×24 grid, stroked with `currentColor` at `strokeWidth={1.5}` so an
 * icon inherits the colour of whatever it sits inside (emerald for money, amber
 * for leakage, slate for chrome) with no per-icon colour prop at all.
 *
 * House style, per the design system: simple line icons at 16–20px, no fills,
 * no emoji, no gradients, no drop shadows. `aria-hidden` is the default on every
 * glyph because each one is decorative — every call site in this feature also
 * renders the same information as real text, so assistive tech never depends on
 * a shape it cannot announce.
 *
 * No `"use client"` directive on purpose: this module is pure presentational
 * SVG, so server components may import it too. Each icon accepts `size` (px) and
 * `className` so callers can set the optical weight and the motion behaviour
 * per hover state.
 */

import type { SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Rendered edge length in px. The design system caps these at 16–20. */
  size?: number;
}

/** Shared geometry props: 24 grid, hairline stroke, no fill, decorative. */
function glyph(size: number, className: string | undefined) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    className,
  };
}

/** Fee Auditor — the primary calculator surface. */
export function CalculatorIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg {...glyph(size, className)} {...rest}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M7.5 7.5h9" />
      <path d="M8 12.5h1.5M14.5 12.5H16M8 17h1.5M14.5 17H16" />
    </svg>
  );
}

/** Invoice Studio — a receipt with its characteristic torn edge. */
export function InvoiceIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg {...glyph(size, className)} {...rest}>
      <path d="M5.5 3.5h13v17l-2.6-1.7-2.6 1.7-2.6-1.7-2.6 1.7-2.6-1.7z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </svg>
  );
}

/** Tax Ledger — an open two-page book with a centre spine. */
export function LedgerIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg {...glyph(size, className)} {...rest}>
      <path d="M12 4v16" />
      <path d="M4.5 6.5A2 2 0 0 1 6.5 4.5H12v15H6.5a2 2 0 0 0-2 2z" />
      <path d="M19.5 6.5a2 2 0 0 0-2-2H12v15h5.5a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Leaderboard — a trophy with two handles on a plinth. */
export function LeaderboardIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg {...glyph(size, className)} {...rest}>
      <path d="M8 4.5h8v4.5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5.5v1.5A3.5 3.5 0 0 0 8 10.5M16 6h2.5v1.5A3.5 3.5 0 0 1 16 10.5" />
      <path d="M12 13v3.5" />
      <path d="M8.5 20h7" />
    </svg>
  );
}

/** Bank dossiers — a pediment on four columns. */
export function BankBuildingIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg {...glyph(size, className)} {...rest}>
      <path d="M3.5 9.5 12 4.5l8.5 5" />
      <path d="M6.5 12v5.5M10 12v5.5M14 12v5.5M17.5 12v5.5" />
      <path d="M3.5 18.5h17M3.5 20.5h17" />
    </svg>
  );
}

/** Compare — two opposing horizontal arrows. */
export function CompareIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg {...glyph(size, className)} {...rest}>
      <path d="M4 8.5h13M14 5.5l3 3-3 3" />
      <path d="M20 15.5H7M10 12.5l-3 3 3 3" />
    </svg>
  );
}

/** Agencies — a pair of people, the roster the agency engine audits. */
export function AgencyIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg {...glyph(size, className)} {...rest}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 5.6a3 3 0 0 1 0 5.3" />
      <path d="M17 14.6a4.6 4.6 0 0 1 3.5 4.9" />
    </svg>
  );
}

/** The clearing terminal — a console window with a prompt. */
export function TerminalIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg {...glyph(size, className)} {...rest}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M7.5 9.5 10 12l-2.5 2.5" />
      <path d="M12.5 15.5h4" />
    </svg>
  );
}

/**
 * Disclosure chevron. Rotates 180° off an `[open]` prop rather than shipping
 * two glyphs, so the Diagnostic Tier accordion can animate the single element
 * rather than cross-fading two.
 */
export function ChevronIcon({
  size = 18,
  className,
  open = false,
  ...rest
}: IconProps & { open?: boolean }) {
  return (
    <svg
      {...glyph(size, className)}
      style={{
        transform: open ? "rotate(180deg)" : undefined,
        transition: "transform 200ms ease-out",
      }}
      {...rest}
    >
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}
