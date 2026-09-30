import type { MetadataRoute } from "next";
import { getCorridorSlugs } from "@/lib/db";
import { LONG_TAIL_CORRIDORS } from "@/data/corridors";
import { EDITORIAL_GUIDES } from "@/data/editorialGuides";
import { LOCALIZED_CORRIDORS } from "@/lib/localizedCorridors";
import { SITE_URL } from "@/lib/seoSchemas";

const LAST_MODIFIED = new Date();

/** Required so the sitemap prerenders under `output: "export"`. */
export const dynamic = "force-static";

/** Paths use trailing slashes to mirror `trailingSlash: true` canonicals. */
export default function sitemap(): MetadataRoute.Sitemap {
  const corridorSlugs = [
    ...getCorridorSlugs(),
    ...LONG_TAIL_CORRIDORS.map((spec) => spec.slug),
  ];

  const calculatorEntries: MetadataRoute.Sitemap = corridorSlugs.map((slug) => ({
    url: `${SITE_URL}/calculator/${slug}/`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const embedEntries: MetadataRoute.Sitemap = corridorSlugs.map((slug) => ({
    url: `${SITE_URL}/embed/${slug}/`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const localizedEntries: MetadataRoute.Sitemap = LOCALIZED_CORRIDORS.map(
    ({ lang, slug }) => ({
      url: `${SITE_URL}/${lang}/calculator/${slug}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const guideEntries: MetadataRoute.Sitemap = EDITORIAL_GUIDES.map((guide) => ({
    url: `${SITE_URL}/compare/${guide.slug}/`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/tracer/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/w8ben/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/export/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/docs/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/compare/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/invoice/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/tax-ledger/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/leaderboard/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/dashboard/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/banks/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  return [
    ...staticEntries,
    ...calculatorEntries,
    ...embedEntries,
    ...localizedEntries,
    ...guideEntries,
  ];
}