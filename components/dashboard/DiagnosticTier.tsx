"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { useState } from "react";

import DashboardV3 from "@/components/DashboardV3";
import { ChevronIcon, TerminalIcon } from "@/components/dashboard/Icons";
import type {
  ClearingRegistryRow,
  ClearingTerminalIndex,
} from "@/lib/clearingTerminal";
import type {
  DashboardCorridor,
  DashboardPlatform,
} from "@/components/dashboard/payload";
import WaterfallVisualizer from "@/components/dashboard/WaterfallVisualizer";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * PayoutDelta — Dashboard v3 DIAGNOSTIC TIER (collapsed by default).
 *
 * The second half of the Two-Tier Progressive Disclosure contract, and the
 * direct answer to the brief's hard guardrail "new files only": the forensic
 * surface that already existed as `components/DashboardV3.tsx` plus its
 * `lib/clearingTerminal.ts` index is NOT reimplemented here. It is wrapped.
 *
 * WHAT IS WRAPPED, AND WHY IT IS NOT ORPHANED
 *   - `WaterfallVisualizer` — the seven-layer solver cascade.
 *   - `HopTelemetry`          — the SWIFT BIC correspondent chain for the
 *                               selected corridor, read straight off the
 *                               already-built registry rows.
 *   - `DashboardV3`           — the existing clearing terminal island: macro
 *                               telemetry, SHA cut histogram, retail spread
 *                               heatmap and the CSV-exportable registry.
 *
 * All three read the SAME `ClearingRegistryRow[]` the page already builds, so
 * the hop chain, the waterfall corridor list and the registry can never show
 * two different correspondents for one corridor.
 *
 * DISCLOSURE BEHAVIOUR
 * One collapsed Radix accordion, closed on first paint — a static export means
 * the forensic payload is present in the HTML from the start, so the point of
 * collapsing is to keep it out of the reader's way, not to defer a download.
 * The trigger is a real `<button>` inside a heading, so keyboard and screen
 * reader users get the disclosure semantics for free, and the chevron rotates
 * rather than cross-fading so there is a single moving element.
 *
 * `import type` from `@/lib/clearingTerminal` on purpose: that module pulls in
 * `data/fees.json` and the statutory bank directory, and this file only needs
 * the row *shape*. The value import of `DashboardV3` is deliberate and correct
 * — the registry is the point of this tier.
 */

export default function DiagnosticTier({
  index,
  corridors,
  platforms,
}: {
  index: ClearingTerminalIndex;
  corridors: DashboardCorridor[];
  platforms: DashboardPlatform[];
}) {
  const { t } = useLanguage();
  const rows = index.rows;
  const [corridorSlug, setCorridorSlug] = useState<string>(
    corridors[0]?.slug ?? ""
  );

  return (
    <div className="mt-8 w-full min-w-0">
      {/* Tier badge — the closed, forensic half of the page. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
          {t("dashboardTierDiagnostic")}
        </h2>
        <p className="text-xs text-black/45 dark:text-white/45">
          {t("dashboardTierDiagnosticHint")}
        </p>
      </div>

      <Accordion.Root
        type="single"
        collapsible
        className="mt-3 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md"
      >
        <Accordion.Item value="diagnostic">
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-150 ease-out hover:bg-black/[0.03] sm:px-5 dark:hover:bg-white/[0.04]">
              <span className="flex min-w-0 items-center gap-2.5">
                <TerminalIcon
                  size={18}
                  className="shrink-0 text-black/45 dark:text-white/45"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-black dark:text-white">
                    {t("dashboardTierDiagnostic")}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-black/45 dark:text-white/45">
                    {t("dashboardDiagnosticExpand")}
                  </span>
                </span>
              </span>
              <ChevronIcon
                size={18}
                className="shrink-0 text-black/40 dark:text-white/40"
              />
            </Accordion.Trigger>
          </Accordion.Header>

          <Accordion.Content className="border-t border-black/[0.06] px-4 pb-5 pt-5 dark:border-white/[0.08] sm:px-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <HopTelemetry
                rows={rows}
                corridorSlug={corridorSlug}
                onCorridorChange={setCorridorSlug}
              />
              <WaterfallVisualizer
                corridors={corridors}
                platforms={platforms}
              />
            </div>

            <div className="mt-5">
              <DashboardV3 index={index} />
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}

/**
 * SWIFT BIC intermediary hop telemetry for one corridor.
 *
 * Renders the correspondent chain as a genuine three-hop origin → correspondent
 * hub → beneficiary bank walk, with the domestic rail and the field 71A charge
 * code the wire should carry. Every identifier is printed as text; the connector
 * rail is decorative and `aria-hidden`, so the chain is fully available to a
 * screen reader as an ordered list.
 */
function HopTelemetry({
  rows,
  corridorSlug,
  onCorridorChange,
}: {
  rows: ClearingRegistryRow[];
  corridorSlug: string;
  onCorridorChange: (slug: string) => void;
}) {
  const { t } = useLanguage();
  const row = rows.find((item) => item.slug === corridorSlug) ?? rows[0];

  if (!row) return null;

  const hops = [
    {
      label: t("dashboardHopOrigin"),
      name: row.routePair,
      bic: row.from,
      city: row.country,
    },
    {
      label: t("dashboardHopCorrespondent"),
      name: row.correspondentName,
      bic: row.correspondentBic,
      city: row.correspondentCity,
    },
    {
      label: t("dashboardHopBeneficiary"),
      name: row.bankName,
      bic: row.beneficiaryBic,
      city: row.clearingCurrency,
    },
  ];

  return (
    <section
      aria-labelledby="hop-heading"
      className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors duration-200 sm:p-5 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id="hop-heading"
          className="text-sm font-bold tracking-tight text-black dark:text-white"
        >
          {t("dashboardHopTitle")}
        </h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-black/50 dark:text-white/50">
        {t("dashboardHopLead")}
      </p>

      <label className="mt-4 block">
        <span className="text-xs font-semibold text-black/70 dark:text-white/70">
          {t("dashboardWaterfallCorridor")}
        </span>
        <select
          value={row.slug}
          onChange={(event) => onCorridorChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
        >
          {rows.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.flag} {item.routePair} · {item.country}
            </option>
          ))}
        </select>
      </label>

      <ol className="mt-4 space-y-0">
        {hops.map((hop, index) => (
          <li key={hop.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
              />
              {index < hops.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="w-px flex-1 bg-black/10 dark:bg-white/12"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-black/45 dark:text-white/45">
                {hop.label}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-black dark:text-white">
                {hop.name}
              </p>
              <p className="font-mono text-xs tabular-nums tracking-tight text-black/50 dark:text-white/50">
                {hop.bic} · {hop.city}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <dl className="mt-1 grid grid-cols-2 gap-3 border-t border-black/[0.06] pt-4 text-xs dark:border-white/[0.08]">
        <div>
          <dt className="text-black/45 dark:text-white/45">
            {t("dashboardHopRail")}
          </dt>
          <dd className="mt-0.5 font-medium text-black/80 dark:text-white/80">
            {row.rail}
          </dd>
        </div>
        <div>
          <dt className="text-black/45 dark:text-white/45">
            {t("dashboardHopCharge")}
          </dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {row.chargeCode}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-black/45 dark:text-white/45">
        {row.chargeNote}
      </p>
    </section>
  );
}
