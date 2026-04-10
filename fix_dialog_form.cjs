const fs = require('fs');
const file = '/tmp/crmbelautocenter2_reference/src/components/leads/CreateLeadDialog.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-zinc-100\/50 border-zinc-200/g, "bg-muted/10 border-border/50");
content = content.replace(/bg-blue-600 hover:bg-blue-700 text-white/g, "bg-primary hover:bg-primary/90 text-primary-foreground");
content = content.replace(/border-zinc-200/g, "border-border/50");

fs.writeFileSync(file, content);
