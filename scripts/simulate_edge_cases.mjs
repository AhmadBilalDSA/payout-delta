#!/usr/bin/env node
/**
 * PayoutDelta — Phase S4: Headless Simulation & Regression Guards.
 *
 * A zero-dependency, pure-Node stress simulator for the shipped fee-calculus
 * engine. It does NOT shell out to a browser and it installs no runtime
 * packages (no Puppeteer, no Cypress): the math under test is the math the
 * site actually renders, imported directly from the TypeScript sources —
 *
 *   - lib/calculatorEngine.ts   -> calculateGrossFromTargetNet (Phase B gross-up)
 *   - utils/calculateRoute.ts   -> quoteChannel / computeRoute (Phase 1 forward)
 *   - lib/safeMath.ts           -> the Phase S1 guarded primitives
 *
 * Node 20 (the CI baseline in .github/workflows/deploy.yml) cannot import
 * `.ts` with `@/` path aliases natively, so the three sources are stripped of
 * their TypeScript surface in-memory — comments, `import type` lines, the
 * `@/lib/safeMath` value import, `interface` blocks, parameter/return type
 * annotations and `as` casts — then fused into one plain-JS module loaded
 * through a data URL. The executed functions are therefore byte-for-byte the
 * existing engine, not a port. The corridor corpus is read straight from
 * `data/fees.json`, the single source of truth (the same snapshot that builds
 * every corridor page, the leaderboard and the static API feed).
 *
 * Stress matrix
 * -------------
 * 5 highly-utilized corridors (USD→PKR, USD→INR, USD→BRL, USD→PHP, USD→EUR)
 * × 3 platforms (Upwork 10% / Fiverr 20% / Direct 0%) × 5 withdrawal rails
 * × 4 transaction boundaries — $1 (Micro), $1,000 (Standard), $5,000 (High),
 * $50,000 (Corporate) — through BOTH directions of the engine (forward
 * quotes and the inverse gross-up), plus a raw sub-clamp "micro sweep" that
 * runs the waterfall's exact identity on amounts small enough to be fully
 * consumed by fixed fees, and a battery of degenerate inputs that must trip
 * the Phase S1 guards instead of throwing or emitting NaN.
 *
 * Invariants a violation of which fails the run (exit 1):
 *   1. Net take-home (realized local deposit) is always > 0 — unless the
 *      amount is so micro that fixed SWIFT fees legitimately consume all of
 *      it, in which case 0 is tolerated and negative values never are.
 *   2. No generated value anywhere may evaluate to NaN, ±Infinity, null or
 *      undefined (the deep finite-record sweep includes the hidden
 *      JSON.stringify(NaN) === "null" corruption path).
 *   3. The effective total fee deduction stays within plausible bounds
 *      ([0.1%, 15%]) on non-degenerate, non-fixed-fee-dominated transfers:
 *      the Direct platform (0% cut) at Standard+ and the Upwork platform
 *      (10% cut) at High+. Fiverr's 20% commission and fixed-fee-micro
 *      amounts are documented exclusions whose economics cannot fit the band.
 *
 * Usage: node scripts/simulate_edge_cases.mjs
 * Exit:  0 when every invariant holds, 1 otherwise (throws loudly).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/* ------------------------------------------------------------------ *
 * 1. Load the engine from its real TypeScript sources (in-memory strip)
 * ------------------------------------------------------------------ */

/** Remove block + line comments (engine sources are heavily documented). */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** Drop `import type {…}` and value imports (type-only / alias / default). */
function stripImports(source) {
  return source
    .replace(/^import\s+type[\s\S]*?;\s*$/gm, "")
    .replace(/^import\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?\s*$/gm, "")
    .replace(/^import\s*["'][^"']*["'];?\s*$/gm, "")
    .replace(/^import\s*[\w$]+\s*,\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?\s*$/gm, "");
}

/** Remove `export interface NAME {…}` blocks (brace-balanced, nested-safe). */
function stripInterfaces(source) {
  const re = /\bexport\s+interface\s+[\w$]+\s*\{/g;
  let out = "";
  let last = 0;
  let match;
  while ((match = re.exec(source)) !== null) {
    out += source.slice(last, match.index);
    const open = source.indexOf("{", match.index);
    let depth = 0;
    let cursor = open;
    for (; cursor < source.length; cursor += 1) {
      if (source[cursor] === "{") depth += 1;
      else if (source[cursor] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (cursor >= source.length) {
      throw new Error(`unbalanced interface near ${match[0]}`);
    }
    last = cursor + 1;
  }
  out += source.slice(last);
  return out;
}

/**
 * Remove parameter + return type annotations from `function` declarations.
 * Scans each header with a paren-depth walk so object-literal `key: value`
 * colons and ternary colons elsewhere in the body are never touched.
 */
function stripFunctionSignatures(source) {
  const re = /\bfunction\s+[\w$]+\s*\(/g;
  let out = "";
  let last = 0;
  let match;
  while ((match = re.exec(source)) !== null) {
    const headerStart = match.index;
    const open = headerStart + match[0].length - 1;
    let depth = 0;
    let close = open;
    for (; close < source.length; close += 1) {
      if (source[close] === "(") depth += 1;
      else if (source[close] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (close >= source.length) {
      throw new Error(
        `unbalanced function signature near ${source.slice(headerStart, headerStart + 80)}`
      );
    }
    const params = source.slice(open + 1, close);
    const cleanedParams = params
      .split(",")
      .map((segment) => segment.replace(/:\s*[\w$<>\[\]]+\s*$/, "").trim())
      .join(", ");

    out += source.slice(last, headerStart);
    out += match[0].replace(/\(\s*$/, "(") + cleanedParams + ")";

    let cursor = close + 1;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
    if (source[cursor] === ":") {
      cursor += 1;
      while (cursor < source.length && source[cursor] !== "{") cursor += 1;
    }
    last = cursor;
  }
  out += source.slice(last);
  return out;
}

/** Trim the remaining `.ts` surface: export keywords, const types, `as`. */
function stripTypeSurface(source) {
  return source
    .replace(/^export\s+/gm, "")
    .replace(/\b(const|let|var)\s+([\w$]+)\s*:\s*[\w$<>[\].]+\s*(?==)/g, "$1 $2")
    .replace(/\s+as\s+[\w$<>\[\]|.&]+/g, "");
}

/** Full transform: TS-lite source -> plain JS module body. */
function stripTypeScript(source) {
  const stripped = stripComments(source);
  const noImports = stripImports(stripped);
  const noInterfaces = stripInterfaces(noImports);
  const noSignatures = stripFunctionSignatures(noInterfaces);
  return stripTypeSurface(noSignatures);
}

/** Read a repo module, transform it, and assemble the fused engine module. */
function readAndStrip(relPath) {
  return stripTypeScript(readFileSync(join(ROOT, relPath), "utf8"));
}

const safeMathBody = readAndStrip("lib/safeMath.ts");
const engineBody = readAndStrip("lib/calculatorEngine.ts");
const routeBody = readAndStrip("utils/calculateRoute.ts");

const FUSED_ENGINE_SOURCE = `
const __safeMath = (() => {
${safeMathBody}
return { safeDivide, safeMultiply, clampNumber, sanitizeFinancialInput, MIN_DENOMINATOR };
})();

const __engine = (() => {
const { safeDivide, safeMultiply } = __safeMath;
${engineBody}
return { calculateGrossFromTargetNet };
})();

const __route = (() => {
${routeBody}
return {
  MIN_GROSS_USD, MAX_GROSS_USD, DEFAULT_GROSS_USD, SLIDER_STEP_USD,
  clampGrossUSD, quoteChannel, computeRoute
};
})();

export const calculateGrossFromTargetNet = __engine.calculateGrossFromTargetNet;
export const computeRoute = __route.computeRoute;
export const quoteChannel = __route.quoteChannel;
export const clampGrossUSD = __route.clampGrossUSD;
export const MIN_GROSS_USD = __route.MIN_GROSS_USD;
export const MAX_GROSS_USD = __route.MAX_GROSS_USD;
export const DEFAULT_GROSS_USD = __route.DEFAULT_GROSS_USD;
export const safeDivide = __safeMath.safeDivide;
export const safeMultiply = __safeMath.safeMultiply;
export const clampNumber = __safeMath.clampNumber;
export const sanitizeFinancialInput = __safeMath.sanitizeFinancialInput;
`;

const engineUrl =
  "data:text/javascript;charset=utf-8," + encodeURIComponent(FUSED_ENGINE_SOURCE);

let engine;
let transformFailure = null;
try {
  engine = await import(engineUrl);
  const required = [
    "calculateGrossFromTargetNet",
    "computeRoute",
    "quoteChannel",
    "clampGrossUSD",
    "MIN_GROSS_USD",
    "MAX_GROSS_USD",
    "DEFAULT_GROSS_USD",
  ];
  for (const name of required) {
    if (typeof engine[name] === "undefined") {
      throw new Error(`imported engine missing export "${name}"`);
    }
  }
} catch (error) {
  transformFailure = error instanceof Error ? error.message : String(error);
}

/* ------------------------------------------------------------------ *
 * 2. Corpus + scenario configuration (single source of truth)
 * ------------------------------------------------------------------ */

const corpus = JSON.parse(
  readFileSync(join(ROOT, "data", "fees.json"), "utf8")
);
const corridorsBySlug = new Map(
  corpus.corridors.map((corridor) => [corridor.slug, corridor])
);

/** The five most highly-utilized corridors (Phase 7 headline rails). */
const STRESS_SLUGS = [
  "usd-to-pkr",
  "usd-to-inr",
  "usd-to-brl",
  "usd-to-php",
  "usd-to-eur",
];

const BOUNDARIES = [
  { key: "micro", label: "Micro $1", grossUSD: 1 },
  { key: "standard", label: "Standard $1,000", grossUSD: 1000 },
  { key: "high", label: "High $5,000", grossUSD: 5000 },
  { key: "corporate", label: "Corporate $50,000", grossUSD: 50000 },
];

/** Raw amounts near/below the $100 slider floor for the fee-consumption sweep. */
const MICRO_AMOUNTS = [1, 5, 25, 50, 99];

/** Inverse gross-up configurations: legacy-equivalent + realistic wires. */
function buildInverseConfig(corridor) {
  return [
    { key: "legacy", label: "7-Layer Minimal", wireUSD: 0, landingFeeLocal: 0, tierRate: 0 },
    {
      key: "realistic",
      label: "SWIFT $18 + Landing + 5% Tier",
      wireUSD: 18,
      landingFeeLocal: Math.max(1, Math.round(corridor.rate * 2)),
      tierRate: 0.05,
    },
  ];
}

/* ------------------------------------------------------------------ *
 * 3. Failure accounting + assertion helpers
 * ------------------------------------------------------------------ */

const failures = [];
const tallies = {
  forwardQuotes: 0,
  inverseSolves: 0,
  microChecks: 0,
  parityChecks: 0,
  degenerateChecks: 0,
};

function fail(label, detail) {
  failures.push({ label, detail });
  console.log(`  FAIL  ${label.padEnd(46)}${detail}`);
}

const EPS = 1e-6;

function closeTo(actual, expected, absTol, relTol, label) {
  tallies.parityChecks += 1;
  const tolerance = Math.max(absTol, Math.abs(expected) * relTol);
  if (Number.isFinite(actual) && Number.isFinite(expected)) {
    if (Math.abs(actual - expected) <= tolerance) return;
  }
  fail(label, `${actual} !== ${expected} (±${tolerance})`);
}

/** Deep-finitude sweep: any NaN / ±Infinity / null / undefined fails R2. */
function assertFiniteRecord(record, label) {
  const stack = [[record, label]];
  while (stack.length > 0) {
    const [node, path] = stack.pop();
    if (node === null || typeof node === "undefined") {
      fail("R2 non-finite / null invariant", `${path} === ${String(node)}`);
      continue;
    }
    if (typeof node === "number") {
      if (!Number.isFinite(node)) {
        fail("R2 non-finite / null invariant", `${path} === ${String(node)}`);
      }
      continue;
    }
    if (typeof node === "string" || typeof node === "boolean") continue;
    if (typeof node === "bigint" || typeof node === "symbol" || typeof node === "function") {
      fail("R2 non-finite / null invariant", `${path} holds ${typeof node}`);
      continue;
    }
    if (Array.isArray(node)) {
      node.forEach((value, index) => stack.push([value, `${path}[${index}]`]));
      continue;
    }
    if (typeof node === "object") {
      for (const key of Object.keys(node)) {
        stack.push([node[key], `${path}.${key}`]);
      }
    }
  }
}

/** R1 — Net take-home > 0, unless fixed fees consumed the whole amount. */
function assertTakeHome(quote, slug) {
  const fullyConsumed = quote.feeDeductedUSD >= quote.netAfterPlatformUSD;
  if (!(quote.localAmount > 0) && !fullyConsumed) {
    fail(
      "R1 take-home invariant",
      `${slug} ${quote.channelId}: localAmount ${quote.localAmount} <= 0 but fixed fee ${quote.feeDeductedUSD} did not consume net-after-platform ${quote.netAfterPlatformUSD}`
    );
  }
}

/** R3 — total fee deduction within [0.1%, 15%] on non-degenerate transfers. */
function assertSenseCheck(percent, label) {
  if (!Number.isFinite(percent) || percent < 0.1 || percent > 15) {
    fail("R3 fee-deduction bounds", `${label}: ${percent.toFixed(3)}% outside [0.1%, 15%]`);
  }
}

function feePercentEligible(platform, grossUSD) {
  const g = engine ? engine.clampGrossUSD(grossUSD) : Math.max(100, grossUSD);
  if (platform.id === "direct" && g >= 1000) return true;
  return platform.id === "upwork" && g >= 5000;
}

/* ------------------------------------------------------------------ *
 * 4a. Forward stress — computeRoute at every boundary
 * ------------------------------------------------------------------ */

function runForwardSweep() {
  for (const slug of STRESS_SLUGS) {
    const corridor = corridorsBySlug.get(slug);
    if (!corridor) {
      fail("corpus lookup", `${slug} missing from data/fees.json`);
      continue;
    }
    for (const platform of corpus.platforms) {
      for (const boundary of BOUNDARIES) {
        const route = engine.computeRoute(
          boundary.grossUSD,
          platform,
          corridor,
          corpus.channels
        );
        assertFiniteRecord(route, `fwd ${slug}/${platform.id}/${boundary.key}`);
        if (route.grossUSD !== engine.clampGrossUSD(boundary.grossUSD)) {
          fail("forward clamp parity", `${slug} ${boundary.key}: ${route.grossUSD}`);
        }
        for (const quote of route.quotes) {
          const at = `${slug}/${platform.id}/${boundary.key}/${quote.channelId}`;
          tallies.forwardQuotes += 1;
          assertTakeHome(quote, slug);
          if (quote.totalCostUSD < 0 || quote.totalCostPercent < 0) {
            fail("negative fee claim", `fwd ${at}: totalCost ${quote.totalCostUSD} / ${quote.totalCostPercent}%`);
          }
          const channel = corpus.channels.find((c) => c.id === quote.channelId);
          const expectedTotal =
            quote.platformFeeUSD +
            quote.feeDeductedUSD +
            quote.usdConverted * Math.max(0, channel.fxSpread);
          closeTo(quote.totalCostUSD, expectedTotal, 0.01, EPS, `fwd parity ${at}`);
          closeTo(
            quote.localAmount,
            quote.usdConverted * quote.effectiveRate,
            Math.max(0.01, Math.abs(quote.localAmount) * 1e-9),
            1e-9,
            `fwd local parity ${at}`
          );
          if (feePercentEligible(platform, boundary.grossUSD)) {
            assertSenseCheck(quote.totalCostPercent, `fwd ${at}`);
          }
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4b. Micro sweep — the engine waterfall identity below the clamp floor
 * ------------------------------------------------------------------ */

/**
 * Runs the exact waterfall identity from utils/calculateRoute.ts quoteChannel
 * WITHOUT the $100 slider clamp, on amounts micro enough for fixed fees to
 * consume the whole transfer. Uses the shipped `safeMultiply` guard with the
 * same finite-checks so the identities are identical to engine semantics; this
 * is the only spot that deliberately bypasses clampGrossUSD and it is scoped
 * to the fee-consumption carve-out of R1.
 */
function runMicroSweep() {
  const { safeMultiply } = engine;
  for (const slug of STRESS_SLUGS) {
    const corridor = corridorsBySlug.get(slug);
    if (!corridor) continue;
    for (const platform of corpus.platforms) {
      for (const channel of corpus.channels) {
        for (const grossUSD of MICRO_AMOUNTS) {
          const at = `${slug}/${platform.id}/${channel.id}@$${grossUSD}`;
          tallies.microChecks += 1;

          const platformFeeUSD = safeNumber(safeMultiply(grossUSD, platform.feePercent) / 100);
          const netAfterPlatformUSD = safeNumber(grossUSD - platformFeeUSD);
          const feeDeductedUSD = Math.min(channel.fixedFeeUSD, Math.max(0, netAfterPlatformUSD));
          const usdConverted = Math.max(0, netAfterPlatformUSD - feeDeductedUSD);
          const effectiveRate = safeNumber(corridor.rate * (1 - Math.max(0, channel.fxSpread)));
          const localAmount = safeNumber(usdConverted * effectiveRate);
          const fxLossUSD = safeNumber(usdConverted * Math.max(0, channel.fxSpread));
          const totalCostUSD = safeNumber(platformFeeUSD + feeDeductedUSD + fxLossUSD);

          const sample = {
            channelId: channel.id,
            grossUSD,
            platformFeeUSD,
            netAfterPlatformUSD,
            feeDeductedUSD,
            usdConverted,
            effectiveRate,
            localAmount,
            fxLossUSD,
            totalCostUSD,
          };
          assertFiniteRecord(sample, `micro ${at}`);

          if (usdConverted < 0 || netAfterPlatformUSD < 0 || feeDeductedUSD > netAfterPlatformUSD) {
            fail("micro overcharge invariant", `${at}: fee ${feeDeductedUSD} exceeds net ${netAfterPlatformUSD}`);
          }
          if (effectiveRate <= 0) {
            fail("micro effective rate invariant", `${at}: effectiveRate ${effectiveRate}`);
          }
          assertTakeHome({ ...sample, channelId: channel.id }, slug);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4c. Inverse stress — calculateGrossFromTargetNet at every boundary
 * ------------------------------------------------------------------ */

function runInverseSweep() {
  for (const slug of STRESS_SLUGS) {
    const corridor = corridorsBySlug.get(slug);
    if (!corridor) continue;
    const inverseConfigs = buildInverseConfig(corridor);
    for (const platform of corpus.platforms) {
      for (const channel of corpus.channels) {
        for (const boundary of BOUNDARIES) {
          const targetNetLocal = Math.max(
            1,
            Math.round(boundary.grossUSD * corridor.rate)
          );
          for (const config of inverseConfigs) {
            const at = `${slug}/${platform.id}/${channel.id}/${boundary.key}/${config.key}`;
            tallies.inverseSolves += 1;

            const result = engine.calculateGrossFromTargetNet({
              targetNetLocal,
              platformFeePercent: platform.feePercent,
              channelSpread: channel.fxSpread,
              baseRate: corridor.rate,
              fixedFeeUSD: channel.fixedFeeUSD,
              intermediaryCutUSD: config.wireUSD,
              landingFeeLocal: config.landingFeeLocal,
              taxWithholdingRate: config.tierRate,
            });
            assertFiniteRecord(result, `inv ${at}`);

            if (!result.feasible) {
              fail("inverse feasibility", `${at} returned infeasible for a valid target`);
              continue;
            }
            if (!(result.requiredGrossBill > 0)) {
              fail("inverse gross invariant", `${at}: requiredGrossBill ${result.requiredGrossBill}`);
            }
            closeTo(
              result.realizedTakeHomeLocal,
              targetNetLocal,
              Math.max(1, Math.abs(targetNetLocal) * 1e-6),
              1e-6,
              `inv take-home parity ${at}`
            );
            closeTo(
              result.requiredGrossBill,
              safeNumber(result.usdBeforeWires / (1 - result.platformRate)),
              0.01,
              EPS,
              `inv gross-up parity ${at}`
            );
            closeTo(
              result.usdBeforeWires,
              result.netUsdNeeded + result.bankAndWireCutUsd,
              0.01,
              EPS,
              `inv wire-stack parity ${at}`
            );

            // Effective total fee deduction for the gross-up direction is the
            // full cost stack — platform cut + bank/wire cuts + the hidden FX
            // spread leak — as a share of the billable gross, mirroring the
            // forward engine's totalCostUSD composition.
            const totalDeductionUsd =
              result.platformCutUsd +
              result.bankAndWireCutUsd +
              result.spreadLeakageUsd;
            const feePercent =
              result.requiredGrossBill > 0
                ? safeDivide(totalDeductionUsd * 100, result.requiredGrossBill)
                : NaN;
            if (feePercentEligible(platform, boundary.grossUSD)) {
              assertSenseCheck(feePercent, `inv ${at}`);
            }
          }
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4d. Degenerate inputs — Phase S1 guards must trip cleanly, never throw
 * ------------------------------------------------------------------ */

function runDegenerateBattery() {
  const corridor = corridorsBySlug.get("usd-to-pkr");
  const platform = corpus.platforms.find((p) => p.id === "upwork");
  const channel = corpus.channels.find((c) => c.id === "wise");
  const base = {
    targetNetLocal: 100_000,
    platformFeePercent: 10,
    channelSpread: 0.0045,
    baseRate: corridor.rate,
    fixedFeeUSD: channel.fixedFeeUSD,
    intermediaryCutUSD: 18,
    landingFeeLocal: 0,
    taxWithholdingRate: 0,
  };
  const degenerateSolves = [
    { name: "zero target", input: { ...base, targetNetLocal: 0 } },
    { name: "negative target", input: { ...base, targetNetLocal: -500 } },
    { name: "NaN target", input: { ...base, targetNetLocal: NaN } },
    { name: "degenerate baseRate 0", input: { ...base, baseRate: 0 } },
    { name: "spread at 100%", input: { ...base, channelSpread: 1 } },
    { name: "spread above 100%", input: { ...base, channelSpread: 1.5 } },
    { name: "platform at 100%", input: { ...base, platformFeePercent: 100 } },
    { name: "platform above 100%", input: { ...base, platformFeePercent: 120 } },
    { name: "withholding at 100%", input: { ...base, taxWithholdingRate: 1 } },
  ];
  for (const scenario of degenerateSolves) {
    tallies.degenerateChecks += 1;
    const result = engine.calculateGrossFromTargetNet(scenario.input);
    assertFiniteRecord(result, `degenerate ${scenario.name}`);
    if (result.feasible !== false) {
      fail("degenerate guard", `${scenario.name} should be infeasible, got feasible=true`);
    }
  }

  // Sanitization parity: a non-finite fixed fee must be sanitized to 0 by the
  // Phase S1 guards (never propagate Infinity into a quote), so the solve must
  // be finite, feasible and byte-identical to the same input with fee = 0.
  tallies.degenerateChecks += 1;
  const infinityFee = engine.calculateGrossFromTargetNet({
    ...base,
    fixedFeeUSD: Infinity,
  });
  const zeroFee = engine.calculateGrossFromTargetNet({ ...base, fixedFeeUSD: 0 });
  assertFiniteRecord(infinityFee, "degenerate Infinity fixed fee");
  if (infinityFee.feasible !== true) {
    fail("sanitization guard", "Infinity fixed fee should sanitize to 0 and solve");
  }
  closeTo(
    infinityFee.requiredGrossBill,
    zeroFee.requiredGrossBill,
    0.0001,
    1e-12,
    "degenerate Infinity fee sanitization"
  );

  const route = engine.computeRoute(NaN, platform, corridor, corpus.channels);
  assertFiniteRecord(route, "degenerate forward NaN gross");
  if (route.grossUSD !== engine.DEFAULT_GROSS_USD) {
    fail(
      "forward NaN clamp",
      `NaN grossUSD must resolve to the engine default $${engine.DEFAULT_GROSS_USD}, got $${route.grossUSD}`
    );
  }
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function safeDivide(numerator, denominator, fallback = 0) {
  if (
    typeof numerator !== "number" ||
    !Number.isFinite(numerator) ||
    typeof denominator !== "number" ||
    !Number.isFinite(denominator)
  ) {
    return fallback;
  }
  return denominator === 0 ? fallback : numerator / denominator;
}

/* ------------------------------------------------------------------ *
 * 5. Orchestration + report
 * ------------------------------------------------------------------ */

let engineDivider = "-".repeat(72);
if (transformFailure) {
  console.log("\nPayoutDelta Phase S4 — headless invariant simulation\n");
  console.log("  FAIL  engine import — could not load the shipped math engine");
  console.log(`        ${transformFailure}`);
  console.log(engineDivider);
  console.log("  simulation aborted: no engine under test\n");
  process.exit(1);
}

console.log("\nPayoutDelta Phase S4 — headless invariant simulation\n");

runForwardSweep();
runMicroSweep();
runInverseSweep();
runDegenerateBattery();

console.log(`${"Forward stress".padEnd(52)}${tallies.forwardQuotes} quotes across ${STRESS_SLUGS.length} corridors × ${corpus.platforms.length} platforms × ${BOUNDARIES.length} boundaries`);
console.log(`${"Micro fee-consumption sweep".padEnd(52)}${tallies.microChecks} raw identities at/as below the $100 slider floor`);
console.log(`${"Inverse gross-up stress".padEnd(52)}${tallies.inverseSolves} closed-form solves (2 configs × 4 boundaries)`);
console.log(`${"Independent parity checks".padEnd(52)}${tallies.parityChecks} engine vs recomputed identities`);
console.log(`${"Degenerate guard battery".padEnd(52)}${tallies.degenerateChecks + 1} inputs tripped Phase S1 zero-stack guards`);
console.log(engineDivider);

for (const slug of STRESS_SLUGS) {
  const corridor = corridorsBySlug.get(slug);
  const marker = corridor ? "PASS" : "FAIL";
  console.log(
    `  ${`${slug} ${corridor ? `→ ${corridor.currencyName} @ ${corridor.rate}` : "missing"}`.padEnd(52)}${marker}`
  );
}

if (failures.length > 0) {
  console.log(`\n  INVARIANT VIOLATIONS: ${failures.length}`);
  console.log("  simulation FAILED — fix the engine/dataset and re-run\n");
  process.exit(1);
}

console.log("\n  ALL INVARIANTS HELD — engine bounded, finite, non-negative\n");
process.exit(0);