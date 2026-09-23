/**
 * PayoutDelta — Phase S1 fault-isolation math layer.
 *
 * A single centralized, fault-tolerant arithmetic primitive set so no line of
 * financial math anywhere in the app can emit Infinity, `-0` ratios or a
 * zombie `NaN` row and take a whole route down. Every helper is pure, typed
 * and finite-safe: a null / undefined / NaN / Infinity operand resolves to a
 * caller-supplied `fallback` (default 0) and a non-zero-but-tiny denominator
 * is clamped to `Number.EPSILON` instead of exploding toward a runaway
 * quotient. Zero external packages — native TypeScript only.
 */

/** A denominator smaller than this on the real line (or exactly zero) is
 *  clamped up to the epsilon boundary before the division runs. */
const MIN_DENOMINATOR = Number.EPSILON;

/**
 * Guarded division.
 *
 * Guards against division by zero, null / undefined / NaN / Infinity
 * operands. A valid (finite) denominator whose magnitude is below the epsilon
 * floor — including exactly `0` — is clamped to a minimum non-zero epsilon
 * (keeping its sign) so the quotient stays bounded; invalid numerators or
 * denominators resolve to `fallback`.
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback = 0
): number {
  if (
    typeof numerator !== "number" ||
    !Number.isFinite(numerator) ||
    typeof denominator !== "number" ||
    !Number.isFinite(denominator)
  ) {
    return fallback;
  }
  const magnitude = Math.abs(denominator);
  const denominatorClamped =
    magnitude < MIN_DENOMINATOR
      ? Math.sign(denominator) === 0
        ? MIN_DENOMINATOR
        : (Math.sign(denominator) as 1 | -1) * MIN_DENOMINATOR
      : denominator;
  return numerator / denominatorClamped;
}

/**
 * Guarded multiplication. Returns `fallback` if either factor is NaN,
 * non-finite, or not a number (null / undefined / string inputs).
 */
export function safeMultiply(
  a: number,
  b: number,
  fallback = 0
): number {
  if (typeof a !== "number" || !Number.isFinite(a)) return fallback;
  if (typeof b !== "number" || !Number.isFinite(b)) return fallback;
  return a * b;
}

/**
 * Clamps a value within `[min, max]`. Non-numeric values resolve to `min`
 * (the safest under-claim) rather than propagating.
 */
export function clampNumber(val: number, min: number, max: number): number {
  if (typeof val !== "number" || !Number.isFinite(val)) {
    return Number.isFinite(min) ? min : 0;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return val;
  }
  const [lo, hi] = min <= max ? [min, max] : [max, min];
  return Math.min(Math.max(val, lo), hi);
}

/**
 * Safely parses user / JSON input (strings, numbers) into a float, stripping
 * commas, currency symbols and whitespace. Anything unresolved resolves to
 * `fallback` — a malformed payout figure can never poison the waterfall.
 */
export function sanitizeFinancialInput(val: unknown, fallback = 0): number {
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.\-]/g, "").trim();
    if (cleaned === "" || cleaned === "-" || cleaned === ".") {
      return fallback;
    }
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}