"use client";

import { useState } from "react";
import type { ChannelQuote, Corridor, Platform, Verdict } from "@/lib/types";
import { formatLocal, formatUSD } from "@/utils/format";

/**
 * Obsidian hero verdict card — an Apple Wallet / dark macOS-widget look.
 *
 * Answer-first (BLUF): the cheapest provider, the net take-home in huge
 * tabular figures, and the exact savings versus the costliest route. The
 * "Copy Audit" action writes a plain-text, brand-name audit to the clipboard
 * (browser-only, static-export safe); provider names appear strictly under
 * nominative fair use for factual cost comparison. No third-party logos.
 */
export default function VerdictCard({
  verdict,
  corridor,
  quotes,
  platform,
}: {
  verdict: Verdict;
  corridor: Corridor;
  quotes: ChannelQuote[];
  platform: Platform;
}) {
  const [copied, setCopied] = useState(false);

  if (verdict.best === null || verdict.worst === null || quotes.length === 0) {
    return null;
  }

  const best = verdict.best;
  const worst = verdict.worst;

  async function copyAudit(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    const auditText = [
      "PayoutDelta Audit",
      `${corridor.from} → ${corridor.to} · ${corridor.country}`,
      `Client platform: ${platform.name} (${platform.feePercent}%)`,
      `Gross: ${formatUSD(best.grossUSD)}`,
      `Cheapest provider: ${best.channelName}`,
      `Net take-home: ${formatLocal(best.localAmount, corridor)}`,
      `Total cost: ${best.totalCostPercent.toFixed(2)}%`,
      `Saved vs ${worst.channelName}: +${formatUSD(verdict.savingsUSD)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(auditText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-label="Best payout channel verdict"
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0D0D11] p-6 text-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
      />

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
          />
          Recommended route ·{" "}
          <span className="tabular-nums">
            {corridor.from} → {corridor.to}
          </span>
        </p>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
          {best.channelName}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          nets you the most for a {formatUSD(best.grossUSD)} payout ·{" "}
          <span className="tabular-nums">
            {best.totalCostPercent.toFixed(1)}%
          </span>{" "}
          all-in cost
        </p>

        <p className="mt-5 text-xs font-medium uppercase tracking-widest text-white/40">
          Net take-home
        </p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-tight tabular-nums text-white sm:text-4xl">
          {formatLocal(best.localAmount, corridor)}
        </p>

        <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold tabular-nums text-emerald-400 ring-1 ring-emerald-400/20">
              +{formatUSD(verdict.savingsUSD)} saved
            </span>
            <span className="text-xs text-white/40">
              vs {worst.channelName}
            </span>
          </div>

          <button
            type="button"
            aria-live="polite"
            onClick={() => {
              void copyAudit();
            }}
            className={`inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out ${
              copied
                ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-300"
                : "bg-white/[0.08] hover:bg-white/[0.16]"
            }`}
          >
            {copied ? "Copied!" : "Copy Audit"}
          </button>
        </div>
      </div>
    </section>
  );
}