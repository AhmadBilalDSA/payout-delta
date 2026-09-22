"use client";

import Link from "next/link";
import { useState } from "react";

interface CorridorOption {
  slug: string;
  from: string;
  to: string;
}

const TOP_CORRIDORS: readonly CorridorOption[] = [
  { slug: "usd-to-pkr", from: "USD", to: "PKR" },
  { slug: "usd-to-inr", from: "USD", to: "INR" },
  { slug: "usd-to-php", from: "USD", to: "PHP" },
] as const;

/**
 * Native iOS-style segmented capsule for the hero. Each segment is a
 * zero-reload `<Link>` into its static calculator page; the active segment
 * rides on pointer-down / focus so the highlight always predicts the
 * destination corridor.
 */
export default function CorridorSelector() {
  const [activeSlug, setActiveSlug] = useState<string>(TOP_CORRIDORS[0].slug);

  return (
    <div
      role="group"
      aria-label="Active currency corridor"
      className="inline-flex gap-1 rounded-full bg-[#E5E5EA] p-1 dark:bg-white/[0.12]"
    >
      {TOP_CORRIDORS.map((corridor) => {
        const isActive = activeSlug === corridor.slug;
        return (
          <Link
            key={corridor.slug}
            href={`/calculator/${corridor.slug}`}
            aria-current={isActive ? "true" : undefined}
            onMouseDown={() => setActiveSlug(corridor.slug)}
            onFocus={() => setActiveSlug(corridor.slug)}
            className={`rounded-full px-4 py-2 text-sm font-medium tabular-nums transition-all duration-200 ease-out ${
              isActive
                ? "bg-white text-slate-900 shadow-sm dark:bg-[#15151A] dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
            }`}
          >
            {corridor.from}
            <span aria-hidden="true" className="mx-0.5 text-slate-400 dark:text-white/40">
              →
            </span>
            {corridor.to}
          </Link>
        );
      })}
    </div>
  );
}