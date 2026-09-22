import type { Corridor } from "@/lib/types";

/**
 * Shared currency formatters. Every figure in the calculator renders through
 * these so `tabular-nums` stays the single source of truth for CLS-free
 * numeric alignment while the slider moves.
 */

/** `$1,234.56` — fixed two-decimal USD. */
export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** `Rs 500,000` — integer local currency with the corridor's symbol. */
export function formatLocal(amount: number, corridor: Corridor): string {
  return `${corridor.currencySymbol} ${Math.round(amount).toLocaleString(
    "en-US"
  )}`;
}