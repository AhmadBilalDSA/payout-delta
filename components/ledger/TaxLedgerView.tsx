"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Corridor } from "@/lib/types";
import {
  calculateAnnualSummary,
  clearLedger,
  deleteLedgerRecord,
  downloadLedgerCsv,
  getLedgerRecords,
  ledgerRecordStatus,
} from "@/lib/ledgerEngine";
import type { RemittanceRecord } from "@/lib/ledgerEngine";
import { formatUSD } from "@/utils/format";

/**
 * PayoutDelta — Phase E "Year-End Tax Season Remittance Ledger" dashboard.
 *
 * A purely on-device annual roll-up of every invoice saved from the studio:
 * KPI cards (gross billed, deductible fees, realized take-home per currency),
 * year / corridor filters, a sortable table with expandable per-record detail,
 * two-step deletes, a spreadsheet-ready CSV export and a printable annual audit
 * package. Records live only in `localStorage` (`payoutdelta:remittance_ledger`)
 * — nothing is uploaded.
 *
 * Two layered presentations:
 *   - the interactive obsidian panel (`.no-print`) — filters, table, actions;
 *   - a dedicated white printable `.tax-ledger-print-area` document (own
 *     <header>/<footer>, fixed light classes) the `@media print` block in
 *     app/globals.css keeps visible while the app chrome is hidden.
 */

function ledgerYear(record: RemittanceRecord): string {
  return (record.savedAt || record.issueDate || "").slice(0, 4) || "Unknown";
}

export default function TaxLedgerView({
  corridors,
}: {
  corridors: Corridor[];
}) {
  const [records, setRecords] = useState<RemittanceRecord[]>(() =>
    getLedgerRecords()
  );
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterCorridor, setFilterCorridor] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const symbolByTarget = useMemo(() => {
    const map = new Map<string, string>();
    for (const corridor of corridors) {
      map.set(corridor.to, corridor.currencySymbol);
    }
    return map;
  }, [corridors]);

  const years = useMemo(() => {
    const set = new Set(records.map(ledgerYear));
    return Array.from(set).sort().reverse();
  }, [records]);

  const corridorSlugs = useMemo(() => {
    const set = new Set(records.map((record) => record.corridor));
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (filterYear === "all" || ledgerYear(record) === filterYear) &&
          (filterCorridor === "all" || record.corridor === filterCorridor)
      ),
    [records, filterYear, filterCorridor]
  );

  const summary = useMemo(() => calculateAnnualSummary(filtered), [filtered]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const localSymbol = (record: RemittanceRecord) =>
    symbolByTarget.get(record.targetCurrency) ?? "";

  const localAmount = (record: RemittanceRecord, value: number) =>
    `${localSymbol(record)} ${Math.round(value).toLocaleString("en-US")}`;

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteLedgerRecord(id);
      setRecords(getLedgerRecords());
      setConfirmDeleteId(null);
      setExpandedId((current) => (current === id ? null : current));
      showToast("Remittance record removed from the ledger.");
    } else {
      setConfirmDeleteId(id);
      window.setTimeout(
        () =>
          setConfirmDeleteId((current) => (current === id ? null : current)),
        3000
      );
    }
  };

  const handleClear = () => {
    if (confirmClear) {
      clearLedger();
      setRecords([]);
      setConfirmClear(false);
      setExpandedId(null);
      showToast("Ledger wiped — annual reset complete.");
    } else {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const handleDownloadCsv = () => {
    downloadLedgerCsv(filtered, "payoutdelta-tax-ledger.csv");
    showToast(`Exported ${filtered.length} record(s) to CSV.`);
  };

  const localCurrencies = Object.entries(summary.totalRealizedLocal)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const statusPillClass = (record: RemittanceRecord) =>
    ledgerRecordStatus(record) === "Realized"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400"
      : "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400";

  return (
    <div>
      {/* ── Interactive dashboard (hidden from the print package) ──────────── */}
      <section
        className="no-print rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-6"
        aria-label="Remittance ledger dashboard"
      >
        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LedgerKpi label="Gross billed (USD)" value={formatUSD(summary.totalGrossUsd)} />
          <LedgerKpi
            label="Deductible fees (USD)"
            value={formatUSD(summary.totalDeductibleFeesUsd)}
          />
          <LedgerKpi
            label="Records"
            value={String(summary.recordCount)}
            sub={records.length === 0 ? "seed from Invoice Studio" : undefined}
          />
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-white/50">
              Realized take-home
            </p>
            {localCurrencies.length === 0 ? (
              <p className="mt-1.5 text-sm text-slate-400 dark:text-white/40">
                No records yet
              </p>
            ) : (
              <dl className="mt-1.5 space-y-1">
                {localCurrencies.map(([currency, amount]) => (
                  <div key={currency} className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                    <dt className="text-slate-500 dark:text-white/50">{currency}</dt>
                    <dd className="font-mono text-slate-900 dark:text-white">
                      {amount.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* Filters + actions */}
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect
              label="Year"
              value={filterYear}
              onChange={setFilterYear}
              options={[
                { value: "all", label: "All years" },
                ...years.map((year) => ({ value: year, label: year })),
              ]}
            />
            <FilterSelect
              label="Corridor"
              value={filterCorridor}
              onChange={setFilterCorridor}
              options={[
                { value: "all", label: "All corridors" },
                ...corridorSlugs.map((slug) => ({ value: slug, label: slug })),
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 transition-all duration-150 ease-out hover:bg-emerald-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400"
            >
              📥 Download Tax CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/40 px-4 py-2 text-xs font-semibold text-slate-200 transition-all duration-150 ease-out hover:bg-slate-800 active:scale-[0.98]"
            >
              🖨️ Print Annual Audit Package
            </button>
          </div>
        </div>

        {/* Ledger table */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800/80">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-white/[0.03] dark:text-white/40">
                <th scope="col" className="px-3 py-2.5 font-semibold">Saved</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Invoice</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Client</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Gross (USD)</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Fees (USD)</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Net (USD)</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Realized</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-sm text-slate-400 dark:text-white/40"
                  >
                    No remittance records yet — save an invoice from the Invoice
                    Studio&apos;s Settlement &amp; Realization panel.
                  </td>
                </tr>
              )}
              {filtered.map((record) => {
                const status = ledgerRecordStatus(record);
                return (
                  <RowGroup
                    key={record.id}
                    record={record}
                    statusPillClass={statusPillClass(record)}
                    expanded={expandedId === record.id}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === record.id ? null : record.id
                      )
                    }
                    confirming={confirmDeleteId === record.id}
                    onDelete={() => handleDelete(record.id)}
                    localAmount={localAmount}
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-3 text-[11px] sm:grid-cols-4">
                      <DetailRow label="Client" value={record.clientName || "—"} />
                      <DetailRow label="Invoice ccy" value={record.invoiceCurrency} />
                      <DetailRow label="Gross (billed)" value={record.grossAmount.toFixed(2)} mono />
                      <DetailRow label="Platform fee" value={formatUSD(record.platformFeeUsd)} mono />
                      <DetailRow label="SWIFT cut" value={formatUSD(record.swiftCutUsd)} mono />
                      <DetailRow label="FX rate" value={record.appliedExchangeRate.toFixed(4)} mono />
                      <DetailRow label="Converted local" value={localAmount(record, record.convertedLocal)} mono />
                      <DetailRow label="Landing fee" value={localAmount(record, record.landingFeeLocal)} mono />
                      <DetailRow label="Wire instruction" value={record.wireProtocol} mono />
                      <DetailRow label="Statutory basis" value={record.statutoryCitation} />
                      <DetailRow label="Status" value={status} />
                      <DetailRow label="Issue / due" value={`${record.issueDate} → ${record.dueDate}`} mono />
                    </div>
                  </RowGroup>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Clear-ledger footer action */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800/70">
          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-white/40">
            Ledger persists only in this browser. Figures aggregate via
            approximate USD anchors for non-USD invoices — confirm live rates
            before filing.
          </p>
          <button
            type="button"
            onClick={handleClear}
            disabled={records.length === 0}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
              confirmClear
                ? "border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
                : "border-black/[0.12] bg-white text-slate-700 hover:border-red-300 hover:text-red-600 dark:border-white/15 dark:bg-zinc-900 dark:text-white/80 dark:hover:border-red-400/60 dark:hover:text-red-300"
            }`}
          >
            {confirmClear ? "Confirm wipe — click again" : "Wipe ledger"}
          </button>
        </div>
      </section>

      {toast !== null && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-emerald-500/30 bg-slate-900/95 px-4 py-2.5 text-xs font-medium text-emerald-300 shadow-lg shadow-black/40 backdrop-blur"
        >
          ✓ {toast}
        </div>
      )}

      {/* ── Printable annual audit package (white, fixed light classes) ─────── */}
      <div className="tax-ledger-print-area hidden print-volume">
        <header className="ledger-print-header">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            PayoutDelta · Phase E
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            Annual Remittance &amp; Tax Ledger
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {filterYear === "all"
              ? "All years"
              : `Tax year ${filterYear}`}
            {" · "}
            {filterCorridor === "all"
              ? "All corridors"
              : filterCorridor}
            {" · prepared "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        <div className="ledger-print-kpis mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Gross billed (USD)
            </p>
            <p className="mt-1 font-mono tabular-nums text-base font-bold text-slate-900">
              {formatUSD(summary.totalGrossUsd)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Deductible fees (USD)
            </p>
            <p className="mt-1 font-mono tabular-nums text-base font-bold text-slate-900">
              {formatUSD(summary.totalDeductibleFeesUsd)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Realized (local)
            </p>
            {localCurrencies.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">—</p>
            ) : (
              <dl className="mt-1 space-y-0.5">
                {localCurrencies.map(([currency, amount]) => (
                  <div
                    key={currency}
                    className="flex items-baseline justify-between gap-2 text-xs tabular-nums"
                  >
                    <dt className="text-slate-500">{currency}</dt>
                    <dd className="font-mono text-slate-900">
                      {amount.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <table className="tax-ledger-table mt-5 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-y border-slate-300 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-1.5 pr-2 font-semibold">Date</th>
              <th className="px-2 py-1.5 font-semibold">Invoice</th>
              <th className="px-2 py-1.5 font-semibold">Client</th>
              <th className="px-2 py-1.5 text-right font-semibold">Gross USD</th>
              <th className="px-2 py-1.5 text-right font-semibold">Fees USD</th>
              <th className="px-2 py-1.5 text-right font-semibold">Net USD</th>
              <th className="px-2 py-1.5 text-right font-semibold">FX</th>
              <th className="px-2 py-1.5 text-right font-semibold">Realized</th>
              <th className="py-1.5 pl-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((record) => (
              <tr key={record.id} className="tax-ledger-row">
                <td className="py-2 pr-2 font-mono tabular-nums text-slate-600">
                  {record.savedAt}
                </td>
                <td className="px-2 py-2 font-mono tabular-nums text-slate-700">
                  {record.invoiceNumber}
                </td>
                <td className="px-2 py-2 text-slate-700">
                  {record.clientName || "—"}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-700">
                  {formatUSD(record.grossUsd)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-700">
                  {formatUSD(record.platformFeeUsd + record.swiftCutUsd)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums font-medium text-slate-900">
                  {formatUSD(record.netUsd)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-600">
                  {record.appliedExchangeRate.toFixed(3)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-900">
                  {localAmount(record, record.realizedTakeHome)}
                </td>
                <td className="py-2 pl-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {ledgerRecordStatus(record)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-6 border-t border-slate-200 pt-3 text-[9px] leading-relaxed text-slate-400">
          <p>
            Generated entirely client-side by PayoutDelta from the browser&apos;s
            remittance ledger — no data leaves the device. Figures convert
            through approximate USD anchors and the corridor rate captured at
            save time; the actual deduction lands on the bank credit advice.
          </p>
          <p className="tabular-nums">
            {summary.recordCount} record(s) · {formatUSD(summary.totalGrossUsd)} gross ·
            {formatUSD(summary.totalDeductibleFeesUsd)} deductible fees.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Local primitives — matching the studio's editorial control language.
 * ------------------------------------------------------------------------- */

function LedgerKpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-white/50">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400 dark:text-white/35">
          {sub}
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-white/50">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-200 ease-out focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:focus:border-white/25 dark:focus:ring-white/[0.06]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RowGroup({
  record,
  statusPillClass,
  expanded,
  onToggle,
  confirming,
  onDelete,
  localAmount,
  children,
}: {
  record: RemittanceRecord;
  statusPillClass: string;
  expanded: boolean;
  onToggle: () => void;
  confirming: boolean;
  onDelete: () => void;
  localAmount: (record: RemittanceRecord, value: number) => string;
  children: ReactNode;
}) {
  return (
    <>
      <tr className="transition-colors duration-150 ease-out hover:bg-slate-50 dark:hover:bg-white/[0.03]">
        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-500 dark:text-white/50">
          {record.savedAt}
        </td>
        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 dark:text-white/80">
          {record.invoiceNumber}
        </td>
        <td className="px-3 py-2.5 text-slate-700 dark:text-white/70">
          {record.clientName || "—"}
        </td>
        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-white/80">
          {formatUSD(record.grossUsd)}
        </td>
        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-white/60">
          {formatUSD(record.platformFeeUsd + record.swiftCutUsd)}
        </td>
        <td className="px-3 py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white">
          {formatUSD(record.netUsd)}
        </td>
        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white">
          {localAmount(record, record.realizedTakeHome)}
        </td>
        <td className="px-3 py-2.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${statusPillClass}`}
          >
            {ledgerRecordStatus(record)}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onToggle}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              {expanded ? "Hide" : "View"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 ease-out ${
                confirming
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              }`}
            >
              {confirming ? "Confirm" : "Delete"}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} className="bg-slate-50/80 px-3 dark:bg-white/[0.02]">
            {children}
          </td>
        </tr>
      )}
    </>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <dt className="text-slate-400 dark:text-white/40">{label}</dt>
      <dd
        className={`text-right font-medium text-slate-700 dark:text-white/70 ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}