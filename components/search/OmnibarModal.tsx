"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  url: string;
  keywords: string[];
}

export default function OmnibarModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    
    const handleOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-omnibar", handleOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-omnibar", handleOpen);
    };
  }, [isOpen]);

  // Fetch index on first open
  useEffect(() => {
    if (isOpen && index.length === 0 && !loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      fetch("/payout-delta/api/search-index.json")
        .then((res) => res.json())
        .then((data) => {
          setIndex(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load search index", err);
          setLoading(false);
        });
    }
    
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      setQuery("");
      setActiveIndex(0);
      document.body.style.overflow = "";
    }
  }, [isOpen, index.length, loading]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    
    const results = index.filter((item) => {
      const target = [item.title, item.subtitle, item.badge, ...item.keywords].join(" ").toLowerCase();
      return terms.every((term) => target.includes(term));
    });

    return results.slice(0, 12);
  }, [query, index]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) {
        setIsOpen(false);
        router.push(target.url);
      }
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 pb-8 px-4 sm:px-6"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden="true" />
      
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl ring-1 ring-white/10 flex flex-col">
        {/* Search Input */}
        <div className="flex items-center border-b border-neutral-800 px-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 mr-3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent py-4 text-neutral-100 outline-none placeholder-neutral-500"
            placeholder="Search banks, jurisdictions, corridors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={filtered.length > 0}
            aria-controls="search-results"
            aria-activedescendant={filtered.length > 0 ? `search-item-${filtered[activeIndex]?.id}` : undefined}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="rounded p-1 hover:bg-neutral-800 text-neutral-400"
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="ml-2 rounded p-1 text-xs font-medium text-neutral-500 hover:text-neutral-300 border border-neutral-800 px-1.5 hidden sm:block">
            ESC
          </button>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="flex-1 overflow-y-auto p-2" id="search-results" role="listbox">
            {filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-neutral-500">
                {loading ? "Loading index..." : "No results found."}
              </div>
            ) : (
              filtered.map((item, i) => (
                <div
                  key={item.id}
                  id={`search-item-${item.id}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onClick={() => {
                    setIsOpen(false);
                    router.push(item.url);
                  }}
                  onMouseMove={() => setActiveIndex(i)}
                  className={`flex cursor-pointer select-none items-center justify-between rounded-lg px-4 py-3 ${
                    i === activeIndex ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50" : "text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">{item.title}</span>
                    <span className="font-mono tabular-nums text-xs text-neutral-500">
                      {item.subtitle}
                    </span>
                  </div>
                  <span className="rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
                    {item.badge}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Helper footer */}
        {!query.trim() && (
          <div className="px-4 py-6 text-center text-sm text-neutral-500">
            Start typing to search across 266 banks, 195 jurisdictions, and 208 corridors.
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
