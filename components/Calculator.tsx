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
import {
  calculateForwardPayout,
  calculateReverseTarget,
  formatCurrency,
} from "@/src/lib/engine/math";
import type {
  Corridor as EngineCorridor,
  IntermediaryRoute,
} from "@/src/lib/engine/types";
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
import AlternativeRailsCard from "@/components/AlternativeRailsCard";
import AuditSheetModal from "@/components/AuditSheetModal";
import type { PrcLetterPrefill } from "@/lib/prcLetterEngine";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useBaseCurrency } from "@/components/providers/BaseCurrencyProvider";

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

/** Fixed settlement notice copied by the "Copy SWIFT Invoice Note" action. */
const SWIFT_INVOICE_NOTE =
  "Settlement Notice: Please instruct your remitting bank to transmit via SWIFT Charge Code OUR. Intermediary correspondent deductions are not absorbed by beneficiary.";

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
  // Phase 2 — settlement currency for *display only*. The solver still runs in
  // USD, and the Invoice-Studio sync payload below is deliberately left in USD
  // because it declares `currency: "USD"` on the record itself; only what the
  // reader sees is re-based.
  const { currency } = useBaseCurrency();
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

  // Milestone 7 — official transit & deductions audit sheet overlay state.
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);

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

  // Quick-action bar — clipboard feedback states (2-second toast).
  const [swipeCopied, setSwipeCopied] = useState(false);
  const [auditCopied, setAuditCopied] = useState(false);

  // Waterfall audit accordion.
  const [waterfallOpen, setWaterfallOpen] = useState(false);

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
  // Phase 2 — the corridor's own statutory bench, resolved once and shared by
  // the solver defaults and the engine audit seam below.
  const regulation = useMemo(
    () => getRegulatoryBanking(corridor.slug),
    [corridor.slug]
  );

  const settlementOverrides = useMemo<SettlementOverrides>(
    () => ({
      wireUSD: regulation.banks[0]?.intermediaryUSD ?? 0,
      localFee: regulation.banks[0]?.localFeeDefault ?? 0,
      tierRate: regulation.tiers[0]?.rate ?? 0,
    }),
    [regulation]
  );

  // The receiving bank the waterfall currently has selected (streamed up by
  // TransactionCostingWidget), falling back to the corridor's primary bench.
  const settlementBank = useMemo(
    () =>
      regulation.banks.find((item) => item.id === selectedBankId) ??
      regulation.banks[0] ??
      null,
    [regulation, selectedBankId]
  );

  // Engine seam — the correspondent/banking layer is recomputed through the
  // pure `src/lib/engine/math.ts` waterfall so the settlement figures obey the
  // R1–R4 invariants (bounded amount, clamped non-negative landing, guarded
  // division, `Intl` fixed-point output). Its base is the post-platform USD
  // balance of the live ranked quote. NOTE the deliberate difference: the
  // ranked verdict quotes the *channel* only, while this layer also subtracts
  // the receiving bank's correspondent cut and the statutory tier — so it is a
  // conservative restatement (always ≤ the channel landing), never a second
  // optimisic number for the same money.
  const engineAudit = useMemo(() => {
    const anchor = route.verdict.best ?? route.quotes[0];
    if (!anchor) {
      return null;
    }
    const channel = channels.find((item) => item.id === anchor.channelId);
    const engineCorridor: EngineCorridor = {
      id: corridor.slug,
      source: corridor.from,
      target: corridor.to,
      baseSpreadPercent: channel?.fxSpread ?? 0,
      fixedDeductUsd: anchor.feeDeductedUSD,
    };
    const intermediaryRoute: IntermediaryRoute = {
      // A local-clearing corridor publishes no BIC; the sentinel is carried
      // verbatim as a label, exactly as the S2.1 ISO 9362 gate exempts it.
      bic: settlementBank?.swiftCode ?? "—",
      bankName: settlementBank?.name ?? corridor.country,
      chargeCode: regulation.field71A.code,
      deductUsd: settlementBank?.intermediaryUSD ?? settlementOverrides.wireUSD,
    };
    // `SettlementOverrides` fields are optional by design (the solver accepts
    // a partial bench); the engine signature is strict, so the tier rate is
    // resolved to a concrete 0 here rather than widening the engine.
    const tierRate = settlementOverrides.tierRate ?? 0;
    const forward = calculateForwardPayout(
      anchor.netAfterPlatformUSD,
      engineCorridor,
      intermediaryRoute,
      tierRate
    );
    const reverse = calculateReverseTarget(
      anchor.netAfterPlatformUSD,
      engineCorridor,
      intermediaryRoute,
      tierRate
    );
    return { forward, reverse, intermediaryRoute };
  }, [
    route,
    channels,
    corridor,
    settlementBank,
    settlementOverrides,
    regulation.field71A.code,
  ]);

  // R2 — the absorption warning only fires when the correspondent + spread +
  // withholding stack consumes the whole post-platform balance. The engine
  // owns the boolean; the UI never renders a negative landing.
  const feeAbsorbed = engineAudit !== null && engineAudit.forward.isFeeAbsorbed;

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

  // Quick-pills — dollar-amount preset setter with clamp.
  const selectPreset = (value: number) => {
    setAmount(clampGrossUSD(value));
  };

  // Copy SWIFT invoice notice with 2s feedback; guarded off main thread so
  // `navigator.clipboard` is always available and SSR never warns.
  useEffect(() => {
    if (!swipeCopied) {
      return;
    }
    const id = window.setTimeout(() => setSwipeCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [swipeCopied]);

  useEffect(() => {
    if (!auditCopied) {
      return;
    }
    const id = window.setTimeout(() => setAuditCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [auditCopied]);

  const copySwifNote = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(SWIFT_INVOICE_NOTE);
      setSwipeCopied(true);
    } catch {
      setSwipeCopied(false);
    }
  };

  const copyAuditLink = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    const params = new URLSearchParams();
    if (isTarget) {
      const best = inverseRoute.verdict.best;
      if (!best) {
        return;
      }
      params.set("mode", "target");
      params.set("platform", platformId);
      params.set("target", String(Math.round(best.targetNetLocal)));
    } else {
      const best = route.verdict.best;
      if (!best) {
        return;
      }
      params.set("mode", "quote");
      params.set("platform", platformId);
      params.set("gross", String(Math.round(best.grossUSD)));
    }
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}?${params.toString()}`
      );
      setAuditCopied(true);
    } catch {
      setAuditCopied(false);
    }
  };

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
      <div className="mb-3 flex w-full items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setAuditSheetOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors duration-200 ease-out hover:bg-emerald-500/20 dark:text-emerald-300"
        >
          📄 Client Audit Sheet
        </button>
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

        {/* Quick-action pill bar — dollar presets + clipboard utilities. The
            active pill keeps a soft emerald ring so the user's choice remains
            legible after state settles. */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-3 py-2.5 shadow-sm backdrop-blur-md">
          {([500, 1000, 2500, 5000, 10000] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => selectPreset(preset)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ease-out ${
                amount === preset
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm"
                  : "border-slate-700/70 bg-slate-800/70 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
              }`}
            >
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(preset)}
            </button>
          ))}
          <span
            className="mx-1 h-4 w-px bg-slate-700/80"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={copySwifNote}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-1.5 text-xs font-mono text-emerald-400 transition-all duration-150 ease-out hover:border-emerald-400 hover:bg-emerald-950/30"
          >
            {swipeCopied ? "✓ Copied SWIFT Note" : "SWIFT OUR Note"}
          </button>
          <button
            type="button"
            onClick={copyAuditLink}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-mono text-zinc-300 transition-all duration-150 ease-out hover:border-zinc-500 hover:bg-zinc-900/80"
          >
            {auditCopied ? "✓ Link Copied" : "Share Audit State"}
          </button>
        </div>

        {/* Engine audit (src/lib/engine/math.ts) — the correspondent layer is
            recomputed through the pure, invariant-checked waterfall on every
            slider move. R2 renders the explicit absorption warning when the
            stack consumes the whole post-platform balance; every figure is
            emitted through the engine's `formatCurrency` (Intl fixed-point). */}
        {engineAudit !== null && (
          <div className="flex w-full min-w-0 flex-col gap-3">
            {feeAbsorbed && (
              <div
                role="alert"
                aria-live="polite"
                className="flex w-full min-w-0 items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-amber-700 dark:text-amber-300"
              >
                <span aria-hidden="true" className="mt-px shrink-0">
                  ⚠️
                </span>
                <span>
                  Intermediary deductions exceed transfer amount; net landing
                  clamped to zero.
                </span>
              </div>
            )}

            {!feeAbsorbed && engineAudit.reverse.feasible && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 font-mono text-[11px] tabular-nums tracking-tight text-black/55 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-white/55 dark:backdrop-blur-md">
                <span>
                  Engine net landing{" "}
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(
                      engineAudit.forward.netLanding,
                      corridor.from
                    )}
                  </span>
                </span>
                <span className="text-black/25 dark:text-white/25" aria-hidden="true">
                  ·
                </span>
                <span>
                  Correspondent {engineAudit.intermediaryRoute.chargeCode}{" "}
                  {formatCurrency(engineAudit.forward.intermediaryDeduct, corridor.from)}
                </span>
                <span className="text-black/25 dark:text-white/25" aria-hidden="true">
                  ·
                </span>
                <span>
                  Effective loss {formatCurrency(
                    engineAudit.forward.grossAmount *
                      engineAudit.forward.effectiveLossPercent,
                    corridor.from
                  )}{" "}
                  ({(engineAudit.forward.effectiveLossPercent * 100).toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* TRUE LANDED CASH waterfall accordion — expands the canonical fee
            lineages so the recipient sees exactly where the invoice dollars go.
            `engineAudit?.forward` is the single source of truth for the net
            landing, intermediary deduct, FX spread and statutory withholding. */}
        <WaterfallAccordion
          open={waterfallOpen}
          onToggle={() => setWaterfallOpen((open) => !open)}
          grossAmount={amount}
          intermediaryDeduct={
            engineAudit?.forward.intermediaryDeduct ?? 0
          }
          chargeCode={
            engineAudit?.intermediaryRoute.chargeCode ??
            regulation.field71A.code
          }
          fxSpreadCost={engineAudit?.forward.fxSpreadCost ?? 0}
          taxDeduct={engineAudit?.forward.statutoryTax ?? 0}
          netLanding={engineAudit?.forward.netLanding ?? 0}
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
                your client for {formatUSD(inverseRoute.verdict.best.grossRequired, currency)}{" "}
                {currency}.
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-black/[0.5] dark:text-white/[0.5]">
                Gross-up covers {formatUSD(inverseRoute.verdict.best.totalCostUSD, currency)}{" "}
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
                      {formatUSD(quote.grossRequired, currency)}
                    </p>
                    <p className="font-mono text-xs tabular-nums tracking-tight text-black/[0.45] dark:text-white/[0.45]">
                      {t("feesToHitTarget", {
                        fees: formatUSD(quote.totalCostUSD, currency),
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

        {/* Milestone 7 — alternative rails monetization engine comparison card.
            Visible on every corridor route (both modes): quantifies the classic
            SWIFT correspondent-chain friction versus modern direct-clearing
            rails and routes the sponsor CTA through the partner directory. */}
        <AlternativeRailsCard
          corridor={corridor}
          grossUSD={
            isTarget
              ? inverseRoute.verdict.best?.grossRequired ?? amount
              : amount
          }
          bestChannelId={
            isTarget
              ? inverseRoute.verdict.best?.channelId
              : route.verdict.best?.channelId
          }
        />
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

      {/* Milestone 7 — official client audit sheet + print-to-PDF overlay. */}
      <AuditSheetModal
        open={auditSheetOpen}
        onClose={() => setAuditSheetOpen(false)}
        corridor={corridor}
        platform={platform}
        quote={route.verdict.best}
      />
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

/** TRUE LANDED CASH fee waterfall / audit log accordion. */
function WaterfallAccordion({
  open,
  onToggle,
  grossAmount,
  intermediaryDeduct,
  chargeCode,
  fxSpreadCost,
  taxDeduct,
  netLanding,
  corridor,
}: {
  open: boolean;
  onToggle: () => void;
  grossAmount: number;
  intermediaryDeduct: number;
  chargeCode: string;
  fxSpreadCost: number;
  taxDeduct: number;
  netLanding: number;
  corridor: Corridor;
}) {
  const effectiveNetRetention =
    grossAmount > 0
      ? Math.min(100, (netLanding / grossAmount) * 100)
      : 0;

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-sm backdrop-blur-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.04]"
      >
        <span className="text-xs font-semibold tracking-widest uppercase text-slate-400 transition-colors group-hover:text-slate-200">
          + View Complete Fee Waterfall / Audit Log
        </span>
        <span
          aria-hidden="true"
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-400 transition-all duration-200 ${
            open ? "rotate-45 border-emerald-500/60 text-emerald-400" : ""
          }`}
        >
          +
        </span>
      </button>

      {open && (
        <dl className="mx-4 mb-3 grid grid-cols-1 gap-x-5 gap-y-2 border-t border-slate-800/80 pt-3 font-mono text-[11px] leading-relaxed tabular-nums tracking-tight text-white/70 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
              Gross Sent
            </dt>
            <dd className="mt-0.5 text-xs font-semibold text-white tabular-nums tracking-tight">
              {formatCurrency(grossAmount, corridor.from)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
              Correspondent Bank Deduct ({chargeCode})
            </dt>
            <dd className="mt-0.5 text-xs font-semibold text-red-400 tabular-nums tracking-tight">
              -{formatCurrency(intermediaryDeduct, corridor.from)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
              FX Mid-Market Variance / Markup
            </dt>
            <dd className="mt-0.5 text-xs font-semibold text-orange-400 tabular-nums tracking-tight">
              -{formatCurrency(fxSpreadCost, corridor.from)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
              Withholding Tax (Statutory Export Exemption Applicable)
            </dt>
            <dd className="mt-0.5 text-xs font-semibold text-amber-400 tabular-nums tracking-tight">
              -{formatCurrency(taxDeduct, corridor.from)}
            </dd>
          </div>
          <div className="sm:col-span-2 md:col-span-1">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
              Net Verified Landing
            </dt>
            <dd className="mt-0.5 text-xs font-bold text-emerald-400 tabular-nums tracking-tight">
              {effectiveNetRetention.toFixed(2)}%
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}