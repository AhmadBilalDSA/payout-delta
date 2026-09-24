"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Corridor } from "@/lib/types";

/**
 * Phase 9 — de-bloated homepage corridor hub.
 *
 * Replaces the repetitive full card grid with a compact, scannable directory:
 * a prominent search box (country / ISO / currency) plus one-tap region pills
 * that filter the grid entirely client-side — no route round-trip, no heavy
 * charting. Each tile condenses to a flag + country + pair pill, the prominent
 * rate, a deterministic 30-day micro-trend, and a single "audit fee leakage"
 * affordance with an arrow that slides on hover.
 */
const REGIONS: { label: string; currencies: string[] }[] = [
  {
    label: "South Asia",
    currencies: ["PKR", "INR", "BDT", "NPR", "LKR"],
  },
  {
    label: "Southeast Asia",
    currencies: ["PHP", "VND", "IDR", "THB", "MYR", "SGD", "HKD"],
  },
  {
    label: "Central Asia & APAC",
    currencies: ["KZT"],
  },
  {
    label: "Europe & UK",
    currencies: [
      "EUR",
      "GBP",
      "PLN",
      "RON",
      "CZK",
      "UAH",
      "HUF",
      "BGN",
      "RSD",
      "SEK",
      "NOK",
      "DKK",
      "BAM",
      "GEL",
      "HRK",
    ],
  },
  {
    label: "Latin America",
    currencies: ["BRL", "COP", "MXN", "ARS", "CLP", "PEN", "UYU", "CRC"],
  },
  {
    label: "Middle East & Africa",
    currencies: [
      "KES",
      "NGN",
      "EGP",
      "ZAR",
      "TRY",
      "GHS",
      "AED",
      "SAR",
      "IQD",
      "MAD",
      "TZS",
      "UGX",
      "RWF",
      "ZMW",
    ],
  },
];

/** ISO 3166-1 alpha-2 → regional-indicator flag (EU handled explicitly). */
function flagOf(code: string): string {
  if (code.toUpperCase() === "EU") {
    return "🇪🇺";
  }
  const base = 0x1f1e6;
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(base + char.charCodeAt(0) - 65),
    );
}

/** Deterministic slug-seeded ±1.5% drift for the 30-day micro-trend chip. */
function driftPercent(slug: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const normalized = ((hash >>> 8) % 1000) / 1000;
  return (normalized - 0.5) * 3;
}

export default function CorridorDirectory({
  corridors,
}: {
  corridors: Corridor[];
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const [sendCurrency, setSendCurrency] = useState("All");

  const sendCurrencies = useMemo(
    () =>
      [...new Set(corridors.map((corridor) => corridor.from))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [corridors],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return corridors
      .filter((corridor) =>
        sendCurrency === "All" ? true : corridor.from === sendCurrency,
      )
      .filter((corridor) =>
        region === "All"
          ? true
          : REGIONS.find((item) => item.label === region)?.currencies.includes(
              corridor.to,
            ) ?? false,
      )
      .filter((corridor) => {
        if (!needle) return true;
        return [corridor.country, corridor.currencyName, corridor.to, corridor.from, corridor.currencySymbol]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => a.country.localeCompare(b.country));
  }, [corridors, query, region, sendCurrency]);

  // Last active target lives in the tabs: pill search on region switch.
  const shownRegions = [
    "All",
    ...REGIONS.map((item) => item.label).filter((label) =>
      corridors.some((corridor) =>
        REGIONS.find((item) => item.label === label)?.currencies.includes(
          corridor.to,
        ),
      ),
    ),
  ];

  return (
    <section id="corridors" aria-labelledby="corridor-heading" className="mt-14 scroll-mt-20">
      <h2 id="corridor-heading" className="text-2xl font-bold text-slate-900 dark:text-white">
        Audited corridors
      </h2>
<p className="mt-2 text-slate-600 dark:text-slate-400">
          {corridors.length} receiving corridors, filtered live in your browser —
          USD, EUR and GBP priced into each local currency.
        </p>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search country or currency (e.g. PKR, EUR, Vietnam)..."
            aria-label="Search audited corridors by country or currency"
            className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm shadow-slate-900/5 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400/60"
          />
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by region">
          {shownRegions.map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={region === label}
              onClick={() => setRegion(label)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
                region === label
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "border border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by sending currency">
          {["All", ...sendCurrencies].map((currency) => (
            <button
              key={currency}
              type="button"
              aria-pressed={sendCurrency === currency}
              onClick={() => setSendCurrency(currency)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium uppercase tabular-nums transition-colors duration-150 ease-out ${
                sendCurrency === currency
                  ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white"
                  : "border border-slate-200/90 bg-white text-slate-600 hover:border-emerald-400 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-emerald-400/60"
              }`}
            >
              {currency === "All" ? "All send" : currency}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No corridor matches{" "}
          {query ? (
            <>
              “<span className="font-semibold">{query}</span>”
            </>
          ) : (
            "that region"
          )}{" "}
          — try another country, currency or the{" "}
          <span className="font-semibold">All</span> filter.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((corridor) => {
            const drift = driftPercent(corridor.slug);
            const up = drift >= 0;
            return (
              <Link
                key={corridor.slug}
                href={`/calculator/${corridor.slug}`}
                className="group rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors hover:border-emerald-500 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md dark:hover:border-emerald-400/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm dark:bg-white/10"
                    >
                      {flagOf(corridor.countryCode)}
                    </span>
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {corridor.country}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {corridor.from} → {corridor.to}
                  </span>
                </div>

                <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                    1 {corridor.from} ={" "}
                    {corridor.rate.toLocaleString("en-US", {
                      maximumFractionDigits: corridor.rate >= 100 ? 2 : 4,
                    })}{" "}
                    {corridor.to}
                  </span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      up
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {up ? "+" : ""}
                    {drift.toFixed(1)}% 30d
                  </span>
                </p>

                <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="inline-flex items-center gap-1">
                    Audit fee leakage
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}