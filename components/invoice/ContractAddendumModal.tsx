"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ADDENDUM_FORM_KEY,
  readLocalStorage,
  writeLocalStorage,
} from "@/lib/privacyGuard";

const CLAUSE_A_TITLE = "Strict OUR Wire Fee Allocation";
const CLAUSE_A_BODY =
  "Payer explicitly agrees that all intermediary correspondent banking fees, telegraphic transfer deductions, and SWIFT processing costs shall be transmitted under instruction code OUR. Beneficiary must receive the exact invoiced balance net in full.";

const CLAUSE_B_TITLE = "Currency Devaluation Buffer";
const CLAUSE_B_BODY =
  "If the official mid-market exchange rate between the invoiced currency and the beneficiary's operating currency fluctuates by more than 3.0% between the date of invoice issuance and final settlement, the settlement figure shall adjust upwards to match the original net realization value.";

const CLAUSE_C_TITLE = "Statutory Purpose & Tax Exemption Affirmation";
const CLAUSE_C_BODY =
  "The services rendered hereunder constitute cross-border software export / professional services performed outside the client's domestic tax jurisdiction, qualifying for zero-rated export status under applicable bilateral tax treaties.";

const RECITAL =
  "This Addendum forms an integral part of the agreement between the Contractor and the Client for the cross-border services referenced by the invoice identified above. The following protective clauses are incorporated into the payment terms by reference and prevail over any conflicting payment provision.";

/**
 * FX Contract Protection Addendum Generator — institutional cross-border
 * contractor protection without asking for a lawyer's letterhead.
 *
 * A fully client-side legal-addendum generator for the Invoice Studio: the
 * contractor fills four particulars (Contractor Name, Client Name, Reference
 * Invoice #, Settlement Currency) and a crisp white formal preview re-renders
 * live with three protective clauses:
 *
 *   Clause A — Strict OUR wire fee allocation (net-in-full guarantee).
 *   Clause B — Currency devaluation buffer (3.0% mid-rate drift protection).
 *   Clause C — Statutory purpose & tax exemption affirmation (zero-rated
 *              cross-border software export).
 *
 * Actions:
 *   • "Print / Download PDF Addendum" — native `window.print()`; a print-only
 *     `.print-area.contract-addendum` copy is mounted so the Save-as-PDF
 *     dialog shows exactly one hard-clipped A4 sheet (private styling in
 *     app/globals.css, overflow-hidden, zero trailing blank pages).
 *   • "Copy Legal Addendum Text" — plain-text rendering onto the clipboard
 *     with a 2.5s "✓ Copied to clipboard" toast.
 *   • Dismiss — close / Escape / backdrop click.
 *
 * Form fields persist locally under `payoutdelta:addendum_form`; the clause
 * text is fixed statutory-legal English. The module never touches the
 * network, so the static-export budget stays intact.
 */

export interface ContractAddendumPrefill {
  contractorName?: string;
  clientName?: string;
  invoiceNumber?: string;
  currency?: string;
}

export default function ContractAddendumModal({
  open,
  onClose,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: ContractAddendumPrefill | null;
}) {
  if (!open) {
    return null;
  }
  return <ContractAddendumDialog prefill={prefill ?? null} onClose={onClose} />;
}

interface AddendumForm {
  contractorName: string;
  clientName: string;
  invoiceNumber: string;
  currency: string;
  date: string;
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function readStoredForm(): Partial<AddendumForm> | null {
  if (typeof window === "undefined") return null;
  const raw = readLocalStorage(ADDENDUM_FORM_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AddendumForm>;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function ContractAddendumDialog({
  prefill,
  onClose,
}: {
  prefill: ContractAddendumPrefill | null;
  onClose: () => void;
}) {
  const initial = useMemo<AddendumForm>(() => {
    const stored = readStoredForm();
    return {
      contractorName: prefill?.contractorName ?? stored?.contractorName ?? "",
      clientName: prefill?.clientName ?? stored?.clientName ?? "",
      invoiceNumber: prefill?.invoiceNumber ?? stored?.invoiceNumber ?? "",
      currency: prefill?.currency ?? stored?.currency ?? "",
      date: todayIso(),
    };
  }, [prefill]);

  const [form, setForm] = useState<AddendumForm>(initial);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  // Persist the particulars on every change (quota-safe, on-device).
  useEffect(() => {
    writeLocalStorage(
      ADDENDUM_FORM_KEY,
      JSON.stringify({
        contractorName: form.contractorName,
        clientName: form.clientName,
        invoiceNumber: form.invoiceNumber,
        currency: form.currency,
      })
    );
  }, [form.contractorName, form.clientName, form.invoiceNumber, form.currency]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    },
    []
  );

  const dateLabel = useMemo(() => {
    const d = new Date(`${form.date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return form.date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [form.date]);

  const handleCopy = async () => {
    const text = buildAddendumText(form, dateLabel);
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
    <>
      <div
        className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="FX contract protection addendum generator"
      >
        <div
          className="relative my-4 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[#F5F5F7] px-5 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                📜 FX Contract Protection Addendum
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white/45">
                OUR fee allocation · devaluation buffer · zero-rated export affirmation
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss addendum generator"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 ease-out hover:bg-black/5 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid items-start gap-0 lg:grid-cols-5">
            <div className="flex flex-col gap-4 p-5 lg:col-span-2 lg:border-r lg:border-slate-200 dark:lg:border-white/[0.08]">
              <Field
                label="Contractor Name"
                value={form.contractorName}
                placeholder="Alex Rivera"
                onChange={(value) =>
                  setForm((current) => ({ ...current, contractorName: value }))
                }
              />
              <Field
                label="Client Name"
                value={form.clientName}
                placeholder="Acme Inc."
                onChange={(value) =>
                  setForm((current) => ({ ...current, clientName: value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Reference Invoice #"
                  value={form.invoiceNumber}
                  className="font-mono"
                  placeholder="INV-2026-001"
                  onChange={(value) =>
                    setForm((current) => ({ ...current, invoiceNumber: value }))
                  }
                />
                <Field
                  label="Settlement Currency"
                  value={form.currency}
                  className="font-mono tabular-nums"
                  placeholder="USD"
                  onChange={(value) =>
                    setForm((current) => ({ ...current, currency: value }))
                  }
                />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2.5 border-t border-black/[0.06] pt-4 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-neutral-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  🖨️ Print / Download PDF Addendum
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  aria-live="polite"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] ${
                    copied
                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "border-black/[0.12] bg-white text-slate-700 hover:border-black/25 hover:bg-neutral-50 dark:border-white/15 dark:bg-zinc-900 dark:text-white/80 dark:hover:border-white/25 dark:hover:bg-zinc-800"
                  }`}
                >
                  {copied ? "✓ Copied to clipboard" : "📋 Copy Legal Addendum Text"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-3 py-2 text-xs font-medium text-slate-500 transition-colors duration-200 ease-out hover:text-slate-900 dark:hover:text-white"
                >
                  Dismiss
                </button>
              </div>

              <p className="text-[11px] leading-relaxed text-black/[0.4] dark:text-white/[0.4]">
                Addendum particulars persist only in this browser (
                {ADDENDUM_FORM_KEY}). Generated on-device — nothing is sent
                anywhere.
              </p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5 lg:col-span-3 lg:max-h-[78vh] lg:p-6">
              <AddendumPreview form={form} dateLabel={dateLabel} />
            </div>
          </div>
        </div>
      </div>

      {/* Print-only single-page copy — sole visible content in the PDF dialog. */}
      <div className="hidden print:block">
        <AddendumPreview form={form} dateLabel={dateLabel} print />
      </div>
    </>
  );
}

function fallbackCopy(text: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // Clipboard unavailable — the user can still copy from the preview.
  }
  document.body.removeChild(textarea);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const inputClass = `w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 ease-out focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/25 dark:focus:ring-white/[0.06] ${className}`;
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

/** Plain-text legal addendum for the clipboard copy action. */
function buildAddendumText(form: AddendumForm, dateLabel: string): string {
  return [
    "FX CONTRACT PROTECTION ADDENDUM",
    "",
    `Contractor: ${form.contractorName || "____________________"}`,
    `Client: ${form.clientName || "____________________"}`,
    `Reference Invoice #: ${form.invoiceNumber || "____________________"}`,
    `Settlement Currency: ${form.currency || "____________________"}`,
    `Date: ${dateLabel}`,
    "",
    RECITAL,
    "",
    `CLAUSE A — ${CLAUSE_A_TITLE}`,
    CLAUSE_A_BODY,
    "",
    `CLAUSE B — ${CLAUSE_B_TITLE}`,
    CLAUSE_B_BODY,
    "",
    `CLAUSE C — ${CLAUSE_C_TITLE}`,
    CLAUSE_C_BODY,
    "",
    "Agreed and executed:",
    `Contractor: ${form.contractorName || "____________________"}`,
    `Client: ${form.clientName || "____________________"}`,
    dateLabel,
    "",
    "Generated with PayoutDelta's FX Contract Protection Addendum Generator. Informational institutional template — not financial, tax or legal advice.",
  ].join("\n");
}

/** Executive formal addendum — shared by the screen preview and the print-only
 *  `.print-area.contract-addendum` copy (single hard-clipped A4 page). */
function AddendumPreview({
  form,
  dateLabel,
  print = false,
}: {
  form: AddendumForm;
  dateLabel: string;
  print?: boolean;
}) {
  return (
    <div
      className={
        print
          ? "print-area contract-addendum"
          : "addendum-screen w-full rounded-xl bg-white p-6 text-slate-900 shadow-sm ring-1 ring-black/[0.08]"
      }
    >
      <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            Institutional Contract Protection
          </p>
          <h1 className="mt-0.5 text-lg font-black tracking-tight text-slate-900">
            FX CONTRACT PROTECTION ADDENDUM
          </h1>
        </div>
        <div className="text-right text-[11px] leading-snug text-slate-600">
          <p className="font-semibold uppercase tracking-widest text-slate-500">
            Date
          </p>
          <p className="mt-0.5 font-medium tabular-nums">{dateLabel}</p>
        </div>
      </header>

      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        PayoutDelta · Cross-Border Contract Compliance
      </p>

      <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[11.5px]">
        <PartyRow label="Contractor" value={form.contractorName} />
        <PartyRow label="Client" value={form.clientName} />
        <PartyRow label="Reference Invoice #" value={form.invoiceNumber} />
        <PartyRow label="Settlement Currency" value={form.currency} />
      </section>

      <p className="mt-3 text-[11.5px] leading-[1.55] text-slate-800">{RECITAL}</p>

      <div className="mt-3 space-y-2.5">
        <Clause number="A" title={CLAUSE_A_TITLE} body={CLAUSE_A_BODY} />
        <Clause number="B" title={CLAUSE_B_TITLE} body={CLAUSE_B_BODY} />
        <Clause number="C" title={CLAUSE_C_TITLE} body={CLAUSE_C_BODY} />
      </div>

      <footer className="mt-4 border-t border-slate-300 pt-3">
        <div className="grid grid-cols-2 gap-8">
          <SignatureBlock label="Contractor" name={form.contractorName} />
          <SignatureBlock label="Client" name={form.clientName} />
        </div>
        <p className="mt-3 text-[9px] leading-relaxed text-slate-500">
          Generated with PayoutDelta&apos;s FX Contract Protection Addendum
          Generator on the Contractor&apos;s own device. Informational institutional
          template — not financial, tax or legal advice; verify applicability
          against the governing law of the contract.
        </p>
      </footer>
    </div>
  );
}

function PartyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium text-slate-900">
        {value || "—"}
      </span>
    </div>
  );
}

function Clause({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <h2 className="flex items-baseline gap-2 text-[12px] font-bold uppercase tracking-wide text-slate-900">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[9px] font-black text-white">
          {number}
        </span>
        <span>Clause {number} — {title}</span>
      </h2>
      <p className="mt-1.5 text-[11.5px] leading-[1.55] text-slate-800">{body}</p>
    </div>
  );
}

function SignatureBlock({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-4 border-b border-slate-400 pb-0.5 font-semibold text-slate-900">
        {name || "____________________"}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">Signature &amp; date</p>
    </div>
  );
}