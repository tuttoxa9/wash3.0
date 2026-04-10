const fs = require('fs');
const file = '/tmp/crmbelautocenter2_reference/src/components/leads/LeadColumn.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/border-zinc-100/g, "border-border/20");
content = content.replace(/bg-blue-600 hover:bg-blue-700 text-white/g, "bg-primary hover:bg-primary/90 text-primary-foreground");
content = content.replace(/bg-zinc-100 hover:bg-zinc-200 text-zinc-700/g, "bg-muted hover:bg-muted/80 text-foreground");
content = content.replace(/text-zinc-600/g, "text-muted-foreground");
content = content.replace(/bg-red-50 text-red-700/g, "bg-destructive/10 text-destructive font-semibold");
content = content.replace(/bg-orange-50 text-orange-700/g, "bg-orange-500/10 text-orange-600 font-semibold");

fs.writeFileSync(file, content);
