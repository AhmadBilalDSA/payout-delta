import type { ReactNode } from "react";

import type { Corridor, Platform, WithdrawalChannel } from "@/lib/types";
import { computeRoute, DEFAULT_GROSS_USD } from "@/utils/calculateRoute";
import { formatLocal } from "@/utils/format";
import type { SupportedLang } from "@/lib/i18n/dictionaries";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { platformUiKey } from "@/lib/i18n/helpers";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import { fillTemplate, formatTaxPct, renderTemplate } from "@/components/aeoTemplate";

export interface AeoFaqEntry {
  q: string;
  /** Emphasis-wrapped answer for the on-page accordion (indexer-parseable). */
  a: ReactNode;
  /** Plain-text answer for structured data (JSON-LD FAQPage). */
  aText: string;
}

/**
 * Phase 5 — single source of truth for the programmatic AEO audit FAQ.
 *
 * Extracted from `components/AeoFaqSection.tsx` so the server-rendered
 * FAQPage JSON-LD is built from the exact same templates, corridor dataset
 * and winner quotes as the accordion a human sees. Drift between the markup
 * answer-box copy and the structured data is therefore impossible.
 *
 * The English copy is what answer engines strike on raw prerendered HTML; the
 * questions and answers flow through the 7-language dictionary so the
 * accordion still localizes on the client.
 */
export function getAeoFaqEntries(input: {
  corridor: Corridor;
  channels: WithdrawalChannel[];
  platform: Platform;
  lang: SupportedLang;
  /** Display override for the platform name inside Q&A copy. */
  platformLabel?: string;
}): AeoFaqEntry[] {
  const { corridor, channels, platform, lang, platformLabel } = input;
  const route = computeRoute(DEFAULT_GROSS_USD, platform, corridor, channels);
  const best = route.verdict.best;
  const worst = route.verdict.worst;
  if (best === null || worst === null || route.quotes.length === 0) {
    return [];
  }

  const regulation = getRegulatoryBanking(corridor.slug);
  const bank = regulation.banks[0];
  const tier = regulation.tiers[0];
  const wireQuote =
    route.quotes.find((quote) => quote.channelId === "swift") ?? worst;
  const dict = DICTIONARIES[lang]?.strings ?? DICTIONARIES.en.strings;

  const providerName = best.channelName;
  const gross = `$${DEFAULT_GROSS_USD.toLocaleString("en-US")}`;
  const platformName = platformLabel ?? dict[platformUiKey(platform.id)];
  const net = formatLocal(best.localAmount, corridor);
  const wireNet = formatLocal(wireQuote.localAmount, corridor);
  const delta = formatLocal(
    Math.max(0, best.localAmount - wireQuote.localAmount),
    corridor,
  );
  const swift = `$${Number(bank.intermediaryUSD.toFixed(2))}`;
  const tax = formatTaxPct(tier.rate);

  const q1 = fillTemplate(dict.aeoQ1, {
    platform: platformName,
    country: corridor.country,
  });
  const a1Vars = {
    provider: providerName,
    platform: platformName,
    gross,
    country: corridor.country,
    net,
    wireNet,
    delta,
    swift,
    tax,
  };

  const q2 = fillTemplate(dict.aeoQ2, { bank: bank.name });
  const band =
    bank.intermediaryMinUSD === bank.intermediaryMaxUSD
      ? `$${bank.intermediaryMinUSD}`
      : `$${bank.intermediaryMinUSD}–$${bank.intermediaryMaxUSD}`;
  const a2Vars = {
    bank: bank.name,
    band,
    fee: String(bank.localFeeDefault),
    symbol: corridor.currencySymbol,
    clearance: bank.clearance,
  };

  const q3 = dict.aeoQ3;
  const a3Template = regulation.generic ? dict.aeoQ3ACompliance : dict.aeoQ3A;
  const a3Vars: Record<string, string> = regulation.generic
    ? { note: tier.note }
    : {
        authority: regulation.authority,
        tier: tier.name,
        rate: tax,
        code: tier.purposeCode ? ` with purpose code ${tier.purposeCode}` : "",
        note: tier.note,
      };

  return [
    {
      q: q1,
      a: renderTemplate(dict.aeoQ1A, a1Vars),
      aText: fillTemplate(dict.aeoQ1A, a1Vars),
    },
    {
      q: q2,
      a: renderTemplate(dict.aeoQ2A, a2Vars),
      aText: fillTemplate(dict.aeoQ2A, a2Vars),
    },
    {
      q: q3,
      a: renderTemplate(a3Template, a3Vars),
      aText: fillTemplate(a3Template, a3Vars),
    },
  ];
}