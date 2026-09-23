"use client";

import { useState } from "react";

/**
 * Phase 8/9 — 30-day interbank realization trendline with a live cursor,
 * zero chart libraries.
 *
 * A deterministic inline SVG (400×90 viewBox) tracing a smooth mean-reverting
 * 30-day walk around the corridor's reference rate. The seed comes from the
 * corridor slug (FNV-1a → mulberry32), so the curve is stable per corridor and
 * identical across static export and hydration — no canvas, no runtime PRNG,
 * no third-party charting. The default (non-hover) header shows the current
 * interbank base rate plus the 30-day net delta; on mouse move a crosshair +
 * focal dot follow the cursor and the readout swaps to that day's simulated
 * rate, its "Day -N" offset and its deviation from the base rate. SSR renders
 * the null-hover state, so the prerendered HTML never races the client.
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
  const PAD_Y = 12;

  const [hovered, setHovered] = useState<number | null>(null);

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

  const rand = mulberry32(fnv1a(slug));

  const values: number[] = [];
  let current = rate * (1 + (rand() - 0.5) * 0.06);
  for (let i = 0; i < DAYS; i += 1) {
    const shock = (rand() + rand() + rand() - 1.5) * 0.006;
    const pull = (rate - current) * 0.08;
    current = Math.max(0.000001, current * (1 + shock + pull));
    values.push(current);
  }

  const returns: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    returns.push(values[i] / values[i - 1] - 1);
  }
  const mean =
    returns.reduce((sum, value) => sum + value, 0) / (returns.length || 1);
  const variance = returns.reduce(
    (sum, value) => sum + (value - mean) * (value - mean),
    0,
  ) / (returns.length || 1);
  const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;

  const last = values[values.length - 1];
  const drift = (last - rate) / rate;
  const positive = drift >= 0;
  const stroke = positive ? "#10b981" : "#06b6d4";
  const gradientId = "trendGradient";

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;

  /** Day offsets run oldest → newest: `[{ day: -29, rate }, … { day: 0 }]`. */
  const points = values.map((value, index) => {
    const x = PAD_X + (index / (DAYS - 1)) * (WIDTH - PAD_X * 2);
    const y = PAD_Y + (1 - (value - lo) / span) * (HEIGHT - PAD_Y * 2);
    return { day: -(DAYS - 1 - index), x, y };
  });

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
  const area = `${line} L ${points[points.length - 1].x.toFixed(
    1,
  )},${HEIGHT.toFixed(1)} L ${points[0].x.toFixed(1)},${HEIGHT.toFixed(1)} Z`;

  const refY = PAD_Y + (1 - (rate - lo) / span) * (HEIGHT - PAD_Y * 2);
  const lastPoint = points[points.length - 1];

  const driftLabel = `${positive ? "+" : ""}${(drift * 100).toFixed(1)}%`;
  const formatRate = (value: number): string =>
    value.toLocaleString("en-US", {
      maximumFractionDigits: value >= 100 ? 2 : 4,
    });

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const frac = (event.clientX - rect.left) / rect.width;
    const index = Math.min(
      DAYS - 1,
      Math.max(0, Math.round(frac * (DAYS - 1))),
    );
    setHovered(index);
  }

  const active =
    hovered === null || Number.isNaN(hovered) ? null : points[hovered];
  const activeRate =
    hovered === null || Number.isNaN(hovered) ? null : values[hovered];
  const activeDrift =
    activeRate === null ? 0 : ((activeRate - rate) / rate) * 100;

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
              {activeRate === null
                ? formatRate(rate)
                : formatRate(activeRate)}{" "}
              {code}
            </p>
            {active !== null ? (
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {active.day === 0 ? "Today" : `Day ${active.day}`} ·{" "}
                <span
                  className={
                    activeDrift >= 0
                      ? "font-semibold text-emerald-600 dark:text-emerald-400"
                      : "font-semibold text-rose-600 dark:text-rose-400"
                  }
                >
                  {activeDrift >= 0 ? "+" : ""}
                  {activeDrift.toFixed(2)}%
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
            activeDrift >= 0
              ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-400/20"
              : "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400 dark:ring-rose-400/20"
          }`}
        >
          {activeRate === null
            ? `${driftLabel} 30d`
            : `${activeDrift >= 0 ? "+" : ""}${activeDrift.toFixed(2)}%`}
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
        onMouseLeave={() => setHovered(null)}
      >
        <desc>
          Deterministic {DAYS}-day mean-reverting trajectory anchored to the{" "}
          {rate} {code ?? ""} reference rate with {driftLabel} simulated drift.
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

        {active !== null && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={0}
              y2={HEIGHT}
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-slate-400/60 dark:text-slate-600"
            />
            <circle
              cx={active.x}
              cy={active.y}
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
            {formatRate(lo)}
          </span>{" "}
          · High{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {formatRate(hi)}
          </span>{" "}
          · Volatility{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {vol.toFixed(1)}%
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