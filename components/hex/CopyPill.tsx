"use client";

import React, { useState, useCallback } from "react";
const FIGURE = "font-mono tabular-nums";

export function CopyPill({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (copied) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  }, [code, copied]);

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={[
        "group relative inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        copied 
          ? "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800",
        className || "",
        FIGURE
      ].filter(Boolean).join(" ")}
      aria-label={`Copy ${code}`}
    >
      <span>{code}</span>
      <div className="relative h-3 w-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 h-3 w-3 transition-transform duration-200 ease-out ${
            copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 h-3 w-3 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ease-out ${
            copied ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
