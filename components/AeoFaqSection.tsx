"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { useState } from "react";
import type { ReactNode } from "react";

import type { Corridor, Platform, WithdrawalChannel } from "@/lib/types";
import { computeRoute, DEFAULT_GROSS_USD } from "@/utils/calculateRoute";
import { formatLocal } from "@/utils/format";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import {
  fillTemplate,
  formatTaxPct,
  renderTemplate,
} from "@/components/aeoTemplate";

interface AeoFaqItem {
  q: string;
  a: ReactNode;
}

/**
 * Phase 2 — targeted AEO audit FAQ.
 *
 * Three programmatic, query-matched Q&As computed from the live corridor
 * dataset (same $1,000 Upwork baseline as `BlufSummary`), so the numbers in
 * the answers always agree with the answer box and the interactive verdict:
 *
 *   Q1  "What is the cheapest way to withdraw Upwork earnings to Pakistan?"
 *       → top-ranked provider, net vs traditional bank wire, delta saved.
 *   Q2  "How much does Meezan Bank deduct on foreign SWIFT remittances?"
 *       → named-bank intermediary benchmark band + local landing fee.
 *   Q3  "What statutory purpose code / exemption applies to freelance income?"
 *       → named regulator, tier, rate and export purpose code.
 *
 * The questions and answers are wired into the 7-language dictionary; the
 * English copy is baked during prerender so answer engines strike raw markup.
 */
export default function AeoFaqSection({
  corridor,
  channels,
  platforms,
}: {
  corridor: Corridor;
  channels: WithdrawalChannel[];
  platforms: Platform[];
}) {
  const { t, lang } = useLanguage();
  const [openValues, setOpenValues] = useState<string[]>(["aeo-0"]);

  const platform =
    platforms.find((item) => item.id === "upwork") ?? platforms[0];
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
  const dict = DICTIONARIES[lang]?.strings ?? DICTIONARIES.en.strings;

  const providerName = best.channelName;
  const gross = `$${DEFAULT_GROSS_USD.toLocaleString("en-US")}`;
  const platformName = t("upwork");
  const net = formatLocal(best.localAmount, corridor);
  const wireNet = formatLocal(wireQuote.localAmount, corridor);
  const delta = formatLocal(
    Math.max(0, best.localAmount - wireQuote.localAmount),
    corridor,
  );
  const swift = `$${Number(bank.intermediaryUSD.toFixed(2))}`;
  const tax = formatTaxPct(tier.rate);

  const q1 = fillTemplate(t("aeoQ1"), {
    platform: platformName,
    country: corridor.country,
  });
  const a1 = renderTemplate(dict.aeoQ1A, {
    provider: providerName,
    platform: platformName,
    gross,
    country: corridor.country,
    net,
    wireNet,
    delta,
    swift,
    tax,
  });

  const q2 = fillTemplate(t("aeoQ2"), { bank: bank.name });
  const band =
    bank.intermediaryMinUSD === bank.intermediaryMaxUSD
      ? `$${bank.intermediaryMinUSD}`
      : `$${bank.intermediaryMinUSD}–$${bank.intermediaryMaxUSD}`;
  const a2 = renderTemplate(dict.aeoQ2A, {
    bank: bank.name,
    band,
    fee: String(bank.localFeeDefault),
    symbol: corridor.currencySymbol,
    clearance: bank.clearance,
  });

  const q3 = t("aeoQ3");
  const a3: ReactNode = regulation.generic
    ? renderTemplate(dict.aeoQ3ACompliance, { note: tier.note })
    : renderTemplate(dict.aeoQ3A, {
        authority: regulation.authority,
        tier: tier.name,
        rate: tax,
        code: tier.purposeCode ? ` with purpose code ${tier.purposeCode}` : "",
        note: tier.note,
      });

  const items: AeoFaqItem[] = [
    { q: q1, a: a1 },
    { q: q2, a: a2 },
    { q: q3, a: a3 },
  ];

  return (
    <section
      aria-labelledby={`aeo-faq-${corridor.slug}`}
      data-aeo="audit-faq"
      className="mt-10"
    >
      <h2
        id={`aeo-faq-${corridor.slug}`}
        className="text-xl font-bold text-slate-900 dark:text-white"
      >
        {t("aeoFaqTitle")}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-white/60">
        {t("aeoFaqLead")}
      </p>

      <Accordion.Root
        type="multiple"
        value={openValues}
        onValueChange={setOpenValues}
        className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-white/[0.08] dark:border-white/[0.08] dark:bg-[#15151A]"
      >
        {items.map((item, index) => (
          <Accordion.Item key={`${item.q}-${index}`} value={`aeo-${index}`}>
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 dark:text-white dark:hover:bg-white/[0.05]">
                {item.q}
                <span
                  className="shrink-0 text-slate-400 dark:text-white/40"
                  aria-hidden="true"
                >
                  ▾
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content
              forceMount
              className="px-4 pb-4 text-sm leading-relaxed text-slate-600 dark:text-white/60"
            >
              <p data-aeo={`answer-${index}`}>{item.a}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}