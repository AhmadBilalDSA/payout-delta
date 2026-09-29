"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { playClick } from "@/lib/sound";

export function KeyboardDock() {
  const router = useRouter();

  useEffect(() => {
    let gPressed = false;
    let timer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        playClick();
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.focus();
        } else {
          // If no search input is found on screen, redirect to search/home or trigger modal.
          // For now, we fallback to focusing body.
          document.body.focus();
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        gPressed = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          gPressed = false;
        }, 1000);
        return;
      }

      if (gPressed) {
        let matched = false;
        switch (e.key.toLowerCase()) {
          case "h":
            router.push("/");
            matched = true;
            break;
          case "m":
            router.push("/matrix/");
            matched = true;
            break;
          case "r":
            router.push("/router/");
            matched = true;
            break;
          case "e":
            router.push("/export/");
            matched = true;
            break;
        }

        if (matched) {
          e.preventDefault();
          playClick();
          gPressed = false;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 px-4 py-2 bg-[#090909]/95 hairline-border-t backdrop-blur-md select-none print:hidden">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: System Identity & Status Indicator */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <span className="inline-block w-2 h-2 rounded-sm bg-emerald-400"></span>
            <span>SOVEREIGN HUD CORE v2.8</span>
          </span>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline tabular-nums">HASH: 0x8a7f99c2b4e83a91</span>
        </div>

        {/* Center: Floating Bottom Dock Accessible Hotkey Badges */}
        <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 text-[11px] font-mono scrollbar-hide">
          <button onClick={() => { playClick(); router.push("/"); }} className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 hairline-border hover:border-zinc-500 text-zinc-300 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500">
            <span className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">G</span>
            <span className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">H</span>
            <span className="text-zinc-400 font-medium">Home</span>
          </button>

          <button onClick={() => { playClick(); router.push("/matrix/"); }} className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 hairline-border hover:border-zinc-500 text-zinc-300 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500">
            <span className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">G</span>
            <span className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">M</span>
            <span className="text-zinc-400 font-medium">Matrix</span>
          </button>

          <button onClick={() => { playClick(); router.push("/router/"); }} className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 hairline-border hover:border-zinc-500 text-zinc-300 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500">
            <span className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">G</span>
            <span className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">R</span>
            <span className="text-zinc-400 font-medium">Router</span>
          </button>

          <button onClick={() => { playClick(); router.push("/export/"); }} className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 hairline-border hover:border-zinc-500 text-zinc-300 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500">
            <span className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">G</span>
            <span className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">E</span>
            <span className="text-zinc-400 font-medium">Export</span>
          </button>

          <button onClick={() => { playClick(); document.getElementById("search-input")?.focus(); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 hairline-border border-zinc-700 text-zinc-200 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500">
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">/</span>
            <span className="text-zinc-300 font-semibold">Search</span>
          </button>
        </nav>

        {/* Right: Friction Level Key */}
        <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <span className="text-zinc-500">FRICTION TIERS:</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> &lt;5 bps</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 5-30 bps</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> &gt;30 bps</span>
        </div>
      </div>
    </footer>
  );
}
