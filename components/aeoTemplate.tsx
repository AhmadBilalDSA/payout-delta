import { Fragment } from "react";
import type { ReactNode } from "react";

/**
 * Phase 2 — AEO answer-template renderer.
 *
 * The AI-extraction blocks interpolate the same `{var}` placeholders the
 * dictionary `t()` helper understands, but render the values as real
 * `<strong>` elements so indexers that parse raw HTML (Perplexity, ChatGPT
 * Search, Google AI Overviews) keep the numbers, providers and deltas
 * emphasized inside the sentence while visitors still see the localized copy.
 */

export type TemplateVars = Record<string, string>;

const VAR_PATTERN = /\{([A-Za-z0-9_]+)\}/g;

/** Plain-text interpolation — used for questions and chip labels. */
export function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(VAR_PATTERN, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match,
  );
}

/** Renders a template, wrapping every interpolated value in a `<strong>`. */
export function renderTemplate(
  template: string,
  vars: TemplateVars,
): ReactNode {
  const parts = template.split(VAR_PATTERN);
  return parts.map((part, index) => {
    if (index % 2 === 0) {
      return <Fragment key={index}>{part}</Fragment>;
    }
    const value = vars[part];
    if (value === undefined) {
      return <Fragment key={index}>{"{" + part + "}"}</Fragment>;
    }
    return (
      <strong
        key={index}
        className="font-semibold tabular-nums text-black dark:text-white"
      >
        {value}
      </strong>
    );
  });
}

/** `0.0025` → `"0.25"`; `0.08` → `"8"`; `0` → `"0"`. */
export function formatTaxPct(rate: number): string {
  const pct = rate * 100;
  return Number(pct.toFixed(2)).toString();
}