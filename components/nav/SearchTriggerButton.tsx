"use client";

import { useEffect, useState } from "react";

export default function SearchTriggerButton() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-omnibar"))}
      className="hidden sm:flex items-center gap-2 rounded-full border border-neutral-800/80 bg-neutral-900/50 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors"
      aria-label="Open search"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <span>Quick Search...</span>
      <kbd className="ml-2 rounded border border-neutral-800 bg-neutral-900 px-1.5 font-sans text-[10px] text-neutral-500">
        {isMac ? "⌘ K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
