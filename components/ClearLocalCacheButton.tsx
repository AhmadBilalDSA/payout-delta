"use client";

import { useEffect, useState } from "react";

import { purgeAllLocalData } from "@/lib/privacyGuard";

/**
 * Phase S3 — "Clear Local Cache" privacy control (client island).
 *
 * Under the feature's zero-server guarantee every record the suite keeps —
 * invoice drafts, calculator bank-sync payloads, the remittance/tax ledger,
 * PRC letter shells, rate watchlist alerts, addendum particulars, plus theme
 * and language preferences — lives only in this browser's `localStorage` (and
 * one `sessionStorage` marker) under the `payoutdelta:*` namespace.
 *
 * This button performs a hard purge of every key prefixed `payoutdelta` (both
 * the new `payoutdelta:` namespaced entries and legacy spellings) and reports
 * how many entries were removed. It never touches the cookie jar, so a single
 * "clear" wipes the cached remittance history this device holds without
 * affecting the signed-in session elsewhere — leaving the visitor fully in
 * control of the on-device financial footprint.
 */

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export default function ClearLocalCacheButton() {
  const [cleared, setCleared] = useState<number | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(
    () => () => {
      if (toastTimer !== null) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }
    },
    []
  );

  const handleClear = () => {
    const count = purgeAllLocalData();
    setWorking(true);
    setCleared(count);
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      setCleared(null);
      setWorking(false);
    }, 4000);
  };

  if (cleared !== null || working) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="flex max-w-[15rem] items-start gap-1.5 text-[11px] leading-snug text-emerald-600 dark:text-emerald-400"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          OK — {cleared ?? 0} stored {cleared === 1 ? "entry" : "entries"} cleared
          from this browser. Fresh start.
        </span>
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClear}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/45 transition-colors duration-200 ease-out hover:text-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="h-3.5 w-3.5"
      >
        <path
          fillRule="evenodd"
          d="M9 2a1 1 0 0 0-.917.597l-.441 1.103A3.995 3.995 0 0 0 5 7v8H4a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2h-1V7a3.995 3.995 0 0 0-2.642-3.3l-.441-1.103A1 1 0 0 0 11 2H9Zm3.236 3H7.764l.228-.57a1 1 0 0 1 .917-.597h2.182a1 1 0 0 1 .917.597l.228.57ZM7 8.5a.5.5 0 0 1 1 0v5a.5.5 0 0 1-1 0v-5Zm3.5-.5a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5Zm2.5.5a.5.5 0 0 1 1 0v5a.5.5 0 0 1-1 0v-5Z"
          clipRule="evenodd"
        />
      </svg>
      Clear Local Cache
    </button>
  );
}