import Link from "next/link";
import { getChannels, getCorridors, getPlatforms } from "@/lib/db";
import CorridorCard from "@/components/CorridorCard";

export default function Home() {
  const corridors = getCorridors();
  const platforms = getPlatforms();
  const channels = getChannels();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <section className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Free · No signup · Static (nothing sent to a server)
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          See exactly what a freelance payout actually costs you
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          PayoutDelta decomposes every withdrawal into the three leaks that
          eat your earnings — platform commission, channel fixed fees and FX
          spread — across 10 currency corridors on Upwork, Fiverr and direct
          invoices.
        </p>
        <a
          href="#corridors"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          Pick your corridor
        </a>
      </section>

      <section
        id="corridors"
        aria-labelledby="corridor-heading"
        className="mt-14 scroll-mt-20"
      >
        <h2
          id="corridor-heading"
          className="text-2xl font-bold text-slate-900"
        >
          Audited corridors
        </h2>
        <p className="mt-2 text-slate-600">
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
        className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8"
      >
        <h2 id="how-it-works" className="text-2xl font-bold text-slate-900">
          How the audit works
        </h2>
        <ol className="mt-4 grid gap-6 sm:grid-cols-3">
          <li className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">1. Pick the amount</p>
            <p className="mt-1 text-sm text-slate-600">
              Slide $100 to $100,000. Fixed fees amortize while spreads scale —
              the best channel flips as you grow.
            </p>
          </li>
          <li className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">2. Choose the client</p>
            <p className="mt-1 text-sm text-slate-600">
              Upwork (10%), Fiverr (20%) or a direct invoice (0%) sets the
              first deduction before any conversion.
            </p>
          </li>
          <li className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">3. Compare channels</p>
            <p className="mt-1 text-sm text-slate-600">
              SWIFT, local bank, Wise, Payoneer and Remitly are ranked by the
              local currency you actually receive.
            </p>
          </li>
        </ol>
        <p className="mt-6 text-sm text-slate-500">
          All fee tables ship in the open dataset{" "}
          <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs">
            data/fees.json
          </code>{" "}
          (revision 2026-09-22) and are auditable in the{" "}
          <Link
            href="/about"
            className="underline underline-offset-2 hover:text-slate-700"
          >
            about
          </Link>{" "}
          page.
        </p>
      </section>
    </div>
  );
}