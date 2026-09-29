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

interface TracerClientProps {
  corridors: Corridor[];
}

export function TracerClient({ corridors }: TracerClientProps) {
  const [selectedSlug, setSelectedSlug] = useState(corridors[0].slug);
  const [principal, setPrincipal] = useState(2500);
  
  const corridor = corridors.find((c) => c.slug === selectedSlug) || corridors[0];
  
  const hop1 = principal; // Originator
  const hop2 = hop1 - corridor.shaUsd; // Intermediary SHA deduction
  const fxMarkup = 0.025; // 2.5% retail spread
  const effectiveRate = corridor.rate * (1 - fxMarkup);
  const hop3Local = hop2 * effectiveRate; // Beneficiary Net Landed

  const formatUsd = (val: number) => `$${val.toFixed(2)}`;
  const formatLocal = (val: number) => `${corridor.symbol}${val.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Intermediary SWIFT Wire Hop Tracer
        </h1>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Deterministic correspondent hop simulator tracking SHA intermediary fees and FX markup.
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Corridor</label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {corridors.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Principal (USD)</label>
          <input
            type="number"
            min="100"
            step="100"
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
            className={`${FIGURE} w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="p-8 overflow-x-auto">
          {/* Kinetic Pure SVG Node Diagram */}
          <svg
            viewBox="0 0 824 224"
            className="w-full min-w-[600px] text-slate-900 dark:text-white"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Connecting lines */}
            <path d="M 180 112 L 342 112" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-300 dark:text-slate-700" />
            <path d="M 482 112 L 644 112" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-300 dark:text-slate-700" />

            {/* Hop 1: Originating Bank */}
            <g transform="translate(40, 62)">
              <rect width="140" height="100" rx="12" className="fill-slate-50 stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700" strokeWidth="2" />
              <text x="70" y="30" textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest fill-slate-500">Originator</text>
              <text x="70" y="55" textAnchor="middle" className="text-sm font-bold fill-slate-900 dark:fill-white">US Bank</text>
              <text x="70" y="80" textAnchor="middle" className={`${FIGURE} text-sm font-semibold fill-emerald-600 dark:fill-emerald-400`}>{formatUsd(hop1)}</text>
            </g>

            {/* Hop 2: Intermediary Node */}
            <g transform="translate(342, 62)">
              <rect width="140" height="100" rx="12" className="fill-rose-50/50 stroke-rose-200 dark:fill-rose-950/20 dark:stroke-rose-900/50" strokeWidth="2" />
              <text x="70" y="30" textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest fill-rose-500 dark:fill-rose-400">Correspondent</text>
              <text x="70" y="55" textAnchor="middle" className="text-sm font-bold fill-slate-900 dark:fill-white">SHA Cut</text>
              <text x="70" y="75" textAnchor="middle" className={`${FIGURE} text-xs font-semibold fill-rose-600 dark:fill-rose-400`}>-{formatUsd(corridor.shaUsd)}</text>
              <text x="70" y="90" textAnchor="middle" className={`${FIGURE} text-xs font-semibold fill-slate-600 dark:fill-slate-400`}>Pass: {formatUsd(hop2)}</text>
            </g>

            {/* Hop 3: Beneficiary Bank */}
            <g transform="translate(644, 62)">
              <rect width="140" height="100" rx="12" className="fill-emerald-50/50 stroke-emerald-200 dark:fill-emerald-950/20 dark:stroke-emerald-900/50" strokeWidth="2" />
              <text x="70" y="25" textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest fill-emerald-600 dark:fill-emerald-500">Beneficiary</text>
              <text x="70" y="45" textAnchor="middle" className="text-xs font-bold fill-slate-900 dark:fill-white">Local Bank</text>
              <text x="70" y="65" textAnchor="middle" className={`${FIGURE} text-[9px] fill-slate-500`}>FX: 2.5% spread</text>
              <text x="70" y="85" textAnchor="middle" className={`${FIGURE} text-sm font-black fill-emerald-600 dark:fill-emerald-400`}>{formatLocal(hop3Local)}</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
