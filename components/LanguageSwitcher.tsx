"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LOCALIZED_CORRIDORS } from "@/lib/localizedCorridors";

/**
 * Phase 6 — iOS-style language capsule (client island).
 *
 * Renders `[ EN | اردو ]`-style segmented links only on corridor pages that
 * have an authored localized twin. `basePath` is applied automatically by
 * `next/link`, so an English corridor and its localized sub-path stay in the
 * exact same language cluster on GitHub Pages.
 *
 * During static prerender `usePathname()` is null and the island renders
 * nothing; after hydration the capsule appends into the header's centre cell.
 * Because the shell uses a `1fr | auto | 1fr` grid, the brand and nav anchors
 * stay pinned to the outer edges — the capsule occupies leftover space, so the
 * swap causes no layout shift for edge-pinned content.
 */

const NATIVE_LABELS: Record<string, string> = {
  ur: "اردو",
  hi: "हिन्दी",
  fil: "Filipino",
  es: "Español",
  pt: "Português",
};

interface Variant {
  lang: string;
  label: string;
}

const VARIANT_MAP = new Map<string, Variant[]>();
for (const entry of LOCALIZED_CORRIDORS) {
  const list = VARIANT_MAP.get(entry.slug) ?? [];
  list.push({
    lang: entry.lang,
    label: NATIVE_LABELS[entry.lang] ?? entry.localeName,
  });
  VARIANT_MAP.set(entry.slug, list);
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  if (pathname === null) {
    return null;
  }

  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  // English corridor:  /calculator/<slug>/
  // Localized corridor: /<lang>/calculator/<slug>/
  let slug: string | undefined;
  let currentLang = "en";
  if (segments[0] === "calculator" && segments[1]) {
    slug = segments[1];
  } else if (
    segments[2] &&
    segments[1] === "calculator" &&
    VARIANT_MAP.has(segments[0])
  ) {
    slug = segments[2];
    currentLang = segments[0];
  }

  const variants = slug ? VARIANT_MAP.get(slug) : undefined;
  if (!slug || !variants || variants.length === 0) {
    return null;
  }

  const options: { lang: string; label: string; href: string }[] = [
    { lang: "en", label: "EN", href: `/calculator/${slug}/` },
    ...variants.map((variant) => ({
      lang: variant.lang,
      label: variant.label,
      href: `/${variant.lang}/calculator/${slug}/`,
    })),
  ];

  return (
    <div
      role="group"
      aria-label="Site language"
      className="hidden items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5 ring-1 ring-black/[0.06] sm:inline-flex dark:bg-neutral-900 dark:ring-white/[0.08]"
    >
      {options.map((option) => {
        const active = option.lang === currentLang;
        return (
          <Link
            key={option.lang}
            href={option.href}
            lang={option.lang === "en" ? "en" : option.lang}
            aria-current={active ? "true" : undefined}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none transition-all duration-150 ease-out active:scale-[0.98] ${
              active
                ? "bg-white text-black shadow-sm dark:bg-white/95"
                : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="h-1 w-1 shrink-0 rounded-full bg-emerald-500"
              />
            )}
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}