"use client";

import { useState } from "react";

const SHARE_BENCHMARK =
  "Did you know traditional banks take an average of 4.2% on international wires to Asia and LatAm? My bank took $42 on $1,000. Audit your exact wire leakage on PayoutDelta: https://ahmadbilaldsa.github.io/payout-delta";

const SITE_URL = "https://ahmadbilaldsa.github.io/payout-delta";

/**
 * PayoutDelta — "Leakage Leaderboard" one-click social share generator.
 *
 * A client-side snippet card that packages the global bank-leakage benchmark
 * into a clean, copy-paste markdown one-liner for LinkedIn / X. All copy is
 * built in-memory — the only network access is the visitor's own share/open
 * actions, so the zero-telemetry invariant stays intact.
 */
export default function LeaderboardShareCard() {
  const [copied, setCopied] = useState(false);

  async function copyBenchmark(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(SHARE_BENCHMARK);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const encode = (value: string) => encodeURIComponent(value);

  return (
    <section
      aria-label="Shareable leakage benchmark"
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 text-white shadow-md backdrop-blur-md sm:p-7"
    >
      <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
        />
        Share the Benchmark
      </p>
      <h2 className="mt-4 text-lg font-bold tracking-tight text-white">
        The leak nobody invoices for is yours to expose.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        One click packages a clean, quote-ready comparison for LinkedIn or X —
        no telemetry, no login, no server.
      </p>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="text-xs leading-relaxed text-white/70">
          “Did you know traditional banks take an average of{" "}
          <span className="font-mono tabular-nums tracking-tight">
            4.2%
          </span>{" "}
          on international wires to Asia and LatAm? My bank took{" "}
          <span className="font-mono tabular-nums tracking-tight">$42</span>{" "}
          on <span className="font-mono tabular-nums tracking-tight">
            $1,000
          </span>
          . Audit your exact wire leakage on PayoutDelta.”
        </p>
      </div>

      <div className="mt-4 flex w-full flex-wrap items-center gap-2">
        <button
          type="button"
          aria-live="polite"
          onClick={() => {
            void copyBenchmark();
          }}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-slate-950 transition-all duration-150 ease-out shadow-lg shadow-emerald-500/20 ${
            copied
              ? "bg-emerald-300"
              : "bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99]"
          }`}
        >
          {copied ? "Copied ✓" : "Copy Shareable Benchmark"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encode(SHARE_BENCHMARK)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3 text-xs font-semibold text-slate-200 transition-colors duration-150 ease-out hover:bg-slate-800"
        >
          Post on X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encode(SITE_URL)}&title=${encode("The Global Cross-Border Banking Leakage Index")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3 text-xs font-semibold text-slate-200 transition-colors duration-150 ease-out hover:bg-slate-800"
        >
          Share on LinkedIn
        </a>
      </div>
    </section>
  );
}