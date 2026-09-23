import type { ComplianceGuide as ComplianceGuideData } from "@/data/complianceGuides";

/**
 * Phase 5 — Apple-styled compliance drawer.
 *
 * A zero-JS native `<details>` section rendered directly under the fee
 * breakdown cards on every corridor page. The taxonomy inside is deliberately
 * consistent for AEO extraction:
 *
 *   1. Regulatory entity + legal authority badges (who governs the corridor)
 *   2. High-contrast withholding / exemption disclosure table
 *   3. Ordered checklist — "How to Obtain Your Realization Certificate"
 *   4. Critical warning box (P2P crypto / third-party account freezes)
 *   5. Regulatory FAQ disclosures (also emitted into the FAQPage JSON-LD)
 *
 * Everything ships server-rendered inside the collapsed drawer: no hydration,
 * no bundle cost, no layout shift (the drawer only expands below the fold on
 * user gesture).
 */
export default function ComplianceGuide({
  guide,
}: {
  guide: ComplianceGuideData;
}) {
  const panelId = `compliance-panel-${guide.slug}`;

  return (
    <section aria-labelledby={`compliance-title-${guide.slug}`}>
      <details className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 shadow-sm backdrop-blur-md open:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:open:shadow-none">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 select-none [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">
              Regional banking &amp; tax compliance
            </p>
            <h2
              id={`compliance-title-${guide.slug}`}
              className="mt-1 truncate text-base font-semibold text-black dark:text-white"
            >
              {guide.title}
            </h2>
            <p className="mt-0.5 text-xs text-black/[0.5] dark:text-white/[0.5]">
              {guide.regulatoryBody}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-black/50 transition-transform duration-200 ease-out group-open:rotate-180 dark:bg-white/[0.08] dark:text-white/50"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </summary>

        <div
          id={panelId}
          className="border-t border-black/[0.06] bg-neutral-50/70 px-5 py-6 dark:border-white/[0.08] dark:bg-white/[0.03]"
        >
          <div className="flex flex-wrap gap-2">
            <Badge label="Regulatory entity" value={guide.regulatoryBody} />
            <Badge label="Legal authority" value={guide.legalAuthority} />
            <Badge label="Clearing network" value={guide.clearingNetwork} />
          </div>

          <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">
            Mandatory documentation
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {guide.documentation.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-black/[0.1] bg-white px-2.5 py-1.5 text-xs leading-snug text-black/75 dark:border-white/[0.12] dark:bg-transparent dark:text-white/75"
              >
                {item}
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">
            Key withholding tax &amp; exemption schedule
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-black/70 dark:text-white/70">
            {guide.taxIntro}
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-black/20 bg-white dark:border-white/20 dark:bg-[#15151A]">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-black text-white dark:bg-white dark:text-black">
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Rate / treatment
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Legal basis
                  </th>
                </tr>
              </thead>
              <tbody>
                {guide.taxRows.map((row) => (
                  <tr
                    key={`${row.status}-${row.basis}`}
                    className="border-t border-black/15 dark:border-white/15"
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 align-top text-[13px] font-semibold text-black dark:text-white"
                    >
                      {row.status}
                    </th>
                    <td className="px-4 py-3 align-top text-[13px] font-medium tabular-nums text-black dark:text-white">
                      {row.rate}
                    </td>
                    <td className="px-4 py-3 align-top text-[13px] text-black/70 dark:text-white/70">
                      {row.basis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">
            {guide.checklistTitle}
          </h3>
          <ol className="mt-3 space-y-3">
            {guide.checklistSteps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white dark:bg-white dark:text-black"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-black/70 dark:text-white/70">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-950 dark:text-amber-200">
              <span aria-hidden="true">⚠</span>
              {guide.warning.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-950/85 dark:text-amber-100/85">
              {guide.warning.body}
            </p>
          </div>

          <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">
            Regulatory questions
          </h3>
          <div className="mt-2 divide-y divide-black/[0.08] overflow-hidden rounded-xl border border-black/[0.08] bg-white dark:divide-white/[0.1] dark:border-white/[0.1] dark:bg-transparent">
            {guide.faqs.map((item) => (
              <details key={item.q} className="group/faq">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium text-black select-none dark:text-white [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-black/40 transition-transform duration-200 ease-out group-open/faq:rotate-180 dark:text-white/40"
                  >
                    ▾
                  </span>
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-black/70 dark:text-white/70">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
            Informational guidance only — not financial, tax or legal advice.
            Schedules, circulars and limits change; verify with {guide.country}
            {" "}professionals and your receiving bank before transacting.
          </p>
        </div>
      </details>
    </section>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full flex-col gap-0.5 rounded-xl border border-black/[0.1] bg-white px-3 py-2 dark:border-white/[0.12] dark:bg-transparent">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/45 dark:text-white/45">
        {label}
      </span>
      <span className="text-xs font-medium leading-snug text-black dark:text-white">
        {value}
      </span>
    </span>
  );
}
