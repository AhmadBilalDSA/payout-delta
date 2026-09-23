"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Corridor } from "@/lib/types";
import {
  RATE_ALERTS_KEY,
  readLocalStorage,
  writeLocalStorage,
} from "@/lib/privacyGuard";

type AlertDirection = "above" | "below";

interface RateAlert {
  targetRate: number;
  direction: AlertDirection;
  updatedAt: string;
}

type AlertMap = Record<string, RateAlert>;

/* ---------------------------------------------------------------------------
 * LocalStorage alert store — read through useSyncExternalStore so thresholds
 * hydrate without any setState-in-effect cascade (and stay in sync across
 * tabs via the `storage` event). Writes notify the store directly.
 * ------------------------------------------------------------------------- */

let alertSnapshotCache: { key: string; value: RateAlert | null } = {
  key: "",
  value: null,
};

function readAlerts(): AlertMap {
  if (typeof window === "undefined") return {};
  const raw = readLocalStorage(RATE_ALERTS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as AlertMap;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAlerts(alerts: AlertMap): void {
  writeLocalStorage(RATE_ALERTS_KEY, JSON.stringify(alerts));
  notifyAlertListeners();
}

function getAlertSnapshot(slug: string): RateAlert | null {
  const alert = readAlerts()[slug] ?? null;
  const key = alert === null ? "" : JSON.stringify(alert);
  if (alertSnapshotCache.key !== key) {
    alertSnapshotCache = { key, value: alert };
  }
  return alertSnapshotCache.value;
}

let alertListeners: Array<() => void> = [];

function subscribeAlerts(callback: () => void): () => void {
  alertListeners.push(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    alertListeners = alertListeners.filter((listener) => listener !== callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function notifyAlertListeners(): void {
  alertListeners.forEach((listener) => listener());
}

/* ---------------------------------------------------------------------------
 * Native notification permission store — mirrors `Notification.permission`
 * after mount and whenever the explicit "Enable Desktop Rate Alerts" button
 * resolves, without mutating component state inside an effect.
 * ------------------------------------------------------------------------- */

let permissionSnapshot: string | null = null;
let permissionListeners: Array<() => void> = [];

function refreshPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    permissionSnapshot = "unsupported";
  } else {
    permissionSnapshot = window.Notification.permission;
  }
  permissionListeners.forEach((listener) => listener());
}

function setPermission(next: string): void {
  permissionSnapshot = next;
  permissionListeners.forEach((listener) => listener());
}

function subscribePermission(callback: () => void): () => void {
  permissionListeners.push(callback);
  return () => {
    permissionListeners = permissionListeners.filter(
      (listener) => listener !== callback
    );
  };
}

function readPermission(): string | null {
  return permissionSnapshot;
}

/**
 * Local-First Rate Threshold Watchlist — a "alert me when the rate hits X"
 * monitor mounted inside the calculator's settlement tab.
 *
 * The contractor pins a target rate for the active corridor (above or below)
 * and the widget persists it on-device under `payoutdelta:rate_alerts`. Every
 * time a corridor page loads it re-checks the saved threshold against the live
 * mid-market base rate and, when met, renders an emerald
 * "🎯 Target Rate Triggered" highlight. If the visitor grants the native
 * browser notification permission (the explicit "Enable Desktop Rate Alerts"
 * button), a fire-and-forget desktop notification accompanies the badge.
 *
 * 100% client-side: thresholds & pinned rates never leave the browser, no
 * polling loop, no network, no telemetry — the static-export budget stays
 * intact. All browser APIs are confined to the external stores / event
 * handlers so the prerender pass renders deterministically.
 */

export default function RateWatchlistWidget({
  corridor,
}: {
  corridor: Corridor;
}) {
  const baseRate = corridor.rate;

  // Saved alert + native-permission mirror — both hydrate through
  // useSyncExternalStore (read-only, no setState-in-effect).
  const saved = useSyncExternalStore(
    subscribeAlerts,
    () => getAlertSnapshot(corridor.slug),
    () => null
  );
  const notifPermission = useSyncExternalStore(
    subscribePermission,
    readPermission,
    () => null
  );

  // Untouched target input mirrors the saved alert; editing marks it dirty so
  // a later cross-tab sync never clobbers a half-typed figure.
  const [targetInput, setTargetInput] = useState<string | null>(null);
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [directionTouched, setDirectionTouched] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const savedTimer = useRef<number | null>(null);
  const notifiedFor = useRef<string | null>(null);

  const inputValue =
    targetInput !== null
      ? targetInput
      : saved !== null
        ? String(saved.targetRate)
        : "";
  const effectiveDirection: AlertDirection = directionTouched
    ? direction
    : (saved?.direction ?? direction);

  // Read the native permission once after mount (external-store update, not
  // component state — hydration stays deterministic).
  useEffect(() => {
    refreshPermission();
  }, []);

  const triggered =
    saved !== null &&
    (saved.direction === "above"
      ? baseRate >= saved.targetRate
      : baseRate <= saved.targetRate);

  // Desktop alert — fires once per saved-threshold state, only after the user
  // granted permission via the explicit "Enable Desktop Rate Alerts" button.
  useEffect(() => {
    const signature =
      saved !== null
        ? `${corridor.slug}:${saved.targetRate}:${saved.direction}`
        : null;
    if (!triggered || signature === null || notifPermission !== "granted") {
      return;
    }
    if (notifiedFor.current === signature) return;
    notifiedFor.current = signature;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      new window.Notification("PayoutDelta Rate Alert", {
        body: `${corridor.from} → ${corridor.to} is ${
          saved.direction === "above" ? "above" : "below"
        } your target: current ${formatRate(baseRate, corridor.to)}, target ${formatRate(
          saved.targetRate,
          corridor.to
        )}`,
      });
    } catch {
      // Some mobile browsers require a service worker to fire notifications.
    }
  }, [triggered, saved, corridor, baseRate, notifPermission]);

  useEffect(
    () => () => {
      if (savedTimer.current !== null) {
        window.clearTimeout(savedTimer.current);
      }
    },
    []
  );

  const saveAlert = () => {
    const parsed = Number.parseFloat(inputValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    const next: RateAlert = {
      targetRate: parsed,
      direction: effectiveDirection,
      updatedAt: new Date().toISOString(),
    };
    const alerts = readAlerts();
    alerts[corridor.slug] = next;
    writeAlerts(alerts);
    notifiedFor.current = null;
    setTargetInput(String(parsed));
    setSavedFeedback(true);
    if (savedTimer.current !== null) {
      window.clearTimeout(savedTimer.current);
    }
    savedTimer.current = window.setTimeout(() => setSavedFeedback(false), 2500);
  };

  const clearAlert = () => {
    const alerts = readAlerts();
    delete alerts[corridor.slug];
    writeAlerts(alerts);
    notifiedFor.current = null;
    setTargetInput(null);
    setDirection("above");
    setDirectionTouched(false);
  };

  const pickDirection = (next: AlertDirection) => {
    setDirection(next);
    setDirectionTouched(true);
  };

  const requestDesktopAlerts = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    try {
      const permission = await window.Notification.requestPermission();
      setPermission(permission);
    } catch {
      setPermission("denied");
    }
  };

  const directionPill = (active: boolean) =>
    `rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 ease-out ${
      active
        ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
        : "text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white"
    }`;

  return (
    <section
      aria-labelledby="rate-watchlist-title"
      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Local-First Rate Watchlist
          </p>
          <h3
            id="rate-watchlist-title"
            className="mt-1 text-sm font-bold tracking-tight text-slate-900 dark:text-white"
          >
            📈 {corridor.from} → {corridor.to}
          </h3>
        </div>
        <p className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
          {formatRate(baseRate, corridor.to)}
        </p>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-white/50">
        Current mid-market: 1 {corridor.from} = {formatRate(baseRate, corridor.to)}.{" "}
        Pin a threshold and this browser checks it every time the calculator loads.
      </p>

      {triggered && (
        <div
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-emerald-700 dark:text-emerald-300"
        >
          <span aria-hidden="true">🎯</span>
          <span>
            Target Rate Triggered: {formatRate(baseRate, corridor.to)} (
            {saved?.direction === "above" ? "Above" : "Below"} target{" "}
            {saved ? formatRate(saved.targetRate, corridor.to) : ""})
          </span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Target {corridor.to} rate
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={(event) => setTargetInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveAlert();
            }}
            placeholder={defaultTargetPlaceholder(baseRate)}
            className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 transition-colors duration-200 ease-out focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/25 dark:focus:ring-white/[0.06]"
          />
        </label>

        <div
          aria-label="Target direction"
          className="flex shrink-0 items-center gap-1 rounded-xl border border-black/[0.1] bg-black/[0.04] p-1 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <button
            type="button"
            onClick={() => pickDirection("above")}
            aria-pressed={effectiveDirection === "above"}
            className={directionPill(effectiveDirection === "above")}
          >
            ▲ Above
          </button>
          <button
            type="button"
            onClick={() => pickDirection("below")}
            aria-pressed={effectiveDirection === "below"}
            className={directionPill(effectiveDirection === "below")}
          >
            ▼ Below
          </button>
        </div>

        <button
          type="button"
          onClick={saveAlert}
          aria-live="polite"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-emerald-500 active:scale-[0.98]"
        >
          {savedFeedback ? "✓ Alert saved" : "Save Alert"}
        </button>
      </div>

      {saved !== null && (
        <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-white/50">
          <p className="min-w-0 truncate font-mono tabular-nums">
            Pinned · {corridor.slug} ·{" "}
            {saved.direction === "above" ? "above" : "below"}{" "}
            {formatRate(saved.targetRate, corridor.to)}
          </p>
          <button
            type="button"
            onClick={clearAlert}
            className="shrink-0 font-medium text-slate-400 transition-colors duration-150 ease-out hover:text-rose-500 dark:text-white/40 dark:hover:text-rose-400"
          >
            Remove
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => void requestDesktopAlerts()}
          className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500 transition-colors duration-150 ease-out hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
        >
          <span aria-hidden="true">🔔</span> Enable Desktop Rate Alerts
        </button>
        <p className="text-[10px] text-slate-400 dark:text-white/35">
          {notifPermission === "granted"
            ? "Desktop alerts enabled"
            : notifPermission === "denied"
              ? "Blocked in browser settings"
              : notifPermission === "unsupported"
                ? "Not supported in this browser"
                : "On-device · zero tracking"}
        </p>
      </div>
    </section>
  );
}

/** `1,285.4`-style rate label (up to 4 significant decimals). */
function formatRate(value: number, ccy: string): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${ccy}`;
}

/** Suggest a realistic next threshold relative to the current mid-rate. */
function defaultTargetPlaceholder(baseRate: number): string {
  const offset = baseRate > 10 ? baseRate * 1.02 : baseRate * 0.98;
  return `e.g. ${offset.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}