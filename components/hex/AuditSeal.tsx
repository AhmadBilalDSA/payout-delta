"use client";

import { useEffect, useState } from "react";

interface AuditSealProps {
  bic: string;
  iso2: string;
  whtRate: number;
  minShaFee: number;
  maxShaFee: number;
}

export function AuditSeal({ bic, iso2, whtRate, minShaFee, maxShaFee }: AuditSealProps) {
  const [hash, setHash] = useState<string>("--------");
  const [timestamp, setTimestamp] = useState<string>("");

  useEffect(() => {
    async function computeHash() {
      const data = `${bic}|${iso2}|${whtRate}|${minShaFee}|${maxShaFee}`;
      const encoder = new TextEncoder();
      const digest = await window.crypto.subtle.digest("SHA-256", encoder.encode(data));
      const hashArray = Array.from(new Uint8Array(digest));
      const hex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 8).toUpperCase();
      setHash(hex);
      setTimestamp(new Date().toISOString());
    }
    computeHash();
  }, [bic, iso2, whtRate, minShaFee, maxShaFee]);

  return (
    <div className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-4 print:mt-4 print:border-t-2">
      <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      <div className="flex flex-col">
        <span className="font-mono tabular-nums text-xs text-neutral-400">
          SEAL-{hash}
        </span>
        {timestamp && (
          <span className="font-mono tabular-nums text-[10px] text-neutral-400/80">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
