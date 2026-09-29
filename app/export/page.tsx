import type { Metadata } from "next";
import { getCorridors } from "@/lib/db";
import { ExportClient } from "@/components/export/ExportClient";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Institutional Reconciliation Ledger — PayoutDelta",
  description:
    "Generate and export an institutional payment audit sheet containing verified corridor parameters and settlement calculations.",
  alternates: { canonical: "/export/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/export/`,
    siteName: "PayoutDelta",
    title: "Institutional Reconciliation Ledger Export",
    description:
      "Generate and export an institutional payment audit sheet containing verified corridor parameters and settlement calculations.",
    locale: "en_US",
  },
};

export const dynamic = "force-static";

export default function ExportPage() {
  const corridors = getCorridors().map((c) => ({
    slug: c.slug,
    label: `${c.from} to ${c.to} (${c.country})`,
    from: c.from,
    to: c.to,
    country: c.country,
    symbol: c.currencySymbol,
    rate: c.rate,
    shaUsd: 25, // Fallback SHA intermediary cut
  }));

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black pt-16 print:bg-white print:pt-0">
      <ExportClient corridors={corridors} />
    </main>
  );
}
