const fs = require('fs');
let code = fs.readFileSync('components/home/LandedCalculator.tsx', 'utf-8');
const startMatch = `          </div>\n        </div>\n\n        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5 z-10 relative">`;
let startIdx = code.indexOf(startMatch);
if(startIdx === -1) {
  startIdx = code.indexOf(`          </div>\r\n        </div>\r\n\r\n        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5 z-10 relative">`);
}
const endMatch = `      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">`;
const endIdx = code.indexOf(endMatch);
if(startIdx !== -1 && endIdx !== -1) {
  const replacement = `          </div>
        </div>

        <div className="mt-4">
          <button 
            onClick={() => setShowAuditDrawer(!showAuditDrawer)}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-zinc-800/80 hover:bg-zinc-800 transition-colors rounded-xl text-zinc-300 font-medium text-sm"
          >
            <span>Audit Bank Friction & Intermediary Deductions</span>
            <svg className={\`w-4 h-4 text-zinc-500 transition-transform duration-300 \${showAuditDrawer ? 'rotate-180' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div className={\`overflow-hidden transition-all duration-300 ease-in-out \${showAuditDrawer ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}\`}>
            <BankFrictionInspector />
          </div>
        </div>
      </section>

`;
  code = code.slice(0, startIdx) + replacement + code.slice(endIdx);
  fs.writeFileSync('components/home/LandedCalculator.tsx', code);
  console.log('Successfully replaced layout!');
} else {
  console.log('Could not find matches', startIdx, endIdx);
}
