import { NextResponse } from "next/server";

/**
 * Middleware stub — Phase 1 ships pass-through only.
 *
 * IMPORTANT (Next 16): `middleware.ts` is deprecated in favour of `proxy.ts`,
 * and PROXY IS UNSUPPORTED under `output: 'export'` (see dist/docs static
 * export guide). Because Phase 1 builds as a pure static site, middleware
 * simply never runs — this file stays as a pass-through placeholder so the
 * Phase 2 managed deployment can light it up without file churn.
 *
 * ---------------------------------------------------------------------------
 * PHASE 2 — RATE-LIMIT & GEO STUB (Upstash Redis)
 * ---------------------------------------------------------------------------
 * Public API: when api/v1/rates goes live, enforce per-IP rate limits using
 * Upstash Redis @upstash/ratelimit:
 *
 *   import { Ratelimit } from "@upstash/ratelimit";
 *   import { Redis } from "@upstash/redis";
 *
 *   const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: ... });
 *   const ratelimit = new Ratelimit({
 *     redis,
 *     limiter: Ratelimit.slidingWindow(60, "60 s"),
 *     prefix: "payoutdelta:api",
 *   });
 *
 *   export async function proxy(request: NextRequest) {
 *     if (request.nextUrl.pathname.startsWith("/api/")) {
 *       const { success } = await ratelimit.limit(
 *         request.headers.get("x-forwarded-for") ?? "anon"
 *       );
 *       if (!success) {
 *         return NextResponse.json({ error: "rate_limited" }, { status: 429 });
 *       }
 *     }
 *     return NextResponse.next();
 *   }
 *
 * Asset-rules caching note: static hosts (GitHub Pages) serve the /out bundle
 * directly, so middleware PLUS static export is mutually exclusive. When the
 * B2B tier deploys the server build, migrate this file name to `proxy.ts`
 * before enabling the block above.
 * ---------------------------------------------------------------------------
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};