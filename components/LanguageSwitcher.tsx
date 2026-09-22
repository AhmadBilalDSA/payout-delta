"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useDismissable } from "@/components/useDismissable";
import { localizedCorridorHref } from "@/lib/localizedCorridors";

/**
 * Phase 7 — persistent global language switcher (client island).
 *
 * Always visible in the header on every route — home, corridor pages,
 * localized sub-paths and the Invoice Studio. Unlike the phase-6 capsule it
 * does not rely on a corridor slug existing to render: on corridor routes it
 * translates the current corridor into each authored language (falling back
 * to the English page when the pair isn't authored), and on non-corridor
 * routes it routes each language to that language's authored anchor guide.
 *
 * `next/link` applies the `/payout-delta` production `basePath` to every href
 * automatically, and `usePathname()` returns the path without it, so the
 * switcher stays glued to the same corridor while hopping languages on GitHub
 * Pages without ever 404-ing.
 */

interface LanguageOption {
  code: string;
  englishName: string;
  nativeName: string;
  shortLabel: string;
  /** Signed corridor shown for non-corridor routes (the language's guide). */
  anchorSlug?: string;
}

const LANGUAGES: readonly LanguageOption[] = [
  {
    code: "en",
    englishName: "English",
    nativeName: "English",
    shortLabel: "EN",
  },
  {
    code: "ur",
    englishName: "Urdu",
    nativeName: "اردو",
    shortLabel: "اردو",
    anchorSlug: "usd-to-pkr",
  },
  {
    code: "hi",
    englishName: "Hindi",
    nativeName: "हिन्दी",
    shortLabel: "हिन्दी",
    anchorSlug: "usd-to-inr",
  },
  {
    code: "fil",
    englishName: "Filipino",
    nativeName: "Filipino",
    shortLabel: "FIL",
    anchorSlug: "usd-to-php",
  },
  {
    code: "es",
    englishName: "Spanish",
    nativeName: "Español",
    shortLabel: "ES",
    anchorSlug: "usd-to-eur",
  },
  {
    code: "pt",
    englishName: "Portuguese",
    nativeName: "Português",
    shortLabel: "PT",
    anchorSlug: "usd-to-brl",
  },
];

interface ParsedRoute {
  /** Corridor slug when the current route is a calculator page. */
  slug?: string;
  /** Language prefix of the current route (defaults to English). */
  lang: string;
}

function parseRoute(pathname: string): ParsedRoute {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments[0] === "calculator" && segments[1]) {
    return { slug: segments[1], lang: "en" };
  }
  if (segments[1] === "calculator" && segments[2]) {
    return { slug: segments[2], lang: segments[0] };
  }
  return { lang: "en" };
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const { open, setOpen, containerRef } = useDismissable();

  // Close the panel whenever SPA navigation lands on a new route.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  if (pathname === null) {
    return null;
  }

  const { slug, lang } = parseRoute(pathname);
  const current = LANGUAGES.find((item) => item.code === lang) ?? LANGUAGES[0];

  const options = LANGUAGES.map((language) => {
    let href: string;
    let fallback = false;
    if (slug) {
      // Corridor route → translate the same corridor, or fall back to the
      // English page when that language pair isn't authored (never 404).
      href = localizedCorridorHref(language.code, slug);
      fallback = language.code !== "en" && href === `/calculator/${slug}/`;
    } else {
      // Home / invoice / static pages → route to the language's anchor guide.
      href =
        language.code === "en"
          ? pathname
          : `/${language.code}/calculator/${language.anchorSlug}/`;
    }
    return {
      ...language,
      href,
      fallback,
      active: language.code === current.code,
    };
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Site language: ${current.englishName}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 max-w-[9rem] items-center gap-1.5 rounded-full bg-black/[0.04] px-3 text-xs font-semibold text-slate-700 ring-1 ring-black/[0.06] transition-colors duration-200 ease-out hover:bg-black/[0.08] active:scale-[0.98] sm:max-w-none dark:bg-white/[0.06] dark:text-white/80 dark:ring-white/[0.1] dark:hover:bg-white/[0.12]"
      >
        <span aria-hidden="true" className="text-sm leading-none text-slate-500 dark:text-white/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.7 2.5 3.9 5.8 3.9 9s-1.2 6.5-3.9 9c-2.7-2.5-3.9-5.8-3.9-9S9.3 5.5 12 3z" strokeLinecap="round" />
          </svg>
        </span>
        <span className="truncate">{current.shortLabel}</span>
        <span
          aria-hidden="true"
          className={`text-[9px] leading-none text-slate-400 transition-transform duration-200 ease-out dark:text-white/40 ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Site language"
          className="absolute left-0 top-full z-50 mt-2 w-56 origin-top-left animate-[dropdown-in_130ms_ease-out] rounded-2xl bg-white/95 p-1.5 shadow-[var(--apple-glass-shadow)] ring-1 ring-black/[0.06] backdrop-blur-xl dark:bg-neutral-900/95 dark:ring-white/[0.1]"
        >
          {options.map((option) => (
            <Link
              key={option.code}
              href={option.href}
              lang={option.code === "en" || option.fallback ? undefined : option.code}
              role="menuitem"
              aria-current={option.active ? "true" : undefined}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors duration-150 ease-out ${
                option.active
                  ? "bg-black/[0.05] dark:bg-white/[0.08]"
                  : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              }`}
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[10px] font-bold text-slate-600 dark:bg-white/[0.08] dark:text-white/60"
              >
                {option.code === "en"
                  ? "EN"
                  : option.code === "fil"
                    ? "FIL"
                    : option.code.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 leading-none">
                <span className="block text-slate-800 dark:text-white/90">
                  {option.nativeName}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-white/40">
                  {option.englishName}
                  {option.fallback ? " · via English" : ""}
                </span>
              </span>
              {option.active && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}