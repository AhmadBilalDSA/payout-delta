import type { Metadata } from "next";
import { getCorridors } from "@/lib/db";
import { RouterClient } from "@/components/router/RouterClient";
import { SITE_URL } from "@/lib/seoSchemas";

export const metadata: Metadata = {
  title: "Sovereign Settlement Hop Resolver & Pathfinding Engine",
  description:
    "Pathfinding engine computing deterministic settlement routes, FX margins, and intermediary clearing friction.",
  alternates: { canonical: "/router/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/router/`,
    siteName: "PayoutDelta",
    title: "Sovereign Settlement Hop Resolver",
    description:
      "Pathfinding engine computing deterministic settlement routes, FX margins, and intermediary clearing friction.",
    locale: "en_US",
  },
};

export const dynamic = "force-static";

export default function RouterPage() {
  const corridors = getCorridors().map((c) => ({
    slug: c.slug,
    label: `${c.from} to ${c.to} (${c.country})`,
    shaUsd: 25, // Base SHA assumption for engine
    rate: c.rate,
    symbol: c.currencySymbol,
  }));

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black pt-16">
      <RouterClient corridors={corridors} />
    </main>
  );
}
