"use client";

import { useEffect, useRef, useState } from "react";

import type { Corridor } from "@/lib/types";

/** GitHub Pages origin the published static export is served from — the host
 * written into the copied snippet so the iframe renders the widget on any
 * third-party origin (the embed card itself is cross-origin, so a relative
 * URL would break outside this site). */
const EMBED_ORIGIN = "https://ahmadbilaldsa.github.io/payout-delta";

interface EmbedSnippetModalProps {
  open: boolean;
  onClose: () => void;
  corridor: Corridor;
}

/**
 * Embeddable widget snippet generator — a live preview of the static
 * `app/embed/[corridor]` card next to the one-line HTML iframe snippet it is
 * served from, with a 1-click copy action and a 2.5s "✓ Copied" toast.
 *
 * Mount strategy mirrors `PrcLetterModal`: the shell returns `null` until open,
 * then mounts the dialog; Escape or backdrop click dismisses. The snippet is a
 * fixed HTML string (never user input), so no sanitization is needed.
 */
export default function EmbedSnippetModal({
  open,
  onClose,
  corridor,
}: EmbedSnippetModalProps) {
  if (!open) {
    return null;
  }
  return <EmbedSnippetDialog corridor={corridor} onClose={onClose} />;
}

function EmbedSnippetDialog({
  corridor,
  onClose,
}: {
  corridor: Corridor;
  onClose: () => void;
}) {
  const embedUrl = `${EMBED_ORIGIN}/embed/${corridor.slug}/`;
  const snippet = `<iframe src="${embedUrl}" width="380" height="220" frameborder="0" scrolling="no" style="border-radius:12px;overflow:hidden;"></iframe>`;
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    },
    []
  );

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippet);
      } else {
        fallbackCopy(snippet);
      }
    } catch {
      fallbackCopy(snippet);
    }
    setCopied(true);
    if (copiedTimer.current !== null) {
      window.clearTimeout(copiedTimer.current);
    }
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Embed PayoutDelta corridor widget"
    >
      <div
        className="relative my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[#F5F5F7] px-5 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              Embed This Corridor
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white/45">
              {corridor.from} → {corridor.to} live payout widget snippet
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss embed widget dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 ease-out hover:bg-black/5 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid items-start gap-5 p-5 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Live Preview
            </span>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <iframe
                src={embedUrl}
                width="100%"
                style={{ height: 220 }}
                title={`${corridor.from}→${corridor.to} PayoutDelta widget preview`}
                loading="lazy"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
              The card renders the same active rate, SWIFT intermediary cut and
              net take-home figures as the full {corridor.from}→{corridor.to}{" "}
              audit — automatically refreshed as the dataset updates.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              HTML Embed Code
            </span>
            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed text-slate-800 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200">
              <code>{snippet}</code>
            </pre>
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-live="polite"
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] ${
                copied
                  ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "border-black/[0.12] bg-white text-slate-700 hover:border-black/25 hover:bg-neutral-50 dark:border-white/15 dark:bg-zinc-900 dark:text-white/80 dark:hover:border-white/25 dark:hover:bg-zinc-800"
              }`}
            >
              {copied ? "✓ Copied" : "Copy Embed Code"}
            </button>
            <p className="text-[11px] leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
              Paste into any site — portfolio, client dashboard, an issue
              tracker. The widget is a static card with no scripts or tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Clipboard fallback for contexts without the async Clipboard API. */
function fallbackCopy(text: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // Clipboard unavailable — the snippet stays visible to copy by hand.
  }
  document.body.removeChild(textarea);
}