import { getCorridors } from "@/lib/db";
import { getRegulatoryBanking, FALLBACK_SWIFT_BAND } from "@/data/regulatoryBanking";
import { BANK_DOSSIERS } from "@/data/banks";
import { primaryCorrespondent } from "@/lib/swiftRoutingEngine";

/**
 * PayoutDelta — server-side directory index builder (free-for.dev wave).
 *
 * Derives a single lightweight, serializable row per corridor so the home page
 * can hand a tiny compact array to the client `DirectoryExplorer` instead of
 * shipping the full regulatory / bank databases into the browser bundle. Every
 * micro-card fact (SHA fee tag, domestic clearing rail, searchable BICs) is
 * resolved here at build time — the client only runs pure memory filtering.
 */

export type DirectoryRegion = "americas" | "asia-pacific" | "europe" | "mea";

export interface DirectoryEntry {
  slug: string;
  from: string;
  to: string;
  flag: string;
  country: string;
  countryCode: string;
  currencyName: string;
  region: DirectoryRegion | "other";
  /** True when the rail is a hard-pegged 0% FX-spread corridor. */
  dollarized: boolean;
  /** True when the corridor is served by a named `/banks` dossier. */
  bankFeatured: boolean;
  /** Intermediary SHA cut tag, e.g. "-$18.00 SHA Cut". */
  feeTag: string;
  /** National clearing network badge, e.g. "Raast / BEFTN". */
  rail: string;
  /** Searchable BIC keys (correspondent + domestic banks). */
  bics: string[];
}

/** Curry Slugs that clear at 0% FX spread (EUR-pegged or USD-leg economies). */
const DOLLARIZED_SLUGS = new Set([
  "usd-to-me-eur",
  "usd-to-xk-eur",
  "usd-to-bam",
  "usd-to-ec-usd",
  "usd-to-sv-usd",
]);

const REGION_COUNTRIES: Record<DirectoryRegion, readonly string[]> = {
  americas: [
    "BR", "MX", "CO", "AR", "CL", "PE", "UY", "CR", "DO", "GT", "PA", "EC",
    "BO", "PY", "JM", "TT", "HN", "SV", "NI", "BS", "BB", "GY", "SR", "BZ",
  ],
  "asia-pacific": [
    "PK", "IN", "PH", "BD", "VN", "ID", "TH", "MY", "SG", "HK", "BN", "KZ",
    "UZ", "KH", "MN", "AM", "AZ", "KG", "TJ", "MV", "LA", "BT", "FJ", "PG",
    "WS", "TO", "VU", "SB", "NP", "LK",
  ],
  europe: [
    "PL", "RO", "CZ", "HU", "BG", "HR", "RS", "SE", "NO", "DK", "GE", "UA",
    "AL", "MK", "MD", "IS", "BA",
  ],
  mea: [
    "NG", "EG", "ZA", "KE", "TR", "AE", "SA", "IQ", "MA", "TZ", "UG", "RW",
    "ZM", "MU", "ET", "CM", "SN", "BW", "NA", "MZ", "MW", "AO", "MG", "JO",
    "OM", "KW", "BH", "QA", "TN", "DZ", "LB", "SZ", "LS",
  ],
};

function regionOf(countryCode: string): DirectoryRegion | "other" {
  const code = countryCode.toUpperCase();
  const region = Object.keys(REGION_COUNTRIES).find((key) =>
    (REGION_COUNTRIES[key as DirectoryRegion] as readonly string[]).includes(code),
  ) as DirectoryRegion | undefined;
  return region ?? "other";
}

/** ISO 3166-1 alpha-2 → regional-indicator flag emoji (EU handled). */
export function flagOf(code: string): string {
  if (code.toUpperCase() === "EU") return "🇪🇺";
  const base = 0x1f1e6;
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(base + char.charCodeAt(0) - 65),
    );
}

/**
 * Builds the compact directory index for the home explorer.
 * Sorted by sending currency, then country, for a scannable default view.
 */
export function buildDirectoryIndex(): DirectoryEntry[] {
  const bankSlugs = new Set(BANK_DOSSIERS.flatMap((bank) => bank.connectedCorridors));

  return getCorridors()
    .map((corridor) => {
      const regulation = getRegulatoryBanking(corridor.slug);
      const cut =
        regulation.defaultIntermediaryCut ??
        regulation.banks[0]?.intermediaryUSD ??
        (FALLBACK_SWIFT_BAND.min + FALLBACK_SWIFT_BAND.max) / 2;

      const bankBics = regulation.banks
        .map((bank) => bank.swiftCode)
        .filter((code) => code !== "" && code !== "—");
      const correspondent = primaryCorrespondent(corridor.to, corridor.from);
      const bics = [...new Set([correspondent.bic, ...bankBics])].slice(0, 4);

      return {
        slug: corridor.slug,
        from: corridor.from,
        to: corridor.to,
        flag: flagOf(corridor.countryCode),
        country: corridor.country,
        countryCode: corridor.countryCode,
        currencyName: corridor.currencyName,
        region: regionOf(corridor.countryCode),
        dollarized: DOLLARIZED_SLUGS.has(corridor.slug),
        bankFeatured: bankSlugs.has(corridor.slug),
        feeTag: `-$${cut.toFixed(2)} SHA Cut`,
        rail: regulation.clearingNetwork,
        bics,
      };
    })
    .sort((a, b) => {
      const base = a.from.localeCompare(b.from);
      return base !== 0 ? base : a.country.localeCompare(b.country);
    });
}