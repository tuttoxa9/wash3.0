const fs = require('fs');
const file = '/tmp/crmbelautocenter2_reference/src/components/leads/LeadList.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/className="flex h-full flex-col min-w-0 flex-1 overflow-hidden relative"/g,
  'className="flex h-full flex-col min-w-0 flex-1 overflow-hidden relative animate-in fade-in duration-500"');
content = content.replace(/<div className="flex gap-4 overflow-x-auto pb-4 px-1 pt-1 h-full custom-scrollbar items-start">/g,
  '<div className="flex gap-6 overflow-x-auto pb-6 px-2 pt-2 h-full custom-scrollbar items-start">');

fs.writeFileSync(file, content);
