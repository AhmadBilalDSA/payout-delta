"use client";

import { useMemo, useState } from "react";

import type { Corridor, Platform, WithdrawalChannel } from "@/lib/types";
import {
  clampGrossUSD,
  computeRoute,
  DEFAULT_GROSS_USD,
} from "@/utils/calculateRoute";
import VerdictCard from "@/components/VerdictCard";
import SliderControls from "@/components/SliderControls";
import FeeBreakdownList from "@/components/FeeBreakdownList";

/**
 * Interactive payout auditor (client island) — Apple-grade, iOS-feel.
 * Milestone 2 splits the surface into three modular units:
 *
 *   - VerdictCard        — obsidian BLUF hero (provider + net take-home)
 *   - SliderControls     — amount pills, slider, platform switcher
 *   - FeeBreakdownList   — ranked, expandable four-layer disclosure cards
 *
 * All math is `useMemo`-memoized across the only two inputs that matter
 * (amount + platform), so re-renders are O(1) and the paid-route comparison
 * is instantaneous. No requests, no external fetches — guarantees the static
 * export budget holds even on slow connections (INP well under 50ms).
 *
 * No proprietary third-party logos are shipped; providers appear as plain
 * typographic monograms and type only, under nominative fair use, with the
 * explicit disclaimer beneath the calculator.
 *
 * ---------------------------------------------------------------------------
 * PHASE 2 — COMMENTED SAAS HOOKS (do NOT implement in Phase 1)
 * ---------------------------------------------------------------------------
 * <button type="button">Download Invoice PDF</button>
 * <button type="button">Get Rate Drop Alerts</button>
 * <button type="button">Embed This Calculator</button>
 * <button type="button">Weekend Inflation Warning</button>
 *
 * 1) DOWNLOAD INVOICE PDF — once self-hosted, inject a button beside the
 *    verdict that POSTs {amount, platform, corridor, bestChannel} to the Phase
 *    2 API; server renders a PDF via pdf-lib/(puppeteer) and returns bytes.
 *    Static export forbids request-time render today, hence the stub UI only
 *    (see the commented hooks inside FeeBreakdownList).
 *
 * 2) GET RATE DROP ALERTS — hydrate an optional email form when the managed
 *    backend is available: subscribe → writes row in fact_rate_alerts, and
 *    the cron job (reusing scripts/playwright_scraper.py) emails the user
 *    when `liveRate < (rate * (1 - threshold))`. Phase 1: commented block.
 *
 * 3) EMBED THIS CALCULATOR — agencies/invoicing tools should be able to
 *    drop this auditor into their own pages. The static host already serves
 *    this route, so Phase 2's embed is a copy-paste <iframe> widget fragment
 *    (e.g. <iframe src="/calculator/[slug]/embed">) with a branded border-box
 *    skin; the mPaaS tier then layers attribution/referral tracking on top.
 *    Phase 1: commented stub.
 *
 * 4) WEEKEND INFLATION WARNING — FX desks commonly mark up their spread when
 *    USD liquidity thins on weekends (markets effectively closed Fri 22:00 UTC
 *    → Sun 22:00 UTC). Phase 2 will read `Date.prototype.getDay()` plus a
 *    provider-schedule table and annotate the verdict when a weekend payout is
 *    imminent ("Weekend spread ~ +X% vs weekday lanes"). Phase 1: stub.
 * ---------------------------------------------------------------------------
 */

export default function Calculator({
  corridor,
  platforms,
  channels,
}: {
  corridor: Corridor;
  platforms: Platform[];
  channels: WithdrawalChannel[];
}) {
  const [amount, setAmount] = useState<number>(DEFAULT_GROSS_USD);
  const [platformId, setPlatformId] = useState<string>(
    platforms[0]?.id ?? "upwork"
  );

  const platform =
    platforms.find((item) => item.id === platformId) ?? platforms[0];

  const route = useMemo(
    () => computeRoute(amount, platform, corridor, channels),
    [amount, platform, corridor, channels]
  );

  return (
    <div className="flex w-full flex-col gap-6">
      {/* BLUF verdict sits ABOVE the inputs — answer first, knobs second. */}
      <VerdictCard
        verdict={route.verdict}
        corridor={corridor}
        quotes={route.quotes}
        platform={platform}
      />

      {/* iOS-style amount pills, slider & platform switcher. */}
      <SliderControls
        amount={amount}
        onAmountChange={(value) => setAmount(clampGrossUSD(value))}
        platformId={platformId}
        onPlatformChange={setPlatformId}
        platforms={platforms}
      />

      {/* Ranked fee breakdown — expandable hairline disclosure cards. */}
      <section aria-labelledby="fee-breakdown">
        <h2
          id="fee-breakdown"
          className="text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40"
        >
          Ranked fee breakdown
        </h2>
        <div className="mt-3">
          <FeeBreakdownList quotes={route.quotes} corridor={corridor} />
        </div>
      </section>

      {/* Nominative fair use — mandatory legal line. */}
      <p className="text-xs leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
        All brand names, trademarks, and registered trademarks are the property
        of their respective owners. Used strictly for comparative cost
        calculation purposes under Nominative Fair Use. PayoutDelta is an
        independent auditing tool.
      </p>
    </div>
  );
}