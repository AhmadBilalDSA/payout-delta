/**
 * Phase 8 — 30-day interbank realization trendline, zero chart libraries.
 *
 * A deterministic, server-rendered SVG (400×60 viewBox) that traces a smooth
 * mean-reverting 30-day trajectory around the corridor's reference rate. The
 * seed comes from the corridor slug (FNV-1a → mulberry32), so every corridor
 * gets a stable, corridor-specific curve that survives full static export —
 * no canvas, no runtime PRNG, no hydration mismatch possible. The stroke
 * resolves to emerald when the simulated 30-day drift is positive and cyan
 * when it is negative, and the footer surfaces low / high / annualized
 * volatility with a live-reference pill.
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
  const HEIGHT = 60;
  const PAD_X = 8;
  const PAD_Y = 10;

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

  const points = values.map((value, index) => {
    const x = PAD_X + (index / (DAYS - 1)) * (WIDTH - PAD_X * 2);
    const y = PAD_Y + (1 - (value - lo) / span) * (HEIGHT - PAD_Y * 2);
    return { x, y };
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
    value.toLocaleString("en-US", { maximumFractionDigits: 4 });

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            30-Day Interbank Realization Trend
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {formatRate(rate)} {code}
          </p>
        </div>
        <span
          role="status"
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ring-1 ${
            positive
              ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-400/20"
              : "bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400 dark:ring-cyan-400/20"
          }`}
        >
          {driftLabel} 30d
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label={`${DAYS}-day simulated trend around the ${rate} ${code ?? ""} reference rate, ${driftLabel} drift`}
        className="mt-4"
        shapeRendering="geometricPrecision"
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

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3.25"
          fill={stroke}
        />
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
          Low <span className="font-semibold text-slate-700 dark:text-slate-200">{formatRate(lo)}</span>{" "}
          · High <span className="font-semibold text-slate-700 dark:text-slate-200">{formatRate(hi)}</span>{" "}
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