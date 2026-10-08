"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  group: "corridor" | "tool" | "preset";
  url?: string;
  action?: () => void;
}

const COMMANDS: CommandItem[] = [
  // Top Corridors
  { id: "usd-pkr", title: "USD → PKR", subtitle: "Pakistan · SWIFT & statutory tax", group: "corridor", url: "/calculator/usd-to-pkr/" },
  { id: "usd-inr", title: "USD → INR", subtitle: "India · Section 195 withholding", group: "corridor", url: "/calculator/usd-to-inr/" },
  { id: "usd-php", title: "USD → PHP", subtitle: "Philippines · BIR compliance", group: "corridor", url: "/calculator/usd-to-php/" },
  { id: "eur-pkr", title: "EUR → PKR", subtitle: "Pakistan · SECP cross-border", group: "corridor", url: "/calculator/eur-to-pkr/" },
  { id: "gbp-kes", title: "GBP → KES", subtitle: "Kenya · KRA tax guidelines", group: "corridor", url: "/calculator/gbp-to-kes/" },
  { id: "usd-gbp", title: "USD → GBP", subtitle: "UK · FCA remittance rules", group: "corridor", url: "/calculator/usd-to-gbp/" },
  { id: "usd-eur", title: "USD → EUR", subtitle: "Eurozone · SEPA corridors", group: "corridor", url: "/calculator/usd-to-eur/" },
  { id: "usd-brl", title: "USD → BRL", subtitle: "Brazil · IOF tax regime", group: "corridor", url: "/calculator/usd-to-brl/" },
  { id: "usd-ngn", title: "USD → NGN", subtitle: "Nigeria · CBN forex controls", group: "corridor", url: "/calculator/usd-to-ngn/" },
  { id: "usd-zar", title: "USD → ZAR", subtitle: "South Africa · SARS reporting", group: "corridor", url: "/calculator/usd-to-zar/" },
  { id: "usd-bdt", title: "USD → BDT", subtitle: "Bangladesh · RBI remittance", group: "corridor", url: "/calculator/usd-to-bdt/" },
  { id: "usd-egp", title: "USD → EGP", subtitle: "Egypt · CBE forex rules", group: "corridor", url: "/calculator/usd-to-egp/" },
  { id: "usd-vnd", title: "USD → VND", subtitle: "Vietnam · SBV transfer limits", group: "corridor", url: "/calculator/usd-to-vnd/" },
  // Quick Tools
  { id: "tax-ledger", title: "Statutory Tax Ledger (FBR 154A)", subtitle: "Tax compliance & withholding tracker", group: "tool", url: "/tax-ledger/" },
  { id: "swift-tracer", title: "SWIFT Wire Tracer", subtitle: "Trace intermediary bank fees", group: "tool", url: "/tracer/" },
  { id: "a4-recon", title: "A4 Reconciliation Slip", subtitle: "Export-ready fee breakdown", group: "tool", url: "/invoice/" },
  { id: "reverse-calc", title: "Reverse Calculator", subtitle: "Calculate gross from net target", group: "tool", url: "/reverse-calculator/" },
  { id: "dashboard", title: "Corridor Dashboard", subtitle: "Compare all corridors at once", group: "tool", url: "/dashboard/" },
  { id: "banks", title: "Bank Directory", subtitle: "Browse audited banking partners", group: "tool", url: "/banks/" },
  // Amount Presets
  { id: "preset-1k", title: "Benchmark $1,000", subtitle: "Standard freelance payout", group: "preset", action: () => { window.dispatchEvent(new CustomEvent("command-palette-preset", { detail: 1000 })); } },
  { id: "preset-5k", title: "Benchmark $5,000", subtitle: "Mid-range contract payment", group: "preset", action: () => { window.dispatchEvent(new CustomEvent("command-palette-preset", { detail: 5000 })); } },
  { id: "preset-10k", title: "Benchmark $10,000", subtitle: "Enterprise-scale payout", group: "preset", action: () => { window.dispatchEvent(new CustomEvent("command-palette-preset", { detail: 10000 })); } },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return COMMANDS.filter((cmd) =>
      terms.every((term) =>
        [cmd.title, cmd.subtitle, cmd.group].join(" ").toLowerCase().includes(term)
      )
    );
  }, [query]);

  const handleSelect = useCallback(() => {
    const cmd = filtered[selectedIndex];
    if (!cmd) return;
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
    if (cmd.action) {
      cmd.action();
    } else if (cmd.url) {
      router.push(cmd.url);
    }
  }, [filtered, selectedIndex, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
          e.preventDefault();
          setIsOpen(true);
        }
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", () => setIsOpen(true));
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", () => setIsOpen(true));
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      setQuery("");
      setSelectedIndex(0);
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect();
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
          setQuery("");
        }
      }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="flex items-center border-b border-zinc-800 px-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-500 mr-3 shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent px-0 py-3.5 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none border-none"
            placeholder="Search corridors, tools, presets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="rounded p-1 hover:bg-zinc-800 text-zinc-400 ml-2 shrink-0"
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">No results found.</div>
          ) : (
            filtered.map((cmd, i) => (
              <div
                key={cmd.id}
                role="option"
                aria-selected={i === selectedIndex}
                onClick={handleSelect}
                onMouseMove={() => setSelectedIndex(i)}
                className={`px-3 py-2 rounded-lg text-xs font-mono cursor-pointer flex items-center justify-between transition-colors ${
                  i === selectedIndex
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                }`}
              >
                <span>{cmd.title}</span>
                <span className="text-zinc-500">{cmd.subtitle}</span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="border border-zinc-700 rounded px-1">↑</kbd>
              <kbd className="border border-zinc-700 rounded px-1">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-zinc-700 rounded px-1">↵</kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="border border-zinc-700 rounded px-1">ESC</kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
