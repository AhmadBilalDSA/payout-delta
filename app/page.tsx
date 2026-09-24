import Link from "next/link";
import { getCorridors, getDataset } from "@/lib/db";
import CorridorDirectory from "@/components/CorridorDirectory";
import Hero from "@/components/Hero";

export default function Home() {
  const corridors = getCorridors();
  const datasetRevision = getDataset().updatedAt.slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <Hero />

      <CorridorDirectory corridors={corridors} />

      <section
        aria-labelledby="how-it-works"
        className="mt-14 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md sm:p-8"
      >
        <h2 id="how-it-works" className="text-2xl font-bold text-slate-900 dark:text-white">
          How the audit works
        </h2>
        <ol className="mt-4 grid gap-6 sm:grid-cols-3">
          <li className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md">
            <p className="font-semibold text-slate-900 dark:text-white">1. Pick the amount</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
              Slide $100 to $100,000. Fixed fees amortize while spreads scale —
              the best channel flips as you grow.
            </p>
          </li>
          <li className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md">
            <p className="font-semibold text-slate-900 dark:text-white">2. Choose the client</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
              Upwork (10%), Fiverr (20%) or a direct invoice (0%) sets the
              first deduction before any conversion.
            </p>
          </li>
          <li className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md">
            <p className="font-semibold text-slate-900 dark:text-white">3. Compare channels</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
              SWIFT, local bank, Wise, Payoneer and Remitly are ranked by the
              local currency you actually receive.
            </p>
          </li>
        </ol>
        <p className="mt-6 text-sm text-slate-500 dark:text-white/50">
          All fee tables ship in the open dataset{" "}
          <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.12]">
            data/fees.json
          </code>{" "}
          (revision {datasetRevision}) and are auditable in the{" "}
          <Link
            href="/about"
            className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-white"
          >
            about
          </Link>{" "}
          page.
        </p>
      </section>
    </div>
  );
}