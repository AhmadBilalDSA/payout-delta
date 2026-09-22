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
      className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
    >
      {items.map((item, index) => (
        <Accordion.Item key={item.q} value={`faq-${index}`}>
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50">
              {item.q}
              <span className="shrink-0 text-slate-400" aria-hidden="true">
                ▾
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 pb-4 text-sm leading-relaxed text-slate-600">
            {item.a}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}