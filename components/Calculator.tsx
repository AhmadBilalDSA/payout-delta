"use client";

import { useEffect, useMemo, useState } from "react";

import type { ChannelQuote, Corridor, Platform, WithdrawalChannel } from "@/lib/types";
import {
  clampGrossUSD,
  computeRoute,
  DEFAULT_GROSS_USD,
} from "@/utils/calculateRoute";
import VerdictCard from "@/components/VerdictCard";
import SliderControls from "@/components/SliderControls";
import FeeBreakdownList from "@/components/FeeBreakdownList";
import AuditReceipt from "@/components/AuditReceipt";

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
 * PHASE 2 — COMMENTED SAAS HOOKS (do NOT implement in Phase 1 except the
 * Export PDF below, which is fully client-side via window.print())
 * ---------------------------------------------------------------------------
 * <button type="button">Download Invoice PDF</button>
 * <button type="button">Get Rate Drop Alerts</button>
 * <button type="button">Embed This Calculator</button>
 * <button type="button">Weekend Inflation Warning</button>
 *
 * 1) EXPORT INVOICE PDF — ACTIVATED (client-side). "Export Invoice
 *    Justification PDF" mounts `<AuditReceipt>` into a `hidden print:block`
 *    node and calls `window.print()`; the browser's Save-as-PDF produces the
 *    one-page audit receipt. No server, no runtime PDF dependency, static
 *    export intact. (A Phase 3 server-rendered PDF variant stays stubbed until
 *    a managed backend exists.)
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
  const [printQuote, setPrintQuote] = useState<ChannelQuote | null>(null);

  const platform =
    platforms.find((item) => item.id === platformId) ?? platforms[0];

  const route = useMemo(
    () => computeRoute(amount, platform, corridor, channels),
    [amount, platform, corridor, channels]
  );

  // When an export is requested, give the print-only receipt one frame to
  // mount, then open the native Save-as-PDF dialog. After the dialog closes,
  // tear the receipt back down so the screen DOM returns to normal.
  useEffect(() => {
    if (printQuote === null) {
      return;
    }
    const printId = window.setTimeout(() => window.print(), 60);
    const handleAfterPrint = () => setPrintQuote(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.clearTimeout(printId);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printQuote]);

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
          <FeeBreakdownList
            quotes={route.quotes}
            corridor={corridor}
            onExport={setPrintQuote}
          />
        </div>
      </section>

      {/* Nominative fair use — mandatory legal line. */}
      <p className="text-xs leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
        All brand names, trademarks, and registered trademarks are the property
        of their respective owners. Used strictly for comparative cost
        calculation purposes under Nominative Fair Use. PayoutDelta is an
        independent auditing tool.
      </p>

      {/* Print-only audit receipt, mounted the instant an export is asked for
          (becomes the sole visible content inside the Save-as-PDF dialog). */}
      {printQuote !== null && (
        <div className="hidden print:block">
          <AuditReceipt
            quote={printQuote}
            corridor={corridor}
            platform={platform}
          />
        </div>
      )}
    </div>
  );
}