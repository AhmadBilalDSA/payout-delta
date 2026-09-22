/**
 * Fixed ad slot. Kept intentionally dumb (static height, no JS) so the layout
 * never CLS-shifts; an ad network or affiliate widget can mount into the
 * placeholder container at runtime.
 *
 * PHASE 2: swap this for an <ins class="adsbygoogle"> / Ezoic / Mediavine
 * snippet behind an `adEnabled` data flag. Because the whole site is a static
 * export, revenue/non-revenue builds can be emitted from one config switch —
 * `next build` with `process.env.NEXT_PUBLIC_ADS === "on"` renders the live
 * vendor tags, otherwise leaves the placeholder.
 */
export default function AdSlot() {
  return (
    <div
      aria-label="Advertisement placeholder"
      className="flex min-h-[90px] w-full items-center justify-center border-b border-slate-300 bg-slate-200"
    >
      <span className="text-xs font-medium text-slate-500">
        Advertisement placeholder 970×90
      </span>
    </div>
  );
}