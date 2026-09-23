"use client";

import { useMemo, useState } from "react";

import type { Corridor } from "@/lib/types";
import { formatLocal, formatUSD } from "@/utils/format";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import {
  INVOICE_SYNC_EVENT,
  INVOICE_SYNC_KEY,
  writeBankSync,
  type InvoiceSyncPayload,
} from "@/lib/invoiceTypes";

/**
 * Phase 9 — Statutory Bank Settlement & Dynamic Transaction Costing Engine.
 *
 * Full "real bank take-home" waterfall anchored on the live best quote the
 * calculator surface already computed, layered over the statutory laws and
 * local clearing database (`data/regulatoryBanking.ts`):
 *
 *   1. Gross client bill
 *   2. − Platform cut + custom surcharge / client retainer
 *   3. − Intermediary SWIFT wire cut   (bank benchmark, $0–$40 slider)
 *   4. = Net converted via best provider (lowest fee provider rate)
 *   5. − Local receiving bank / clearing fee
 *   6. − Statutory tax withholding     (purpose code + legal rate tier)
 *   7. = Real bank take-home
 *
 * The "Sync to Invoice" button persists the exact bank, purpose code and tax
 * tier to localStorage so the Invoice Studio auto-fills its Banking & Clearing
 * section and statutory addendum on the next visit, and fires a
 * `payoutdelta:synced` event so an already-open studio applies it instantly.
 * All client-side; bank names, SWIFT codes and statutory references are
 * English data.
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
  const regulation = useMemo(
    () => getRegulatoryBanking(corridor.slug),
    [corridor.slug]
  );

  const [bankId, setBankId] = useState(regulation.banks[0]?.id ?? "");
  const [tierId, setTierId] = useState(regulation.tiers[0]?.id ?? "none");
  const [synced, setSynced] = useState(false);

  const bank =
    regulation.banks.find((item) => item.id === bankId) ??
    regulation.banks[0];
  const tier =
    regulation.tiers.find((item) => item.id === tierId) ?? regulation.tiers[0];

  const [wireUSD, setWireUSD] = useState(() => bank?.intermediaryUSD ?? 15);
  const [localFee, setLocalFee] = useState(() => bank?.localFeeDefault ?? 0);
  const [surchargePct, setSurchargePct] = useState(0);

  const selectBank = (id: string) => {
    setBankId(id);
    const next = regulation.banks.find((item) => item.id === id);
    if (!next) return;
    setWireUSD(next.intermediaryUSD);
    setLocalFee(next.localFeeDefault);
  };

  const selectTier = (id: string) => setTierId(id);

  const safeGross = Number.isFinite(grossUSD) && grossUSD > 0 ? grossUSD : 0;
  const safePlatform = Number.isFinite(platformFeeUSD)
    ? Math.max(0, platformFeeUSD)
    : 0;
  const safeRate =
    Number.isFinite(effectiveRate) && effectiveRate > 0 ? effectiveRate : 0;
  const safeWire = Number.isFinite(wireUSD)
    ? Math.max(0, Math.min(40, wireUSD))
    : 0;
  const safeFee = Number.isFinite(localFee) ? Math.max(0, localFee) : 0;
  const safeSurcharge = Number.isFinite(surchargePct)
    ? Math.min(15, Math.max(0, surchargePct))
    : 0;
  const tierRate = tier?.rate ?? 0;
  const safeTax = Number.isFinite(tierRate)
    ? Math.min(0.15, Math.max(0, tierRate))
    : 0;

  const surchargeUSD = safeGross * (safeSurcharge / 100);
  const platformTotalUSD = safePlatform + surchargeUSD;
  const netAfterPlatformUsd = Math.max(0, safeGross - platformTotalUSD);
  const netAfterWireUsd = Math.max(0, netAfterPlatformUsd - safeWire);
  const convertedLocal = netAfterWireUsd * safeRate;
  const landedLocal = Math.max(0, convertedLocal - safeFee);
  const taxLocal = landedLocal * safeTax;
  const takeHomeLocal = Math.max(0, landedLocal - taxLocal);

  const taxPct = Math.round(safeTax * 10000) / 100;

  const handleSync = () => {
    if (!bank || !tier || synced) return;
    writeBankSync({
      bankName: bank.name,
      swiftCode: bank.swiftCode,
      bankSpeed: bank.speed,
      intermediaryUSD: safeWire,
      clearingFee: safeFee,
      currency: corridor.currencySymbol,
      tierName: tier.name,
      tierRate: tier.rate,
      purposeCode: tier.purposeCode ?? null,
      authority: `${regulation.authority} · ${tier.authority}`,
      corridorSlug: corridor.slug,
      savedAt: new Date().toISOString(),
    });
    const syncPayload: InvoiceSyncPayload = {
      receivingBank: bank.name,
      swiftBic: bank.swiftCode,
      statutoryAuthority: `${regulation.authority} · ${tier.authority}`,
      purposeCode: tier.purposeCode ?? "",
      taxRate: tier.rate,
      currency: corridor.to,
      timestamp: Date.now(),
    };
    try {
      window.localStorage.setItem(INVOICE_SYNC_KEY, JSON.stringify(syncPayload));
    } catch {
      // Storage unavailable — the live event below still reaches the studio.
    }
    window.dispatchEvent(
      new CustomEvent<InvoiceSyncPayload>(INVOICE_SYNC_EVENT, {
        detail: syncPayload,
      })
    );
    setSynced(true);
    window.setTimeout(() => setSynced(false), 2500);
  };

  return (
    <section
      id="transaction-costing"
      aria-labelledby="transaction-costing-title"
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-sm backdrop-blur-md transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60"
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
            {regulation.banks.map((item) => (
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
                {bank.speed}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 tabular-nums text-black/60 dark:bg-neutral-800 dark:text-white/60">
                {t("bankIntermediaryBand", {
                  min: `$${bank.intermediaryMinUSD}`,
                  max: `$${bank.intermediaryMaxUSD}`,
                })}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-black/60 dark:bg-neutral-800 dark:text-white/60">
                {bank.clearance}
              </span>
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            {t("jurisdictionSelector")}
          </span>
          <select
            value={tier?.id ?? "none"}
            onChange={(event) => selectTier(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-200 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          >
            {regulation.tiers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {Math.round(item.rate * 10000) / 100}%
              </option>
            ))}
          </select>
          {tier && (
            <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
              {tier.purposeCode && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-black/60 dark:bg-neutral-800 dark:text-white/60">
                  {t("purposeCodeLabel", { code: tier.purposeCode })}
                </span>
              )}
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-black/60 dark:bg-neutral-800 dark:text-white/60">
                {tier.authority}
              </span>
            </span>
          )}
          {tier && (
            <span className="mt-1.5 block text-[11px] leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
              {tier.note}
            </span>
          )}
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="flex items-baseline justify-between text-xs font-semibold text-black/70 dark:text-white/70">
            {t("swiftDeduction")}
            <span className="font-mono tabular-nums text-emerald-600">
              ${safeWire.toFixed(2)}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={40}
            step={0.5}
            value={safeWire}
            onChange={(event) => setWireUSD(Number(event.target.value))}
            aria-label={t("swiftDeduction")}
            className="mt-3 w-full accent-emerald-600"
          />
          <span className="mt-1 block text-[11px] text-black/[0.45] dark:text-white/[0.45]">
            {t("bankClearance", { time: bank?.clearance ?? "—" })}
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            {t("localClearingFee")}
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums text-black/50 dark:text-white/50">
              {corridor.currencySymbol}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="decimal"
              value={safeFee}
              onChange={(event) => setLocalFee(Number(event.target.value))}
              aria-label={t("localClearingFee")}
              className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        </label>

        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="flex items-baseline justify-between text-xs font-semibold text-black/70 dark:text-white/70">
            {t("platformSurcharge")}
            <span className="font-mono tabular-nums text-emerald-600">
              {safeSurcharge.toFixed(safeSurcharge % 1 === 0 ? 0 : 1)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={safeSurcharge}
            onChange={(event) => setSurchargePct(Number(event.target.value))}
            aria-label={t("platformSurcharge")}
            className="mt-3 w-full accent-emerald-600"
          />
          <span className="mt-1 block text-[11px] text-black/[0.45] dark:text-white/[0.45]">
            {t("platformSurchargeApplied", { pct: String(safeSurcharge) })}
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
            <dt className="text-black/60 dark:text-white/60">
              {t("rowPlatformCut")}
              {safeSurcharge > 0 && (
                <span className="font-mono tabular-nums text-black/[0.4] dark:text-white/[0.4]">
                  {" "}
                  +{safeSurcharge}%
                </span>
              )}
            </dt>
            <dd className="font-mono tabular-nums font-medium text-black dark:text-white">
              − {formatUSD(platformTotalUSD)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/60 dark:text-white/60">
              {t("rowIntermediary")}
            </dt>
            <dd className="font-mono tabular-nums font-medium text-black dark:text-white">
              − {formatUSD(safeWire)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-black/60 dark:text-white/60">
              {t("rowNetConverted")}
            </dt>
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={synced || !bank || !tier}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${
            synced
              ? "border border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
              : "bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          }`}
        >
          <span aria-hidden="true" className={synced ? "text-emerald-300" : ""}>
            {synced ? "✓" : "⭮"}
          </span>
          {synced ? t("syncedTick") : t("syncToInvoice")}
        </button>
        <span className="text-[11px] leading-relaxed text-black/[0.4] dark:text-white/[0.4]">
          {t("syncHint")}
        </span>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-black/[0.4] dark:text-white/[0.4]">
        {t("txNote")}
      </p>
    </section>
  );
}