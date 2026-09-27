"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

/**
 * Phase 2 — the header's shared overlay layer.
 *
 * The utility bar owns three independent popovers (corridor selector, settlement
 * currency, language). Each one manages its own open state, but they all need to
 * agree on two things a single component cannot own locally:
 *
 *   1. IS ANY MENU OPEN? — the Header paints one click-scrim behind whichever
 *      menu is active. Without a shared signal the scrim would have to be
 *      duplicated inside every popover, and the popovers would keep fighting the
 *      dock for the same visual layer.
 *   2. WHERE DOES THE PANEL GO? — a panel lifted out of the header (see below)
 *      must stay glued to its trigger on scroll and resize, which needs the
 *      trigger's live viewport rectangle.
 *
 * WHY THE PANELS ARE PORTALLED
 * The header is `sticky top-0 z-40`, so it owns a stacking context: everything
 * inside it is painted as a single z-40 layer. A scrim rendered as a sibling of
 * the header (z-60) would therefore cover its own menu, and any menu that stayed
 * inside the header could never sit above a viewport-wide scrim. Lifting both the
 * scrim and the panel to `document.body` puts them in the root stacking context
 * where the order is unambiguous: dock (z-30) < scrim (z-60) < menu (z-70).
 *
 * Registration is token-based rather than a bare counter so an unmounting or
 * double-invoked effect can never leak a phantom "open" state into the count.
 */

/** Viewport inset kept between a panel and the window edge. */
const VIEWPORT_GUTTER = 8;

/** Fallback panel width used for clamping before the trigger is measured. */
const DEFAULT_PANEL_WIDTH = 208;

type Listener = () => void;

const listeners = new Set<Listener>();
const openTokens = new Set<symbol>();
let activeSnapshot = false;

function emit() {
  const next = openTokens.size > 0;
  if (next === activeSnapshot) return;
  activeSnapshot = next;
  for (const listener of listeners) listener();
}

/** `useSyncExternalStore` contract: one subscription per mounted header. */
function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getActiveSnapshot = () => activeSnapshot;

/** The static export renders no scrim, so the server snapshot is always false. */
const getServerSnapshot = () => false;

/** Marks one popover as open for as long as the returned token is registered. */
export function openHeaderDropdown(token: symbol) {
  openTokens.add(token);
  emit();
}

/** Releases a token registered by `openHeaderDropdown`. */
export function closeHeaderDropdown(token: symbol) {
  if (openTokens.delete(token)) emit();
}

/**
 * True while at least one header popover is open. Always `false` on the server
 * and on the first client paint, so the static export never ships a scrim.
 *
 * `useSyncExternalStore` is deliberate: the open/closed signal lives in a module
 * store outside React, and subscribing through the store API is what lets a
 * popover toggle the scrim without a `setState`-in-effect cascade render.
 */
export function useHeaderDropdownActive(): boolean {
  return useSyncExternalStore(subscribe, getActiveSnapshot, getServerSnapshot);
}

/** Viewport rectangle of a popover panel, in CSS pixels. */
export interface MenuAnchor {
  /** Distance from the left viewport edge to the panel's left edge. */
  left: number;
  /** Distance from the right viewport edge to the panel's right edge. */
  right: number;
}

/**
 * Keeps a portalled panel glued to its trigger.
 *
 * `width` is the panel's CSS width so the panel can be clamped inside the
 * viewport before it is painted — on a narrow window an unclamped 480px corridor
 * menu would otherwise push a horizontal scrollbar onto the document. Returns
 * `null` until the trigger has been measured, so callers can keep a class-based
 * position for the first frame.
 */
export function useMenuAnchor(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  width: number = DEFAULT_PANEL_WIDTH
): MenuAnchor | null {
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);

  useEffect(() => {
    if (!open) return;

    const measure = () => {
      const element = containerRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const panelWidth = Math.min(width, window.innerWidth - VIEWPORT_GUTTER * 2);
      const left = Math.min(
        Math.max(VIEWPORT_GUTTER, rect.left),
        Math.max(VIEWPORT_GUTTER, window.innerWidth - panelWidth - VIEWPORT_GUTTER)
      );
      setAnchor({ left, right: Math.max(0, window.innerWidth - rect.right) });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, containerRef, width]);

  // Derived rather than reset: a closed menu has no panel to position, so the
  // last measurement is held in state and masked here. That keeps the "no
  // panel, no anchor" contract without a `setState` inside the effect body.
  return open ? anchor : null;
}
