"use client";

import { useState } from "react";

export function LandedCalculator() {
  const [amountStr, setAmountStr] = useState("5000");
  const [flowMode, setFlowMode] = useState<"gross" | "net">("gross");
  const [preset, setPreset] = useState<"direct" | "upwork" | "deel" | "stripe">("direct");
  const [feeType, setFeeType] = useState<"SHA" | "OUR">("SHA");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const parsedAmount = parseFloat(amountStr) || 0;
  const isSHA = feeType === "SHA";

  // Flat fees for standard wire
  const correspondentFee = 25.00;
  const inwardFee = 10.00;
  const totalFriction = correspondentFee + inwardFee;

  // Local rail fee
  const localRailFee = 1.50;

  // If SHA, deduct from principal. If OUR, sender pays fee separately so net landed = principal
  const netLandedWire = Math.max(0, isSHA ? parsedAmount - totalFriction : parsedAmount);
  const netLandedLocal = Math.max(0, isSHA ? parsedAmount - localRailFee : parsedAmount);
  
  // EUR equivalent at 1 USD = 0.92 EUR roughly
  const eurEquivalent = netLandedWire * 0.92;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const copyBreakdown = () => {
    const text = `Landed Payout Calculation Breakdown:
Principal: $${parsedAmount.toFixed(2)} USD
Intermediary Correspondent Fee: -$${correspondentFee.toFixed(2)}
Receiving Bank Inward Fee: -$${inwardFee.toFixed(2)}
FX Spread: 0.00% (Guaranteed mid-market)
Net Landed: $${netLandedWire.toFixed(2)} USD via Direct SWIFT ${feeType}.`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => showToast("Fee breakdown copied to clipboard"))
        .catch(() => showToast("Failed to copy breakdown"));
    }
  };

  const copyInvoiceNote = () => {
    const text = `Please process this payment via SWIFT ${feeType}. I am expecting $${netLandedWire.toFixed(2)} USD landed.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => showToast("Invoice note copied to clipboard"))
        .catch(() => showToast("Failed to copy note"));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 font-sans mb-16">
      
      {/* Primary Card: The Core Engine */}
      <section className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
        
        {/* Rate Guarantee Badge */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] uppercase tracking-wider text-zinc-100 font-medium">Rate locked for 48:00</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 tabular-nums">
            FX Spread: 0.00% (Institutional mid-market)
          </span>
        </div>

        {/* You Send Section */}
        <div className="mb-6 space-y-3">
          <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 text-zinc-100">
            <button 
              onClick={() => setFlowMode("gross")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${flowMode === 'gross' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {flowMode === 'gross' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              Client Sends Gross
            </button>
            <button 
              onClick={() => setFlowMode("net")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${flowMode === 'net' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {flowMode === 'net' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              I Want to Receive Net (Reverse)
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-xs text-zinc-500 pr-1 shrink-0">Presets:</span>
            {(["direct", "upwork", "deel", "stripe"] as const).map(p => (
              <button 
                key={p}
                onClick={() => setPreset(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 capitalize ${preset === p ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'}`}
              >
                {p === 'direct' ? 'Direct Wire' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-zinc-400 block">You send exactly</label>
          <div className="flex items-center justify-between bg-zinc-950 rounded-xl border border-zinc-800/80 px-4 py-3 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all duration-150">
            <div className="flex items-baseline gap-1 flex-1">
              <span className="text-xl font-medium text-zinc-500 font-mono">$</span>
              <input 
                className="w-full bg-transparent border-0 p-0 text-3xl font-semibold font-mono tabular-nums text-zinc-100 focus:outline-none focus:ring-0 tracking-tight" 
                placeholder="0.00" 
                type="number" 
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-800 cursor-pointer hover:bg-zinc-900 py-1 px-2.5 rounded-lg transition-colors">
              <span className="text-xl">🇺🇸</span>
              <span className="text-sm text-zinc-100 font-semibold tracking-wide">USD</span>
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Rail & Bank Route Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center mb-6">
          <button type="button" className="md:col-span-5 w-full text-left bg-zinc-950 rounded-xl border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-zinc-400 font-medium">Origin Institution</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 group-hover:text-zinc-400">FEDWIRE / CHIPS</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="text-lg">🇺🇸</span>
                <span className="text-sm text-zinc-200 font-medium truncate">Chase Bank N.A. (US)</span>
              </div>
              <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </button>
          
          <div className="md:col-span-1 flex justify-center py-1 md:py-0">
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>

          <button type="button" className="md:col-span-5 w-full text-left bg-zinc-950 rounded-xl border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-zinc-400 font-medium">Destination Institution</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 group-hover:text-zinc-400">TARGET2 / SEPA</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="text-lg">🇩🇪</span>
                <span className="text-sm text-zinc-200 font-medium truncate">Deutsche Bank AG (DE)</span>
              </div>
              <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </button>
        </div>

        {/* Landed Net Payout Result Banner */}
        <div className="rounded-xl border border-emerald-500/30 p-6 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.02] mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">RECIPIENT RECEIVES</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-black font-mono">
                  Net Landed Amount
                </span>
              </div>
              <div className="text-4xl md:text-5xl text-emerald-400 font-mono font-bold tracking-tight tabular-nums">
                ${netLandedWire.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-2xl text-zinc-100 font-sans font-medium">USD</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/50 border border-emerald-500/20 text-zinc-300 font-mono text-[11px] mt-2">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>≈ €{eurEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR at mid-market rate (0.00% markup)</span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-zinc-400 block font-medium">Settlement Target</span>
              <span className="text-sm text-zinc-100 font-medium flex items-center sm:justify-end gap-1.5 mt-0.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                1 - 2 business days
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-500/20 flex items-center gap-2 text-zinc-400 text-xs">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Arriving in 1-2 business days with standard wire, or under 1 minute via Instant Rail.</span>
          </div>
        </div>

        {/* Plain-English Deduction Breakdown Card */}
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <span className="text-sm text-zinc-100 font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Transparent Friction Breakdown
            </span>
            <div className="inline-flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <button 
                onClick={() => setFeeType("SHA")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold font-mono transition-colors shadow-sm ${feeType === 'SHA' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                SHA (Shared Deductions)
              </button>
              <button 
                onClick={() => setFeeType("OUR")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold font-mono transition-colors shadow-sm ${feeType === 'OUR' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                OUR (Client Covers Fees)
              </button>
            </div>
          </div>
          
          {feeType === "OUR" && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-zinc-900/50 border border-emerald-500/20 flex items-start gap-2 text-zinc-300 text-[11px]">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>You have selected <strong>OUR</strong> instruction. The sender will be billed an extra <strong>${totalFriction.toFixed(2)}</strong> so you receive exactly <strong>${parsedAmount.toFixed(2)}</strong>.</span>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between py-1">
              <div>
                <div className="text-zinc-200 font-medium flex items-center gap-1.5">
                  Intermediary Correspondent Fee
                  <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-xs text-zinc-500">Deducted by intermediate clearing banks in transit</div>
              </div>
              <span className="font-mono text-rose-400 font-medium tabular-nums">-${correspondentFee.toFixed(2)}</span>
            </div>
            
            <div className="flex items-start justify-between py-1 border-t border-zinc-800/80 pt-2">
              <div>
                <div className="text-zinc-200 font-medium flex items-center gap-1.5">
                  Receiving Bank Inward Fee
                  <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-xs text-zinc-500">Standard incoming wire inward processing tariff</div>
              </div>
              <span className="font-mono text-rose-400 font-medium tabular-nums">-${inwardFee.toFixed(2)}</span>
            </div>
            
            <div className="flex items-start justify-between py-1 border-t border-zinc-800/80 pt-2">
              <div>
                <div className="text-zinc-200 font-medium flex items-center gap-1.5">
                  Hidden FX Margin
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-xs text-zinc-500">Guaranteed mid-market FX rate (zero markup)</div>
              </div>
              <span className="font-mono text-emerald-400 font-medium tabular-nums">0.00%</span>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-zinc-700 font-medium">
              <span className="text-zinc-200">Subtotal deductions</span>
              <div className="text-right">
                <span className="font-mono text-zinc-200 font-semibold tabular-nums">-${totalFriction.toFixed(2)} total friction</span>
                <span className="text-xs text-zinc-500 font-mono block tabular-nums">({((totalFriction / parsedAmount) * 100 || 0).toFixed(2)}% of principal)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Rail Benchmark Comparison Cards (2-Card Responsive Grid) */}
      <div>
        <h2 className="text-xl font-bold text-zinc-100 mb-4">Compare Execution Rails</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Standard Bank Wire */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 flex flex-col justify-between hover:border-zinc-700 transition-all duration-150 group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-zinc-800 text-zinc-400">Standard Wire</span>
                <svg className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">Direct SWIFT SHA</h3>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">Standard cross-border wire via legacy correspondent network.</p>
              
              <div className="space-y-3 py-3 border-y border-zinc-800 mb-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total Deductions</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">-${totalFriction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Est. Delivery</span>
                  <span className="text-zinc-200 font-medium">1 - 2 business days</span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[11px] font-medium text-zinc-400">Net Landed:</span>
                <span className="text-xl text-zinc-100 font-mono font-bold tabular-nums">${netLandedWire.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button className="w-full py-2.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-sm font-medium transition-colors">
                Select Wire {feeType}
              </button>
            </div>
          </div>

          {/* Card 2: Local Clearing / Instant Rail (Highlighted) */}
          <div className="bg-zinc-900 rounded-xl border-2 border-emerald-500/50 p-6 flex flex-col justify-between relative shadow-lg shadow-emerald-500/5 hover:border-emerald-500 transition-all duration-150">
            <div className="absolute -top-3 right-6 bg-emerald-500 text-black text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Recommended • 96% Cheaper
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400">Local Rail Routing</span>
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">Local Clearing / Instant Rail</h3>
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">Direct RTGS integration via SEPA / FedNow clearing nodes.</p>
              
              <div className="space-y-3 py-3 border-y border-zinc-800 mb-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total Deductions</span>
                  <div className="text-right">
                    <span className="font-mono text-emerald-400 font-medium tabular-nums">-${localRailFee.toFixed(2)} flat fee</span>
                    <span className="text-emerald-500/80 font-mono text-[10px] block tabular-nums">(Save ${(totalFriction - localRailFee).toFixed(2)})</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Est. Delivery</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Under 60 seconds
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[11px] font-medium text-zinc-400">Net Landed:</span>
                <span className="text-xl text-emerald-400 font-mono font-bold tabular-nums">${netLandedLocal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all shadow-sm active:scale-95">
                Route via Instant Rail
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Action Bar */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button onClick={copyInvoiceNote} type="button" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-all shadow-sm active:scale-95">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Copy Invoice Note</span>
          </button>
          <button onClick={copyBreakdown} type="button" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:text-emerald-400 transition-colors text-sm text-zinc-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <span>Copy Deduction Breakdown</span>
          </button>
          <button type="button" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:text-emerald-400 transition-colors text-sm text-zinc-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            <span>Route Summary PDF</span>
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button type="button" className="text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <span>Share Calculation Link</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Alert */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 flex items-center gap-3 bg-zinc-800 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-xl text-zinc-100 ${toastMsg ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="text-sm font-medium">{toastMsg}</span>
      </div>

    </div>
  );
}
