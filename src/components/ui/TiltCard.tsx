"use client";

import { useEffect, useRef, useState } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltIntensity?: number;
  perspective?: number;
  scaleOnHover?: number;
  glowColor?: string;
}

/**
 * 3D tilt card with parallax effect.
 * Inspired by transitions.dev's "Credit VISA" 3D tilt demo.
 * Only activates on pointer devices (desktop).
 */
export default function TiltCard({
  children,
  className = "",
  tiltIntensity = 8,
  perspective = 1000,
  scaleOnHover = 1.02,
  glowColor = "rgba(16, 185, 129, 0.15)",
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const hasPointer = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

  useEffect(() => {
    if (!hasPointer || !cardRef.current) return;

    const card = cardRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -tiltIntensity;
      const rotateY = ((x - centerX) / centerX) * tiltIntensity;

      setTransform(
        `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scaleOnHover}, ${scaleOnHover}, ${scaleOnHover})`
      );
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
      setIsHovered(false);
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hasPointer, tiltIntensity, perspective, scaleOnHover]);

  return (
    <div
      ref={cardRef}
      className={`relative transition-transform duration-300 ease-out ${className}`}
      style={{
        transform,
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* Glow overlay on hover */}
      {isHovered && hasPointer && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}, transparent 70%)`,
            opacity: 0.6,
          }}
        />
      )}
      <div style={{ transform: "translateZ(20px)" }}>{children}</div>
    </div>
  );
}
