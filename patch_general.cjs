const fs = require('fs');
let code = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

// replace right column width
code = code.replace(/xl:grid-cols-\[1fr_280px\]/g, 'xl:grid-cols-[1fr_340px]');

// remove general heavy backgrounds
code = code.replace(/bg-gradient-to-br from-card via-card\/95 to-card\/90 border border-border\/40 shadow-xl/g, 'bg-card border border-border/40 shadow-sm');

// remove red vertical line
code = code.replace(/<div className="w-0\.5 sm:w-1 h-4 sm:h-5 bg-gradient-to-b from-red-500 to-red-600 rounded-full" \/>/g, '');

// remove primary vertical line from appointments widget
code = code.replace(/<div className="w-1 sm:w-1\.5 h-5 sm:h-6 bg-gradient-to-b from-primary to-accent rounded-full" \/>/g, '');

fs.writeFileSync('src/pages/HomePage.tsx', code);
console.log('done general');
