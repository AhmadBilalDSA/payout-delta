"use client";

import * as Accordion from "@radix-ui/react-accordion";
import type { FaqItem } from "@/lib/corridorContent";

/**
 * Radix Accordion (UNPRIVILEGED client island, no hydration on corridor
 * routes until needed). Renders FAQ sections shared by the prose blocks.
 */
export default function FaqAccordion({
  items,
  value,
  onValueChange,
}: {
  items: FaqItem[];
  value?: string[] | undefined;
  onValueChange?: ((value: string[]) => void) | undefined;
}) {
  return (
    <Accordion.Root
      type="multiple"
      value={value}
      onValueChange={onValueChange}
      className="divide-y divide-slate-200 rounded-xl border border-slate-200/90 bg-white/80 shadow-sm backdrop-blur-md dark:divide-slate-800/80 dark:border-slate-800/80 dark:bg-slate-900/60"
    >
      {items.map((item, index) => (
        <Accordion.Item key={`${item.q}-${index}`} value={`faq-${index}`}>
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 dark:text-white dark:hover:bg-white/[0.05]">
              {item.q}
              <span className="shrink-0 text-slate-400 dark:text-white/40" aria-hidden="true">
                ▾
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 pb-4 text-sm leading-relaxed text-slate-600 dark:text-white/60">
            {item.a}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}