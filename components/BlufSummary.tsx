"use client";

import type { Corridor, Platform, WithdrawalChannel } from "@/lib/types";
import { getDataset } from "@/lib/db";
import { computeRoute, DEFAULT_GROSS_USD } from "@/utils/calculateRoute";
import { formatLocal } from "@/utils/format";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { platformUiKey } from "@/lib/i18n/helpers";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import {
  formatTaxPct,
  renderTemplate,
  type TemplateVars,
} from "@/components/aeoTemplate";

/**
 * Phase 2 — high-authority AI Extraction Box.
 *
 * Replaces the Phase 3 BLUF card with an "obsidian-glass" citation surface
 * that answers, in one declarative sentence: on a $1,000 Upwork transfer
 * to the corridor's flagship bank, which provider delivers what net versus a
 * traditional bank wire, how much that saves after the correspondent SWIFT
 * cut, and which statutory withholding applies under which named authority.
 *
 * The sentence is a single extractable `<p>` with numeric entities wrapped in
 * `<strong>` — answer engines that parse raw markup index the takeaway without
 * executing JavaScript (the provider seeds English during prerender and flips
 * locale post-mount, per the Phase 7 hydration-safe contract). Statutory
 * evidence chips underneath are derived from `data/regulatoryBanking.ts`.
 */
export default function BlufSummary({
  corridor,
  channels,
  platforms,
  platformId,
  platformLabel,
}: {
  corridor: Corridor;
  channels: WithdrawalChannel[];
  platforms: Platform[];
  /** Long-tail platform preset id (defaults to Upwork on generic routes). */
  platformId?: string;
  /** Display override for the platform name inside the AEO sentence. */
  platformLabel?: string;
}) {
  const { t, lang } = useLanguage();
  const platform =
    platforms.find((item) => item.id === platformId) ??
    platforms.find((item) => item.id === "upwork") ??
    platforms[0];
  const route = computeRoute(DEFAULT_GROSS_USD, platform, corridor, channels);
  const best = route.verdict.best;
  const worst = route.verdict.worst;
  if (best === null || worst === null || route.quotes.length === 0) {
    return null;
  }

  const regulation = getRegulatoryBanking(corridor.slug);
  const bank = regulation.banks[0];
  const tier = regulation.tiers[0];
  const wireQuote =
    route.quotes.find((quote) => quote.channelId === "swift") ?? worst;

  const asOf = getDataset().updatedAt.slice(0, 10);
  const rateLabel = corridor.rate.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
  const netLabel = formatLocal(best.localAmount, corridor);
  const wireNetLabel = formatLocal(wireQuote.localAmount, corridor);
  const deltaLabel = formatLocal(
    Math.max(0, best.localAmount - wireQuote.localAmount),
    corridor,
  );

  const synthesisVars: TemplateVars = {
    gross: `$${DEFAULT_GROSS_USD.toLocaleString("en-US")}`,
    platform: platformLabel ?? t(platformUiKey(platform.id)),
    bank: bank.name,
    country: corridor.country,
    provider: best.channelName,
    net: netLabel,
    wireNet: wireNetLabel,
    delta: deltaLabel,
    fee: String(platform.feePercent),
    swift: `$${Number(bank.intermediaryUSD.toFixed(2))}`,
    tax: formatTaxPct(tier.rate),
    authority: regulation.authority,
  };
  const synthesisTemplate =
    DICTIONARIES[lang]?.strings.aeoSynthesis ??
    DICTIONARIES.en.strings.aeoSynthesis;

  return (
    <section
      aria-label="AEO verified answer — bottom line payout takeaway"
      data-aeo="answer-block"
      className="relative w-full min-w-0 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 sm:p-6 shadow-md backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-sm leading-none">
          ⚡
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">
          {t("aeoBadge")}
        </span>
      </div>

      <p
        data-bluf="key-takeaway"
        className="mt-3 text-sm leading-relaxed text-white/80"
      >
        <strong className="font-bold text-white">
          {t("keyTakeaway")}
        </strong>{" "}
        {renderTemplate(synthesisTemplate, synthesisVars)}
      </p>

      <div
        data-aeo="citations"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {t("aeoCitationsLabel")}:
        </span>
        {regulation.citations.map((citation) => (
          <span
            key={citation}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/70"
          >
            {citation}
          </span>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-white/40">
        {t("referenceRate")}: {rateLabel} · {t("feeRevision", { date: asOf })} ·
        {t("aeoNote")}
      </p>
    </section>
  );
}