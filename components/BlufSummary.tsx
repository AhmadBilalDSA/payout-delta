import type { Corridor, Platform, WithdrawalChannel } from "@/lib/types";
import { getDataset } from "@/lib/db";
import {
  computeRoute,
  DEFAULT_GROSS_USD,
} from "@/utils/calculateRoute";
import { formatLocal } from "@/utils/format";

/**
 * Phase 3 — Bottom Line Up Front (BLUF) answer card.
 *
 * Renders a dense, factual one-sentence answer below the corridor `<h1>` and
 * above the calculator. This is a SERVER component: at build time the static
 * export bakes the full sentence (bold entities, providers, amounts, rate and
 * as-of date) into the HTML, so AI answer engines that index raw markup —
 * Perplexity, ChatGPT, Claude, Google AI Overviews — can parse the takeaway
 * without executing a single byte of client JavaScript.
 *
 * The math reuses the exact production pipeline (computeRoute at the default
 * $1,000 invoice on a 0% direct invoice) so the blurb always agrees with the
 * interactive verdict below it.
 */
export default function BlufSummary({
  corridor,
  channels,
  platforms,
}: {
  corridor: Corridor;
  channels: WithdrawalChannel[];
  platforms: Platform[];
}) {
  const platform = platforms.find((item) => item.id === "direct") ?? platforms[0];
  const route = computeRoute(DEFAULT_GROSS_USD, platform, corridor, channels);
  const best = route.verdict.best;
  const worst = route.verdict.worst;
  if (best === null || worst === null || route.quotes.length === 0) {
    return null;
  }

  const asOf = getDataset().updatedAt.slice(0, 10);
  const rateLabel = corridor.rate.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
  const savingsLabel = formatLocal(
    route.verdict.savingsLocal,
    corridor
  );
  const netLabel = formatLocal(best.localAmount, corridor);

  return (
    <section
      aria-label="Bottom line up front — payout takeaway summary"
      className="mb-6 rounded-2xl border border-black/[0.05] bg-[#F5F5F7] p-5 dark:border-white/[0.08] dark:bg-[#16161B]"
    >
      <p
        className="text-sm leading-relaxed tabular-nums text-black/80 dark:text-white/80"
        data-bluf="key-takeaway"
      >
        <strong className="font-bold text-black dark:text-white">
          Key Takeaway:
        </strong>{" "}
        To receive{" "}
        <strong className="font-semibold text-emerald-700 dark:text-emerald-400">
          {netLabel}
        </strong>{" "}
        on a standard{" "}
        <strong className="font-semibold text-black dark:text-white">
          $1,000 USD
        </strong>{" "}
        freelance invoice,{" "}
        <strong className="font-semibold text-black dark:text-white">
          {best.channelName}
        </strong>{" "}
        yields{" "}
        <strong className="font-semibold text-emerald-700 dark:text-emerald-400">
          {netLabel}
        </strong>{" "}
        (effective fee{" "}
        <strong className="font-semibold text-black dark:text-white">
          {best.totalCostPercent.toFixed(2)}%
        </strong>
        ), saving{" "}
        <strong className="font-semibold text-black dark:text-white">
          {savingsLabel}
        </strong>{" "}
        compared to{" "}
        <strong className="font-semibold text-black dark:text-white">
          {worst.channelName}
        </strong>
        . Interbank rate benchmarked at{" "}
        <strong className="font-semibold text-black dark:text-white">
          {rateLabel}
        </strong>{" "}
        as of{" "}
        <strong className="font-semibold text-black dark:text-white">
          {asOf}
        </strong>
        .
      </p>
    </section>
  );
}