import { formatUSD } from "@/utils/format";

/**
 * PayoutDelta — Phase 5 executive treasury audit report (print / PDF engine).
 *
 * Zero dependency by construction: the sheet is semantic HTML plus a small
 * hand-written print stylesheet in `app/globals.css`. There is no PDF library,
 * no chart package, no icon set — the only graphics are CSS rules and the
 * `counter(page)` page numbering the print engine resolves natively. `window
 * .print()` in the calculator is the entire export path: the browser's own
 * "Save as PDF" is the renderer, so the report is byte-for-byte what the
 * treasury reviewer signs.
 *
 * WHY A SEPARATE SHEET INSTEAD OF PRINTING THE CALCULATOR
 * The on-screen calculator is a dark, gradient-lit, interactive instrument: its
 * numbers are only meaningful next to their inputs, and its inputs (selects,
 * number fields, remove buttons) are meaningless on paper. An audit memorandum
 * has the opposite requirements — fixed light typography, a signed header, a
 * stable reference ID and columns that do not reflow. So the print target is a
 * second rendering of the same roster, not a restyle of the first.
 *
 * DETERMINISM — the whole sheet is reproducible from its inputs
 * The reference ID is an FNV-1a digest of the roster itself (slug + amount per
 * line + the build timestamp). Two runs with the same roster print the same
 * reference, so a re-issued memorandum can be diffed against the copy the
 * reviewer filed. Nothing in the sheet reads the clock or a random source at
 * render time: the ISO 8601 stamp is minted once in the server page and handed
 * down as a prop, so the prerendered HTML and the hydrated client agree.
 */

export interface CorridorStatute {
  /** Issuing monetary authority, e.g. "State Bank of Pakistan". */
  authority: string;
  /** Regulator purpose / transaction code, e.g. "Purpose code 9111 (…)". */
  purposeCode: string;
  /** Certificate the beneficiary must hold for the credit to be creditable. */
  mandatoryAuditCert: string;
  /** Sovereign market name, e.g. "Pakistan". */
  jurisdiction: string;
  /** Domestic settlement rail the correspondent leg hands off to. */
  rail: string;
  /** Rail operator / finality window, e.g. "State Bank of Pakistan · T+0". */
  railOperator: string;
  /** Clearing network the corridor settles through. */
  clearingNetwork: string;
  /** First documented safe-harbour route, verbatim from the statute registry. */
  safeHarbor: string;
}

/** One roster line, pre-enriched by the calculator and flattened for the sheet. */
export interface ExecutiveReportRow {
  id: number;
  corridorSlug: string;
  currency: string;
  monthlyUSD: number;
  annualGrossUSD: number;
  shaAnnualUSD: number;
  fxAnnualUSD: number;
  /**
   * Annualised saving the calculator's own rails benchmark computes for this
   * line. Carried in rather than recomputed so the action column can never
   * quote a figure the model does not produce.
   */
  savingsAnnualUSD: number;
  /** Present only while the corridor's market exists in the statute registry. */
  statute: CorridorStatute | undefined;
}

export interface ExecutiveReportTotals {
  contractors: number;
  monthlyGrossUSD: number;
  annualGrossUSD: number;
  shaAnnualUSD: number;
  fxAnnualUSD: number;
  leakageAnnualUSD: number;
  modernAnnualMinUSD: number;
  modernAnnualMaxUSD: number;
  recoverableMinUSD: number;
  recoverableMaxUSD: number;
}

export interface ExecutiveReportProps {
  rows: ExecutiveReportRow[];
  totals: ExecutiveReportTotals;
  /** ISO 8601 stamp minted once on the server so hydration cannot disagree. */
  issuedAt: string;
}

/** Classification printed on every page of the memorandum. */
const CLASSIFICATION = "RESTRICTED FINANCIAL MEMORANDUM";

/**
 * FNV-1a 32-bit, rendered as 8 uppercase hex digits.
 *
 * Chosen over a cryptographic digest deliberately: this is a *reconciliation
 * key*, not a security control. Its job is to make two printouts of the same
 * roster byte-identical in their header so a re-issue is diffable against a
 * filed copy, which a four-line pure function does with no runtime dependency.
 * A 32-bit digest over a handful of lines is ample for that; it is not, and is
 * not claimed to be, collision-resistant.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, "0");
}

/**
 * Reconciliation reference for one roster.
 *
 * Two independent digests over disjoint material: the roster payload (which
 * contractor, which corridor, how much) and the issue stamp. Change a single
 * invoice amount and the payload digest moves; re-issue the same roster on a
 * later build and the payload digest holds while the stamp digest does not, so
 * a reviewer can tell "same numbers, later issue" from "different numbers"
 * without opening the file.
 */
function referenceId(rows: ExecutiveReportRow[], issuedAt: string): string {
  const payload = rows
    .map((row) => `${row.id}:${row.corridorSlug}:${row.monthlyUSD.toFixed(2)}`)
    .join("|");
  return `PD-ETR-${fnv1a(payload).slice(0, 4)}-${fnv1a(`${payload}@${issuedAt}`)}`;
}

/** Thousands-separated integer, for counts rather than money. */
function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/**
 * One line's remediation, derived from which friction dominates.
 *
 * An FX-led line (retail margin outsizing the flat SHA cut by more than 1.5x)
 * is a pricing problem and is fixed by moving to a mid-market rail; a cut-led
 * line is a routing problem and is fixed by asking for OUR or a flat-fee
 * corridor. Printing the dominant driver rather than one generic instruction
 * is what makes the action column worth reading in a meeting.
 *
 * The amount quoted is `savingsAnnualUSD` — the calculator's own benchmark
 * delta for this line — not a percentage plucked from the sheet. A retention
 * figure invented in the print layer would be indistinguishable from a
 * computed one once it is on paper, which is exactly the kind of number a
 * signed audit document must never contain.
 */
function recommendedAction(row: ExecutiveReportRow): string {
  const fxLed = row.fxAnnualUSD > row.shaAnnualUSD * 1.5;
  const rail = row.statute?.rail ?? "the local clearing rail";
  return fxLed
    ? `FX-led: re-price on ${rail} at mid-market · +${formatUSD(row.savingsAnnualUSD)} modelled / yr`
    : `Cut-led: instruct OUR on ${rail} or migrate to flat-fee · +${formatUSD(
        row.savingsAnnualUSD
      )} modelled / yr`;
}

export default function ExecutiveTreasuryReport({
  rows,
  totals,
  issuedAt,
}: ExecutiveReportProps) {
  const reference = referenceId(rows, issuedAt);

  /**
   * The statutory checklist is scoped to the *active* roster, de-duplicated by
   * corridor: four contractors on the same PKR rail produce one Pakistan row,
   * not four, so the checklist reads as a compliance register rather than a
   * repeat of the payroll table above it.
   */
  const statutoryRows = Array.from(
    new Map(
      rows
        .filter((row) => row.statute !== undefined)
        .map((row) => [row.corridorSlug, row.statute as CorridorStatute])
    ).values()
  );

  return (
    <div className="agency-print-area exec-report-print-area hidden print:block text-black bg-white p-8 max-w-[210mm] mx-auto">
      <div className="exec-report-rule" />

      <header className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[7.5pt] leading-tight font-bold tracking-[0.18em]">
            PAYOUTDELTA // CROSS-BORDER TREASURY LEAKAGE AUDIT
          </p>
          <h1 className="mt-1 text-[15pt] leading-tight font-bold tracking-tight">
            Executive Treasury Memorandum
          </h1>
          <p className="mt-0.5 text-[8pt] text-slate-700">
            Corroborating Banking Institute · Correspondent SHA Deduction &amp;
            Retail FX Margin Exposure
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-block border border-slate-900 px-1.5 py-0.5 font-mono text-[6.5pt] font-bold tracking-[0.14em] uppercase">
            {CLASSIFICATION}
          </span>
          <dl className="mt-1.5 space-y-0.5 font-mono text-[7pt]">
            <div className="flex justify-end gap-1.5">
              <dt className="text-slate-600">Issued (ISO 8601)</dt>
              <dd className="font-semibold">{issuedAt}</dd>
            </div>
            <div className="flex justify-end gap-1.5">
              <dt className="text-slate-600">Reference ID</dt>
              <dd className="font-semibold">{reference}</dd>
            </div>
            <div className="flex justify-end gap-1.5">
              <dt className="text-slate-600">Population</dt>
              <dd className="font-semibold">{formatCount(totals.contractors)} contractors</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="exec-report-rule" />

      <section className="mt-4">
        <h2 className="exec-report-heading">I. Executive Summary — Annualised Treasury Impact</h2>
        <div className="exec-report-kpis">
          <div>
            <span>Gross Annual Foreign Payroll</span>
            <strong>{formatUSD(totals.annualGrossUSD)}</strong>
            <em>
              {formatUSD(totals.monthlyGrossUSD)} / month ·{" "}
              {formatCount(totals.contractors)} contractors
            </em>
          </div>
          <div>
            <span>Intermediary SHA Wire Deductions</span>
            <strong>{formatUSD(totals.shaAnnualUSD)}</strong>
            <em>
              {totals.annualGrossUSD > 0
                ? ((totals.shaAnnualUSD / totals.annualGrossUSD) * 100).toFixed(2)
                : "0.00"}
              % of gross · per-hop correspondent cut
            </em>
          </div>
          <div>
            <span>Retail Bank FX Margin Spread</span>
            <strong>{formatUSD(totals.fxAnnualUSD)}</strong>
            <em>
              {totals.annualGrossUSD > 0
                ? ((totals.fxAnnualUSD / totals.annualGrossUSD) * 100).toFixed(2)
                : "0.00"}
              % of gross · undisclosed spread capture
            </em>
          </div>
          <div className="exec-report-kpi-recoverable">
            <span>Net Annual Recoverable Capital</span>
            <strong>
              {formatUSD(totals.recoverableMinUSD)}–{formatUSD(totals.recoverableMaxUSD)}
            </strong>
            <em>
              if routed via wholesale clearing rails · residual fee{" "}
              {formatUSD(totals.modernAnnualMinUSD)}–{formatUSD(totals.modernAnnualMaxUSD)}
            </em>
          </div>
        </div>
        <p className="mt-2 text-[8pt] leading-relaxed">
          Total reconciled annual banking friction across the population is{" "}
          <strong className="font-mono font-semibold tabular-nums">
            {formatUSD(totals.leakageAnnualUSD)}
          </strong>
          , of which the correspondent SHA deduction is{" "}
          <strong className="font-mono font-semibold tabular-nums">
            {formatUSD(totals.shaAnnualUSD)}
          </strong>{" "}
          and the retail FX margin is{" "}
          <strong className="font-mono font-semibold tabular-nums">
            {formatUSD(totals.fxAnnualUSD)}
          </strong>
          . Reinstating the population onto wholesale clearing rails at published
          flat fees recovers the band above into the reporting entity&apos;s
          treasury.
        </p>
      </section>

      <section className="mt-5">
        <h2 className="exec-report-heading">II. Granular Contractor Roster — Line-Level Deduction Ledger</h2>
        <table className="exec-report-table">
          <thead>
            <tr>
              <th>Contractor ID</th>
              <th>Jurisdiction / Destination Rail</th>
              <th className="text-right">Monthly Gross</th>
              <th className="text-right">Correspondent SHA Loss</th>
              <th className="text-right">FX Spread Markup</th>
              <th className="text-right">Net Landing Yield</th>
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const netLandingUSD = row.annualGrossUSD - row.shaAnnualUSD - row.fxAnnualUSD;
              return (
                <tr key={row.id}>
                  <td className="font-mono font-semibold tabular-nums">
                    PD-{String(row.id % 1000).padStart(3, "0")}
                  </td>
                  <td>
                    <span className="font-semibold">
                      {row.statute?.jurisdiction ?? row.corridorSlug}
                    </span>
                    <span className="block font-mono text-[7pt] text-slate-600">
                      {row.corridorSlug.toUpperCase()} ·{" "}
                      {row.statute?.rail ?? "local clearing rail"}
                    </span>
                  </td>
                  <td className="text-right font-mono tabular-nums">
                    {formatUSD(row.monthlyUSD)}
                  </td>
                  <td className="text-right font-mono tabular-nums">
                    {formatUSD(row.shaAnnualUSD)}
                  </td>
                  <td className="text-right font-mono tabular-nums">
                    {formatUSD(row.fxAnnualUSD)}
                  </td>
                  <td className="text-right font-mono font-semibold tabular-nums">
                    {formatUSD(netLandingUSD)}
                  </td>
                  <td className="text-[7.5pt] leading-snug">{recommendedAction(row)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="font-semibold uppercase">
                Population total
              </td>
              <td className="text-right font-mono font-semibold tabular-nums">
                {formatUSD(totals.monthlyGrossUSD)}
              </td>
              <td className="text-right font-mono font-semibold tabular-nums">
                {formatUSD(totals.shaAnnualUSD)}
              </td>
              <td className="text-right font-mono font-semibold tabular-nums">
                {formatUSD(totals.fxAnnualUSD)}
              </td>
              <td className="text-right font-mono font-semibold tabular-nums">
                {formatUSD(
                  totals.annualGrossUSD - totals.shaAnnualUSD - totals.fxAnnualUSD
                )}
              </td>
              <td>
                Recover {formatUSD(totals.recoverableMinUSD)}–{formatUSD(totals.recoverableMaxUSD)}{" "}
                p.a. on wholesale rails
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-5">
        <h2 className="exec-report-heading">
          III. Statutory Compliance &amp; Safe-Harbor Checklist — Active Population
        </h2>
        {statutoryRows.length === 0 ? (
          <p className="text-[8pt] italic">
            No statutory regime is published for the current population; obtain the
            beneficiary&apos;s realization certificate from the receiving institution
            before invoicing.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {statutoryRows.map((statute) => (
              <li
                key={statute.purposeCode}
                className="exec-report-checklist-item border-l-2 border-slate-900 pl-2"
              >
                <p className="text-[7.5pt] font-bold tracking-[0.1em] uppercase">
                  {statute.jurisdiction} · {statute.rail}
                </p>
                <p className="mt-0.5 text-[7.5pt] leading-snug">
                  <span className="font-semibold">□ Statutory purpose code —</span>{" "}
                  <span className="font-mono">{statute.purposeCode}</span>
                  <span className="block">
                    <span className="font-semibold">
                      □ Mandatory realization certificate —
                    </span>{" "}
                    {statute.mandatoryAuditCert}
                  </span>
                  <span className="block">
                    <span className="font-semibold">□ Safe-harbour route —</span>{" "}
                    {statute.safeHarbor}
                  </span>
                  <span className="block text-slate-700">
                    <span className="font-semibold">Destination rail —</span>{" "}
                    {statute.clearingNetwork} · {statute.railOperator} · issuing authority{" "}
                    {statute.authority}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="exec-report-rule" />

      <footer className="mt-3 text-[6.5pt] leading-relaxed text-slate-700">
        <p className="font-semibold text-black">
          Disclaimer. Intermediary SHA deductions and wholesale interbank FX
          spreads quoted in this memorandum are benchmark estimates compiled from
          the public corridor, bank-directory and statutory registries. They are
          not a dealing indication, a firm quote or an offer, and they do not
          bind any financial institution. Actual deductions land on the
          receiving institution&apos;s credit advice (CRF); the amount realized, the
          purpose code declared and the realization certificate held control in
          every case. This memorandum is informational tooling and is not
          financial, tax or legal advice. Re-run the audit against the current
          roster before any treasury instruction is issued.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-6">
          <div>
            <p className="font-semibold tracking-[0.1em] text-black uppercase">
              Prepared by
            </p>
            <p className="mt-3 border-t border-slate-900 pt-1">
              Treasury Operations · signature
            </p>
            <p className="mt-1 flex justify-between text-slate-600">
              <span>Name / title</span>
              <span>Date</span>
            </p>
          </div>
          <div>
            <p className="font-semibold tracking-[0.1em] text-black uppercase">
              Approved by
            </p>
            <p className="mt-3 border-t border-slate-900 pt-1">
              Regulatory audit trail sign-off
            </p>
            <p className="mt-1 flex justify-between text-slate-600">
              <span>Name / title</span>
              <span>Date</span>
            </p>
          </div>
        </div>

        <p className="mt-3 border-t border-slate-400 pt-1 font-mono text-[6pt]">
          {CLASSIFICATION} · Ref {reference} · Generated {issuedAt} · PayoutDelta
          executive treasury audit engine
        </p>
      </footer>

      {/*
        Page numbering. `position: fixed` repeats the bar on every sheet the
        print engine emits and `counter(page)` / `counter(pages)` resolve per
        page, which is the only page-numbering mechanism that works in the
        browser's own "Save as PDF" without a paginating library. The
        rules live in `app/globals.css` under the Phase 5 block; no JS measures
        or paginates anything.
      */}
      <div className="exec-report-pagination" aria-hidden="true">
        <span>{CLASSIFICATION}</span>
        <span className="exec-report-page-number" />
      </div>
    </div>
  );
}
