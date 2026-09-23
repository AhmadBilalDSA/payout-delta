"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Corridor, Platform } from "@/lib/types";
import {
  consultingGrossThresholdUsd,
  consultingThresholdUsd,
  generateWhatsAppLeadUrl,
} from "@/data/monetizationConfig";
import { WHATSAPP_DISMISS_KEY } from "@/lib/privacyGuard";

const DISMISS_KEY = WHATSAPP_DISMISS_KEY;
const DISMISS_EVENT = "payoutdelta:whatsapp-consulting-dismissed";

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
 * PayoutDelta — Phase G "High-Ticket WhatsApp Consulting Funnel".
 *
 * A VIP advisory card that mounts directly beneath the verdict card ONLY for
 * high-value cases: the live audit leaks at least `consultingThresholdUsd`
 * (USD 120) of intermediary fees/spreads, OR the gross payment is at least
 * `consultingGrossThresholdUsd` (USD 2,500). It converts the loss into a
 * yearlyized figure and books a cross-border rail advisory through a
 * pre-filled `wa.me` deep link.
 *
 * Privacy invariant (same as the rest of the app): everything is computed
 * purely in-memory from the active audit — nothing is logged, tracked or
 * transmitted. The card only ever builds a `https://wa.me/` deep link the
 * visitor chooses to open in a new tab (their WhatsApp, their message, zero
 * middleware). The canonical number, thresholds and message template live in
 * `data/monetizationConfig.ts`.
 *
 * The card is dismissable for the current session via `sessionStorage`, so a
 * visitor who already reached out once isn't re-prompted on every tab.
 */

export interface WhatsAppConsultingCardProps {
  corridor: Corridor;
  platform: Platform;
  /** Active transfer size (mode-aware: amount in quote mode, billable USD in
      target mode). */
  grossUSD: number;
  /** Total leakage (USD) between the costliest and the cheapest rail. */
  leakageUsd: number;
  /** Same leakage expressed in the receiving currency. */
  leakageLocal: number;
}

/** Pure trigger — high-value transfer leakage or a big-ticket gross payment. */
export function shouldShowConsultingCard(
  leakageUsd: number,
  grossUSD: number
): boolean {
  const safeLeakage = Number.isFinite(leakageUsd) ? leakageUsd : 0;
  const safeGross = Number.isFinite(grossUSD) ? grossUSD : 0;
  return (
    safeLeakage >= consultingThresholdUsd ||
    safeGross >= consultingGrossThresholdUsd
  );
}

/** Rough money figure for prose (no decimals, "1,250"). */
function formatRough(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  return Math.round(value).toLocaleString("en-US");
}

export default function WhatsAppConsultingCard({
  corridor,
  platform,
  grossUSD,
  leakageUsd,
  leakageLocal,
}: WhatsAppConsultingCardProps) {
  const dismissSnapshot = useSyncExternalStore(
    subscribeDismiss,
    getDismissSnapshot,
    serverDismissSnapshot
  );
  const dismissed = dismissSnapshot === DISMISSED;

  const whatsAppUrl = useMemo(
    () =>
      generateWhatsAppLeadUrl(
        grossUSD,
        `${corridor.from} → ${corridor.to}`,
        platform.name,
        leakageUsd,
        leakageLocal,
        corridor.to
      ),
    [corridor, platform, grossUSD, leakageUsd, leakageLocal]
  );

  if (
    dismissed ||
    !shouldShowConsultingCard(leakageUsd, grossUSD) ||
    whatsAppUrl === ""
  ) {
    return null;
  }

  const annualLeakageUsd = leakageUsd * 12;

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
      aria-label="High-value transfer leakage consulting advisory"
      className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 text-white shadow-md backdrop-blur-md sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl"
      />

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"
          />
          ⚠️ High-Value Transfer Leakage Detected
        </p>

        <h3 className="mt-4 text-lg font-bold tracking-tight text-white sm:text-xl">
          You are losing ~
          <span className="font-mono tabular-nums tracking-tight text-emerald-300">
            ${formatRough(leakageUsd)}
          </span>{" "}
          (
          <span className="font-mono tabular-nums tracking-tight text-white">
            {formatRough(leakageLocal)} {corridor.to}
          </span>
          ) on this transfer
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-white/60">
          At regular monthly volume, hidden correspondent spreads cost you ~
          <span className="font-mono font-semibold tabular-nums tracking-tight text-white">
            ${formatRough(annualLeakageUsd)}/year
          </span>
          . Optimize your corporate entity, banking routing, and statutory tax
          exemptions.
        </p>

        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Opens WhatsApp with a pre-filled cross-border rail advisory inquiry"
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 transition-all text-sm mt-3"
        >
          💬 Book Cross-Border Rail Advisory via WhatsApp →
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
            Don&apos;t show again for this session
          </button>
        </div>
      </div>
    </section>
  );
}