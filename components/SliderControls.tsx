"use client";

import type { Platform } from "@/lib/types";
import {
  clampGrossUSD,
  MAX_GROSS_USD,
  MIN_GROSS_USD,
  SLIDER_STEP_USD,
} from "@/utils/calculateRoute";

const PRESET_AMOUNTS: readonly number[] = [500, 1000, 2500, 5000, 10000];

/**
 * iOS-style audit inputs: quick-select amount pills, a native-feel slider,
 * and a segmented platform switcher. Pure presentational client island — all
 * state lives in the parent `Calculator`, so this component re-renders in
 * O(1) against memoized math and never pulls in network or animation deps.
 */
export default function SliderControls({
  amount,
  onAmountChange,
  platformId,
  onPlatformChange,
  platforms,
}: {
  amount: number;
  onAmountChange: (value: number) => void;
  platformId: string;
  onPlatformChange: (id: string) => void;
  platforms: Platform[];
}) {
  return (
    <section
      aria-labelledby="audit-inputs"
      className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#121216] sm:p-8"
    >
      <h2
        id="audit-inputs"
        className="text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40"
      >
        Audit inputs
      </h2>

      <div className="mt-5 gap-8 lg:grid lg:grid-cols-2">
        <fieldset>
          <legend className="flex items-baseline justify-between gap-2 text-sm font-medium text-black/70 dark:text-white/70">
            <span>Gross client payment</span>
            <span className="font-bold tabular-nums text-black dark:text-white">
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
                  onClick={() => onAmountChange(clampGrossUSD(preset))}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium tabular-nums transition-all duration-200 ease-out ${
                    isActive
                      ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                      : "bg-[#F2F2F7] text-black/60 hover:text-black dark:bg-neutral-800 dark:text-white/60 dark:hover:text-white"
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
              onAmountChange(clampGrossUSD(Number(event.currentTarget.value)))
            }
            aria-label="Gross client payment in USD"
            className="mt-5 h-2 w-full cursor-pointer rounded-lg bg-neutral-100 accent-emerald-600 dark:bg-neutral-800"
          />
          <div className="mt-2 flex justify-between text-xs tabular-nums text-black/[0.45] dark:text-white/[0.45]">
            <span>${MIN_GROSS_USD.toLocaleString("en-US")}</span>
            <span>${MAX_GROSS_USD.toLocaleString("en-US")}</span>
          </div>
        </fieldset>

        <fieldset className="mt-8 lg:mt-0">
          <legend className="text-sm font-medium text-black/70 dark:text-white/70">
            Client platform
          </legend>
          <div
            role="group"
            aria-label="Client platform"
            className="mt-4 flex gap-1 rounded-2xl bg-[#F2F2F7] p-1.5 dark:bg-neutral-900"
          >
            {platforms.map((item) => {
              const isActive = item.id === platformId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onPlatformChange(item.id)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium tabular-nums transition-all duration-200 ease-out ${
                    isActive
                      ? "bg-white text-black shadow-sm dark:bg-white dark:text-black"
                      : "text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white"
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
  );
}