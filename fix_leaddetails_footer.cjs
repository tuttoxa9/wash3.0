const fs = require('fs');
const file = '/tmp/crmbelautocenter2_reference/src/components/leads/LeadDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/ring-zinc-200/g, "ring-border/50");
content = content.replace(/bg-zinc-900/g, "bg-foreground");
content = content.replace(/ring-white\/10/g, "ring-background/20");
content = content.replace(/text-zinc-400 hover:text-zinc-100 hover:bg-white\/10/g, "text-background/70 hover:text-background hover:bg-background/10");
content = content.replace(/text-zinc-100 bg-blue-600 hover:bg-blue-500/g, "text-primary-foreground bg-primary hover:bg-primary/90");

fs.writeFileSync(file, content);
