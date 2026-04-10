const fs = require('fs');
const file = '/tmp/crmbelautocenter2_reference/src/components/ui/dialog.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update overlay
content = content.replace(/bg-black\/80/g, "bg-black/60 backdrop-blur-sm");

// Update content panel
content = content.replace(/bg-background p-6 shadow-lg duration-200 data-\[state=open\]:animate-in data-\[state=closed\]:animate-out data-\[state=closed\]:fade-out-0 data-\[state=open\]:fade-in-0 data-\[state=closed\]:zoom-out-95 data-\[state=open\]:zoom-in-95 data-\[state=closed\]:slide-out-to-left-1\/2 data-\[state=closed\]:slide-out-to-top-\[48%\] data-\[state=open\]:slide-in-from-left-1\/2 data-\[state=open\]:slide-in-from-top-\[48%\] sm:rounded-lg/g,
  "bg-card p-6 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl border border-border/50");

// Update close button
content = content.replace(/opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-\[state=open\]:bg-accent data-\[state=open\]:text-muted-foreground/g,
  "p-2 rounded-full transition-colors hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none ring-offset-background focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none");

fs.writeFileSync(file, content);
