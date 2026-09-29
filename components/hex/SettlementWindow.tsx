"use client";

import { useEffect, useState } from "react";

const FIGURE = "font-mono tabular-nums";

// A simplistic map of jurisdiction code or currency to their typical clearing timezone and cutoff hour (24h local time).
const CLEARING_RULES: Record<string, { timeZone: string; cutoffHour: number; label: string }> = {
  US: { timeZone: "America/New_York", cutoffHour: 17, label: "Fedwire" },
  UK: { timeZone: "Europe/London", cutoffHour: 16, label: "CHAPS" },
  GB: { timeZone: "Europe/London", cutoffHour: 16, label: "CHAPS" },
  EU: { timeZone: "Europe/Berlin", cutoffHour: 17, label: "TARGET2" },
  AU: { timeZone: "Australia/Sydney", cutoffHour: 16, label: "RBA" },
  CA: { timeZone: "America/Toronto", cutoffHour: 17, label: "Lynx" },
  SG: { timeZone: "Asia/Singapore", cutoffHour: 18, label: "MEPS+" },
  IN: { timeZone: "Asia/Kolkata", cutoffHour: 18, label: "RTGS" },
  AE: { timeZone: "Asia/Dubai", cutoffHour: 15, label: "UAEFTS" },
  JP: { timeZone: "Asia/Tokyo", cutoffHour: 15, label: "BOJ-NET" },
  CN: { timeZone: "Asia/Shanghai", cutoffHour: 17, label: "HVPS" },
  HK: { timeZone: "Asia/Hong_Kong", cutoffHour: 18, label: "CHATS" },
};

// Fallback rule for unmapped regions
const DEFAULT_RULE = { timeZone: "UTC", cutoffHour: 15, label: "Local Clearing" };

export function SettlementWindow({ countryCode }: { countryCode: string }) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"OPEN" | "IMMINENT" | "CLOSED" | "WEEKEND">("CLOSED");
  const [localTime, setLocalTime] = useState("");

  const rule = CLEARING_RULES[countryCode] || DEFAULT_RULE;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    setMounted(true);
    
    const tick = () => {
      const now = new Date();
      
      // We use Intl.DateTimeFormat to parse the time in the target timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone: rule.timeZone,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
        weekday: "short"
      };
      
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(now);
      
      let hour = 0, minute = 0, weekday = "";
      for (const p of parts) {
        if (p.type === "hour") hour = parseInt(p.value, 10);
        if (p.type === "minute") minute = parseInt(p.value, 10);
        if (p.type === "weekday") weekday = p.value;
      }
      
      // In JS Intl, midnight can sometimes be 24, force to 0.
      if (hour === 24) hour = 0;
      
      const timeString = formatter.format(now).split(" ")[1] || `${hour}:${minute}`;
      setLocalTime(timeString);

      // Evaluate logic
      if (weekday === "Sat" || weekday === "Sun") {
        setStatus("WEEKEND");
      } else if (hour >= rule.cutoffHour || hour < 6) { // assuming opens at 6 AM
        setStatus("CLOSED");
      } else if (hour === rule.cutoffHour - 1) { // 1 hour before cutoff
        setStatus("IMMINENT");
      } else {
        setStatus("OPEN");
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rule]);

  if (!mounted) {
    return (
      <div className="flex h-8 items-center rounded-full bg-slate-100 px-3 opacity-50 dark:bg-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading...</span>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (status) {
      case "OPEN": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400";
      case "IMMINENT": return "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400";
      case "CLOSED": return "bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-400";
      case "WEEKEND": return "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "OPEN": return "WINDOW OPEN";
      case "IMMINENT": return "CUTOFF IMMINENT";
      case "CLOSED": return "SYSTEM CLOSED";
      case "WEEKEND": return "WEEKEND BLACKOUT";
    }
  };

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${getStatusColor()}`}>
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2 items-center justify-center">
          {(status === "OPEN" || status === "IMMINENT") && (
            <span className={`absolute h-full w-full animate-ping rounded-full opacity-75 ${status === "OPEN" ? "bg-emerald-500" : "bg-amber-500"}`} />
          )}
          <span className={`relative h-1.5 w-1.5 rounded-full ${status === "OPEN" ? "bg-emerald-500" : status === "IMMINENT" ? "bg-amber-500" : status === "WEEKEND" ? "bg-rose-500" : "bg-slate-500"}`} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">{getStatusLabel()}</span>
      </div>
      <div className="h-3 w-px bg-current opacity-20" />
      <span className={`text-[11px] font-semibold tracking-wider ${FIGURE}`}>
        {rule.label} {localTime}
      </span>
    </div>
  );
}
