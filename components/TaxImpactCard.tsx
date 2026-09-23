"use client";

import { useState } from "react";

import type { CalcMode, Corridor } from "@/lib/types";
import { formatLocal, formatUSD } from "@/utils/format";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { UiKey } from "@/lib/i18n/dictionaries";

/* ------------------------------------------------------------------ */
/* Regulatory / tax profile config                                     */
/* ------------------------------------------------------------------ */

interface TaxProfile {
  id: string;
  label: string;
  /** Dictionary key (optional) — the label falls back to `label` when absent. */
  tKey?: UiKey;
  /** Legal withholding as a decimal fraction (0.0025 = 0.25%). */
  rate: number;
  badge: string;
  detail: string;
}

interface TaxProfileSet {
  profiles: [TaxProfile, TaxProfile];
}

const DEFAULT_ACTIVE_BY_SLUG: Record<string, string> = {
  "usd-to-pkr": "pseb",
  "usd-to-inr": "lut",
};

const TAX_PROFILES_BY_SLUG: Record<string, TaxProfileSet | undefined> = {
  "usd-to-pkr": {
    profiles: [
      {
        id: "pseb",
        label: "PSEB Registered",
        tKey: "psebRegistered",
        rate: 0.0025,
        badge: "0.25%",
        detail: "SBP/FBR Section 154A final tax",
      },
      {
        id: "standard",
        label: "Non-Filer / Standard",
        tKey: "nonFilerStandard",
        rate: 0.015,
        badge: "1.5%",
        detail: "1.0% filer — 2.0% non-filer band",
      },
    ],
  },
  "usd-to-inr": {
    profiles: [
      {
        id: "lut",
        label: "GST LUT Active",
        tKey: "gstLutActive",
        rate: 0,
        badge: "0% export",
        detail: "Zero-rated export supplies (LUT)",
      },
      {
        id: "standard",
        label: "Standard TCS/TDS",
        tKey: "standardWithholding",
        rate: 0.05,
        badge: "5%",
        detail: "Typical withholding estimate",
      },
    ],
  },
};

const DEFAULT_PROFILE_SET: TaxProfileSet = {
  profiles: [
    {
      id: "export",
      label: "Export Exempt / Compliant",
      tKey: "exportProfile",
      rate: 0,
      badge: "0%",
      detail: "Export proceeds exemption",
    },
    {
      id: "standard",
      label: "Standard Withholding",
      tKey: "standardWithholding",
      rate: 0.1,
      badge: "10%",
      detail: "Illustrative estimate — verify locally",
    },
  ],
};

interface BadgeDef {
  label: string;
  /** Dictionary key (optional) — holds for regulatory badges only. */
  tKey?: UiKey;
  copy: string;
  hint: string;
}

const BADGES_BY_SLUG: Record<string, BadgeDef[] | undefined> = {
  "usd-to-pkr": [
    {
      label: "SBP Purpose Code 9110",
      tKey: "purposeCodeBadge",
      copy: "9110",
      hint: "Purpose code for freelancer export proceeds — quoted on the bank credit advice.",
    },
    {
      label: "Form e-PRC Required",
      tKey: "prcBadge",
      copy: "e-PRC",
      hint: "Export Proceeds Realization Certificate — download from your bank's e-portal once funds land.",
    },
    {
      label: "Zero P2P Risk",
      tKey: "zeroP2pRisk",
      copy: "Direct bank wire",
      hint: "Funds arrive through the formal banking channel — no peer-to-peer settlement.",
    },
  ],
  "usd-to-inr": [
    {
      label: "RBI FEMA Compliant",
      copy: "FEMA",
      hint: "Export proceeds route through an AD Category-I banking channel.",
    },
    {
      label: "FIRC Required",
      copy: "FIRC",
      hint: "FIRC is export-realization proof used for duty credit and tax/tariff benefits.",
    },
    {
      label: "LUT Zero-Rated 0%",
      copy: "GST LUT",
      hint: "Zero-rated export supplies under a valid Letter of Undertaking.",
    },
  ],
};

const DEFAULT_BADGES: BadgeDef[] = [
  {
    label: "Licensed Rail",
    copy: "Licensed wire",
    hint: "Formal, regulated remittance channel.",
  },
  {
    label: "Export Exempt",
    copy: "0%",
    hint: "Export proceeds typically qualify for a withholding exemption.",
  },
  {
    label: "Zero P2P Risk",
    copy: "Direct bank wire",
    hint: "No peer-to-peer settlement — funds land via direct bank wire.",
  },
];

function safe(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function TaxImpactCard({
  corridor,
  mode,
  invoiceValue,
  onInvoiceChange,
  grossUSD,
  grossLocal,
  netLocalPreTax,
  channelCutUSD,
  channelName,
  effectiveRate,
  tierRate,
}: {
  corridor: Corridor;
  mode: CalcMode;
  invoiceValue: number;
  onInvoiceChange: (value: number) => void;
  grossUSD: number;
  grossLocal: number;
  netLocalPreTax: number;
  channelCutUSD: number;
  channelName: string;
  effectiveRate: number;
  /** Phase B — the solver's grossed-up statutory tier (target mode only). */
  tierRate?: number;
}) {
  const { t } = useLanguage();
  const isTargetMode = mode === "net-to-gross";
  const unit = isTargetMode ? corridor.currencySymbol : "$";

  const profileSet = TAX_PROFILES_BY_SLUG[corridor.slug] ?? DEFAULT_PROFILE_SET;
  const [activeId, setActiveId] = useState<string>(
    () => DEFAULT_ACTIVE_BY_SLUG[corridor.slug] ?? profileSet.profiles[0].id
  );
  const activeProfile =
    profileSet.profiles.find((profile) => profile.id === activeId) ??
    profileSet.profiles[0];

  // Phase B — in target mode the statutory tier is owned by the gross-up
  // solver (it was already baked into the invoice), so the local profile board
  // is replaced by a read-only "grossed-up" pill and the tax math uses the
  // solver's exact rate. Quote mode keeps the interactive exemption toggle.
  const solverTier =
    isTargetMode && tierRate !== undefined
      ? Math.max(0, Math.min(1, safe(tierRate)))
      : null;
  const taxMultiplier = solverTier ?? safe(activeProfile.rate);

  const taxLocal = safe(netLocalPreTax * taxMultiplier);
  const realizationLocal = safe(netLocalPreTax - taxLocal);
  const taxSub =
    solverTier !== null
      ? `${Math.round(solverTier * 10000) / 100}% statutory tier`
      : `${activeProfile.badge} · ${activeProfile.detail}`;

  /* Live numeric pill — mirrors the parent amount/target state. Edits are
      tracked in local state while focused, then the displayed value is derived
      straight from the parent so the engine stays the single source of truth. */
  const [draft, setDraft] = useState<string>(
    () => String(Math.round(safe(invoiceValue)))
  );
  const [focused, setFocused] = useState(false);

  const displayValue = focused
    ? draft
    : Math.round(safe(invoiceValue)).toLocaleString("en-US");

  const handlePillChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    setDraft(digits);
    const parsed = digits === "" ? Number.NaN : Number(digits);
    if (Number.isFinite(parsed) && parsed > 0) {
      onInvoiceChange(parsed);
    }
  };

  const handlePillFocus = () => {
    setFocused(true);
    setDraft(String(Math.round(safe(invoiceValue))));
  };

  const handlePillBlur = () => {
    setFocused(false);
    setDraft(String(Math.round(safe(invoiceValue))));
  };

  /* Micro-copy states. */
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1600);
    } catch {
      /* clipboard unavailable (non-secure context) — ignore silently */
    }
  };

  const summaryLines = [
    `PayoutDelta — Tax & Net Take-Home Impact (${corridor.from} → ${corridor.to})`,
    `Invoice ${formatUSD(safe(grossUSD))} · ${formatLocal(
      safe(grossLocal),
      corridor
    )} @ ${safe(effectiveRate).toFixed(4)}`,
    `Channel cut: -${formatUSD(safe(channelCutUSD))} (${channelName})`,
    `Legal withholding: ${formatLocal(taxLocal, corridor)} (${taxSub})`,
    `Bank realization: ${formatLocal(realizationLocal, corridor)}`,
  ];

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryLines.join("\n"));
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 1600);
    } catch {
      /* clipboard unavailable — ignore silently */
    }
  };

  const badges = BADGES_BY_SLUG[corridor.slug] ?? DEFAULT_BADGES;

  const profileLabel = (profile: TaxProfile): string =>
    profile.tKey ? t(profile.tKey) : profile.label;

  const badgeLabel = (badge: BadgeDef): string =>
    badge.tKey ? t(badge.tKey) : badge.label;

  const cells: {
    key: string;
    label: string;
    value: string;
    sub: string;
    emphasis?: boolean;
    tone: "white" | "amber" | "emerald";
  }[] = [
    {
      key: "gross",
      label: isTargetMode ? t("requiredInvoice") : t("grossRemittance"),
      value: formatLocal(safe(grossLocal), corridor),
      sub: `@ ${safe(effectiveRate).toFixed(4)} ${corridor.to}/USD`,
      tone: "white",
    },
    {
      key: "cut",
      label: t("intermediaryCut"),
      value: `-${formatUSD(safe(channelCutUSD))}`,
      sub: channelName || t("platformClearingSpread"),
      tone: "white",
    },
    {
      key: "tax",
      label: t("legalWithholding"),
      value: formatLocal(taxLocal, corridor),
      sub: taxSub,
      tone: "amber",
    },
    {
      key: "net",
      label: t("actualRealization"),
      value: formatLocal(realizationLocal, corridor),
      sub: t("afterTax", { tax: formatLocal(taxLocal, corridor) }),
      emphasis: true,
      tone: "emerald",
    },
  ];

  const toneClasses: Record<string, string> = {
    white: "text-white",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
  };

  return (
    <section
      aria-labelledby="tax-impact"
      className="w-full min-w-0 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 text-white shadow-md backdrop-blur-md sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="tax-impact"
          className="text-xs font-semibold uppercase tracking-widest text-white/50"
        >
          {t("taxCardTitle")}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60 ring-1 ring-inset ring-white/[0.08]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          {t("liveBadge")}
        </span>
      </div>

      {/* 4-up breakdown grid (2×2 mobile, 4-across tablet+). */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`rounded-2xl p-3.5 ring-1 ring-inset ring-white/[0.06] ${
              cell.emphasis ? "bg-emerald-400/[0.06]" : "bg-white/[0.04]"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {cell.label}
            </p>
            <p
              className={`mt-1.5 font-mono text-base font-bold leading-tight tabular-nums sm:text-lg ${
                toneClasses[cell.tone]
              }`}
            >
              {cell.value}
            </p>
            <p className="mt-1 truncate font-mono text-[10px] tabular-nums text-white/45">
              {cell.sub}
            </p>
          </div>
        ))}
      </div>

      {/* iOS segmented toggle — tax exemption status. In target mode the
          solver already grossed the statutory tier into the invoice, so this
          becomes a read-only "grossed-up" pill instead of an interactive
          board (toggling a profile would desync the card from the verdict). */}
      {solverTier === null ? (
        <div
          role="group"
          aria-label={t("taxStatus")}
          className="mt-4 flex gap-1 rounded-full bg-white/[0.06] p-1 ring-1 ring-inset ring-white/[0.08]"
        >
          {profileSet.profiles.map((profile) => {
            const isActive = profile.id === activeProfile.id;
            return (
              <button
                key={profile.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveId(profile.id)}
                className={`min-w-0 flex-1 rounded-full px-3 py-2 text-center transition-all duration-200 ease-out active:scale-[0.98] ${
                  isActive
                    ? "bg-white text-black shadow-lg"
                    : "text-white/60 hover:text-white/90"
                }`}
              >
                <span className="block text-[11px] font-semibold leading-tight">
                  {profileLabel(profile)}
                </span>
                <span
                  className={`mt-0.5 block font-mono text-[11px] font-bold tabular-nums ${
                    isActive ? "text-black/55" : "text-white/45"
                  }`}
                >
                  {profile.badge}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          role="status"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-400/[0.06] px-4 py-3 ring-1 ring-inset ring-emerald-400/15"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold leading-tight text-white/70">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
            />
            {t("grossedUpWithholding")}
          </span>
          <span className="shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 font-mono text-[10px] font-bold tabular-nums text-emerald-300 ring-1 ring-emerald-400/20">
            {Math.round(solverTier * 10000) / 100}%
          </span>
        </div>
      )}

      {/* Custom numeric input pill — syncs with the main engine. */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 ring-1 ring-inset ring-white/[0.08] transition focus-within:ring-white/30">
        <span className="shrink-0 font-mono text-sm font-semibold text-white/45">
          {unit}
        </span>
        <input
          value={displayValue}
          aria-label={
            isTargetMode
              ? t("payoutInCurrency", { currency: corridor.to })
              : t("payoutInUsd")
          }
          inputMode="decimal"
          enterKeyHint="done"
          placeholder="0"
          onFocus={handlePillFocus}
          onBlur={handlePillBlur}
          onChange={(event) => handlePillChange(event.currentTarget.value)}
          className="w-full min-w-0 bg-transparent text-right font-mono text-xl font-bold tabular-nums text-white outline-none placeholder:text-white/25"
        />
        <span className="shrink-0 rounded-full bg-white/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold tabular-nums text-white/50">
          {isTargetMode ? "target" : "invoice"}
        </span>
      </div>

      {/* Actionable micro-badges. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge, index) => {
          const key = `badge-${index}`;
          const isCopied = copiedKey === key;
          return (
            <span key={key} className="group relative inline-flex">
              <button
                type="button"
                onClick={() => handleCopy(key, badge.copy)}
                aria-label={`${badgeLabel(badge)} — click to copy "${badge.copy}"`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1.5 pl-3.5 pr-1.5 text-xs font-medium text-white/80 transition-colors duration-150 hover:bg-white/[0.08] active:scale-[0.98]"
              >
                {badgeLabel(badge)}
                <span
                  className={`min-w-[3.5rem] rounded-full px-2 py-0.5 text-center text-[10px] font-bold transition-colors duration-150 ${
                    isCopied
                      ? "bg-emerald-400 text-black"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {isCopied ? t("copiedTick") : t("copyBadge")}
                </span>
              </button>
              <span
                role="tooltip"
                className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 w-max max-w-[230px] -translate-x-1/2 -translate-y-1.5 rounded-lg bg-white px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-black opacity-0 shadow-xl transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
              >
                {badge.hint}
              </span>
            </span>
          );
        })}
      </div>

      {/* Footer: context note + copy-tax-summary. */}
      <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="max-w-[38ch] text-[11px] leading-relaxed text-white/45">
          {isTargetMode
            ? solverTier !== null
              ? t("taxFooterTargetGrossUp")
              : t("taxFooterTarget")
            : t("taxFooterQuote")}
        </p>
        <button
          type="button"
          onClick={handleCopySummary}
          aria-label={t("copyTaxSummary")}
          className={`inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all duration-150 active:scale-[0.98] ${
            copiedSummary
              ? "bg-emerald-400 text-black"
              : "bg-white text-black hover:bg-white/90"
          }`}
        >
          {copiedSummary ? t("copiedTick") : t("copyTaxSummary")}
        </button>
      </div>
    </section>
  );
}