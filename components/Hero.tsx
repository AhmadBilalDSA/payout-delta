import CorridorSelector from "@/components/CorridorSelector";

/**
 * Minimalist Apple-style hero — large tracking-tight typography, a single
 * emerald savings callout, and the corridor capsule. Server component; the
 * only client island is the selector below it.
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
          Independent fee and spread auditor benchmarked against real-time
          interbank foreign exchange rates.
        </p>
        <div className="mt-8 flex justify-center">
          <CorridorSelector />
        </div>
      </div>
    </section>
  );
}