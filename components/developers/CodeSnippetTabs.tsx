"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Developer Data Hub — copyable code snippet tabs.
 *
 * Client island (the page itself stays a static server component) that renders
 * one language-tabbed code sample group (cURL / TypeScript fetch / Python
 * requests) with a copy button. Copying flashes a fixed "✓ Copied" toast for
 * exactly 2.5s. Zero third-party runtime deps:
 *
 *   - `navigator.clipboard.writeText` when the context is secure,
 *   - legacy `document.execCommand("copy")` fallback (static export / http).
 *
 * Code blocks keep `overflow-x-auto` + `whitespace-pre` so long commands scroll
 * horizontally inside their card without ever stretching the page layout.
 */

export type SnippetLang = "curl" | "ts" | "python";

export interface SnippetTab {
  key: SnippetLang;
  label: string;
}

export const SNIPPET_TABS: readonly SnippetTab[] = [
  { key: "curl", label: "cURL" },
  { key: "ts", label: "TypeScript / Fetch" },
  { key: "python", label: "Python" },
] as const;

const TOAST_MS = 2500;

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path below.
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

interface CodeSnippetTabsProps {
  /** Fixed set of code samples keyed per tab. */
  samples: Record<SnippetLang, string>;
  /** sr-only label for the tablist (defaults to "Code example"). */
  label?: string;
}

export default function CodeSnippetTabs({
  samples,
  label = "Code example",
}: CodeSnippetTabsProps) {
  const [activeLang, setActiveLang] = useState<SnippetLang>("curl");
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    const ok = await copyText(samples[activeLang]);
    if (!ok) {
      return;
    }
    setCopied(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setCopied(false), TOAST_MS);
  }

  const active = samples[activeLang];

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={label}
          className="flex flex-wrap items-center gap-2"
        >
          {SNIPPET_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeLang === tab.key}
              onClick={() => setActiveLang(tab.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 ease-out ${
                activeLang === tab.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white dark:bg-white/[0.08] dark:text-white/70 dark:hover:bg-white/[0.14]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors duration-150 ease-out hover:border-emerald-500/50 hover:text-white"
        >
          <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre
        role="tabpanel"
        aria-label={`${label} — ${activeLang}`}
        className="mt-3 max-w-full overflow-x-auto overflow-y-auto rounded-lg border border-slate-800/60 bg-[#0B0B0F] p-4 font-mono text-xs leading-relaxed text-emerald-200 shadow-inner"
        style={{ tabSize: 2 }}
      >
        <code className="whitespace-pre">{active}</code>
      </pre>

      {copied && (
        <p
          role="status"
          aria-live="polite"
          data-copy-toast
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-[#0F172A] px-4 py-2 text-sm font-semibold text-emerald-300 shadow-apple"
        >
          ✓ Copied
        </p>
      )}
    </div>
  );
}