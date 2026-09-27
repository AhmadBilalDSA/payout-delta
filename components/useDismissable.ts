"use client";

import { useEffect, useRef, useState } from "react";

import { closeHeaderDropdown, openHeaderDropdown } from "@/components/headerDropdownLayer";

/**
 * Shared state for the header's dropdown menus (language + corridor
 * selectors). Mirrors native `menu` dismissal: an outside pointer-down or an
 * Escape keypress closes the panel, so browse-with-keyboard / browse-with-tap
 * behaviour feels platform-native.
 *
 * The open state is also published to the shared header overlay layer, which is
 * what lets the Header paint a single click-scrim behind whichever menu is
 * active. A per-instance token means two menus in the same header (or the same
 * menu re-mounted by a route change) can never leave a phantom scrim behind.
 *
 * `panelRef` is for a panel that is portalled out of `containerRef` (the
 * corridor menu, which must clear the header's stacking context). Without it a
 * pointer-down on the panel reads as an outside click, so a long list could not
 * be scrolled with the pointer. Attach it to the portalled element; the
 * container-only callers can ignore it.
 */
export function useDismissable() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const layerToken = useRef<symbol>(Symbol("header-dropdown"));

  useEffect(() => {
    if (!open) return;
    const token = layerToken.current;
    openHeaderDropdown(token);
    return () => closeHeaderDropdown(token);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      const insideTrigger = containerRef.current?.contains(event.target) ?? false;
      const insidePanel = panelRef.current?.contains(event.target) ?? false;
      if (!insideTrigger && !insidePanel) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { open, setOpen, containerRef, panelRef };
}