import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seoSchemas";

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