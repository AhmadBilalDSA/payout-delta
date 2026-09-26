"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  BASE_CURRENCIES,
  DATASET_CURRENCY,
  STATIC_RATE_NOTICE,
  formatInBaseCurrency,
  fromUsdToBase,
  isRebased,
  toBaseCurrency,
} from "@/lib/currency";
import type { BaseCurrency } from "@/lib/currency";
import { BASE_CURRENCY_KEY, readLocalStorage, writeLocalStorage } from "@/lib/privacyGuard";

/**
 * PayoutDelta — global settlement-currency provider.
 *
 * Holds the single piece of client state every money surface needs: which
 * settlement currency the reader wants their figures expressed in. Scoped at
 * the root so the header switcher, the calculator, the waterfall, the invoice
 * studio and the bank dossiers all read the same value — one source of truth,
 * so a figure can never be quoted in USD on one panel and AED on the next.
 *
 * Hydration is mismatch-safe by construction, identical to `LanguageProvider`:
 * the first render is always the dataset currency (USD), which makes the SSR
 * and client HTML byte-identical, and the stored preference is applied in a
 * mount effect afterwards. Because the conversion is a pure function of the
 * stored preference, a USD reader sees the dataset's own numbers untouched.
 *
 * The re-basing is a *presentation* layer only. Nothing in `data/` is mutated,
 * the gross-up solver still runs in USD, and `STATIC_RATE_NOTICE` travels with
 * every rebased figure so no reader mistakes a static reference rate for a
 * live quote.
 */

interface BaseCurrencyContextValue {
  /** Currently selected settlement currency. */
  currency: BaseCurrency;
  /** Selectable currencies, in switcher order. */
  options: readonly BaseCurrency[];
  /** True when the reader has moved off the dataset's own USD accounting. */
  isRebased: boolean;
  /** Formats a USD figure in the active settlement currency. */
  format: (usd: number, dp?: number) => string;
  /** Converts a USD figure into the active settlement currency. */
  convert: (usd: number) => number;
  /** The static-rate caveat, surfaced verbatim wherever figures are rebased. */
  notice: string;
  setCurrency: (currency: BaseCurrency) => void;
}

const BaseCurrencyContext = createContext<BaseCurrencyContextValue | null>(null);

export function BaseCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<BaseCurrency>(DATASET_CURRENCY);

  // Apply the stored preference once, after mount, so the first render matches
  // the server exactly and the switcher never flickers on hydration. Deferred
  // through a zero-timeout for the same reason as `LanguageProvider`: the
  // storage read is a browser-only side effect, and setting state straight from
  // the effect body would cascade a second render pass.
  useEffect(() => {
    const applyStoredCurrency = () => {
      const stored = readLocalStorage(BASE_CURRENCY_KEY);
      if (stored === null) return;
      const next = toBaseCurrency(stored);
      if (next !== DATASET_CURRENCY) setCurrencyState(next);
    };
    const id = window.setTimeout(applyStoredCurrency, 0);
    return () => window.clearTimeout(id);
  }, []);

  const setCurrency = useCallback((next: BaseCurrency) => {
    const safe = toBaseCurrency(next);
    setCurrencyState(safe);
    writeLocalStorage(BASE_CURRENCY_KEY, safe);
  }, []);

  const value = useMemo<BaseCurrencyContextValue>(() => {
    const rebased = isRebased(currency);
    return {
      currency,
      options: BASE_CURRENCIES,
      isRebased: rebased,
      format: (usd: number, dp = 2) => formatInBaseCurrency(usd, currency, dp),
      convert: (usd: number) => fromUsdToBase(usd, currency),
      notice: STATIC_RATE_NOTICE,
      setCurrency,
    };
  }, [currency, setCurrency]);

  return (
    <BaseCurrencyContext.Provider value={value}>
      {children}
    </BaseCurrencyContext.Provider>
  );
}

/**
 * Reads the settlement-currency context. Throws outside the provider so a
 * misplaced consumer fails loudly in development rather than rendering a
 * silently-USD figure next to a rebased one.
 */
export function useBaseCurrency(): BaseCurrencyContextValue {
  const context = useContext(BaseCurrencyContext);
  if (context === null) {
    throw new Error("useBaseCurrency must be used within a BaseCurrencyProvider");
  }
  return context;
}
