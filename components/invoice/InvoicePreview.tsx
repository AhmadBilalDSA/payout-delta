"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { Corridor, WithdrawalChannel } from "@/lib/types";
import {
  TransparencyClauseBlock,
  BankSettlementBlock,
  StatutoryComplianceBlock,
} from "@/components/invoice/TransparencyClause";
import type { InvoiceDraft } from "@/lib/invoiceTypes";
import {
  accentByKey,
  createInvoiceNumber,
  formatCurrency,
  formatHumanDate,
  globalTaxAmount,
  grandTotal,
  lineTotal,
  parseAmount,
  subtotal,
  totalLineGst,
} from "@/lib/invoiceTypes";
import { formatUSD } from "@/utils/format";
import {
  buildLedgerRecordFromDraft,
  ledgerRecordStatus,
} from "@/lib/ledgerEngine";
import type { RemittanceRecord } from "@/lib/ledgerEngine";

/**
 * Live 1:1 document canvas. Renders the invoice at A4-proportioned scale and
 * doubles as THE thing the browser prints — the `#invoice-document` id is the
 * only element kept visible inside `@media print` (see app/globals.css), so a
 * native `window.print()` yields a clean A4 PDF with zero client PDF bundles.
 *
 * Typography: system sans for prose, `font-mono tabular-nums` for every
 * monetary figure so columns never shift and mono laser printing stays crisp.
 */
export default function InvoicePreview({
  draft,
  channels,
  corridors,
}: {
  draft: InvoiceDraft;
  channels: WithdrawalChannel[];
  corridors: Corridor[];
}) {
  const accent = accentByKey(draft.accent);
  const ccy = draft.meta.currency;
  const sub = subtotal(draft);
  const lineGst = totalLineGst(draft);
  const globalTax = globalTaxAmount(draft);
  const total = grandTotal(draft);
  const anyLineGst = draft.lineItems.some(
    (item) => parseAmount(item.gstPercent) > 0
  );
  const fmt = (value: number) => formatCurrency(value, ccy);

  // Phase E — the settlement & realization corridor is resolved once per
  // render (falls back to the default corridor when the persisted slug no
  // longer matches the dataset), then the schedule projects the identical
  // ledger math that the studio's "Save to Tax Ledger" writes.
  const settlementCorridor = useMemo(
    () =>
      corridors.find(
        (corridor) => corridor.slug === draft.settlement.corridorSlug
      ) ?? corridors[0] ?? null,
    [corridors, draft.settlement.corridorSlug]
  );
  const settlementProjection = useMemo(
    () =>
      settlementCorridor
        ? buildLedgerRecordFromDraft(draft, settlementCorridor)
        : null,
    [draft, settlementCorridor]
  );

  return (
    <div
      id="invoice-document"
      className="invoice-document mx-auto aspect-[210/297] w-full overflow-hidden rounded-lg bg-white text-sm text-slate-900 shadow-[var(--apple-glass-shadow)] ring-1 ring-black/[0.06]"
      style={{ "--invoice-accent": accent.value } as CSSProperties}
    >
      <div className="flex h-full flex-col p-8 sm:p-10">
        <div
          aria-hidden="true"
          className="h-1 w-full rounded-full"
          style={{ backgroundColor: accent.value }}
        />

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {draft.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.logoDataUrl}
                  alt="Freelancer logo"
                  className="h-10 w-10 shrink-0 rounded-md object-contain ring-1 ring-black/[0.06]"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-semibold text-white"
                  style={{ backgroundColor: accent.value }}
                >
                  Δ
                </span>
              )}
              <p className="truncate text-base font-bold tracking-tight text-slate-900">
                {draft.identity.freelancerName || "Freelancer name"}
              </p>
            </div>
            <dl className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-slate-500">
              {draft.identity.freelancerEmail && (
                <dd className="truncate">{draft.identity.freelancerEmail}</dd>
              )}
              {draft.identity.freelancerAddress && (
                <dd className="max-w-sm truncate">
                  {draft.identity.freelancerAddress}
                </dd>
              )}
              {draft.identity.freelancerTaxId && (
                <dd className="font-mono tabular-nums">
                  Tax ID: {draft.identity.freelancerTaxId}
                </dd>
              )}
            </dl>
          </div>

          <div className="shrink-0 sm:text-right">
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ color: accent.value }}
            >
              INVOICE
            </p>
            <dl className="mt-2 space-y-0.5 text-[11px] text-slate-500">
              <div className="flex items-baseline justify-between gap-3 sm:justify-end">
                <dt>Invoice No.</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900">
                  {draft.meta.number || createInvoiceNumber()}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 sm:justify-end">
                <dt>Issue date</dt>
                <dd className="font-mono tabular-nums">
                  {formatHumanDate(draft.meta.issueDate)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 sm:justify-end">
                <dt>Due date</dt>
                <dd className="font-mono tabular-nums">
                  {formatHumanDate(draft.meta.dueDate)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <section aria-label="Bill to">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Bill to
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {draft.identity.clientCompany || draft.identity.clientName || "Client"}
            </p>
            {(draft.identity.clientName ||
              draft.identity.clientCompany ||
              draft.identity.clientEmail) && (
              <p className="mt-0.5 space-y-0.5 text-[11px] leading-relaxed text-slate-500">
                {draft.identity.clientName &&
                  draft.identity.clientName !== draft.identity.clientCompany && (
                    <span className="block">{draft.identity.clientName}</span>
                  )}
                {draft.identity.clientEmail && (
                  <span className="block">{draft.identity.clientEmail}</span>
                )}
              </p>
            )}
          </section>
          <section aria-label="Invoice currency" className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Currency
            </p>
            <p className="mt-1 font-mono tabular-nums text-sm font-semibold text-slate-900">
              {ccy}
            </p>
          </section>
        </div>

        <div className="mt-6 flex-1">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-slate-200 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-2 font-semibold">Description</th>
                <th className="px-2 py-2 text-right font-semibold">Qty / Hrs</th>
                <th className="px-2 py-2 text-right font-semibold">Unit rate</th>
                {anyLineGst && (
                  <th className="px-2 py-2 text-right font-semibold">GST %</th>
                )}
                <th className="py-2 pl-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {draft.lineItems.map((item) => (
                <tr key={item.id} className="invoice-table-row">
                  <td className="py-2.5 pr-2 text-slate-700">
                    {item.description || "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {item.quantity || "0"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {fmt(parseAmount(item.unitRate))}
                  </td>
                  {anyLineGst && (
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {parseAmount(item.gstPercent) > 0
                        ? `${parseAmount(item.gstPercent)}%`
                        : "0%"}
                    </td>
                  )}
                  <td className="py-2.5 pl-2 text-right font-mono tabular-nums font-medium text-slate-900">
                    {fmt(lineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-6 w-full max-w-[260px]">
            <div className="flex items-baseline justify-between py-1 text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{fmt(sub)}</span>
            </div>
            {lineGst > 0 && (
              <div className="flex items-baseline justify-between py-1 text-xs text-slate-500">
                <span>Line-item GST</span>
                <span className="font-mono tabular-nums">{fmt(lineGst)}</span>
              </div>
            )}
            {globalTax > 0 && (
              <div className="flex items-baseline justify-between py-1 text-xs text-slate-500">
                <span>Tax / VAT ({draft.taxPercent || "0"}%)</span>
                <span className="font-mono tabular-nums">
                  {fmt(globalTax)}
                </span>
              </div>
            )}
            <div
              className="mt-2 flex items-center justify-between rounded-lg px-3 py-2.5 text-white"
              style={{ backgroundColor: accent.value }}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider">
                Total {ccy}
              </span>
              <span className="font-mono text-base font-bold tabular-nums">
                {fmt(total)}
              </span>
            </div>
          </div>

          {draft.note && (
            <p className="mt-6 whitespace-pre-line text-[11px] leading-relaxed text-slate-500">
              {draft.note}
            </p>
          )}
        </div>

        {draft.includeTransparencyClause && (
          <TransparencyClauseBlock channels={channels} />
        )}

        {draft.includeBankTaxNote && (
          <BankSettlementBlock currency={draft.meta.currency} />
        )}

        {draft.includeStatutoryAddendum && (
          <StatutoryComplianceBlock banking={draft.banking} />
        )}

        {draft.includeSettlementSchedule &&
          settlementCorridor &&
          settlementProjection && (
            <SettlementScheduleBlock
              record={settlementProjection}
              corridor={settlementCorridor}
              platformPercent={draft.settlement.platformPercent}
            />
          )}

        <div className="mt-8 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-400">
          <p>
            Generated with the PayoutDelta Freelance Invoice Studio — fully
            client-side; no data leaves your device.
          </p>
          <p className="tabular-nums">
            All amounts in {ccy}. Remittance and local tax terms per addendum.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Phase E — Settlement & Realization Schedule (printed addendum).
 * ------------------------------------------------------------------------- */

function SettlementRow({
  label,
  value,
  mono = false,
  strong = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`text-right font-medium text-slate-800 ${
          strong ? "text-sm" : ""
        } ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function SettlementScheduleBlock({
  record,
  corridor,
  platformPercent,
}: {
  record: RemittanceRecord;
  corridor: Corridor;
  platformPercent: string;
}) {
  const safePct = parseAmount(platformPercent);
  const local = (value: number) =>
    `${corridor.currencySymbol} ${Math.round(value).toLocaleString("en-US")}`;
  const status = ledgerRecordStatus(record);

  return (
    <section
      aria-label="Settlement and realization schedule"
      className="invoice-addendum mt-8 rounded-lg border border-slate-200 p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Settlement &amp; Realization Schedule
      </p>
      <dl className="mt-2 divide-y divide-slate-100 border-t border-slate-100 text-[11px]">
        <SettlementRow
          label="Corridor"
          value={`${corridor.from} → ${corridor.to} · ${record.statutoryCitation}`}
        />
        <SettlementRow
          label="Gross billed"
          value={formatCurrency(record.grossAmount, record.invoiceCurrency)}
          mono
        />
        <SettlementRow label="Gross (USD)" value={formatUSD(record.grossUsd)} mono />
        <SettlementRow
          label={`Platform fee (${safePct}%)`}
          value={formatUSD(record.platformFeeUsd)}
          mono
        />
        <SettlementRow
          label="Intermediary SWIFT cut"
          value={formatUSD(record.swiftCutUsd)}
          mono
        />
        <SettlementRow label="Net realized (USD)" value={formatUSD(record.netUsd)} mono strong />
        <SettlementRow
          label="Applied FX rate"
          value={record.appliedExchangeRate.toFixed(4)}
          mono
        />
        <SettlementRow
          label="Converted local"
          value={local(record.convertedLocal)}
          mono
        />
        <SettlementRow
          label="Local landing fee"
          value={local(record.landingFeeLocal)}
          mono
        />
        <SettlementRow
          label="Realized take-home"
          value={local(record.realizedTakeHome)}
          mono
          strong
        />
        <SettlementRow label="Wire instruction" value={record.wireProtocol} mono />
        <SettlementRow label="Status" value={status} mono strong />
      </dl>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        Projected from the platform % and corridor rate above — confirm the
        exact SWIFT / landing deduction on the bank credit advice.
      </p>
    </section>
  );
}