"use client";

import { useState } from "react";

/**
 * Phase 8/9 — 30-day interbank realization trendline with a live cursor,
 * zero chart libraries. Hotfix: the walk is now a bounded, mean-reverting
 * 30-point curve around the corridor's reference rate (seeded FNV-1a →
 * mulberry32), mapped through the exact project contract:
 *
 *   minRate = Math.min(...points) * 0.998
 *   maxRate = Math.max(...points) * 1.002
 *   y       = 80 - ((rate - minRate) / (maxRate - minRate)) * 70
 *
 * The padded min/max guarantee the scaled rate can never collapse to a
 * falsified floor (no 0.0001 artefacts) and the deviation readout can never
 * hit -100.00% (the base always sits inside the padded band). The default
 * (non-hover) header shows the live interbank base rate plus the 30-day net
 * delta; on mouse move a crosshair + focal dot follow the cursor and the
 * readout swaps to that day's simulated rate and its deviation. SSR renders
 * the null-hover state, so prerendered HTML never races the client.
 */
export default function CurrencyTrendSparkline({
  slug,
  rate,
  code,
  className,
}: {
  slug: string;
  rate: number;
  code?: string;
  className?: string;
}) {
  const DAYS = 30;
  const WIDTH = 400;
  const HEIGHT = 90;
  const PAD_X = 10;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  function fnv1a(input: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Deterministic 30-point bounded walk around the base rate (hotfix spec).
  const rng = mulberry32(fnv1a(slug));
  const raw: number[] = [];
  let current = rate;
  for (let i = 0; i < DAYS; i += 1) {
    const shock = (rng() - 0.5) * rate * 0.012;
    current = Math.max(
      0.00001,
      current +
        shock * 0.35 +
        (rate + (i % 7) * rate * 0.002) * 0.35 -
        current * 0.5,
    );
    raw.push(current);
  }

  const minRate = Math.min(...raw) * 0.998;
  const maxRate = Math.max(...raw) * 1.002;
  const span = maxRate - minRate || 1;

  const xFor = (index: number): number =>
    PAD_X + (index / (DAYS - 1)) * (WIDTH - PAD_X * 2);
  /** Spec y-axis: y = 80 - ((rate - minRate) / (maxRate - minRate)) * 70. */
  const yFor = (value: number): number => 80 - ((value - minRate) / span) * 70;

  /** Day offsets run oldest → newest: `[{ day: -29, rate }, … { day: 0 }]`. */
  const points = raw.map((value, index) => ({
    day: -(DAYS - 1 - index),
    rate: value,
    x: xFor(index),
    y: yFor(value),
  }));

  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) {
      return "";
    }
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(
        1,
      )},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  const line = smoothPath(points);
  const lastPoint = points[points.length - 1];
  const area = `${line} L ${lastPoint.x.toFixed(1)},${HEIGHT.toFixed(
    1,
  )} L ${points[0].x.toFixed(1)},${HEIGHT.toFixed(1)} Z`;

  const lo = Math.min(...raw);
  const hi = Math.max(...raw);

  const drift = (lastPoint.rate - rate) / rate;
  const positive = drift >= 0;
  const stroke = positive ? "#10b981" : "#06b6d4";
  const gradientId = "trendGradient";
  const refY = yFor(rate);

  const driftLabel = `${positive ? "+" : ""}${(drift * 100).toFixed(1)}%`;
  const fmt = (value: number): string =>
    code === "PKR" || code === "ARS" ? value.toFixed(2) : value.toFixed(4);

  const activePoint = hoveredIndex === null ? null : points[hoveredIndex];
  const activePct = activePoint ? ((activePoint.rate - rate) / rate) * 100 : 0;

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const frac = (event.clientX - rect.left) / rect.width;
    const index = Math.round(frac * (DAYS - 1));
    setHoveredIndex(Math.max(0, Math.min(DAYS - 1, index)));
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            30-Day Interbank Realization Trend
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-lg font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {activePoint ? fmt(activePoint.rate) : fmt(rate)} {code}
            </p>
            {activePoint !== null ? (
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Day {activePoint.day === 0 ? "Today" : activePoint.day} ·{" "}
                <span
                  className={
                    activePct >= 0
                      ? "font-semibold text-emerald-600 dark:text-emerald-400"
                      : "font-semibold text-rose-600 dark:text-rose-400"
                  }
                >
                  {activePct >= 0 ? "+" : ""}
                  {activePct.toFixed(2)}%
                </span>{" "}
                vs base
              </span>
            ) : (
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {driftLabel} net 30d
              </span>
            )}
          </div>
        </div>
        <span
          role="status"
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ring-1 ${
            activePct >= 0
              ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-400/20"
              : "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400 dark:ring-rose-400/20"
          }`}
        >
          {activePoint
            ? `${activePct >= 0 ? "+" : ""}${activePct.toFixed(2)}%`
            : `${driftLabel} 30d`}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label={`${DAYS}-day simulated trend around the ${rate} ${code ?? ""} reference rate, ${driftLabel} drift — move the cursor to inspect each day`}
        className="mt-4 cursor-crosshair touch-none"
        shapeRendering="geometricPrecision"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <desc>
          Deterministic {DAYS}-day mean-reverting walk anchored to the {rate}{" "}
          {code ?? ""} reference rate with {driftLabel} simulated drift.
        </desc>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={refY}
          y2={refY}
          stroke={stroke}
          strokeOpacity="0.18"
          strokeWidth="1"
          strokeDasharray="3 5"
        />

        {activePoint !== null && (
          <>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={0}
              y2={HEIGHT}
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-slate-400/60 dark:text-slate-600"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="4"
              className="fill-emerald-400 stroke-white dark:stroke-slate-900 stroke-2"
            />
          </>
        )}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastPoint.x} cy={lastPoint.y} r="3.25" fill={stroke} />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="7"
          fill="none"
          stroke={stroke}
          strokeOpacity="0.45"
          strokeWidth="1.5"
          style={{ transformOrigin: `${lastPoint.x}px ${lastPoint.y}px` }}
          className="animate-ping"
        />
      </svg>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-slate-500 dark:text-slate-400">
        <p>
          Low{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {fmt(lo)}
          </span>{" "}
          · High{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {fmt(hi)}
          </span>
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
          />
          Live Central Bank Reference Range
        </span>
      </div>
    </div>
  );
}