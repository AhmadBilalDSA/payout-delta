"use client";

import { useState, useMemo } from "react";
import type { Corridor } from "@/lib/types";
import type { SovereignJurisdictionNode } from "@/data/contracts";
const FIGURE = "font-mono tabular-nums";
interface FxConverterClientProps {
  corridors: Corridor[];
  jurisdictions: readonly SovereignJurisdictionNode[];
}

export function FxConverterClient({ corridors, jurisdictions }: FxConverterClientProps) {
  const [amount, setAmount] = useState<number>(1000);
  const [direction, setDirection] = useState<"base-to-quote" | "quote-to-base">("base-to-quote");
  const [selectedSlug, setSelectedSlug] = useState<string>(corridors[0]?.slug || "");

  const activeCorridor = useMemo(() => {
    return corridors.find(c => c.slug === selectedSlug);
  }, [corridors, selectedSlug]);

  const activeJurisdiction = useMemo(() => {
    if (!activeCorridor) return null;
    return jurisdictions.find(j => j.iso2 === activeCorridor.countryCode);
  }, [jurisdictions, activeCorridor]);

  if (!activeCorridor) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAmount(isNaN(val) ? 0 : val);
  };

  const midRate = activeCorridor.rate;
  const isBaseToQuote = direction === "base-to-quote";

  const renderComparison = (providerId: string, label: string, fallbackSpread: number) => {
    const provider = activeCorridor.providers?.find(p => p.id === providerId);
    const fxSpread = provider ? provider.fxSpread : fallbackSpread;
    
    let effectiveRate = 0;
    if (isBaseToQuote) {
      effectiveRate = midRate * (1 - fxSpread);
    } else {
      effectiveRate = midRate * (1 + fxSpread);
    }

    let netReceived = 0;
    let netText = "";
    if (isBaseToQuote) {
      netReceived = amount * effectiveRate;
      netText = `${activeCorridor.currencySymbol}${netReceived.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      netReceived = amount / effectiveRate;
      netText = `$${netReceived.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Spread: <span className={FIGURE}>{(fxSpread * 100).toFixed(2)}%</span> {provider ? `(Fixed: $${provider.fixedFeeUSD})` : ''}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-1">Effective Rate</p>
          <p className={`text-xl font-bold ${FIGURE}`}>
            {effectiveRate.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Net Fiat Received</p>
          <p className={`text-2xl font-bold text-emerald-600 dark:text-emerald-400 ${FIGURE}`}>
            {netText}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Input Controls */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="corridor-select" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sovereign Corridor
          </label>
          <select
            id="corridor-select"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {corridors.map(c => (
              <option key={c.slug} value={c.slug}>
                {c.country} ({c.to})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Conversion Direction
          </label>
          <div className="flex rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setDirection("base-to-quote")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${direction === "base-to-quote" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
            >
              USD to {activeCorridor.to}
            </button>
            <button
              onClick={() => setDirection("quote-to-base")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${direction === "quote-to-base" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
            >
              {activeCorridor.to} to USD
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="amount-input" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Principal Amount ({isBaseToQuote ? "USD" : activeCorridor.to})
          </label>
          <input
            id="amount-input"
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={handleAmountChange}
            className={`rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-bold text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${FIGURE}`}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">
          Canonical Mid-Market Reference
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">1 USD =</span>
            <span className={`text-3xl font-bold tracking-tight text-slate-900 dark:text-white ${FIGURE}`}>
              {midRate.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">{activeCorridor.currencyName}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {renderComparison("swift", "Standard Commercial Bank", 0.026)}
        {renderComparison("wise", "Platform Rail (Wise)", 0.0055)}
        {renderComparison("payoneer", "Platform Rail (Payoneer)", 0.02)}
      </div>

      {activeJurisdiction && (
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-6">
          Statutory context: {activeJurisdiction.name} withholding applies based on local regulations. Purpose code {activeJurisdiction.tax.purposeCode} is commonly used. {activeJurisdiction.tax.safeHarborRules[0] || ""}
        </p>
      )}
    </div>
  );
}
