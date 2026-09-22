import Link from "next/link";
import { getDataset } from "@/lib/db";

const GITHUB_URL = "https://github.com/AhmadBilalDSA/payout-delta";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const PRODUCT_LINKS: readonly FooterLink[] = [
  { label: "Fee Auditor", href: "/" },
  { label: "Currency Corridors", href: "/#corridors" },
  { label: "API Stubs", href: "/about" },
  { label: "Rate Drops", href: "/about" },
] as const;

const LEGAL_LINKS: readonly FooterLink[] = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Financial Disclaimer", href: "/disclaimer" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

const OPEN_DATA_LINKS: readonly FooterLink[] = [
  { label: "GitHub Repo", href: GITHUB_URL, external: true },
  {
    label: "fees.json Dataset",
    href: `${GITHUB_URL}/blob/master/data/fees.json`,
    external: true,
  },
  { label: "Methodology", href: "/about" },
] as const;

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly FooterLink[];
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-900">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-xs text-neutral-500 transition-colors duration-200 ease-out hover:text-slate-900"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Apple-style 4-column legal footer. 12px typography, hairline separators,
 * recessed sub-canvas surface. Server component; the dataset revision renders
 * straight from data/fees.json at build time.
 */
export default function Footer() {
  // ISO-8601 from the sync pipeline → render the calendar date only.
  const updatedAt = getDataset().updatedAt.slice(0, 10);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-sub-canvas border-t border-black/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
          <FooterColumn title="Open Data" links={OPEN_DATA_LINKS} />
          <div>
            <h2 className="text-xs font-semibold text-slate-900">
              System Status
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href={`${GITHUB_URL}/actions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-500 transition-colors duration-200 ease-out hover:text-slate-900"
                >
                  Static Export Build Status
                  <span aria-hidden="true" className="ml-0.5 opacity-50">
                    ↗
                  </span>
                </Link>
              </li>
              <li className="text-xs tabular-nums text-neutral-500">
                <span className="sr-only">Last Audited Date: </span>
                {updatedAt}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 space-y-2 border-t border-black/[0.06] pt-6">
          <p className="text-xs tabular-nums text-neutral-500">
            © {year} PayoutDelta. All rights reserved.
          </p>
          <p className="max-w-3xl text-xs leading-relaxed text-neutral-500">
            PayoutDelta is an independent auditing index and is not directly
            affiliated with Upwork, Fiverr, Wise, or Payoneer.
          </p>
        </div>
      </div>
    </footer>
  );
}