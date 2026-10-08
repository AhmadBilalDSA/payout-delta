import type { MetadataRoute } from "next";
import { getCorridorSlugs } from "@/lib/db";

const LAST_MODIFIED = new Date();

/** Required so the sitemap prerenders under `output: "export"`. */
export const dynamic = "force-static";

/** Paths use trailing slashes to mirror `trailingSlash: true` canonicals. */
export default function sitemap(): MetadataRoute.Sitemap {
  const corridorSlugs = getCorridorSlugs();

  const calculatorEntries: MetadataRoute.Sitemap = corridorSlugs.map((slug) => ({
    url: `https://ahmadbilaldsa.github.io/payout-delta/calculator/${slug}/`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const embedEntries: MetadataRoute.Sitemap = corridorSlugs.map((slug) => ({
    url: `https://ahmadbilaldsa.github.io/payout-delta/embed/${slug}/`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    {
      url: "https://ahmadbilaldsa.github.io/payout-delta/",
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...calculatorEntries,
    ...embedEntries,
  ];
}