"use client";

import { useMemo, useState } from "react";

import type { Corridor, Platform, WithdrawalChannel } from "@/lib/types";
import {
  clampGrossUSD,
  computeRoute,
  DEFAULT_GROSS_USD,
  MAX_GROSS_USD,
  MIN_GROSS_USD,
  SLIDER_STEP_USD,
} from "@/utils/calculateRoute";
import VerdictCard from "@/components/VerdictCard";

/**
 * Interactive payout auditor (client island) — Apple-grade, iOS-feel.
 *
 * All math is `useMemo`-memoized across the only two inputs that matter
 * (amount + platform), so re-renders are O(1) and the paid-route comparison
 * is instantaneous. No requests, no external fetches — guarantees the static
 * export budget holds even on slow connections (INP well under 50ms).
 *
 * No proprietary third-party logos are shipped; providers appear as plain
 * type only, under nominative fair use, with the explicit disclaimer below.
 *
 * ---------------------------------------------------------------------------
 * PHASE 2 — COMMENTED SAAS HOOKS (do NOT implement in Phase 1)
 * ---------------------------------------------------------------------------
 * <button type="button">Export Invoice Justification PDF</button>
 * <button type="button">Set Rate Drop Alert</button>
 *
 * 1) EXPORT INVOICE PDF — once self-hosted, inject a button beside the
 *    verdict that POSTs {amount, platform, corridor, bestChannel} to the Phase
 *    2 API; server renders a PDF via pdf-lib/(puppeteer) and returns bytes.
 *    Static export forbids request-time render today, hence the stub UI only.
 *
 * 2) RATE DROP ALERTS — hydrate an optional email form when the managed
 *    backend is available: subscribe → writes row in fact_rate_alerts, and
 *    the cron job (reusing scripts/playwright_scraper.py) emails the user
 *    when `liveRate < (rate * (1 - threshold))`. Phase 1: commented block.
 * ---------------------------------------------------------------------------
 */

const PRESET_AMOUNTS: readonly number[] = [500, 1000, 2500, 5000, 10000];

function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatLocal(amount: number, corridor: Corridor): string {
  return `${corridor.currencySymbol} ${Math.round(amount).toLocaleString(
    "en-US"
  )}`;
}

export default function Calculator({
  corridor,
  platforms,
  channels,
}: {
  corridor: Corridor;
  platforms: Platform[];
  channels: WithdrawalChannel[];
}) {
  const [amount, setAmount] = useState<number>(DEFAULT_GROSS_USD);
  const [platformId, setPlatformId] = useState<string>(
    platforms[0]?.id ?? "upwork"
  );
  const [openChannelId, setOpenChannelId] = useState<string | null>(null);

  const platform =
    platforms.find((item) => item.id === platformId) ?? platforms[0];

  const route = useMemo(
    () => computeRoute(amount, platform, corridor, channels),
    [amount, platform, corridor, channels]
  );

  const handlePreset = (preset: number): void => {
    setAmount(clampGrossUSD(preset));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* BLUF verdict sits ABOVE the inputs — answer first, knobs second. */}
      <VerdictCard
        verdict={route.verdict}
        corridor={corridor}
        quotes={route.quotes}
        platform={platform}
      />

      {/* iOS-style input & preset capsule */}
      <section
        aria-labelledby="audit-inputs"
        className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8"
      >
        <h2
          id="audit-inputs"
          className="text-xs font-semibold uppercase tracking-widest text-black/40"
        >
          Audit inputs
        </h2>

        <div className="mt-5 gap-8 lg:grid lg:grid-cols-2">
          {/* Amount */}
          <fieldset>
            <legend className="flex items-baseline justify-between text-sm font-medium text-black/70">
              <span>Gross client payment</span>
              <span className="font-bold tabular-nums text-black">
                ${amount.toLocaleString("en-US")}
              </span>
            </legend>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => {
                const isActive = amount === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handlePreset(preset)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium tabular-nums transition-all duration-200 ease-out ${
                      isActive
                        ? "bg-black text-white shadow-sm"
                        : "bg-[#F2F2F7] text-black/60 hover:text-black"
                    }`}
                  >
                    ${preset.toLocaleString("en-US")}
                  </button>
                );
              })}
            </div>

            <input
              type="range"
              min={MIN_GROSS_USD}
              max={MAX_GROSS_USD}
              step={SLIDER_STEP_USD}
              value={amount}
              onChange={(event) =>
                setAmount(clampGrossUSD(Number(event.currentTarget.value)))
              }
              aria-label="Gross client payment in USD"
              className="mt-5 h-2 w-full cursor-pointer rounded-lg bg-neutral-100 accent-emerald-600"
            />
            <div className="mt-2 flex justify-between text-xs tabular-nums text-black/[0.45]">
              <span>${MIN_GROSS_USD.toLocaleString("en-US")}</span>
              <span>${MAX_GROSS_USD.toLocaleString("en-US")}</span>
            </div>
          </fieldset>

          {/* Platform segmented switcher */}
          <fieldset className="mt-8 lg:mt-0">
            <legend className="text-sm font-medium text-black/70">
              Client platform
            </legend>
            <div
              role="group"
              aria-label="Client platform"
              className="mt-4 flex gap-1 rounded-2xl bg-[#F2F2F7] p-1.5"
            >
              {platforms.map((item) => {
                const isActive = item.id === platformId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setPlatformId(item.id)}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium tabular-nums transition-all duration-200 ease-out ${
                      isActive
                        ? "bg-white text-black shadow-sm"
                        : "text-black/55 hover:text-black"
                    }`}
                  >
                    {item.name}
                    <span className="ml-1.5 text-xs opacity-60">
                      {item.feePercent}%
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

      {/* Ranked fee breakdown — expandable hairline disclosure cards */}
      <section aria-labelledby="fee-breakdown">
        <h2
          id="fee-breakdown"
          className="text-xs font-semibold uppercase tracking-widest text-black/40"
        >
          Ranked fee breakdown
        </h2>

        <div className="mt-3 flex flex-col gap-3">
          {route.quotes.map((quote, index) => {
            const isOpen = openChannelId === quote.channelId;
            const spreadFraction =
              corridor.rate > 0 ? 1 - quote.effectiveRate / corridor.rate : 0;
            const spreadPercent = spreadFraction * 100;
            const fxLossUSD = quote.usdConverted * spreadFraction;
            const fxLossLocal = fxLossUSD * quote.effectiveRate;

            return (
              <div
                key={quote.channelId}
                className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 ease-out ${
                  isOpen
                    ? "border-black/[0.12] shadow-sm"
                    : "border-black/[0.06] hover:border-black/[0.12]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenChannelId(isOpen ? null : quote.channelId)}
                  aria-expanded={isOpen}
                  aria-controls={`fee-detail-${quote.channelId}`}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {index === 0 ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-500/20">
                          Best value
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold tabular-nums text-black/45">
                          #{index + 1}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-black">
                          {quote.channelName}
                        </p>
                        <p className="text-xs tabular-nums text-black/[0.45]">
                          {quote.effectiveRate.toFixed(4)} {corridor.to} ·{" "}
                          {spreadPercent.toFixed(2)}% spread
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-black">
                          {formatLocal(quote.localAmount, corridor)}
                        </p>
                        <p className="text-xs tabular-nums text-black/[0.45]">
                          {quote.totalCostPercent.toFixed(1)}% all-in cost
                        </p>
                      </div>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className={`h-4 w-4 shrink-0 text-black/40 transition-transform duration-200 ease-out ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        <path
                          d="m5 7.5 5 5 5-5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </button>

                <div
                  id={`fee-detail-${quote.channelId}`}
                  className={`grid transition-all duration-200 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <dl className="divide-y divide-black/[0.06] border-t border-black/[0.06] bg-neutral-50/70 px-5 py-2 text-sm">
                      <div className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-black/55">
                          1. Platform fee deduction
                        </dt>
                        <dd className="tabular-nums font-medium text-black">
                          − {formatUSD(quote.platformFeeUSD)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-black/55">
                          2. Fixed clearing / wire surcharge
                        </dt>
                        <dd className="tabular-nums font-medium text-black">
                          − {formatUSD(quote.feeDeductedUSD)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-black/55">3. Hidden FX spread</dt>
                        <dd className="tabular-nums font-medium text-black">
                          {spreadPercent.toFixed(2)}% · −{" "}
                          {formatLocal(fxLossLocal, corridor)}{" "}
                          <span className="text-black/[0.45]">
                            ({formatUSD(fxLossUSD)})
                          </span>
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="font-semibold text-black/80">
                          4. Net domestic bank deposit
                        </dt>
                        <dd className="font-bold tabular-nums text-emerald-600">
                          + {formatLocal(quote.localAmount, corridor)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Nominative fair use — mandatory legal line. */}
      <p className="text-xs leading-relaxed text-black/[0.45]">
        All brand names and trademarks are the property of their respective
        owners, displayed solely for factual cost comparison purposes.
        PayoutDelta is an independent auditor and is not affiliated with or
        endorsed by any provider listed.
      </p>
    </div>
  );
}