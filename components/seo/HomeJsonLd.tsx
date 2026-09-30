export function HomeJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["SoftwareApplication", "WebApplication"],
        "name": "PayoutDelta Landed Payout Calculator",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "All (Browser-based, Client-side)",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": [
          "Cross-Border Landed Payout Calculation",
          "Intermediary Correspondent Bank SHA Fee Audit",
          "Reverse Invoicing Net-to-Gross Engine",
          "Multi-Rail Settlement Comparison (SWIFT vs Instant Clearing)",
          "Statutory W-8BEN Treaty Resolution"
        ]
      },
      {
        "@type": "FinancialProduct",
        "name": "Cross-Border Settlement & Wire Routing Auditor",
        "description": "Audits intermediary bank deductions and foreign exchange spreads across 200+ sovereign payout corridors.",
        "feesAndCommissionsSpecification": "https://ahmadbilaldsa.github.io/payout-delta/docs/"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is an intermediary correspondent bank fee?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Under SWIFT SHA instructions, intermediary clearing banks (such as JPMorgan Chase or BNY Mellon) deduct statutory routing fees from the principal transit funds before crediting the beneficiary bank."
            }
          },
          {
            "@type": "Question",
            "name": "How does reverse payout calculation work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Reverse calculation computes the exact gross invoice total a vendor must bill so that after statutory correspondent cuts and receiving inward fees are deducted, the exact required net principal lands in their account."
            }
          },
          {
            "@type": "Question",
            "name": "What is the difference between SWIFT SHA and SWIFT OUR?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Under SHA (Shared), the sender covers sending fees while transit deductions are subtracted from the recipient payout. Under OUR, the sender covers all correspondent charges so the recipient receives 100% of the invoiced principal."
            }
          }
        ]
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
