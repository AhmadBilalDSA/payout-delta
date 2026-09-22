import type { MetadataRoute } from "next";

const SITE_URL = "https://payoutdelta.com";

/** Required so the robots file prerenders under `output: "export"`. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}