import type { BankProfile } from "@/lib/registryData";

/**
 * Hand-rolled inline SVG — the three-hop routing path, with no chart or icon
 * dependency. The shape is the one every cross-border wire takes:
 *
 *   [Origin Platform] ──(Fedwire / CHIPS)──> [G-SIB Correspondent]
 *                      ──(SWIFT MT103)────> [Domestic Clearing Bank]
 *
 * WHY IT IS DRAWN AND NOT A TABLE
 * A correspondent chain is a graph. Reading it as three boxes joined by two
 * labelled arrows is the difference between understanding why two correspondent
 * hops appear on the credit advice and copying the two numbers off it. Every
 * label is data, not decoration: the first hop is named after the USD
 * correspondent's own registration market, the second is always MT103, and the
 * final box carries the rail the credit lands on.
 *
 * When a tier-2 bank publishes no dominant USD correspondent, the anchor is
 * drawn as an explicit gap rather than filled with a plausible-looking bank:
 * the registry's own convention is that the exposure is carried by
 * `defaultIntermediaryCutUSD` instead, and the caption says so.
 */

/** USD-leg hop label by the anchor's registration market. */
const HOP_LABEL_BY_COUNTRY: Record<string, string> = {
  US: "Fedwire / CHIPS",
  GB: "CHAPS",
  CH: "SIC",
  JP: "BOJ NET",
  DE: "TARGET2 / SEPA",
  FR: "TARGET2 / SEPA",
  ES: "TARGET2 / SEPA",
  IT: "TARGET2 / SEPA",
  NL: "TARGET2 / SEPA",
  BE: "TARGET2 / SEPA",
  AT: "TARGET2 / SEPA",
  IE: "TARGET2 / SEPA",
  SG: "MEPS+",
  AE: "Aani",
  SA: "SAMA",
  CA: "LVTS",
  AU: "RITS",
  NZ: "NGS",
  HK: "FPS",
};

/**
 * Label the USD-leg hop after the *settlement market* the leg runs through.
 *
 * A tier-1 hub is its own correspondent, so the leg is named after its own
 * registration market; a tier-2 bank is named after the market its USD
 * correspondent sits in. Both fall back to the generic wire label when the
 * registry publishes no dominant anchor rather than guessing a rail.
 */
function hopLabelFor(profile: BankProfile): string {
  const country =
    profile.usdGsibCountryIso2 || (profile.tier === 1 ? profile.countryIso2 : "");
  if (!country) return "USD correspondent leg";
  return HOP_LABEL_BY_COUNTRY[country] ?? "SWIFT correspondent";
}

interface HopNode {
  /** Small uppercase role label above the box. */
  role: string;
  title: string;
  /** Mono identifier line inside the box. */
  code: string;
  /** Muted qualifier under the box. */
  note: string;
  /** Dashed outline when the node is an explicit gap in the published data. */
  unresolved?: boolean;
}

function NodeBox({
  node,
  x,
}: {
  node: HopNode;
  x: number;
}) {
  return (
    <g transform={`translate(${x} 54)`}>
      <text
        x={0}
        y={0}
        textAnchor="start"
        className="fill-slate-500 text-[9px] font-bold uppercase tracking-[0.14em] dark:fill-slate-400"
      >
        {node.role}
      </text>
      <rect
        x={0}
        y={10}
        width={216}
        height={78}
        rx={14}
        className={
          node.unresolved
            ? "fill-amber-500/[0.06] stroke-amber-500/40 stroke-[1.5] [stroke-dasharray:5_4]"
            : "fill-white stroke-slate-200 stroke-[1.5] dark:fill-white/[0.04] dark:stroke-white/[0.12]"
        }
      />
      <text
        x={14}
        y={38}
        className="fill-slate-900 text-[12.5px] font-bold dark:fill-white"
      >
        {node.title.length > 26 ? `${node.title.slice(0, 25)}…` : node.title}
      </text>
      <text
        x={14}
        y={58}
        className="fill-slate-600 font-mono text-[11px] dark:fill-slate-300"
      >
        {node.code}
      </text>
      <text
        x={14}
        y={76}
        className="fill-slate-500 text-[9.5px] dark:fill-slate-400"
      >
        {node.note.length > 30 ? `${node.note.slice(0, 29)}…` : node.note}
      </text>
    </g>
  );
}

function HopArrow({
  fromX,
  label,
  dashed = false,
}: {
  fromX: number;
  label: string;
  dashed?: boolean;
}) {
  return (
    <g>
      <line
        x1={fromX + 216}
        y1={98}
        x2={fromX + 268}
        y2={98}
        className="stroke-emerald-500/70 stroke-[1.5]"
        strokeDasharray={dashed ? "5 4" : undefined}
        markerEnd="url(#payoutdelta-hop)"
      />
      <text
        x={fromX + 242}
        y={88}
        textAnchor="middle"
        className="fill-slate-500 text-[9px] font-semibold dark:fill-slate-400"
      >
        {label.length > 22 ? `${label.slice(0, 21)}…` : label}
      </text>
    </g>
  );
}

export default function BankRoutingDiagram({ profile }: { profile: BankProfile }) {
  /** A tier-1 hub carries its own USD leg, so it is the middle hop itself. */
  const selfAnchored = profile.tier === 1;
  const anchorCode =
    profile.usdGsibCorrespondent === "" ? "" : profile.usdGsibCorrespondent;

  const origin: HopNode = {
    role: "Hop 0 · originator",
    title: "PayoutDelta platform",
    code: "ORIG",
    note: "Client instruction, USD leg",
  };
  const anchor: HopNode = selfAnchored
    ? {
        role: "Hop 1 · USD correspondent",
        title: profile.name,
        code: profile.bic,
        // Kept under the 30-character node-note budget: the full sentence is in
        // the caption below, so the node only has to name the self-anchored
        // state without being cut off at an ellipsis mid-phrase.
        note: "Tier 1 · own USD leg",
      }
    : anchorCode === ""
      ? {
          role: "Hop 1 · USD correspondent",
          title: "Not published",
          code: "no anchor",
          note: "Exposure carried by the cut",
          unresolved: true,
        }
      : {
          role: "Hop 1 · USD correspondent",
          title: profile.usdGsibCorrespondentName || anchorCode,
          code: anchorCode,
          note: "Carries the institution's USD leg",
        };
  const destination: HopNode = {
    role: "Hop 2 · domestic clearing bank",
    title: profile.name,
    code: profile.bic,
    note: profile.rail ? `${profile.rail.id} · ${profile.countryIso2}` : profile.countryIso2,
  };

  return (
    <figure className="w-full min-w-0">
      <div className="w-full overflow-x-auto [scrollbar-width:thin]">
        <svg
          viewBox="0 0 776 190"
          role="img"
          aria-label={`Routing path: PayoutDelta platform, then ${
            anchor.unresolved ? "an unpublished USD correspondent" : anchor.title
          }, then ${destination.title} on ${destination.note}.`}
          className="h-auto w-full min-w-[36rem]"
        >
        <defs>
          <marker
            id="payoutdelta-hop"
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-emerald-500/80" />
          </marker>
        </defs>

        <NodeBox node={origin} x={0} />
        <HopArrow
          fromX={0}
          label={hopLabelFor(profile)}
          dashed={!selfAnchored && anchorCode === ""}
        />
        <NodeBox node={anchor} x={272} />
        <HopArrow fromX={272} label="SWIFT MT103" />
        <NodeBox node={destination} x={544} />
        </svg>
      </div>

      <figcaption className="mt-2 text-[11px] leading-relaxed text-black/45 dark:text-white/45">
        {anchorCode === "" && !selfAnchored ? (
          <>
            No dominant USD correspondent is evidenced for {profile.bic}, so the
            first hop is shown as an open leg: the monetary exposure is carried
            by the benchmark intermediary cut of{" "}
            <span className="font-mono font-semibold">
              ${profile.defaultIntermediaryCutUSD.toLocaleString("en-US")}
            </span>{" "}
            rather than by a named correspondent.
          </>
        ) : (
          <>
            {selfAnchored
              ? `${profile.bic} is a tier-1 correspondent hub and carries its own USD leg.`
              : `${anchorCode} carries the USD leg into ${profile.countryName}.`}{" "}
            The final hop lands on{" "}
            {profile.rail ? (
              <>
                <span className="font-mono font-semibold">{profile.rail.id}</span>
                {` (${profile.rail.operator})`}
              </>
            ) : (
              "the domestic clearing bank"
            )}
            .
          </>
        )}
      </figcaption>
    </figure>
  );
}
