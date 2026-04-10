const fs = require('fs');
const file = '/tmp/crmbelautocenter2_reference/src/components/leads/LeadList.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-white/g, "bg-card");
content = content.replace(/text-zinc-800/g, "text-foreground");
content = content.replace(/text-zinc-900/g, "text-foreground");
content = content.replace(/text-zinc-500/g, "text-muted-foreground");
content = content.replace(/text-zinc-400/g, "text-muted-foreground/70");
content = content.replace(/bg-zinc-50/g, "bg-muted/10");
content = content.replace(/bg-zinc-100/g, "bg-muted/30");
content = content.replace(/border-zinc-200/g, "border-border/50");

fs.writeFileSync(file, content);
