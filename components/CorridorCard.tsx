import Link from "next/link";
import type { Corridor } from "@/lib/types";

/** Compact corridor tile used by the home grid and the 404 fallback. */
export default function CorridorCard({ corridor }: { corridor: Corridor }) {
  return (
    <Link
      href={`/calculator/${corridor.slug}`}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-500 hover:shadow-md"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-900">{corridor.country}</p>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          {corridor.from}→{corridor.to}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {corridor.currencySymbol} 1 / {corridor.from}{" "}
        <span className="font-medium text-slate-900">
          {corridor.rate.toLocaleString("en-US")}
        </span>{" "}
        <span className="text-slate-500">{corridor.currencyName}</span>
      </p>
      <p className="mt-3 text-sm font-medium text-emerald-600 group-hover:underline">
        Audit this corridor →
      </p>
    </Link>
  );
}