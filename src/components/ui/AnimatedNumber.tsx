"use client";

import { useEffect, useRef, useState, useMemo } from "react";

/**
 * Animated number display with pop-in + counting animation.
 * Inspired by transitions.dev's "65.78 Animate" — a digit pop-in with
 * blur-to-sharp transition and staggered reveal.
 *
 * Usage:
 *   <AnimatedNumber value={corridor.rate} decimals={4} className="..." />
 */
export default function AnimatedNumber({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  className = "",
  duration = 600,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef<number | null>(null);

  const formatted = useMemo(
    () =>
      displayValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [displayValue, decimals]
  );

  // Split into integer and fractional parts for rendering
  const parts = formatted.split(".");
  const intPart = parts[0];
  const fracPart = parts[1] ?? "";

  useEffect(() => {
    if (value === prevValueRef.current) return;

    const startValue = prevValueRef.current;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        prevValueRef.current = value;
        setIsAnimating(false);
      }
    };

    setIsAnimating(true);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  return (
    <span className={`inline-flex items-baseline font-mono tabular-nums ${className}`}>
      {prefix && <span className="text-current/70">{prefix}</span>}
      <span
        className={`inline-flex items-baseline transition-[opacity,filter] duration-300 ${
          isAnimating ? "opacity-80" : "opacity-100"
        }`}
        style={isAnimating ? { filter: "blur(1px)" } : { filter: "none" }}
      >
        {/* Integer part with staggered digit animation */}
        <span className="inline-flex">
          {intPart.split("").map((digit, i) => (
            <span
              key={`${intPart}-${i}`}
              className={`inline-block transition-all duration-300 ${
                isAnimating
                  ? "opacity-0 translate-y-1"
                  : "opacity-100 translate-y-0"
              }`}
              style={{
                transitionDelay: `${i * 30}ms`,
              }}
            >
              {digit === "," ? (
                <span className="mx-0.5 text-current/50">,</span>
              ) : (
                digit
              )}
            </span>
          ))}
        </span>
        {decimals > 0 && (
          <>
            <span className="text-current/60">.</span>
            <span className="inline-flex">
              {fracPart.split("").map((digit, i) => (
                <span
                  key={`${fracPart}-${i}`}
                  className={`inline-block transition-all duration-300 ${
                    isAnimating
                      ? "opacity-0 translate-y-1"
                      : "opacity-100 translate-y-0"
                  }`}
                  style={{
                    transitionDelay: `${(intPart.length + i) * 30 + 100}ms`,
                  }}
                >
                  {digit}
                </span>
              ))}
            </span>
          </>
        )}
      </span>
      {suffix && <span className="ml-1 text-current/60 text-sm">{suffix}</span>}
    </span>
  );
}
