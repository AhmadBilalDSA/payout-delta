"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ChannelQuote, Corridor, Platform } from "@/lib/types";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import {
  buildAuditSheet,
  type AuditSheetData,
} from "@/lib/auditSheetEngine";

/**
 * Milestone 7 — one-click client audit sheet & print-to-PDF engine.
 *
 * Opens the "PayoutDelta Official Transit & Deductions Audit" certificate for
 * the live route and exports it as a clean A4 PDF through the native
 * Save-as-PDF dialog — zero PDF runtime, zero network.
 *
 * The certificate carries a client-side audit verification ID + timestamp that
 * are generated once at open time (the dialog only mounts while `open`), so
 * every export is unique and React hydration can never mismatch. The print
 * target is a `.print-area.audit-sheet` copy mounted in a `hidden print:block`
 * wrapper; the dedicated print rules in app/globals.css pin it to exactly one
 * white A4 sheet, mirroring the PrcLetterModal strategy.
 *
 * Mount strategy mirrors `PrcLetterModal` / `EmbedSnippetModal`: the shell
 * returns `null` until `open`, Escape/backdrop dismiss.
 */
interface AuditSheetModalProps {
  open: boolean;
  onClose: () => void;
  corridor: Corridor;
  platform: Platform;
  quote: ChannelQuote | null;
}

export default function AuditSheetModal({
  open,
  onClose,
  corridor,
  platform,
  quote,
}: AuditSheetModalProps) {
  if (!open) {
    return null;
  }
  return (
    <AuditSheetDialog
      corridor={corridor}
      platform={platform}
      quote={quote}
      onClose={onClose}
    />
  );
}

function AuditSheetDialog({
  corridor,
  platform,
  quote,
  onClose,
}: {
  corridor: Corridor;
  platform: Platform;
  quote: ChannelQuote | null;
  onClose: () => void;
}) {
  // Client-only certificate stamp — generated on mount so the verification id
  // is unique per export and the server render never sees a Date/random call.
  const [stamp] = useState(() => ({
    asOf: new Date().toISOString().slice(0, 10),
    verificationId: buildVerificationId(corridor.slug),
  }));

  const regulation = useMemo(
    () => getRegulatoryBanking(corridor.slug),
    [corridor.slug]
  );

  const data = useMemo<AuditSheetData | null>(() => {
    if (quote === null) {
      return null;
    }
    return buildAuditSheet({
      quote,
      corridor,
      platform,
      regulation,
      asOf: stamp.asOf,
      verificationId: stamp.verificationId,
    });
  }, [quote, corridor, platform, regulation, stamp]);

  const [printed, setPrinted] = useState(false);
  const printedTimer = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (printedTimer.current !== null) {
      window.clearTimeout(printedTimer.current);
    }
    return () => {
      if (printedTimer.current !== null) {
        window.clearTimeout(printedTimer.current);
      }
    };
  }, []);

  const handlePrint = () => {
    setPrinted(true);
    if (printedTimer.current !== null) {
      window.clearTimeout(printedTimer.current);
    }
    printedTimer.current = window.setTimeout(() => setPrinted(false), 1200);
    // Give the print-only copy one frame to mount before opening the dialog.
    window.setTimeout(() => window.print(), 60);
  };

  return (
    <>
      {/* On-screen dialog chrome (never printed — `.no-print`). */}
      <div
        className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="PayoutDelta official transit and deductions audit"
      >
        <div
          className="relative my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[#F5F5F7] px-5 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                📄 Client Audit Sheet
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white/45">
                Official Transit &amp; Deductions Audit ·{" "}
                {corridor.from} → {corridor.to}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss client audit sheet"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 ease-out hover:bg-black/5 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid items-start gap-5 p-5">
            <AuditSheetPreview data={data} />

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              {data !== null && (
                <p className="min-w-0 truncate font-mono text-[11px] text-slate-500 dark:text-white/45">
                  Ver ID {data.verificationId}
                </p>
              )}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-150 ease-out hover:bg-emerald-500 active:scale-[0.98] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
              >
                {printed ? "✓ Preparing PDF…" : "🖨 Print / Save as PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only single-page audit certificate — sole content of the PDF. */}
      <div className="hidden print:block">
        <AuditSheetPreview data={data} print />
      </div>
    </>
  );
}

/** Renders the certificate; shared by the screen preview and the print copy. */
function AuditSheetPreview({
  data,
  print = false,
}: {
  data: AuditSheetData | null;
  print?: boolean;
}) {
  const rootClass = print
    ? "print-area audit-sheet"
    : "rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm ring-1 ring-black/[0.08] dark:bg-white dark:text-slate-900";

  return (
    <div className={rootClass}>
      {data === null ? (
        <div className="space-y-2 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">
            No route selected yet.
          </p>
          <p>
            Run the calculator at 1,000 USD (or adjust the amount) and re-open
            this sheet to issue a certificate.
          </p>
        </div>
      ) : (
        <>
          <header className="border-b-2 border-slate-900 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
              {data.kicker}
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {data.title}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {data.corridorLabel}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
              <span>
                Audit date: <span className="tabular-nums">{data.asOf}</span>
              </span>
              <span className="font-mono tabular-nums">
                Ver ID: {data.verificationId}
              </span>
            </div>
          </header>

          {/* Route analysis — Origin → correspondent → beneficiary. */}
          <section className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Settlement route analysis
            </p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {data.route.map((leg) => (
                <div
                  key={leg.label}
                  className="flex items-baseline gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {leg.label}
                  </span>
                  <span className="text-[12px] leading-snug text-slate-700">
                    {leg.detail}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Itemized deduction ledger. */}
          <section className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Itemized deductions ledger
            </p>
            <table className="mt-1.5 w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-2">
                    <span className="text-[11px] font-medium text-slate-500">
                      {data.grossLabel}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-bold tabular-nums">
                    {data.grossValue}
                  </td>
                </tr>
                {data.ledger.map((row) => (
                  <tr
                    key={row.label}
                    className={`border-b border-slate-200 ${
                      row.emphasized ? "bg-emerald-50" : ""
                    }`}
                  >
                    <td className="px-2 py-2">
                      <span
                        className={`text-[13px] ${
                          row.emphasized
                            ? "font-bold text-emerald-800"
                            : "font-medium text-slate-700"
                        }`}
                      >
                        {row.status === "warn" ? "⚠ " : ""}
                        {row.label}
                      </span>
                      {row.detail !== undefined && (
                        <p className="text-[11px] text-slate-500">
                          {row.detail}
                        </p>
                      )}
                    </td>
                    <td
                      className={`px-2 py-2 text-right font-bold tabular-nums ${
                        row.emphasized ? "text-emerald-800" : "text-slate-900"
                      }`}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Statutory compliance notice + binding recommendation. */}
          <section className="mt-4 space-y-2.5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-slate-700">
              <p className="font-bold uppercase tracking-wide text-slate-500">
                Statutory compliance notice
              </p>
              <p className="mt-1">{data.statutoryNotice}</p>
              <p className="mt-1 font-mono text-[11px] text-emerald-800">
                Purpose code: {data.purposeCode}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-amber-900">
              <p className="font-bold uppercase tracking-wide text-amber-800">
                Binding recommendation
              </p>
              <p className="mt-1">{data.recommendation}</p>
            </div>
          </section>

          <footer className="mt-4 border-t border-slate-300 pt-2.5 text-[10px] leading-relaxed text-slate-500">
            <p>{data.disclaimer}</p>
            <p className="mt-1">{data.independence}</p>
            <p className="mt-1 font-mono tabular-nums">{data.verificationId}</p>
          </footer>
        </>
      )}
    </div>
  );
}

/** Unique per-corridor certificate id: PDC-<slug>-<base36 timestamp>. */
function buildVerificationId(slug: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `PDC-${slug.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${ts}`;
}