import { GlobalSearchTrigger } from "@/components/search/CorridorSearch";
import CorridorSelector from "@/components/CorridorSelector";

/**
 * Institutional hero — authoritative headline, precise sub-heading, and a
 * meta-stats strip (audited corridors / zero-tracking / tax-aware).
 */
export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-black/[0.06] dark:border-white/[0.08]"
    >
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
        <h1
          id="hero-heading"
          className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 text-balance sm:text-5xl lg:text-6xl dark:text-white"
        >
          Stop losing{" "}
          <span className="tabular-nums text-emerald-600 dark:text-emerald-400">4.2%</span> on
          cross-border withdrawals.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-white/60">
          Independent fee and spread auditor benchmarked against real-time interbank foreign exchange rates.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-mono tabular-nums tracking-tight text-slate-500 dark:text-slate-400">
          <span>208 Audited Payout Corridors</span>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
          <span>0ms Client-Side Evaluation (Zero Tracking)</span>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
          <span>FBR Sec 154A & Section 195 Tax-Aware</span>
        </div>
        <div className="mt-8 flex flex-col items-center gap-6">
          {/* Hero Search Trigger */}
          <div className="w-full max-w-md">
            <GlobalSearchTrigger standalone className="w-full justify-between py-3 px-4 text-sm bg-zinc-900/50 hover:bg-zinc-800/80 shadow-inner" />
          </div>
          <div className="flex justify-center">
            <CorridorSelector />
          </div>
        </div>
      </div>
    </section>
  );
}
