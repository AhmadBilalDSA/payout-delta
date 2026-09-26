"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type {
  ClearingRegistryRow,
  ClearingTerminalIndex,
  ShaCutBucket,
  SpreadHeatmapCell,
} from "@/lib/clearingTerminal";

/**
 * Dashboard v3 — Institutional Clearing Terminal (client island for `/dashboard`).
 *
 * A macro telemetry ribbon (corridors audited, verified BICs, peak intermediary
 * cut, zero-markup sovereign zones), two native-SVG analytics widgets and a
 * filterable, CSV-exportable Institutional Clearing Registry.
 *
 * Performance contract:
 *   - Zero third-party chart bundles. Both widgets are hand-built SVG geometry
 *     (`<path>` + `<linearGradient>`) — no canvas, no animation loop, no layout
 *     thrash, nothing that can regress Interaction-to-Next-Paint.
 *   - `import type` ONLY from `@/lib/clearingTerminal`. That module pulls in
 *     `data/fees.json` and the 226KB regulatory bank database, so a value
 *     import here would drag the whole dataset into the browser bundle. The one
 *     number this island needs (`index.benchmarkGrossUsd`) therefore ships
 *     inside the payload.
 *   - Filtering and CSV export are pure in-memory operations over the
 *     precomputed rows: zero network round-trips, no refetch on interaction.
 *
 * Accessibility contract: the registry is a real `<table>` with a caption and
 * column scopes; the toggles are `aria-pressed` buttons; the result count is a
 * polite live region; every visual bar is `aria-hidden` and the same numbers
 * are always present as real text, so a screen reader never depends on the
 * geometry.
 */

const SEND_CURRENCIES = ["ALL", "USD", "EUR", "GBP"] as const;
type SendCurrency = (typeof SEND_CURRENCIES)[number];

/** Bucket → accent stroke. Mirrors the emerald / sky / crimson semantic ramp. */
const BUCKET_ACCENT: Record<ShaCutBucket, string> = {
  minimal: "#10b981",
  standard: "#0ea5e9",
  heavy: "#ef4444",
};

/** Histogram tone → the same three accents, keyed by the payload's tone id. */
const TONE_ACCENT: Record<string, string> = {
  emerald: "#10b981",
  sky: "#0ea5e9",
  crimson: "#ef4444",
};

const BUCKET_TONE_CLASS: Record<ShaCutBucket, string> = {
  minimal:
    "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
  standard: "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400",
  heavy: "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400",
};

const BUCKET_SHORT: Record<ShaCutBucket, string> = {
  minimal: "Minimal transit",
  standard: "Standard correspondent",
  heavy: "Heavy intermediary",
};

/**
 * Rounded-end horizontal bar as a single `<path>` (a pill). Returns an empty
 * string for a zero-width bar so the SVG never emits a degenerate arc, and
 * collapses the radius on very short bars so the caps cannot self-intersect.
 */
function pillPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): string {
  if (!(width > 0)) return "";
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;
  const n = (value: number): string => value.toFixed(2);
  return [
    `M ${n(x + r)},${n(y)}`,
    `H ${n(right - r)}`,
    `A ${n(r)},${n(r)} 0 0 1 ${n(right)},${n(y + r)}`,
    `V ${n(bottom - r)}`,
    `A ${n(r)},${n(r)} 0 0 1 ${n(right - r)},${n(bottom)}`,
    `H ${n(x + r)}`,
    `A ${n(r)},${n(r)} 0 0 1 ${n(x)},${n(bottom - r)}`,
    `V ${n(y + r)}`,
    `A ${n(r)},${n(r)} 0 0 1 ${n(x + r)},${n(y)}`,
    "Z",
  ].join(" ");
}

function formatUSD(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** RFC 4180 field escaping — quote whenever the value carries a delimiter. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

/** RFC 4180 registry serialisation, header row first, CRLF line endings. */
function registryToCsv(rows: ClearingRegistryRow[], benchmark: number): string {
  const header = [
    "Route Pair",
    "Send Currency",
    "Receive Currency",
    "Beneficiary Country",
    "Country Code",
    "Intermediary SHA Cut USD",
    "SHA Band Min USD",
    "SHA Band Max USD",
    "SHA Bucket",
    "Clearing Leg",
    "Correspondent Hub",
    "Correspondent BIC",
    "Receiving Bank",
    "Receiving BIC",
    "Domestic Rail",
    "Field 71A Charge Code",
    "Field 71A Recommendation",
    "Zero Retail FX Markup",
    `Retail Bank Spread USD @ ${formatUSD(benchmark)}`,
    "Retail Bank Spread Percent",
    "Corridor Slug",
  ];
  const lines = [header.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.routePair,
        row.from,
        row.to,
        row.country,
        row.countryCode,
        row.cutUsd.toFixed(2),
        row.cutMinUsd.toFixed(2),
        row.cutMaxUsd.toFixed(2),
        BUCKET_SHORT[row.bucket],
        row.clearingCurrency,
        `${row.correspondentName} ${row.correspondentCity}`,
        row.correspondentBic,
        row.bankName,
        row.beneficiaryBic,
        row.rail,
        row.chargeCode,
        row.chargeNote,
        row.zeroMarkup ? "Yes" : "No",
        row.spreadUsd.toFixed(2),
        row.spreadPercent.toFixed(2),
        row.slug,
      ]
        .map((cell) => csvField(String(cell)))
        .join(",")
    );
  }
  return lines.join("\r\n");
}

/**
 * Streams the filtered registry to a CSV blob entirely in memory. The object URL
 * is revoked on the next tick so the download never leaks the handle.
 */
function downloadRegistryCsv(
  rows: ClearingRegistryRow[],
  benchmark: number
): void {
  if (typeof window === "undefined" || rows.length === 0) return;
  try {
    const blob = new Blob([`\uFEFF${registryToCsv(rows, benchmark)}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "payoutdelta-clearing-registry.csv";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Download unavailable (e.g. blocked blob URLs) — the table stays usable.
  }
}

export default function DashboardV3({
  index,
}: {
  index: ClearingTerminalIndex;
}) {
  const [sendCurrency, setSendCurrency] = useState<SendCurrency>("ALL");
  const [query, setQuery] = useState("");

  const rows = index.rows;
  const benchmark = index.benchmarkGrossUsd;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (sendCurrency !== "ALL" && row.from !== sendCurrency) return false;
      if (q === "") return true;
      return [
        row.from,
        row.to,
        row.routePair,
        row.country,
        row.countryCode,
        row.correspondentBic,
        row.beneficiaryBic,
        row.correspondentName,
        row.rail,
        row.clearingCurrency,
        row.slug,
      ].some((field) => field.toLowerCase().includes(q));
    });
  }, [rows, sendCurrency, query]);

  const { macro, histogram, heatmap } = index;

  return (
    <div className="w-full min-w-0">
      {/* ------------------------------------------------------------------ *
       * Macro Telemetry Ribbon
       * ------------------------------------------------------------------ */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TelemetryCard
          label="Active Corridors Audited"
          value={formatCount(macro.corridorsAudited)}
          hint={`Intermediary + domestic rails · revised ${index.revisedOn}`}
          accent="#10b981"
        />
        <TelemetryCard
          label="Verified Institutional BICs"
          value={formatCount(macro.verifiedBics)}
          hint="ISO 9362 · correspondent hubs, receiving banks & dossiers"
          accent="#0ea5e9"
        />
        <TelemetryCard
          label="Max Intermediary SHA Cut"
          value={macro.peakCutLabel}
          hint={`Band ceiling via ${macro.peakCutVia}`}
          accent="#ef4444"
        />
        <TelemetryCard
          label="Zero-Markup Sovereign Corridors"
          value={formatCount(macro.zeroMarkupCount)}
          hint={
            macro.zeroMarkupCodes.length > 0
              ? `0.0% FX markup zones · ${macro.zeroMarkupCodes.join(" · ")}`
              : "0.0% FX markup zones"
          }
          accent="#10b981"
        />
      </dl>

      {/* ------------------------------------------------------------------ *
       * Native inline SVG analytics widgets
       * ------------------------------------------------------------------ */}
      <div className="mt-5 grid w-full min-w-0 items-start gap-5 lg:grid-cols-2">
        <ShaCutHistogram buckets={histogram.buckets} total={histogram.total} />
        <RetailSpreadHeatmap
          tightest={heatmap.tightest}
          highest={heatmap.highest}
          ceilingUsd={heatmap.ceilingUsd}
          benchmark={benchmark}
        />
      </div>

      {/* ------------------------------------------------------------------ *
       * Institutional Clearing Registry
       * ------------------------------------------------------------------ */}
      <section
        aria-labelledby="clearing-registry"
        className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors duration-200 sm:p-5 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="clearing-registry"
              className="text-sm font-bold tracking-tight text-black dark:text-white"
            >
              Institutional Clearing Registry
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-black/[0.5] dark:text-white/50">
              Field 71A charge-code guidance and domestic settlement rails per
              corridor. Filter by currency, country, BIC or clearing rail.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadRegistryCsv(filtered, benchmark)}
            disabled={filtered.length === 0}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors duration-200 ease-out hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400"
          >
            Export Clearing Registry (CSV)
            <span aria-hidden="true" className="opacity-60">
              ↓
            </span>
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-black/70 dark:text-white/70">
            Filter the registry
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Currency (PKR), country (Pakistan), BIC (MZNBPKKA) or rail (Raast)…"
            aria-label="Filter the institutional clearing registry"
            className="mt-2 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-black/25 focus:outline-none focus:ring-2 focus:ring-black/[0.06] dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
            Send currency
          </span>
          {SEND_CURRENCIES.map((currency) => (
            <button
              key={currency}
              type="button"
              onClick={() => setSendCurrency(currency)}
              aria-pressed={sendCurrency === currency}
              className={`rounded-full px-3 py-1 font-mono text-xs font-semibold transition-all duration-150 ease-out ${
                sendCurrency === currency
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-black/55 hover:bg-black/[0.05] dark:text-white/55 dark:hover:bg-white/[0.07]"
              }`}
            >
              {currency}
            </button>
          ))}
          <span
            role="status"
            aria-live="polite"
            className="ml-auto text-[11px] tabular-nums text-black/[0.45] dark:text-white/45"
          >
            {formatCount(filtered.length)} of {formatCount(rows.length)} corridors
          </span>
        </div>

        <RegistryTable rows={filtered} />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Macro telemetry card
 * -------------------------------------------------------------------------- */

function TelemetryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
        {label}
      </p>
      <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-black dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-black/[0.45] dark:text-white/45">
        {hint}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Widget shell — shared 2-column label/plot grid
 * -------------------------------------------------------------------------- */

/** Shared plot track width, in SVG user units. */
const PLOT_TRACK = 300;

function WidgetFrame({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md"
    >
      <h2
        id={id}
        className="text-sm font-bold tracking-tight text-black dark:text-white"
      >
        {title}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-black/[0.5] dark:text-white/50">
        {lede}
      </p>
      <div className="mt-4 grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        {children}
      </div>
    </section>
  );
}

/**
 * A single horizontal bar: a muted full-width track with the value bar laid over
 * it. The SVG keeps its intrinsic aspect ratio (`aspect-*`) so the pill's corner
 * radius scales uniformly instead of being stretched by `preserveAspectRatio`.
 */
function TrackBar({
  ratio,
  barHeight,
  fill,
  label,
}: {
  /** 0–1 share of the track the value bar should occupy. */
  ratio: number;
  /** Bar height in SVG user units. */
  barHeight: number;
  /** CSS colour for the value bar. */
  fill: string;
  /** Text alternative for the bar. */
  label: string;
}) {
  const safeRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  return (
    <svg
      viewBox={`0 0 ${PLOT_TRACK} ${barHeight}`}
      width="100%"
      role="img"
      aria-label={label}
      focusable="false"
      shapeRendering="geometricPrecision"
      className="w-full"
      style={{ aspectRatio: `${PLOT_TRACK} / ${barHeight}` }}
    >
      <path
        d={pillPath(0, 0, PLOT_TRACK, barHeight, barHeight / 2)}
        className="fill-slate-200 dark:fill-slate-800"
      />
      <path
        d={pillPath(0, 0, PLOT_TRACK * safeRatio, barHeight, barHeight / 2)}
        fill={fill}
        fillOpacity="0.85"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- *
 * Widget 1 — Intermediary SHA cut histogram (native inline SVG)
 * -------------------------------------------------------------------------- */

function ShaCutHistogram({
  buckets,
  total,
}: {
  buckets: ClearingTerminalIndex["histogram"]["buckets"];
  total: number;
}) {
  const peak = buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);
  const barHeight = 16;

  return (
    <WidgetFrame
      id="sha-histogram"
      title="Intermediary SHA Cut Histogram"
      lede={`All ${formatCount(total)} audited corridors bucketed by their benchmark intermediary deduction.`}
    >
      {buckets.map((bucket) => (
        <div key={bucket.id} className="contents">
          <div className="min-w-0">
            <span className="block truncate text-[11px] font-semibold leading-tight text-black/75 dark:text-white/75">
              {bucket.label}
            </span>
            <span className="block font-mono text-[10px] leading-tight tabular-nums text-black/40 dark:text-white/40">
              {bucket.range} · {formatCount(bucket.count)} ·{" "}
              {bucket.share.toFixed(1)}%
            </span>
          </div>
          <TrackBar
            ratio={peak > 0 ? bucket.count / peak : 0}
            barHeight={barHeight}
            fill={TONE_ACCENT[bucket.tone] ?? "#0ea5e9"}
            label={`${bucket.label}, ${bucket.range}: ${bucket.count} of ${total} corridors (${bucket.share.toFixed(1)} percent)`}
          />
        </div>
      ))}
    </WidgetFrame>
  );
}

/* -------------------------------------------------------------------------- *
 * Widget 2 — Retail bank spread heatmap (native inline SVG)
 * -------------------------------------------------------------------------- */

function RetailSpreadHeatmap({
  tightest,
  highest,
  ceilingUsd,
  benchmark,
}: {
  tightest: SpreadHeatmapCell[];
  highest: SpreadHeatmapCell[];
  ceilingUsd: number;
  benchmark: number;
}) {
  const barHeight = 13;
  const scale = ceilingUsd > 0 ? 1 / ceilingUsd : 0;

  const groups = [
    { id: "tightest", title: "Tightest corridors", cells: tightest },
    { id: "highest", title: "Highest-friction corridors", cells: highest },
  ];

  return (
    <WidgetFrame
      id="spread-heatmap"
      title="Retail Bank Spread Heatmap"
      lede={`Bank-layer friction on a ${formatUSD(benchmark)} payout: direct-wire fee + intermediary SHA cut + hidden FX markup.`}
    >
      {/* Gradient host. `userSpaceOnUse` ties the colour ramp to the shared
          plot track, so a bar's hue encodes its value on the common scale
          rather than its own bounding box. */}
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute h-0 w-0"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient
            id="payoutdelta-spread-ramp"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={PLOT_TRACK}
            y2="0"
          >
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>

      <div aria-hidden="true" className="col-span-2" />

      {groups.map((group) => (
        <Fragment key={group.id}>
          <p className="col-span-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
            {group.title}
          </p>
          {group.cells.map((cell) => (
            <div key={`${group.id}-${cell.slug}`} className="contents">
              <div className="min-w-0">
                <span className="block truncate text-[11px] font-semibold leading-tight text-black/75 dark:text-white/75">
                  <span aria-hidden="true">{cell.flag}</span> {cell.country}
                </span>
                <span className="block truncate font-mono text-[10px] leading-tight tabular-nums text-black/40 dark:text-white/40">
                  {cell.routePair} · {formatUSD(cell.spreadUsd)} ·{" "}
                  {cell.spreadPercent.toFixed(2)}%
                </span>
              </div>
              <TrackBar
                ratio={cell.spreadUsd * scale}
                barHeight={barHeight}
                fill="url(#payoutdelta-spread-ramp)"
                label={`${cell.country} ${cell.routePair}: ${formatUSD(cell.spreadUsd)} retail bank spread, ${cell.spreadPercent.toFixed(2)} percent of a ${formatUSD(benchmark)} payout`}
              />
            </div>
          ))}
        </Fragment>
      ))}

      <p className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-black/35 dark:text-white/35">
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "#10b981" }}
          />
          Clean
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "#0ea5e9" }}
          />
          Typical
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "#ef4444" }}
          />
          Leaking
        </span>
      </p>
    </WidgetFrame>
  );
}

/* -------------------------------------------------------------------------- *
 * Registry table
 * -------------------------------------------------------------------------- */

const REGISTRY_HEADINGS = [
  "Route Pair",
  "Beneficiary Country",
  "Intermediary SHA Cut",
  "Domestic Rail",
  "Field 71A Recommendation",
  "Action",
] as const;

function RegistryTable({ rows }: { rows: ClearingRegistryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-8 text-center text-xs text-black/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        No corridor matches this filter — try a currency, country, BIC or rail.
      </p>
    );
  }

  return (
    <div className="mt-4 max-h-[720px] overflow-auto rounded-2xl border border-slate-200/90 dark:border-slate-800/80">
      <table className="w-full min-w-[64rem] border-collapse text-left text-xs">
        <caption className="sr-only">
          Institutional clearing registry: route pair, beneficiary country,
          intermediary SHA deduction, domestic settlement rail, field 71A charge
          recommendation and a deep link to the full corridor audit.
        </caption>
        <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur dark:bg-slate-800/95">
          <tr>
            {REGISTRY_HEADINGS.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.slug}
              className="border-t border-slate-200/70 transition-colors duration-150 hover:bg-emerald-500/[0.04] dark:border-slate-800/70 dark:hover:bg-white/[0.03]"
            >
              <td className="px-3 py-2.5 align-top">
                <span className="block font-mono font-semibold tabular-nums text-black dark:text-white">
                  {row.routePair}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-black/40 dark:text-white/40">
                  {row.correspondentBic}
                </span>
              </td>
              <td className="px-3 py-2.5 align-top">
                <span className="block font-semibold text-black/80 dark:text-white/80">
                  <span aria-hidden="true">{row.flag}</span> {row.country}
                </span>
                <span className="mt-0.5 block text-[10px] text-black/40 dark:text-white/40">
                  {row.bankName} · {row.beneficiaryBic}
                </span>
              </td>
              <td className="px-3 py-2.5 align-top">
                <span
                  className="block font-mono font-semibold tabular-nums"
                  style={{ color: BUCKET_ACCENT[row.bucket] }}
                >
                  {row.cutLabel}
                </span>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${BUCKET_TONE_CLASS[row.bucket]}`}
                >
                  {BUCKET_SHORT[row.bucket]}
                </span>
              </td>
              <td className="px-3 py-2.5 align-top">
                <span className="block text-black/70 dark:text-white/70">
                  {row.rail}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-black/40 dark:text-white/40">
                  {row.clearingCurrency} clearing
                </span>
              </td>
              <td className="px-3 py-2.5 align-top">
                <span className="inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                  {row.chargeCode}
                </span>
                <span className="mt-1 block max-w-[22rem] text-[10px] leading-relaxed text-black/50 dark:text-white/50">
                  {row.chargeNote}
                </span>
                {row.bankSlug && (
                  <Link
                    href={`/banks/${row.bankSlug}/`}
                    className="mt-1 inline-block text-[10px] font-semibold text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                  >
                    Bank dossier
                    <span aria-hidden="true" className="ml-0.5 opacity-60">
                      ↗
                    </span>
                  </Link>
                )}
              </td>
              <td className="px-3 py-2.5 align-top">
                <Link
                  href={`/calculator/${row.slug}/`}
                  className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-[10px] font-semibold text-slate-200 transition-colors duration-200 ease-out hover:bg-slate-800"
                >
                  Audit
                  <span aria-hidden="true" className="ml-1 opacity-60">
                    →
                  </span>
                  <span className="sr-only"> the {row.routePair} corridor</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
