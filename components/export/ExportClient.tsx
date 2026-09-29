"use client";

import { useState } from "react";
import { TransactionAuditSeal } from "./TransactionAuditSeal";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

const FIGURE = "font-mono tabular-nums";

interface CorridorOption {
  slug: string;
  label: string;
  from: string;
  to: string;
  country: string;
  symbol: string;
  rate: number;
  shaUsd: number;
}

interface ExportClientProps {
  corridors: CorridorOption[];
}

export function ExportClient({ corridors }: ExportClientProps) {
  const [selectedSlug, setSelectedSlug] = useState(corridors[0].slug);
  const [grossAmount, setGrossAmount] = useState<number>(10000);
  const [originatorEntity, setOriginatorEntity] = useState<string>("Acme Corp International");
  const [debtorBic, setDebtorBic] = useState<string>("CHASUS33");
  const [creditorBic, setCreditorBic] = useState<string>("SCBLINBBA");

  const corridor = corridors.find((c) => c.slug === selectedSlug) || corridors[0];
  const { symbol, rate, shaUsd, to, country } = corridor;

  const platformRate = 0.10; // 10% platform fee
  const platformCutUsd = grossAmount * platformRate;
  const netAfterPlatformUsd = grossAmount - platformCutUsd;
  
  const wireUsd = shaUsd;
  const usdToConvert = Math.max(0, netAfterPlatformUsd - wireUsd);
  
  // FX margin simulation (e.g. 2.5% retail spread)
  const fxMarginRate = 0.025;
  const realizedRate = rate * (1 - fxMarginRate);
  
  const finalLocal = usdToConvert * realizedRate;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const payload = `${originatorEntity}|${debtorBic}|${creditorBic}|${selectedSlug}|${grossAmount}|${rate}|${shaUsd}|${finalLocal}`;

  const formatUsd = (val: number) => `$${val.toFixed(2)}`;
  const formatLocal = (val: number) => `${symbol}${val.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 print:max-w-none print:px-0 print:pb-0">
      
      {/* --- Control Panel (Hidden on Print) --- */}
      <div className="print:hidden mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Export Reconciliation Ledger
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Configure transaction parameters for the institutional audit sheet.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Corridor</label>
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {corridors.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gross Invoice (USD)</label>
            <input
              type="number"
              min="100"
              step="100"
              value={grossAmount}
              onChange={(e) => setGrossAmount(Number(e.target.value) || 0)}
              className={`${FIGURE} w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Originator Entity</label>
            <input
              type="text"
              value={originatorEntity}
              onChange={(e) => setOriginatorEntity(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Debtor BIC</label>
            <input
              type="text"
              value={debtorBic}
              onChange={(e) => setDebtorBic(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Creditor BIC</label>
            <input
              type="text"
              value={creditorBic}
              onChange={(e) => setCreditorBic(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
        
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Export & Print
        </button>
      </div>

      {/* --- Digital View wrapped in SpotlightCard, turning into formal A4 block on print --- */}
      <SpotlightCard className="print:!overflow-visible print:!bg-transparent print:!border-none print:!p-0 print:!shadow-none print:!rounded-none">
        <div className="relative z-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 text-slate-900 dark:text-white print:ring-0 print:shadow-none print:bg-transparent print:p-0 print:text-black print:rounded-none">
          <header className="mb-12 border-b-[3px] border-slate-900 pb-6 print:border-black dark:border-white">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">Reconciliation Ledger</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500 print:text-slate-800 dark:text-slate-400">
                  INSTITUTIONAL PAYMENT AUDIT SHEET
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 print:text-slate-600">Date Generated</p>
                <p className={`${FIGURE} mt-1 text-sm font-semibold`}>{new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>
          </header>

          <section className="mb-10">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 print:text-black dark:text-emerald-400 border-b border-slate-100 pb-2 print:border-slate-300 dark:border-slate-800">
              Corridor Parameters
            </h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-slate-600 dark:text-slate-400">Originator Entity</dt>
                <dd className="mt-1 text-lg font-semibold">{originatorEntity}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-slate-600 dark:text-slate-400">Debtor BIC</dt>
                <dd className={`${FIGURE} mt-1 text-lg font-semibold uppercase`}>{debtorBic}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-slate-600 dark:text-slate-400">Creditor BIC</dt>
                <dd className={`${FIGURE} mt-1 text-lg font-semibold uppercase`}>{creditorBic}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-slate-600 dark:text-slate-400">Destination Market</dt>
                <dd className="mt-1 text-lg font-semibold">{country} ({to})</dd>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 print:text-black dark:text-emerald-400 border-b border-slate-100 pb-2 print:border-slate-300 dark:border-slate-800">
              Itemized Deduction Cascade
            </h3>
            <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-6 print:bg-transparent print:p-0 print:border print:border-slate-300 dark:bg-white/[0.03]">
              <div className="flex justify-between border-b border-slate-200 pb-3 print:border-slate-300 dark:border-slate-800/60">
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-600 print:text-slate-800 dark:text-slate-300">Gross Invoiced Amount</span>
                <span className={`${FIGURE} text-lg font-bold`}>{formatUsd(grossAmount)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium text-slate-500 print:text-slate-600 dark:text-slate-400">Platform Processing Cut (10%)</span>
                <span className={`${FIGURE} text-sm font-semibold text-rose-600 print:text-black dark:text-rose-400`}>-{formatUsd(platformCutUsd)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium text-slate-500 print:text-slate-600 dark:text-slate-400">Intermediary Correspondent SHA Deductions</span>
                <span className={`${FIGURE} text-sm font-semibold text-rose-600 print:text-black dark:text-rose-400`}>-{formatUsd(wireUsd)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium text-slate-500 print:text-slate-600 dark:text-slate-400">Estimated Foreign Exchange Margin (2.5%)</span>
                <span className="text-sm font-semibold text-rose-600 print:text-black dark:text-rose-400">Applied to Rate</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-4 print:border-slate-800 dark:border-slate-700 mt-2">
                <span className="text-lg font-black uppercase tracking-widest text-slate-900 print:text-black dark:text-white">Net Credited Disbursement Amount</span>
                <span className={`${FIGURE} text-2xl font-black text-emerald-600 print:text-black dark:text-emerald-400`}>{formatLocal(finalLocal)}</span>
              </div>
            </div>
          </section>

          <TransactionAuditSeal payload={payload} />

          {/* --- Formal Statutory Ledger Signature Blocks (Print Only) --- */}
          <div className="hidden print:flex justify-between mt-24 pt-8">
            <div className="w-64 border-t-2 border-black pt-2 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-black">Authorized Signature</p>
            </div>
            <div className="w-48 border-t-2 border-black pt-2 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-black">Date</p>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
