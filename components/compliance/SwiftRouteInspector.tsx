"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { RegulatoryBank } from "@/data/regulatoryBanking";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import {
  buildWireInstructions,
  deriveSwiftRoute,
  resolveBankRoute,
} from "@/lib/swiftRoutingEngine";

/**
 * Phase D — SWIFT Intermediary Leakage & BIC Route Inspector.
 *
 * Renders the deterministic 3-node wire transit path (Sender / Platform →
 * Intermediary Clearing Bank → Beneficiary Bank), the routing audit metrics
 * (intermediary deduction band, settlement speed benchmark, rail efficiency
 * score, double-dip risk) and a 1-click "Copy Wire Instructions for Client"
 * template. 100% client-side over the static bank database — no network, no
 * external packages, inline SVG connectors only.
 *
 * Two mounting modes:
 *   - Calculator: `<SwiftRouteInspector corridorSlug bankId />` inline card.
 *   - Invoice Studio: `<SwiftRouteInspectorModal ... />` dialog that resolves a
 *     manual bank name / SWIFT back to the directory (or a synthetic bench).
 */
export default function SwiftRouteInspector({
  corridorSlug,
  bankId,
  bank,
  targetCurrency,
  senderLabel,
  recipientName,
  account,
  showHeader = true,
}: {
  corridorSlug: string;
  /** Selected bank id inside the corridor (Calculator sync). */
  bankId?: string;
  /** Direct bank record (standalone / resolved entry). */
  bank?: RegulatoryBank;
  /** Receiving-currency override (Invoice Studio manual drafts). */
  targetCurrency?: string;
  senderLabel?: string;
  recipientName?: string;
  account?: string;
  showHeader?: boolean;
}) {
  const route = useMemo(() => {
    if (bank) {
      return deriveSwiftRoute({
        corridorSlug,
        bank,
        targetCurrency,
        senderLabel,
        railNameOverride:
          bank.id === "manual-wire" ? bank.clearance : undefined,
      });
    }
    const regulation = bankCache(corridorSlug);
    const selected = bankId
      ? regulation.banks.find((item) => item.id === bankId)
      : undefined;
    return deriveSwiftRoute({
      corridorSlug,
      bank: selected ?? regulation.banks[0],
      targetCurrency,
      senderLabel,
    });
  }, [bank, bankId, corridorSlug, senderLabel, targetCurrency]);

  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    },
    []
  );

  const handleCopy = async () => {
    const text = buildWireInstructions({
      corridorLabel: corridorLabelFor(route.corridorSlug, route.targetCurrency),
      recipientName,
      account,
      receivingBankName: route.beneficiaryBank.name,
      receivingBankSwift: route.beneficiaryBank.swiftCode,
      correspondent: route.correspondent,
      railBadge: route.railBadge,
      deduction: route.deduction,
      targetCurrency: route.targetCurrency,
    });
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
    } catch {
      fallbackCopy(text);
    }
    setCopied(true);
    if (copiedTimer.current !== null) {
      window.clearTimeout(copiedTimer.current);
    }
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      aria-label="SWIFT intermediary route inspector"
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md"
    >
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
            SWIFT Intermediary Route
          </h3>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
            Phase D · BIC Inspector
          </span>
        </div>
      )}

      {/* 3-node transit path — lightweight inline SVG connectors. */}
      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
        <RouteNode
          label="Node 1 · Sender / Platform"
          title={route.senderLabel}
          caption="Origin platform wire"
          monogram="S"
          tone="neutral"
        />
        <Connector />
        <RouteNode
          label="Node 2 · Intermediary Clearing Bank"
          title={route.correspondent.bankName}
          caption={`${route.correspondent.city} · ${route.correspondent.bic}`}
          monogram="C"
          tone="amber"
          badge={`−$${route.deduction.min} to −$${route.deduction.max}`}
          badgeLabel="SHA · shared"
        />
        <Connector />
        <RouteNode
          label="Node 3 · Beneficiary Bank"
          title={route.beneficiaryBank.displayName}
          caption={
            route.beneficiaryBank.swiftCode !== "—"
              ? route.beneficiaryBank.swiftCode
              : "Direct correspondent · no local BIC"
          }
          monogram="B"
          tone="emerald"
          badge={route.railBadge}
          badgeLabel={route.beneficiaryBank.localCurrency}
        />
      </div>

      {/* Routing audit metrics. */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MetricCard
          label="Intermediary Deduction"
          value={`$${route.deduction.min}–$${route.deduction.max}`}
          hint={`SHA instruction cut · ${route.clearingCurrency} clearing`}
        />
        <MetricCard
          label="Settlement Speed"
          value={route.speed.label.split(" · ")[0] ?? route.speed.label}
          hint={route.speed.label}
        />
        <MetricCard
          label="Rail Efficiency"
          value={route.efficiency.grade}
          valueClassName={gradeToneClass(route.efficiency.tone)}
          hint={route.efficiency.note}
        />
      </div>

      {/* Double-dip risk flag. */}
      <div
        role="status"
        className={`mt-3 rounded-xl border px-3 py-2.5 text-xs leading-snug ${
          route.doubleDip
            ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
            : "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-800 dark:text-emerald-200"
        }`}
      >
        <span className="font-bold uppercase tracking-wider">
          {route.doubleDip ? "⚠ Double-Dip Risk" : "✓ No Double-Dip"}
        </span>{" "}
        — {route.doubleDipNote}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] ${
            copied
              ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          }`}
        >
          {copied ? "✓ Copied" : "Copy Wire Instructions for Client"}
        </button>
        <span className="text-[11px] leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
          OUR vs SHA charge guidance included in the template.
        </span>
      </div>
    </section>
  );
}

/** Shared bank-directory cache so identical slugs build the record once. */
const regulationCache = new Map<string, ReturnType<typeof getRegulatoryBanking>>();
function bankCache(slug: string) {
  let value = regulationCache.get(slug);
  if (!value) {
    value = getRegulatoryBanking(slug);
    regulationCache.set(slug, value);
  }
  return value;
}

function corridorLabelFor(slug: string, currency: string): string {
  const region = slug.split("-");
  const to = region.length >= 3 ? region[region.length - 1].toUpperCase() : currency;
  return `USD → ${to}`;
}

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // Clipboard unavailable — the text remains selectable in the template.
  }
  document.body.removeChild(textarea);
}

function gradeToneClass(tone: "excellent" | "good" | "average" | "slow"): string {
  switch (tone) {
    case "excellent":
      return "text-emerald-600 dark:text-emerald-400";
    case "good":
      return "text-teal-600 dark:text-teal-300";
    case "average":
      return "text-amber-600 dark:text-amber-400";
    case "slow":
      return "text-rose-600 dark:text-rose-400";
  }
}

function RouteNode({
  label,
  title,
  caption,
  monogram,
  tone,
  badge,
  badgeLabel,
}: {
  label: string;
  title: string;
  caption: string;
  monogram: string;
  tone: "neutral" | "amber" | "emerald";
  badge?: string;
  badgeLabel?: string;
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400"
      : tone === "amber"
        ? "bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-400"
        : "bg-neutral-100 text-black/60 ring-black/[0.08] dark:bg-neutral-800 dark:text-white/70 dark:ring-white/[0.1]";
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-black/[0.06] bg-neutral-50/70 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
      <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-1 ${toneClasses}`}
        >
          {monogram}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-black dark:text-white">
            {title}
          </p>
          <p className="truncate font-mono text-[11px] text-black/[0.5] dark:text-white/45">
            {caption}
          </p>
        </div>
      </div>
      {badge !== undefined && (
        <span
          className={`mt-2.5 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tabular-nums ${
            tone === "amber"
              ? "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300"
              : "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300"
          }`}
        >
          <span className="truncate">{badge}</span>
          {badgeLabel && (
            <span className="opacity-70">{badgeLabel}</span>
          )}
        </span>
      )}
    </div>
  );
}

function Connector() {
  return (
    <>
      {/* Horizontal connector for md+ rows. */}
      <div
        aria-hidden="true"
        className="hidden shrink-0 items-center justify-center md:flex"
      >
        <svg
          viewBox="0 0 36 24"
          className="h-6 w-9 text-black/30 dark:text-white/25"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <line
            x1="2"
            y1="12"
            x2="24"
            y2="12"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
          <path
            d="M 20 6.5 L 29 12 L 20 17.5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {/* Vertical chevron for the stacked mobile layout. */}
      <div
        aria-hidden="true"
        className="flex shrink-0 justify-center text-black/30 dark:text-white/25 md:hidden"
      >
        <svg
          viewBox="0 0 16 12"
          className="h-3 w-4"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <line
            x1="8"
            y1="1"
            x2="8"
            y2="8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
          <path
            d="M 5 6 L 8 10.5 L 11 6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-neutral-50/70 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold text-black dark:text-white">
        <span className={valueClassName ?? "text-emerald-600 dark:text-emerald-400"}>
          {value}
        </span>
      </p>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-black/[0.5] dark:text-white/45">
        {hint}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Modal shell — Invoice Studio "Inspect SWIFT Route" entry point.
 * ------------------------------------------------------------------------- */

export function SwiftRouteInspectorModal({
  open,
  onClose,
  bankName,
  swiftCode,
  currency,
  recipientName,
  account,
}: {
  open: boolean;
  onClose: () => void;
  bankName?: string;
  swiftCode?: string;
  currency?: string;
  recipientName?: string;
  account?: string;
}) {
  if (!open) {
    return null;
  }
  return (
    <SwiftRouteInspectorDialog
      onClose={onClose}
      bankName={bankName}
      swiftCode={swiftCode}
      currency={currency}
      recipientName={recipientName}
      account={account}
    />
  );
}

function SwiftRouteInspectorDialog({
  onClose,
  bankName,
  swiftCode,
  currency,
  recipientName,
  account,
}: {
  onClose: () => void;
  bankName?: string;
  swiftCode?: string;
  currency?: string;
  recipientName?: string;
  account?: string;
}) {
  const route = useMemo(
    () => resolveBankRoute({ bankName, swiftCode, currency }),
    [bankName, swiftCode, currency]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="SWIFT intermediary route inspector"
    >
      <div
        className="relative my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[#F5F5F7] px-5 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              SWIFT Route Inspector
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-white/45">
              {route.corridorSlug} · {route.currency} clearing path
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss SWIFT route inspector"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 ease-out hover:bg-black/5 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <SwiftRouteInspector
            corridorSlug={route.corridorSlug}
            bank={route.bank}
            targetCurrency={route.currency}
            senderLabel="Upwork / Fiverr / Direct Client Wire"
            recipientName={recipientName}
            account={account}
          />
          <p className="mt-3 text-[10px] leading-relaxed text-black/[0.45] dark:text-white/45">
            {route.resolved
              ? "Matched against the 50-country bank directory — benchmarks drawn from the receiving bank's statutory record."
              : "Manual entry — generic correspondent path shown. Verify the receiving bank's SWIFT/BIC and landing charges with the bank's credit advice (CRF) before invoicing."}
          </p>
        </div>
      </div>
    </div>
  );
}