const fs = require('fs');
let code = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

code = code.replace(/<div className="w-0\.5 sm:w-1 h-4 sm:h-5 bg-gradient-to-b from-accent to-primary rounded-full" \/>/g, '');

code = code.replace(/<div className="w-1\.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-primary to-accent rounded-full" \/>/g, '');


fs.writeFileSync('src/pages/HomePage.tsx', code);
console.log('done lines');
