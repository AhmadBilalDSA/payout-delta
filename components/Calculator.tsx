"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type {
  CalcMode,
  ChannelQuote,
  Corridor,
  HistoryPoint,
  Platform,
  SparklineStats,
  WithdrawalChannel,
} from "@/lib/types";
import {
  clampGrossUSD,
  computeRoute,
  DEFAULT_GROSS_USD,
} from "@/utils/calculateRoute";
import {
  computeInverseRoute,
  localSliderBounds,
  type SettlementOverrides,
} from "@/utils/inverseMath";
import { formatLocal, formatUSD } from "@/utils/format";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import { validateCorridorRuntime } from "@/lib/schemaValidator";
import {
  INVOICE_SYNC_EVENT,
  INVOICE_SYNC_KEY,
  type InvoiceSyncPayload,
} from "@/lib/invoiceTypes";
import { writeLocalStorage } from "@/lib/privacyGuard";
import VerdictCard from "@/components/VerdictCard";
import WhatsAppConsultingCard from "@/components/leads/WhatsAppConsultingCard";
import SliderControls from "@/components/SliderControls";
import FeeBreakdownList from "@/components/FeeBreakdownList";
import TaxImpactCard from "@/components/TaxImpactCard";
import TransactionCostingWidget from "@/components/TransactionCostingWidget";
import RateWatchlistWidget from "@/components/RateWatchlistWidget";
import AuditReceipt from "@/components/AuditReceipt";
import PrcLetterModal from "@/components/compliance/PrcLetterModal";
import EmbedSnippetModal from "@/components/EmbedSnippetModal";
import SwiftRouteInspector from "@/components/compliance/SwiftRouteInspector";
import type { PrcLetterPrefill } from "@/lib/prcLetterEngine";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Interactive payout auditor (client island) — Apple-grade, iOS-feel.
 *
 * Phase 3 adds the operating-mode capsule on top of the Milestone 2 surface:
 *
 *   - gross → net ("Quote Audit")  — Phase 1/2 forward pipeline untouched.
 *   - net → gross ("Target Goal")  — inverse deduction solver; the slider
 *     drives a target local payout and the VerdictCard reports the exact USD
 *     invoice required per platform/channel.
 *
 * Both pipelines are `useMemo`-memoized single passes over the same two inputs
 * (amount/target + platform), so re-renders are O(1) and INP stays well under
 * 50ms. No requests, no external fetches — static export budget intact.
 *
 * Provider identities render as typographic monograms + names only under
 * nominative fair use; the mandatory legal line sits beneath the calculator.
 */

function defaultTargetNet(corridor: Corridor): number {
  return Math.max(1, Math.round(DEFAULT_GROSS_USD * corridor.rate));
}

export default function Calculator({
  corridor: rawCorridor,
  platforms,
  channels,
  history,
  sparklineStats,
  platformPreset,
  bluf,
  faq,
}: {
  corridor: Corridor;
  platforms: Platform[];
  channels: WithdrawalChannel[];
  history: HistoryPoint[];
  sparklineStats: SparklineStats;
  /** Long-tail platform preset (e.g. `upwork`), optional for generic routes. */
  platformPreset?: string;
  /** Server-rendered AEO answer citation box — analytical rail slot (above the
      verdict). Rendered by the page (server component), passed as a slot so the
      client island can place it beside the live verdict without losing state. */
  bluf?: ReactNode;
  /** Server-rendered AEO audit FAQ accordion — full-width slot rendered below
      the two-column grid so the tall accordion never unbalances the rail.
      Same child-as-slot pattern as `bluf`. */
  faq?: ReactNode;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  // Phase S2 — runtime schema guard: a malformed corridor prop from a stale
  // HTML payload is silently hydrated to safe statutory defaults before any
  // render reads it (never throws, never changes the prop identity).
  const corridor = useMemo(
    () => validateCorridorRuntime(rawCorridor),
    [rawCorridor]
  );
  const [mode, setMode] = useState<CalcMode>("gross-to-net");
  const [amount, setAmount] = useState<number>(DEFAULT_GROSS_USD);
  const [targetNet, setTargetNet] = useState<number>(() =>
    defaultTargetNet(corridor)
  );
  const [platformId, setPlatformId] = useState<string>(() => {
    if (platformPreset && platforms.some((item) => item.id === platformPreset)) {
      return platformPreset;
    }
    return platforms[0]?.id ?? "upwork";
  });
  const [printQuote, setPrintQuote] = useState<ChannelQuote | null>(null);

  // Phase C — 1-click Bank PRC / FIRC export-exemption letter. `prcSnapshot`
  // is the live emulator state the widget streams upward; the pill opens the
  // modal with that snapshot first, falling back to a statutory default
  // snapshot computed straight off the route/corridor for the first paint.
  const [prcOpen, setPrcOpen] = useState(false);
  const [prcSnapshot, setPrcSnapshot] = useState<PrcLetterPrefill | null>(null);

  // Embeddable backlink widget — snippet generator overlay state.
  const [embedOpen, setEmbedOpen] = useState(false);

  // Phase D — the receiving bank currently active in the waterfall's selector,
  // streamed up by TransactionCostingWidget so the SWIFT Route Inspector stays
  // synchronized with the Local Bank selector underneath it.
  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    const regulation = getRegulatoryBanking(corridor.slug);
    return regulation.banks[0]?.id ?? "";
  });

  // Hotfix — segmented deck: "Payout Fee Comparison" (live audit rail) vs
  // "Local Bank & Tax Settlement" (statutory waterfall + tax + compliance).
  const [activeTab, setActiveTab] = useState<"audit" | "settlement">("audit");

  const platform =
    platforms.find((item) => item.id === platformId) ?? platforms[0];

  // Phase D — sender identity for the wire-transit inspector, derived from the
  // active client platform preset (long-tail corridors pre-set Upwork / Fiverr).
  const senderLabel = useMemo(() => {
    switch (platform?.id) {
      case "upwork":
        return "Upwork Platform Payout";
      case "fiverr":
        return "Fiverr Platform Payout";
      case "deel":
        return "Deel Payroll Payout";
      case "direct":
        return "Direct Client Wire";
      default:
        return "Upwork / Fiverr / Direct Client Wire";
    }
  }, [platform]);

  const route = useMemo(
    () => computeRoute(amount, platform, corridor, channels),
    [amount, platform, corridor, channels]
  );

  // Phase B — the inverse solver grosses up the full statutory settlement
  // stack. The same first-bank / first-tier bench the TransactionCostingWidget
  // defaults to becomes the solver's overrides, so the verdict invoice and the
  // 7-step waterfall agree out of the box (PKR: Meezan wire $15 + PSEB tier).
  const settlementOverrides = useMemo<SettlementOverrides>(() => {
    const regulation = getRegulatoryBanking(corridor.slug);
    return {
      wireUSD: regulation.banks[0]?.intermediaryUSD ?? 0,
      localFee: regulation.banks[0]?.localFeeDefault ?? 0,
      tierRate: regulation.tiers[0]?.rate ?? 0,
    };
  }, [corridor.slug]);

  const inverseRoute = useMemo(
    () =>
      computeInverseRoute(
        targetNet,
        platform,
        corridor,
        channels,
        settlementOverrides
      ),
    [targetNet, platform, corridor, channels, settlementOverrides]
  );

  const isTarget = mode === "net-to-gross";

  // Live tax-impact snapshot: whatever the active mode considers "the quote"
  // (forward best channel vs inverse cheapest invoice) becomes the input for
  // the TaxImpactCard, so its math never disagrees with the VerdictCard.
  const taxSnapshot = useMemo(() => {
    if (isTarget) {
      const quote = inverseRoute.verdict.best ?? inverseRoute.quotes[0];
      if (!quote) return null;
      // Phase B — the solver already grossed the target up over the statutory
      // tier, so the "pre-tax landed" figure is the target divided by (1−tier)
      // and the realization cell lands exactly on the target.
      const preTaxLocal =
        quote.tierRate > 0 ? quote.targetNetLocal / (1 - quote.tierRate) : quote.targetNetLocal;
      return {
        grossUSD: quote.grossRequired,
        grossLocal: quote.grossRequired * corridor.rate,
        netLocalPreTax: preTaxLocal,
        channelCutUSD: quote.totalCostUSD,
        channelName: quote.channelName,
        effectiveRate: quote.effectiveRate,
        tierRate: quote.tierRate,
      };
    }
    const quote = route.verdict.best ?? route.quotes[0];
    if (!quote) return null;
    return {
      grossUSD: amount,
      grossLocal: amount * corridor.rate,
      netLocalPreTax: quote.localAmount,
      channelCutUSD: quote.totalCostUSD,
      channelName: quote.channelName,
      effectiveRate: quote.effectiveRate,
    };
  }, [isTarget, inverseRoute, route, amount, corridor]);

  // Phase C — statutory-fallback snapshot for the 1-click letter: whatever the
  // widget reports wins, but on the very first paint (before any streamed
  // snapshot) we compute the same default bank/tier bench as the solver so the
  // letter never opens blank. Currency & amounts follow the active mode.
  const defaultPrcSnapshot = useMemo<PrcLetterPrefill | null>(() => {
    const regulation = getRegulatoryBanking(corridor.slug);
    const bank = regulation.banks[0];
    const tier = regulation.tiers[0];
    if (!bank || !tier) return null;
    const localNet =
      isTarget && inverseRoute.verdict.best
        ? inverseRoute.verdict.best.targetNetLocal
        : route.verdict.best
          ? route.verdict.best.localAmount
          : 0;
    return {
      corridorSlug: corridor.slug,
      currency: corridor.to,
      currencySymbol: corridor.currencySymbol,
      bankName: bank.name,
      bankSwift: bank.swiftCode !== "—" ? bank.swiftCode : "",
      grossUsd: amount,
      netRealizationLocal: localNet,
      tierName: tier.name,
      tierRate: tier.rate,
      purposeCode: tier.purposeCode ?? "",
      authority: regulation.authority
        ? `${regulation.authority} · ${tier.authority}`
        : "",
    };
  }, [corridor, isTarget, inverseRoute, route, amount]);

  const openPrcLetter = () => setPrcOpen(true);

  // Phase B + invoice sync — "Apply to Invoice Studio" writes the exact
  // gross-up the solver declared as the milestone line item and forwards the
  // statutory bank/tier bench to the studio's Banking & Clearing section,
  // exactly like the TransactionCostingWidget sync bridge (write localStorage
  // + fire the `payoutdelta:synced` event), then navigates to the studio.
  const handleApplyToInvoice = () => {
    const quote = inverseRoute.verdict.best;
    if (!quote || typeof window === "undefined") {
      return;
    }
    const regulation = getRegulatoryBanking(corridor.slug);
    const bank = regulation.banks[0];
    const tier = regulation.tiers[0];
    const swiftBic = bank && bank.swiftCode !== "—" ? bank.swiftCode : "";
    const syncPayload: InvoiceSyncPayload = {
      receivingBank: bank?.name ?? "Local bank wire",
      swiftBic,
      statutoryAuthority: regulation.authority
        ? `${regulation.authority}${tier ? ` · ${tier.authority}` : ""}`
        : "",
      purposeCode: tier?.purposeCode ?? "",
      taxRate: tier?.rate ?? 0,
      currency: "USD",
      timestamp: Date.now(),
      lineItemAmount: Math.round(quote.grossRequired),
      lineItemDescription: `Invoice Solver — bill ${formatUSD(
        quote.grossRequired
      )} USD to net ${Math.round(targetNet).toLocaleString(
        "en-US"
      )} ${corridor.to} via ${quote.channelName}`,
    };
    writeLocalStorage(INVOICE_SYNC_KEY, JSON.stringify(syncPayload));
    window.dispatchEvent(
      new CustomEvent<InvoiceSyncPayload>(INVOICE_SYNC_EVENT, {
        detail: syncPayload,
      })
    );
    router.push("/invoice/");
  };

  const targetBounds = useMemo(() => localSliderBounds(corridor), [corridor]);

  // Phase 8 — the TransactionCostingWidget anchors its 7-step settlement
  // waterfall on whatever quote the active mode already declared "best"
  // (matching the TaxImpactCard), so every figure agrees with the verdict.
  const costingAnchor = useMemo(() => {
    if (isTarget) {
      const quote = inverseRoute.verdict.best ?? inverseRoute.quotes[0];
      if (!quote) return null;
      return {
        grossUSD: quote.grossRequired,
        platformFeeUSD: quote.platformFeeUSD,
        effectiveRate: quote.effectiveRate,
        channelName: quote.channelName,
        requiredGrossUsd: quote.grossRequired,
        targetNetLocal: quote.targetNetLocal,
      };
    }
    const quote = route.verdict.best ?? route.quotes[0];
    if (!quote) return null;
    return {
      grossUSD: amount,
      platformFeeUSD: quote.platformFeeUSD,
      effectiveRate: quote.effectiveRate,
      channelName: quote.channelName,
    };
  }, [isTarget, inverseRoute, route, amount]);

  // Phase G — high-ticket WhatsApp consulting funnel input. Mode-aware:
  // forward audits compare realized local payouts on `route.verdict`, while
  // target-mode audits compare the extra USD the invoice must bill on
  // `inverseRoute.verdict`. The card itself renders nothing unless the
  // leakage clears the monetization thresholds (USD 120 leakage or a
  // USD 2,500+ gross payment).
  const whatsappLead = useMemo(() => {
    const safeDelta = (value: number) =>
      Number.isFinite(value) ? Math.max(0, value) : 0;

    if (isTarget) {
      const best = inverseRoute.verdict.best;
      const worst = inverseRoute.verdict.worst;
      if (best === null || worst === null) {
        return null;
      }
      const spreadDeltaUsd = safeDelta(worst.totalCostUSD - best.totalCostUSD);
      return {
        corridor,
        platform,
        grossUSD: best.grossRequired,
        spreadDeltaUsd,
        spreadDeltaLocal: spreadDeltaUsd * corridor.rate,
      };
    }

    const best = route.verdict.best;
    const worst = route.verdict.worst;
    if (best === null || worst === null) {
      return null;
    }
    return {
      corridor,
      platform,
      grossUSD: amount,
      spreadDeltaUsd: safeDelta(worst.totalCostUSD - best.totalCostUSD),
      spreadDeltaLocal: safeDelta(best.localAmount - worst.localAmount),
    };
  }, [isTarget, inverseRoute, route, amount, corridor, platform]);

  // Phase 7 refresh — "Share calculation" deep-link hydration. When the page
  // loads with `?mode=&platform=&gross=` / `?mode=&platform=&target=` query
  // params (copied from the VerdictCard share button), restore that exact
  // operating state once on mount.
  useEffect(() => {
    const hydrate = () => {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode");
      if (modeParam === "quote") {
        setMode("gross-to-net");
      } else if (modeParam === "target") {
        setMode("net-to-gross");
      }
      const platformParam = params.get("platform");
      if (platformParam && platforms.some((item) => item.id === platformParam)) {
        setPlatformId(platformParam);
      }
      const grossParam = Number(params.get("gross"));
      if (Number.isFinite(grossParam) && grossParam > 0) {
        setAmount(clampGrossUSD(grossParam));
      }
      const targetParam = Number(params.get("target"));
      if (Number.isFinite(targetParam) && targetParam > 0) {
        setTargetNet(clampLocalTarget(targetParam, localSliderBounds(corridor)));
      }
    };
    const id = window.setTimeout(hydrate, 0);
    return () => window.clearTimeout(id);
  }, [corridor, platforms]);

  // When an export is requested, give the print-only receipt one frame to
  // mount, then open the native Save-as-PDF dialog. After the dialog closes,
  // tear the receipt back down so the screen DOM returns to normal.
  useEffect(() => {
    if (printQuote === null) {
      return;
    }
    const printId = window.setTimeout(() => window.print(), 60);
    const handleAfterPrint = () => setPrintQuote(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.clearTimeout(printId);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printQuote]);

  return (
    <div className="w-full min-w-0">
      {/* Embeddable backlink widget access — one-click snippet generator for
          the static /embed card, available on every audit surface. */}
      <div className="mb-3 flex w-full items-center justify-end">
        <button
          type="button"
          onClick={() => setEmbedOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors duration-200 ease-out hover:bg-neutral-50 hover:text-slate-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white/80 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          Embed This Corridor
        </button>
      </div>

      {/* Segmented tab deck — "Payout Fee Comparison" (live audit) vs "Local
          Bank & Tax Settlement" (statutory waterfall). The control spans full
          width above both rails; the active surface is a white pill so the
          obsidian canvas reads at a glance, and `aria-selected` keeps the
          deck accessible for screen readers. */}
      <div
        role="tablist"
        aria-label="Calculator view"
        className="flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-md backdrop-blur-md"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "audit"}
          onClick={() => setActiveTab("audit")}
          className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all sm:px-4 ${
            activeTab === "audit"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
          }`}
        >
          ⚡ Payout Fee Comparison
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "settlement"}
          onClick={() => setActiveTab("settlement")}
          className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all sm:px-4 ${
            activeTab === "settlement"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
          }`}
        >
          🏦 Local Bank &amp; Tax Settlement
        </button>
      </div>

      <div className="mt-6 grid w-full grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Primary Interactive Rail — calculator input card, ranked breakdown and
          the 7-step waterfall engine + bank/tax addendum selectors. Every
          flex child carries `min-w-0` so wide numbers can never compress the
          column (anti-collapse guard against flex sizing overflow). */}
      <div className="flex w-full min-w-0 flex-col gap-5 lg:col-span-7">
        {activeTab === "audit" ? (
          <>
            <SliderControls
          mode={mode}
          onModeChange={setMode}
          amount={amount}
          onAmountChange={(value) => setAmount(clampGrossUSD(value))}
          targetNet={targetNet}
          onTargetNetChange={setTargetNet}
          platformId={platformId}
          onPlatformChange={setPlatformId}
          platforms={platforms}
          corridor={corridor}
        />

        {/* Reverse target-gross invoice solver callout — Mode B only. Shows the
            exact USD invoice the solver grossed up for the current target and
            forwards that exact line item + statutory bench to Invoice Studio. */}
        {isTarget && inverseRoute.verdict.best !== null && (
          <section
            aria-label="Invoice solver"
            className="flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-emerald-700 dark:text-emerald-300">
                To receive exactly {formatLocal(targetNet, corridor)}, invoice
                your client for {formatUSD(inverseRoute.verdict.best.grossRequired)}{" "}
                USD.
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-black/[0.5] dark:text-white/[0.5]">
                Gross-up covers {formatUSD(inverseRoute.verdict.best.totalCostUSD)}{" "}
                in fees via {inverseRoute.verdict.best.channelName} · statutory
                withholding already included.
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyToInvoice}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-emerald-500 active:scale-[0.98] dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              Apply to Invoice Studio
            </button>
          </section>
        )}

        {isTarget ? (
          <section aria-labelledby="required-invoice-breakdown">
            <h2
              id="required-invoice-breakdown"
              className="text-xs font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-400"
            >
              {t("requiredInvoiceTitle")}
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {inverseRoute.quotes.map((quote, index) => (
                <div
                  key={quote.channelId}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-md dark:backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs font-bold text-black/60 ring-1 ring-black/[0.06] dark:bg-neutral-800 dark:text-white/70 dark:ring-white/[0.08]"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-black dark:text-white">
                        {quote.channelName}
                      </p>
                      <p className="font-mono text-xs tabular-nums tracking-tight text-black/[0.45] dark:text-white/[0.45]">
                        {quote.effectiveRate.toFixed(4)} {corridor.to} ·{" "}
                        {t("spreadLabel", {
                          pct: (quote.fxSpread * 100).toFixed(2),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
                      {t("invoiceToClient")}
                    </p>
                    <p className="font-mono text-sm font-bold tabular-nums tracking-tight text-black dark:text-white">
                      {formatUSD(quote.grossRequired)}
                    </p>
                    <p className="font-mono text-xs tabular-nums tracking-tight text-black/[0.45] dark:text-white/[0.45]">
                      {t("feesToHitTarget", {
                        fees: formatUSD(quote.totalCostUSD),
                        amount: Math.round(quote.targetNetLocal).toLocaleString(
                          "en-US"
                        ),
                        currency: corridor.to,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section aria-labelledby="fee-breakdown">
            <h2
              id="fee-breakdown"
              className="text-xs font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-400"
            >
              {t("feeBreakdownTitle")}
            </h2>
            <div className="mt-3">
              <FeeBreakdownList
                quotes={route.quotes}
                corridor={corridor}
                onExport={setPrintQuote}
              />
            </div>
          </section>
        )}
          </>
        ) : (
          <>
            {/* Phase 8/9 — local bank settlement & custom costing under the
                ranked breakdown, shared by every corridor page variant. In
                target mode the widget is anchored on the solver's gross-up so
                the waterfall lands exactly on the target at its default
                bank/tier. */}
            {costingAnchor !== null && (
              <>
                <TransactionCostingWidget
                  corridor={corridor}
                  mode={mode}
                  {...costingAnchor}
                  onGenerateLetter={setPrcSnapshot}
                  onBankChange={setSelectedBankId}
                />

                {/* Phase D — SWIFT intermediary leakage & BIC route inspector,
                    synced to the bank picked in the waterfall above. */}
                <SwiftRouteInspector
                  corridorSlug={corridor.slug}
                  bankId={selectedBankId}
                  senderLabel={senderLabel}
                />

                {/* Phase C — 1-click Bank PRC / FIRC statutory export exemption
                    letter. Opens the generator with the live waterfall snapshot. */}
                <button
                  type="button"
                  onClick={openPrcLetter}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  📄 Generate Bank PRC / Exemption Letter
                </button>
              </>
            )}

            {/* Legal-tech — local-first rate threshold watchlist, mounted
                immediately below the settlement fee-breakdown sheet per the
                Milestone 2 placement contract. Thresholds & pinned rates
                persist per corridor in localStorage; the emerald trigger badge
                + optional desktop notification are 100% on-device. */}
            <RateWatchlistWidget corridor={corridor} />

            {/* Interactive tax & net take-home impact — binds live to the
                settlement stack beside the waterfall; the amounts follow the
                parent amount/target state. */}
            {taxSnapshot !== null && (
              <TaxImpactCard
                corridor={corridor}
                mode={mode}
                invoiceValue={isTarget ? targetNet : amount}
                onInvoiceChange={(value) => {
                  if (isTarget) {
                    setTargetNet(clampLocalTarget(value, targetBounds));
                  } else {
                    setAmount(clampGrossUSD(value));
                  }
                }}
                grossUSD={taxSnapshot.grossUSD}
                grossLocal={taxSnapshot.grossLocal}
                netLocalPreTax={taxSnapshot.netLocalPreTax}
                channelCutUSD={taxSnapshot.channelCutUSD}
                channelName={taxSnapshot.channelName}
                effectiveRate={taxSnapshot.effectiveRate}
                tierRate={taxSnapshot.tierRate}
              />
            )}
          </>
        )}

        {/* Nominative fair use — mandatory legal line. */}
        <p className="text-xs leading-relaxed text-black/[0.45] dark:text-white/[0.45]">
          {t("legalLine")}
        </p>
      </div>

      {/* Analytical & Verification Rail — AEO answer citation box, the live
          verdict card with the partner CTA, and the WhatsApp consulting card
          when leakage clears the monetization threshold. Sticky from the `lg`
          breakpoint below the h-16 header; `order-first lg:order-none` keeps
          the "answer first" reading order on mobile while the two rails sit
          side-by-side on desktop. Every child slot is a self-contained card
          (`rounded-2xl border-slate-800/80 bg-slate-900/60 p-5 sm:p-6`)
          carrying its own `min-w-0`, so long citation chips can never overlap
          or collapse the rail. Card-to-card rhythm is `gap-4` (tighter than
          the audit deck so the short rail balances the input column). */}
      <aside
        className={`flex w-full min-w-0 flex-col gap-4 lg:col-span-5 lg:sticky lg:top-24 ${
          activeTab === "audit" ? "order-first lg:order-none" : ""
        }`}
      >
        {activeTab === "audit" ? (
          <>
            {bluf}
            <VerdictCard
              verdict={route.verdict}
              corridor={corridor}
              quotes={route.quotes}
              platform={platform}
              mode={mode}
              inverseVerdict={inverseRoute.verdict}
              history={history}
              sparklineStats={sparklineStats}
            />
            {whatsappLead !== null && (
              <WhatsAppConsultingCard
                corridor={whatsappLead.corridor}
                platform={whatsappLead.platform}
                grossUSD={whatsappLead.grossUSD}
                leakageUsd={whatsappLead.spreadDeltaUsd}
                leakageLocal={whatsappLead.spreadDeltaLocal}
              />
            )}
          </>
        ) : (
          <StatutoryComplianceCard corridor={corridor} />
        )}
      </aside>

      {/* Print-only audit receipt, mounted the instant an export is asked for
          (becomes the sole visible content inside the Save-as-PDF dialog). */}
      {printQuote !== null && (
        <div className="hidden print:block lg:col-span-12">
          <AuditReceipt
            quote={printQuote}
            corridor={corridor}
            platform={platform}
          />
        </div>
      )}

      {/* Phase C — statutory letter generator overlay (prefilled from the
          live waterfall snapshot, or the statutory default fallback). */}
      {prcOpen && (
        <PrcLetterModal
          open={prcOpen}
          onClose={() => setPrcOpen(false)}
          prefill={prcSnapshot ?? defaultPrcSnapshot}
        />
      )}

      {/* Embeddable backlink widget — snippet generator overlay (live preview
          + 1-click HTML copy) for the static /embed card. */}
      {embedOpen && (
        <EmbedSnippetModal
          open={embedOpen}
          onClose={() => setEmbedOpen(false)}
          corridor={corridor}
        />
      )}
      </div>

      {/* AEO audit FAQ spans the full page width below the two-column rail —
          the tall accordion can no longer stretch the sticky right rail into
          a dead void beside the short input column. Hairline divider + mt-10
          keeps it anchored to the deck rhythm above; it mounts only on the
          audit tab since its Q&As answer the fee-comparison questions. */}
      {activeTab === "audit" && faq !== undefined && (
        <div className="mt-10 w-full border-t border-slate-800/80 pt-8">
          {faq}
        </div>
      )}
    </div>
  );
}

/** Clamps a free-typed local target into the corridor's inverse bounds. */
function clampLocalTarget(
  value: number,
  bounds: { min: number; max: number; step: number }
): number {
  if (!Number.isFinite(value)) {
    return bounds.min;
  }
  const clamped = Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
  const stepped =
    bounds.step > 0
      ? bounds.min + Math.round((clamped - bounds.min) / bounds.step) * bounds.step
      : clamped;
  return Math.min(bounds.max, Math.max(bounds.min, stepped));
}

/**
 * Hotfix — "Statutory Compliance" details card for the settlement tab. Pulls
 * the governing authority, clearing network, default local bank and the first
 * statutory filing tier straight from the build-time regulatory table, so the
 * sticky rail beside the waterfall shows the jurisdiction fields without
 * duplicating the page-level ComplianceGuide drawer below the fold.
 */
function StatutoryComplianceCard({ corridor }: { corridor: Corridor }) {
  const regulation = getRegulatoryBanking(corridor.slug);
  const bank = regulation.banks[0];
  const tier = regulation.tiers[0];

  return (
    <section
      aria-labelledby="statutory-compliance"
      className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-md backdrop-blur-md"
    >
      <p className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
        />
        Statutory Compliance
      </p>
      <h2
        id="statutory-compliance"
        className="mt-4 text-lg font-bold tracking-tight text-slate-100"
      >
        {corridor.country} Payout Regulations
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Local withholding, realization and documentation posture for the{" "}
        {corridor.from} → {corridor.to} corridor.
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        <StatLine label="Governing authority" value={regulation.authority} />
        <StatLine
          label="Clearing network"
          value={regulation.clearingNetwork}
        />
        {tier !== undefined && (
          <StatLine
            label="Default statutory status"
            value={`${tier.name} · ${(tier.rate * 100).toFixed(2)}%`}
          />
        )}
        {tier?.purposeCode !== undefined && (
          <StatLine label="Export purpose code" value={tier.purposeCode} />
        )}
        {bank !== undefined && (
          <StatLine label="Default local bank" value={bank.displayName} />
        )}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
        {regulation.citations.join(" · ")}
      </p>
    </section>
  );
}

/** Single statutory row chip for the compliance card. */
function StatLine({ label, value }: { label: string; value?: string }) {
  if (value === undefined || value === "") {
    return null;
  }
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <span className="text-xs font-medium leading-snug text-slate-200">
        {value}
      </span>
    </div>
  );
}