"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { WithdrawalChannel } from "@/lib/types";
import type {
  CurrencyCode,
  InvoiceDraft,
  InvoiceLineItem,
  InvoiceSyncPayload,
} from "@/lib/invoiceTypes";
import {
  ACCENT_PALETTES,
  CURRENCIES,
  INVOICE_LOGO_LIMIT_BYTES,
  INVOICE_SYNC_EVENT,
  clearInvoiceDraft,
  createEmptyDraft,
  createLineItem,
  formatCurrency,
  globalTaxAmount,
  grandTotal,
  lineTotal,
  loadInvoiceDraft,
  persistInvoiceDraft,
  readDataUrl,
  readInvoiceSync,
  subtotal,
  totalLineGst,
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
  const [syncedBank, setSyncedBank] = useState<string | null>(null);
  const [syncLoaded, setSyncLoaded] = useState(false);
  const appliedSyncRef = useRef(false);

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

  // Phase 9 · UI polish — live calculator → studio bank-sync bridge. On mount
  // read the persisted payload, then stay subscribed to the `payoutdelta:synced`
  // event so a fresh "Sync to Invoice" click in the calculator lands even if
  // the studio is already open. Deferred so hydration stays deterministic, and
  // pre-existing user edits are never clobbered (each field keeps its value).
  useEffect(() => {
    const applySync = (payload: InvoiceSyncPayload) => {
      if (appliedSyncRef.current) return;
      appliedSyncRef.current = true;
      const tierPct = Number.isFinite(payload.taxRate)
        ? String(Math.round(payload.taxRate * 10000) / 100)
        : "";
      setDraft((current) => ({
        ...current,
        meta: {
          ...current.meta,
          currency: CURRENCIES.some((currency) => currency.code === payload.currency)
            ? (payload.currency as CurrencyCode)
            : current.meta.currency,
        },
        taxPercent:
          tierPct !== "" && current.taxPercent === "0"
            ? tierPct
            : current.taxPercent,
        banking: {
          ...current.banking,
          receivingBank:
            current.banking.receivingBank.trim() !== ""
              ? current.banking.receivingBank
              : payload.receivingBank,
          swiftCode:
            current.banking.swiftCode.trim() !== ""
              ? current.banking.swiftCode
              : payload.swiftBic,
          purposeCode:
            current.banking.purposeCode.trim() !== ""
              ? current.banking.purposeCode
              : payload.purposeCode,
          authority:
            current.banking.authority.trim() !== ""
              ? current.banking.authority
              : payload.statutoryAuthority,
        },
      }));
      setSyncedBank(payload.receivingBank);
      setSyncLoaded(true);
    };

    const onSyncEvent = (event: Event) => {
      const detail = (event as CustomEvent<InvoiceSyncPayload>).detail;
      if (detail) applySync(detail);
    };

    const timer = window.setTimeout(() => {
      const payload = readInvoiceSync();
      if (payload) applySync(payload);
    }, 0);

    window.addEventListener(INVOICE_SYNC_EVENT, onSyncEvent);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INVOICE_SYNC_EVENT, onSyncEvent);
    };
  }, []);

  const ccy = draft.meta.currency;
  const sub = subtotal(draft);
  const lineGst = totalLineGst(draft);
  const globalTax = globalTaxAmount(draft);
  const total = grandTotal(draft);

  const patchIdentity = (patch: Partial<InvoiceDraft["identity"]>) =>
    setDraft((current) => ({
      ...current,
      identity: { ...current.identity, ...patch },
    }));

  const patchBanking = (patch: Partial<InvoiceDraft["banking"]>) =>
    setDraft((current) => ({
      ...current,
      banking: { ...current.banking, ...patch },
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
          <p className="-mt-2 mb-3 text-[11px] leading-relaxed text-slate-400">
            {t("lineItemsGstNote")}
          </p>
          <div className="flex flex-col gap-3">
            {draft.lineItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-black/[0.06] bg-white p-3 transition-colors duration-200 dark:border-white/[0.08] dark:bg-zinc-900/60"
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_76px_96px_72px]">
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
                  <Field
                    label={t("gstPct")}
                    inputMode="decimal"
                    value={item.gstPercent}
                    onChange={(value) =>
                      updateItem(item.id, { gstPercent: value })
                    }
                    placeholder="0"
                    className="font-mono tabular-nums"
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
                    className="rounded-full px-3 py-1 text-xs font-medium text-red-600 transition-all duration-150 ease-out hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 disabled:hover:bg-transparent"
                  >
                    {t("removeItem")}
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="rounded-full border border-black/[0.12] bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition-all duration-150 ease-out hover:border-black/25 hover:bg-neutral-50 active:scale-[0.98] dark:border-white/15 dark:bg-zinc-900 dark:text-white dark:hover:border-white/25 dark:hover:bg-zinc-800"
            >
              {t("addItem")}
            </button>
          </div>
        </Section>

        <Section title={t("bankClearingDetails")}>
          <div className="grid gap-3">
            {syncLoaded && (
              <p
                role="status"
                aria-live="polite"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
              >
                ✓ {t("syncLoadedBanner")}
              </p>
            )}
            <Field
              label={t("beneficiaryAccount")}
              value={draft.banking.beneficiaryAccount}
              onChange={(value) => patchBanking({ beneficiaryAccount: value })}
              placeholder="PK36 MZBN 0000 0000 0000 1234"
              className="font-mono"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("receivingBank")}
                value={draft.banking.receivingBank}
                onChange={(value) => patchBanking({ receivingBank: value })}
                placeholder="Meezan Bank"
              />
              <Field
                label={t("swiftBic")}
                value={draft.banking.swiftCode}
                onChange={(value) => patchBanking({ swiftCode: value })}
                placeholder="MZNBPKKA"
                className="font-mono"
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {t("intermediaryNote")}
              </span>
              <textarea
                value={draft.banking.correspondentNote}
                onChange={(event) =>
                  patchBanking({ correspondentNote: event.target.value })
                }
                rows={2}
                placeholder="Route via the bank's London / New York correspondent — OUR instruction."
                className="w-full resize-y rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 ease-out focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              />
            </label>
            {(draft.banking.purposeCode !== "" ||
              draft.banking.authority !== "" ||
              syncedBank !== null) && (
              <div className="rounded-xl bg-[#F5F5F7] p-3 transition-colors duration-200 dark:bg-white/[0.04]">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {t("statutoryAuthority")}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                  {draft.banking.purposeCode !== "" && (
                    <span className="rounded-full bg-white px-2 py-0.5 font-mono text-slate-700 ring-1 ring-black/[0.06] dark:bg-neutral-900 dark:text-white/70 dark:ring-white/10">
                      {t("purposeCodeLabel", {
                        code: draft.banking.purposeCode,
                      })}
                    </span>
                  )}
                  {draft.banking.tierLabel !== "" && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-slate-700 ring-1 ring-black/[0.06] dark:bg-neutral-900 dark:text-white/70 dark:ring-white/10">
                      {draft.banking.tierLabel}
                    </span>
                  )}
                  {draft.banking.authority !== "" && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-black/[0.06] dark:bg-neutral-900 dark:text-white/60 dark:ring-white/10">
                      {draft.banking.authority}
                    </span>
                  )}
                </div>
                {syncedBank !== null && (
                  <p className="mt-2 text-[11px] text-emerald-600">
                    ✓ {syncedBank} — synced from the calculator
                  </p>
                )}
              </div>
            )}
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
            <div className="rounded-xl bg-[#F5F5F7] p-3 transition-colors duration-200 dark:bg-white/[0.04]">
              <div className="flex items-baseline justify-between text-sm text-slate-500">
                <span>{t("subtotal")}</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {formatCurrency(sub, ccy)}
                </span>
              </div>
              {lineGst > 0 && (
                <div className="flex items-baseline justify-between text-sm text-slate-500">
                  <span>{t("gstLine")}</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {formatCurrency(lineGst, ccy)}
                  </span>
                </div>
              )}
              {globalTax > 0 && (
                <div className="flex items-baseline justify-between text-sm text-slate-500">
                  <span>{t("tax")}</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {formatCurrency(globalTax, ccy)}
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
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-150 ease-out active:scale-[0.98] ${
                        isActive
                          ? "border-black/20 bg-[#F5F5F7] shadow-sm dark:border-white/25 dark:bg-white/[0.06]"
                          : "border-black/[0.06] bg-white hover:border-black/15 dark:border-white/[0.08] dark:bg-zinc-900/60 dark:hover:border-white/20"
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
                <label className="cursor-pointer rounded-full border border-black/[0.12] bg-white px-4 py-1.5 text-xs font-semibold text-slate-900 transition-all duration-150 ease-out hover:border-black/25 hover:bg-neutral-50 active:scale-[0.98] dark:border-white/15 dark:bg-zinc-900 dark:text-white dark:hover:border-white/25 dark:hover:bg-zinc-800">
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

        <Phase8BankTaxToggle
          enabled={draft.includeBankTaxNote}
          onToggle={(next) =>
            setDraft((current) => ({
              ...current,
              includeBankTaxNote: next,
            }))
          }
        />

        <StatutoryAddendumToggle
          enabled={draft.includeStatutoryAddendum}
          onToggle={(next) =>
            setDraft((current) => ({
              ...current,
              includeStatutoryAddendum: next,
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
            className="rounded-full border border-black/[0.12] bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-150 ease-out hover:border-red-300 hover:text-red-600 active:scale-[0.98] dark:border-white/15 dark:bg-zinc-900 dark:text-white/80 dark:hover:border-red-400/60 dark:hover:text-red-300"
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
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-neutral-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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

/** Phase 8 — bank settlement & tax breakdown addendum toggle. */
function Phase8BankTaxToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { t } = useLanguage();
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.06] bg-white p-4 transition-all duration-150 ease-out hover:border-black/[0.15] active:scale-[0.99] dark:border-white/[0.08] dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={enabled}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 ${
          enabled
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-black/20 bg-white text-transparent dark:border-white/25 dark:bg-neutral-900"
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-3 w-3"
        >
          <path
            d="m3 8.5 3.2 3L13 4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
          {t("invoiceBankToggle")}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-white/55">
          {t("invoiceBankToggleHint")}
        </span>
      </span>
    </label>
  );
}

/** Phase 9 — statutory tax & purpose-code compliance addendum toggle. */
function StatutoryAddendumToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { t } = useLanguage();
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.06] bg-white p-4 transition-all duration-150 ease-out hover:border-black/[0.15] active:scale-[0.99] dark:border-white/[0.08] dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={enabled}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 ${
          enabled
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-black/20 bg-white text-transparent dark:border-white/25 dark:bg-neutral-900"
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-3 w-3"
        >
          <path
            d="m3 8.5 3.2 3L13 4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
          {t("statutoryAddendumToggle")}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-white/55">
          {t("statutoryAddendumHint")}
        </span>
      </span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-white/50">
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
  const inputClass = `w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 ease-out focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/25 dark:focus:ring-white/[0.06] ${className}`;
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
        className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-200 ease-out focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:focus:border-white/25 dark:focus:ring-white/[0.06]"
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