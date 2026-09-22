import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms under which PayoutDelta is provided — information tooling, not financial advice, provided as-is.",
};

export default function TermsOfServicePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Effective 22 September 2026. By using PayoutDelta you agree to these
        terms.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900">
        1. Nature of the service
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700">
        PayoutDelta provides fee-estimation tooling for freelance payment
        corridors. Outputs are mathematical projections built from public,
        sometimes stale, rate tables. They are not financial, tax, legal or
        investment advice, and do not constitute an offer to transfer money.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900">
        2. Accuracy
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700">
        We strive to keep{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
          data/fees.json
        </code>{" "}
        current, but rates and provider schedules change frequently. Always
        confirm live fees with your provider before transacting. The Service
        is provided “as is” and “as available” without warranties of any kind.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900">
        3. Acceptable use
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700">
        You agree not to scrape, reverse-engineer, or republish the fee dataset
        in a way that competes with this service, and not to use the site to
        defraud, mislead or violate any money-transfer or tax regulation.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900">
        4. Liability
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700">
        To the maximum extent permitted by law, PayoutDelta and its operators
        are not liable for losses arising from reliance on estimates, outages,
        or provider fee changes. Nothing in these terms excludes liability that
        cannot be excluded by law.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900">
        5. Changes and termination
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700">
        We may update these terms from time to time; use of the site after
        changes constitutes acceptance. We may restrict access to protect the
        service or comply with law. These terms are governed by the laws of
        England and Wales; disputes fall under the exclusive jurisdiction of
        its courts.
      </p>
    </article>
  );
}