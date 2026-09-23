"use client";

import { useMemo, useState } from "react";

import SwiftRouteInspector from "@/components/compliance/SwiftRouteInspector";
import {
  clearingCurrencyFor,
  countDistinctCountries,
  searchSwiftBanks,
  type SwiftBankEntry,
} from "@/lib/swiftRoutingEngine";

/**
 * Phase D — SWIFT Auditor terminal (client island for `/swift-auditor`).
 *
 * A searchable, deterministic terminal over the full 50-country bank
 * directory: type to filter by bank / BIC / country / currency / rail, drill a
 * clearing leg (USD / EUR / GBP) and click any bank to inspect its complete
 * correspondent network, clearing speed and fee profile inline. Pure static
 * client-side — `entries` is the precomputed build-time index.
 */
export default function SwiftAuditorTerminal({
  entries,
}: {
  entries: SwiftBankEntry[];
}) {
  const [query, setQuery] = useState("");
  const [clearing, setClearing] = useState<"ALL" | "USD" | "EUR" | "GBP">(
    "ALL"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const searched = searchSwiftBanks(query, entries);
    if (clearing === "ALL") return searched;
    return searched.filter(
      (entry) => clearingCurrencyFor(entry.currency) === clearing
    );
  }, [entries, query, clearing]);

  const corridorCount = useMemo(
    () => new Set(entries.map((entry) => entry.slug)).size,
    [entries]
  );
  const countries = useMemo(
    () => countDistinctCountries(entries),
    [entries]
  );

  const selected =
    filtered.find((entry) => entry.id === selectedId) ?? filtered[0];

  return (
    <div className="w-full min-w-0">
      {/* Terminal stats strip. */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Banks indexed" value={String(entries.length)} />
        <StatCard label="Countries covered" value={String(countries)} />
        <StatCard label="Corridors mapped" value={String(corridorCount)} />
        <StatCard
          label="Correspondent nodes"
          value="8 BIC"
          hint="USD · EUR · GBP clearing"
        />
      </dl>

      {/* Search + clearing-leg filters. */}
      <div className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md">
        <label className="block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            Search any bank across the 50-country directory
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Bank name, SWIFT / BIC (e.g. MZNBPKKA), country, currency or rail…"
            aria-label="Search SWIFT banks"
            className="mt-2 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
            Clearing leg
          </span>
          {(["ALL", "USD", "EUR", "GBP"] as const).map((leg) => (
            <button
              key={leg}
              type="button"
              onClick={() => setClearing(leg)}
              aria-pressed={clearing === leg}
              className={`rounded-full px-3 py-1 font-mono text-xs font-semibold transition-all duration-150 ease-out ${
                clearing === leg
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-black/55 hover:bg-black/[0.05] dark:text-white/55 dark:hover:bg-white/[0.07]"
              }`}
            >
              {leg === "ALL" ? "ALL" : `${leg} corpus`}
            </button>
          ))}
          <span className="ml-auto text-[11px] tabular-nums text-black/[0.45] dark:text-white/[0.45]">
            {filtered.length.toLocaleString("en-US")} of{" "}
            {entries.length.toLocaleString("en-US")} banks
          </span>
        </div>
      </div>

      <div className="mt-5 grid w-full min-w-0 items-start gap-6 lg:grid-cols-12">
        {/* Results rail. */}
        <div className="w-full min-w-0 lg:col-span-5">
          <ul className="flex max-h-[620px] w-full min-w-0 flex-col gap-2 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <li className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-center text-xs text-slate-400">
                No bank matches “{query}” — try a SWIFT code, bank name or
                country.
              </li>
            )}
            {filtered.map((entry) => (
              <li key={entry.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  aria-pressed={selected?.id === entry.id}
                  className={`w-full rounded-2xl border p-3 text-left transition-all duration-150 ease-out ${
                    selected?.id === entry.id
                      ? "border-emerald-500/40 bg-emerald-500/[0.06] shadow-sm"
                      : "border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-black dark:text-white">
                      {entry.displayName}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-black/[0.45] dark:text-white/[0.45]">
                      {entry.corridorLabel}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-black/60 dark:bg-neutral-800 dark:text-white/60">
                      {entry.swiftCode !== "—"
                        ? entry.swiftCode
                        : "direct correspondent"}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-black/60 dark:bg-neutral-800 dark:text-white/60">
                      {entry.country}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono tabular-nums text-black/60 dark:bg-neutral-800 dark:text-white/60">
                      ${entry.intermediaryUSD} cut
                    </span>
                    <span className="hidden rounded-full bg-neutral-100 px-2 py-0.5 text-black/60 dark:bg-neutral-800 dark:text-white/60 sm:inline-flex">
                      {entry.rail}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Inspector rail. */}
        <div className="w-full min-w-0 lg:col-span-7">
          {selected ? (
            <SwiftRouteInspector
              corridorSlug={selected.slug}
              bankId={selected.bankId}
              targetCurrency={selected.currency}
              senderLabel="Upwork / Fiverr / Direct Client Wire"
            />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-xs text-slate-400">
              Select a bank to inspect its correspondent network.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md">
      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-black dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-black/[0.45] dark:text-white/45">
          {hint}
        </p>
      )}
    </div>
  );
}