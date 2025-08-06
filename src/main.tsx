import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

createRoot(rootElement).render(<App />);

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Обработка события установки PWA
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  // Предотвращаем автоматический показ промпта
  e.preventDefault();
  // Сохраняем событие для последующего использования
  deferredPrompt = e;
  (window as any).deferredPrompt = e;
});
