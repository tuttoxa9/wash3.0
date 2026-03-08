const fs = require('fs');
const content = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('setLoading(')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
