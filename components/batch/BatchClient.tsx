"use client";

import { useState } from "react";

const FIGURE = "font-mono tabular-nums";

interface Corridor {
  slug: string;
  label: string;
  shaUsd: number;
  rate: number;
  symbol: string;
}

interface BatchClientProps {
  corridors: Corridor[];
}

interface RowItem {
  id: string;
  corridorSlug: string;
  grossUsd: number;
}

export function BatchClient({ corridors }: BatchClientProps) {
  const [rows, setRows] = useState<RowItem[]>([
    { id: "row-1", corridorSlug: corridors[0].slug, grossUsd: 5000 },
    { id: "row-2", corridorSlug: corridors[0].slug, grossUsd: 2500 },
  ]);

  const platformRate = 0.10; // 10% platform cut
  const fxMarginRate = 0.025; // 2.5% FX spread

  const handleAddRow = () => {
    if (rows.length >= 25) return;
    setRows([...rows, { id: `row-${Date.now()}`, corridorSlug: corridors[0].slug, grossUsd: 1000 }]);
  };

  const handleUpdateRow = (id: string, field: keyof RowItem, value: string | number) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const lines = text.split("\n").filter(l => l.trim().length > 0);
    const newRows = [...rows];
    let added = 0;
    
    for (const line of lines) {
      if (newRows.length >= 25) break;
      const parts = line.split(",");
      if (parts.length >= 2) {
        // expect slug, amount
        const slugMatch = corridors.find(c => c.slug === parts[0].trim());
        const amt = parseFloat(parts[1]);
        if (slugMatch && !isNaN(amt)) {
          newRows.push({ id: `row-p-${Date.now()}-${added}`, corridorSlug: slugMatch.slug, grossUsd: amt });
          added++;
        }
      }
    }
    if (added > 0) setRows(newRows);
  };

  const rowComputations = rows.map((r) => {
    const corridor = corridors.find((c) => c.slug === r.corridorSlug) || corridors[0];
    const gross = r.grossUsd;
    const pCut = gross * platformRate;
    const afterPlatform = gross - pCut;
    const sha = corridor.shaUsd;
    const toConvert = Math.max(0, afterPlatform - sha);
    const fxDrag = toConvert * fxMarginRate; // The USD value of the FX margin
    const netUsd = toConvert - fxDrag;
    const netLocal = netUsd * corridor.rate;

    return { ...r, pCut, sha, fxDrag, netUsd, netLocal, symbol: corridor.symbol };
  });

  const totalGross = rowComputations.reduce((sum, r) => sum + r.grossUsd, 0);
  const totalPlatformCut = rowComputations.reduce((sum, r) => sum + r.pCut, 0);
  const totalSha = rowComputations.reduce((sum, r) => sum + r.sha, 0);
  const totalFxDrag = rowComputations.reduce((sum, r) => sum + r.fxDrag, 0);
  const totalNetUsdEquivalent = rowComputations.reduce((sum, r) => sum + r.netUsd, 0);

  const totalLossFriction = totalPlatformCut + totalSha + totalFxDrag;
  const effectiveDragBps = totalGross > 0 ? (totalLossFriction / totalGross) * 10000 : 0;

  const formatUsd = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Enterprise Batch Payout Split Engine
        </h1>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Reconcile up to 25 items simultaneously. Paste CSV data (corridorSlug, grossUsd) to bulk-add.
        </p>
      </div>

      {/* Summary Statistics Bar */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Gross</p>
          <p className={`${FIGURE} mt-2 text-2xl font-bold text-slate-900 dark:text-white`}>{formatUsd(totalGross)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Loss Friction</p>
          <p className={`${FIGURE} mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400`}>{formatUsd(totalLossFriction)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Effective Corridor Drag</p>
          <p className={`${FIGURE} mt-2 text-2xl font-bold text-slate-900 dark:text-white`}>{Math.round(effectiveDragBps)} bps</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-6 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-900/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Total Net Capital (USD Eq)</p>
          <p className={`${FIGURE} mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400`}>{formatUsd(totalNetUsdEquivalent)}</p>
        </div>
      </div>

      {/* High-density Tabular Grid */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto" onPaste={handlePaste}>
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 font-bold">Corridor Selection</th>
                <th className="px-6 py-4 font-bold text-right">Gross (USD)</th>
                <th className="px-6 py-4 font-bold text-right">Platform Cut</th>
                <th className="px-6 py-4 font-bold text-right">SHA Deductions</th>
                <th className="px-6 py-4 font-bold text-right">FX Drag</th>
                <th className="px-6 py-4 font-bold text-right">Net Landed Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rowComputations.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-3">
                    <select
                      value={row.corridorSlug}
                      onChange={(e) => handleUpdateRow(row.id, "corridorSlug", e.target.value)}
                      className="w-full rounded border-transparent bg-transparent py-1.5 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:ring-0 dark:focus:bg-slate-900"
                    >
                      {corridors.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      value={row.grossUsd}
                      onChange={(e) => handleUpdateRow(row.id, "grossUsd", Number(e.target.value) || 0)}
                      className={`${FIGURE} w-28 rounded border-slate-200 bg-transparent py-1 text-right text-sm font-bold focus:border-emerald-500 focus:ring-0 dark:border-slate-700`}
                    />
                  </td>
                  <td className={`${FIGURE} px-6 py-3 text-right text-rose-500`}>-{formatUsd(row.pCut)}</td>
                  <td className={`${FIGURE} px-6 py-3 text-right text-rose-500`}>-{formatUsd(row.sha)}</td>
                  <td className={`${FIGURE} px-6 py-3 text-right text-rose-500`}>-{formatUsd(row.fxDrag)}</td>
                  <td className={`${FIGURE} px-6 py-3 text-right text-base font-black text-emerald-600 dark:text-emerald-400`}>
                    {row.symbol}{row.netLocal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500">{rows.length} / 25 items</span>
          <button
            onClick={handleAddRow}
            disabled={rows.length >= 25}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 transition-all hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-700"
          >
            + Add Row
          </button>
        </div>
      </div>
    </div>
  );
}
