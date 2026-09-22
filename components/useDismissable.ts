"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared state for the header's dropdown menus (language + corridor
 * selectors). Mirrors native `menu` dismissal: an outside pointer-down or an
 * Escape keypress closes the panel, so browse-with-keyboard / browse-with-tap
 * behaviour feels platform-native.
 */
export function useDismissable() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
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

  return { open, setOpen, containerRef };
}