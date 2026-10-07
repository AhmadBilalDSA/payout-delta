/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { TransitionLink as Link } from "@/components/nav/TransitionLink";
import banksRegistryData from "@/data/banksRegistry.json";
import jurisdictionsData from "@/data/jurisdictions.json";
import feesData from "@/data/fees.json";
import BankFrictionInspector from "@/components/corridors/BankFrictionInspector";

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
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<{ dateStr: string; isStale: boolean } | null>(null);
  
  const originBankOpts = useMemo(() => ALL_BANKS.filter(b => b.countryIso2 === "US"), []);
  const destBankOpts = useMemo(() => ALL_BANKS.filter(b => b.countryIso2 !== "US"), []);

  const [originBankBic, setOriginBankBic] = useState(originBankOpts.find(b => b.name.includes("Chase"))?.bic || originBankOpts[0].bic);
  const [destBankBic, setDestBankBic] = useState(destBankOpts.find(b => b.name.includes("Habib"))?.bic || destBankOpts.find(b => b.name.includes("Deutsche Bank"))?.bic || destBankOpts[0].bic);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2500);
  };

  useEffect(() => {
    try {
      if (window.location.hash) {
        const hashParams = window.location.hash.replace("#", "").split(",");
        if (hashParams[0] === "calc" && hashParams.length >= 5) {
          const initAmount = parseFloat(hashParams[1]);
          if (!isNaN(initAmount) && initAmount > 0) setAmountStr(initAmount.toString());
          if (hashParams[2] === "gross" || hashParams[2] === "net") setFlowMode(hashParams[2]);
          if (hashParams[3] in PRESET_FEES) setPreset(hashParams[3] as PresetKey);
          if (hashParams[4] === "SHA" || hashParams[4] === "OUR") setFeeType(hashParams[4]);
          
          if (hashParams[5]) {
            const ob = originBankOpts.find(b => b.bic === hashParams[5]);
            if (ob) setOriginBankBic(ob.bic);
            else console.warn(`[Diagnostic] Unknown origin BIC in hash: ${hashParams[5]}, falling back to default.`);
          }
          if (hashParams[6]) {
            const db = destBankOpts.find(b => b.bic === hashParams[6]);
            if (db) setDestBankBic(db.bic);
            else console.warn(`[Diagnostic] Unknown dest BIC in hash: ${hashParams[6]}, falling back to default.`);
          }
        }
      }
    } catch (err) {
      console.warn("[Diagnostic] Failed to parse calculator hash state, resetting.", err);
      window.location.hash = "";
    }
    
    try {
      fetch("/payout-delta/api/fees.json")
        .then(r => r.json())
        .then(data => {
          if (data.lastCompiledAudit) {
            const auditDate = new Date(data.lastCompiledAudit);
            const diffDays = (Date.now() - auditDate.getTime()) / (1000 * 60 * 60 * 24);
            const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
            setFreshness({
              dateStr: formatter.format(auditDate),
              isStale: diffDays > 30
            });
          }
        })
        .catch(console.error);
    } catch {
      // ignore
    }
    
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [destBankOpts, originBankOpts]);

  let rawAmount = parseFloat(amountStr);
  if (isNaN(rawAmount) || !isFinite(rawAmount) || rawAmount < 0) rawAmount = 0;
  const parsedAmount = rawAmount;
  
  const isSHA = feeType === "SHA";

  const presetData = PRESET_FEES[preset] || PRESET_FEES.wire;
  const { wirePlatform, wireInward, localPlatform, localInward } = presetData;
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
      url.hash = `calc,${parsedAmount},${flowMode},${preset},${feeType},${originBankBic},${destBankBic}`;
      navigator.clipboard.writeText(url.toString())
        .then(() => showToast("Calculation link copied!"))
        .catch(() => showToast("Failed to copy link"));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 font-sans mb-16">
      <section className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm min-h-[580px] md:min-h-[520px]">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-zinc-800/80 gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[11px] uppercase tracking-wider text-zinc-100 font-medium">Rate locked for 48:00</span>
            </div>
            
            {freshness && (
              <div className="flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900/80 hairline-border text-[11px] font-mono tabular-nums self-start md:self-auto">
                <span className="text-zinc-500">Statutory Rails Audited:</span>
                <span className={`font-semibold ${freshness.isStale ? "text-amber-400" : "text-zinc-200"}`}>{freshness.dateStr}</span>
                <span className="text-emerald-400 font-mono text-[10px] hidden sm:inline-block">• Live Client-Side Engine</span>
                {freshness.isStale && (
                  <span className="text-amber-500/90 italic ml-2 hidden sm:inline-block">
                    (Static benchmark feeds may not reflect intra-day bank tariff changes)
                  </span>
                )}
              </div>
            )}
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

        {/* Gross Send Card */}
        <div className="bg-zinc-950 rounded-t-2xl border border-zinc-800/80 p-5 md:p-6 z-10 relative">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Gross Send (USD)</label>
              <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                {feeType} PRESET
              </div>
            </div>
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-medium text-zinc-500 font-mono">$</span>
                <input 
                  className="w-full bg-transparent border-0 p-0 text-4xl md:text-5xl font-semibold font-mono tabular-nums text-zinc-100 focus:outline-none focus:ring-0 tracking-tight" 
                  placeholder="0.00" 
                  type="number" 
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pl-3 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                <span className="text-xl leading-none">🇺🇸</span>
                <span className="text-sm text-zinc-100 font-semibold tracking-wide">USD</span>
              </div>
            </div>

            <div className="pt-2">
              <BankSelector 
                label="Origin Institution" 
                value={originBankBic} 
                options={originBankOpts} 
                onChange={setOriginBankBic} 
                railLabel="FEDWIRE / CHIPS"
              />
            </div>
          </div>
        </div>

        {/* Centered Overlapping Circular Swap */}
        <div className="relative h-2 flex items-center justify-center -my-3 z-20 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-zinc-900 border-4 border-zinc-950 flex items-center justify-center text-emerald-400 shadow-sm shadow-black/50 z-20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>

        {/* True Landed Cash Card & Destination Bank */}
        <div className="bg-zinc-950 rounded-b-2xl border border-zinc-800/80 p-5 md:p-6 z-10 relative mb-6">
          <div className="flex flex-col gap-4">
            
            <div className="pb-2">
              <BankSelector 
                label="Destination Institution" 
                value={destBankBic} 
                options={destBankOpts} 
                onChange={setDestBankBic} 
              />
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">True Landed Cash</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 font-mono text-[10px] border border-zinc-800">
                    Baseline: {fxRate.toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl md:text-4xl text-emerald-400 font-mono font-bold tracking-tight tabular-nums">
                  {(flowMode === 'gross' ? wireNetLanded : wireRequiredGross).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-zinc-400 mt-1 font-mono">
                  ≈ {destBank.currency === 'USD' ? '$' : ''}{localCurrencyEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {destBank.currency}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="mt-4">
          <button 
            onClick={() => setShowAuditDrawer(!showAuditDrawer)}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-zinc-800/80 hover:bg-zinc-800 transition-colors rounded-xl text-zinc-300 font-medium text-sm"
          >
            <span>Audit Bank Friction & Intermediary Deductions</span>
            <svg className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${showAuditDrawer ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAuditDrawer ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <BankFrictionInspector />
          </div>
        </div>
      </section>

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
