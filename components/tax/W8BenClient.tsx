"use client";

import { useState } from "react";
import { TransactionAuditSeal } from "@/components/export/TransactionAuditSeal";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

const FIGURE = "font-mono tabular-nums";

// Minimal mockup of US treaty rates for Independent Personal Services
// Most treaties offer 0% for independent contractors (Business Profits / Independent Personal Services)
// Non-treaty countries default to 30%.
const TREATY_RATES: Record<string, { rate: number; article: string }> = {
  GB: { rate: 0, article: "7 (Business Profits)" },
  CA: { rate: 0, article: "VII (Business Profits)" },
  DE: { rate: 0, article: "7 (Business Profits)" },
  AU: { rate: 0, article: "7 (Business Profits)" },
  IN: { rate: 0, article: "15 (Independent Personal Services)" },
  PK: { rate: 0, article: "I (Independent Personal Services)" },
  PH: { rate: 0, article: "15 (Independent Personal Services)" },
  BR: { rate: 30, article: "No Treaty" }, // No US-Brazil treaty
  FR: { rate: 0, article: "14 (Independent Personal Services)" },
  NL: { rate: 0, article: "7 (Business Profits)" },
};

interface JurisdictionOption {
  iso2: string;
  name: string;
}

interface W8BenClientProps {
  jurisdictions: JurisdictionOption[];
}

export function W8BenClient({ jurisdictions }: W8BenClientProps) {
  const [selectedIso2, setSelectedIso2] = useState<string>("GB");
  const [grossIncome, setGrossIncome] = useState<number>(5000);
  const [beneficialOwner, setBeneficialOwner] = useState<string>("Acme Contractor LLC");

  const country = jurisdictions.find((j) => j.iso2 === selectedIso2) || jurisdictions[0];
  const treatyInfo = TREATY_RATES[selectedIso2] || { rate: 30, article: "No Treaty" };
  
  const whtRate = treatyInfo.rate / 100;
  const withheldUsd = grossIncome * whtRate;
  const netUsd = grossIncome - withheldUsd;

  const payload = `W8BEN|${beneficialOwner}|${selectedIso2}|${grossIncome}|${treatyInfo.rate}%|${netUsd}`;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const formatUsd = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 print:max-w-none print:px-0 print:pb-0">
      <div className="print:hidden mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            W-8BEN Treaty Clearance Engine
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Resolve statutory withholding rates and generate Part II Line 10 claim language.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Beneficial Owner (Name)</label>
            <input
              type="text"
              value={beneficialOwner}
              onChange={(e) => setBeneficialOwner(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tax Residence (Country)</label>
            <select
              value={selectedIso2}
              onChange={(e) => setSelectedIso2(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {jurisdictions.map((j) => (
                <option key={j.iso2} value={j.iso2}>{j.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gross US-Source Income</label>
            <input
              type="number"
              min="100"
              step="100"
              value={grossIncome}
              onChange={(e) => setGrossIncome(Number(e.target.value) || 0)}
              className={`${FIGURE} w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white`}
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
          Export Clearance Sheet
        </button>
      </div>

      <SpotlightCard className="print:!overflow-visible print:!bg-transparent print:!border-none print:!p-0 print:!shadow-none print:!rounded-none">
        <div className="relative z-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 text-slate-900 dark:text-white print:ring-0 print:shadow-none print:bg-transparent print:p-0 print:text-black print:rounded-none">
          <header className="mb-12 border-b-[3px] border-slate-900 pb-6 print:border-black dark:border-white">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">Statutory Clearance</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500 print:text-slate-800 dark:text-slate-400">
                  FORM W-8BEN WITHHOLDING RESOLUTION
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 print:text-slate-600">Generated</p>
                <p className={`${FIGURE} mt-1 text-sm font-semibold`}>{new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>
          </header>

          <section className="mb-10">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 print:text-black dark:text-emerald-400 border-b border-slate-100 pb-2 print:border-slate-300 dark:border-slate-800">
              Taxpayer Information
            </h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-slate-600 dark:text-slate-400">Beneficial Owner</dt>
                <dd className="mt-1 text-lg font-semibold">{beneficialOwner}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-slate-600 dark:text-slate-400">Residence Country</dt>
                <dd className="mt-1 text-lg font-semibold">{country.name} ({selectedIso2})</dd>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 print:text-black dark:text-emerald-400 border-b border-slate-100 pb-2 print:border-slate-300 dark:border-slate-800">
              Part II: Claim of Tax Treaty Benefits
            </h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 print:border-slate-400 print:bg-transparent dark:border-slate-800 dark:bg-white/[0.02]">
              <p className="text-sm leading-relaxed text-slate-700 print:text-black dark:text-slate-300">
                The beneficial owner is a resident of <span className="font-bold underline">{country.name}</span> within the meaning of the income tax treaty between the United States and that country.
              </p>
              <div className="mt-4 border-l-4 border-emerald-500 pl-4 print:border-black">
                <p className="font-mono text-sm font-semibold text-slate-800 print:text-black dark:text-white">
                  Line 10 Provision:
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 print:text-slate-800 dark:text-slate-400">
                  The beneficial owner claims the provisions of Article <span className="font-bold text-slate-900 print:text-black dark:text-emerald-400">{treatyInfo.article}</span> of the treaty to claim a <span className="font-bold text-slate-900 print:text-black dark:text-emerald-400">{treatyInfo.rate}%</span> rate of withholding on (specify type of income): <span className="italic">Independent Personal Services / Business Profits</span>.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 print:text-black dark:text-emerald-400 border-b border-slate-100 pb-2 print:border-slate-300 dark:border-slate-800">
              Withholding Calculation
            </h3>
            <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-6 print:bg-transparent print:p-0 print:border print:border-slate-300 dark:bg-white/[0.03]">
              <div className="flex justify-between border-b border-slate-200 pb-3 print:border-slate-300 dark:border-slate-800/60">
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-600 print:text-slate-800 dark:text-slate-300">Gross US-Source Income</span>
                <span className={`${FIGURE} text-lg font-bold`}>{formatUsd(grossIncome)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium text-slate-500 print:text-slate-600 dark:text-slate-400">Statutory NRA Withholding ({treatyInfo.rate}%)</span>
                <span className={`${FIGURE} text-sm font-semibold ${withheldUsd > 0 ? 'text-rose-600 dark:text-rose-400 print:text-black' : 'text-slate-400'}`}>
                  -{formatUsd(withheldUsd)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-4 print:border-slate-800 dark:border-slate-700 mt-2">
                <span className="text-lg font-black uppercase tracking-widest text-slate-900 print:text-black dark:text-white">Net Credited Amount</span>
                <span className={`${FIGURE} text-2xl font-black text-emerald-600 print:text-black dark:text-emerald-400`}>{formatUsd(netUsd)}</span>
              </div>
            </div>
          </section>

          <TransactionAuditSeal payload={payload} />

          <div className="hidden print:flex justify-between mt-24 pt-8">
            <div className="w-64 border-t-2 border-black pt-2 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-black">Sign-off Authority</p>
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
