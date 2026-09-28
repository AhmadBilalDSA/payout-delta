"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Direct CSS property update, zero React state re-renders
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={cn(
        "spotlight-hover relative overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950/80",
        className
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media (hover: hover) {
          .spotlight-hover:hover > .spotlight-glow {
            opacity: 1;
          }
        }
      `}} />
      <div 
        className="spotlight-glow pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 z-0"
        style={{
          background: "radial-gradient(380px circle at var(--mouse-x, -200px) var(--mouse-y, -200px), rgba(16, 185, 129, 0.08), transparent 80%)",
        }}
      />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
