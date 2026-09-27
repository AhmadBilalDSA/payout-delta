"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import type {
  ClearanceDocument,
  ClearanceFaq,
  ClearanceStep,
  StatutoryProfile,
  StatuteWizardStats,
} from "@/components/tax-clearance/payload";

/**
 * Phase 3 — the interactive statutory tax clearance wizard.
 *
 * WHAT THIS REPLACES
 * The wizard subsumes the four hardcoded track tabs. Coverage is no longer the
 * five markets somebody thought to write about: it is every sovereign state in
 * `data/jurisdictions.json`, joined to its rail in `data/rails.json` and to the
 * verified institutions in `data/banksRegistry.json`. The authored playbooks
 * survive as a deep-dive layer attached to the five markets where the
 * documentary step is genuinely hard (ePRC, FIRC, BIR 2307, Contrato de Câmbio,
 * Declaración de Cambio).
 *
 * WHY THE STATE IS SO SMALL
 * Two values: the query and the selected ISO code. The roster is a flat array
 * of plain records passed once from the server shell, so filtering is a `filter`
 * over ~195 strings — no indexing pass, no worker, no fetch.
 *
 * ACCESSIBILITY
 * The roster is a real ARIA listbox: arrow keys / Home / End move the selection
 * (automatic activation, so the panel follows the cursor), and the visible
 * purpose-code copy button announces its result through a polite live region.
 * Every differential figure is printed as text next to its colour, so the badge
 * treatment is never the only signal.
 */

type Facet = "all" | "withholding" | "treaty" | "instant" | "banked";

const FACETS: { id: Facet; label: string }[] = [
  { id: "all", label: "All states" },
  { id: "withholding", label: "Statutory withholding" },
  { id: "treaty", label: "Treaty relief" },
  { id: "instant", label: "Instant rail" },
  { id: "banked", label: "Registry banks" },
];

function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate === 0) return "—";
  return rate >= 1000
    ? rate.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(Number(rate.toFixed(4)));
}

function formatPct(value: number): string {
  if (value === 0) return "0%";
  return `${String(Number(value.toFixed(2)))}%`;
}

function formatBand(value: number): string {
  return `${formatPct(value)} on the gross remittance`;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatTransit(hours: number): string {
  if (hours <= 0) return "not published";
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/* ------------------------------------------------------------------------ *
 * Copy-to-clipboard — one-click purpose-code copy.
 *
 * `navigator.clipboard` is unavailable on insecure origins and inside some
 * static-export previews, so the legacy selection path stays as the fallback
 * rather than leaving the button dead. Both paths are announced through the
 * `copied` flag rendered in a polite live region.
 * ------------------------------------------------------------------------ */

function useClipboard(): [string, (value: string, key: string) => void] {
  const [copied, setCopied] = useState("");

  function copy(value: string, key: string) {
    const announce = () => {
      setCopied(key);
      window.setTimeout(() => setCopied(""), 2000);
    };
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(announce, () => {
        legacyCopy(value);
        announce();
      });
      return;
    }
    legacyCopy(value);
    announce();
  }

  return [copied, copy];
}

function legacyCopy(value: string) {
  if (typeof document === "undefined") return;
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand("copy");
  } catch {
    /* Selection is still live; the reader can copy manually. */
  }
  document.body.removeChild(area);
}

/* ------------------------------------------------------------------------ *
 * Presentational pieces
 * ------------------------------------------------------------------------ */

function Chip({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "emerald" | "amber" | "slate";
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral:
      "bg-black/[0.04] text-black/60 dark:bg-white/[0.07] dark:text-white/60",
    emerald:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400",
    amber:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400",
    slate:
      "bg-slate-500/10 text-slate-700 dark:bg-slate-300",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
      {children}
    </h4>
  );
}

function RosterRow({
  profile,
  selected,
  index,
  onSelect,
  onKeyDown,
  registerRef,
}: {
  profile: StatutoryProfile;
  selected: boolean;
  index: number;
  onSelect: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  registerRef: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <li role="presentation">
      <button
        ref={registerRef}
        type="button"
        role="option"
        id={`wizard-option-${profile.iso2}`}
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        onClick={onSelect}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors duration-150 ${
          selected
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-transparent hover:border-black/[0.07] hover:bg-black/[0.02] dark:hover:border-white/[0.09] dark:hover:bg-white/[0.03]"
        }`}
      >
        <span aria-hidden="true" className="shrink-0 text-base leading-none">
          {profile.flag}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-black dark:text-white">
            {profile.name}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[10px] text-black/45 dark:text-white/45">
            {profile.iso2} · {profile.currency} · {profile.rail.id}
          </span>
        </span>
        <span
          className={`shrink-0 text-[11px] font-bold tabular-nums ${
            profile.baselineWhtPct > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatPct(profile.baselineWhtPct)}
        </span>
        <span className="sr-only">
          {profile.baselineWhtPct > 0
            ? `statutory withholding ${formatPct(profile.baselineWhtPct)}`
            : "no statutory withholding"}
          {`, option ${index + 1}`}
        </span>
      </button>
    </li>
  );
}

function StepList({ steps }: { steps: ClearanceStep[] }) {
  return (
    <ol className="mt-2 space-y-2">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex gap-2.5 rounded-xl border border-black/[0.06] bg-black/[0.015] p-3 dark:border-white/[0.07] dark:bg-white/[0.02]"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400"
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-[13px] font-semibold text-black dark:text-white">
                {step.title}
              </p>
              {step.meta ? (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
                  {step.meta}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-black/60 dark:text-white/60">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DocumentCards({ documents }: { documents: ClearanceDocument[] }) {
  return (
    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
      {documents.map((document) => (
        <li
          key={document.name}
          className="rounded-xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.07] dark:bg-slate-900/40"
        >
          <p className="text-[12px] font-bold text-black dark:text-white">
            {document.name}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {document.issuer}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-black/60 dark:text-white/60">
            {document.purpose}
          </p>
        </li>
      ))}
    </ul>
  );
}

function FaqList({ faqs }: { faqs: ClearanceFaq[] }) {
  return (
    <div className="mt-2 divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.06] bg-white dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-slate-900/40">
      {faqs.map((faq) => (
        <details key={faq.question} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3.5 py-2.5 text-left text-[12px] font-semibold text-black marker:content-none dark:text-white [&::-webkit-details-marker]:hidden">
            {faq.question}
            <span
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-black/40 transition-transform duration-200 ease-out group-open:rotate-45 dark:text-white/40"
            >
              +
            </span>
          </summary>
          <p className="px-3.5 pb-3 text-[11px] leading-relaxed text-black/60 dark:text-white/60">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

export default function StatutoryTaxWizard({
  profiles,
  stats,
}: {
  profiles: StatutoryProfile[];
  stats: StatuteWizardStats;
}) {
  const [query, setQuery] = useState("");
  const [facet, setFacet] = useState<Facet>("all");
  const [activeIso, setActiveIso] = useState(profiles[0]?.iso2 ?? "");
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [copied, copy] = useClipboard();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (
        facet === "withholding" &&
        profile.baselineWhtPct <= 0
      ) {
        return false;
      }
      if (facet === "treaty" && !profile.treatyDifferential) return false;
      if (facet === "instant" && !profile.rail.instant) return false;
      if (facet === "banked" && profile.banks.length === 0) return false;
      if (!needle) return true;
      return [
        profile.name,
        profile.iso2,
        profile.currency,
        profile.centralBank,
        profile.rail.id,
        profile.rail.operator,
        profile.purposeCode,
        profile.shortAct,
        ...profile.banks.map((bank) => `${bank.bic} ${bank.name}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [profiles, query, facet]);

  const active = profiles.find((profile) => profile.iso2 === activeIso) ?? profiles[0];
  const activeIndex = Math.max(
    filtered.findIndex((profile) => profile.iso2 === active?.iso2),
    0
  );
  /**
   * Automatic-activation keyboard support for the listbox roster.
   *
   * The full filtered roster is rendered — the panel scrolls, so a 195-row
   * list is the same interaction cost as a 5-row one and a truncated roster
   * would make the tail of the alphabet unreachable by keyboard. `rowRefs` is
   * indexed against `filtered`, so `next` is both the array index and the row
   * identity here; the focused row is scrolled into view because the container
   * is the scroll parent.
   */
  function onRowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const last = filtered.length - 1;
    let next = activeIndex;
    if (event.key === "ArrowDown") next = activeIndex >= last ? 0 : activeIndex + 1;
    else if (event.key === "ArrowUp") next = activeIndex <= 0 ? last : activeIndex - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    const target = filtered[next];
    if (!target) return;
    setActiveIso(target.iso2);
    const node = rowRefs.current[next];
    node?.focus();
    node?.scrollIntoView({ block: "nearest" });
  }

  if (!active) return null;

  return (
    <div className="w-full min-w-0">
      {/* ---------------------------------------------------------------- *
       * Corpus strip
       * ---------------------------------------------------------------- */}
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Sovereign states", value: stats.jurisdictions },
          { label: "Clearing rails", value: stats.rails },
          { label: "Verified BICs", value: stats.banks },
          { label: "Withholding markets", value: stats.withholdingMarkets },
          { label: "Treaty relief", value: stats.treatyReliefMarkets },
          { label: "Instant rails", value: stats.instantMarkets },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/[0.06] bg-white px-3.5 py-3 dark:border-white/[0.08] dark:bg-slate-900/60"
          >
            <dt className="text-[10px] font-medium uppercase tracking-wider text-black/45 dark:text-white/45">
              {stat.label}
            </dt>
            <dd className="mt-1 text-xl font-bold tabular-nums tracking-tight text-black dark:text-white">
              {stat.value.toLocaleString("en-US")}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* -------------------------------------------------------------- *
         * Country selector — all 195 sovereign states
         * -------------------------------------------------------------- */}
        <section
          aria-label="Select a country"
          className="w-full min-w-0 rounded-3xl border border-black/[0.06] bg-white p-4 shadow-sm shadow-slate-900/5 lg:sticky lg:top-20 lg:self-start dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md"
        >
          <label
            htmlFor="wizard-search"
            className="text-[11px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50"
          >
            Country selector
          </label>
          <div className="relative mt-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
            <input
              id="wizard-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 195 states — name, ISO code, rail, BIC…"
              autoComplete="off"
              className="w-full rounded-xl border border-black/[0.08] bg-white py-2 pr-3 pl-9 text-[13px] text-black placeholder:text-black/35 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/[0.1] dark:bg-black/25 dark:text-white dark:placeholder:text-white/35"
            />
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {FACETS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFacet(option.id)}
                aria-pressed={facet === option.id}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 ${
                  facet === option.id
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-black/[0.07] text-black/55 hover:border-black/[0.14] hover:text-black dark:border-white/[0.1] dark:text-white/55 dark:hover:border-white/[0.2] dark:hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="mt-2.5 text-[11px] tabular-nums text-black/45 dark:text-white/45" aria-live="polite">
            {filtered.length} of {profiles.length} states
          </p>

          <ul
            role="listbox"
            aria-label="Sovereign states"
            aria-activedescendant={`wizard-option-${active.iso2}`}
            className="mt-2 max-h-[26rem] space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]"
          >
            {filtered.map((profile, index) => (
              <RosterRow
                key={profile.iso2}
                profile={profile}
                index={index}
                selected={profile.iso2 === active.iso2}
                onSelect={() => setActiveIso(profile.iso2)}
                onKeyDown={onRowKeyDown}
                registerRef={(node) => {
                  rowRefs.current[index] = node;
                }}
              />
            ))}
            {filtered.length === 0 ? (
              <li className="px-2.5 py-6 text-center text-[12px] text-black/45 dark:text-white/45">
                No state matches this filter.
              </li>
            ) : null}
          </ul>
        </section>

        {/* -------------------------------------------------------------- *
         * Statutory profile
         * -------------------------------------------------------------- */}
        <article className="w-full min-w-0 rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6 dark:border-white/[0.08] dark:bg-slate-900/60 dark:shadow-md">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-black dark:text-white">
                <span aria-hidden="true">{active.flag}</span>
                {active.name}
              </h2>
              <p className="mt-1 text-[12px] text-black/55 dark:text-white/55">
                {active.centralBank} ·{" "}
                <span className="font-mono uppercase">{active.currency}</span> ·{" "}
                <span className="font-mono">{active.iso2}</span>
              </p>
            </div>
            {active.playbook ? (
              <Chip tone="emerald">{active.playbook.eyebrow}</Chip>
            ) : null}
          </header>

          {/* Enactment + amendment badge */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip tone="slate" title={active.statutoryAct}>
              {active.shortAct} {active.enactmentYear} · Amended{" "}
              {active.lastAmendedYear}
            </Chip>
            <Chip tone="neutral" title={active.rail.operator}>
              {active.rail.id} · {active.rail.protocol}
            </Chip>
            {active.rail.instant ? <Chip tone="emerald">Instant credit</Chip> : null}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-black/60 dark:text-white/60">
            {active.statutoryAct}
          </p>

          {/* Purpose code + one-click copy */}
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-black/[0.06] bg-black/[0.015] p-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                Purpose code
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold tracking-tight text-black dark:text-white">
                {active.shortCode}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-black/55 dark:text-white/55">
                {active.purposeCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copy(active.shortCode, active.iso2)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold whitespace-nowrap text-emerald-700 transition-colors duration-150 hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h6A1.5 1.5 0 0 1 16 3.5v8a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 7 11.5v-8Zm-2 2A1.5 1.5 0 0 0 3.5 7v8A1.5 1.5 0 0 0 5 16.5h6a1.5 1.5 0 0 0 1.5-1.5v-1.1A1.5 1.5 0 0 1 11 12H5.5a.5.5 0 0 1-.5-.5V5.5Z" />
              </svg>
              Copy code
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {copied === active.iso2
                ? `${active.shortCode} copied to the clipboard`
                : ""}
            </span>
          </div>

          {/* Baseline vs treaty differential */}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.07] dark:bg-slate-900/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                Baseline band
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-black dark:text-white">
                {formatPct(active.baselineWhtPct)}
              </p>
              <p className="mt-0.5 text-[11px] text-black/50 dark:text-white/50">
                {formatBand(active.baselineWhtPct)} absent relief
              </p>
            </div>
            <div className="rounded-2xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.07] dark:bg-slate-900/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                Treaty band
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatPct(active.treatyWhtPct)}
              </p>
              <p className="mt-0.5 text-[11px] text-black/50 dark:text-white/50">
                once relief is evidenced
              </p>
            </div>
            <div
              className={`rounded-2xl border p-3 ${
                active.treatyDifferential
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-slate-900/40"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/45 dark:text-white/45">
                Differential
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-black dark:text-white">
                {active.treatyDifferential
                  ? `−${String(
                      Number((active.baselineWhtPct - active.treatyWhtPct).toFixed(2))
                    )} pts`
                  : "none"}
              </p>
              <p className="mt-0.5 text-[11px] text-black/50 dark:text-white/50">
                {active.treatyDifferential
                  ? "on $1,000 of gross fees"
                  : "no reduction published"}
              </p>
            </div>
          </div>

          {/* Safe-harbour audit defence */}
          <div className="mt-5">
            <SectionLabel>Safe-harbour audit defence</SectionLabel>
            {active.playbook ? <StepList steps={active.playbook.steps} /> : null}
            <ul className="mt-2 space-y-1.5">
              {active.safeHarborRules.map((rule) => (
                <li
                  key={rule}
                  className="flex gap-2 rounded-xl border border-black/[0.06] bg-black/[0.015] px-3 py-2 text-[12px] leading-relaxed text-black/65 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-white/65"
                >
                  <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
            {active.exemptionConditions.length > 0 ? (
              <>
                <p className="mt-3 text-[11px] leading-relaxed text-black/50 dark:text-white/50">
                  Relief is evidenced when:
                </p>
                <ul className="mt-1.5 space-y-1">
                  {active.exemptionConditions.map((condition) => (
                    <li
                      key={condition}
                      className="text-[12px] leading-relaxed text-black/60 dark:text-white/60"
                    >
                      · {condition}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {/* Mandatory audit realization certificate */}
          <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Mandatory audit realization certificate
            </p>
            <p className="mt-1 text-[13px] font-semibold text-black dark:text-white">
              {active.mandatoryAuditCert}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-black/55 dark:text-white/55">
              Exposure if it is missing: {active.nonComplianceRisk}
            </p>
            {active.playbook ? (
              <div className="mt-3">
                <DocumentCards documents={active.playbook.documents} />
              </div>
            ) : null}
          </div>

          {/* Connected domestic rail */}
          <div className="mt-5">
            <SectionLabel>Connected domestic rail</SectionLabel>
            <div className="mt-2 rounded-2xl border border-black/[0.06] bg-white p-3.5 dark:border-white/[0.07] dark:bg-slate-900/40">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-sm font-bold tracking-tight text-black dark:text-white">
                  {active.rail.id}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone="slate">{active.rail.protocol}</Chip>
                  {active.rail.instant ? (
                    <Chip tone="emerald">Instant</Chip>
                  ) : (
                    <Chip>Value-dated</Chip>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[12px] text-black/65 dark:text-white/65">
                {active.rail.operator}
              </p>
              <p className="mt-0.5 text-[11px] text-black/50 dark:text-white/50">
                Finality: {active.rail.finalityWindow}
              </p>
              {active.corridor ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.07]">
                  <p className="text-[12px] text-black/65 dark:text-white/65">
                    Priced corridor{" "}
                    <span className="font-mono font-semibold text-black dark:text-white">
                      {active.corridor.pair}
                    </span>{" "}
                    at{" "}
                    <span className="font-mono tabular-nums">
                      {formatRate(active.corridor.rate)}
                    </span>{" "}
                    per {active.currency}
                  </p>
                  <Link
                    href={`/calculator/${active.corridor.slug}/`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:underline dark:text-emerald-400"
                  >
                    Price the deduction
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          {/* Verified institutions in the market */}
          <div className="mt-5">
            <SectionLabel>
              {active.banks.length > 0
                ? `Verified institutions in ${active.name} (${active.banks.length})`
                : "Verified institutions in this market"}
            </SectionLabel>
            {active.banks.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-black/[0.1] px-3 py-3 text-[12px] leading-relaxed text-black/50 dark:border-white/[0.12] dark:text-white/50">
                No rail-local head is published for this market in the bank
                registry. The credit still clears on {active.rail.id}; confirm the
                receiving institution with the bank before invoicing.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {active.banks.map((bank) => (
                  <li key={bank.bic}>
                    <Link
                      href={`/banks/${bank.slug}/`}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-xl border border-black/[0.06] bg-white px-3 py-2 transition-colors duration-150 hover:border-emerald-500/40 dark:border-white/[0.07] dark:bg-slate-900/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold text-black dark:text-white">
                          {bank.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-black/50 dark:text-white/50">
                          {bank.bic} · {bank.charges.join("/")} ·{" "}
                          {formatTransit(bank.transitHours)} transit
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums text-black/55 dark:text-white/55">
                        {formatUsd(bank.cutUSD)} cut
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Market FAQ — authored for the deep-dive markets only */}
          {active.playbook && active.playbook.faqs.length > 0 ? (
            <div className="mt-5">
              <SectionLabel>Frequently asked — {active.name}</SectionLabel>
              <FaqList faqs={active.playbook.faqs} />
            </div>
          ) : null}

          <p className="mt-6 text-[11px] leading-relaxed text-black/45 dark:text-white/45">
            Resolved from the PayoutDelta statutory registry{" "}
            <span className="tabular-nums">{stats.revisedOn.slice(0, 10)}</span> ·
            {stats.jurisdictions} sovereign states · {stats.banks} verified BICs ·
            {active.rail.operator}. Informational only — confirm every
            requirement with the regulator, your authorized dealer bank or a
            local accountant before filing.
          </p>
        </article>
      </div>
    </div>
  );
}
