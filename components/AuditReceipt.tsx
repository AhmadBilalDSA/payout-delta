import type { ChannelQuote, Corridor, Platform } from "@/lib/types";
import { buildAuditReceipt } from "@/utils/generateAuditPdf";

/**
 * Print-only one-page audit receipt. Mounted inside a `hidden print:block`
 * wrapper while an export is requested; `.print-area` media styles in
 * app/globals.css make it the only visible content in the print dialog, so
 * the user's own browser generates the clean 1-page PDF (no client bundle).
 */
export default function AuditReceipt({
  quote,
  corridor,
  platform,
}: {
  quote: ChannelQuote;
  corridor: Corridor;
  platform: Platform;
}) {
  const asOf = new Date().toISOString().slice(0, 10);
  const data = buildAuditReceipt({ quote, corridor, platform, asOf });

  return (
    <div className="print-area min-w-0 bg-white p-0 text-slate-900">
      <header className="border-b-2 border-slate-900 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
          {data.kicker}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {data.heading}
        </h1>
        <p className="mt-1 text-sm font-medium">{data.summary}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Audit date: <span className="tabular-nums">{data.asOf}</span>
        </p>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {data.grossLabel}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {data.grossValue}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Net realization
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">
            {data.emeraldNote.split(" · ")[0]}
          </p>
        </div>
      </section>

      <table className="mt-4 w-full border-collapse text-sm">
        <tbody>
          {data.rows.map((row) => (
            <tr
              key={row.label}
              className={`border-b border-slate-200 ${row.emphasized ? "bg-slate-50" : ""}`}
            >
              <td className="px-2 py-2.5">
                <span
                  className={`text-[13px] ${row.emphasized ? "font-bold" : "font-medium text-slate-700"}`}
                >
                  {row.label}
                </span>
                {row.detail !== undefined && (
                  <p className="text-[11px] text-slate-500">{row.detail}</p>
                )}
              </td>
              <td
                className={`px-2 py-2.5 text-right font-bold tabular-nums ${row.emphasized ? "text-emerald-700" : "text-slate-900"}`}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[11px] font-semibold tabular-nums text-slate-700">
        {data.emeraldNote}
      </p>

      <footer className="mt-6 border-t border-slate-300 pt-3 text-[10px] leading-relaxed text-slate-500">
        <p>{data.disclaimer}</p>
        <p className="mt-1">{data.independence}</p>
      </footer>
    </div>
  );
}