import type { Metadata } from "next";

import DiagnosticTier from "@/components/dashboard/DiagnosticTier";
import SimpleTier from "@/components/dashboard/SimpleTier";
import type {
  DashboardCorridor,
  DashboardKpis,
  DashboardPlatform,
  DashboardProvider,
} from "@/components/dashboard/payload";
import { GITHUB_REPO } from "@/data/banks";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import { buildClearingTerminalIndex } from "@/lib/clearingTerminal";
import { getCorridors, getPlatforms } from "@/lib/db";
import { platformUiKey } from "@/lib/i18n/helpers";
import { SITE_URL } from "@/lib/seoSchemas";

export const dynamic = "force-static";

/**
 * Dashboard v3 — Two-Tier Progressive Disclosure.
 *
 * SERVER SHELL ONLY. This route stays a server component so it can own the
 * metadata, the JSON-LD and — critically — the build-time data resolution. Every
 * expensive lookup the page needs happens once, here, at module scope:
 *
 *   - `buildClearingTerminalIndex()` produces the clearing registry, the macro
 *     telemetry, the SHA cut histogram and the retail spread heatmap that the
 *     Diagnostic Tier's existing `DashboardV3` island renders.
 *   - `buildDashboardCorridors()` and `buildDashboardKpis()` below reduce the
 *     131-corridor fee dataset and the statutory bank directory down to the flat
 *     numeric payload the client islands actually read.
 *
 * The client bundles therefore never import `data/fees.json` or the ~226KB
 * regulatory banking module. That is the whole reason the payload types live in
 * `components/dashboard/payload.ts` and are imported with `import type` on the
 * client side — a value import there would silently add half a megabyte to a
 * route with a 60KB gzip budget.
 *
 * The two tiers are rendered in reading order — Simple open, Diagnostic
 * collapsed. Note the global `<Header />` / `<Footer />` / `<Dock />` are
 * deliberately NOT repeated here: the root layout already wraps every route in
 * them, so importing them again would duplicate the chrome on this page only.
 */

/** The terminal payload is resolved ONCE and shared by the JSON-LD and the body. */
const index = buildClearingTerminalIndex();
const { macro, revisedOn } = index;

/** Benchmark gross every published percentage figure is computed against. */
const BENCHMARK_GROSS_USD = 1000;

/**
 * Statutory withholding rate for a corridor.
 *
 * Prefers the first NON-exempt tier: exemption tiers (PSEB, GST LUT) publish a
 * 0% rate and would make the waterfall's withholding bar silently vanish for
 * exactly the corridors where a reader most wants to see it. Falls back to the
 * first tier, then to no withholding.
 */
function resolveWithholdingRate(
  slug: string
): number {
  const regulation = getRegulatoryBanking(slug);
  const tiers = regulation.tiers;
  const chargeable =
    tiers.find((tier) => tier.exemption !== true && tier.rate > 0) ??
    tiers.find((tier) => tier.rate > 0);
  return chargeable?.rate ?? 0;
}

/** All-in cost of one provider on one corridor, as a percent of the benchmark. */
function allInPercent(fixedFeeUSD: number, fxSpread: number): number {
  return ((fixedFeeUSD + fxSpread * BENCHMARK_GROSS_USD) / BENCHMARK_GROSS_USD) * 100;
}

/**
 * The lean per-corridor payload for the Simple Tier matrix and the Diagnostic
 * Tier waterfall. Numbers and short strings only — see the module comment.
 */
function buildDashboardCorridors(): DashboardCorridor[] {
  return getCorridors().map((corridor) => {
    const regulation = getRegulatoryBanking(corridor.slug);
    const bank = regulation.banks[0];

    const providers: DashboardProvider[] = (corridor.providers ?? []).map(
      (provider) => ({
        id: provider.id,
        name: provider.name,
        fixedFeeUSD: provider.fixedFeeUSD,
        fxSpread: provider.fxSpread,
      })
    );

    return {
      slug: corridor.slug,
      from: corridor.from,
      to: corridor.to,
      pair: `${corridor.from} → ${corridor.to}`,
      country: corridor.country,
      countryCode: corridor.countryCode,
      flag: flagOfSafe(corridor.countryCode),
      symbol: corridor.currencySymbol || corridor.to,
      rate: corridor.rate,
      taxRate: resolveWithholdingRate(corridor.slug),
      landingFeeLocal: bank?.localFeeDefault ?? 0,
      intermediaryUsd:
        regulation.defaultIntermediaryCut ?? bank?.intermediaryUSD ?? 18,
      providers,
    };
  });
}

/**
 * Regional-indicator flag for a country code.
 *
 * `lib/directoryData.ts` already exports `flagOf`, but that module is a
 * client-facing directory index; importing it here would be fine, and this
 * local copy exists only to keep the page's server-side import graph to the two
 * data modules the payload genuinely needs. EU is the one non-derivable case.
 */
function flagOfSafe(code: string): string {
  if (code.toUpperCase() === "EU") return "🇪🇺";
  const base = 0x1f1e6;
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(base + char.charCodeAt(0) - 65)
    );
}

/** The four Simple Tier tiles, derived across the whole audited corpus. */
function buildDashboardKpis(corridors: DashboardCorridor[]): DashboardKpis {
  const providerIds = new Set<string>();
  let cheapest: { pct: number; slug: string } | null = null;
  let priciest: { pct: number; slug: string } | null = null;

  for (const corridor of corridors) {
    for (const provider of corridor.providers) providerIds.add(provider.id);
    if (corridor.providers.length === 0) continue;
    // The cheapest published route on this corridor, as a share of the gross.
    const best = Math.min(
      ...corridor.providers.map((provider) =>
        allInPercent(provider.fixedFeeUSD, provider.fxSpread)
      )
    );
    if (cheapest === null || best < cheapest.pct) {
      cheapest = { pct: best, slug: corridor.slug };
    }
    if (priciest === null || best > priciest.pct) {
      priciest = { pct: best, slug: corridor.slug };
    }
  }

  return {
    corridorsAudited: corridors.length,
    providersBenchmarked: providerIds.size,
    cheapestFeePercent: cheapest?.pct ?? 0,
    cheapestFeeSlug: cheapest?.slug ?? "",
    priciestFeePercent: priciest?.pct ?? 0,
    priciestFeeSlug: priciest?.slug ?? "",
  };
}

/** Platform commissions, with the display name resolved to a dictionary key. */
function buildDashboardPlatforms(): DashboardPlatform[] {
  return getPlatforms().map((platform) => ({
    id: platform.id,
    feePercent: platform.feePercent,
    labelKey: platformUiKey(platform.id),
  }));
}

const corridors = buildDashboardCorridors();
const kpis = buildDashboardKpis(corridors);
const platforms = buildDashboardPlatforms();

const DESCRIPTION = `Two-tier clearing telemetry across ${macro.corridorsAudited} corridors and ${macro.verifiedBics} SWIFT BICs: decision-grade totals up front, the full seven-step settlement waterfall and filterable clearing registry one disclosure away.`;

export const metadata: Metadata = {
  title: "Institutional Clearing Terminal & SWIFT Wire Telemetry | PayoutDelta",
  description: DESCRIPTION,
  alternates: {
    canonical: "/dashboard/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/dashboard/`,
    siteName: "PayoutDelta",
    title:
      "Institutional Clearing Terminal & SWIFT Wire Telemetry — PayoutDelta",
    description: DESCRIPTION,
  },
};

export default function DashboardPage() {
  /**
   * FinancialService — the terminal as an auditable financial instrument
   * surface, scoped to the countries the registry actually covers.
   */
  const financialServiceLd = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: "PayoutDelta Institutional Clearing Terminal",
    url: `${SITE_URL}/dashboard/`,
    description: DESCRIPTION,
    serviceType: "Cross-border correspondent banking telemetry",
    provider: {
      "@type": "Organization",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
      sameAs: "https://github.com/AhmadBilalDSA/payout-delta",
    },
    areaServed: {
      "@type": "Place",
      name: "Global cross-border freelance payout markets",
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${SITE_URL}/dashboard/`,
      serviceName: "Institutional Clearing Registry (CSV export)",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Clearing telemetry widgets",
      itemListElement: [
        {
          "@type": "Offer",
          name: "Seven-Step Settlement Waterfall",
          description:
            "Every layer between a freelance invoice and the domestic bank deposit — platform commission, intermediary SWIFT cut, FX conversion, local landing fee and statutory withholding — resolved by the live gross-up engine.",
        },
        {
          "@type": "Offer",
          name: "Intermediary SHA Cut Histogram",
          description:
            "Distribution of benchmark intermediary SWIFT deductions across every audited corridor, bucketed into minimal transit, standard correspondent and heavy intermediary bands.",
        },
        {
          "@type": "Offer",
          name: "Retail Bank Spread Heatmap",
          description:
            "Bank-layer friction comparison of the tightest against the highest-friction corridors at the $1,000 benchmark.",
        },
        {
          "@type": "Offer",
          name: "Institutional Clearing Registry",
          description:
            "Per-corridor domestic settlement rail, correspondent clearing hub and field 71A charge recommendation, filterable and exportable as CSV.",
        },
      ],
    },
  };

  /**
   * WebPage — the page entity, with the dataset's revision date surfaced as
   * `dateModified` so crawlers can see how fresh the telemetry is.
   */
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Institutional Clearing Terminal & SWIFT Wire Telemetry | PayoutDelta",
    url: `${SITE_URL}/dashboard/`,
    description: `Institutional clearing telemetry across ${macro.corridorsAudited} audited corridors and ${macro.verifiedBics} verified ISO 9362 BICs, revised ${revisedOn}.`,
    dateModified: revisedOn,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
    },
    about: {
      "@type": "Thing",
      name: "Cross-border correspondent banking and SWIFT wire telemetry",
    },
    mainEntity: {
      "@type": "Dataset",
      name: "PayoutDelta Institutional Clearing Registry",
      description: `Per-corridor intermediary SHA deduction, domestic settlement rail, correspondent clearing BIC and field 71A charge recommendation for ${macro.corridorsAudited} payout corridors.`,
      dateModified: revisedOn,
      inLanguage: "en-US",
      isAccessibleForFree: true,
      license: "https://opensource.org/licenses/mit",
      creator: {
        "@type": "Organization",
        name: "PayoutDelta",
        url: `${SITE_URL}/`,
      },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Institutional Clearing Terminal",
        item: `${SITE_URL}/dashboard/`,
      },
    ],
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(financialServiceLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webPageLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c"),
          }}
        />

        {/* TIER 1 — open by default. No interaction required to read it. */}
        <SimpleTier
          corridors={corridors}
          platforms={platforms}
          kpis={kpis}
          repoUrl={GITHUB_REPO}
        />

        {/* TIER 2 — collapsed by default. The full forensic surface. */}
        <DiagnosticTier
          index={index}
          corridors={corridors}
          platforms={platforms}
        />

        <p className="no-print mt-10 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
          PayoutDelta is informational tooling, not financial, tax or legal advice.
          Correspondent identifiers, deduction bands and settlement rails are
          benchmark figures compiled from the public bank directory; the actual
          deduction lands on the beneficiary bank&apos;s credit advice (CRF) and must
          be verified before invoicing.
        </p>
      </div>
    </>
  );
}
