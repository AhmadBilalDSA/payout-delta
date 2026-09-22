import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How PayoutDelta handles no data: no accounts, no tracking, client-side calculations and third-party-only network touches.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-white/50">
        Effective 22 September 2026. PayoutDelta is a static application; this
        policy describes exactly how little we can know about you.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">
        1. What we collect
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
        Nothing by design. The site has no accounts, no login, no analytics
        script and no forms that persist data. Your calculator inputs (payout
        amount, platform, corridor) are processed entirely in your browser via
        JavaScript and are never transmitted to us or any server we operate.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">
        2. Third-party touches
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
        The only network requests the site makes are to load web fonts and the
        ad placeholder container. If advertising is enabled, the advertising
        provider may use cookies in line with its own policies; we do not
        receive identifiable log data from that integration.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">
        3. Email
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
        If you email us, we hold your address and message only long enough to
        reply, and we delete correspondence on request. This policy does not
        cover communications via third-party mail providers.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">
        4. Your rights
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
        Because we hold no personal data by default, rights requests are
        largely moot. To exercise any right or request deletion of an email
        thread, contact us and we will comply promptly.
      </p>

      <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">
        5. Changes
      </h2>
      <p className="mt-3 leading-relaxed text-slate-700 dark:text-white/70">
        If Phase 2 introduces interactive features (e.g., rate-drop alerts),
        this policy will be updated before they ship and republished here with
        a new effective date. Material changes are announced on the homepage.
      </p>
    </article>
  );
}