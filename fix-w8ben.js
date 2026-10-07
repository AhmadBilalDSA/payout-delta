const fs = require('fs');
let code = fs.readFileSync('components/tax/W8BenClient.tsx', 'utf-8');
code = code.replace(
  'className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 print:max-w-none print:px-0 print:pb-0"',
  'className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 print:max-w-none print:px-0 print:pb-0"'
);
code = code.replace(
  '<div className="print:hidden mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">',
  '<div className="grid lg:grid-cols-2 gap-8 items-start">\n      <div className="print:hidden flex flex-col gap-6">\n        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">'
);
code = code.replace(
  '          Export Clearance Sheet\n        </button>\n      </div>\n\n      <SpotlightCard',
  '          Export Clearance Sheet\n        </button>\n      </div>\n      </div>\n\n      <SpotlightCard'
);

// We must also close the <div className="grid lg:grid-cols-2 gap-8 items-start"> at the end of SpotlightCard!
code = code.replace(
  '      </SpotlightCard>\n\n      <div className="mt-8',
  '      </SpotlightCard>\n      </div>\n\n      <div className="mt-8'
);

fs.writeFileSync('components/tax/W8BenClient.tsx', code);
console.log('Successfully fixed W8BEN layout!');
