import type { MetadataRoute } from "next";
import { getCorridorSlugs } from "@/lib/db";
import { LOCALIZED_CORRIDORS } from "@/lib/localizedCorridors";

const SITE_URL = "https://payoutdelta.com";
const LAST_MODIFIED = new Date("2026-09-22");

/** Required so the sitemap prerenders under `output: "export"`. */
export const dynamic = "force-static";

/** Paths use trailing slashes to mirror `trailingSlash: true` canonicals. */
export default function sitemap(): MetadataRoute.Sitemap {
  const corridorEntries = getCorridorSlugs().map((slug) => ({
    url: `${SITE_URL}/calculator/${slug}/`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const localizedEntries: MetadataRoute.Sitemap = LOCALIZED_CORRIDORS.map(
    ({ lang, slug }) => ({
      url: `${SITE_URL}/${lang}/calculator/${slug}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/invoice/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/privacy-policy/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/terms-of-service/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/disclaimer/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  return [...staticEntries, ...corridorEntries, ...localizedEntries];
}