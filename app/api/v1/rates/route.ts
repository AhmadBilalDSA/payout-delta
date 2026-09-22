import { getDataset } from "@/lib/db";

/**
 * Phase 2 API stub — NOT live in the static export.
 *
 * Static exports only prerender GET route handlers marked force-static; they
 * cannot serve request-time data. This endpoint therefore exists to keep the
 * Phase 2 contract visible (and to answer "is the old API alive?" with a
 * truthful 501) until the managed backend ships. When Phase 2 lands, this
 * file moves behind the Node/Edge server config and stops being static.
 */
export const dynamic = "force-static";

export async function GET() {
  const dataset = getDataset();
  return Response.json(
    {
      implemented: false,
      message:
        "The PayoutDelta rates API is Phase 2 scope. Phase 1 is a static export; live rate data lands with the managed backend (see scripts/playwright_scraper.py).",
      datasetRevision: dataset.updatedAt,
    },
    { status: 501 }
  );
}