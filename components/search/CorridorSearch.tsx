/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface SearchEntry {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  url: string;
  keywords: string[];
  meta?: {
    flag?: string;
    shaDeduction?: number;
    rail?: string;
  };
}

export function CorridorSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/payout-delta/api/search-index.json")
        .then((r) => r.json())
        .then((data) => setIndex(data))
        .catch(console.error);
      
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = index.map(item => {
      let score = 0;
      const searchText = [
        item.title,
        item.subtitle,
        item.badge,
        ...(item.keywords || [])
      ].join(" ").toLowerCase();
      
      for (const term of terms) {
        if (searchText.includes(term)) {
          score += 1;
          if (item.title.toLowerCase().startsWith(term) || item.keywords?.some(k => k.toLowerCase().startsWith(term))) {
            score += 2;
          }
        }
      }
      return { item, score };
    });
    
    return scored
      .filter(x => x.score >= terms.length)
      .sort((a, b) => b.score - a.score)
      .map(x => x.item)
      .slice(0, 8);
  }, [query, index]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].url);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 sm:pt-32 px-4 bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-xl bg-[#0c0c0c] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden font-sans ring-1 ring-white/10">
        <div className="flex items-center px-4 py-3 border-b border-zinc-800/80">
          <svg className="w-5 h-5 text-emerald-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none"
            placeholder="Search corridors (e.g. 'Pakistan', 'EUR', 'CHASUS33', 'PIX')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xs font-mono px-1.5 py-0.5 rounded border border-zinc-800">
            ESC
          </button>
        </div>

        {query && results.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">
            No matching nodes or jurisdictions found.
          </div>
        )}

        {results.length > 0 && (
          <ul className="max-h-[60vh] overflow-y-auto p-2">
            {results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isCorridor = item.badge === "Corridor";
              
              return (
                <li key={item.id}>
                  <Link
                    href={item.url}
                    onClick={onClose}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isSelected ? "bg-emerald-950/40 border border-emerald-900/50" : "hover:bg-zinc-900/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isCorridor && item.meta?.flag ? (
                        <div className="w-8 h-6 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded text-xs font-mono shadow-sm">
                          {item.meta.flag}
                        </div>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold ${isSelected ? "text-emerald-400" : "text-zinc-200"}`}>
                          {item.title}
                        </span>
                        <span className="text-xs text-zinc-500">{item.subtitle}</span>
                      </div>
                    </div>
                    
                    {isCorridor && item.meta && (
                      <div className="flex flex-col items-end gap-1">
                        {item.meta.shaDeduction !== undefined && (
                          <span className="text-[10px] font-mono tabular-nums text-rose-400 font-medium">
                            SHA -${(item.meta.shaDeduction).toFixed(2)}
                          </span>
                        )}
                        {item.meta.rail && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {item.meta.rail}
                          </span>
                        )}
                      </div>
                    )}
                    {!isCorridor && (
                      <span className="text-[10px] font-mono tracking-wide text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/50">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        
        {!query && (
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/50 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
            <span>Powered by pure client-side deterministic matching</span>
            <span className="flex items-center gap-1">
              Navigate <kbd className="px-1 border border-zinc-800 rounded bg-zinc-900 text-zinc-400">↑</kbd> <kbd className="px-1 border border-zinc-800 rounded bg-zinc-900 text-zinc-400">↓</kbd>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function GlobalSearchTrigger({
  onClick,
  className = "",
  standalone = false,
}: {
  onClick?: () => void;
  className?: string;
  standalone?: boolean;
}) {
  const handleClick = () => {
    if (onClick) onClick();
    window.dispatchEvent(new CustomEvent('open-global-search'));
  };

  useEffect(() => {
    if (standalone) return; // Don't attach keydown if it's just a button meant to trigger the event
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        handleClick();
      } else if (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClick, standalone]);

  return (
    <button 
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 transition-colors group ${className}`}
    >
      <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="text-[11px] font-medium text-zinc-400">Search corridors...</span>
      <div className="flex items-center gap-0.5 ml-2">
        <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 h-5 text-[9px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 rounded shadow-sm">Ctrl</kbd>
        <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 h-5 text-[9px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 rounded shadow-sm">K</kbd>
      </div>
    </button>
  );
}
