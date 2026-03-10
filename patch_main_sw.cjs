const fs = require('fs');

const file = 'src/main.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace everything after createRoot(rootElement).render(<App />);
const rootStr = 'createRoot(rootElement).render(<App />);';

const unregisterStr = `// Убираем старый Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}`;

content = content.substring(0, content.indexOf(rootStr) + rootStr.length) + '\n\n' + unregisterStr + '\n';

fs.writeFileSync(file, content);
console.log("src/main.tsx patched to unregister SW");
