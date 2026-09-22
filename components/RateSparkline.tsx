import type { HistoryPoint, SparklineStats } from "@/lib/types";

/**
 * Phase 3 — micro sparkline, zero external charting libraries.
 *
 * A pure inline SVG (120×32) that traces the corridor's 14-day mid-rate
 * trajectory, plus two compact status pills (signed 14d % change and the
 * current spread state). Because it is static markup — no canvas, no chart
 * dependency, no client hooks — it contributes a handful of bytes to the
 * exported HTML, renders server-side for indexers, and never touches the
 * interaction budget.
 */
export default function RateSparkline({
  stats,
  history,
}: {
  stats: SparklineStats;
  history: HistoryPoint[];
}) {
  if (history.length < 2) {
    return null;
  }

  const WIDTH = 120;
  const HEIGHT = 32;

  const values = history.map((point) => point.rate);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || 1;
  const pad = span * 0.1;
  const lo = rawMin - pad;
  const hi = rawMax + pad;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * WIDTH;
    const y = HEIGHT - ((value - lo) / (hi - lo)) * HEIGHT;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const area = `M 0,${points[0].split(",")[1]} L ${points.join(" L ")} L ${WIDTH},${HEIGHT} L 0,${HEIGHT} Z`;

  const signed =
    stats.direction === "up"
      ? `+${stats.trendPercent.toFixed(1)}%`
      : `${stats.trendPercent.toFixed(1)}%`;
  const trendLabel = `${signed} (14d)`;
  const up = stats.direction === "up";
  const down = stats.direction === "down";

  const stroke = up
    ? "#34d399"
    : down
      ? "#fb7185"
      : "#a1a1aa";
  const fill = up
    ? "rgba(52,211,153,0.18)"
    : down
      ? "rgba(251,113,133,0.18)"
      : "rgba(161,161,170,0.14)";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`14-day ${stats.latestRate} trajectory`}
        className="shrink-0"
        shapeRendering="geometricPrecision"
      >
        <desc>
          Signed 14-day change of {signed} on the {history.length}-point
          trajectory.
        </desc>
        <path d={area} fill={fill} />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={WIDTH}
          cy={Number(points[points.length - 1].split(",")[1])}
          r="2.25"
          fill={stroke}
        />
      </svg>

      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${
          up
            ? "bg-emerald-500/15 text-emerald-400 ring-emerald-400/25"
            : down
              ? "bg-rose-500/15 text-rose-400 ring-rose-400/25"
              : "bg-white/[0.06] text-white/60 ring-white/[0.12]"
        }`}
      >
        {trendLabel}
      </span>

      <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/70 ring-1 ring-white/[0.12]">
        <span
          aria-hidden="true"
          className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
            stats.spreadState === "Favorable" ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
        Spread: {stats.spreadState}
      </span>
    </div>
  );
}