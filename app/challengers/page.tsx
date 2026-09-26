import type { Metadata } from "next";
import type { ComponentType } from "react";
import Link from "next/link";

import { getCorridors, getDataset } from "@/lib/db";
import { getRegulatoryBanking } from "@/data/regulatoryBanking";
import {
  MODERN_FLAT_FEE_MAX_USD,
  MODERN_FLAT_FEE_MIN_USD,
  WIRE_INTERMEDIARY_MAX_USD,
  WIRE_INTERMEDIARY_MIN_USD,
  WIRE_RETAIL_SPREAD_MAX,
  WIRE_RETAIL_SPREAD_MIN,
  computeAlternativeRailsBenchmark,
} from "@/lib/alternativeRails";
import type { Corridor } from "@/lib/types";
import { SITE_URL } from "@/lib/seoSchemas";

/**
 * TRACK 5 — Challenger Rails & Alternative Settlements.
 *
 * SERVER SHELL ONLY. Every percentage, dollar band and corridor count on this
 * page is resolved once, at module scope, from the two audited sources the
 * whole site is built on:
 *
 *   - `data/fees.json` through `getCorridors()` — the 131-corridor corpus
 *     (base currency, rate, country, receiving currency) that decides WHICH
 *     corridors a challenger rail can actually serve.
 *   - `data/regulatoryBanking.ts` through `getRegulatoryBanking()` — the
 *     benchmark intermediary SHA deduction, the receiving-bank landing fee, the
 *     domestic clearing network and the retail FX spread for that corridor.
 *     This is the same source the /dashboard/ terminal reads, so the
 *     "correspondent wire" column here can never disagree with the terminal.
 *
 * The challenger side is a published-band cost model (`CHALLENGER_PROFILES`
 * below): each rail is expressed as flat + percentage cost lines, so the
 * comparison is arithmetic over the dataset rather than a hand-written claim.
 *
 * Zero-dependency rule (AGENTS.md §2): every flow diagram, comparison bar and
 * fee-delta indicator below is hand-rolled inline SVG geometry on a 24-unit
 * grid — no chart library, no icon pack, no animation dependency.
 */

export const dynamic = "force-static";

/** Benchmark gross every published dollar figure on this page is computed on. */
const BENCHMARK_GROSS_USD = 1000;

/**
 * Midpoint of the audited retail-bank spread band, used whenever a corridor's
 * authored regulation publishes no explicit `retailSpreadPercent` (only the two
 * euroised par-settlement corridors do).
 */
const WIRE_SPREAD_FALLBACK =
  (WIRE_RETAIL_SPREAD_MIN + WIRE_RETAIL_SPREAD_MAX) / 2;

/* -------------------------------------------------------------------------- */
/* Challenger cost model                                                       */
/* -------------------------------------------------------------------------- */

type CostKind = "flat" | "percent";

interface CostLine {
  label: string;
  kind: CostKind;
  min: number;
  max: number;
}

type ChallengerId = "airwallex" | "revolut" | "elevate" | "onchain";

interface ChallengerProfile {
  id: ChallengerId;
  name: string;
  /** Settlement architecture, one line. */
  category: string;
  /** One-sentence positioning used on the card. */
  headline: string;
  summary: string;
  /** Receiving currencies the rail is licensed/clearing-connected for. */
  targets: readonly string[];
  /** Corpus-level coverage statement, rendered verbatim. */
  coverage: string;
  /** How the last mile actually lands, in plain language. */
  settlement: string;
  /** Regulatory / custody posture. */
  posture: string;
  costLines: readonly CostLine[];
}

const CHALLENGER_PROFILES: readonly ChallengerProfile[] = [
  {
    id: "airwallex",
    name: "Airwallex",
    category: "Local clearing network routing",
    headline:
      "Routes on the receiving country's own clearing system, so no intermediary banker ever touches the wire.",
    summary:
      "A global business account funded once, then paid out over local rails — FAST/IBG in Malaysia, FPS/HKICL in Hong Kong, InstaPay in the Philippines, BI-FAST in Indonesia, NAPAS in Vietnam, IMPS/NEFT in India. The correspondent SHA deduction that dominates a classic wire simply does not exist on this path; the cost moves to a sub-1% in-country payout fee plus a thin FX markup above mid-market.",
    targets: ["HKD", "SGD", "MYR", "PHP", "IDR", "VND", "INR", "THB", "AED"],
    coverage:
      "Covers the APAC and Gulf corridors in the audited corpus where a licensed local clearing scheme exists.",
    settlement:
      "Same-day to two-day local credit, straight into the beneficiary's domestic account — no correspondent hop, no field 71A deduction.",
    posture:
      "Regulated money-services business in each operating market; funds held with partner banks under local safeguarding rules.",
    costLines: [
      {
        label: "Local clearing payout",
        kind: "percent",
        min: 0.0025,
        max: 0.005,
      },
      {
        label: "FX markup above mid-market",
        kind: "percent",
        min: 0,
        max: 0.001,
      },
      {
        label: "In-country collection leg",
        kind: "flat",
        min: 0.3,
        max: 1.2,
      },
    ],
  },
  {
    id: "revolut",
    name: "Revolut Business",
    category: "Multi-currency account + SEPA / ACH off-ramp",
    headline:
      "Hold the balance in the target currency, then push it out on a domestic scheme rail instead of paying a correspondent to convert it.",
    summary:
      "Multi-currency business accounts with local collection details in the major settlement currencies, so the FX leg is eliminated rather than merely cheapened: the money arrives in EUR or USD and leaves on SEPA Instant, SEPA Credit Transfer or ACH Same-Day. The intermediary deduction band collapses to whatever the receiving bank charges on a domestic transfer — often zero on SEPA.",
    targets: [
      "EUR",
      "GBP",
      "USD",
      "PLN",
      "CZK",
      "RON",
      "SEK",
      "NOK",
      "DKK",
      "HUF",
      "BGN",
      "ALL",
      "ISK",
    ],
    coverage:
      "Covers the euroised, sterling and Nordic corridors in the audited corpus — the widest single-footprint match of the four rails.",
    settlement:
      "Instant or same-day domestic credit in 35+ SEPA and ACH jurisdictions; the beneficiary sees a local transfer, not an international one.",
    posture:
      "EMI authorised in the EEA and UK, partnered with US banks for the ACH off-ramp; client funds safeguarded, not lent.",
    costLines: [
      {
        label: "SEPA / ACH transfer fee",
        kind: "flat",
        min: 0,
        max: 2,
      },
      {
        label: "FX markup on the on/off-ramp",
        kind: "percent",
        min: 0,
        max: 0.004,
      },
      {
        label: "Domestic receiving fee",
        kind: "flat",
        min: 0,
        max: 1.5,
      },
    ],
  },
  {
    id: "elevate",
    name: "Elevate Pay",
    category: "US virtual account routing (FDIC-insured partner bank)",
    headline:
      "Collect on a US virtual account, then disburse to the contractor's home rail — built for the emerging tech hubs.",
    summary:
      "Clients get a US virtual account number at an FDIC-insured partner bank, so inbound invoices are collected in USD and the treasury can batch disbursements to Pakistan, India, the Philippines and Nigeria. It is the pragmatic middle path: USD-denominated collection removes the conversion guesswork, while the outbound leg uses local payout instructions rather than an MT103 walked by two correspondent banks.",
    targets: ["PKR", "INR", "PHP", "NGN"],
    coverage:
      "Targets the four corridor families this page's contractor cohort actually pays: USD → PKR / INR / PHP / NGN.",
    settlement:
      "Local payout instructions in the destination market, cleared inside the country; USD collection leg is a standard domestic ACH credit.",
    posture:
      "Virtual accounts are issued by an FDIC-insured partner bank; the fintech layer is typically registered as a money transmitter in the receiving jurisdiction.",
    costLines: [
      {
        label: "Virtual account + payout orchestration",
        kind: "flat",
        min: 0.5,
        max: 1.5,
      },
      {
        label: "FX conversion",
        kind: "percent",
        min: 0.0015,
        max: 0.004,
      },
      {
        label: "Local payout rail (PK / IN / PH / NG)",
        kind: "flat",
        min: 1,
        max: 3,
      },
    ],
  },
  {
    id: "onchain",
    name: "On-chain settlement (USDC / USDT)",
    category: "Polygon / Arbitrum L2 → P2P or CEX off-ramp",
    headline:
      "Settle the leg on a low-fee layer-2 network, then convert locally — the only route where the transport cost is measured in cents.",
    summary:
      "A stablecoin leg on Polygon or Arbitrum costs $0.01–$0.50 of gas for the whole transfer regardless of distance, which is structurally different from a correspondent wire's flat $15–$35 deduction. The real cost moves to the off-ramp: a local P2P or centralised-exchange conversion in the receiving market, where the published spread band of roughly 0.5–3% is what a traditional 5–15% correspondent-and-retail-bank route pays in the opposite direction — plus compliance, counterparty and settlement-velocity risk the wire does not carry.",
    targets: [
      "PHP",
      "NGN",
      "INR",
      "PKR",
      "VND",
      "IDR",
      "BRL",
      "TRY",
      "UAH",
      "MXN",
      "ZAR",
      "THB",
    ],
    coverage:
      "Matches the corridors in the corpus with liquid local P2P/CEX desks — the volatile, thin-spread off-ramp markets.",
    settlement:
      "L2 confirmation in seconds, then an off-ramp conversion into local currency rails; finality at the bank is a separate, slower step.",
    posture:
      "Not a bank and not deposit-insured: the stablecoin leg is unprotected, issuer exposure is issuer risk, and on-chain addresses add irreversible-payment risk.",
    costLines: [
      {
        label: "L2 gas (Polygon / Arbitrum)",
        kind: "flat",
        min: 0.01,
        max: 0.5,
      },
      {
        label: "P2P / CEX off-ramp spread",
        kind: "percent",
        min: 0.005,
        max: 0.03,
      },
      {
        label: "Exchange withdrawal + bridge",
        kind: "flat",
        min: 0,
        max: 0.99,
      },
    ],
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Dataset resolution — fees.json × regulatoryBanking.ts                      */
/* -------------------------------------------------------------------------- */

interface CorridorEconomics {
  corridor: Corridor;
  country: string;
  flag: string;
  clearingNetwork: string;
  /** Benchmark correspondent SHA deduction, USD. */
  wireCutUSD: number;
  /** Authored retail FX spread as a fraction, or the audited band midpoint. */
  wireSpread: number;
  /** All-in cost of a classic MT103 at the benchmark gross. */
  wireAllInUSD: number;
}

function flagOf(code: string): string {
  if (code.toUpperCase() === "EU") return "🇪🇺";
  const base = 0x1f1e6;
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(base + char.charCodeAt(0) - 65)
    );
}

/** Median of a numeric series; NaN-safe on an empty input. */
function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The classic-wire economics for one corridor, straight from the two sources. */
function resolveWire(corridor: Corridor): CorridorEconomics {
  const regulation = getRegulatoryBanking(corridor.slug);
  const bank = regulation.banks[0];
  const cut =
    regulation.defaultIntermediaryCut ??
    bank?.intermediaryUSD ??
    WIRE_INTERMEDIARY_MIN_USD;
  const spread = regulation.retailSpreadPercent
    ? regulation.retailSpreadPercent / 100
    : WIRE_SPREAD_FALLBACK;

  return {
    corridor,
    country: corridor.country,
    flag: flagOf(corridor.countryCode),
    clearingNetwork: regulation.clearingNetwork,
    wireCutUSD: cut,
    wireSpread: spread,
    wireAllInUSD: cut + BENCHMARK_GROSS_USD * spread,
  };
}

/** Total cost of a rail's cost lines at the benchmark gross. */
function railAllInUSD(
  costLines: readonly CostLine[],
  pick: (line: CostLine) => number
): number {
  return costLines.reduce(
    (sum, line) =>
      sum +
      (line.kind === "flat"
        ? pick(line)
        : BENCHMARK_GROSS_USD * pick(line)),
    0
  );
}

interface ProfileCorridorRow extends CorridorEconomics {
  /** Cheapest modelled challenger cost on this corridor. */
  railAllInUSD: number;
  /** `wireAllInUSD - railAllInUSD`, the retained amount. */
  retainedUSD: number;
  /** Retained amount as a share of the gross. */
  retainedShare: number;
}

interface ProfileRollup {
  profile: ChallengerProfile;
  rows: ProfileCorridorRow[];
  corridorsCovered: number;
  medianWireCutUSD: number;
  medianWireAllInUSD: number;
  medianRailAllInUSD: number;
  medianRetainedUSD: number;
  medianRetainedShare: number;
  bestRetainedUSD: number;
}

function buildRollup(
  profile: ChallengerProfile,
  economicsBySlug: Map<string, CorridorEconomics>
): ProfileRollup {
  const covered = getCorridors().filter((corridor) =>
    profile.targets.includes(corridor.to)
  );

  const rows: ProfileCorridorRow[] = covered
    .map((corridor) => {
      const wire = economicsBySlug.get(corridor.slug);
      if (!wire) return null;
      const railAllIn = railAllInUSD(
        profile.costLines,
        (line) => (line.min + line.max) / 2
      );
      const retainedUSD = wire.wireAllInUSD - railAllIn;
      return {
        ...wire,
        railAllInUSD: railAllIn,
        retainedUSD,
        retainedShare: retainedUSD / BENCHMARK_GROSS_USD,
      };
    })
    .filter((row): row is ProfileCorridorRow => row !== null)
    .sort((a, b) => b.retainedUSD - a.retainedUSD);

  return {
    profile,
    rows,
    corridorsCovered: rows.length,
    medianWireCutUSD: median(rows.map((row) => row.wireCutUSD)),
    medianWireAllInUSD: median(rows.map((row) => row.wireAllInUSD)),
    medianRailAllInUSD: median(rows.map((row) => row.railAllInUSD)),
    medianRetainedUSD: median(rows.map((row) => row.retainedUSD)),
    medianRetainedShare: median(rows.map((row) => row.retainedShare)),
    bestRetainedUSD: rows.reduce(
      (best, row) => Math.max(best, row.retainedUSD),
      0
    ),
  };
}

/** Whole-corridor wire baseline, used for the corpus KPI strip. */
const ALL_CORRIDORS = getCorridors().map(resolveWire);
const ECONOMICS_BY_SLUG = new Map(
  ALL_CORRIDORS.map((row) => [row.corridor.slug, row])
);
const ROLLUPS = CHALLENGER_PROFILES.map((profile) =>
  buildRollup(profile, ECONOMICS_BY_SLUG)
);

const WIRE_MEDIAN_CUT = median(ALL_CORRIDORS.map((row) => row.wireCutUSD));
const WIRE_MEDIAN_ALL_IN = median(ALL_CORRIDORS.map((row) => row.wireAllInUSD));
const WIRE_MEDIAN_SHARE = WIRE_MEDIAN_ALL_IN / BENCHMARK_GROSS_USD;
const RAIL_MEDIAN_ALL_IN = median(
  ROLLUPS.map((rollup) => rollup.medianRailAllInUSD)
);
const COVERED_SLUGS = new Set(
  ROLLUPS.flatMap((rollup) => rollup.rows.map((row) => row.corridor.slug))
);
const DIRECT_RAIL_CORRIDORS = ALL_CORRIDORS.filter((row) =>
  /Raast|IMPS|NEFT|RTGS|FAST|InstaPay|SEPA|PESONet|SPEI|PIX|ELIXIR|NAPAS|GhIPSS|FPS|IBG|CODI/i.test(
    row.clearingNetwork
  )
);
const DATASET_REVISION = getDataset().updatedAt.slice(0, 10);

/** Headline comparison used by the FAQ answers and the JSON-LD. */
const RAILS_BENCHMARK = computeAlternativeRailsBenchmark(BENCHMARK_GROSS_USD);

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

const usd = (value: number) => `$${value.toFixed(2)}`;
const usd0 = (value: number) => `$${Math.round(value)}`;
const share = (value: number) => `${(value * 100).toFixed(2)}%`;

/** Locale-independent gross label, so the build is byte-stable across runtimes. */
const GROSS_LABEL = "$1,000";

const SURFACE =
  "rounded-3xl border border-neutral-800/80 bg-neutral-950/60 p-6 shadow-sm sm:p-8";
const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/40";

/* -------------------------------------------------------------------------- */
/* Hand-rolled SVG primitives (zero charting dependencies)                     */
/* -------------------------------------------------------------------------- */

const STROKE = {
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Rounded lane node with a caption; the shared building block of every diagram. */
function Node({
  x,
  y,
  w,
  h,
  title,
  caption,
  tone = "slate",
  mono = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  caption?: string;
  tone?: "slate" | "amber" | "emerald";
  mono?: boolean;
}) {
  const stroke =
    tone === "amber"
      ? "rgba(245,158,11,0.55)"
      : tone === "emerald"
        ? "rgba(16,185,129,0.5)"
        : "rgba(148,163,184,0.35)";
  const fill =
    tone === "amber"
      ? "rgba(245,158,11,0.07)"
      : tone === "emerald"
        ? "rgba(16,185,129,0.07)"
        : "rgba(148,163,184,0.05)";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.25}
      />
      <text
        x={x + w / 2}
        y={caption ? y + h / 2 - 3 : y + h / 2 + 3}
        textAnchor="middle"
        fontSize={mono ? 8.5 : 9.5}
        fontFamily={mono ? "ui-monospace, monospace" : "inherit"}
        fill="rgba(255,255,255,0.78)"
      >
        {title}
      </text>
      {caption ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 9}
          textAnchor="middle"
          fontSize={8}
          fontFamily="ui-monospace, monospace"
          fill="rgba(255,255,255,0.38)"
        >
          {caption}
        </text>
      ) : null}
    </g>
  );
}

/** Hand-drawn arrow: a segment plus a chevron head, so no <marker> ids collide. */
function Arrow({
  x1,
  y1,
  x2,
  y2,
  tone = "slate",
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: "slate" | "amber" | "emerald";
  dashed?: boolean;
}) {
  const stroke =
    tone === "amber"
      ? "rgba(245,158,11,0.6)"
      : tone === "emerald"
        ? "rgba(16,185,129,0.6)"
        : "rgba(148,163,184,0.45)";
  const head = 5;
  return (
    <g {...STROKE} stroke={stroke} strokeWidth={1.25}>
      {dashed ? (
        <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="3 3" />
      ) : (
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
      )}
      <polyline
        points={`${x2 - head},${y2 - head * 0.8} ${x2},${y2} ${x2 - head},${y2 + head * 0.8}`}
      />
    </g>
  );
}

/** Fee chip pinned to a lane: the deduction that hop actually costs. */
function Chip({
  x,
  y,
  text,
  tone,
}: {
  x: number;
  y: number;
  text: string;
  tone: "amber" | "emerald";
}) {
  const fill =
    tone === "amber"
      ? "rgba(245,158,11,0.12)"
      : "rgba(16,185,129,0.12)";
  const stroke =
    tone === "amber"
      ? "rgba(245,158,11,0.45)"
      : "rgba(16,185,129,0.45)";
  const width = Math.max(38, text.length * 5.1 + 12);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={15}
        rx={7.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      <text
        x={x + width / 2}
        y={y + 10.5}
        textAnchor="middle"
        fontSize={8}
        fontFamily="ui-monospace, monospace"
        fill={tone === "amber" ? "rgb(253,224,71)" : "rgb(110,231,183)"}
      >
        {text}
      </text>
    </g>
  );
}

/**
 * The two-lane comparison: a classic MT103 walked by two correspondent banks
 * against a challenger lane that never leaves the clearing system. The lane-A
 * chips quote the audited band rather than a fabricated per-hop split, because
 * the actual deduction lands on the beneficiary's credit advice.
 */
function DualLaneDiagram({ medianCut }: { medianCut: number }) {
  return (
    <svg
      viewBox="0 0 760 268"
      className="h-auto w-full"
      role="img"
      aria-label="Flow diagram: a classic SWIFT MT103 passes through two correspondent banks and pays an intermediary deduction at each hop, while a challenger rail clears on the local scheme and pays a single flat fee."
    >
      <text
        x={16}
        y={20}
        fontSize={9}
        fontFamily="ui-monospace, monospace"
        fill="rgba(253,224,71,0.85)"
      >
        LANE A · CLASSIC MT103 (SHA)
      </text>
      <text
        x={16}
        y={150}
        fontSize={9}
        fontFamily="ui-monospace, monospace"
        fill="rgba(110,231,183,0.85)"
      >
        LANE B · CHALLENGER RAIL
      </text>

      {/* Lane A: four nodes, three hops, two deduction chips. */}
      <Node x={16} y={32} w={140} h={44} title="Origin bank" caption="your account" />
      <Node x={196} y={32} w={140} h={44} title="Correspondent A" caption="CHASUS33" tone="amber" />
      <Node x={376} y={32} w={140} h={44} title="Correspondent B" caption="DEUTDEFF" tone="amber" />
      <Node x={556} y={32} w={140} h={44} title="Beneficiary bank" caption="field 71A" />
      <Arrow x1={156} y1={54} x2={192} y2={54} tone="amber" />
      <Arrow x1={336} y1={54} x2={372} y2={54} tone="amber" />
      <Arrow x1={516} y1={54} x2={552} y2={54} tone="amber" />
      <Chip
        x={138}
        y={84}
        text={`SHA $${WIRE_INTERMEDIARY_MIN_USD}–${WIRE_INTERMEDIARY_MAX_USD}`}
        tone="amber"
      />
      <Chip x={330} y={84} text="field 71A" tone="amber" />
      <text
        x={400}
        y={94}
        fontSize={8.5}
        fontFamily="ui-monospace, monospace"
        fill="rgba(255,255,255,0.42)"
      >
        + retail FX markup 2.0–4.2% (median cut {usd0(medianCut)})
      </text>

      {/* Lane B: three nodes, two hops, one fee chip. */}
      <Node x={16} y={162} w={140} h={44} title="Origin account" caption="multi-currency" tone="emerald" />
      <Node x={216} y={162} w={180} h={44} title="Challenger rail" caption="local clearing / L2" tone="emerald" />
      <Node x={456} y={162} w={180} h={44} title="Local account" caption="same currency" tone="emerald" />
      <Arrow x1={156} y1={184} x2={212} y2={184} tone="emerald" />
      <Arrow x1={396} y1={184} x2={452} y2={184} tone="emerald" />
      <Chip x={264} y={214} text={`flat ${usd(MODERN_FLAT_FEE_MIN_USD)}–${usd(MODERN_FLAT_FEE_MAX_USD)}`} tone="emerald" />
      <text
        x={460}
        y={226}
        fontSize={8.5}
        fontFamily="ui-monospace, monospace"
        fill="rgba(255,255,255,0.42)"
      >
        0% intermediary deduction
      </text>

      <line
        x1={16}
        y1={132}
        x2={744}
        y2={132}
        stroke="rgba(148,163,184,0.18)"
        strokeWidth={1}
        strokeDasharray="2 4"
      />
      <text
        x={16}
        y={252}
        fontSize={8.5}
        fontFamily="ui-monospace, monospace"
        fill="rgba(255,255,255,0.35)"
      >
        Both lanes settle the same invoice. Only Lane B keeps the intermediary out of the path.
      </text>
    </svg>
  );
}

/** Airwallex: one origin fanning into the local clearing schemes it rides. */
function ClearingFanDiagram() {
  const schemes = [
    "MY · IBG",
    "HK · FPS",
    "PH · InstaPay",
    "ID · BI-FAST",
    "VN · NAPAS",
    "IN · IMPS",
  ];
  return (
    <svg
      viewBox="0 0 360 190"
      className="h-auto w-full"
      role="img"
      aria-label="Diagram: a single multi-currency account fans out into six in-country clearing schemes instead of one correspondent wire."
    >
      <Node x={12} y={72} w={96} h={44} title="Account" caption="USD / EUR / GBP" tone="emerald" />
      {schemes.map((scheme, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 168 + column * 108;
        const y = 20 + row * 52;
        return (
          <g key={scheme}>
            <Arrow
              x1={108 + row * 4}
              y1={94}
              x2={x - 4}
              y2={y + 20}
              tone="emerald"
            />
            <Node x={x} y={y} w={96} h={40} title={scheme} mono />
          </g>
        );
      })}
    </svg>
  );
}

/** Revolut: a stacked multi-currency account feeding two domestic off-ramps. */
function OffRampDiagram() {
  return (
    <svg
      viewBox="0 0 360 190"
      className="h-auto w-full"
      role="img"
      aria-label="Diagram: a multi-currency business account holds EUR and USD balances and pays out over SEPA Instant and ACH Same-Day domestic rails."
    >
      <g>
        <rect x={12} y={26} width={104} height={34} rx={9} fill="rgba(16,185,129,0.07)" stroke="rgba(16,185,129,0.5)" strokeWidth={1.25} />
        <text x={64} y={47} textAnchor="middle" fontSize={9.5} fill="rgba(255,255,255,0.78)">EUR balance</text>
        <rect x={12} y={68} width={104} height={34} rx={9} fill="rgba(16,185,129,0.07)" stroke="rgba(16,185,129,0.5)" strokeWidth={1.25} />
        <text x={64} y={89} textAnchor="middle" fontSize={9.5} fill="rgba(255,255,255,0.78)">USD balance</text>
        <rect x={12} y={110} width={104} height={34} rx={9} fill="rgba(148,163,184,0.05)" stroke="rgba(148,163,184,0.35)" strokeWidth={1.25} />
        <text x={64} y={131} textAnchor="middle" fontSize={9.5} fill="rgba(255,255,255,0.6)">GBP balance</text>
      </g>
      <Arrow x1={116} y1={60} x2={168} y2={44} tone="emerald" />
      <Arrow x1={116} y1={127} x2={168} y2={130} tone="emerald" />
      <Node x={172} y={24} w={176} h={40} title="SEPA Instant" caption="35+ jurisdictions · EUR" tone="emerald" />
      <Node x={172} y={110} w={176} h={40} title="ACH Same-Day" caption="US · USD" tone="emerald" />
      <text
        x={12}
        y={172}
        fontSize={8.5}
        fontFamily="ui-monospace, monospace"
        fill="rgba(255,255,255,0.35)"
      >
        No FX leg: the balance is already in the payout currency.
      </text>
    </svg>
  );
}

/** Elevate Pay: FDIC-insured collection stack over four hub payout rails. */
function VirtualAccountDiagram() {
  const hubs = ["PK · 1LINK", "IN · IMPS", "PH · InstaPay", "NG · NIP"];
  return (
    <svg
      viewBox="0 0 360 190"
      className="h-auto w-full"
      role="img"
      aria-label="Diagram: an FDIC-insured US partner bank issues a virtual account that collects USD invoices, then four local payout rails disburse to contractors in Pakistan, India, the Philippines and Nigeria."
    >
      <Node x={110} y={12} w={140} h={40} title="Client invoices" caption="USD" />
      <Arrow x1={180} y1={52} x2={180} y2={68} />
      <rect x={96} y={70} width={168} height={44} rx={10} fill="rgba(16,185,129,0.07)" stroke="rgba(16,185,129,0.5)" strokeWidth={1.25} />
      <text x={180} y={89} textAnchor="middle" fontSize={9.5} fill="rgba(255,255,255,0.82)">US virtual account</text>
      <text x={180} y={103} textAnchor="middle" fontSize={8} fontFamily="ui-monospace, monospace" fill="rgba(110,231,183,0.75)">FDIC-insured partner bank</text>
      {hubs.map((hub, index) => {
        const x = 12 + index * 88;
        return (
          <g key={hub}>
            <Arrow x1={180} y1={114} x2={x + 40} y2={144} tone="emerald" />
            <Node x={x} y={146} w={80} h={36} title={hub} mono />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * On-chain: the gas ladder is the whole argument — a distance-independent
 * transport cost measured in cents, with the friction relocated to the off-ramp.
 */
function L2GasDiagram() {
  const ticks = [
    { label: "$0.01", x: 150 },
    { label: "$0.50", x: 236 },
  ];
  return (
    <svg
      viewBox="0 0 360 190"
      className="h-auto w-full"
      role="img"
      aria-label="Diagram: a Polygon or Arbitrum settlement leg costs between one and fifty cents of gas regardless of distance, then a P2P or centralised-exchange off-ramp absorbs a 0.5 to 3 percent spread."
    >
      <Node x={12} y={20} w={116} h={40} title="USDC / USDT" caption="stablecoin leg" tone="emerald" />
      <Node x={160} y={20} w={116} h={40} title="Polygon / Arbitrum" caption="L2 settlement" tone="emerald" />
      <Node x={252} y={20} w={96} h={40} title="Off-ramp" caption="P2P / CEX" tone="slate" />
      <Arrow x1={128} y1={40} x2={156} y2={40} tone="emerald" />
      <Arrow x1={276} y1={40} x2={250} y2={40} tone="emerald" />

      <text x={12} y={96} fontSize={9} fontFamily="ui-monospace, monospace" fill="rgba(255,255,255,0.42)">GAS LADDER · DISTANCE-INDEPENDENT</text>
      <line x1={12} y1={126} x2={348} y2={126} stroke="rgba(148,163,184,0.28)" strokeWidth={1.25} />
      {ticks.map((tick) => (
        <g key={tick.label}>
          <line x1={tick.x} y1={120} x2={tick.x} y2={132} stroke="rgba(16,185,129,0.6)" strokeWidth={1.25} />
          <text x={tick.x} y={146} textAnchor="middle" fontSize={8.5} fontFamily="ui-monospace, monospace" fill="rgb(110,231,183)">{tick.label}</text>
        </g>
      ))}
      <text x={196} y={146} textAnchor="middle" fontSize={8.5} fontFamily="ui-monospace, monospace" fill="rgba(255,255,255,0.42)">typical transfer</text>

      <text x={12} y={172} fontSize={8.5} fontFamily="ui-monospace, monospace" fill="rgba(255,255,255,0.35)">
        Off-ramp spread 0.5–3% is where the cost actually lives.
      </text>
    </svg>
  );
}

const RAIL_DIAGRAMS: Record<ChallengerId, ComponentType> = {
  airwallex: ClearingFanDiagram,
  revolut: OffRampDiagram,
  elevate: VirtualAccountDiagram,
  onchain: L2GasDiagram,
};

/**
 * Horizontal comparison bars — all-in cost at the $1,000 benchmark, wire first.
 * Every bar is proportional to the same scale so the widths are comparable.
 */
function CostBars() {
  const rows = [
    {
      label: "Classic MT103 (median corridor)",
      value: WIRE_MEDIAN_ALL_IN,
      tone: "amber" as const,
    },
    ...ROLLUPS.map((rollup) => ({
      label: rollup.profile.name,
      value: rollup.medianRailAllInUSD,
      tone: "emerald" as const,
    })),
  ];
  const scaleMax = Math.max(...rows.map((row) => row.value));
  const width = 560;
  const barHeight = 22;
  const gap = 34;

  return (
    <svg
      viewBox={`0 0 ${width} ${rows.length * gap + 18}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Bar chart of all-in cost at the one thousand dollar benchmark: a classic wire median of ${usd0(WIRE_MEDIAN_ALL_IN)} against challenger rail medians of ${ROLLUPS.map((r) => `${r.profile.name} ${usd(r.medianRailAllInUSD)}`).join(", ")}.`}
    >
      {rows.map((row, index) => {
        const y = index * gap + 8;
        const barWidth = Math.max(4, (row.value / scaleMax) * (width - 190));
        return (
          <g key={row.label}>
            <text
              x={0}
              y={y + 11}
              fontSize={9.5}
              fill="rgba(255,255,255,0.6)"
            >
              {row.label}
            </text>
            <rect
              x={182}
              y={y}
              width={width - 190}
              height={barHeight}
              rx={7}
              fill="rgba(148,163,184,0.07)"
            />
            <rect
              x={182}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={7}
              fill={
                row.tone === "amber"
                  ? "rgba(245,158,11,0.28)"
                  : "rgba(16,185,129,0.28)"
              }
              stroke={
                row.tone === "amber"
                  ? "rgba(245,158,11,0.6)"
                  : "rgba(16,185,129,0.6)"
              }
              strokeWidth={1}
            />
            <text
              x={width}
              y={y + 15}
              textAnchor="end"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              fill={
                row.tone === "amber"
                  ? "rgb(253,224,71)"
                  : "rgb(110,231,183)"
              }
            >
              {usd(row.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Fee-difference indicator: two proportional micro-bars plus the retained
 * amount, used per corridor inside the coverage table.
 */
function DeltaMeter({ wire, rail }: { wire: number; rail: number }) {
  const max = Math.max(wire, rail, 1);
  const wireWidth = (wire / max) * 52;
  const railWidth = (rail / max) * 52;
  return (
    <svg
      viewBox="0 0 120 22"
      className="h-[22px] w-[120px] shrink-0"
      role="img"
      aria-label={`Wire all-in ${usd(wire)} versus rail all-in ${usd(rail)}.`}
    >
      <rect x={0} y={2} width={wireWidth} height={7} rx={3.5} fill="rgba(245,158,11,0.35)" />
      <rect x={0} y={13} width={railWidth} height={7} rx={3.5} fill="rgba(16,185,129,0.4)" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const DESCRIPTION = `Institutional comparison of four challenger settlement rails — Airwallex local clearing, Revolut Business SEPA/ACH off-ramps, Elevate Pay US virtual accounts and USDC/USDT on Polygon or Arbitrum — benchmarked against the correspondent SWIFT deduction on ${ALL_CORRIDORS.length} audited corridors.`;

export const metadata: Metadata = {
  title: "Challenger Rails & Alternative Settlements — Airwallex, Revolut, On-Chain | PayoutDelta",
  description: DESCRIPTION,
  alternates: {
    canonical: "/challengers/",
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/challengers/`,
    siteName: "PayoutDelta",
    title: "Challenger Rails & Alternative Settlements — PayoutDelta",
    description: DESCRIPTION,
  },
};

const FAQS: readonly { question: string; answer: string }[] = [
  {
    question: "What are challenger payment rails?",
    answer: `Challenger rails are settlement networks that move money without walking a correspondent chain. Instead of an MT103 passing through one or two intermediary banks and paying a $${WIRE_INTERMEDIARY_MIN_USD}–$${WIRE_INTERMEDIARY_MAX_USD} deduction per hop, the leg clears on the receiving country's own scheme (SEPA, FPS, InstaPay, IMPS, BI-FAST), on a partner bank's virtual account, or on a layer-2 blockchain. The benchmarked examples on this page are Airwallex, Revolut Business, Elevate Pay and USDC/USDT settlement.`,
  },
  {
    question: `How much does a classic SWIFT wire actually cost at the $1,000 benchmark?`,
    answer: `Across the ${ALL_CORRIDORS.length} corridors in the audited dataset the median benchmark correspondent deduction is ${usd0(WIRE_MEDIAN_CUT)}, and the median all-in cost of a classic wire — intermediary deduction plus the ${(WIRE_RETAIL_SPREAD_MIN * 100).toFixed(1)}–${(WIRE_RETAIL_SPREAD_MAX * 100).toFixed(1)}% retail FX spread — is ${usd0(WIRE_MEDIAN_ALL_IN)}, or ${share(WIRE_MEDIAN_SHARE)} of the invoice. Retail-bank and exchange-house routes that add an FX markup on the receiving side run 5–15% all-in.`,
  },
  {
    question: "Is on-chain settlement actually cheaper than a bank wire?",
    answer: `The transport is: a Polygon or Arbitrum transfer costs $0.01–$0.50 in gas, independent of distance, against a $${WIRE_INTERMEDIARY_MIN_USD}–$${WIRE_INTERMEDIARY_MAX_USD} correspondent deduction. The saving is partly given back at the off-ramp, where a local P2P or centralised-exchange conversion costs roughly 0.5–3%. On-chain settlement also carries risks a wire does not: no deposit insurance, issuer exposure, and irreversible payments, so it suits balances you are willing to hold in stablecoins rather than a payroll run.`,
  },
  {
    question: "Are challenger accounts regulated, and is the money safe?",
    answer: "Regulated, but differently. Airwallex and Revolut Business are licensed money-services businesses or electronic money institutions with client funds safeguarded and, in the EEA and UK, covered by deposit-guarantee arrangements. Elevate Pay's virtual accounts are issued by an FDIC-insured partner bank, so the collected USD balance sits inside US deposit insurance while the fintech layer is a registered money transmitter. On-chain settlement is not a regulated account at all: there is no deposit protection and no claim remedy.",
  },
  {
    question: "Why can a challenger rail not serve every corridor?",
    answer: `Because it is licensed and connected where it operates. A local clearing lane only exists where a scheme, a licence and a banking partner line up: Airwallex covers the APAC and Gulf corridors in this dataset, Revolut Business covers the euroised, sterling and Nordic ones, and Elevate Pay is built for the USD → PKR / INR / PHP / NGN families. Across the four rails this page covers ${COVERED_SLUGS.size} of the ${ALL_CORRIDORS.length} corridors; the rest are still settled by a correspondent wire.`,
  },
  {
    question: "Do challenger rails change my withholding and reporting obligations?",
    answer: "No. The statutory regime belongs to the country of receipt, not to the rail: the purpose code, the withholding rate and the clearance paperwork come from the same regulatory record the corridor pages use, whether the money arrives over a SWIFT wire, a local scheme or a stablecoin off-ramp. What changes is the evidence trail — request the beneficiary credit advice, the local clearing reference and the FX conversion receipt, and keep them with the invoice. The PayoutDelta tax ledger and statutory purpose-code pages are generated from that same record.",
  },
];

export default function ChallengersPage() {
  const financialProductLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: "PayoutDelta Challenger Rail Benchmarks",
    url: `${SITE_URL}/challengers/`,
    description: DESCRIPTION,
    productType: "Cross-border settlement rail comparison",
    category:
      "Cross-border payments, correspondent banking and alternative settlement rails",
    isAccessibleForFree: true,
    provider: {
      "@type": "Organization",
      name: "PayoutDelta",
      url: `${SITE_URL}/`,
      sameAs: "https://github.com/AhmadBilalDSA/payout-delta",
    },
    audience: {
      "@type": "BusinessAudience",
      audienceType:
        "Independent contractors, remote teams and digital agencies paying cross-border",
    },
    areaServed: {
      "@type": "Place",
      name: "Global cross-border freelance payout markets",
    },
    feesAndCommissionsSpecification: {
      "@type": "UnitPriceSpecification",
      name: "Modelled all-in cost at the $1,000 benchmark",
      description: `Classic SWIFT wire median ${usd0(WIRE_MEDIAN_ALL_IN)} (${share(WIRE_MEDIAN_SHARE)} of gross) versus a median challenger rail cost of ${usd(RAIL_MEDIAN_ALL_IN)} across Airwallex, Revolut Business, Elevate Pay and USDC/USDT settlement.`,
      price: RAIL_MEDIAN_ALL_IN.toFixed(2),
      priceCurrency: "USD",
      unitCode: "PAY",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: RAILS_BENCHMARK.modern.totalMinUSD.toFixed(2),
      highPrice: RAILS_BENCHMARK.wire.totalMaxUSD.toFixed(2),
      offerCount: CHALLENGER_PROFILES.length,
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
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
        name: "Challenger Rails",
        item: `${SITE_URL}/challengers/`,
      },
    ],
  };

  const kpis = [
    {
      label: "Corridors modelled",
      value: String(ALL_CORRIDORS.length),
      hint: `${DIRECT_RAIL_CORRIDORS.length} publish a direct local rail`,
    },
    {
      label: "Median SHA deduction",
      value: usd0(WIRE_MEDIAN_CUT),
      hint: `benchmark band $${WIRE_INTERMEDIARY_MIN_USD}–$${WIRE_INTERMEDIARY_MAX_USD}`,
    },
    {
      label: "Wire all-in at $1k",
      value: share(WIRE_MEDIAN_SHARE),
      hint: `${usd0(WIRE_MEDIAN_ALL_IN)} — cut + ${(WIRE_SPREAD_FALLBACK * 100).toFixed(1)}% retail spread`,
    },
    {
      label: "Median challenger cost",
      value: usd(RAIL_MEDIAN_ALL_IN),
      hint: `${usd0(WIRE_MEDIAN_ALL_IN - RAIL_MEDIAN_ALL_IN)} retained per wire`,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(financialProductLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="w-full min-w-0">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          Track 5 · Challenger rails
        </p>
        <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight text-black sm:text-4xl dark:text-white">
          The correspondent wire is no longer the only lane to a local account.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/[0.6] dark:text-white/60">
          Four modern settlement architectures — licensed local clearing
          networks, multi-currency accounts with SEPA/ACH off-ramps, FDIC-insured
          virtual accounts, and stablecoin settlement on Polygon or Arbitrum —
          benchmarked against the intermediary SWIFT deduction PayoutDelta
          already publishes for {ALL_CORRIDORS.length} corridors. Every figure
          below is arithmetic over the audited dataset, not a vendor claim.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4"
            >
              <p className={LABEL}>{kpi.label}</p>
              <p className="mt-2 font-mono text-2xl tabular-nums text-white">
                {kpi.value}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                {kpi.hint}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TWO LANES ──────────────────────────────────────────────────── */}
      <section className={`mt-6 ${SURFACE}`}>
        <h2 className={LABEL}>The two lanes, side by side</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">
          A classic MT103 pays an intermediary deduction at every hop and then a
          retail FX spread on top. A challenger lane clears on a scheme that is
          already denominated in the receiving currency, so the deduction has
          nowhere to attach.
        </p>
        <div className="mt-5">
          <DualLaneDiagram medianCut={WIRE_MEDIAN_CUT} />
        </div>
      </section>

      {/* ── COST BARS ──────────────────────────────────────────────────── */}
      <section className={`mt-6 ${SURFACE}`}>
        <h2 className={LABEL}>All-in cost at the {GROSS_LABEL} benchmark</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">
          Median of each rail&apos;s own covered corridors, priced on the same
          gross invoice so the widths are directly comparable. The wire bar is
          the median classic-wire cost across all {ALL_CORRIDORS.length}{" "}
          corridors.
        </p>
        <div className="mt-5">
          <CostBars />
        </div>
      </section>

      {/* ── RAIL PROFILES ──────────────────────────────────────────────── */}
      {ROLLUPS.map((rollup) => {
        const RailDiagram = RAIL_DIAGRAMS[rollup.profile.id];
        return (
          <section key={rollup.profile.id} className={`mt-6 ${SURFACE}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {rollup.profile.name}
              </h2>
              <span className="rounded-full border border-neutral-800/80 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/50">
                {rollup.profile.category}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-emerald-400/90">
              {rollup.profile.headline}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">
              {rollup.profile.summary}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-neutral-800/80 bg-white/[0.02] p-4">
                  <RailDiagram />
                </div>
              </div>
              <div className="lg:col-span-3">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: "Corridors covered",
                      value: String(rollup.corridorsCovered),
                    },
                    {
                      label: "Median all-in",
                      value: usd(rollup.medianRailAllInUSD),
                    },
                    {
                      label: "Median retained",
                      value: usd0(rollup.medianRetainedUSD),
                    },
                    {
                      label: "Best corridor",
                      value: usd0(rollup.bestRetainedUSD),
                    },
                  ].map((cell) => (
                    <div
                      key={cell.label}
                      className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3"
                    >
                      <dt className={LABEL}>{cell.label}</dt>
                      <dd className="mt-1.5 font-mono text-base tabular-nums text-white">
                        {cell.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <table className="mt-4 w-full min-w-0 border-collapse text-left">
                  <caption className="sr-only">
                    Modelled cost lines for {rollup.profile.name}
                  </caption>
                  <thead>
                    <tr className="border-b border-neutral-800/80">
                      <th scope="col" className={LABEL}>
                        Cost line
                      </th>
                      <th scope="col" className={`${LABEL} text-right`}>
                        Band
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rollup.profile.costLines.map((line) => (
                      <tr
                        key={line.label}
                        className="border-b border-neutral-800/40 last:border-0"
                      >
                        <td className="py-2 pr-3 text-xs text-white/70">
                          {line.label}
                        </td>
                        <td className="py-2 text-right font-mono text-xs tabular-nums text-white/60">
                          {line.kind === "flat"
                            ? `${usd(line.min)} – ${usd(line.max)}`
                            : `${(line.min * 100).toFixed(2)}% – ${(line.max * 100).toFixed(2)}%`}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-2 pr-3 text-xs font-medium text-white">
                        Modelled all-in at {GROSS_LABEL}
                      </td>
                      <td className="py-2 text-right font-mono text-xs font-medium tabular-nums text-emerald-400">
                        {usd(rollup.medianRailAllInUSD)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-xs text-white/70">
                        Median wire cost on the same corridors
                      </td>
                      <td className="py-2 text-right font-mono text-xs tabular-nums text-amber-400/80">
                        {usd(rollup.medianWireAllInUSD)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <dl className="mt-4 space-y-2 text-xs leading-relaxed text-white/50">
                  <div className="flex gap-2">
                    <dt className={LABEL}>Coverage</dt>
                    <dd>{rollup.profile.coverage}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className={LABEL}>Settlement</dt>
                    <dd>{rollup.profile.settlement}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className={LABEL}>Posture</dt>
                    <dd>{rollup.profile.posture}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Coverage table: the corridors this rail actually reaches, with the
                fee-difference indicator per corridor. */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <caption className="sr-only">
                  {rollup.profile.name} corridor coverage and retained amounts
                </caption>
                <thead>
                  <tr className="border-b border-neutral-800/80">
                    <th scope="col" className={`${LABEL} py-2 pr-3`}>
                      Corridor
                    </th>
                    <th scope="col" className={`${LABEL} px-3`}>
                      Clearing network
                    </th>
                    <th scope="col" className={`${LABEL} px-3 text-right`}>
                      SHA cut
                    </th>
                    <th scope="col" className={`${LABEL} px-3 text-right`}>
                      Wire all-in
                    </th>
                    <th scope="col" className={`${LABEL} px-3 text-right`}>
                      Rail all-in
                    </th>
                    <th scope="col" className={`${LABEL} py-2 pl-3 text-right`}>
                      Retained
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rollup.rows.slice(0, 6).map((row) => (
                    <tr
                      key={row.corridor.slug}
                      className="border-b border-neutral-800/40 last:border-0"
                    >
                      <th
                        scope="row"
                        className="py-2 pr-3 font-normal whitespace-nowrap"
                      >
                        <Link
                          href={`/calculator/${row.corridor.slug}/`}
                          className="inline-flex items-center gap-1.5 text-white/80 transition-colors duration-200 ease-out hover:text-emerald-400"
                        >
                          <span aria-hidden="true">{row.flag}</span>
                          <span className="font-mono tabular-nums">
                            {row.corridor.from} → {row.corridor.to}
                          </span>
                        </Link>
                      </th>
                      <td className="max-w-[220px] truncate px-3 py-2 text-white/45">
                        {row.clearingNetwork}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400/80">
                        {usd(row.wireCutUSD)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-white/60">
                        {usd(row.wireAllInUSD)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-400/90">
                        {usd(row.railAllInUSD)}
                      </td>
                      <td className="py-2 pl-3 text-right">
                        <span className="inline-flex items-center justify-end gap-2">
                          <DeltaMeter
                            wire={row.wireAllInUSD}
                            rail={row.railAllInUSD}
                          />
                          <span className="font-mono tabular-nums text-emerald-400">
                            +{usd0(row.retainedUSD)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rollup.rows.length > 6 ? (
              <p className="mt-3 text-[11px] text-white/40">
                Top 6 of {rollup.rows.length} covered corridors by retained
                amount — the median across all {rollup.rows.length} is{" "}
                {usd0(rollup.medianRetainedUSD)} retained (
                {share(rollup.medianRetainedShare)} of gross).
              </p>
            ) : null}
          </section>
        );
      })}

      {/* ── VERDICT ────────────────────────────────────────────────────── */}
      <section className={`mt-6 ${SURFACE}`}>
        <h2 className={LABEL}>What the corpus says</h2>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-white/60">
          <li>
            The median classic wire costs{" "}
            <span className="font-mono tabular-nums text-amber-400/90">
              {usd0(WIRE_MEDIAN_ALL_IN)}
            </span>{" "}
            on a {GROSS_LABEL} invoice —{" "}
            {share(WIRE_MEDIAN_SHARE)} of gross, before any receiving-side FX
            markup. Retail-bank and exchange-house routes that add that markup
            run 5–15% all-in.
          </li>
          <li>
            The four rails together reach{" "}
            <span className="font-mono tabular-nums text-white">
              {COVERED_SLUGS.size}
            </span>{" "}
            of the {ALL_CORRIDORS.length} corridors, of which{" "}
            {DIRECT_RAIL_CORRIDORS.length} publish a direct local clearing
            scheme in the regulatory dataset.
          </li>
          <li>
            The median challenger cost across the four rails is{" "}
            <span className="font-mono tabular-nums text-emerald-400/90">
              {usd(RAIL_MEDIAN_ALL_IN)}
            </span>
            , against a wire median of {usd0(WIRE_MEDIAN_ALL_IN)} on the same
            gross. Cost lines are published bands, not quotes.
          </li>
          <li>
            The savings are structural, not promotional: what disappears is the
            intermediary deduction, not a temporary fee waiver. What you take
            on instead is licence coverage, deposit protection and settlement
            velocity — read each rail&apos;s posture line before moving payroll.
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <Link
            href="/compare/"
            className="rounded-full border border-neutral-800/80 bg-white/[0.04] px-3 py-1.5 text-white/70 transition-colors duration-200 ease-out hover:border-emerald-500/40 hover:text-emerald-400"
          >
            Compare corridors
          </Link>
          <Link
            href="/dashboard/"
            className="rounded-full border border-neutral-800/80 bg-white/[0.04] px-3 py-1.5 text-white/70 transition-colors duration-200 ease-out hover:border-emerald-500/40 hover:text-emerald-400"
          >
            Open the clearing terminal
          </Link>
          <Link
            href="/agencies/"
            className="rounded-full border border-neutral-800/80 bg-white/[0.04] px-3 py-1.5 text-white/70 transition-colors duration-200 ease-out hover:border-emerald-500/40 hover:text-emerald-400"
          >
            Audit an agency roster
          </Link>
          <Link
            href="/leaderboard/"
            className="rounded-full border border-neutral-800/80 bg-white/[0.04] px-3 py-1.5 text-white/70 transition-colors duration-200 ease-out hover:border-emerald-500/40 hover:text-emerald-400"
          >
            Leakage leaderboard
          </Link>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className={`mt-6 ${SURFACE}`}>
        <h2 className={LABEL}>Frequently asked</h2>
        <div className="mt-3 space-y-4">
          {FAQS.map((entry) => (
            <details
              key={entry.question}
              className="group rounded-2xl border border-neutral-800/80 bg-white/[0.02]"
            >
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white/90 transition-colors duration-200 ease-out hover:text-emerald-400">
                {entry.question}
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-white/60">
                {entry.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-10 text-xs leading-relaxed text-black/[0.45] dark:text-white/50">
        PayoutDelta is informational tooling, not financial, tax or legal advice.
        Challenger-rail cost lines are published list pricing and observed bands
        compiled from public provider disclosures; the SHA deductions, clearing
        networks and statutory purpose codes are read from the audited corridor
        dataset (revision {DATASET_REVISION}). Actual deductions land on the
        beneficiary bank&apos;s credit advice (CRF) — verify before invoicing, and
        confirm licence coverage and safeguarding with the provider before
        moving payroll funds.
      </p>
    </div>
  );
}
