import type { Metadata } from "next";
import { getCorridors } from "@/lib/db";
import { TracerClient } from "@/components/tracer/TracerClient";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Intermediary SWIFT Wire Hop Tracer",
  description:
    "Deterministic correspondent hop simulator tracking SHA intermediary fees and FX markup across the wire chain.",
  alternates: { canonical: "/tracer/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/tracer/`,
    siteName: "PayoutDelta",
    title: "Intermediary SWIFT Wire Hop Tracer",
    description:
      "Deterministic correspondent hop simulator tracking SHA intermediary fees and FX markup across the wire chain.",
    locale: "en_US",
  },
};

export const dynamic = "force-static";

export default function TracerPage() {
  const corridors = getCorridors().map((c) => ({
    slug: c.slug,
    label: `${c.from} to ${c.to} (${c.country})`,
    shaUsd: 25, // Fallback for the demo
    rate: c.rate,
    symbol: c.currencySymbol,
  }));

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black pt-16">
      <TracerClient corridors={corridors} />
    </main>
  );
}
