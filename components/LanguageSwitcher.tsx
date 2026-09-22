"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { useDismissable } from "@/components/useDismissable";
import { LANG_META, SUPPORTED_LANGS } from "@/lib/i18n/dictionaries";

/**
 * Phase 7 refresh — persistent global language switcher (client island).
 *
 * Always visible in the header on every route. Unlike the phase-6/7 capsule it
 * no longer navigates: selecting a language swaps the provider dictionary and
 * every wired component re-renders inline with the new catalog instantly, so
 * switching can never 404 or leave the current corridor. Route-localized
 * content (the five authored corridor articles) remains on its static sub-path
 * and is reached through the corridor selector.
 */

export default function LanguageSwitcher() {
  const { lang, setLanguage } = useLanguage();
  const { open, setOpen, containerRef } = useDismissable();

  const current = LANG_META[lang];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Site language: ${current.englishName}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 max-w-[9rem] items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-xs font-semibold text-white/80 ring-1 ring-white/[0.1] transition-colors duration-200 ease-out hover:bg-white/[0.12] active:scale-[0.98] sm:max-w-none"
      >
        <span aria-hidden="true" className="text-sm leading-none text-white/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.7 2.5 3.9 5.8 3.9 9s-1.2 6.5-3.9 9c-2.7-2.5-3.9-5.8-3.9-9S9.3 5.5 12 3z" strokeLinecap="round" />
          </svg>
        </span>
        <span className="truncate">{current.shortLabel}</span>
        <span
          aria-hidden="true"
          className={`text-[9px] leading-none text-white/40 transition-transform duration-200 ease-out ${
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
          {SUPPORTED_LANGS.map((code) => {
            const meta = LANG_META[code];
            const active = code === lang;
            return (
              <button
                key={code}
                type="button"
                lang={code}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLanguage(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors duration-150 ease-out ${
                  active
                    ? "bg-black/[0.05] dark:bg-white/[0.08]"
                    : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[10px] font-bold text-slate-600 dark:bg-white/[0.08] dark:text-white/60"
                >
                  {code === "en"
                    ? "EN"
                    : code === "fil"
                      ? "FIL"
                      : code.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 leading-none">
                  <span className="block text-slate-800 dark:text-white/90">
                    {meta.nativeName}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-white/40">
                    {meta.englishName}
                  </span>
                </span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}