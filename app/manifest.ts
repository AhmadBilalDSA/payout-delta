import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PayoutDelta — Sovereign Cross-Border Wire & Fee Ledger",
    short_name: "PayoutDelta",
    description: "Statutory intermediary wire fee engine, banking dossiers, and reverse gross-up calculator.",
    start_url: "/payout-delta/",
    scope: "/payout-delta/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/payout-delta/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/payout-delta/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
