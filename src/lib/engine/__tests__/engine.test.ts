/**
 * PayoutDelta — Engine test suite.
 *
 * Deterministic tests covering forward calculations, reverse targets,
 * fee absorption boundaries, and division by zero safety.
 */

import { describe, it, expect } from "vitest";
import {
  calculateForwardPayout,
  calculateReverseTarget,
  safeDivide,
  safeMultiply,
  clampNumber,
  formatCurrency,
  validateCorridor,
  validateRoute,
} from "../math.js";
import type { Corridor, IntermediaryRoute } from "../types.js";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const SAMPLE_CORRIDOR: Corridor = {
  id: "usd-to-pkr",
  source: "USD",
  target: "PKR",
  baseSpreadPercent: 0.035,
  fixedDeductUsd: 30.0,
};

const SAMPLE_ROUTE: IntermediaryRoute = {
  bic: "CHASUS33",
  bankName: "JPMorgan Chase Bank",
  chargeCode: "SHA",
  deductUsd: 25.0,
};

// ─── Utility Tests ────────────────────────────────────────────────────────────

describe("safeDivide", () => {
  it("should divide normally", () => {
    expect(safeDivide(10, 2)).toBe(5);
  });

  it("should return fallback for zero denominator", () => {
    // Zero denominator gets clamped to EPSILON, returns large finite number
    const result = safeDivide(10, 0);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it("should return fallback for NaN denominator", () => {
    expect(safeDivide(10, NaN)).toBe(0);
  });

  it("should return fallback for Infinity numerator", () => {
    expect(safeDivide(Infinity, 2)).toBe(0);
  });

  it("should return custom fallback for invalid inputs", () => {
    expect(safeDivide(10, NaN, 42)).toBe(42);
  });

  it("should handle sub-epsilon denominator", () => {
    const result = safeDivide(1, Number.EPSILON / 2);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});

describe("safeMultiply", () => {
  it("should multiply normally", () => {
    expect(safeMultiply(10, 5)).toBe(50);
  });

  it("should return 0 for NaN operand", () => {
    expect(safeMultiply(NaN, 5)).toBe(0);
  });

  it("should return 0 for Infinity operand", () => {
    expect(safeMultiply(Infinity, 5)).toBe(0);
  });
});

describe("clampNumber", () => {
  it("should clamp within bounds", () => {
    expect(clampNumber(150, 0, 100)).toBe(100);
    expect(clampNumber(-50, 0, 100)).toBe(0);
    expect(clampNumber(50, 0, 100)).toBe(50);
  });

  it("should return min for non-finite input", () => {
    // Non-finite values resolve to min per implementation spec
    expect(clampNumber(NaN, 0, 100)).toBe(0);
    expect(clampNumber(Infinity, 0, 100)).toBe(0);
    expect(clampNumber(-Infinity, 0, 100)).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("should format USD correctly", () => {
    const result = formatCurrency(1000, "USD");
    expect(result).toBe("$1,000.00");
  });

  it("should format PKR correctly", () => {
    const result = formatCurrency(250000, "PKR");
    expect(result).toMatch(/\d{1,3}(,\d{3})*\.\d{2}/);
  });

  it("should clamp negative values to 0", () => {
    const result = formatCurrency(-100, "USD");
    expect(result).toBe("$0.00");
  });
});

// ─── Forward Calculation Tests ────────────────────────────────────────────────

describe("calculateForwardPayout", () => {
  it("should calculate standard forward payout", () => {
    const result = calculateForwardPayout(
      1000,
      SAMPLE_CORRIDOR,
      SAMPLE_ROUTE,
      0.0025 // 0.25% tax
    );

    expect(result.grossAmount).toBe(1000);
    expect(result.intermediaryDeduct).toBe(25);
    expect(result.fxSpreadCost).toBeCloseTo(35); // 1000 * 0.035
    expect(result.statutoryTax).toBeCloseTo(2.5); // 1000 * 0.0025
    expect(result.netLanding).toBeGreaterThan(900);
    expect(result.isFeeAbsorbed).toBe(false);
  });

  it("should clamp amount to minimum", () => {
    const result = calculateForwardPayout(0.5, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0);
    expect(result.grossAmount).toBe(1);
  });

  it("should clamp amount to maximum", () => {
    const result = calculateForwardPayout(20_000_000, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0);
    expect(result.grossAmount).toBe(10_000_000);
  });

  it("should detect fee absorption", () => {
    const tinyCorridor: Corridor = {
      id: "test",
      source: "USD",
      target: "USD",
      baseSpreadPercent: 0,
      fixedDeductUsd: 1000,
    };
    const tinyRoute: IntermediaryRoute = {
      bic: "TESTUS33",
      bankName: "Test Bank",
      chargeCode: "SHA",
      deductUsd: 500,
    };

    const result = calculateForwardPayout(500, tinyCorridor, tinyRoute, 0);
    expect(result.isFeeAbsorbed).toBe(true);
    expect(result.netLanding).toBe(0);
  });

  it("should handle zero tax rate", () => {
    const result = calculateForwardPayout(1000, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0);
    expect(result.statutoryTax).toBe(0);
  });

  it("should clamp high tax rates", () => {
    const result = calculateForwardPayout(1000, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 2.0);
    // Tax rate clamped to 1.0 (100%)
    expect(result.statutoryTax).toBe(1000);
    expect(result.netLanding).toBe(0);
  });

  it("should return positive effective loss percent", () => {
    const result = calculateForwardPayout(1000, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0.1);
    expect(result.effectiveLossPercent).toBeGreaterThan(0);
    expect(result.effectiveLossPercent).toBeLessThan(1);
  });

  it("should handle maximum transaction", () => {
    const result = calculateForwardPayout(10_000_000, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0.1);
    expect(result.grossAmount).toBe(10_000_000);
    expect(result.netLanding).toBeGreaterThan(0);
  });
});

// ─── Reverse Calculation Tests ────────────────────────────────────────────────

describe("calculateReverseTarget", () => {
  it("should calculate required gross for target", () => {
    const result = calculateReverseTarget(
      950,
      SAMPLE_CORRIDOR,
      SAMPLE_ROUTE,
      0.0025
    );

    expect(result.feasible).toBe(true);
    expect(result.requiredGross).toBeGreaterThan(950);
  });

  it("should be infeasible for non-positive target", () => {
    const result = calculateReverseTarget(0, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0);
    expect(result.feasible).toBe(false);
    expect(result.requiredGross).toBe(0);
  });

  it("should be infeasible for negative target", () => {
    const result = calculateReverseTarget(-100, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0);
    expect(result.feasible).toBe(false);
  });

  it("should handle zero tax", () => {
    const result = calculateReverseTarget(1000, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0);
    expect(result.feasible).toBe(true);
  });

  it("should clamp result to bounds", () => {
    const hugeTarget = 50_000_000;
    const result = calculateReverseTarget(hugeTarget, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0);
    expect(result.requiredGross).toBeLessThanOrEqual(10_000_000);
  });
});

// ─── Validation Tests ─────────────────────────────────────────────────────────

describe("validateCorridor", () => {
  it("should accept valid corridor", () => {
    expect(validateCorridor(SAMPLE_CORRIDOR)).toBe(true);
  });

  it("should reject empty id", () => {
    expect(validateCorridor({ ...SAMPLE_CORRIDOR, id: "" })).toBe(false);
  });

  it("should reject invalid spread", () => {
    expect(validateCorridor({ ...SAMPLE_CORRIDOR, baseSpreadPercent: 0.5 })).toBe(false);
  });

  it("should reject negative fixed deduct", () => {
    expect(validateCorridor({ ...SAMPLE_CORRIDOR, fixedDeductUsd: -1 })).toBe(false);
  });
});

describe("validateRoute", () => {
  it("should accept valid BIC", () => {
    expect(validateRoute(SAMPLE_ROUTE)).toBe(true);
  });

  it("should reject lowercase BIC", () => {
    expect(validateRoute({ ...SAMPLE_ROUTE, bic: "ch cus33" })).toBe(false);
  });

  it("should reject short BIC", () => {
    expect(validateRoute({ ...SAMPLE_ROUTE, bic: "CHAS33" })).toBe(false);
  });

  it("should reject excessive deduct", () => {
    expect(validateRoute({ ...SAMPLE_ROUTE, deductUsd: 150 })).toBe(false);
  });
});

// ─── Integration Tests ────────────────────────────────────────────────────────

describe("engine invariants", () => {
  it("R1: amounts bounded within [1, 10_000_000]", () => {
    const result = calculateForwardPayout(0.001, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 0);
    expect(result.grossAmount).toBeGreaterThanOrEqual(1);
    expect(result.grossAmount).toBeLessThanOrEqual(10_000_000);
  });

  it("R2: net landing never negative", () => {
    const result = calculateForwardPayout(
      100,
      { ...SAMPLE_CORRIDOR, fixedDeductUsd: 999 },
      SAMPLE_ROUTE,
      0
    );
    expect(result.netLanding).toBeGreaterThanOrEqual(0);
  });

  it("R3: formatCurrency produces valid string", () => {
    const formatted = formatCurrency(1234.56, "USD");
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("R4: division by zero safety", () => {
    expect(() => calculateForwardPayout(1000, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 1)).not.toThrow();
    expect(() => calculateReverseTarget(1000, SAMPLE_CORRIDOR, SAMPLE_ROUTE, 1)).not.toThrow();
  });
});
