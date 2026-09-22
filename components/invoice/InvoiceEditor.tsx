"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { WithdrawalChannel } from "@/lib/types";
import type { InvoiceDraft, InvoiceLineItem } from "@/lib/invoiceTypes";
import {
  ACCENT_PALETTES,
  CURRENCIES,
  INVOICE_LOGO_LIMIT_BYTES,
  clearInvoiceDraft,
  createEmptyDraft,
  createLineItem,
  formatCurrency,
  grandTotal,
  lineTotal,
  loadInvoiceDraft,
  persistInvoiceDraft,
  readDataUrl,
  subtotal,
  taxAmount,
} from "@/lib/invoiceTypes";
import InvoicePreview from "@/components/invoice/InvoicePreview";
import TransparencyClause from "@/components/invoice/TransparencyClause";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Freelance Invoice Studio — editor + persistence (client island).
 *
 * Everything runs in the browser: drafts auto-save to localStorage on every
 * change under `payoutdelta_draft_invoice`, logos drop in via FileReader as
 * base64 data URLs (500KB guard), and the "Download PDF" button is nothing
 * but native `window.print()`. Zero server round-trips → static export intact.
 *
 * Initial state loads from the wallet after mount (never during prerender) so
 * static-export hydration stays deterministic and CLS-free.
 */
export default function InvoiceEditor({
  channels,
}: {
  channels: WithdrawalChannel[];
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<InvoiceDraft>(() => loadInvoiceDraft());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Debounced auto-save on every change; the "Saved locally" badge refreshes.
  // `loadInvoiceDraft()` is safe to call during prerender (returns a pristine
  // draft) and re-hydrates the saved wallet draft on first client render.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistInvoiceDraft(draft);
      setSavedAt(Date.now());
    }, 150);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const ccy = draft.meta.currency;
  const sub = subtotal(draft);
  const tax = taxAmount(draft);
  const total = grandTotal(draft);

  const patchIdentity = (patch: Partial<InvoiceDraft["identity"]>) =>
    setDraft((current) => ({
      ...current,
      identity: { ...current.identity, ...patch },
    }));

  const patchMeta = (patch: Partial<InvoiceDraft["meta"]>) =>
    setDraft((current) => ({
      ...current,
      meta: { ...current.meta, ...patch },
    }));

  const updateItem = (id: string, patch: Partial<InvoiceLineItem>) =>
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));

  const addItem = () =>
    setDraft((current) => ({
      ...current,
      lineItems: [...current.lineItems, createLineItem()],
    }));

  const removeItem = (id: string) =>
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.filter((item) => item.id !== id),
    }));

  const handleLogoFile = async (file: File | undefined) => {
    setLogoError(null);
    if (!file) return;
    if (file.size > INVOICE_LOGO_LIMIT_BYTES) {
      setLogoError(
        `Logo exceeds the ${Math.round(
          INVOICE_LOGO_LIMIT_BYTES / 1024
        )}KB limit — please compress it and try again.`
      );
      return;
    }
    try {
      const dataUrl = await readDataUrl(file);
      setDraft((current) => ({ ...current, logoDataUrl: dataUrl }));
    } catch {
      setLogoError("Could not read the image file.");
    }
  };

  const resetForm = () => {
    clearInvoiceDraft();
    setDraft(createEmptyDraft());
    setSavedAt(null);
    setLogoError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-editor-grid grid items-start gap-8 lg:grid-cols-2">
      {/* Left — controls (print-hiding: `display: none` via the
          #invoice-editor-controls / .no-print print rules, so the form inputs
          allocate no page height in the Save-as-PDF dialog). */}
      <div id="invoice-editor-controls" className="no-print flex flex-col gap-5">
        <Section title={t("identityClient")}>
          <div className="grid gap-3">
            <FieldGroupTitle>{t("yourDetails")}</FieldGroupTitle>
            <Field
              label={t("freelancerName")}
              value={draft.identity.freelancerName}
              onChange={(value) => patchIdentity({ freelancerName: value })}
              placeholder="Alex Rivera"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("email")}
                type="email"
                value={draft.identity.freelancerEmail}
                onChange={(value) => patchIdentity({ freelancerEmail: value })}
                placeholder="you@studio.com"
              />
              <Field
                label={t("taxId")}
                value={draft.identity.freelancerTaxId}
                onChange={(value) => patchIdentity({ freelancerTaxId: value })}
                placeholder="VAT / EIN (optional)"
              />
            </div>
            <Field
              label={t("address")}
              value={draft.identity.freelancerAddress}
              onChange={(value) => patchIdentity({ freelancerAddress: value })}
              placeholder="City, Country"
            />
            <FieldGroupTitle>{t("clientGroup")}</FieldGroupTitle>
            <Field
              label={t("clientName")}
              value={draft.identity.clientName}
              onChange={(value) => patchIdentity({ clientName: value })}
              placeholder="Jamie Chen"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("clientCompanyLbl")}
                value={draft.identity.clientCompany}
                onChange={(value) => patchIdentity({ clientCompany: value })}
                placeholder="Acme Inc."
              />
              <Field
                label={t("clientEmail")}
                type="email"
                value={draft.identity.clientEmail}
                onChange={(value) => patchIdentity({ clientEmail: value })}
                placeholder="billing@acme.com"
              />
            </div>
          </div>
        </Section>

        <Section title={t("docMeta")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("invoiceNumber")}
              value={draft.meta.number}
              onChange={(value) => patchMeta({ number: value })}
              placeholder="INV-2026-001"
              className="font-mono"
            />
            <CurrencySelect
              value={draft.meta.currency}
              onChange={(value) => patchMeta({ currency: value })}
            />
            <Field
              label={t("issueDate")}
              type="date"
              value={draft.meta.issueDate}
              onChange={(value) => patchMeta({ issueDate: value })}
            />
            <Field
              label={t("dueDate")}
              type="date"
              value={draft.meta.dueDate}
              onChange={(value) => patchMeta({ dueDate: value })}
            />
          </div>
        </Section>

        <Section title={t("lineItems")}>
          <div className="flex flex-col gap-3">
            {draft.lineItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-black/[0.06] bg-white p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_76px_96px]">
                  <Field
                    label={t("itemDesc", { n: String(index + 1) })}
                    value={item.description}
                    onChange={(value) =>
                      updateItem(item.id, { description: value })
                    }
                    placeholder="Web build — retainer"
                    className="sm:col-span-full"
                  />
                  <Field
                    label={t("qtyHours")}
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(value) =>
                      updateItem(item.id, { quantity: value })
                    }
                    className="font-mono"
                  />
                  <Field
                    label={t("unitRate")}
                    inputMode="decimal"
                    value={item.unitRate}
                    onChange={(value) =>
                      updateItem(item.id, { unitRate: value })
                    }
                    className="font-mono"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-black/[0.06] pt-2">
                  <span className="text-xs tabular-nums text-slate-500">
                    {t("lineTotal")}{" "}
                    <span className="font-mono font-medium text-slate-900">
                      {formatCurrency(lineTotal(item), ccy)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={draft.lineItems.length === 1}
                    className="rounded-full px-3 py-1 text-xs font-medium text-red-600 transition-colors duration-200 ease-out hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {t("removeItem")}
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="rounded-full border border-black/[0.12] bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition-all duration-200 ease-out hover:border-black/25 hover:bg-neutral-50"
            >
              {t("addItem")}
            </button>
          </div>
        </Section>

        <Section title={t("summaryTax")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("taxVat")}
              inputMode="decimal"
              value={draft.taxPercent}
              onChange={(value) =>
                setDraft((current) => ({ ...current, taxPercent: value }))
              }
              placeholder="0"
              className="font-mono"
            />
            <div className="rounded-xl bg-[#F5F5F7] p-3">
              <div className="flex items-baseline justify-between text-sm text-slate-500">
                <span>{t("subtotal")}</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {formatCurrency(sub, ccy)}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex items-baseline justify-between text-sm text-slate-500">
                  <span>{t("tax")}</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {formatCurrency(tax, ccy)}
                  </span>
                </div>
              )}
              <div className="mt-1 flex items-baseline justify-between border-t border-black/10 pt-1 text-sm">
                <span className="font-semibold text-slate-900">
                  {t("invoiceTotal")}
                </span>
                <span
                  className="font-mono text-base font-bold tabular-nums"
                  style={{
                    color:
                      ACCENT_PALETTES.find((p) => p.key === draft.accent)
                        ?.value ?? "#059669",
                  }}
                >
                  {formatCurrency(total, ccy)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Field
              label={t("note")}
              value={draft.note}
              onChange={(value) =>
                setDraft((current) => ({ ...current, note: value }))
              }
              placeholder="Net 14 days · Thanks for the partnership!"
            />
          </div>
        </Section>

        <Section title={t("customizer")}>
          <div className="grid gap-3">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {t("accentPalette")}
              </p>
              <div
                role="group"
                aria-label={t("accentPalette")}
                className="grid grid-cols-4 gap-2"
              >
                {ACCENT_PALETTES.map((palette) => {
                  const isActive = draft.accent === palette.key;
                  return (
                    <button
                      key={palette.key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          accent: palette.key,
                        }))
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-200 ease-out ${
                        isActive
                          ? "border-black/20 bg-[#F5F5F7] shadow-sm"
                          : "border-black/[0.06] bg-white hover:border-black/15"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: palette.value }}
                      >
                        {isActive ? "✓" : ""}
                      </span>
                      <span className="text-[11px] font-medium text-slate-700">
                        {palette.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {t("logo")}
              </p>
              <div className="flex items-center gap-3">
                {draft.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.logoDataUrl}
                    alt="Uploaded logo preview"
                    className="h-10 w-10 rounded-md object-contain ring-1 ring-black/[0.08]"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F5F5F7] text-slate-400 ring-1 ring-black/[0.06]"
                  >
                    Δ
                  </span>
                )}
                <label className="cursor-pointer rounded-full border border-black/[0.12] bg-white px-4 py-1.5 text-xs font-semibold text-slate-900 transition-all duration-200 ease-out hover:border-black/25 hover:bg-neutral-50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={(event) =>
                      void handleLogoFile(event.target.files?.[0])
                    }
                  />
                  {draft.logoDataUrl ? t("replaceLogo") : t("uploadLogo")}
                </label>
                {draft.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        logoDataUrl: null,
                      }))
                    }
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors duration-200 ease-out hover:text-red-600"
                  >
                    {t("removeLogo")}
                  </button>
                )}
              </div>
              {logoError && (
                <p className="mt-2 text-xs leading-relaxed text-red-600">
                  {logoError}
                </p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                {t("logoLimitNote", {
                  kb: String(Math.round(INVOICE_LOGO_LIMIT_BYTES / 1024)),
                })}
              </p>
            </div>
          </div>
        </Section>

        <TransparencyClause
          enabled={draft.includeTransparencyClause}
          onToggle={(next) =>
            setDraft((current) => ({
              ...current,
              includeTransparencyClause: next,
            }))
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
          <span
            className="inline-flex items-center gap-1.5 text-xs text-slate-500"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                savedAt !== null ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            {savedAt !== null ? t("savedLocally") : t("draftReady")}
          </span>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-black/[0.12] bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-red-300 hover:text-red-600"
          >
            {t("resetForm")}
          </button>
        </div>
      </div>

      {/* Right — live preview */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t("livePreview")}
            </h2>
            <p className="text-xs text-slate-500">
              {t("livePreviewSub")}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-neutral-800"
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
            {t("downloadPdf")}
          </button>
        </div>
        <InvoicePreview draft={draft} channels={channels} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Local primitives — editorial, native-feeling inputs.
 * ------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldGroupTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </p>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "decimal" | "text" | "email";
  className?: string;
}) {
  const inputClass = `w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 ease-out focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] ${className}`;
  if (type === "date") {
    return (
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      </label>
    );
  }
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: InvoiceDraft["meta"]["currency"];
  onChange: (value: InvoiceDraft["meta"]["currency"]) => void;
}) {
  const { t } = useLanguage();
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {t("currency")}
      </span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value as InvoiceDraft["meta"]["currency"])
        }
        className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-200 ease-out focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06]"
      >
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code} — {currency.label}
          </option>
        ))}
      </select>
    </label>
  );
}