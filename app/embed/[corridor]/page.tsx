import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getChannels,
  getCorridorBySlug,
  getCorridorSlugs,
  getPlatforms,
} from "@/lib/db";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import { getCorridorHistory } from "@/lib/history";
import { computeRoute, DEFAULT_GROSS_USD } from "@/utils/calculateRoute";
import { formatLocal } from "@/utils/format";
import { BREADCRUMB_ORIGIN, SITE_URL } from "@/lib/seoSchemas";
import { calculateForwardPayout, formatCurrency } from "@/src/lib/engine/math";
import type {
  Corridor as EngineCorridor,
  IntermediaryRoute,
} from "@/src/lib/engine/types";

interface EmbedCorridorPageProps {
  params: Promise<{ corridor: string }>;
}

/** Embed pages are prerendered once per base corridor at build time. */
export const dynamicParams = false;

export function generateStaticParams(): { corridor: string }[] {
  return getCorridorSlugs().map((corridor) => ({ corridor }));
}

export async function generateMetadata({
  params,
}: EmbedCorridorPageProps): Promise<Metadata> {
  const { corridor: slug } = await params;
  const corridor = getCorridorBySlug(slug);
  if (!corridor) {
    return { title: "Corridor widget not found" };
  }
  const title = `${corridor.from} → ${corridor.to} live payout widget`;
  const description = `Embeddable PayoutDelta ${corridor.from} to ${corridor.to} payout widget: active mid-market rate, SWIFT intermediary cut and the real net take-home on a $1,000 invoice.`;
  const ogDescription = `Benchmark SWIFT intermediary deductions (CHASUS33/CITIUS33), retail FX spreads, and tax purpose codes for ${corridor.from} to ${corridor.to} on PayoutDelta.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/embed/${slug}/` },
    openGraph: {
      type: "website",
      siteName: "PayoutDelta",
      url: `${SITE_URL}/embed/${slug}/`,
      title,
      description: ogDescription,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
    },
  };
}

/**
 * Static embeddable backlink card — the isolated surface a third-party site
 * drops into an iframe. The numbers mirror the full calculator: the active
 * mid-market rate (latest bench), the receiving bank's SWIFT intermediary cut
 * and the real net local take-home a $1,000 direct payout lands with. Forced
 * explicit dark hexes so the card reads identically in any embedding context.
 */
import { EmbedResizer } from "@/components/calculator/EmbedResizer";

export default async function EmbedCorridorPage({
  params,
}: EmbedCorridorPageProps) {
  const { corridor: slug } = await params;
  const corridor = getCorridorBySlug(slug);
  if (!corridor) {
    notFound();
  }

  const regulation = getRegulatoryBanking(slug);
  const bank = regulation.banks[0];
  const channels = getChannels();
  const platforms = getPlatforms();
  const direct =
    platforms.find((platform) => platform.id === "direct") ?? platforms[0];
  const history = getCorridorHistory(slug);
  const activeRate =
    history.length > 0 ? history[history.length - 1].rate : corridor.rate;
  const best = computeRoute(
    DEFAULT_GROSS_USD,
    direct,
    corridor,
    channels
  ).verdict.best;
  const wireFee =
    bank?.intermediaryUSD ?? regulation.defaultIntermediaryCut ?? 18;
  const bic = bank && bank.swiftCode !== "—" ? bank.swiftCode : "Local clearing";
  const calculatorUrl = `${BREADCRUMB_ORIGIN}/calculator/${corridor.slug}/`;

  // Engine seam — the card's take-home is computed by the same pure, R1–R4
  // checked waterfall the interactive calculator runs, so both surfaces call
  // one audited function instead of a second hand-inlined formula. The engine
  // returns a source-currency balance, converted to local at the reference
  // rate for display. It is deliberately CONSERVATIVE against the ranked
  // channel quote: it also charges the spread on the fee-bearing balance and
  // the statutory tier, so on a $1,000 USD→PKR direct wire it lands ~Rs 1k
  // below the channel-only figure. The card therefore understates rather than
  // overstates what a beneficiary receives.
  const engineCorridor: EngineCorridor = {
    id: corridor.slug,
    source: corridor.from,
    target: corridor.to,
    // The spread the ranked winner actually charges, read off the channel the
    // route selected — never a hardcoded global.
    baseSpreadPercent:
      channels.find((channel) => channel.id === best?.channelId)?.fxSpread ??
      0.035,
    fixedDeductUsd: best?.feeDeductedUSD ?? 30,
  };
  const intermediaryRoute: IntermediaryRoute = {
    bic: bank?.swiftCode ?? "—",
    bankName: bank?.name ?? corridor.country,
    chargeCode: regulation.field71A.code,
    deductUsd: wireFee,
  };
  const engineResult = calculateForwardPayout(
    best?.netAfterPlatformUSD ?? DEFAULT_GROSS_USD,
    engineCorridor,
    intermediaryRoute,
    regulation.tiers[0]?.rate ?? 0
  );
  const engineLandingLocal = engineResult.netLanding * activeRate;

  return (
    <div className="flex w-full flex-col bg-[#080D1A] p-3 font-mono">
      <EmbedResizer />
      <div className="flex flex-col gap-2.5 rounded-xl border border-[#1E293B] bg-[#0F172A] p-3.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400">
            PayoutDelta
          </span>
          <span className="shrink-0 rounded-full border border-[#1E293B] bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold text-slate-300">
            {corridor.from} → {corridor.to}
          </span>
        </div>

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Active Mid-market Rate
          </p>
          <p className="text-lg font-bold tabular-nums tracking-tight">
            {activeRate.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
            <span className="text-[10px] font-medium text-slate-400">
              {corridor.to} per {corridor.from}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-lg border border-[#1E293B] bg-white/[0.04] p-2.5">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Intermediary Fee (SWIFT BIC)
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums">
              ≈ {formatCurrency(engineResult.intermediaryDeduct, corridor.from)}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-slate-500">{bic}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-[#1E293B] bg-white/[0.04] p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Real Net Take-Home on $1,000
            </p>
            <p
              className={`mt-1 text-sm font-bold tabular-nums ${
                engineResult.isFeeAbsorbed ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {/* R2 — the engine clamped the landing to zero, so the card says
                  so instead of printing a plausible but unspendable number. */}
              {engineResult.isFeeAbsorbed
                ? "Fees exceed transfer"
                : formatLocal(engineLandingLocal, corridor)}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-slate-500">
              {best ? `via ${best.channelName}` : "no feasible rail"}
            </p>
          </div>
        </div>

        <a
          href={calculatorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#1E293B] bg-white/[0.05] px-2.5 py-1 text-[9px] font-semibold text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          Verified by PayoutDelta ↗
        </a>
      </div>
    </div>
  );
}