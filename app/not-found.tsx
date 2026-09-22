import Link from "next/link";
import { getCorridors } from "@/lib/db";
import CorridorCard from "@/components/CorridorCard";

/**
 * 404 fallback: instead of a dead end, redirect intent to the live corridor
 * auditor grid — this page is linked from the sitemap as a safety net for
 * stale third-party deep links into retired calculator URLs.
 */
export default function NotFound() {
  const corridors = getCorridors();

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <p className="text-6xl font-black text-emerald-600">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          This calculator isn’t here
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          The URL you followed doesn’t match a live payout corridor. Pick one
          of the corridors below to run a fee audit instead.
        </p>
      </div>

      <section
        aria-labelledby="fallback-corridors"
        className="mt-10 scroll-mt-20"
      >
        <h2
          id="fallback-corridors"
          className="text-xl font-bold text-slate-900"
        >
          Audited corridors
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {corridors.map((corridor) => (
            <CorridorCard key={corridor.slug} corridor={corridor} />
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/" className="underline underline-offset-2 hover:text-slate-700">
          Return to the PayoutDelta home page
        </Link>
      </p>
    </div>
  );
}