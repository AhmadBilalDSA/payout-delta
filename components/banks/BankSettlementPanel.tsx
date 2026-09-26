"use client";

import { useBaseCurrency } from "@/components/providers/BaseCurrencyProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { ChargeCode } from "@/data/banks";

/**
 * Settlement rail + field 71A charge-code panel for a bank dossier.
 *
 * A client component on purpose: the dossier page is a server component, so it
 * passes the audited facts in as plain props and this panel owns the two pieces
 * of browser state the facts need to be *readable* — the active locale and the
 * reader's settlement currency. The average intermediary cut is therefore shown
 * in whichever currency the reader picked, with the dataset's own USD figure
 * kept alongside it whenever a re-basing is active, so the rebased number can
 * never quietly replace the audited one.
 */
export default function BankSettlementPanel({
  rail,
  chargeCodes,
  recommended,
  note,
  averageIntermediaryCutUSD,
  transitTimeHours,
  instantRail,
}: {
  rail: string;
  chargeCodes: ChargeCode[];
  recommended: ChargeCode;
  note: string;
  averageIntermediaryCutUSD: number;
  transitTimeHours: number;
  /** True when the destination rail credits in real time. */
  instantRail?: boolean;
}) {
  const { t } = useLanguage();
  const { format, currency, isRebased: rebased } = useBaseCurrency();

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          {t("bankSettlementRail")}
        </p>
        <p className="mt-1.5 text-sm leading-snug font-semibold text-slate-900 dark:text-white">
          {rail}
        </p>
        <p className="mt-2 font-mono text-xs font-semibold text-slate-600 tabular-nums dark:text-slate-300">
          {transitTimeHours}h
          <span className="ml-1 font-sans font-medium text-black/[0.45] dark:text-white/[0.45]">
            {t("bankAvgTransit")}
            {instantRail ? " · T+0" : ""}
          </span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          {t("bankAverageCut")}
        </p>
        <p className="mt-1.5 font-mono text-lg leading-none font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
          {currency} {format(averageIntermediaryCutUSD)}
        </p>
        {rebased && (
          <p className="mt-2 font-mono text-[11px] text-black/[0.45] tabular-nums dark:text-white/[0.45]">
            USD {format(averageIntermediaryCutUSD)}{" "}
            <span className="font-sans">{t("rebasedFromUsd")}</span>
          </p>
        )}
      </div>

      <div className="sm:col-span-2">
        <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          {t("bankChargeCodes")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {chargeCodes.map((code) => (
            <span
              key={code}
              className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${
                code === recommended
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400"
              }`}
            >
              {code}
              {code === recommended ? (
                <span className="ml-1 font-sans font-semibold">
                  · {t("bankRecommended")}
                </span>
              ) : null}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-black/[0.55] dark:text-white/55">
          {note}
        </p>
      </div>
    </div>
  );
}
