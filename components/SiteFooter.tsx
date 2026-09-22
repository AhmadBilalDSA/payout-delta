import Link from "next/link";

const TRUST_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/disclaimer", label: "Disclaimer" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            PayoutDelta — a free, zero-signup auditor of freelance payout fees.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {TRUST_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-slate-600 underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
          Fee tables are indicative aggregates from public rate cards
          (dataset revision 2026-09-22) and are not quotes or financial advice.
          PayoutDelta does not store, transmit or share usage data; every
          calculation runs entirely in your browser.
        </p>
      </div>
    </footer>
  );
}