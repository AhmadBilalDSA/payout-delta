import { AuditSeal } from "./AuditSeal";
import { CopyPill } from "./CopyPill";
import type {
  PageSovereignDossier,
  SovereignRoutingNode,
} from "@/lib/hexagonalDossier";

/**
 * Outbound view adapter for the hexagonal sovereign dossier (Phase 7).
 *
 * A SERVER COMPONENT, deliberately. The kernel takes its inputs as arguments
 * under type-only imports, and this component receives only the flat
 * `PageSovereignDossier` — so the 195-jurisdiction and 266-head registries stay
 * on the server and the client bundle gains one presentational module. Nothing
 * here is interactive: the copyable badges are `user-select: all` on
 * text-selection, not a click handler, which is what lets this stay server-only
 * and keeps the layer engine free of a hydration boundary.
 *
 * FOUR LAYERS, IN EXTRACTION ORDER
 *   1. `#quick-verdict`  — the AEO block. First in the DOM, highest contrast,
 *                          because this is what an answer engine quotes.
 *   2. ledger `<table>`   — every figure with the registry it came from.
 *   3. routing SVG        — the three-hop chain as a graph, not a paragraph.
 *   4. print sheet        — the same content as a signable A4 dossier.
 *
 * LAYER ORDER IS THE POINT
 * A reader (or a scraper) meets the verdict, then the evidence, then the shape,
 * in that order. Every layer is a projection of the same `PageSovereignDossier`,
 * so no two layers can disagree: there is exactly one source for the purpose
 * code, one for the withholding band, and one for the hop chain.
 *
 * ZERO DEPENDENCY BY CONSTRUCTION
 * The routing map is hand-rolled inline SVG and the print sheet is
 * `@media print` CSS — no chart package, no icon package, no PDF library, no
 * `react-to-print`. The print rules live in `app/globals.css` under
 * `.hex-dossier-sheet`, last-in-cascade with the other printable surfaces.
 */

/* -------------------------------------------------------------------------- *
 * Shared bits
 * -------------------------------------------------------------------------- */

/**
 * Mono + tabular on every figure, by construction.
 *
 * This is a print-and-reconcile table, and the two classes are load-bearing
 * rather than decorative: `font-mono` keeps a BIC, a rail id and a purpose code
 * visually distinct from prose, and `tabular-nums` gives every digit the same
 * advance width so a column of percentages lines up on the decimal point
 * whether the reader is on screen or reconciling a filed copy. The audit gate
 * asserts both classes are present on every figure cell.
 */
const FIGURE = "font-mono tabular-nums";

/** Section heading used by the ledger and safe-harbour blocks. */
function LayerHeading({ children, id }: { children: string; id?: string }) {
  return (
    <h3
      id={id}
      className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/45 dark:text-white/45"
    >
      {children}
    </h3>
  );
}

/* -------------------------------------------------------------------------- *
 * LAYER 1 — AEO extraction
 * -------------------------------------------------------------------------- */

/**
function CodeBadge({ code }: { code: string }) {
  return <CopyPill code={code} />;
}

function QuickVerdict({ dossier }: { dossier: PageSovereignDossier }) {
  return (
    <section
      id="quick-verdict"
      aria-labelledby="quick-verdict-heading"
      className="hex-verdict w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="quick-verdict-heading"
          className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/45 dark:text-white/45"
        >
          Quick verdict · extraction block
        </h2>
        <span className="hex-copy-hint text-[10px] font-medium uppercase tracking-[0.12em] text-black/35 dark:text-white/35">
          Click any code to copy
        </span>
      </div>

      {/* High contrast on purpose: this paragraph is the block an answer engine
          quotes, so it is set at near-maximum contrast and a larger measure
          than the surrounding chrome rather than inheriting the muted palette
          used for captions. `data-hex-aeo` is the selector the audit gate
          measures: the word budget applies to this paragraph alone, never to
          the enclosing section, which also carries labels, the authority name
          and the verification stamp. */}
      <p
        data-hex-aeo="verdict"
        className="mt-4 max-w-[62ch] text-[15px] leading-relaxed font-medium text-slate-900 dark:text-white"
      >
        {dossier.aeoAnswer}
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
            Purpose code
          </dt>
          <dd className="mt-1.5">
            <CodeBadge code={dossier.statute.purposeCode} />
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
            Authority
          </dt>
          <dd className={`${FIGURE} mt-1.5 text-[12.5px] text-slate-700 dark:text-slate-300`}>
            {dossier.statute.authority}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
            Verification stamp
          </dt>
          <dd
            className={`hex-stamp ${FIGURE} mt-1.5 inline-block rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-700 dark:border-slate-700 dark:text-slate-300`}
          >
            {dossier.stamp}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/* -------------------------------------------------------------------------- *
 * LAYER 2 — data ledger
 * -------------------------------------------------------------------------- */

/**
 * The evidence table.
 *
 * A real `<table>` with a real `<caption>` and scoped headers, not a grid of
 * divs: a reader navigating this with a screen reader needs the column
 * association, and an answer engine reading the page needs the caption to know
 * what the figures *are*. The third column is the provenance — which registry
 * and which key each row came from — because a fee figure with no source is not
 * auditable, and this project's entire premise is that it is.
 */
function DataLedger({ dossier }: { dossier: PageSovereignDossier }) {
  return (
    <section className="w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
      <LayerHeading id="ledger-heading">Data ledger · statutory &amp; commercial</LayerHeading>

      <table className="hex-ledger mt-4 w-full min-w-0 border-collapse text-left text-[13px]">
        <caption className="sr-only">
          Statutory and correspondent figures for {dossier.market}
          {dossier.institution ? `, priced at ${dossier.institution.bic}` : ""}, with
          the registry each value is projected from.
        </caption>
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th
              scope="col"
              className="py-2 pr-3 text-[10px] font-bold uppercase tracking-[0.12em] text-black/40 dark:text-white/40"
            >
              Figure
            </th>
            <th
              scope="col"
              className="py-2 pr-3 text-[10px] font-bold uppercase tracking-[0.12em] text-black/40 dark:text-white/40"
            >
              Value
            </th>
            <th
              scope="col"
              className="py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-black/40 dark:text-white/40"
            >
              Registry basis
            </th>
          </tr>
        </thead>
        <tbody>
          {dossier.ledger.map((row) => (
            <tr
              key={`${row.label}-${row.basis}`}
              className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
            >
              <th
                scope="row"
                className="py-2.5 pr-3 text-left align-top font-medium text-slate-700 dark:text-slate-300"
              >
                {row.label}
              </th>
              <td
                className={`${FIGURE} py-2.5 pr-3 align-top font-semibold text-slate-900 dark:text-white`}
              >
                {row.value}
              </td>
              <td className="py-2.5 align-top text-[11.5px] text-slate-500 dark:text-slate-400">
                {row.basis}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {dossier.statute.safeHarborRules.length > 0 ? (
        <div className="mt-6">
          <LayerHeading>Safe-harbour routes</LayerHeading>
          <ul className="mt-3 space-y-2">
            {dossier.statute.safeHarborRules.map((rule) => (
              <li
                key={rule}
                className="hex-safeharbor-item flex gap-2.5 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400"
              >
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-500/70" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          No safe-harbour route is published for this market. Obtain the
          realization certificate from the receiving institution before the credit
          is released.
        </p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- *
 * LAYER 3 — vector routing map
 * -------------------------------------------------------------------------- */

/**
 * One hop box. Bounded text on every line, because a `<text>` node does not
 * wrap — an untruncated registry name in a 216-unit box either overflows into
 * its neighbour or is silently clipped, and a half-clipped correspondent name
 * on an institutional page is worse than an ellipsis.
 */
function HopBox({ node, x }: { node: SovereignRoutingNode; x: number }) {
  const clip = (text: string, max: number) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return (
    <g transform={`translate(${x} 62)`}>
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
        width={232}
        height={104}
        rx={14}
        className={
          node.unresolved
            ? "fill-amber-500/[0.06] stroke-amber-500/40 stroke-[1.5] [stroke-dasharray:5_4]"
            : "fill-white stroke-slate-200 stroke-[1.5] dark:fill-white/[0.04] dark:stroke-white/[0.12]"
        }
      />
      <text x={14} y={40} className="fill-slate-900 text-[12.5px] font-bold dark:fill-white">
        {clip(node.title, 26)}
      </text>
      <text x={14} y={60} className="fill-slate-600 font-mono text-[11px] dark:fill-slate-300">
        {clip(node.code, 22)}
      </text>
      <text x={14} y={78} className="fill-slate-500 text-[9.5px] dark:fill-slate-400">
        {clip(node.note, 30)}
      </text>
      <text x={14} y={96} className="fill-emerald-600 text-[9px] font-semibold dark:fill-emerald-400">
        {clip(node.statuteLabel, 32)}
      </text>
    </g>
  );
}

/**
 * Directional connector.
 *
 * A dashed stroke is the visual grammar for "this leg is not evidenced" and a
 * solid one for "this leg is published". Carrying that distinction in the
 * geometry rather than only in the caption is the point: the caption is read
 * once, the stroke is read every time.
 */
function HopArrow({ fromX, label, dashed = false }: { fromX: number; label: string; dashed?: boolean }) {
  const clip = (text: string, max: number) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return (
    <g>
      <line
        x1={fromX + 232}
        y1={114}
        x2={fromX + 292}
        y2={114}
        className="stroke-emerald-500/70 stroke-[1.5]"
        strokeDasharray={dashed ? "5 4" : undefined}
        markerEnd="url(#hex-hop)"
      />
      <text
        x={fromX + 262}
        y={104}
        textAnchor="middle"
        className="fill-slate-500 text-[9px] font-semibold dark:fill-slate-400"
      >
        {clip(label, 22)}
      </text>
    </g>
  );
}

/**
 * The three-hop chain, inline.
 *
 * This is a *statutory* mesh, not a second copy of `BankRoutingDiagram`. That
 * component answers "who carries my USD leg" and carries no statute; this one
 * annotates each hop with the compliance fact that attaches to it — the purpose
 * code declared, whether the correspondent is evidenced or merely charged for,
 * and the protocol plus finality window of the rail the credit lands on. The two
 * answer different questions and are allowed to sit on the same page.
 */
function RoutingMap({ dossier }: { dossier: PageSovereignDossier }) {
  const [hop0, hop1, hop2] = dossier.routing;
  return (
    <section className="w-full min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md dark:backdrop-blur-md sm:p-8">
      <LayerHeading id="routing-heading">Routing map · three-hop settlement chain</LayerHeading>

      <figure className="hex-routing-map mt-4 w-full min-w-0">
        <div className="w-full overflow-x-auto [scrollbar-width:thin]">
          <svg
            viewBox="0 0 824 224"
            role="img"
            aria-label={`Statutory settlement chain for ${dossier.market}: ${hop0.title}, then ${hop1.title}, then ${hop2.title} on rail ${hop2.code}.`}
            className="h-auto w-full min-w-[40rem]"
          >
            <defs>
              <marker
                id="hex-hop"
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

            <HopBox node={hop0} x={0} />
            {/* The dashed stroke belongs on the FIRST leg. An unevidenced
                anchor means the origin→correspondent leg is the open one; the
                MT103 leg from a correspondent to the domestic rail is still a
                real, published hop. Marking the second arrow instead would say
                the wrong leg is unevidenced. */}
            <HopArrow fromX={0} label="USD leg" dashed={hop1.unresolved} />
            <HopBox node={hop1} x={296} />
            <HopArrow fromX={296} label="SWIFT MT103" />
            <HopBox node={hop2} x={592} />
          </svg>
        </div>

        <figcaption className="mt-2 text-[11px] leading-relaxed text-black/45 dark:text-white/45">
          {/* Conditional on the evidence, not decorative: on a tier-1
              self-clearing hub every leg is published, and claiming an absent
              correspondent anchor there would be a false statement about the
              registry. The sentence is assembled before the JSX so the
              inter-sentence spaces are not `{" "}` expressions hanging off a
              ternary — a shape Turbopack's parser rejects. */}
          {hop1.unresolved
            ? `A solid connector is a leg the registry evidences. A dashed connector is an open leg: ${dossier.market} publishes no correspondent anchor, so the exposure is carried by the benchmark cut rather than by a named bank.`
            : `A solid connector is a leg the registry evidences. ${hop1.note} for ${dossier.market}, and no leg in this chain is unevidenced.`}{" "}
          Purpose code{" "}
          <span className={`${FIGURE} font-semibold`}>{dossier.statute.purposeCode}</span>{" "}
          is declared on the credit advice, and credits clear onto{" "}
          <span className={`${FIGURE} font-semibold`}>{hop2.code}</span>.
        </figcaption>
      </figure>
    </section>
  );
}

/* -------------------------------------------------------------------------- *
 * LAYER 4 — print sheet
 * -------------------------------------------------------------------------- */

/**
 * The signable copy.
 *
 * Hidden on screen and revealed by `.hex-dossier-sheet` under `@media print`,
 * so the signed artifact and the browsed artifact cannot drift into two
 * documents. The sign-off block is deliberate: a compliance reviewer filing this
 * needs somewhere to attest they read it, and a printed sheet with no signature
 * line is a printout rather than a record.
 */
function PrintSheet({ dossier }: { dossier: PageSovereignDossier }) {
  return (
    <section
      aria-label={`Printable sovereign dossier for ${dossier.market}`}
      className="hex-dossier-sheet hidden w-full max-w-[210mm] flex-col gap-6 border border-slate-200 bg-white p-8 print:block"
    >
      <header className="flex flex-col gap-2 border-b-2 border-slate-900 pb-4">
        <p className={`${FIGURE} text-[9pt] uppercase tracking-[0.2em] text-slate-600`}>
          PayoutDelta · sovereign dossier
        </p>
        <h2 className="text-[15pt] font-bold text-slate-900">
          {dossier.flag} {dossier.market}
          {dossier.institution ? ` — ${dossier.institution.name}` : ""}
        </h2>
        <p className={`${FIGURE} text-[8pt] text-slate-600`}>
          {dossier.institution
            ? `${dossier.institution.bic} · tier ${dossier.institution.tier} · ${dossier.institution.role}`
            : `${dossier.marketIso2} · ${dossier.currency}`}{" "}
          · stamp {dossier.stamp}
        </p>
      </header>

      <div>
        <h3 className="text-[9pt] font-bold uppercase tracking-[0.16em] text-slate-700">
          Extracted verdict
        </h3>
        <p className="mt-2 text-[9.5pt] leading-relaxed text-slate-900">{dossier.aeoAnswer}</p>
      </div>

      <table className="hex-ledger">
        <caption className="sr-only">
          Statutory and correspondent ledger for {dossier.market}, with the registry
          each value is projected from.
        </caption>
        <thead>
          <tr>
            <th scope="col">Figure</th>
            <th scope="col">Value</th>
            <th scope="col">Registry basis</th>
          </tr>
        </thead>
        <tbody>
          {dossier.ledger.map((row) => (
            <tr key={`print-${row.label}-${row.basis}`}>
              <th scope="row">{row.label}</th>
              <td className={FIGURE}>{row.value}</td>
              <td>{row.basis}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {dossier.statute.safeHarborRules.length > 0 ? (
        <div>
          <h3 className="text-[9pt] font-bold uppercase tracking-[0.16em] text-slate-700">
            Safe-harbour routes
          </h3>
          <ul className="mt-2 space-y-1">
            {dossier.statute.safeHarborRules.map((rule) => (
              <li key={`print-${rule}`} className="hex-safeharbor-item text-[8.5pt] text-slate-800">
                · {rule}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="hex-signoff">
        <div className="hex-signoff-cell">
          <p className={`${FIGURE} text-[7.5pt] uppercase tracking-[0.14em] text-slate-600`}>
            Reviewed by
          </p>
          <p className="mt-6 text-[7.5pt] text-slate-500">Name, signature, date</p>
        </div>
        <div className="hex-signoff-cell">
          <p className={`${FIGURE} text-[7.5pt] uppercase tracking-[0.14em] text-slate-600`}>
            Registry reconciled against
          </p>
          <p className="mt-6 text-[7.5pt] text-slate-500">
            Stamp {dossier.stamp}
          </p>
        </div>
      </div>

      <div className="hex-pagination" aria-hidden="true">
        <span>{dossier.marketIso2} · sovereign dossier</span>
        <span className="hex-pagination-page" />
      </div>

      <AuditSeal 
        bic={dossier.institution?.bic ?? "NA"} 
        iso2={dossier.marketIso2} 
        whtRate={dossier.statute.baselineWhtPct} 
        minShaFee={15} 
        maxShaFee={35} 
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- *
 * The adapter
 * -------------------------------------------------------------------------- */

/**
 * Render one dossier across all four layers.
 *
 * `idPrefix` keeps the two mounts on the same page from colliding when
 * `/tax-clearance/` renders a country-scoped dossier whose headings would
 * otherwise duplicate the bank's. The `quick-verdict` id is intentionally NOT
 * suffixed: it is the extraction anchor the audit gate and any answer-engine
 * scraper look for, and it must be stable across every dossier route.
 */
export default function SovereignDossierView({
  dossier,
  idPrefix,
}: {
  dossier: PageSovereignDossier;
  idPrefix: string;
}) {
  return (
    <div
      data-hex-dossier={dossier.slug}
      data-hex-layer-count="4"
      className="mt-6 flex w-full min-w-0 flex-col gap-6"
    >
      <QuickVerdict dossier={dossier} />
      <DataLedger dossier={dossier} />
      <div id={`${idPrefix}-routing`}>
        <RoutingMap dossier={dossier} />
      </div>
      <PrintSheet dossier={dossier} />
    </div>
  );
}
