"use client";

import { createPortal } from "react-dom";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { useBaseCurrency } from "@/components/providers/BaseCurrencyProvider";
import { useDismissable } from "@/components/useDismissable";
import { useMenuAnchor } from "@/components/headerDropdownLayer";
import { BASE_CURRENCY_LABELS } from "@/lib/currency";
import type { BaseCurrency } from "@/lib/currency";

/**
 * Settlement-currency switcher — a glassmorphic popover in the header's utility
 * zone.
 *
 * PHASE 2 — NO NATIVE `<select>`
 * The platform control was replaced by a hand-rolled popover so the header keeps
 * one visual language: an OS-rendered dropdown paints its own opaque white list
 * and its own focus ring, which is exactly the mismatch that used to read as a
 * collision in screenshots. The popover is built from the same primitives as
 * every other control here — zero dependencies, inline SVG chevron only.
 *
 * It is portalled to `document.body` and pinned to the trigger's live viewport
 * rectangle (`useMenuAnchor`) so it can sit at `z-[70]`: above the Header's
 * click-scrim (`z-[60]`), which is above the Dock (`z-30`). `panelRef` keeps a
 * pointer-down on the panel from reading as an outside click.
 *
 * Accessibility is preserved rather than traded away: the trigger is a real
 * `button` with `aria-haspopup`/`aria-expanded`, the panel is a `menu` of
 * `menuitemradio` entries, and `Escape` still closes (see `useDismissable`).
 *
 * Presentation only — this re-bases the *display* of USD-authored figures. It
 * never mutates the dataset, and the static-rate caveat is carried on the
 * `title` attribute and in the option labels so a reader can never mistake a
 * converted figure for a live quote.
 */

/** Panel width, mirrored by the anchor clamp. */
const PANEL_WIDTH_PX = 208;

export default function BaseCurrencySwitcher() {
  const { t } = useLanguage();
  const { currency, options, setCurrency, isRebased: rebased } = useBaseCurrency();
  const { open, setOpen, containerRef, panelRef } = useDismissable();
  const anchor = useMenuAnchor(open, containerRef, PANEL_WIDTH_PX);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("baseCurrencySelect")}
        title={rebased ? t("rebasedNotice") : t("baseCurrencyHint")}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
          rebased
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-neutral-800 bg-neutral-900/80 text-neutral-200 hover:border-emerald-500/50 hover:bg-neutral-900"
        }`}
      >
        <span aria-hidden="true" className="opacity-60">
          {t("baseCurrency")}
        </span>
        <span className="font-semibold tabular-nums tracking-tight">
          {currency}
        </span>
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
              aria-label={t("baseCurrencySelect")}
              style={anchor ? { right: `${anchor.right}px` } : undefined}
              className="fixed right-0 top-14 z-[70] mt-2 flex w-52 flex-col gap-1 rounded-xl border border-neutral-800 bg-neutral-950/95 p-1.5 shadow-2xl backdrop-blur-2xl"
            >
              <span
                aria-hidden="true"
                className="px-2.5 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500"
              >
                {t("baseCurrency")}
              </span>
              {options.map((code) => {
                const active = code === currency;
                return (
                  <button
                    key={code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setCurrency(code as BaseCurrency);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 font-mono text-xs transition-colors ${
                      active
                        ? "bg-emerald-500/10 font-semibold text-emerald-400 ring-1 ring-emerald-500/30"
                        : "cursor-pointer text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                    }`}
                  >
                    <span className="truncate">{code}</span>
                    <span
                      className={`truncate pl-2 text-[11px] ${
                        active ? "text-emerald-400/80" : "text-neutral-600"
                      }`}
                    >
                      {BASE_CURRENCY_LABELS[code]}
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
