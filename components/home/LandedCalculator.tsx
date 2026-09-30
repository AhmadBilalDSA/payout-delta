"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import banksRegistryData from "@/data/banksRegistry.json";
import jurisdictionsData from "@/data/jurisdictions.json";
import feesData from "@/data/fees.json";

const PRESET_FEES = {
  wire: { wirePlatform: 25.0, wireInward: 10.0, localPlatform: 1.5, localInward: 0.0, name: "Direct Wire" },
  upwork: { wirePlatform: 30.0, wireInward: 0.0, localPlatform: 2.0, localInward: 0.0, name: "Upwork" },
  deel: { wirePlatform: 5.0, wireInward: 0.0, localPlatform: 5.0, localInward: 0.0, name: "Deel" },
  stripe: { wirePlatform: 15.0, wireInward: 0.0, localPlatform: 15.0, localInward: 0.0, name: "Stripe" }
} as const;

type PresetKey = keyof typeof PRESET_FEES;

// Precompute bank options
const jurisdictionsByIso2 = jurisdictionsData.jurisdictions.reduce((acc: Record<string, { currency?: string; primaryRailId?: string }>, j: { iso2: string; currency?: string; primaryRailId?: string }) => {
  acc[j.iso2] = j;
  return acc;
}, {});

function getFlagEmoji(iso2: string) {
  if (!iso2) return "🏦";
  return [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

const ALL_BANKS = banksRegistryData.banks.map((b: { bic: string; name: string; countryIso2: string; [key: string]: unknown }) => {
  const jurisdiction = jurisdictionsByIso2[b.countryIso2];
  return {
    ...b,
    currency: jurisdiction?.currency || "USD",
    flag: getFlagEmoji(b.countryIso2),
    rail: jurisdiction?.primaryRailId || "SWIFT",
  };
});

type BankOption = typeof ALL_BANKS[0];

function BankSelector({ label, value, options, onChange, railLabel }: { label: string; value: string; options: BankOption[]; onChange: (val: string) => void; railLabel?: string }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.bic === value) || options[0];

  return (
    <div className="relative md:col-span-5 w-full">
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="w-full text-left bg-zinc-950 rounded-xl border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/50 group"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 group-hover:text-zinc-400">{railLabel || selected.rail}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="text-lg leading-none">{selected.flag}</span>
            <span className="text-sm text-zinc-200 font-medium truncate">{selected.name} ({selected.countryIso2})</span>
          </div>
          <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-zinc-900 border border-zinc-700 py-1 shadow-2xl shadow-black/80 text-sm ring-1 ring-white/10">
            {options.map((opt) => (
              <li key={opt.bic}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center justify-between gap-2 transition-colors focus:bg-zinc-800 focus:outline-none"
                  onClick={() => { onChange(opt.bic); setOpen(false); }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-lg leading-none">{opt.flag}</span>
                    <span className="text-zinc-200 truncate">{opt.name}</span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono shrink-0">{opt.bic}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function LandedCalculator() {
  const [amountStr, setAmountStr] = useState("5000");
  const [flowMode, setFlowMode] = useState<"gross" | "net">("gross");
  const [preset, setPreset] = useState<PresetKey>("wire");
  const [feeType, setFeeType] = useState<"SHA" | "OUR">("SHA");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const originBankOpts = useMemo(() => ALL_BANKS.filter(b => b.countryIso2 === "US"), []);
  const destBankOpts = useMemo(() => ALL_BANKS.filter(b => b.countryIso2 !== "US"), []);

  const [originBankBic, setOriginBankBic] = useState(originBankOpts.find(b => b.name.includes("Chase"))?.bic || originBankOpts[0].bic);
  const [destBankBic, setDestBankBic] = useState(destBankOpts.find(b => b.name.includes("Deutsche Bank"))?.bic || destBankOpts[0].bic);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const parsedAmount = parseFloat(amountStr) || 0;
  const isSHA = feeType === "SHA";

  const { wirePlatform, wireInward, localPlatform, localInward } = PRESET_FEES[preset];
  const totalWireFriction = wirePlatform + wireInward;
  const totalLocalFriction = localPlatform + localInward;

  let wireNetLanded = 0;
  let wireRequiredGross = 0;
  let localNetLanded = 0;
  let localRequiredGross = 0;
  
  if (flowMode === "gross") {
    wireNetLanded = Math.max(0, isSHA ? parsedAmount - totalWireFriction : parsedAmount);
    localNetLanded = Math.max(0, isSHA ? parsedAmount - totalLocalFriction : parsedAmount);
    wireRequiredGross = parsedAmount; 
    localRequiredGross = parsedAmount;
  } else {
    wireNetLanded = parsedAmount;
    localNetLanded = parsedAmount;
    wireRequiredGross = isSHA ? parsedAmount + totalWireFriction : parsedAmount;
    localRequiredGross = isSHA ? parsedAmount + totalLocalFriction : parsedAmount;
  }

  const destBank = destBankOpts.find(b => b.bic === destBankBic) || destBankOpts[0];
  
  const fxRate = useMemo(() => {
    if (destBank.currency === "USD") return 1;
    const slug = `usd-to-${destBank.currency.toLowerCase()}`;
    const corridor = feesData.corridors.find((c: { slug: string; rate: number }) => c.slug === slug);
    return corridor ? corridor.rate : 1;
  }, [destBank.currency]);

  const localCurrencyEquivalent = wireNetLanded * fxRate;

  const copyBreakdown = () => {
    const text = `Landed Payout Calculation Breakdown:\nPrincipal: $${parsedAmount.toFixed(2)} USD\nIntermediary/Platform Cut: -$${wirePlatform.toFixed(2)}\nReceiving Bank Inward Fee: -$${wireInward.toFixed(2)}\nFX Spread: 0.00% (Guaranteed mid-market)\n${flowMode === 'gross' ? 'Net Landed' : 'Required Invoice'}: $${(flowMode === 'gross' ? wireNetLanded : wireRequiredGross).toFixed(2)} USD via ${PRESET_FEES[preset].name} ${feeType}.`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => showToast("Fee breakdown copied to clipboard"))
        .catch(() => showToast("Failed to copy breakdown"));
    }
  };

  const copyInvoiceNote = () => {
    const text = `Please process this payment via ${PRESET_FEES[preset].name} ${feeType}. I am expecting $${wireNetLanded.toFixed(2)} USD landed.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => showToast("Invoice note copied to clipboard"))
        .catch(() => showToast("Failed to copy note"));
    }
  };
  
  const shareLink = () => {
    if (navigator.clipboard) {
      const url = new URL(window.location.href);
      url.hash = `calc,${parsedAmount},${flowMode},${preset},${feeType}`;
      navigator.clipboard.writeText(url.toString())
        .then(() => showToast("Calculation link copied!"))
        .catch(() => showToast("Failed to copy link"));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 font-sans mb-16">
      <section className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm min-h-[500px]">
        
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
            {(Object.keys(PRESET_FEES) as PresetKey[]).map(p => (
              <button 
                key={p}
                onClick={() => setPreset(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 capitalize ${preset === p ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'}`}
              >
                {PRESET_FEES[p].name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-zinc-400 block">{flowMode === 'gross' ? 'You send exactly' : 'Recipient needs exactly'}</label>
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
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-800 py-1 px-2.5 rounded-lg bg-zinc-900/50">
              <span className="text-xl leading-none">🇺🇸</span>
              <span className="text-sm text-zinc-100 font-semibold tracking-wide">USD</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center mb-6 z-20 relative">
          <BankSelector 
            label="Origin Institution" 
            value={originBankBic} 
            options={originBankOpts} 
            onChange={setOriginBankBic} 
            railLabel="FEDWIRE / CHIPS"
          />
          
          <div className="md:col-span-1 flex justify-center py-1 md:py-0 pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>

          <BankSelector 
            label="Destination Institution" 
            value={destBankBic} 
            options={destBankOpts} 
            onChange={setDestBankBic} 
          />
        </div>

        <div className="rounded-xl border border-emerald-500/30 p-6 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.02] mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">{flowMode === 'gross' ? 'RECIPIENT RECEIVES' : 'YOU NEED TO INVOICE'}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-black font-mono">
                  {flowMode === 'gross' ? 'Net Landed Amount' : 'Required Gross Invoice'}
                </span>
              </div>
              <div className="text-4xl md:text-5xl text-emerald-400 font-mono font-bold tracking-tight tabular-nums">
                ${(flowMode === 'gross' ? wireNetLanded : wireRequiredGross).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-2xl text-zinc-100 font-sans font-medium">USD</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/50 border border-emerald-500/20 text-zinc-300 font-mono text-[11px] mt-2">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>≈ {destBank.currency === 'USD' ? '$' : ''}{localCurrencyEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {destBank.currency} at mid-market rate</span>
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
        </div>

        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5 z-10 relative">
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
              <span>You have selected <strong>OUR</strong> instruction. The sender will be billed an extra <strong>${totalWireFriction.toFixed(2)}</strong> so you receive exactly <strong>${parsedAmount.toFixed(2)}</strong>.</span>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between py-1">
              <div>
                <div className="text-zinc-200 font-medium flex items-center gap-1.5">
                  Intermediary / Platform Cut
                  <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-xs text-zinc-500">Deducted by intermediate clearing banks or platform</div>
              </div>
              <span className="font-mono text-rose-400 font-medium tabular-nums">-${wirePlatform.toFixed(2)}</span>
            </div>
            
            <div className="flex items-start justify-between py-1 border-t border-zinc-800/80 pt-2">
              <div>
                <div className="text-zinc-200 font-medium flex items-center gap-1.5">
                  Receiving Bank Inward Fee
                  <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-xs text-zinc-500">Standard incoming wire inward processing tariff</div>
              </div>
              <span className="font-mono text-rose-400 font-medium tabular-nums">-${wireInward.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-zinc-700 font-medium">
              <span className="text-zinc-200">Subtotal deductions</span>
              <div className="text-right">
                <span className="font-mono text-zinc-200 font-semibold tabular-nums">-${totalWireFriction.toFixed(2)} total friction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-xl font-bold text-zinc-100 mb-4">Compare Execution Rails</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 flex flex-col justify-between hover:border-zinc-700 transition-all duration-150 min-h-[220px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-zinc-800 text-zinc-400">{PRESET_FEES[preset].name} (Standard)</span>
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">Direct SWIFT SHA</h3>
              
              <div className="space-y-3 py-3 border-y border-zinc-800 mb-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total Deductions</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">-${totalWireFriction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Est. Delivery</span>
                  <span className="text-zinc-200 font-medium">1 - 2 business days</span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[11px] font-medium text-zinc-400">{flowMode === 'gross' ? 'Net Landed:' : 'Required Gross:'}</span>
                <span className="text-xl text-zinc-100 font-mono font-bold tabular-nums">${(flowMode === 'gross' ? wireNetLanded : wireRequiredGross).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button className="w-full py-2.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-sm font-medium transition-colors">
                Select Wire {feeType}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl border-2 border-emerald-500/50 p-6 flex flex-col justify-between relative shadow-lg shadow-emerald-500/5 hover:border-emerald-500 transition-all duration-150 min-h-[220px]">
            <div className="absolute -top-3 right-6 bg-emerald-500 text-black text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Recommended • Faster
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400">Local Rail Routing</span>
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">Local Clearing / Instant Rail</h3>
              
              <div className="space-y-3 py-3 border-y border-zinc-800 mb-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total Deductions</span>
                  <div className="text-right">
                    <span className="font-mono text-emerald-400 font-medium tabular-nums">-${totalLocalFriction.toFixed(2)} flat fee</span>
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
                <span className="text-[11px] font-medium text-zinc-400">{flowMode === 'gross' ? 'Net Landed:' : 'Required Gross:'}</span>
                <span className="text-xl text-emerald-400 font-mono font-bold tabular-nums">${(flowMode === 'gross' ? localNetLanded : localRequiredGross).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all shadow-sm active:scale-95">
                Route via Instant Rail
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button onClick={copyInvoiceNote} type="button" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-all shadow-sm active:scale-95">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Copy Invoice Note</span>
          </button>
          <button onClick={copyBreakdown} type="button" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:text-emerald-400 transition-colors text-sm text-zinc-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <span>Copy Deduction Breakdown</span>
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button onClick={shareLink} type="button" className="text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <span>Share Calculation Link</span>
          </button>
        </div>
      </div>

      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 flex items-center gap-3 bg-zinc-800 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-xl text-zinc-100 ${toastMsg ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="text-sm font-medium">{toastMsg}</span>
      </div>
    </div>
  );
}
