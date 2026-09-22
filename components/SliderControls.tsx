"use client";

import { useState } from "react";

import type { CalcMode, Corridor, Platform } from "@/lib/types";
import {
  clampGrossUSD,
  MAX_GROSS_USD,
  MIN_GROSS_USD,
  SLIDER_STEP_USD,
} from "@/utils/calculateRoute";
import { localSliderBounds } from "@/utils/inverseMath";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { platformUiKey } from "@/lib/i18n/helpers";

const PRESET_AMOUNTS: readonly number[] = [500, 1000, 2500, 5000, 10000];
const HIGH_PRESETS: readonly number[] = [50000, 150000, 300000, 500000];
const LOW_PRESETS: readonly number[] = [500, 1000, 2500, 5000];

/**
 * iOS-style audit inputs — Phase 3 adds the operating-mode capsule:
 *
 *   [ Gross → Net (Quote Audit) ]   computes net local from a USD invoice
 *   [ Net → Gross (Target Goal) ]   computes the exact USD invoice to net a
 *                                   target local payout (inverse solver)
 *
 * In "Target Goal" mode the amount control swaps to the corridor's destination
 * currency symbol and corridor-appropriate preset pills; the slider then drives
 * the target local payout and the parent recalculates in O(1) via `useMemo`.
 * Pure presentational client island — all state lives in the parent Calculator.
 */
export default function SliderControls({
  mode,
  onModeChange,
  amount,
  onAmountChange,
  targetNet,
  onTargetNetChange,
  platformId,
  onPlatformChange,
  platforms,
  corridor,
}: {
  mode: CalcMode;
  onModeChange: (mode: CalcMode) => void;
  amount: number;
  onAmountChange: (value: number) => void;
  targetNet: number;
  onTargetNetChange: (value: number) => void;
  platformId: string;
  onPlatformChange: (id: string) => void;
  platforms: Platform[];
  corridor: Corridor;
}) {
  const { t } = useLanguage();
  const isTargetGoal = mode === "net-to-gross";
  const bounds = localSliderBounds(corridor);

  const formatLocal = (value: number) =>
    `${corridor.currencySymbol} ${Math.round(value).toLocaleString("en-US")}`;

  const localPresets =
    corridor.rate >= 10 ? HIGH_PRESETS : LOW_PRESETS;

  /* Phase 6 — editable numeric input pill. Directly bound to the parent engine:
     typing updates the slider amount / target goal immediately and is clamped
     to the same bounds as the range control, so it can never produce NaN or
     an out-of-range value. State lives locally only while focused; the parent
     stays the single source of truth (derived display, zero setState-in-effect). */
  const liveValue = isTargetGoal ? targetNet : amount;
  const prefix = isTargetGoal ? corridor.currencySymbol : "$";
  const [draft, setDraft] = useState<string>(String(Math.round(liveValue)));
  const [focused, setFocused] = useState(false);

  const displayValue = focused ? draft : liveValue.toLocaleString("en-US");

  const startEditing = () => {
    setFocused(true);
    setDraft(String(Math.round(liveValue)));
  };

  const commitDraft = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    setDraft(digits);
    const parsed = digits === "" ? Number.NaN : Number(digits);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    if (isTargetGoal) {
      onTargetNetChange(clampLocalTarget(parsed, bounds));
    } else {
      onAmountChange(clampGrossUSD(parsed));
    }
  };

  const stopEditing = () => {
    setFocused(false);
    setDraft(String(Math.round(liveValue)));
  };

  return (
    <section
      aria-labelledby="audit-inputs"
      className="w-full min-w-0 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#121216] sm:p-8"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2
          id="audit-inputs"
          className="text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40"
        >
          {t("auditInputs")}
        </h2>

        {/* iOS-style operating-mode capsule */}
        <div
          role="group"
          aria-label={t("calculatorMode")}
          className="inline-flex gap-1 rounded-full bg-[#F2F2F7] p-1 dark:bg-neutral-900"
        >
          {(
            [
              ["gross-to-net", "modeQuoteAudit"],
              ["net-to-gross", "modeTargetGoal"],
            ] as const
          ).map(([value, key]) => {
            const isActive = mode === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onModeChange(value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ease-out ${
                  isActive
                    ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                    : "text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white"
                }`}
              >
                {t(key)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 gap-8 lg:grid lg:grid-cols-2">
        <fieldset>
          <legend className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-black/70 dark:text-white/70">
            <span>
              {isTargetGoal ? t("targetLocalPayout") : t("grossClientPayment")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/[0.04] px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-emerald-500/50 dark:border-white/10 dark:bg-white/[0.06]">
              <span
                aria-hidden="true"
                className="font-mono text-sm font-semibold text-black/40 tabular-nums dark:text-white/40"
              >
                {prefix}
              </span>
              <input
                value={displayValue}
                inputMode="decimal"
                enterKeyHint="done"
                aria-label={
                  isTargetGoal
                    ? t("payoutInCurrency", { currency: corridor.to })
                    : t("payoutInUsd")
                }
                onFocus={startEditing}
                onBlur={stopEditing}
                onChange={(event) => commitDraft(event.currentTarget.value)}
                className="w-24 bg-transparent text-right font-mono text-lg font-bold tabular-nums text-black outline-none sm:w-32 dark:text-white"
              />
            </span>
          </legend>

          <div className="mt-4 flex flex-wrap gap-2">
            {(isTargetGoal ? localPresets : PRESET_AMOUNTS).map((preset) => {
              const active = isTargetGoal
                ? Math.round(targetNet) === preset
                : amount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (isTargetGoal) {
                      onTargetNetChange(clampLocalTarget(preset, bounds));
                    } else {
                      onAmountChange(clampGrossUSD(preset));
                    }
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium tabular-nums transition-all duration-200 ease-out ${
                    active
                      ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                      : "bg-[#F2F2F7] text-black/60 hover:text-black dark:bg-neutral-800 dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  {isTargetGoal
                    ? formatLocal(preset).replace(/\s/g, " ")
                    : `$${preset.toLocaleString("en-US")}`}
                </button>
              );
            })}
          </div>

          <input
            type="range"
            aria-label={
              isTargetGoal
                ? t("payoutInCurrency", { currency: corridor.to })
                : t("payoutInUsd")
            }
            min={isTargetGoal ? bounds.min : MIN_GROSS_USD}
            max={isTargetGoal ? bounds.max : MAX_GROSS_USD}
            step={isTargetGoal ? bounds.step : SLIDER_STEP_USD}
            value={isTargetGoal ? targetNet : amount}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (isTargetGoal) {
                onTargetNetChange(clampLocalTarget(value, bounds));
              } else {
                onAmountChange(clampGrossUSD(value));
              }
            }}
            className="mt-5 h-2 w-full cursor-pointer rounded-lg bg-neutral-100 accent-emerald-600 dark:bg-neutral-800"
          />
          <div className="mt-2 flex justify-between text-xs tabular-nums text-black/[0.45] dark:text-white/[0.45]">
            <span>
              {isTargetGoal
                ? formatLocal(bounds.min)
                : `$${MIN_GROSS_USD.toLocaleString("en-US")}`}
            </span>
            <span>
              {isTargetGoal
                ? formatLocal(bounds.max)
                : `$${MAX_GROSS_USD.toLocaleString("en-US")}`}
            </span>
          </div>
        </fieldset>

        <fieldset className="mt-8 lg:mt-0">
          <legend className="text-sm font-medium text-black/70 dark:text-white/70">
            {t("clientPlatform")}
          </legend>
          <div
            role="group"
            aria-label={t("clientPlatform")}
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
                  {t(platformUiKey(item.id))}
                  <span className="ml-1.5 text-xs opacity-60">
                    {item.feePercent}%
                  </span>
                </button>
              );
            })}
          </div>

          {isTargetGoal && (
            <p className="mt-3 text-xs leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
              {t("inverseSolverNote", { amount: formatLocal(targetNet) })}
            </p>
          )}
        </fieldset>
      </div>
    </section>
  );
}

/** Clamps a local-currency target into the corridor's inverse slider bounds. */
function clampLocalTarget(
  value: number,
  bounds: { min: number; max: number; step: number }
): number {
  if (!Number.isFinite(value)) {
    return bounds.min;
  }
  const clamped = Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
  const stepped =
    bounds.step > 0
      ? bounds.min + Math.round((clamped - bounds.min) / bounds.step) * bounds.step
      : clamped;
  return Math.min(bounds.max, Math.max(bounds.min, stepped));
}