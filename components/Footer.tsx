import Link from "next/link";
import { getDataset } from "@/lib/db";
import { SEO_RANKINGS_BADGE_LABEL, SEO_RANKINGS_DATA_PATH } from "@/data/config";
import ClearLocalCacheButton from "@/components/ClearLocalCacheButton";

const GITHUB_URL = "https://github.com/AhmadBilalDSA/payout-delta";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const PRODUCT_LINKS: readonly FooterLink[] = [
  { label: "Fee Auditor", href: "/" },
  { label: "Currency Corridors", href: "/#corridors" },
  { label: "Invoice Studio", href: "/invoice/" },
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
      <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-xs text-neutral-500 transition-colors duration-200 ease-out hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
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
    <footer className="bg-sub-canvas border-t border-black/[0.06] dark:border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
          <FooterColumn title="Open Data" links={OPEN_DATA_LINKS} />
          <div>
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
              System Status
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href={`${GITHUB_URL}/actions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-500 transition-colors duration-200 ease-out hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  Static Export Build Status
                  <span aria-hidden="true" className="ml-0.5 opacity-50">
                    ↗
                  </span>
                </Link>
              </li>
              <li className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                <span className="sr-only">Last Audited Date: </span>
                {updatedAt}
              </li>
              <li>
                <Link
                  href={SEO_RANKINGS_DATA_PATH}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Live programmatic SEO rankings (top 20 calculator queries)"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-600 transition-colors duration-150 ease-out hover:border-emerald-400/50 hover:bg-emerald-400/15 dark:text-emerald-300"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                  />
                  {SEO_RANKINGS_BADGE_LABEL}
                  <span aria-hidden="true" className="opacity-50">
                    ↗
                  </span>
                </Link>
              </li>
              <li className="mt-3">
                <ClearLocalCacheButton />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 space-y-2 border-t border-black/[0.06] pt-6 dark:border-white/[0.08]">
          <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            © {year} PayoutDelta. All rights reserved.
          </p>
          <p className="max-w-3xl text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            PayoutDelta is an independent auditing index and is not directly
            affiliated with Upwork, Fiverr, Wise, or Payoneer.
          </p>
        </div>
      </div>
    </footer>
  );
}