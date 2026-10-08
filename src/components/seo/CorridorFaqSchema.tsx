/**
 * PayoutDelta — AEO-focused FAQPage schema.org component.
 *
 * Static server component that injects three programmatic FAQ entries into
 * the JSON-LD payload for every corridor route. Answers are authored with
 * concrete intermediary-bank and statutory-tax references so answer-engine
 * scrapers can strike on real regulatory citations rather than vague copy.
 *
 * Usage: <CorridorFaqSchema corridor={corridor} />
 */

interface CorridorFaqSchemaProps {
  /** Source currency code, e.g. "USD". */
  source: string;
  /** Target currency code, e.g. "PKR". */
  target: string;
  /** Country display name, e.g. "Pakistan". */
  country: string;
  /** Authoritative regulatory citation, e.g. "Section 154A of the Income Tax Ordinance, 2001". */
  regulatoryCitation: string;
  /** Export purpose code if applicable, e.g. "1201". */
  purposeCode?: string;
}

/**
 * Build schema.org FAQPage JSON-LD for a corridor.
 */
export function buildCorridorFaqSchema(props: CorridorFaqSchemaProps): string {
  const { source, target, country, regulatoryCitation, purposeCode } = props;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What are the hidden intermediary fees for ${source} to ${target} transfers?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${source} to ${target} cross-border wires typically carry two invisible cost layers. First, intermediary SWIFT banks deduct a correspondent fee—commonly $15–$25 per hop (e.g. CHASUS33 for JPMorgan Chase, CITIUS33 for Citibank)—using charge codes OUR (sender pays all), SHA (split), or BEN (receiver pays). Second, the receiving bank may apply its own incoming-credit memo and FX conversion margin below the published mid-market rate. PayoutDelta models each rail's fixed fee and spread explicitly so you can compare gross-to-net ${target} take-home across Upwork, Fiverr, Wise, Payoneer and Direct Wire channels.`,
        },
      },
      {
        "@type": "Question",
        name: `What statutory taxes apply to inward export remittances in ${country}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Inward export remittances to ${country} are subject to ${regulatoryCitation}${purposeCode ? ` (export purpose code ${purposeCode})` : ""}. Freelance and platform earnings are treated as export-of-services income; filer status and NTN/registration alignment determine whether a lower or higher withholding rate applies at source. Withholding drops vary by channel (bank vs licensed payment service provider) and must be reconciled against your annual tax filing. Always confirm current rates with a qualified tax professional, as statutory schedules are amended periodically.`,
        },
      },
      {
        "@type": "Question",
        name: `How does PayoutDelta calculate the payout for ${source} to ${target} transfers?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `PayoutDelta runs a deterministic, finite-safe waterfall in the browser: it starts from your gross ${source} amount, deducts the platform commission (10% for Upwork, 20% for Fiverr, 0% for Direct), subtracts the channel's fixed fee, applies the intermediary bank deduction per the SWIFT charge code, then converts the remainder at the corridor's mid-market rate minus the provider's FX spread. The engine clamps any negative landing to zero and flags it with an isFeeAbsorbed warning—meaning the fixed fees alone exceed the transfer amount. All arithmetic uses high-precision internal calculation with Intl.NumberFormat output, and every value is reproducible from the open dataset at data/fees.json.`,
        },
      },
    ],
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Server component that injects FAQPage JSON-LD into the document head.
 */
export function CorridorFaqSchema(
  props: CorridorFaqSchemaProps
): React.JSX.Element {
  const jsonLd = buildCorridorFaqSchema(props);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}
