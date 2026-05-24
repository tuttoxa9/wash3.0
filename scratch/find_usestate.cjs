const fs = require('fs');
const path = 'C:\\Users\\anton\\.gemini\\antigravity\\scratch\\wash3.0\\src\\pages\\HomePage.tsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
console.log("Total lines:", lines.length);

console.log("\n--- ALL USESTATES ---");
lines.forEach((line, idx) => {
  if (line.includes('useState') && line.includes('const [')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
