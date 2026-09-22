import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AdSlot from "@/components/AdSlot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://payoutdelta.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PayoutDelta — Freelance Payout Fee Auditor",
    template: "%s | PayoutDelta",
  },
  description:
    "Audit freelance payout fees across Upwork, Fiverr and direct invoices. Compare SWIFT, Wise, Payoneer, local bank and remittance channels in 10 currencies — no signup, no cost.",
  keywords: [
    "freelance payout fees",
    "upwork withdrawal fees",
    "fiverr earnings calculator",
    "wise vs payoneer fees",
    "currency conversion spread",
    "remittance calculator",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "PayoutDelta",
    title: "PayoutDelta — Freelance Payout Fee Auditor",
    description:
      "Fee-by-fee breakdown of freelance payout channels across 10 currency corridors. Find the route that keeps the most of what you earn.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayoutDelta — Freelance Payout Fee Auditor",
    description:
      "Fee-by-fee breakdown of freelance payout channels across 10 currency corridors.",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PayoutDelta",
  url: SITE_URL,
  description:
    "Audit freelance payout fees across Upwork, Fiverr and direct invoices in 10 currency corridors.",
  inLanguage: "en-US",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <AdSlot />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}