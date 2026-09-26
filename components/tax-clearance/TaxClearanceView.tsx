"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import type {
  ClearanceBank,
  ClearanceJurisdiction,
  ClearanceStats,
  ClearanceTier,
  ClearanceTrack,
} from "@/components/tax-clearance/payload";

/**
 * Track 4 — Statutory Purpose Code & Tax Clearance Hub (client island).
 *
 * WHY A CLIENT ISLAND
 * The page needs two pieces of state — which statutory track is open, and
 * nothing else. The FAQ blocks are native `<details>` elements rather than
 * another stateful list, so the collapsible content is keyboard-, screen-reader-
 * and no-JS-friendly, and the island ships one small piece of interactivity
 * instead of re-implementing a disclosure widget.
 *
 * BUNDLE DISCIPLINE
 * `import type` from the payload module only. The corridor dataset and the
 * statutory banking directory were resolved in the server shell, so nothing in
 * here touches `data/fees.json` or `data/regulatoryBanking.ts`.
 *
 * ACCESSIBILITY
 * The track rail is a real ARIA tablist: arrow keys, Home and End move between
 * tracks, the selected tab is `aria-selected` and every panel is labelled by its
 * tab. Each statute citation is a chip whose text is also present in the
 * authority line, so the colour treatment is never the only signal.
 */

function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate === 0) return "—";
  return rate >= 1000
    ? rate.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(Number(rate.toFixed(4)));
}

function formatPercent(rate: number): string {
  const percent = rate * 100;
  if (percent === 0) return "0%";
  return `${String(Number(percent.toFixed(percent < 1 ? 3 : 2)))}%`;
}

function formatLocalFee(fee: number, currency: string): string {
  if (fee === 0) return `Free local rail`;
  return `${fee.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

/* ------------------------------------------------------------------------ *
 * Small presentational pieces
 * ------------------------------------------------------------------------ */

function StatBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "emerald";
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        tone === "emerald"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-black/[0.04] text-black/60 dark:bg-white/[0.07] dark:text-white/60"
      }`}
    >
      {children}
    </span>
  );
}

function TierRow({ tier }: { tier: ClearanceTier }) {
  return (
    <li className="rounded-xl border border-black/[0.06] bg-black/[0.015] p-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-bold text-black dark:text-white">
          {tier.name}
        </p>
        <p
          className={`text-xs font-bold tabular-nums ${
            tier.rate === 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {tier.rate === 0 ? "Zero-rated" : `${formatPercent(tier.rate)} withholding`}
        </p>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-black/50 dark:text-white/50">
        {tier.authority}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-black/60 dark:text-white/60">
        {tier.note}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tier.exemption ? <StatBadge tone="emerald">Exemption tier</StatBadge> : null}
        {tier.purposeCode ? (
          <StatBadge>
            <code className="font-mono">{tier.purposeCode}</code>
          </StatBadge>
        ) : null}
      </div>
    </li>
  );
}

function BankRow({ bank }: { bank: ClearanceBank }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-black/[0.05] py-2 last:border-b-0 dark:border-white/[0.06]">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-black dark:text-white">
          {bank.name}
        </p>
        <p className="mt-0.5 font-mono text-[11px] tracking-tight text-black/50 dark:text-white/50">
          {bank.swiftCode}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-black/60 dark:text-white/60">
          {bank.clearance}
        </p>
        <p className="mt-0.5 text-[11px] tabular-nums text-black/45 dark:text-white/45">
          {formatLocalFee(bank.localFee, bank.localCurrency)}
        </p>
      </div>
    </li>
  );
}

function JurisdictionCard({
  jurisdiction,
}: {
  jurisdiction: ClearanceJurisdiction;
}) {
  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-white/[0.08] dark:bg-slate-900/50 dark:shadow-none">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold tracking-tight text-black dark:text-white">
          <span aria-hidden="true" className="mr-1.5">
            {jurisdiction.flag}
          </span>
          {jurisdiction.country}
        </h4>
        <StatBadge tone="emerald">{jurisdiction.regulator}</StatBadge>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <div>
          <dt className="text-black/45 dark:text-white/45">Corridor</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-black/80 dark:text-white/80">
            {jurisdiction.pair}
          </dd>
        </div>
        <div>
          <dt className="text-black/45 dark:text-white/45">
            Reference rate ({jurisdiction.currencyName})
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-black/80 dark:text-white/80">
            {formatRate(jurisdiction.rate)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-black/45 dark:text-white/45">Clearing network</dt>
          <dd className="mt-0.5 text-black/70 dark:text-white/70">
            {jurisdiction.clearingNetwork}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-black/45 dark:text-white/45">
            Governing authority
          </dt>
          <dd className="mt-0.5 leading-relaxed text-black/70 dark:text-white/70">
            {jurisdiction.authority}
          </dd>
        </div>
      </dl>

      {jurisdiction.citations.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {jurisdiction.citations.map((citation) => (
            <li key={citation}>
              <StatBadge>{citation}</StatBadge>
            </li>
          ))}
        </ul>
      ) : null}

      <h5 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
        Statutory tiers
      </h5>
      <ul className="mt-2 space-y-2">
        {jurisdiction.tiers.map((tier) => (
          <TierRow key={tier.name} tier={tier} />
        ))}
      </ul>

      <h5 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
        Receiving banks
      </h5>
      <ul className="mt-1">
        {jurisdiction.banks.map((bank) => (
          <BankRow key={bank.swiftCode} bank={bank} />
        ))}
      </ul>

      <Link
        href={`/calculator/${jurisdiction.corridorSlug}/`}
        className="mt-3 inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-emerald-700 transition-colors duration-200 hover:underline dark:text-emerald-400"
      >
        Price this corridor end to end
        <span aria-hidden="true" className="opacity-60">
          →
        </span>
      </Link>
    </article>
  );
}

export default function TaxClearanceView({
  tracks,
  stats,
}: {
  tracks: ClearanceTrack[];
  stats: ClearanceStats;
}) {
  const [activeId, setActiveId] = useState(tracks[0]?.id ?? "");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = Math.max(
    tracks.findIndex((track) => track.id === activeId),
    0
  );
  const active = tracks[activeIndex];

  /**
   * Roving-tabindex keyboard support. Arrow keys move and activate, matching the
   * automatic-activation pattern the WAI-ARIA authoring practices recommend for
   * a tablist that does not need lazy panel loading.
   */
  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const last = tracks.length - 1;
    let next = activeIndex;
    if (event.key === "ArrowRight") next = activeIndex === last ? 0 : activeIndex + 1;
    else if (event.key === "ArrowLeft") next = activeIndex === 0 ? last : activeIndex - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    const nextTrack = tracks[next];
    if (!nextTrack) return;
    setActiveId(nextTrack.id);
    tabRefs.current[next]?.focus();
  }

  if (!active) return null;

  return (
    <div className="w-full min-w-0">
      {/* ---------------------------------------------------------------- *
       * Track rail — the four statutory regimes.
       * ---------------------------------------------------------------- */}
      <div
        role="tablist"
        aria-label="Statutory clearance tracks"
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {tracks.map((track, index) => {
          const selected = track.id === active.id;
          return (
            <button
              key={track.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`clearance-tab-${track.id}`}
              aria-selected={selected}
              aria-controls={`clearance-panel-${track.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(track.id)}
              onKeyDown={onTabKeyDown}
              className={`group flex shrink-0 snap-start flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors duration-200 ease-out ${
                selected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-black/[0.06] bg-white text-black/60 hover:border-black/[0.12] hover:text-black dark:border-white/[0.08] dark:bg-slate-900/50 dark:text-white/60 dark:hover:border-white/[0.16] dark:hover:text-white"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                {track.region}
              </span>
              <span className="whitespace-nowrap text-sm font-bold tracking-tight">
                {track.eyebrow}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------------------- *
       * Active track
       * ---------------------------------------------------------------- */}
      <section
        role="tabpanel"
        id={`clearance-panel-${active.id}`}
        aria-labelledby={`clearance-tab-${active.id}`}
        tabIndex={0}
        className="mt-4 rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm shadow-slate-900/5 outline-none transition-colors duration-200 sm:p-6 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md"
      >
        <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">
          {active.title}
        </h2>
        <p className="mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          {active.summary}
        </p>
        <p className="mt-2">
          <StatBadge tone="emerald">{active.codeLabel}</StatBadge>
        </p>

        {/* Jurisdictions — one per statute, two for the LATAM track. */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {active.jurisdictions.map((jurisdiction) => (
            <JurisdictionCard
              key={jurisdiction.id}
              jurisdiction={jurisdiction}
            />
          ))}
        </div>

        {/* Clearance playbook */}
        <h3 className="mt-8 text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
          Clearance steps
        </h3>
        <ol className="mt-3 space-y-2.5">
          {active.steps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.015] p-3.5 dark:border-white/[0.07] dark:bg-white/[0.02]"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {step.title}
                  </p>
                  {step.meta ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
                      {step.meta}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-black/60 dark:text-white/60">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Documents and certificates */}
        <h3 className="mt-8 text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
          Certificates &amp; filings to hold
        </h3>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {active.documents.map((document) => (
            <li
              key={document.name}
              className="rounded-2xl border border-black/[0.06] bg-white p-3.5 dark:border-white/[0.07] dark:bg-slate-900/40"
            >
              <p className="text-xs font-bold text-black dark:text-white">
                {document.name}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {document.issuer}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-black/60 dark:text-white/60">
                {document.purpose}
              </p>
            </li>
          ))}
        </ul>

        {/* FAQ — native disclosure, so it works with no JS and a screen reader. */}
        <h3 className="mt-8 text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
          Frequently asked
        </h3>
        <div className="mt-3 divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-slate-900/40">
          {active.faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 text-left text-[13px] font-semibold text-black marker:content-none dark:text-white [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-black/40 transition-transform duration-200 ease-out group-open:rotate-45 dark:text-white/40"
                >
                  +
                </span>
              </summary>
              <p className="px-4 pb-3.5 text-[12px] leading-relaxed text-black/60 dark:text-white/60">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-black/45 dark:text-white/45">
          Figures resolved from the PayoutDelta dataset{" "}
          <span className="tabular-nums">
            {stats.revisedOn.slice(0, 10)}
          </span>{" "}
          · {stats.corridors} clearance corridors · {stats.tiers} statutory
          tiers · {stats.banks} receiving banks. Informational only — confirm
          every requirement with the regulator, your authorized dealer bank or a
          local accountant before filing.
        </p>
      </section>
    </div>
  );
}
