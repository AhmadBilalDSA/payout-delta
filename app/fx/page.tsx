import { getCorridors } from "@/lib/db";
import { getJurisdictions } from "@/lib/registryData";
import { FxConverterClient } from "@/components/fx/FxConverterClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canonical FX Converter — Standard vs Platform Rails",
  description: "Fast zero-friction statutory currency conversion interface comparing Commercial Bank rates against Platform Rails.",
};

export default function FxConverterPage() {
  const corridors = getCorridors();
  const jurisdictions = getJurisdictions();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        Canonical FX Converter
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-3xl">
        Compare Net Fiat Received across Standard Commercial Bank mid-market rates and Platform Rails with disclosed markup.
      </p>
      
      <div className="mt-8">
        <FxConverterClient corridors={corridors} jurisdictions={jurisdictions} />
      </div>
    </div>
  );
}
