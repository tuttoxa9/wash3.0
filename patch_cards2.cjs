const fs = require('fs');
let code = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

code = code.replace(/<div className="w-1 sm:w-1\.5 h-5 sm:h-6 bg-gradient-to-b from-accent to-primary rounded-full" \/>/g, '');

fs.writeFileSync('src/pages/HomePage.tsx', code);
console.log('done2');
