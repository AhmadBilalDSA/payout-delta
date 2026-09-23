"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  PRC_SCHEMES,
  buildPrcLetter,
  buildPrcLetterText,
  loadPrcForm,
  prcSchemeForSlug,
  resolvePrcScheme,
  savePrcForm,
  type PrcLetterDocument,
  type PrcLetterParts,
  type PrcLetterPrefill,
  type PrcScheme,
} from "@/lib/prcLetterEngine";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";

/**
 * Phase C — 1-Click Bank PRC / FIRC statutory export exemption letter modal.
 *
 * A fully client-side generator: the contractor fills four compliance fields
 * (beneficiary name, account / IBAN, remitter, remittance reference / UETR)
 * plus the statutory purpose-code declaration, and the letterhead preview
 * re-renders live from `lib/prcLetterEngine.ts`. State persists per corridor
 * under `payoutdelta_prc_letter_<slug>`.
 *
 * Actions:
 *   • "Download Official PDF / Print" — native `window.print()`; a print-only
 *     `.print-area.prc-letter` copy is mounted so the Save-as-PDF dialog shows
 *     exactly one clean A4 letter (private styling in app/globals.css).
 *   • "Copy Letter Text" — plain-text rendering onto the clipboard with a
 *     2.5s "✓ Copied to clipboard" toast.
 *   • Dismiss — close / Escape / backdrop click.
 *
 * Mount strategy: the shell returns `null` until `open`, then mounts the inner
 * dialog that computes its initial form once from the prefill payload. Closing
 * unmounts it, reopening recomputes from the (streamed) snapshot — so the
 * letter can never open blank and no cascade-set state effect is needed.
 *
 * All document text is statutory-legal English; the module never touches the
 * network, so the static-export budget stays intact.
 */

interface PrcLetterModalProps {
  open: boolean;
  onClose: () => void;
  /** Live calculator / invoice-state prefill (bank, tier, amounts, …). */
  prefill?: PrcLetterPrefill | null;
}

interface PrcForm {
  beneficiaryName: string;
  accountNumber: string;
  remitter: string;
  transferRef: string;
  bankName: string;
  bankBranch: string;
  bankSwift: string;
  currency: string;
  currencySymbol: string;
  gross: string;
  netLocal: string;
  purposeCode: string;
  authority: string;
  tierName: string;
  tierRate: number;
  date: string;
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

interface PurposeOption {
  id: string;
  label: string;
  purposeCode: string;
  authority: string;
  tierName: string;
  tierRate: number;
}

export default function PrcLetterModal({
  open,
  onClose,
  prefill,
}: PrcLetterModalProps) {
  if (!open) {
    return null;
  }
  return (
    <PrcLetterDialog prefill={prefill ?? null} onClose={onClose} />
  );
}

function PrcLetterDialog({
  prefill,
  onClose,
}: {
  prefill: PrcLetterPrefill | null;
  onClose: () => void;
}) {
  const slug = prefill?.corridorSlug;
  const regulation = useMemo(
    () => (slug ? getRegulatoryBanking(slug) : null),
    [slug]
  );
  const initialScheme = useMemo<PrcScheme>(
    () =>
      slug
        ? prcSchemeForSlug(slug)
        : resolvePrcScheme(undefined, prefill?.purposeCode, prefill?.authority),
    [slug, prefill?.purposeCode, prefill?.authority]
  );

  // Prefill → localStorage → regulation defaults, computed once per open.
  const initial = useMemo<PrcForm>(() => {
    const stored = loadPrcForm(slug) ?? {};
    const defaultBank = regulation?.banks[0];
    const defaultTier = regulation?.tiers[0];
    return {
      beneficiaryName: prefill?.beneficiaryName ?? stored.beneficiaryName ?? "",
      accountNumber: prefill?.accountNumber ?? stored.accountNumber ?? "",
      remitter: prefill?.remitter ?? stored.remitter ?? "",
      transferRef: prefill?.transferRef ?? stored.transferRef ?? "",
      bankName: prefill?.bankName ?? stored.bankName ?? defaultBank?.name ?? "",
      bankBranch: prefill?.bankBranch ?? stored.bankBranch ?? "",
      bankSwift:
        prefill?.bankSwift ??
        stored.bankSwift ??
        defaultBank?.swiftCode ??
        "",
      currency:
        prefill?.currency ??
        stored.currency ??
        defaultBank?.localCurrency ??
        initialScheme.currency,
      currencySymbol: prefill?.currencySymbol ?? stored.currencySymbol ?? "",
      gross:
        prefill?.grossUsd != null
          ? prefill.grossUsd.toFixed(2)
          : stored.grossUsd != null
            ? stored.grossUsd.toFixed(2)
            : "1000.00",
      netLocal:
        prefill?.netRealizationLocal != null
          ? String(Math.round(prefill.netRealizationLocal))
          : stored.netRealizationLocal != null
            ? String(Math.round(stored.netRealizationLocal))
            : "",
      purposeCode:
        prefill?.purposeCode ??
        stored.purposeCode ??
        defaultTier?.purposeCode ??
        initialScheme.purposeCodeDefault,
      authority:
        prefill?.authority ??
        stored.authority ??
        (regulation
          ? `${regulation.authority} · ${defaultTier?.authority ?? ""}`
          : initialScheme.statutoryReference),
      tierName:
        prefill?.tierName ??
        stored.tierName ??
        defaultTier?.name ??
        initialScheme.certificateName,
      tierRate: prefill?.tierRate ?? stored.tierRate ?? defaultTier?.rate ?? 0,
      date: todayIso(),
    };
  }, [slug, regulation, prefill, initialScheme]);

  const [form, setForm] = useState<PrcForm>(initial);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  // Persist the shell per corridor on every change (quota-safe, on-device).
  useEffect(() => {
    savePrcForm(slug, {
      beneficiaryName: form.beneficiaryName,
      accountNumber: form.accountNumber,
      remitter: form.remitter,
      transferRef: form.transferRef,
      bankName: form.bankName,
      bankBranch: form.bankBranch,
      bankSwift: form.bankSwift,
      currency: form.currency,
      currencySymbol: form.currencySymbol,
      purposeCode: form.purposeCode,
      authority: form.authority,
      tierName: form.tierName,
      tierRate: form.tierRate,
    });
  }, [form, slug]);

  // Escape dismiss.
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

  const purposeOptions = useMemo<PurposeOption[]>(() => {
    if (regulation) {
      return regulation.tiers.map((tier) => ({
        id: tier.id,
        label: `${tier.name}${tier.purposeCode ? ` · PC ${tier.purposeCode}` : ""} · ${(tier.rate * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`,
        purposeCode: tier.purposeCode ?? initialScheme.purposeCodeDefault,
        authority: `${regulation.authority} · ${tier.authority}`,
        tierName: tier.name,
        tierRate: tier.rate,
      }));
    }
    return PRC_SCHEMES.map((scheme) => ({
      id: scheme.id,
      label: scheme.optionLabel,
      purposeCode: scheme.purposeCodeDefault,
      authority: scheme.statutoryReference,
      tierName: scheme.certificateName,
      tierRate: 0,
    }));
  }, [regulation, initialScheme]);

  const scheme = useMemo<PrcScheme>(
    () => resolvePrcScheme(slug, form.purposeCode, form.authority),
    [slug, form.purposeCode, form.authority]
  );

  const selectedPurposeId =
    regulation
      ? (regulation.tiers.find((tier) => tier.name === form.tierName)?.id ??
        regulation.tiers[0]?.id ??
        "")
      : (PRC_SCHEMES.find((s) => s.id === scheme.id)?.id ?? "global");

  const selectPurpose = (value: string) => {
    const option = purposeOptions.find((item) => item.id === value);
    if (!option) return;
    setForm((current) => ({
      ...current,
      purposeCode: option.purposeCode,
      authority: option.authority,
      tierName: option.tierName,
      tierRate: option.tierRate,
    }));
  };

  const parts = useMemo<PrcLetterParts>(
    () => ({
      beneficiaryName: form.beneficiaryName,
      accountNumber: form.accountNumber,
      remitter: form.remitter,
      transferRef: form.transferRef,
      currency: form.currency,
      currencySymbol: form.currencySymbol || " ",
      grossForeign: Number.parseFloat(form.gross) || 0,
      netRealizationLocal: Number.parseFloat(form.netLocal) || 0,
      date: form.date,
      bankName: form.bankName,
      bankBranch: form.bankBranch,
      bankSwift: form.bankSwift,
      purposeCode: form.purposeCode,
      authority: form.authority,
      tierName: form.tierName,
      tierRate: form.tierRate,
    }),
    [form]
  );

  const doc = useMemo<PrcLetterDocument>(
    () => buildPrcLetter(scheme, parts),
    [scheme, parts]
  );

  const handleCopy = async () => {
    const text = buildPrcLetterText(doc);
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
      {/* On-screen dialog chrome (never printed). */}
      <div
        className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Bank PRC / FIRC statutory exemption letter generator"
      >
        <div
          className="relative my-4 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[#F5F5F7] px-5 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                📄 Bank PRC / FIRC &amp; Export Exemption Letter
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white/45">
                {scheme.certificateName} · {scheme.optionLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss letter generator"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 ease-out hover:bg-black/5 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Body — form rail + live formal preview rail. */}
          <div className="grid items-start gap-0 lg:grid-cols-5">
            {/* Form rail */}
            <div className="flex flex-col gap-4 p-5 lg:col-span-2 lg:border-r lg:border-slate-200 dark:lg:border-white/[0.08]">
              <Field
                label="Contractor Full Name / Business Name"
                value={form.beneficiaryName}
                placeholder="Alex Rivera"
                onChange={(value) =>
                  setForm((c) => ({ ...c, beneficiaryName: value }))
                }
              />
              <Field
                label="Local Bank Account Number / IBAN"
                value={form.accountNumber}
                className="font-mono"
                placeholder="PK36 MZBN 0000 0000 0000 1234"
                onChange={(value) =>
                  setForm((c) => ({ ...c, accountNumber: value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Remitter (Client / Platform)"
                  value={form.remitter}
                  placeholder="Upwork · Acme Inc."
                  onChange={(value) =>
                    setForm((c) => ({ ...c, remitter: value }))
                  }
                />
                <Field
                  label="Remittance Ref / UETR"
                  value={form.transferRef}
                  placeholder="SWIFT MT103 UETR / Transfer ID"
                  className="font-mono"
                  onChange={(value) =>
                    setForm((c) => ({ ...c, transferRef: value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Inward Gross (USD)"
                  inputMode="decimal"
                  value={form.gross}
                  className="font-mono tabular-nums"
                  onChange={(value) => setForm((c) => ({ ...c, gross: value }))}
                />
                <Field
                  label={`Net Settlement (${form.currency || "LOCAL"})`}
                  inputMode="decimal"
                  value={form.netLocal}
                  className="font-mono tabular-nums"
                  onChange={(value) =>
                    setForm((c) => ({ ...c, netLocal: value }))
                  }
                />
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Purpose Code / Statutory Declaration
                </span>
                <select
                  value={selectedPurposeId}
                  onChange={(event) => selectPurpose(event.target.value)}
                  className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-200 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:focus:border-white/25 dark:focus:ring-white/[0.06]"
                >
                  {purposeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                    {form.purposeCode}
                  </span>
                  {form.tierRate > 0 && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-black/60 dark:bg-neutral-800 dark:text-white/60">
                      {(form.tierRate * 100).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block text-[11px] leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
                  {form.authority}
                </span>
              </label>

              {/* Actions */}
              <div className="mt-1 flex flex-wrap items-center gap-2.5 border-t border-black/[0.06] pt-4 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-neutral-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      d="M4.5 5V2.5h7V5M4.5 11H2.5v-4h11v4h-2M4 11h8v2.5h-8V11Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Download Official PDF / Print
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
                  {copied ? "✓ Copied to clipboard" : "Copy Letter Text"}
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
                Letter drafts persist only in this browser (
                {`payoutdelta_prc_letter${slug ? "_" + slug : ""}`}). Generated
                on-device — nothing is sent anywhere.
              </p>
            </div>

            {/* Live formal preview rail */}
            <div className="max-h-[70vh] overflow-y-auto p-5 lg:col-span-3 lg:max-h-[78vh] lg:p-6">
              <PrcLetterPreview doc={doc} />
            </div>
          </div>
        </div>
      </div>

      {/* Print-only single-page copy — sole visible content in the PDF dialog. */}
      <div className="hidden print:block">
        <PrcLetterPreview doc={doc} print />
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
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal" | "text" | "email";
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
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

/** Executive formal bank letterhead — shared by the screen preview and the
 *  print-only `.print-area` copy (single A4 page, no headers/footers). */
function PrcLetterPreview({
  doc,
  print = false,
}: {
  doc: PrcLetterDocument;
  print?: boolean;
}) {
  const dateLabel = new Date(`${doc.parts.date}T00:00:00`)
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .replace("Invalid Date", doc.parts.date);

  return (
    <div
      className={
        print
          ? "print-area prc-letter"
          : "prc-letter-screen rounded-xl bg-white p-6 text-slate-900 shadow-sm ring-1 ring-black/[0.08] dark:bg-white dark:text-slate-900"
      }
    >
      {/* Letterhead */}
      <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            Statutory Export Exemption Correspondence
          </p>
          <h1 className="mt-0.5 text-lg font-black tracking-tight text-slate-900">
            PAYOUTDELTA
          </h1>
        </div>
        <div className="text-right text-[11px] leading-snug text-slate-600">
          <p className="font-semibold uppercase tracking-widest text-slate-500">
            Date
          </p>
          <p className="mt-0.5 font-medium tabular-nums">{dateLabel}</p>
        </div>
      </header>

      {/* Beneficiary particulars */}
      <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[11.5px]">
        {doc.beneficiaryRows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <span className="font-semibold uppercase tracking-wide text-slate-500">
              {row.label}
            </span>
            <span className="min-w-0 truncate text-right font-medium text-slate-900">
              {row.value}
            </span>
          </div>
        ))}
      </section>

      {/* Address block */}
      <div className="mt-4 text-[12px] leading-relaxed text-slate-800">
        {doc.address.map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>

      {/* Subject */}
      <p className="mt-3 text-[12px] font-bold uppercase leading-snug text-slate-900">
        Subject: {doc.subject}
      </p>

      {/* Body */}
      <div className="mt-2 space-y-2.5 text-[12px] leading-[1.55] text-slate-800">
        <p>Dear Sir / Madam,</p>
        {doc.paragraphs.map((paragraph, index) =>
          index === 1 ? (
            <div key={index} className="space-y-0.5">
              {paragraph.split("\n").map((line) => (
                <p key={line} className="pl-3 text-slate-800">
                  • {line}
                </p>
              ))}
            </div>
          ) : (
            <p key={index} className="text-slate-800">
              {paragraph}
            </p>
          )
        )}
      </div>

      {/* Signature block */}
      <footer className="mt-5 border-t border-slate-300 pt-3">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="text-[12px] font-medium text-slate-700">Yours faithfully,</p>
            <div className="mt-6">
              <p className="font-semibold text-slate-900">
                {(doc.parts.beneficiaryName || "____________________").trim()}
              </p>
              <p className="text-[11px] text-slate-500">
                {doc.signatureTitle
                  ? `${doc.signatureTitle} · Account ${doc.parts.accountNumber || "—"}`
                  : `Account ${doc.parts.accountNumber || "—"}`}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] leading-relaxed text-slate-500">
            <p className="font-semibold uppercase tracking-widest text-slate-600">
              Beneficiary declaration
            </p>
            <p>{doc.parts.date || ""}</p>
            <p className="mt-1">____________________</p>
            <p>Signature</p>
          </div>
        </div>
        <p className="mt-3 text-[9px] leading-relaxed text-slate-500">
          {doc.disclaimer}
        </p>
      </footer>
    </div>
  );
}