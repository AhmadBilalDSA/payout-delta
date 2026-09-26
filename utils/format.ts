import type { Corridor } from "@/lib/types";
import { DATASET_CURRENCY, formatInBaseCurrency } from "@/lib/currency";
import type { BaseCurrency } from "@/lib/currency";

/**
 * Shared currency formatters. Every figure in the calculator renders through
 * these so `tabular-nums` stays the single source of truth for CLS-free
 * numeric alignment while the slider moves.
 */

/**
 * `1,234.56` or `$1,234.56` — fixed two-decimal money.
 *
 * `currency` defaults to the dataset's own USD accounting unit, so every
 * existing call site keeps its exact previous output. Passing a settlement
 * currency re-bases the amount for display only; the figure itself is still the
 * dataset's USD number, converted by the single deterministic rate table in
 * `lib/currency.ts` so the calculator, the waterfall and the bank dossiers can
 * never quote the same fee at two different values.
 */
export function formatUSD(amount: number, currency: BaseCurrency = DATASET_CURRENCY): string {
  if (currency === DATASET_CURRENCY) {
    return `$${amount.toFixed(2)}`;
  }
  return `${currency} ${formatInBaseCurrency(amount, currency, 2)}`;
}

/** `Rs 500,000` — integer local currency with the corridor's symbol. */
export function formatLocal(amount: number, corridor: Corridor): string {
  return `${corridor.currencySymbol} ${Math.round(amount).toLocaleString(
    "en-US"
  )}`;
}