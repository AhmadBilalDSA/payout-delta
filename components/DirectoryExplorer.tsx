"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * PayoutDelta — free-for.dev style high-density directory explorer.
 *
 * Instant keystroke filtering over a compact, pre-resolved corridor index
 * (built server-side in `lib/directoryData.ts`). The sidebar pins on desktop
 * and collapses into a horizontal pill bar on mobile. Everything runs in the
 * browser from a ~131-row prop — zero extra network, zero client bundling of
 * the statutory or bank databases. Cmd/Control+K focuses the search.
 */

export interface DirectoryEntry {
  slug: string;
  from: string;
  to: string;
  flag: string;
  country: string;
  countryCode: string;
  currencyName: string;
  region: "americas" | "asia-pacific" | "europe" | "mea" | "other";
  dollarized: boolean;
  bankFeatured: boolean;
  feeTag: string;
  rail: string;
  bics: string[];
}

type CategoryId =
  | "all"
  | "americas"
  | "asia-pacific"
  | "europe"
  | "mea"
  | "dollarized"
  | "banks";

const CATEGORIES: readonly {
  id: CategoryId;
  label: string;
}[] = [
  { id: "all", label: "All Corridors" },
  { id: "americas", label: "Americas & LATAM" },
  { id: "asia-pacific", label: "Asia & Pacific" },
  { id: "europe", label: "Europe (Non-Euro)" },
  { id: "mea", label: "Middle East & Africa" },
  { id: "dollarized", label: "Dollarized Rails (0% FX Spread)" },
  { id: "banks", label: "Global Clearing Hubs & Banks" },
];

const SEND_BASES = ["All", "USD", "EUR", "GBP"] as const;

function matchesCategory(entry: DirectoryEntry, category: CategoryId): boolean {
  switch (category) {
    case "all":
      return true;
    case "dollarized":
      return entry.dollarized;
    case "banks":
      return entry.bankFeatured;
    default:
      return entry.region === category;
  }
}

export default function DirectoryExplorer({
  entries,
}: {
  entries: DirectoryEntry[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>("all");
  const [send, setSend] = useState<(typeof SEND_BASES)[number]>("All");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (
        event.key === "Escape" &&
        document.activeElement === inputRef.current
      ) {
        inputRef.current?.blur();
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!matchesCategory(entry, category)) return false;
      if (send !== "All" && entry.from !== send) return false;
      if (!needle) return true;
      return [
        entry.slug,
        entry.country,
        entry.countryCode,
        entry.currencyName,
        entry.to,
        entry.from,
        entry.rail,
        entry.feeTag,
        ...entry.bics,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [entries, query, category, send]);

  const categoryCounts = useMemo(() => {
    const count = (id: CategoryId) =>
      entries.filter(
        (entry) =>
          matchesCategory(entry, id) &&
          (send === "All" || entry.from === send),
      ).length;
    return CATEGORIES.map((item) => ({ id: item.id, count: count(item.id) }));
  }, [entries, send]);

  return (
    <section
      id="corridors"
      aria-labelledby="directory-heading"
      className="mt-14 scroll-mt-20"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2
            id="directory-heading"
            className="text-2xl font-bold text-slate-900 dark:text-white"
          >
            Corridor bank directory
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {entries.length} high-density rails, filtered live in your browser —
            country, currency, SWIFT BIC or clearing rail.
          </p>
        </div>
      </div>

      <div className="relative mt-5">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search country, currency, BIC or rail (e.g. PKR, CHASUS33, Raast, Colombia)…"
          aria-label="Search corridors by country, currency code, SWIFT BIC or clearing rail"
          className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-9 pr-20 text-sm text-slate-900 shadow-sm shadow-slate-900/5 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400/60"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 sm:block dark:border-slate-700/80 dark:bg-white/[0.04] dark:text-slate-500"
        >
          {typeof navigator !== "undefined" &&
          navigator.platform?.toLowerCase().includes("mac") ? (
            "⌘K"
          ) : (
            "Ctrl K"
          )}
        </kbd>
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-8">
        <nav
          aria-label="Filter corridors by category"
          className="flex gap-1.5 overflow-x-auto pb-2 lg:sticky lg:top-20 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {CATEGORIES.map((item) => {
            const count =
              categoryCounts.find((entry) => entry.id === item.id)?.count ?? 0;
            const active = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setCategory((current) =>
                    current === item.id ? "all" : item.id,
                  )
                }
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out lg:w-full lg:justify-between ${
                  active
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-slate-600"
                }`}
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                    active
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <div
            role="group"
            aria-label="Filter by sending currency"
            className="mt-1 flex shrink-0 items-center gap-1.5 lg:mt-6 lg:flex-col lg:items-stretch"
          >
            <p className="px-3 py-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase lg:px-0 dark:text-slate-500">
              Send base
            </p>
            {SEND_BASES.map((base) => (
              <button
                key={base}
                type="button"
                aria-pressed={send === base}
                onClick={() => setSend(base)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium uppercase tabular-nums transition-colors duration-150 ease-out ${
                  send === base
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-slate-200/90 bg-white text-slate-600 hover:border-emerald-400 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-emerald-500/50"
                }`}
              >
                {base === "All" ? "All bases" : `${base} Base`}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          <p
            role="status"
            aria-live="polite"
            className="mb-3 text-xs tabular-nums text-slate-500 dark:text-slate-400"
          >
            Showing <span className="font-semibold">{filtered.length}</span> of{" "}
            {entries.length} corridors
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No corridor matches{" "}
                {query ? (
                  <>
                    “<span className="font-semibold">{query}</span>”
                  </>
                ) : (
                  "those filters"
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                  setSend("All");
                }}
                className="mt-3 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-500/50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-emerald-400"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/calculator/${entry.slug}`}
                  aria-label={`Benchmark wire deductions for ${entry.from} to ${entry.to} (${entry.country})`}
                  className="group flex w-full min-w-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors hover:border-emerald-500 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md dark:hover:border-emerald-400/60"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm dark:bg-white/10"
                      >
                        {entry.flag}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                            {entry.to}
                          </span>
                          <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {entry.country}
                          </span>
                        </span>
                        <span className="block truncate text-[11px] text-slate-500 dark:text-slate-500">
                          {entry.currencyName}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {entry.from} → {entry.to}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-rose-50 px-2 py-1 font-mono text-[11px] font-semibold tabular-nums text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                      {entry.feeTag}
                    </span>
                    <span
                      title={entry.bics.join(" · ")}
                      className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                    >
                      {entry.rail}
                    </span>
                    {entry.dollarized && (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        0% FX
                      </span>
                    )}
                  </div>

                  <p className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Benchmark Wire
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                    >
                      ↗
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}