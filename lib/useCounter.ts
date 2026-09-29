"use client";

import { useState, useEffect, useRef } from "react";

export function useCounter(targetValue: number, durationMs: number = 240): number {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      setValue(targetValue);
      valueRef.current = targetValue;
      return;
    }

    let startTime: number | null = null;
    const startValue = valueRef.current;
    let reqId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (targetValue - startValue) * ease;
      
      setValue(current);
      valueRef.current = current;

      if (progress < 1) {
        reqId = window.requestAnimationFrame(step);
      } else {
        setValue(targetValue);
        valueRef.current = targetValue;
      }
    };

    reqId = window.requestAnimationFrame(step);
    
    return () => {
      window.cancelAnimationFrame(reqId);
    };
  }, [targetValue, durationMs]);

  return value;
}
