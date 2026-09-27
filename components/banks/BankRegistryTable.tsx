"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { BankProfile } from "@/lib/registryData";

/**
 * Phase 3 — the verified institution registry table.
 *
 * 266 rows is past the point where a card grid is readable, so this is a real
 * table: one line per head, sticky column headers, and a monospaced BIC column
 * so a fragment can be scanned vertically. The three filters are the three
 * questions a payment desk actually asks — which country, on which rail, and
 * what is the head — and the search spans all of them plus the correspondent
 * anchor.
 *
 * The rows are passed flat from the server shell. Nothing here imports the JSON
 * registries, so the island ships no registry.
 */

function formatBic(bic: string): string {
  return `${bic.slice(0, 4)} ${bic.slice(4, 6)} ${bic.slice(6)}`;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatTransit(hours: number): string {
  if (hours <= 0) return "—";
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function ChargeCodes({ charges }: { charges: readonly string[] }) {
  if (charges.length === 0) {
    return <span className="text-black/35 dark:text-white/35">—</span>;
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {charges.map((code) => (
        <span
          key={code}
          className="rounded border border-slate-200 px-1 py-px font-mono text-[10px] font-semibold text-slate-600 dark:border-white/[0.1] dark:text-slate-300"
        >
          {code}
        </span>
      ))}
    </span>
  );
}

export default function BankRegistryTable({
  profiles,
}: {
  profiles: readonly BankProfile[];
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");
  const [rail, setRail] = useState("all");

  const countries = useMemo(() => {
    const seen = new Map<string, string>();
    for (const profile of profiles) {
      seen.set(profile.countryIso2, profile.countryName);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [profiles]);

  const rails = useMemo(() => {
    const seen = new Map<string, string>();
    for (const profile of profiles) {
      seen.set(profile.railId, profile.rail?.operator ?? profile.railId);
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [profiles]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (country !== "all" && profile.countryIso2 !== country) return false;
      if (rail !== "all" && profile.railId !== rail) return false;
      if (!needle) return true;
      return [
        profile.name,
        profile.shortName,
        profile.bic,
        profile.countryName,
        profile.countryIso2,
        profile.railId,
        profile.rail?.operator ?? "",
        profile.usdGsibCorrespondent,
        profile.usdGsibCorrespondentName,
        profile.role,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [profiles, query, country, rail]);

  const selectClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/[0.1] dark:bg-black/25 dark:text-white";

  return (
    <div className="w-full min-w-0">
      {/* ------------------------------------------------------------------ *
       * Filters — country, clearing rail and free text.
       * ------------------------------------------------------------------ */}
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)_minmax(0,240px)]">
        <div className="relative">
          <label htmlFor="registry-search" className="sr-only">
            Search the verified bank registry
          </label>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            id="registry-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search institution, BIC, country, rail or correspondent…"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/[0.1] dark:bg-black/25 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        <div>
          <label htmlFor="registry-country" className="sr-only">
            Filter by country
          </label>
          <select
            id="registry-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className={`w-full ${selectClass}`}
          >
            <option value="all">All countries ({countries.length})</option>
            {countries.map(([iso2, name]) => (
              <option key={iso2} value={iso2}>
                {name} ({iso2})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="registry-rail" className="sr-only">
            Filter by clearing rail
          </label>
          <select
            id="registry-rail"
            value={rail}
            onChange={(event) => setRail(event.target.value)}
            className={`w-full ${selectClass}`}
          >
            <option value="all">All clearing rails ({rails.length})</option>
            {rails.map(([id, operator]) => (
              <option key={id} value={id}>
                {id} — {operator.length > 34 ? `${operator.slice(0, 33)}…` : operator}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2.5 text-xs tabular-nums text-black/50 dark:text-white/50" aria-live="polite">
        {filtered.length} of {profiles.length} verified institutions
        {country !== "all" || rail !== "all" || query !== ""
          ? " · filtered"
          : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            No institution matches these filters
          </p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Try a BIC fragment such as “chasus”, clear the country filter, or
            pick the rail the credit lands on.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white [scrollbar-width:thin] dark:border-white/[0.08] dark:bg-slate-900/40">
          <table className="w-full min-w-[60rem] border-collapse text-left">
            <caption className="sr-only">
              Verified ISO 9362 institution heads with domestic clearing rail,
              charge codes and correspondent transit
            </caption>
            <thead>
              <tr className="border-b border-slate-200/90 text-[10px] tracking-widest text-slate-500 uppercase dark:border-white/[0.08] dark:text-slate-400">
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Institution
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  BIC
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Market
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Clearing rail
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  71A
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">
                  Cut
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">
                  Transit
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile) => (
                <tr
                  key={profile.bic}
                  className="border-b border-slate-200/60 align-middle transition-colors duration-150 last:border-b-0 hover:bg-emerald-500/[0.04] dark:border-white/[0.06] dark:hover:bg-white/[0.04]"
                >
                  <th scope="row" className="max-w-[22rem] px-3 py-2.5 font-normal">
                    <Link
                      href={`/banks/${profile.slug}/`}
                      className="block truncate text-[13px] font-semibold text-slate-900 transition-colors hover:text-emerald-700 dark:text-white dark:hover:text-emerald-400"
                    >
                      {profile.name}
                    </Link>
                    <span className="mt-0.5 block truncate text-[10px] text-black/45 dark:text-white/45">
                      {profile.tier === 1
                        ? "Tier 1 · correspondent hub"
                        : "Tier 2 · domestic settlement bank"}
                      {profile.hasDossier ? " · full dossier" : ""}
                    </span>
                  </th>
                  <td className="px-3 py-2.5 font-mono text-[12px] whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <Link
                      href={`/banks/${profile.slug}/`}
                      className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400"
                    >
                      {formatBic(profile.bic)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <span aria-hidden="true" className="mr-1.5">
                      {profile.flag}
                    </span>
                    {profile.countryName}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <span className="font-mono">{profile.railId}</span>
                    {profile.rail?.instant ? (
                      <span className="ml-1.5 rounded border border-emerald-500/25 bg-emerald-500/10 px-1 py-px text-[9px] font-bold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                        instant
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <ChargeCodes charges={profile.supportedCharges} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {formatUsd(profile.defaultIntermediaryCutUSD)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {formatTransit(profile.avgTransitHours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
