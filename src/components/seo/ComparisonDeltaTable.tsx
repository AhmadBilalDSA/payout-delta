/**
 * PayoutDelta — Static Comparison Delta Table.
 *
 * Renders a clean Markdown/HTML table comparing three transfer scenarios for
 * a $1,000 baseline with zero runtime network dependencies.
 */
interface ComparisonDeltaTableProps {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
}

export default function ComparisonDeltaTable({
  sourceCurrency,
  targetCurrency,
  rate,
}: ComparisonDeltaTableProps): React.JSX.Element {
  const gross = 1000;
  const baseLocal = Math.round(gross * rate);

  // Standard Bank Wire (OUR): sender pays all fees upfront; intermediary absorbed.
  const ourFee = 30;
  const ourSpread = gross * 0.035;
  const ourNetGross = gross - ourFee - ourSpread;
  const ourLocal = Math.round(ourNetGross * rate);

  // Standard Bank Wire (SHA): correspondent deducts $15–$25 per hop.
  const shaIntermediary = 20;
  const shaSpread = gross * 0.035;
  const shaNetGross = gross - shaIntermediary - shaSpread;
  const shaLocal = Math.round(shaNetGross * rate);

  // PayoutDelta Benchmarked: Wise + direct bank, optimized routing.
  const deltaFee = 2.99;
  const deltaSpread = gross * 0.0045;
  const deltaNetGross = gross - deltaFee - deltaSpread;
  const deltaLocal = Math.round(deltaNetGross * rate);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: sourceCurrency,
      minimumFractionDigits: 2,
    }).format(v);
  const fmtLocal = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: targetCurrency,
      minimumFractionDigits: 2,
    }).format(v);

  return (
    <div className="mt-8 overflow-x-auto">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        Transfer Cost Comparison — {fmt(gross)} {sourceCurrency} → {targetCurrency}
      </h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
        Reference rate: 1 {sourceCurrency} = {rate.toFixed(4)} {targetCurrency}
      </p>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
            <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-200">
              Scenario
            </th>
            <th className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">
              {sourceCurrency} Fees
            </th>
            <th className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">
              {sourceCurrency} Net
            </th>
            <th className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">
              {targetCurrency} Received
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          <tr>
            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
              Standard Bank Wire (OUR)
            </td>
            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
              {fmt(ourFee + ourSpread)}
            </td>
            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
              {fmt(ourNetGross)}
            </td>
            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
              {fmtLocal(ourLocal)}
            </td>
          </tr>
          <tr className="bg-amber-50/50 dark:bg-amber-950/20">
            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
              Standard Bank Wire (SHA)
            </td>
            <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">
              {fmt(shaIntermediary + shaSpread)}
            </td>
            <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">
              {fmt(shaNetGross)}
            </td>
            <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">
              {fmtLocal(shaLocal)}
            </td>
          </tr>
          <tr className="bg-emerald-50/60 dark:bg-emerald-950/20">
            <td className="px-4 py-3 font-semibold text-emerald-800 dark:text-emerald-300">
              PayoutDelta Benchmarked
            </td>
            <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
              {fmt(deltaFee + deltaSpread)}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
              {fmt(deltaNetGross)}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
              {fmtLocal(deltaLocal)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 dark:border-slate-700">
            <td className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              Tax note
            </td>
            <td className="px-4 py-3" colSpan={3}>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Statutory tax withholding ({targetCurrency}) may apply at source in {targetCurrency} country. Toggle exemptions where eligible via your channel&apos;s tax form.
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
