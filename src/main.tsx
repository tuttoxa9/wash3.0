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
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none' // Не кешируем сам service worker
      });

      console.log('[Main] SW registered: ', registration);

      // Обработка обновлений service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[Main] New SW available, updating...');
              // Принудительно активируем новый SW
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      // Обработка когда новый SW взял контроль
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[Main] SW controller changed, reloading...');
        window.location.reload();
      });

      // Проверяем обновления каждые 60 секунд
      setInterval(() => {
        registration.update();
      }, 60000);

    } catch (registrationError) {
      console.error('[Main] SW registration failed: ', registrationError);
    }
  });
}

// Обработка события установки PWA
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[Main] PWA install prompt intercepted');
  // Предотвращаем автоматический показ промпта
  e.preventDefault();
  // Сохраняем событие для последующего использования
  deferredPrompt = e;
  (window as any).deferredPrompt = e;
});

// Обработка успешной установки PWA
window.addEventListener('appinstalled', () => {
  console.log('[Main] PWA installed successfully');
  deferredPrompt = null;
  (window as any).deferredPrompt = null;
});
