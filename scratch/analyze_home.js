const fs = require('fs');
const path = 'C:\\Users\\anton\\.gemini\\antigravity\\scratch\\wash3.0\\src\\pages\\HomePage.tsx';
const content = fs.readFileSync(path, 'utf8');

// Найдем все упоминания useState для табов или навигации
const lines = content.split('\n');
console.log("Total lines:", lines.length);

console.log("\n--- SEARCHING FOR TABS OR NAVIGATION ---");
lines.forEach((line, idx) => {
  if (line.includes('tab') || line.includes('Tab') || line.includes('Navigation') || line.includes('navigation') || line.includes('activeSection')) {
    if (line.length < 120) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
