"use client";

import { useState, useEffect } from "react";
import { isAudioEnabled, setAudioEnabled, playClick } from "@/lib/sound";

export function SovereignHeader() {
  const [audioOn, setAudioOn] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [freshness, setFreshness] = useState<{ dateStr: string; isStale: boolean } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setAudioOn(isAudioEnabled());
    
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
  }, []);

  const handleAudioToggle = () => {
    const next = !audioOn;
    setAudioOn(next);
    setAudioEnabled(next);
    if (next) {
      playClick();
    }
  };

  return (
    <>
      {/* Ambient Top Subtle Emerald Vignette & Dot Matrix (applies globally) */}
      <div className="fixed inset-0 terminal-grid pointer-events-none opacity-40 z-0"></div>

      {/* Right Edge Vertical 4px Friction Minimap Strip */}
      <div className="fixed top-0 right-0 bottom-0 w-1 z-50 flex flex-col pointer-events-none opacity-85">
        <div className="h-[28%] bg-emerald-500/70 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Sub-5 bps Tier"></div>
        <div className="h-[42%] bg-amber-400/70 shadow-[0_0_8px_rgba(251,191,36,0.5)]" title="Mid-Range Drag Tier (5-30 bps)"></div>
        <div className="h-[30%] bg-rose-500/70 shadow-[0_0_8px_rgba(244,63,94,0.5)]" title="Heavy Friction / Intermediary Cut (>30 bps)"></div>
      </div>

      <header className="w-full h-11 hairline-border-b bg-[#0c0c0c]/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Left: Sovereign Title + Pulsing Status Dot */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Monogram Logo Icon */}
            <div className="w-5 h-5 bg-zinc-900 hairline-border rounded flex items-center justify-center text-emerald-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-wider text-zinc-100 uppercase">
              PAYOUT-DELTA <span className="text-zinc-500 font-normal">{"//"}</span> <span className="text-zinc-300">SETTLEMENT LEDGER</span>
            </span>
          </div>

          <span className="text-zinc-700">|</span>

          {/* Node Sync State */}
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-emerald-950/30 hairline-border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono tracking-tight text-emerald-400 font-medium tabular-nums hidden sm:inline-block">
              ALL 195 SOVEREIGN NODES SYNCHRONIZED
            </span>
          </div>

          {/* Latency Pill */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 tabular-nums">
            <span className="text-zinc-600">RTT:</span> <span className="text-zinc-300">1.8ms</span>
            <span className="text-zinc-600">EPOCH:</span> <span className="text-zinc-300">#498,204</span>
          </div>
        </div>

        {/* Right: Controls & Cheat-Pills */}
        <div className="flex items-center gap-2">
          {/* Freshness Badge */}
          {freshness && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900/80 hairline-border text-[11px] font-mono tabular-nums">
              <span className="text-zinc-500">Statutory Rails Audited:</span>
              <span className={`font-semibold ${freshness.isStale ? "text-amber-400" : "text-zinc-200"}`}>{freshness.dateStr}</span>
              <span className="text-emerald-400 font-mono text-[10px]">• Live Client-Side Engine</span>
              {freshness.isStale && (
                <span className="text-amber-500/90 italic ml-2 hidden xl:inline-block">
                  (Static benchmark feeds may not reflect intra-day bank tariff changes)
                </span>
              )}
            </div>
          )}

          {/* Quick Stats Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900/80 hairline-border text-[11px] font-mono text-zinc-400 tabular-nums">
            <span className="text-zinc-500">LIQUIDITY DEPTH</span>
            <span className="text-zinc-200 font-semibold">$1.482B</span>
            <span className="text-emerald-400 font-mono text-[10px]">+0.4%</span>
          </div>

          {/* Audio Haptic Toggle Pill */}
          <button 
            onClick={handleAudioToggle}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 hairline-border hover:border-zinc-600 transition text-[10px] font-mono text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500" 
            title="Toggle Terminal Audio Clicks"
          >
            <svg className={`w-3 h-3 ${mounted && audioOn ? "text-emerald-400" : "text-zinc-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mounted && audioOn ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </>
              )}
            </svg>
            <span className="text-zinc-400 font-medium hidden sm:inline-block">AUDIO: <span className={mounted && audioOn ? "text-emerald-400 font-semibold" : "text-zinc-500 font-semibold"}>{mounted && audioOn ? "ON" : "OFF"}</span></span>
          </button>

          {/* Sovereign Key Badge */}
          <div className="h-6 w-6 rounded bg-zinc-900 hairline-border flex items-center justify-center text-[10px] font-mono text-zinc-400 font-bold">
            0x9
          </div>
        </div>
      </header>
    </>
  );
}
