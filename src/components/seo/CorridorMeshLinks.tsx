import { getCorridors, getCorridorBySlug } from "@/lib/db";
import Link from "next/link";

interface CorridorMeshLinksProps {
  slug: string;
}

/**
 * PayoutDelta — Internal Mesh Cross-Linking Component.
 *
 * Given a corridor slug, finds 4–6 sibling corridors sharing either the same
 * source currency or the same target region (continent-level match) and renders
 * semantic anchor links for SEO internal meshing.
 */
export default function CorridorMeshLinks({ slug }: CorridorMeshLinksProps): React.JSX.Element | null {
  const current = getCorridorBySlug(slug);
  if (!current) return null;

  const all = getCorridors();
  const seen = new Set<string>();

  // Priority 1: same source currency (exclude self).
  const bySource = all
    .filter((c) => c.from === current.from && c.slug !== slug)
    .slice(0, 4);
  bySource.forEach((c) => seen.add(c.slug));

  // Priority 2: same target currency (few of these exist across source variants).
  const byTarget = all
    .filter((c) => c.to === current.to && !seen.has(c.slug))
    .slice(0, 2);
  byTarget.forEach((c) => seen.add(c.slug));

  const links = [...bySource, ...byTarget].slice(0, 6);
  if (links.length === 0) return null;

  return (
    <nav aria-label="Related corridors" className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Related corridors
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/calculator/${item.slug}/`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-500/40 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-400/40 dark:hover:text-emerald-400"
            >
              {item.from} → {item.to} <span className="text-slate-400 dark:text-slate-500">· {item.country}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
