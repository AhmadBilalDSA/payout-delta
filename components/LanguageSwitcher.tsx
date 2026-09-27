"use client";

import { createPortal } from "react-dom";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { useDismissable } from "@/components/useDismissable";
import { useMenuAnchor } from "@/components/headerDropdownLayer";
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
 *
 * PHASE 2 — PANEL LAYER
 * The panel is portalled to `document.body` and pinned to the trigger's live
 * viewport rectangle, so it can own `z-[70]` in the root stacking context: above
 * the Header's click-scrim (`z-[60]`), itself above the Dock (`z-30`). The
 * trigger and the options share the settlement-currency switcher's glass
 * vocabulary so the utility bar reads as one control set.
 */

/** Panel width, mirrored by the anchor clamp. */
const PANEL_WIDTH_PX = 224;

export default function LanguageSwitcher() {
  const { lang, setLanguage } = useLanguage();
  const { open, setOpen, containerRef, panelRef } = useDismissable();
  const anchor = useMenuAnchor(open, containerRef, PANEL_WIDTH_PX);

  const current = LANG_META[lang];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Site language: ${current.englishName}`}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 font-mono text-xs text-neutral-200 transition-all hover:border-emerald-500/50 hover:bg-neutral-900"
      >
        <span aria-hidden="true" className="text-neutral-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-3.5 w-3.5"
          >
            <circle cx="12" cy="12" r="9" />
            <path
              d="M3 12h18M12 3c2.7 2.5 3.9 5.8 3.9 9s-1.2 6.5-3.9 9c-2.7-2.5-3.9-5.8-3.9-9S9.3 5.5 12 3z"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="truncate">{current.shortLabel}</span>
        <span
          aria-hidden="true"
          className={`text-[9px] leading-none text-neutral-500 transition-transform duration-200 ease-out ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="h-2.5 w-2.5"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              aria-label="Site language"
              style={anchor ? { right: `${anchor.right}px` } : undefined}
              className="fixed right-0 top-14 z-[70] mt-2 flex w-56 flex-col gap-1 rounded-xl border border-neutral-800 bg-neutral-950/95 p-1.5 shadow-2xl backdrop-blur-2xl"
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
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-mono text-xs transition-colors ${
                      active
                        ? "bg-emerald-500/10 font-semibold text-emerald-400 ring-1 ring-emerald-500/30"
                        : "cursor-pointer text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                    }`}
                  >
                    <span className="truncate">{meta.nativeName}</span>
                    <span
                      className={`shrink-0 pl-2 text-[11px] ${
                        active ? "text-emerald-400/80" : "text-neutral-600"
                      }`}
                    >
                      {code === "en" ? "EN" : code === "fil" ? "FIL" : code.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}