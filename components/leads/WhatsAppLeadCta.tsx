"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Corridor, Platform } from "@/lib/types";
import {
  getConsultingWhatsAppPhone,
  WHATSAPP_LEAD_HARD_FLOOR_USD,
  WHATSAPP_LEAD_PCT_OF_GROSS,
} from "@/data/config";

const DISMISS_KEY = "payoutdelta:whatsapp_lead_dismissed";
const DISMISS_EVENT = "payoutdelta:whatsapp-lead-dismissed";

const DISMISSED = "1";
const VISIBLE = "0";

/**
 * The session-dismiss memory is treated as an external store so the read
 * never calls setState during an effect (static-export hydration stays
 * deterministic, and the lint rule react-hooks/set-state-in-effect stays
 * happy). `getServerSnapshot` pins the pristine "visible" state for prerender.
 */
function getDismissSnapshot(): string {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === DISMISSED
      ? DISMISSED
      : VISIBLE;
  } catch {
    // Private browsing — card simply stays visible.
    return VISIBLE;
  }
}

function subscribeDismiss(onStoreChange: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, onStoreChange);
  return () => window.removeEventListener(DISMISS_EVENT, onStoreChange);
}

function serverDismissSnapshot(): string {
  return VISIBLE;
}

/**
 * PayoutDelta — Phase F "High-Variance WhatsApp Consulting Funnel".
 *
 * A contextual, high-intent advisory CTA that appears ONLY when the audit
 * reveals significant remittance leakage: the cost gap between the costliest
 * and the cheapest rail on the active route is at least
 * `WHATSAPP_LEAD_HARD_FLOOR_USD` (USD 150) per transfer, or at least
 * `WHATSAPP_LEAD_PCT_OF_GROSS` (5%) of the gross invoice it is moved on.
 *
 * Privacy invariant (same as the rest of the app): everything is computed
 * purely in-memory from Calculator state. Nothing is logged, tracked or
 * transmitted — the card only ever builds a `https://wa.me/` deep link with a
 * pre-filled, context-specific message the visitor chooses to open in a new
 * tab (their WhatsApp, their message, zero middleware).
 *
 * The card is dismissable for the current session via `sessionStorage`, so a
 * visitor who already reached out once isn't re-prompted on every tab.
 */

export interface WhatsAppLeadLeadProps {
  corridor: Corridor;
  platform: Platform;
  /** Active transfer size (mode-aware: amount in quote mode, billable USD in
      target mode). */
  grossUSD: number;
  /** Cost gap (USD) between the costliest and the cheapest rail. */
  spreadDeltaUsd: number;
  /** Realized local payout gap between best and worst rail. */
  spreadDeltaLocal: number;
}

/** Pure threshold — a route triggers only on significant, high-variance loss. */
export function isHighFeeLeakage(
  spreadDeltaUsd: number,
  grossUSD: number
): boolean {
  if (!Number.isFinite(spreadDeltaUsd) || spreadDeltaUsd <= 0) {
    return false;
  }
  if (!Number.isFinite(grossUSD) || grossUSD <= 0) {
    return false;
  }
  return (
    spreadDeltaUsd >= WHATSAPP_LEAD_HARD_FLOOR_USD ||
    spreadDeltaUsd >= grossUSD * WHATSAPP_LEAD_PCT_OF_GROSS
  );
}

/** Rough money figure for prose (no decimals, "1,250"). */
function formatRough(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/**
 * Builds the contextual, pre-filled message exactly per the Phase F wire
 * ("Hi! I was auditing a …" template) from the active Calculator state.
 */
export function buildContextMessage({
  corridor,
  platform,
  grossUSD,
  spreadDeltaLocal,
  spreadDeltaUsd,
}: Pick<
  WhatsAppLeadLeadProps,
  "corridor" | "platform" | "grossUSD" | "spreadDeltaLocal" | "spreadDeltaUsd"
>): string {
  const grossLabel = `$${formatRough(grossUSD)}`;
  const localLabel = `${formatRough(spreadDeltaLocal)} ${corridor.to}`;
  const usdLabel = `${formatRough(spreadDeltaUsd)} USD`;

  return `Hi! I was auditing a ${grossLabel} transfer on the ${corridor.from} → ${corridor.to} corridor (${platform.name}). The calculator shows I am losing ~${localLabel} (${usdLabel}) in intermediary fees and spreads. I want to optimize my cross-border payout setup.`;
}

/** `https://wa.me/<phone>?text=<encoded>` — parses to nothing when empty. */
export function buildWhatsAppLeadUrl(message: string): string {
  const phone = getConsultingWhatsAppPhone();
  if (phone === "") {
    return "";
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function WhatsAppLeadCta({
  corridor,
  platform,
  grossUSD,
  spreadDeltaUsd,
  spreadDeltaLocal,
}: WhatsAppLeadLeadProps) {
  const dismissSnapshot = useSyncExternalStore(
    subscribeDismiss,
    getDismissSnapshot,
    serverDismissSnapshot
  );
  const dismissed = dismissSnapshot === DISMISSED;

  const message = useMemo(
    () =>
      buildContextMessage({
        corridor,
        platform,
        grossUSD,
        spreadDeltaLocal,
        spreadDeltaUsd,
      }),
    [corridor, platform, grossUSD, spreadDeltaLocal, spreadDeltaUsd]
  );

  const leadUrl = useMemo(() => buildWhatsAppLeadUrl(message), [message]);

  if (dismissed || !isHighFeeLeakage(spreadDeltaUsd, grossUSD) || leadUrl === "") {
    return null;
  }

  const annual = spreadDeltaUsd * 12;

  const handleDismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, DISMISSED);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  return (
    <section
      aria-label="High fee leakage consulting advisory"
      className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 text-white shadow-md backdrop-blur-md sm:p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl"
      />

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"
          />
          VIP Advisory · This Route
        </p>

        <h3 className="mt-4 text-base font-bold tracking-tight text-white sm:text-lg">
          ⚠️ High Fee Leakage Detected on this Route
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-white/60">
          You&apos;re losing{" "}
          <span className="font-semibold tabular-nums text-white">
            ${formatRough(spreadDeltaUsd)}
          </span>{" "}
          per transfer (~
          <span className="font-semibold tabular-nums text-white">
            ${formatRough(annual)}
          </span>
          /year at monthly volume) trading on the costliest rail instead of the
          cheapest on this corridor.
        </p>

        <a
          href={leadUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Opens WhatsApp with a pre-filled payout optimization message"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 ease-out hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99]"
        >
          Audit Your Corporate Rail via WhatsApp
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[10px] leading-relaxed text-white/40">
            Private deep-link — no tracking, no telemetry. Your numbers never
            leave this page.
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 text-[11px] font-semibold text-white/40 transition-colors duration-150 ease-out hover:text-white/80"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}