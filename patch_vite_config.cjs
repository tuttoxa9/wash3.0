const fs = require('fs');

const file = 'vite.config.ts';
let content = fs.readFileSync(file, 'utf8');

// Удаляем импорт
content = content.replace(/import\s+\{\s*VitePWA\s*\}\s+from\s+"vite-plugin-pwa";\n/, '');

// Удаляем вызов VitePWA({...}) из массива plugins:
const vitePwaRegex = /VitePWA\(\{[\s\S]*?\}\)/;
content = content.replace(vitePwaRegex, '');

// Удаляем оставшуюся запятую, если есть
content = content.replace(/,\s*\]/, '\n  ]');

fs.writeFileSync(file, content);
console.log("vite.config.ts patched to remove PWA");
