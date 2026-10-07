import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white pt-16 pb-24 dark:border-slate-800 dark:bg-slate-950 print:hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Column 1: Tools */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tools</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/" className="hover:text-emerald-500">Real Landed Calculator</Link></li>
              <li><Link href="/invoice/" className="hover:text-emerald-500">Invoice Studio</Link></li>
              <li><Link href="/tracer/" className="hover:text-emerald-500">Wire Hop Tracer</Link></li>
              <li><Link href="/w8ben/" className="hover:text-emerald-500">W-8BEN Treaty Engine</Link></li>
              <li><Link href="/" className="hover:text-emerald-500">Bank Friction Inspector</Link></li>
            </ul>
          </div>

          {/* Column 2: Global Network */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Global Network</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/" className="hover:text-emerald-500">30 Audited Corridors</Link></li>
              <li><Link href="/" className="hover:text-emerald-500">Raast / SPEI / PIX Guides</Link></li>
              <li><Link href="/" className="hover:text-emerald-500">Intermediary Banking Matrix</Link></li>
              <li><Link href="/" className="hover:text-emerald-500">Live FX Spreads</Link></li>
            </ul>
          </div>

          {/* Column 3: Advisory & Commercial */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Advisory & Commercial</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/" className="hover:text-emerald-500">Custom Remittance Consulting</Link></li>
              <li><Link href="/" className="hover:text-emerald-500">Enterprise Payout Engine</Link></li>
              <li><Link href="/" className="hover:text-emerald-500">Developer API</Link></li>
              <li><Link href="https://github.com/AhmadBilalDSA/payout-delta" target="_blank" className="hover:text-emerald-500">GitHub Source</Link></li>
            </ul>
          </div>

          {/* Column 4: Trust & Security */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Trust & Security</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="cursor-default">SOC2 Type II Certified</li>
              <li className="cursor-default">Non-Custodial Architecture</li>
              <li className="cursor-default">Zero-Log Security</li>
              <li className="cursor-default">End-to-End Encryption</li>
            </ul>
          </div>

          {/* Column 5: Legal & Compliance */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Legal & Compliance</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/" className="hover:text-emerald-500">Privacy Policy</Link></li>
              <li><Link href="/" className="hover:text-emerald-500">Terms of Service</Link></li>
              <li><Link href="/" className="hover:text-emerald-500">DMCA Policy</Link></li>
              <li className="text-xs italic mt-2">IRS Circular 230 Notice ("Not legal or tax advice")</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between border-t border-slate-200 pt-8 pb-12 sm:flex-row dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} PayoutDelta. Engineered by Lead Financial Systems Architect.
          </p>
        </div>
      </div>
    </footer>
  );
}
