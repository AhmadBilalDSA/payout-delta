"use client";

/**
 * PayoutDelta — /reverse-calculator/ interactive surface.
 *
 * CLIENT COMPONENT. Server data is passed down as props from the server
 * wrapper (layout or page server-boundary). All heavy data (platforms,
 * corridors, channels) is pre-sliced into lightweight prop shapes here so
 * the client bundle never imports lib/db.ts or lib/registryData.ts.
 *
 * ZERO unstyled <select> elements. All dropdowns are custom ARIA listboxes
 * rendered through createPortal so z-index stacking context cannot clip them.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  calculateReverseLanding,
  fmtLocal,
  fmtPct,
  fmtUsd,
  PLATFORMS,
  type PlatformId,
} from "@/lib/reverseEngine";
import { sanitizeFinancialInput } from "@/lib/safeMath";

/* -------------------------------------------------------------------------- *
 * Prop shapes (flat, server-serialisable)
 * -------------------------------------------------------------------------- */

export interface CorridorOption {
  slug: string;
  label: string;     // "USD → PKR (Pakistan)"
  to: string;        // "PKR"
  symbol: string;    // "Rs"
  midRate: number;
  fxSpread: number;
  shaUsd: number;    // defaultIntermediaryUSD from fees.json, clamped 15–35
  withholdingRate: number; // from jurisdictions
}

interface Props {
  corridors: CorridorOption[];
}

/* -------------------------------------------------------------------------- *
 * Accessible portal dropdown (ARIA listbox pattern)
 * -------------------------------------------------------------------------- */

interface ListboxOption { value: string; label: string }

function PortalListbox({
  id,
  value,
  options,
  onChange,
  triggerLabel,
}: {
  id: string;
  value: string;
  options: ListboxOption[];
  onChange: (v: string) => void;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 0, left: 0, width: 0,
  });

  const selectedLabel = options.find((o) => o.value === value)?.label ?? triggerLabel;

  const openMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
    setOpen(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = (v: string) => { onChange(v); setOpen(false); };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition-colors hover:border-emerald-500/40 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white dark:hover:border-emerald-500/40"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          fill="none"
          className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            aria-label={triggerLabel}
            style={{
              position: "absolute",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 9999,
            }}
            className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl [animation:dropdown-in_0.12s_ease] dark:border-white/[0.12] dark:bg-slate-900"
          >
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => select(opt.value)}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                  opt.value === value
                    ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]"
                }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}

/* -------------------------------------------------------------------------- *
 * Numeric input
 * -------------------------------------------------------------------------- */

function NumericField({
  id,
  label,
  value,
  onChange,
  prefix,
  min = 0,
  step = 1,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-3 font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-mono tabular-nums text-slate-900 transition-colors focus:border-emerald-500/60 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white ${prefix ? "pl-8 pr-4" : "px-4"}`}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Receipt row
 * -------------------------------------------------------------------------- */

function ReceiptRow({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "green" | "red" | "neutral";
}) {
  const valueClass =
    highlight === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : highlight === "red"
        ? "text-rose-500 dark:text-rose-400"
        : "text-slate-900 dark:text-white";
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800/60">
      <div>
        <span className="text-[13px] text-slate-600 dark:text-slate-300">{label}</span>
        {sub && <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">{sub}</span>}
      </div>
      <span className={`font-mono tabular-nums text-sm font-semibold ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Main component
 * -------------------------------------------------------------------------- */

export default function ReverseCalculatorClient({ corridors }: Props) {
  // --- state ---
  const [targetRaw, setTargetRaw]    = useState("500000");
  const [corridorSlug, setCorridorSlug] = useState(corridors[0]?.slug ?? "");
  const [platformId, setPlatformId]  = useState<PlatformId>("upwork");

  const corridor = useMemo(
    () => corridors.find((c) => c.slug === corridorSlug) ?? corridors[0],
    [corridors, corridorSlug],
  );

  const platform = useMemo(
    () => PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[0],
    [platformId],
  );

  const result = useMemo(() => {
    if (!corridor) return null;
    const targetNetLocal = sanitizeFinancialInput(targetRaw, 0);
    return calculateReverseLanding({
      targetNetLocal,
      midRate: corridor.midRate,
      fxSpread: corridor.fxSpread,
      shaFixedCutUsd: corridor.shaUsd,
      landingFeeLocal: 0,
      withholdingRate: corridor.withholdingRate,
      platformFeePercent: platform.feePercent,
    });
  }, [targetRaw, corridor, platform]);

  const corridorOptions = useMemo(
    () => corridors.map((c) => ({ value: c.slug, label: c.label })),
    [corridors],
  );
  const platformOptions = PLATFORMS.map((p) => ({ value: p.id, label: p.label }));

  if (!corridor) return null;

  const sym = corridor.symbol;

  /* Payment memo snippet */
  const memo = result?.feasible
    ? `Invoice ${fmtUsd(result.grossInvoiceUsd)} USD gross — platform: ${platform.label} (${fmtPct(platform.feePercent)}) — SHA correspondent cut: ~${fmtUsd(corridor.shaUsd)} — FX spread: ${fmtPct(corridor.fxSpread * 100)} — net landing: ${fmtLocal(result.realizedNetLocal, sym)} ${corridor.to}`
    : "";

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
      {/* Hero */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Reverse Invoice Calculator
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
          What invoice do I need to raise?
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          Enter your target net take-home in local currency. The engine solves
          backward through the full deduction stack — platform commission,
          correspondent SHA cuts, FX spread, and statutory withholding — and
          returns the exact gross USD invoice to send your client.
        </p>
      </section>

      {/* Controls + Receipt grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">

        {/* --- Controls --- */}
        <section
          aria-labelledby="controls-heading"
          className="flex flex-col gap-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 sm:p-8"
        >
          <h2 id="controls-heading" className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Parameters
          </h2>

          <div>
            <label id="corridor-label" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Destination corridor
            </label>
            <PortalListbox
              id="corridor-select"
              value={corridorSlug}
              options={corridorOptions}
              onChange={setCorridorSlug}
              triggerLabel="Select corridor"
            />
          </div>

          <div>
            <label id="platform-label" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Client platform
            </label>
            <PortalListbox
              id="platform-select"
              value={platformId}
              options={platformOptions}
              onChange={(v) => setPlatformId(v as PlatformId)}
              triggerLabel="Select platform"
            />
          </div>

          <NumericField
            id="target-net"
            label={`Target net landing (${corridor.to})`}
            value={targetRaw}
            onChange={setTargetRaw}
            prefix={sym}
            min={1}
            step={10000}
          />

          {/* Live corridor stats */}
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
            {[
              { label: "Mid-market rate", value: `1 USD = ${corridor.midRate.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${corridor.to}` },
              { label: "FX spread",       value: fmtPct(corridor.fxSpread * 100) },
              { label: "SHA cut (est.)",  value: fmtUsd(corridor.shaUsd) },
              { label: "Withholding",     value: fmtPct(corridor.withholdingRate * 100) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{label}</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-[13px] font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* --- Receipt ledger --- */}
        <section
          aria-labelledby="receipt-heading"
          className="flex flex-col rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 sm:p-8"
        >
          <h2 id="receipt-heading" className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Itemized receipt
          </h2>

          {!result?.feasible ? (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Enter a valid target amount to calculate.
            </p>
          ) : (
            <>
              {/* Headline gross */}
              <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                  Required gross invoice
                </p>
                <p className="mt-1 font-mono tabular-nums text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                  {fmtUsd(result.grossInvoiceUsd)}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-600/70 dark:text-emerald-400/60">
                  Send this amount on your client invoice ({platform.label})
                </p>
              </div>

              {/* Deduction waterfall */}
              <div className="mt-5">
                <ReceiptRow
                  label={`Platform cut — ${platform.label}`}
                  value={fmtUsd(result.platformCutUsd)}
                  sub={`(${fmtPct(platform.feePercent)})`}
                  highlight="red"
                />
                <ReceiptRow
                  label="Correspondent SHA cut (est.)"
                  value={fmtUsd(corridor.shaUsd)}
                  sub="Field 71A"
                  highlight="red"
                />
                <ReceiptRow
                  label="FX spread leakage"
                  value={fmtUsd(result.spreadLeakageUsd)}
                  sub={`≈ ${fmtLocal(result.spreadLeakageLocal, sym)} ${corridor.to}`}
                  highlight="red"
                />
                <ReceiptRow
                  label="Statutory withholding"
                  value={fmtLocal(result.withholdingLocal, sym)}
                  sub={`${fmtPct(corridor.withholdingRate * 100)} rate`}
                  highlight="red"
                />
                <ReceiptRow
                  label="Total friction"
                  value={fmtUsd(result.totalFrictionUsd)}
                  sub={fmtPct(result.totalFrictionPct)}
                />
                <ReceiptRow
                  label={`Net landing — ${corridor.to}`}
                  value={fmtLocal(result.realizedNetLocal, sym)}
                  sub="≈ target ✓"
                  highlight="green"
                />
              </div>

              {/* Rate detail */}
              <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Mid-market rate</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                    {corridor.midRate.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Realized rate</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                    {result.realizedRate.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </dd>
                </div>
              </dl>

              {/* Copyable memo */}
              <div className="mt-5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Payment memorandum snippet
                  <span className="ml-2 font-normal normal-case text-slate-400">(select all to copy)</span>
                </p>
                <code
                  className="block select-all rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono tabular-nums text-[11.5px] leading-relaxed text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
                >
                  {memo}
                </code>
              </div>
            </>
          )}
        </section>
      </div>

      <p className="no-print mt-8 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
        PayoutDelta is informational tooling, not financial or tax advice.
        SHA cuts and FX spreads are indicative benchmarks — confirm live rates
        with your bank and platform before issuing an invoice.
      </p>
    </div>
  );
}
