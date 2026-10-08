"use client";

import { resolveHopChain } from "@/src/lib/engine/swiftHop";
import type { SwiftHopNode } from "@/src/lib/engine/swiftHop";

interface RouteHopTracerProps {
  originBank?: string;
  originBic?: string;
  intermediaryBic?: string;
  clearingSystem?: string;
  destBank?: string;
  destBic?: string;
  isOurRoute?: boolean;
}

const roleColors: Record<SwiftHopNode["role"], string> = {
  origin: "text-slate-300",
  intermediary: "text-amber-300",
  clearing: "text-slate-300",
  beneficiary: "text-emerald-300",
};

const roleBg: Record<SwiftHopNode["role"], string> = {
  origin: "bg-slate-800/60",
  intermediary: "bg-amber-500/10",
  clearing: "bg-slate-800/60",
  beneficiary: "bg-emerald-500/10",
};

function NodeCard({ node }: { node: SwiftHopNode }) {
  const isDeduct = node.status === "deduct_point";
  const isSettled = node.status === "settled";

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div
        className={`w-full rounded-lg border px-3 py-2.5 ${roleBg[node.role]} ${
          isDeduct
            ? "border-amber-500/50"
            : isSettled
            ? "border-emerald-500/40"
            : "border-zinc-700/60"
        }`}
      >
        <div className={`text-[10px] font-bold uppercase tracking-widest ${roleColors[node.role]}`}>
          {node.role}
        </div>
        <div className="mt-1 text-xs font-semibold text-zinc-100 truncate">
          {node.label}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-zinc-400 truncate">
          {node.bicOrCode}
        </div>
        {isDeduct && (
          <div className="mt-2">
            {node.deductEstimateUsd === 0 ? (
              <span className="inline-flex items-center rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-px text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Deduct Absorbed by Remitter: $0.00
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-px text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Deduction Point: −${node.deductEstimateUsd.toFixed(2)} USD (Estimated)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center w-6 flex-shrink-0 text-zinc-600">
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="opacity-70">
        <path
          d="M0 6H18M18 6L13 1M18 6L13 11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * Horizontal/vertical responsive pipeline showing the 4-node SWIFT hop chain.
 *
 * Node 2 (Correspondent Gateway) dynamically highlights based on charge-code:
 *   - OUR → green "Deduct Absorbed" badge
 *   - SHA/BEN → amber "Deduction Point" badge
 */
export default function RouteHopTracer({
  originBank,
  originBic,
  intermediaryBic,
  clearingSystem,
  destBank,
  destBic,
  isOurRoute = false,
}: RouteHopTracerProps) {
  const nodes = resolveHopChain(
    originBank ?? "",
    originBic ?? "",
    intermediaryBic ?? "",
    clearingSystem ?? "",
    destBank ?? "",
    destBic ?? "",
    isOurRoute
  );

  return (
    <section
      aria-label="SWIFT hop tracer"
      className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 backdrop-blur-md"
    >
      <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase text-zinc-500">
        SWIFT Wire Hop Tracer
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-center sm:flex-col sm:flex-1">
            <NodeCard node={node} />
            {i < nodes.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] text-zinc-500">
        {isOurRoute
          ? "OUR charge code — intermediary fees absorbed by remitter"
          : "SHA/BEN charge code — intermediary fees deducted from principal"}
      </p>
    </section>
  );
}
