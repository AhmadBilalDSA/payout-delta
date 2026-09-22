import type { Metadata } from "next";
import { getDataset } from "@/lib/db";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important disclaimers about PayoutDelta fee estimates — not financial advice, rates are indicative.",
};

export default function DisclaimerPage() {
  const datasetDescription = getDataset().description;
  const disclaimer = getDataset().disclaimer;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Disclaimer
      </h1>
      <div className="mt-6 space-y-6 text-slate-700">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">
          {disclaimer}
        </p>

        <section>
          <h2 className="text-xl font-bold text-slate-900">
            Not financial advice
          </h2>
          <p className="mt-3 leading-relaxed">
            PayoutDelta is an educational fee-estimation tool. Nothing on this
            site is a recommendation to buy, sell, hold, transfer or convert
            any currency, nor an endorsement of any provider. Decisions about
            moving money are yours alone and should be informed by live quotes
            from regulated providers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">
            Not tax advice
          </h2>
          <p className="mt-3 leading-relaxed">
            The corridor pages describe commonly cited tax considerations, but
            tax treatment depends on your residency, filing status and local
            law. Consult a qualified accountant or tax advisor before filing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">
            Dataset limitations
          </h2>
          <p className="mt-3 leading-relaxed">
            {datasetDescription} Estimated outputs are only as current as the
            dataset revision and can differ materially from a live quote,
            especially for volatile corridors such as Nigeria. We disclaim
            liability for reliance on stale data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">Third parties</h2>
          <p className="mt-3 leading-relaxed">
            Provider names (Upwork, Fiverr, Wise, Payoneer, Remitly) are
            trademarks of their owners. PayoutDelta is not affiliated with or
            endorsed by any of them.
          </p>
        </section>
      </div>
    </article>
  );
}