const fs = require('fs');
const file = '/tmp/crmbelautocenter2_reference/src/components/leads/LeadColumn.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /w-full shrink-0 min-w-0 rounded-2xl bg-white shadow-sm border overflow-hidden cursor-pointer\s+hover:shadow-md transition-all relative\s+\$\{isOverdue \? 'border-red-300 ring-1 ring-red-300\/50' : 'border-zinc-200\/80'\}/g,
  "w-full shrink-0 min-w-0 rounded-2xl bg-card shadow-sm border overflow-hidden cursor-pointer hover:border-primary/30 transition-all relative ${isOverdue ? 'border-destructive/50 ring-1 ring-destructive/20' : 'border-border/60'}"
);

content = content.replace(/text-zinc-800/g, "text-foreground");
content = content.replace(/text-zinc-900/g, "text-foreground");
content = content.replace(/text-zinc-500/g, "text-muted-foreground");
content = content.replace(/text-zinc-400/g, "text-muted-foreground/70");
content = content.replace(/bg-zinc-200\/50/g, "bg-muted/50");
content = content.replace(/bg-zinc-50\/50/g, "bg-muted/10");
content = content.replace(/bg-zinc-50/g, "bg-muted/30");
content = content.replace(/border-zinc-200/g, "border-border/50");
content = content.replace(/text-pink-600/g, "text-pink-500");
content = content.replace(/text-black/g, "text-foreground");

fs.writeFileSync(file, content);
