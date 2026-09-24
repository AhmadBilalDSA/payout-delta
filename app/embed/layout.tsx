import type { ReactNode } from "react";

/**
 * Embed route shell — isolates the widget iframe from the site chrome so a
 * publisher embedding PayoutDelta sees only the corridor card. CSS rules in a
 * nested layout target the whole document (they are not scoped to the element
 * they render from), so hiding the sticky header, the market-status aside and
 * the footer needs zero client JS. The selectors match the exact elements
 * `Header`, `MarketStatusBar` and `Footer` render; the widget card itself
 * never uses `<header>` / `<aside>` / `<footer>` elements, so it is untouched.
 */
export default function EmbedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex w-full min-w-0 flex-col">
      {children}
      {/* Document-global chrome suppression: the nodes still exist in the server
          HTML (SEO-safe) but collapse to nothing inside the widget viewport. */}
      <style>{`header, footer, aside[aria-label="Market data status"] { display: none !important; }`}</style>
    </div>
  );
}