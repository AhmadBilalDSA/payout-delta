"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Invoice Studio page hero. A client component so it prerenders with the
 * default "en" context during static export (hydration-safe) and re-renders
 * instantly when the visitor switches language from the header switcher.
 */
export default function InvoiceHero() {
  const { t } = useLanguage();

  return (
    <section className="no-print border-b border-black/[0.06] py-12 text-center sm:py-16 dark:border-white/[0.08]">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/40">
        Tools · Phase 4
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
        {t("studioTitle")}
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-white/60">
        {t("studioSubtitle")}
      </p>
    </section>
  );
}