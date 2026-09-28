"use client";

import { useState, useMemo } from "react";
import { buildMatrix, RAILS } from "@/lib/matrixEngine";
const FIGURE = "font-mono tabular-nums";
const TIERS = [500, 1000, 2500, 5000, 10000, 25000, 50000];

export default function SensitivityMatrixPage() {
  const [selectedRail, setSelectedRail] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<number>(0);

  const data = useMemo(() => buildMatrix(), []);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (selectedRail !== "all" && d.rail !== selectedRail) return false;
      if (selectedTier !== 0 && d.tier !== selectedTier) return false;
      return true;
    });
  }, [data, selectedRail, selectedTier]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        Intermediary Deductions Sensitivity Matrix
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-3xl">
        Evaluate cross-border wire friction based on principal invoice tiers, settlement rails, and FX spread brackets.
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        {/* ARIA toggles for Rails instead of unstyled selects */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rail Filter</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by rail">
            <button
              onClick={() => setSelectedRail("all")}
              aria-pressed={selectedRail === "all"}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${selectedRail === "all" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"}`}
            >
              All Rails
            </button>
            {RAILS.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRail(r.name)}
                aria-pressed={selectedRail === r.name}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${selectedRail === r.name ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"}`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tier Filter</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tier">
            <button
              onClick={() => setSelectedTier(0)}
              aria-pressed={selectedTier === 0}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${selectedTier === 0 ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"}`}
            >
              All Tiers
            </button>
            {TIERS.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                aria-pressed={selectedTier === t}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${selectedTier === t ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"}`}
              >
                ${t.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold">Principal Tier</th>
              <th scope="col" className="px-6 py-4 font-bold">Settlement Rail</th>
              <th scope="col" className="px-6 py-4 font-bold">FX Spread</th>
              <th scope="col" className="px-6 py-4 font-bold">Total Drag</th>
              <th scope="col" className="px-6 py-4 font-bold">Drag %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-black/20">
            {filteredData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className={`px-6 py-4 font-medium ${FIGURE}`}>
                  ${row.tier.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{row.rail}</td>
                <td className={`px-6 py-4 ${FIGURE}`}>
                  {row.spread.toFixed(2)}%
                </td>
                <td className={`px-6 py-4 ${FIGURE}`}>
                  ${row.dragAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${row.heat === "green" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : row.heat === "amber" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-rose-500/10 text-rose-700 dark:text-rose-400"} ${FIGURE}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${row.heat === "green" ? "bg-emerald-500" : row.heat === "amber" ? "bg-amber-500" : "bg-rose-500"}`} aria-hidden="true" />
                    {row.dragPct.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
