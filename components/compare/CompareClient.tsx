"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

const FIGURE = "font-mono tabular-nums";

interface CorridorOption {
  slug: string;
  label: string;
  to: string;
  symbol: string;
  rate: number;
  shaUsd: number;
  ourUsd: number;
  localUsd: number;
  withholdingRate: number;
}

interface CompareClientProps {
  corridors: CorridorOption[];
}

function PortalSelect<T extends string>({
  value,
  options,
  onChange,
  triggerLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (val: T) => void;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const measure = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  const toggle = () => {
    if (!open) measure();
    setOpen((prev) => !prev);
  };

  const select = (val: T) => {
    onChange(val);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => measure();
    const handleResize = () => measure();
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, measure]);

  const activeLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-[13px] font-semibold text-slate-900 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white sm:w-[280px]"
      >
        <span className="truncate">{activeLabel}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 shrink-0 text-slate-400">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && typeof document !== "undefined" &&
        createPortal(
          <ul ref={menuRef} role="listbox" tabIndex={-1} aria-label={triggerLabel}
            style={{ position: "absolute", top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 9999 }}
            className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl [animation:dropdown-in_0.12s_ease] dark:border-white/[0.12] dark:bg-slate-900"
          >
            {options.map((opt) => (
              <li key={opt.value} role="option" aria-selected={opt.value === value}
                onClick={() => select(opt.value)}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${opt.value === value ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]"}`}
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

export function CompareClient({ corridors }: CompareClientProps) {
  const [selectedSlug, setSelectedSlug] = useState(corridors[0].slug);
  const [amount, setAmount] = useState(5000);

  const corridor = corridors.find((c) => c.slug === selectedSlug) || corridors[0];
  const { symbol, rate, shaUsd, ourUsd, localUsd, withholdingRate } = corridor;

  const calculatePath = (fixedFee: number, label: string) => {
    const netUsd = amount - fixedFee;
    const preTaxLocal = Math.max(0, netUsd * rate);
    const taxLocal = preTaxLocal * withholdingRate;
    const finalLocal = preTaxLocal - taxLocal;
    
    const effectiveFrictionUsd = fixedFee + (taxLocal / rate);
    const bpsFriction = amount > 0 ? (effectiveFrictionUsd / amount) * 10000 : 0;
    
    return { label, finalLocal, bpsFriction, fixedFee, taxLocal };
  };

  const paths = [
    calculatePath(shaUsd, "SWIFT SHA"),
    calculatePath(ourUsd, "SWIFT OUR"),
    calculatePath(localUsd, "Local Clearinghouse")
  ];

  const formatUsd = (val: number) => `$${val.toFixed(2)}`;
  const formatLocal = (val: number) => `${symbol}${val.toFixed(2)}`;
  const formatBps = (val: number) => `${Math.round(val)} bps`;
  
  const options = corridors.map(c => ({ value: c.slug, label: c.label }));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Corridor Comparison Engine
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          Interactive side-by-side settlement comparator evaluating Net Landed Amount, Effective Basis Point Friction, and Intermediary Deductions.
        </p>
      </div>

      <div className="mb-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Select Corridor
          </label>
          <PortalSelect
            value={selectedSlug}
            options={options}
            onChange={setSelectedSlug}
            triggerLabel="Select payout corridor"
          />
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <label htmlFor="amount" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Invoice Volume (USD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
            <input
              id="amount"
              type="number"
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className={`${FIGURE} flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 pl-8 pr-4 py-3 text-[13px] font-semibold text-slate-900 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white sm:w-[200px]`}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {paths.map((p, idx) => (
          <SpotlightCard key={idx} className="flex flex-col p-6 sm:p-8">
            <h2 className="mb-6 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
              {p.label}
            </h2>
            <div className="mb-8 flex-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Net Landed Amount</p>
              <p className={`${FIGURE} mt-2 text-3xl font-bold text-slate-900 dark:text-white`}>
                {formatLocal(p.finalLocal)}
              </p>
            </div>
            
            <dl className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Friction</dt>
                <dd className={`${FIGURE} text-sm font-semibold text-slate-900 dark:text-white`}>{formatBps(p.bpsFriction)}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Intermediary</dt>
                <dd className={`${FIGURE} text-sm font-semibold text-red-600 dark:text-red-400`}>-{formatUsd(p.fixedFee)}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tax</dt>
                <dd className={`${FIGURE} text-sm font-semibold text-amber-600 dark:text-amber-400`}>-{formatLocal(p.taxLocal)}</dd>
              </div>
            </dl>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}
