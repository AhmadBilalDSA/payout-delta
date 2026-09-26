"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { BankDossier } from "@/data/banks";

function formatBic(bic: string): string {
  return `${bic.slice(0, 4)} ${bic.slice(4, 6)} ${bic.slice(6)}`;
}

function BankCard({ bank }: { bank: BankDossier }) {
  return (
    <Link
      href={`/banks/${bank.slug}/`}
      className="group relative w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 transition-colors duration-200 hover:border-emerald-500/40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none dark:hover:border-emerald-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            {bank.shortName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-black/[0.5] dark:text-white/[0.5]">
            {bank.headquartersCity},{" "}
            <span className="uppercase">{bank.headquartersCountry}</span>
          </p>
        </div>
        <span
          className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-semibold tracking-wide text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300"
          title={`ISO 9362 BIC — ${bank.swiftBic}`}
        >
          {formatBic(bank.swiftBic)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-emerald-700 dark:text-emerald-400">
          {bank.role}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400">
          {bank.clearingCurrency}
        </span>
      </div>

      <p className="mt-3 font-mono text-xs font-semibold tracking-tight text-slate-900 dark:text-white">
        {bank.typicalShaDeduction}
        <span className="ml-1 font-sans text-[11px] font-medium text-black/[0.45] dark:text-white/[0.45]">
          typical SHA cut
        </span>
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {bank.connectedCorridors.slice(0, 3).map((slug) => (
          <span
            key={slug}
            className="rounded-md border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:border-white/[0.1] dark:text-slate-400"
          >
            {slug}
          </span>
        ))}
        {bank.connectedCorridors.length > 3 && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            +{bank.connectedCorridors.length - 3} corridors
          </span>
        )}
      </div>
    </Link>
  );
}

export default function BankDirectory({ banks }: { banks: BankDossier[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return banks;
    return banks.filter((bank) =>
      [
        bank.name,
        bank.shortName,
        bank.swiftBic,
        bank.clearingNetwork,
        bank.headquartersCity,
        bank.headquartersCountry,
        bank.role,
        ...bank.connectedCorridors,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [banks, query]);

  const hubs = filtered.filter(
    (bank) => bank.role === "Global Correspondent Clearing Hub"
  );
  const rails = filtered.filter(
    (bank) => bank.role === "Domestic Beneficiary Rail"
  );

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="bank-search" className="sr-only">
          Search the bank directory
        </label>
        <div className="relative flex-1">
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
            id="bank-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by bank name, BIC, country, city or corridor…"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-16 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/[0.1] dark:bg-black/20 dark:text-white dark:placeholder:text-slate-500"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:border-emerald-500/50 hover:text-emerald-600 dark:border-white/[0.12] dark:text-slate-400 dark:hover:text-emerald-400"
            >
              Clear
            </button>
          )}
        </div>
        <p className="shrink-0 text-xs font-medium text-black/[0.5] dark:text-white/[0.5]">
          {filtered.length} of {banks.length} banks
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            No banks match &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-black/[0.5] dark:text-white/[0.5]">
            Try a BIC fragment (e.g. &ldquo;chasus&rdquo;), a country, or a
            corridor slug like &ldquo;usd-to-pkr&rdquo;.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {hubs.length > 0 && (
            <section aria-label="Global correspondent clearing hubs">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                />
                Global Correspondent Clearing Hubs
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {hubs.map((bank) => (
                  <BankCard key={bank.slug} bank={bank} />
                ))}
              </div>
            </section>
          )}

          {rails.length > 0 && (
            <section aria-label="Domestic beneficiary rails">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-slate-400"
                />
                Domestic Beneficiary Rails
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {rails.map((bank) => (
                  <BankCard key={bank.slug} bank={bank} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}