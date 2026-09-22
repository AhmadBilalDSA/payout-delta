import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the PayoutDelta team about fee data corrections, corridor requests or partnerships.",
};

const CONTACT_EMAIL = "hello@payoutdelta.com";

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Contact
      </h1>
      <p className="mt-4 leading-relaxed text-slate-700">
        Feedback keeps the fee dataset honest. Before you write, please check
        whether your question is answered by the{" "}
        <Link
          href="/disclaimer"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          disclaimer
        </Link>{" "}
        or the corridor FAQ on each calculator page.
      </p>

      <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        <li className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">General enquiries</p>
            <p className="text-sm text-slate-600">
              Business, partnerships and everything else.
            </p>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            {CONTACT_EMAIL}
          </a>
        </li>
        <li className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">Fee corrections</p>
            <p className="text-sm text-slate-600">
              Need to flag an outdated rate or missing channel? Use the same
              address and put “Fee data: ” in the subject so it routes to the
              right queue.
            </p>
          </div>
        </li>
      </ul>

      <p className="mt-6 text-sm text-slate-500">
        We reply during UK business hours and keep personal data only where a
        reply requires it — in line with the{" "}
        <Link
          href="/privacy-policy"
          className="underline underline-offset-2 hover:text-slate-700"
        >
          privacy policy
        </Link>
        .
      </p>
    </article>
  );
}