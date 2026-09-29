import type { Metadata } from "next";
import { getCorridors } from "@/lib/db";
import { BatchClient } from "@/components/batch/BatchClient";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Enterprise Batch Payout Split Engine",
  description:
    "Institutional multi-invoice reconciliation calculator supporting row addition for bulk cross-border transfers.",
  alternates: { canonical: "/batch/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/batch/`,
    siteName: "PayoutDelta",
    title: "Enterprise Batch Payout Split Engine",
    description:
      "Institutional multi-invoice reconciliation calculator supporting row addition for bulk cross-border transfers.",
    locale: "en_US",
  },
};

export const dynamic = "force-static";

export default function BatchPage() {
  const corridors = getCorridors().map((c) => ({
    slug: c.slug,
    label: `${c.from} to ${c.to} (${c.country})`,
    shaUsd: 25, // Fallback for the demo
    rate: c.rate,
    symbol: c.currencySymbol,
  }));

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black pt-16">
      <BatchClient corridors={corridors} />
    </main>
  );
}
