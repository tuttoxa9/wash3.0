const fs = require('fs');
const path = 'C:\\Users\\anton\\.gemini\\antigravity\scratch\\wash3.0\\src\\pages\\HomePage.tsx';

let content;
try {
  content = fs.readFileSync(path, 'utf8');
} catch (e) {
  // Попробуем с другим слэшем для винды
  content = fs.readFileSync('C:/Users/anton/.gemini/antigravity/scratch/wash3.0/src/pages/HomePage.tsx', 'utf8');
}

const lines = content.split('\n');

console.log("\n--- SEARCHING FOR SPOTLIGHT IN HOMEPAGE ---");
lines.forEach((line, idx) => {
  if (line.includes('Spotlight') || line.includes('tour') || line.includes('Tour') || line.includes('detail_lab_cash_tour_completed')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
