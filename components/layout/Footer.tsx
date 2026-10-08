export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-950 print:hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          PayoutDelta is an independent financial engineering benchmark. Bank deducts and intermediary paths are computed deterministically via published SWIFT clearing tables and statutory tax schedules.
        </p>
      </div>
    </footer>
  );
}
