"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { useState } from "react";

import type { Corridor, Platform, WithdrawalChannel } from "@/lib/types";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAeoFaqEntries } from "@/lib/aeoFaqs";

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
 * Phase 5 — the Q&A generation now lives in `lib/aeoFaqs.ts` so the same
 * entries (question, emphasis-rendered answer and plain text) feed both the
 * on-page accordion and the FAQPage JSON-LD; drift is impossible by
 * construction. The English copy is baked during prerender so answer engines
 * strike raw markup, while the runtime dictionary keeps the UI localized.
 */
export default function AeoFaqSection({
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
  /** Display override for the platform name inside Q&A copy. */
  platformLabel?: string;
}) {
  const { t, lang } = useLanguage();
  const [openValues, setOpenValues] = useState<string[]>(["aeo-0"]);

  const platform =
    platforms.find((item) => item.id === platformId) ??
    platforms.find((item) => item.id === "upwork") ??
    platforms[0];
  const items = getAeoFaqEntries({
    corridor,
    channels,
    platform,
    lang,
    platformLabel,
  });
  if (items.length === 0) {
    return null;
  }

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