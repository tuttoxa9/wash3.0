const fs = require('fs');
const path = 'C:\\Users\\anton\\.gemini\\antigravity\\scratch\\wash3.0\\src\\pages\\HomePage.tsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
console.log("Total lines:", lines.length);

console.log("\n--- SEARCHING FOR TABS OR SECTIONS ---");
lines.forEach((line, idx) => {
  const lineLower = line.toLowerCase();
  if (lineLower.includes('tab') || lineLower.includes('section') || lineLower.includes('view')) {
    if (line.trim().length < 120 && (line.includes('useState') || line.includes('const') || line.includes('let') || line.includes('<button') || line.includes('<div') || line.includes('active'))) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
