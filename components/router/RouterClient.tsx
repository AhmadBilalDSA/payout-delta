"use client";

import { useState } from "react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { TransactionAuditSeal } from "@/components/export/TransactionAuditSeal";
import { calculateRoutes } from "@/lib/hopEngine";

const FIGURE = "font-mono tabular-nums";

interface Corridor {
  slug: string;
  label: string;
  shaUsd: number;
  rate: number;
  symbol: string;
}

interface RouterClientProps {
  corridors: Corridor[];
}

export function RouterClient({ corridors }: RouterClientProps) {
  const [selectedSlug, setSelectedSlug] = useState(corridors[0].slug);
  const [grossAmount, setGrossAmount] = useState<number>(10000);

  const corridor = corridors.find((c) => c.slug === selectedSlug) || corridors[0];
  const routes = calculateRoutes(grossAmount, corridor.rate, corridor.shaUsd);
  
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0].id);
  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const payload = `ROUTE|${corridor.slug}|${grossAmount}|${selectedRoute.id}|${selectedRoute.netLocal}`;

  const formatUsd = (val: number) => `$${val.toFixed(2)}`;
  const formatLocal = (val: number) => `${corridor.symbol}${val.toFixed(2)}`;
  const formatPct = (val: number) => `${(val * 100).toFixed(1)}%`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 print:max-w-none print:px-0 print:pb-0">
      
      {/* Control Surface (Hidden on Print) */}
      <div className="print:hidden mb-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sovereign Settlement Hop Resolver
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Pathfinding engine computing deterministic settlement routes and intermediary friction.
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Export Audit Route
          </button>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Origin-to-Destination Corridor</label>
            {/* Highly styled select to avoid raw unstyled appearance */}
            <div className="relative">
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
                aria-label="Select Settlement Corridor"
              >
                {corridors.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gross Invoice (USD)</label>
            <input
              type="number"
              min="100"
              step="100"
              value={grossAmount}
              onChange={(e) => setGrossAmount(Number(e.target.value) || 0)}
              className={`${FIGURE} w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900`}
            />
          </div>
        </div>
      </div>

      {/* 3-Tier Comparative Bento Grid (Hidden on print) */}
      <div className="print:hidden mb-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {routes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          return (
            <button
              key={route.id}
              onClick={() => setSelectedRouteId(route.id)}
              className={`flex flex-col rounded-3xl border p-6 text-left transition-all ${
                isSelected 
                  ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500/20 dark:border-emerald-500/50 dark:bg-emerald-950/20 dark:ring-emerald-500/10" 
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              }`}
            >
              <div className="mb-4">
                <span className="mb-2 inline-block rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white dark:bg-slate-100 dark:text-slate-900">
                  {route.type}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{route.name}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 min-h-[32px]">{route.description}</p>
              </div>

              <div className="mt-auto flex flex-col gap-2 rounded-xl bg-slate-100/50 p-4 dark:bg-slate-950/50">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Net Capital</span>
                  <span className={`${FIGURE} text-lg font-black text-emerald-600 dark:text-emerald-400`}>
                    {formatLocal(route.netLocal)}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Friction</span>
                  <span className={`${FIGURE} text-sm font-semibold text-rose-600 dark:text-rose-400`}>
                    {Math.round(route.frictionBps)} bps
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Liquidity</span>
                  <span className={`${FIGURE} text-sm font-semibold text-slate-700 dark:text-slate-300`}>
                    ~{route.estimatedHours}h
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Primary SVG Topology & Print Surface */}
      <SpotlightCard className="print:!overflow-visible print:!bg-transparent print:!border-none print:!p-0 print:!shadow-none print:!rounded-none">
        <div className="relative z-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 text-slate-900 dark:text-white print:ring-0 print:shadow-none print:bg-transparent print:p-0 print:text-black print:rounded-none">
          
          <header className="mb-12 border-b-[3px] border-slate-900 pb-6 print:border-black dark:border-white">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">Settlement Topology Map</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500 print:text-slate-800 dark:text-slate-400">
                  {selectedRoute.name} ({corridor.slug})
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 print:text-slate-600">Generated</p>
                <p className={`${FIGURE} mt-1 text-sm font-semibold`}>{new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>
          </header>

          <section className="mb-10 overflow-x-auto">
            {/* Kinetic Pure SVG Node Diagram */}
            <svg
              viewBox="0 0 824 224"
              className="w-full min-w-[600px] text-slate-900 dark:text-white print:text-black"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" className="fill-slate-200 dark:fill-slate-800 print:fill-slate-300" />
                </pattern>
                <linearGradient id="pulse" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              <rect width="824" height="224" fill="url(#dotPattern)" rx="16" />

              {/* Connecting lines */}
              <path d="M 180 112 L 342 112" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-300 dark:text-slate-700 print:text-slate-400" />
              <path d="M 482 112 L 644 112" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-300 dark:text-slate-700 print:text-slate-400" />

              {/* Originator Node */}
              <g transform="translate(40, 62)">
                <rect width="140" height="100" rx="12" className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700 print:fill-transparent print:stroke-slate-400" strokeWidth="2" />
                <text x="70" y="30" textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest fill-slate-500">Originator</text>
                <text x="70" y="55" textAnchor="middle" className="text-sm font-bold fill-slate-900 dark:fill-white print:fill-black">Platform</text>
                <text x="70" y="80" textAnchor="middle" className={`${FIGURE} text-sm font-semibold fill-emerald-600 dark:fill-emerald-400 print:fill-black`}>{formatUsd(selectedRoute.grossUsd)}</text>
              </g>

              {/* Intermediary Node */}
              <g transform="translate(342, 62)">
                <rect width="140" height="100" rx="12" className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700 print:fill-transparent print:stroke-slate-400" strokeWidth="2" />
                <text x="70" y="25" textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest fill-rose-500 dark:fill-rose-400 print:fill-slate-700">Clearing Node</text>
                <text x="70" y="45" textAnchor="middle" className="text-xs font-bold fill-slate-900 dark:fill-white print:fill-black">{selectedRoute.type} Protocol</text>
                
                {/* Fee breakdown pill */}
                <rect x="10" y="55" width="120" height="35" rx="6" className="fill-slate-50 dark:fill-slate-950 print:fill-white print:stroke-slate-200" strokeWidth="1" />
                <text x="70" y="70" textAnchor="middle" className={`${FIGURE} text-[9px] fill-rose-600 dark:fill-rose-400 print:fill-black`}>Fee: -{formatUsd(selectedRoute.intermediaryFeeUsd)}</text>
                <text x="70" y="82" textAnchor="middle" className={`${FIGURE} text-[9px] fill-slate-500 print:fill-black`}>Pass: {formatUsd(selectedRoute.netUsdBeforeFx)}</text>
              </g>

              {/* Beneficiary Node */}
              <g transform="translate(644, 62)">
                <rect width="140" height="100" rx="12" className="fill-emerald-50/50 stroke-emerald-200 dark:fill-emerald-950/20 dark:stroke-emerald-900/50 print:fill-transparent print:stroke-slate-400" strokeWidth="2" />
                <text x="70" y="25" textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest fill-emerald-600 dark:fill-emerald-500 print:fill-slate-700">Beneficiary</text>
                <text x="70" y="45" textAnchor="middle" className="text-xs font-bold fill-slate-900 dark:fill-white print:fill-black">Destination Bank</text>
                <text x="70" y="65" textAnchor="middle" className={`${FIGURE} text-[9px] fill-slate-500 print:fill-black`}>FX Spread: {formatPct(selectedRoute.fxMarginPct)}</text>
                <text x="70" y="85" textAnchor="middle" className={`${FIGURE} text-sm font-black fill-emerald-600 dark:fill-emerald-400 print:fill-black`}>{formatLocal(selectedRoute.netLocal)}</text>
              </g>
            </svg>
          </section>

          <section className="mb-10 grid grid-cols-2 gap-y-6 gap-x-12 border-t border-slate-200 pt-8 print:border-slate-300 dark:border-slate-800">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-slate-600 dark:text-slate-400">Total Basis Point Friction</dt>
              <dd className={`${FIGURE} mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400 print:text-black`}>{Math.round(selectedRoute.frictionBps)} bps</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-slate-600 dark:text-slate-400">Estimated Liquidity Time</dt>
              <dd className={`${FIGURE} mt-1 text-lg font-semibold`}>~{selectedRoute.estimatedHours} hours</dd>
            </div>
          </section>

          <TransactionAuditSeal payload={payload} />

          <div className="hidden print:flex justify-between mt-24 pt-8">
            <div className="w-64 border-t-2 border-black pt-2 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-black">Sign-off Authority</p>
            </div>
            <div className="w-48 border-t-2 border-black pt-2 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-black">Date</p>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
