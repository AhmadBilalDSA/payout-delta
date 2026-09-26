"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { useBaseCurrency } from "@/components/providers/BaseCurrencyProvider";
import { BASE_CURRENCY_LABELS } from "@/lib/currency";
import type { BaseCurrency } from "@/lib/currency";

/**
 * Settlement-currency switcher — a native `<select>` in the header's utility
 * zone.
 *
 * Native rather than a custom dropdown on purpose: it is the only control in
 * the shell whose whole job is picking one value out of a closed set of six, so
 * the platform control already has the right keyboard, screen-reader and
 * mobile-wheel behaviour for free. No dependency, no portal, no focus trap to
 * get wrong, and it inherits the header's own focus ring.
 *
 * Presentation only — this re-bases the *display* of USD-authored figures. It
 * never mutates the dataset, and the static-rate caveat is carried on the
 * `title` attribute and in the option labels so a reader can never mistake a
 * converted figure for a live quote.
 */
export default function BaseCurrencySwitcher() {
  const { t } = useLanguage();
  const { currency, options, setCurrency, isRebased: rebased } = useBaseCurrency();

  return (
    <label
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
        rebased
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-slate-700 bg-slate-800/40 text-slate-200"
      }`}
      title={rebased ? t("rebasedNotice") : t("baseCurrencyHint")}
    >
      <span className="sr-only">{t("baseCurrencySelect")}</span>
      <span aria-hidden="true" className="opacity-60">
        {t("baseCurrency")}
      </span>
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as BaseCurrency)}
        aria-label={t("baseCurrencySelect")}
        className="cursor-pointer appearance-none bg-transparent pr-0.5 font-mono font-bold tracking-wide text-current outline-none"
      >
        {options.map((code) => (
          <option
            key={code}
            value={code}
            className="bg-slate-900 text-slate-100"
          >
            {code} · {BASE_CURRENCY_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
