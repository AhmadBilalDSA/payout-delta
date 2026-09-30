import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarketStatusBar from "@/components/MarketStatusBar";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import { Dock } from "@/components/dashboard/Dock";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { BaseCurrencyProvider } from "@/components/providers/BaseCurrencyProvider";
import { SovereignHeader } from "@/components/hud/SovereignHeader";
import { KeyboardDock } from "@/components/hud/KeyboardDock";
import { SITE_URL } from "@/lib/seoSchemas";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

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

function ThemeBootstrap() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(()=>{try{var t=localStorage.getItem("payoutdelta:theme")||localStorage.getItem("payoutdelta-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.setAttribute("data-theme","dark")}catch(e){}try{var L=[["en","en-US"],["ur","ur-PK"],["hi","hi-IN"],["fil","fil-PH"],["es","es-ES"],["pt","pt-BR"],["ar","ar-SA"]],R=["ur","ar"],s="";try{s=(localStorage.getItem("payoutdelta:language")||localStorage.getItem("payoutdelta_lang")||"").toLowerCase()}catch(e){}var f=null;for(var i=0;i<L.length;i++){if(L[i][0]===s){f=L[i];break}}if(!f){var b=(navigator.language||"en").toLowerCase().slice(0,2);for(var j=0;j<L.length;j++){if(L[j][0]===b){f=L[j];break}}}if(f){document.documentElement.lang=f[1];document.documentElement.dir=R.indexOf(f[0])>=0?"rtl":"ltr"}}catch(e){}})();`,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="dark"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <meta
        httpEquiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
      />
      <body className="flex min-h-full flex-col">
        <ThemeBootstrap />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <LanguageProvider>
          {/* Phase 6 — registers `public/sw.js` in production builds only, so
              the four registry feeds stay readable offline. Renders nothing;
              a reader who never sees it loses nothing. */}
          <ServiceWorkerRegister />
          {/* Settlement-currency state wraps the whole app so the header
              switcher, the calculator, the waterfall and the bank dossiers all
              quote the same rebased figure from one source of truth. Nested
              inside <LanguageProvider> so the switcher's own labels resolve
              through the same `t()` dictionary as the rest of the shell. */}
          <BaseCurrencyProvider>
            <SovereignHeader />
            <Header />
            <MarketStatusBar />
            {/* Responsive clearance:
                - Mobile (<md): bottom dock at `bottom-3` → need `pb-24` (96px) clearance
                - Desktop (md+): left rail at `left-3.5` → need `pl-20` (80px) clearance
                - `min-h-[calc(100vh-3.5rem)]` reserves the `h-14` utility header */}
            <main className="flex-1 min-h-[calc(100vh-3.5rem)] py-6 pr-4 sm:pr-8 pl-4 md:pl-20 pb-24 md:pb-8">{children}</main>
            <Footer />
            {/* GLOBAL MODULE DOCK — mounted once, as the last node before
                `</body>`, so the launcher floats above every route instead of
                being re-declared per page. It sits inside <LanguageProvider> so
                its seven labels resolve through the shared `t()` dictionary. */}
            <Dock />
            <KeyboardDock />
          </BaseCurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
