const fs = require('fs');

const inputFiles = [
  '/tmp/crmbelautocenter2_reference/src/components/ui/input.tsx',
  '/tmp/crmbelautocenter2_reference/src/components/ui/textarea.tsx',
  '/tmp/crmbelautocenter2_reference/src/components/ui/select.tsx'
];

inputFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Convert generic inputs to rounded-xl, nice borders
    content = content.replace(/rounded-md border border-input/g, "rounded-xl border border-input/50 shadow-sm");
    content = content.replace(/rounded-md border border-input bg-transparent/g, "rounded-xl border border-input/50 bg-background shadow-sm");
    content = content.replace(/focus-visible:ring-1 focus-visible:ring-ring/g, "focus-visible:ring-2 focus-visible:ring-primary/50 border-primary/20");

    // Select specific
    content = content.replace(/rounded-md/g, "rounded-xl");

    fs.writeFileSync(file, content);
  }
});
