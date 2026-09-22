import type { UiKey } from "@/lib/i18n/dictionaries";

/**
 * PayoutDelta — i18n helpers.
 *
 * Near-verbatim product names (Upwork, Fiverr) are still catalogued so the
 * switcher can label the "Direct Client Invoice" mode in each language; this
 * maps a `data/fees.json` platform id onto the UiKey used everywhere the UI
 * renders a platform name.
 */
export function platformUiKey(id: string): UiKey {
  if (id === "upwork") return "upwork";
  if (id === "fiverr") return "fiverr";
  return "directClient";
}