"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  DICTIONARIES,
  LANG_META,
  SUPPORTED_LANGS,
} from "@/lib/i18n/dictionaries";
import type { SupportedLang, UiKey, Vars } from "@/lib/i18n/dictionaries";
import {
  LANGUAGE_KEY,
  readLocalStorage,
  writeLocalStorage,
} from "@/lib/privacyGuard";

/**
 * PayoutDelta — global language provider (Phase 7 refresh).
 *
 * Decouples the UI language from route-localized content: while the five
 * authored corridor sub-paths (`[lang]/calculator/[...]`) translate page copy
 * at build time, every interactive string in the calculator surface, the
 * header, the tax card and the Invoice Studio now flows through this single
 * client-side dictionary. The header switcher simply swaps the provider
 * state — no navigation, no 404 risk.
 *
 * Hydration is mismatch-safe by construction: the initial render always uses
 * English (identical SSR/CSR HTML), and the detected locale (stored
 * preference, then the browser's base language) is applied in a mount effect
 * that also flips `document.documentElement` `lang`/`dir` — the same pair the
 * no-FOUC bootstrap in `app/layout.tsx` pre-applies before first paint. The
 * two layers agree, so users never see a flash of the wrong script.
 */

const LANGUAGE_STORAGE_KEY = LANGUAGE_KEY;
const FALLBACK_LANG: SupportedLang = "en";

interface LanguageContextValue {
  lang: SupportedLang;
  /** `rtl` for Urdu/Arabic, `ltr` elsewhere. */
  dir: "rtl" | "ltr";
  /** Current dictionary, always non-null (falls back to English). */
  t: (key: UiKey, vars?: Vars) => string;
  setLanguage: (lang: SupportedLang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Reads the stored preference, falls back to the browser base language. */
function detectInitialLang(): SupportedLang {
  const stored = readLocalStorage(LANGUAGE_STORAGE_KEY);
  if (stored !== null) {
    const candidate = stored as SupportedLang;
    if (SUPPORTED_LANGS.includes(candidate)) {
      return candidate;
    }
  }
  const base = navigator.language?.toLowerCase().slice(0, 2) ?? "";
  const matched = SUPPORTED_LANGS.find((code) => code === base);
  return matched ?? FALLBACK_LANG;
}

/** Interpolates every `{var}` placeholder in a catalog string. */
function interpolate(template: string, vars?: Vars): string {
  if (!vars) {
    return template;
  }
  let rendered = template;
  for (const [name, value] of Object.entries(vars)) {
    rendered = rendered.replaceAll(`{${name}}`, String(value));
  }
  return rendered;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<SupportedLang>(FALLBACK_LANG);

  // Apply the stored/browser locale once, after mount, so the first render
  // (SSR + hydration) is byte-identical English and never re-renders.
  useEffect(() => {
    const applyDetectedLocale = () => {
      const detected = detectInitialLang();
      if (detected !== FALLBACK_LANG) {
        setLang(detected);
      }
      const meta = LANG_META[detected];
      document.documentElement.lang = langToLocale(detected);
      document.documentElement.dir = meta.isRTL ? "rtl" : "ltr";
    };
    const id = window.setTimeout(applyDetectedLocale, 0);
    return () => window.clearTimeout(id);
  }, []);

  const setLanguage = useCallback((next: SupportedLang) => {
    setLang(next);
    const meta = LANG_META[next];
    document.documentElement.lang = langToLocale(next);
    document.documentElement.dir = meta.isRTL ? "rtl" : "ltr";
    writeLocalStorage(LANGUAGE_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: UiKey, vars?: Vars): string => {
      const catalog = DICTIONARIES[lang] ?? DICTIONARIES[FALLBACK_LANG];
      const template = catalog.strings[key] ?? DICTIONARIES[FALLBACK_LANG].strings[key] ?? key;
      return interpolate(template, vars);
    },
    [lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: LANG_META[lang].isRTL ? "rtl" : "ltr",
      t,
      setLanguage,
    }),
    [lang, t, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Maps a supported code to its full locale tag used on `<html lang>`. */
function langToLocale(lang: SupportedLang): string {
  switch (lang) {
    case "ur":
      return "ur-PK";
    case "hi":
      return "hi-IN";
    case "fil":
      return "fil-PH";
    case "es":
      return "es-ES";
    case "pt":
      return "pt-BR";
    case "ar":
      return "ar-SA";
    default:
      return "en-US";
  }
}

/**
 * Reads the global translation context. Throws outside the provider so a
 * misplaced consumer fails loudly at development time instead of rendering
 * silently-empty strings.
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (context === null) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}