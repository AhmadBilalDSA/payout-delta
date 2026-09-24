import { getCorridors, getDataset } from "@/lib/db";

/**
 * Market status strip — replaces the fixed 970×90 ad placeholder.
 *
 * A quiet, data-true readout of what the audit actually covers: corridor
 * count and the fee-dataset revision date, baked from the static dataset at
 * build time (zero runtime network). Kept slim and unobtrusive so the header
 * stack stays content-first under the sticky chrome.
 */
export default function MarketStatusBar() {
  const corridorCount = getCorridors().length;
  const revised = getDataset().updatedAt.slice(0, 10);

  return (
    <aside
      aria-label="Market data status"
      className="no-print border-b border-slate-800/60 bg-slate-950/70"
    >
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-[11px] text-slate-400 sm:px-6">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
          />
          <span className="truncate">
            {corridorCount} audited payout corridors · fee data revised {revised}
          </span>
        </span>
        <span className="hidden shrink-0 truncate text-slate-400 dark:text-slate-300 sm:inline">
          Quote audit runs 100% client-side — nothing leaves your browser
        </span>
      </div>
    </aside>
  );
}