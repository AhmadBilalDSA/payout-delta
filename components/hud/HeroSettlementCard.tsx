"use client";

import { useCounter } from "@/lib/useCounter";

export function HeroSettlementCard() {
  const netReceived = useCounter(9742.50, 600);
  const frictionLoss = useCounter(257.50, 600);
  const totalGross = 10000;
  
  // Progress ratios
  const netRatio = totalGross > 0 ? (netReceived / totalGross) * 100 : 0;
  const frictionRatio = totalGross > 0 ? (frictionLoss / totalGross) * 100 : 0;

  const formatUsd = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section className="bg-[#121212] hairline-border rounded-lg p-5 relative overflow-hidden backdrop-blur-md flex flex-col justify-between shadow-2xl mb-8">
      {/* Subtle corner accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>

      {/* Card Header & Badge */}
      <div className="flex items-center justify-between pb-3 hairline-border-b">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20">
            ACTIVE SETTLEMENT TRANSACTION #TX-98442
          </span>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">| ROUTE: NY FEDWIRE ➔ FRANKFURT TARGET2</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="tabular-nums">EST. FINALITY: 00:01:24</span>
        </div>
      </div>

      {/* Hero Metrics Display: Net Received vs Gross Invoiced */}
      <div className="my-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left Large Counter: Net Received */}
        <div className="md:col-span-7 flex flex-col">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <span>NET FINAL AMOUNT RECEIVED</span>
            <span className="text-[9px] px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">CLEARED AT WALLET</span>
          </span>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white font-mono tabular-nums">
              ${Math.floor(netReceived).toLocaleString()}<span className="text-emerald-400">.{(netReceived % 1).toFixed(2).substring(2)}</span>
            </span>
            <span className="text-xs font-mono text-zinc-500 uppercase">USD</span>
          </div>

          {/* Comparison line against Gross */}
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-mono tabular-nums">
            <span className="text-zinc-500">Gross Invoiced:</span>
            <span className="text-zinc-300 font-semibold line-through decoration-zinc-600">{formatUsd(totalGross)}</span>
            <span className="text-rose-400 font-medium px-1.5 py-0.5 rounded bg-rose-950/30 hairline-border border-rose-500/20">
              -{formatUsd(frictionLoss)} Total Friction (-2.575%)
            </span>
          </div>
        </div>

        {/* Right Mini Metric: Gross vs Capital Drag Visual Gauge */}
        <div className="md:col-span-5 bg-zinc-900/60 hairline-border rounded-md p-3.5 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-400">PAYOUT EFFICIENCY</span>
            <span className="text-emerald-400 font-bold tabular-nums">{netRatio.toFixed(3)}%</span>
          </div>
          
          {/* Segmented Progress Bar */}
          <div className="w-full h-2.5 bg-zinc-800 rounded-sm overflow-hidden flex">
            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" style={{ width: `${netRatio}%` }}></div>
            <div className="h-full bg-rose-500/80" style={{ width: `${frictionRatio}%` }}></div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono tabular-nums pt-1 text-zinc-400">
            <div>
              <span className="text-zinc-500 block">SETTLED VALUE:</span>
              <span className="text-zinc-200 font-semibold">{formatUsd(netReceived)}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 block">LOST IN TRANSIT:</span>
              <span className="text-rose-400 font-semibold">-{formatUsd(frictionLoss)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-metric Row: Itemized Chips for Toll Drag */}
      <div className="pt-3 hairline-border-t">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Itemized Friction Decomposition (Bilateral Ledger Breakdown)</span>
          <span className="text-zinc-400 lowercase text-[10px] hidden sm:inline">drag rate: <strong className="text-amber-400 font-mono">257.5 bps</strong></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          
          {/* Chip 1: Intermediary SHA Cut */}
          <div className="p-2.5 rounded bg-zinc-900/90 hairline-border flex flex-col justify-between hover:border-zinc-600 transition group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-300">Intermediary SHA Cut</span>
              <span className="text-[9px] font-mono px-1 rounded bg-amber-950/40 text-amber-400 hairline-border border-amber-500/20">FIXED HOPS</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
              <span className="text-lg font-bold text-rose-400">-$25.00</span>
              <span className="text-[11px] text-zinc-400">25.0 bps</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">2 Correspondent Agent Banks</div>
          </div>

          {/* Chip 2: Platform Processing */}
          <div className="p-2.5 rounded bg-zinc-900/90 hairline-border flex flex-col justify-between hover:border-zinc-600 transition group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-300">Platform Processing</span>
              <span className="text-[9px] font-mono px-1 rounded bg-zinc-800 text-zinc-300 hairline-border">CLEARING FEE</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
              <span className="text-lg font-bold text-rose-400">-$12.50</span>
              <span className="text-[11px] text-zinc-400">12.5 bps</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">Direct API Core Gateway</div>
          </div>

          {/* Chip 3: FX Drag (Spread + Volatility) */}
          <div className="p-2.5 rounded bg-zinc-900/90 hairline-border flex flex-col justify-between hover:border-zinc-600 transition group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-300">FX Drag &amp; Spread</span>
              <span className="text-[9px] font-mono px-1 rounded bg-rose-950/40 text-rose-400 hairline-border border-rose-500/20">LARGEST BITE</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
              <span className="text-lg font-bold text-rose-400">-$220.00</span>
              <span className="text-[11px] text-zinc-400 font-semibold text-rose-300">-220 bps</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">Cross-Currency Interbank Margin</div>
          </div>

        </div>
      </div>
    </section>
  );
}
