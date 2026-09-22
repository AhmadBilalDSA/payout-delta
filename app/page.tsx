import Link from "next/link";
import { getChannels, getCorridors, getDataset, getPlatforms } from "@/lib/db";
import CorridorCard from "@/components/CorridorCard";
import Hero from "@/components/Hero";

export default function Home() {
  const corridors = getCorridors();
  const platforms = getPlatforms();
  const channels = getChannels();
  const datasetRevision = getDataset().updatedAt.slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <Hero />

      <section
        id="corridors"
        aria-labelledby="corridor-heading"
        className="mt-14 scroll-mt-20"
      >
        <h2
          id="corridor-heading"
          className="text-2xl font-bold text-slate-900 dark:text-white"
        >
          Audited corridors
        </h2>
        <p className="mt-2 text-slate-600 dark:text-white/60">
          {corridors.length} corridors, {platforms.length} client platforms,{" "}
          {channels.length} withdrawal channels — every combination priced in
          the receiving currency.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {corridors.map((corridor) => (
            <CorridorCard key={corridor.slug} corridor={corridor} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="how-it-works"
        className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 dark:border-white/[0.08] dark:bg-white/[0.03]"
      >
        <h2 id="how-it-works" className="text-2xl font-bold text-slate-900 dark:text-white">
          How the audit works
        </h2>
        <ol className="mt-4 grid gap-6 sm:grid-cols-3">
          <li className="rounded-xl bg-white p-4 shadow-sm dark:bg-[#15151A]">
            <p className="font-semibold text-slate-900 dark:text-white">1. Pick the amount</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
              Slide $100 to $100,000. Fixed fees amortize while spreads scale —
              the best channel flips as you grow.
            </p>
          </li>
          <li className="rounded-xl bg-white p-4 shadow-sm dark:bg-[#15151A]">
            <p className="font-semibold text-slate-900 dark:text-white">2. Choose the client</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
              Upwork (10%), Fiverr (20%) or a direct invoice (0%) sets the
              first deduction before any conversion.
            </p>
          </li>
          <li className="rounded-xl bg-white p-4 shadow-sm dark:bg-[#15151A]">
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