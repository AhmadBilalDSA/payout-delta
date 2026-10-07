const fs = require('fs');
let code = fs.readFileSync('components/tracer/TracerClient.tsx', 'utf-8');

// Add useState if not present
if (!code.includes('useState')) {
  code = code.replace('import { useMemo }', 'import { useMemo, useState }');
}

// Ensure state is added inside component
const stateAdd = '\n  const [showTelemetry, setShowTelemetry] = useState(false);\n';
code = code.replace('export function TracerClient({ corridors }: { corridors: CorridorData[] }) {\n', 'export function TracerClient({ corridors }: { corridors: CorridorData[] }) {\n' + stateAdd);

const replacement = `
      <div className="mt-8 max-w-3xl mx-auto">
        <button 
          onClick={() => setShowTelemetry(!showTelemetry)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl text-slate-700 dark:text-slate-300 font-medium text-sm"
        >
          <span>Raw MT103 Telemetry Data</span>
          <svg className={\`w-4 h-4 text-slate-500 transition-transform duration-300 \${showTelemetry ? 'rotate-180' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div className={\`overflow-hidden transition-all duration-300 ease-in-out \${showTelemetry ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}\`}>
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400/80 leading-relaxed overflow-x-auto shadow-inner">
            <div className="flex flex-col space-y-2">
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:20:</span><span className="text-emerald-300">TXN98421008432A</span></div>
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:32A:</span><span className="text-emerald-300">261005USD{principal},00</span></div>
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:33B:</span><span className="text-emerald-300">USD{hop1},00</span></div>
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:50K:</span><span className="text-emerald-300">/1093240098<br/>PAYOUTDELTA TECH LLC<br/>US</span></div>
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:53B:</span><span className="text-emerald-300">/00000000</span></div>
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:54A:</span><span className="text-emerald-300">{corridor.slug.split('-')[1].toUpperCase()} BANK CH<br/>INTERMEDIARY CLEARING</span></div>
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:59:</span><span className="text-emerald-300">/99842231<br/>BENEFICIARY CORP</span></div>
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:71A:</span><span className="text-emerald-300">SHA</span></div>
              <div className="flex"><span className="text-slate-500 w-12 shrink-0">:71F:</span><span className="text-emerald-300">USD{corridor.shaUsd},00</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
`;

code = code.replace('      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">', replacement);
fs.writeFileSync('components/tracer/TracerClient.tsx', code);
console.log('Successfully updated TracerClient!');
