"use client";

import { useEffect, useRef, useState } from "react";

interface SkeletonShimmerProps {
  className?: string;
  rows?: number;
  shimmer?: boolean;
  width?: string;
}

/**
 * Skeleton loader with shimmer animation.
 * Inspired by transitions.dev's "Jane Cooper" skeleton pattern.
 */
export default function SkeletonShimmer({
  className = "",
  rows = 3,
  shimmer = true,
  width = "100%",
}: SkeletonShimmerProps) {
  return (
    <div className={className} style={{ width }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`mb-2 last:mb-0 rounded-md ${
            shimmer
              ? "bg-zinc-800/60 relative overflow-hidden"
              : "bg-zinc-800/40"
          }`}
          style={{ height: `${12 + (i % 3) * 4}px` }}
        >
          {shimmer && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
              style={{
                animationDuration: "1.5s",
                animationIterationCount: "infinite",
                transform: `translateX(-${i * 20}%)`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Tailwind arbitrary value for the shimmer animation */
export const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
`;
