"use client";

import { useMemo, useState } from "react";

import type { Corridor } from "@/lib/types";
import { formatLocal, formatUSD } from "@/utils/format";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getRegionalBanking } from "@/data/regionalBanking";

/**
 * Phase 8 — Local Bank Settlement & Custom Costing.
 *
 * Full "true liquid take-home" waterfall anchored on the live best quote that
 * the calculator surface already computed:
 *
 *   1. Gross client bill
 *   2. − Platform cut
 *   3. − Intermediary SWIFT deduction   (bank benchmark, user-editable)
 *   4. Real conversion at the lowest-fee provider rate
 *   5. − Local receiving bank fee       (destination currency)
 *   6. − Net withholding tax            (regime-matched, 0–15% slider)
 *   7. = True liquid take-home
 *
 * Everything is client-side and wired into the global language dictionary
 * (`useLanguage()`); bank names, SWIFT codes and tax authority names are data.
 */
export default function TransactionCostingWidget({
  corridor,
  grossUSD,
  platformFeeUSD,
  effectiveRate,
  channelName,
}: {
  corridor: Corridor;
  grossUSD: number;
  platformFeeUSD: number;
  effectiveRate: number;
  channelName: string;
}) {
  const { t } = useLanguage();
  const banking = useMemo(() => getRegionalBanking(corridor.slug), [corridor.slug]);

  const [bankId, setBankId] = useState(banking.banks[0]?.id ?? "");
  const [jurisdictionId, setJurisdictionId] = useState(
    banking.jurisdictions[0]?.id ?? "none"
  );

  const bank = banking.banks.find((item) => item.id === bankId) ?? banking.banks[0];
  const jurisdiction =
    banking.jurisdictions.find((item) => item.id === jurisdictionId) ??
    banking.jurisdictions[0];

  const [wireUSD, setWireUSD] = useState(() =>
    bank ? Math.round(((bank.intermediaryMinUSD + bank.intermediaryMaxUSD) / 2) * 100) / 100 : 15
  );
  const [localFee, setLocalFee] = useState(() => bank?.localFeeDefault ?? 0);
  const [taxRate, setTaxRate] = useState(() => jurisdiction?.rate ?? 0);

  const selectBank = (id: string) => {
    setBankId(id);
    const next = banking.banks.find((item) => item.id === id);
    if (!next) return;
    setWireUSD(Math.round(((next.intermediaryMinUSD + next.intermediaryMaxUSD) / 2) * 100) / 100);
    setLocalFee(next.localFeeDefault);
  };

  const selectJurisdiction = (id: string) => {
    setJurisdictionId(id);
    const next = banking.jurisdictions.find((item) => item.id === id);
    if (next) setTaxRate(next.rate);
  };

  const safeGross = Number.isFinite(grossUSD) && grossUSD > 0 ? grossUSD : 0;
  const safePlatform = Number.isFinite(platformFeeUSD) ? Math.max(0, platformFeeUSD) : 0;
  const safeRate = Number.isFinite(effectiveRate) && effectiveRate > 0 ? effectiveRate : 0;
  const safeWire = Number.isFinite(wireUSD) ? Math.max(0, Math.min(200, wireUSD)) : 0;
  const safeFee = Number.isFinite(localFee) ? Math.max(0, localFee) : 0;
  const safeTax = Number.isFinite(taxRate) ? Math.min(0.15, Math.max(0, taxRate)) : 0;

  const netAfterPlatformUsd = Math.max(0, safeGross - safePlatform);
  const netAfterWireUsd = Math.max(0, netAfterPlatformUsd - safeWire);
  const convertedLocal = netAfterWireUsd * safeRate;
  const landedLocal = Math.max(0, convertedLocal - safeFee);
  const taxLocal = landedLocal * safeTax;
  const takeHomeLocal = Math.max(0, landedLocal - taxLocal);

  const taxPct = Math.round(safeTax * 10000) / 100;

  return (
    <section
      id="transaction-costing"
      aria-labelledby="transaction-costing-title"
      className="rounded-2xl border border-black/[0.06] bg-white p-5 dark:border-white/[0.08] dark:bg-[#15151A]"
    >
      <h2
        id="transaction-costing-title"
        className="text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40"
      >
        {t("txCostingTitle")}
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-black/[0.55] dark:text-white/[0.55]">
        {t("txCostingLead")}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            {t("bankSelector")}
          </span>
          <select
            value={bank?.id ?? ""}
            onChange={(event) => selectBank(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-200 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          >
            {banking.banks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}
              </option>
            ))}
          </select>
          {bank && (
            <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-black/60 dark:bg-neutral-800 dark:text-white/60">
                {bank.swiftCode !== "—"
                  ? t("bankSwift", { code: bank.swiftCode })
                  : bank.swiftCode}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-black/60 dark:bg-neutral-800 dark:text-white/60">
                {t("bankClearance", { time: bank.clearance })}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 tabular-nums text-black/60 dark:bg-neutral-800 dark:text-white/60">
                {t("bankIntermediaryBand", {
                  min: `$${bank.intermediaryMinUSD}`,
                  max: `$${bank.intermediaryMaxUSD}`,
                })}
              </span>
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            {t("jurisdictionSelector")}
          </span>
          <select
            value={jurisdiction?.id ?? "none"}
            onChange={(event) => selectJurisdiction(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-200 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          >
            {banking.jurisdictions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {Math.round(item.rate * 10000) / 100}%
              </option>
            ))}
          </select>
          {jurisdiction && (
            <span className="mt-1.5 block text-[11px] leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
              {jurisdiction.authority} — {jurisdiction.note}
            </span>
          )}
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            {t("swiftDeduction")}
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-black/50 dark:text-white/50">$</span>
            <input
              type="number"
              min={0}
              max={200}
              step={0.5}
              inputMode="decimal"
              value={safeWire}
              onChange={(event) => setWireUSD(Number(event.target.value))}
              aria-label={t("swiftDeduction")}
              className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            {t("localBankFee")}
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-black/50 dark:text-white/50">
              {corridor.currencySymbol}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="decimal"
              value={safeFee}
              onChange={(event) => setLocalFee(Number(event.target.value))}
              aria-label={t("localBankFee")}
              className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        </label>

        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="flex items-baseline justify-between text-xs font-semibold text-black/70 dark:text-white/70">
            {t("withholdingSlider")}
            <span className="font-mono tabular-nums text-emerald-600">
              {taxPct.toFixed(taxPct % 1 === 0 ? 0 : 2)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={15}
            step={0.25}
            value={safeTax * 100}
            onChange={(event) => setTaxRate(Number(event.target.value) / 100)}
            aria-label={t("withholdingSlider")}
            className="mt-3 w-full accent-emerald-600"
          />
          <span className="mt-1 block text-[11px] text-black/[0.45] dark:text-white/[0.45]">
            {t("withholdingApplied", { pct: String(taxPct) })}
          </span>
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
        <div className="border-b border-black/[0.06] bg-neutral-50/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-black/50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/50">
          {t("waterfallTitle")}
        </div>
        <dl className="divide-y divide-black/[0.06] text-sm dark:divide-white/[0.08]">
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/60 dark:text-white/60">{t("rowGross")}</dt>
            <dd className="font-mono tabular-nums font-medium text-black dark:text-white">
              {formatUSD(safeGross)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/60 dark:text-white/60">{t("rowPlatformCut")}</dt>
            <dd className="font-mono tabular-nums font-medium text-black dark:text-white">
              − {formatUSD(safePlatform)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/60 dark:text-white/60">{t("rowIntermediary")}</dt>
            <dd className="font-mono tabular-nums font-medium text-black dark:text-white">
              − {formatUSD(safeWire)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/60 dark:text-white/60">{t("rowConversion")}</dt>
            <dd className="text-right font-mono tabular-nums text-black dark:text-white">
              + {formatLocal(convertedLocal, corridor)}
              <span className="block text-[11px] text-black/[0.4] dark:text-white/[0.4]">
                {channelName} @ {safeRate.toFixed(4)}
              </span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/60 dark:text-white/60">{t("rowLandingFee")}</dt>
            <dd className="font-mono tabular-nums font-medium text-black dark:text-white">
              − {formatLocal(safeFee, corridor)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/60 dark:text-white/60">
              {t("rowWithholding")}{" "}
              <span className="font-mono tabular-nums">{taxPct}%</span>
            </dt>
            <dd className="font-mono tabular-nums font-medium text-amber-600">
              − {formatLocal(taxLocal, corridor)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 bg-emerald-500/[0.06] px-4 py-3">
            <dt className="font-semibold text-black/80 dark:text-white/80">
              {t("rowTakeHome")}
            </dt>
            <dd className="font-bold tabular-nums text-emerald-600">
              + {formatLocal(takeHomeLocal, corridor)}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-black/[0.4] dark:text-white/[0.4]">
        {t("txNote")}
      </p>
    </section>
  );
}