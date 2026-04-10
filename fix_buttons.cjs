const fs = require('fs');
const file = '/tmp/crmbelautocenter2_reference/src/components/ui/button.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update buttons base
content = content.replace(/rounded-md/g, "rounded-xl");
content = content.replace(/ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2/g,
  "ring-offset-background transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50");

content = content.replace(/default: "bg-primary text-primary-foreground hover:bg-primary\/90"/g,
  'default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"');
content = content.replace(/secondary: "bg-secondary text-secondary-foreground hover:bg-secondary\/80"/g,
  'secondary: "bg-muted text-foreground hover:bg-muted/80 shadow-sm"');
content = content.replace(/outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"/g,
  'outline: "border border-border/50 bg-card hover:bg-muted hover:text-foreground shadow-sm"');

fs.writeFileSync(file, content);
