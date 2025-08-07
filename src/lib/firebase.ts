// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"; // Добавлено для работы с базой данных Firestore
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBiXPi2xKdwbQZ36PV0hH9iTCz0kIV01q8",
  authDomain: "detaillab-98ede.firebaseapp.com",
  projectId: "detaillab-98ede",
  storageBucket: "detaillab-98ede.firebasestorage.app",
  messagingSenderId: "16207443199",
  appId: "1:16207443199:web:3f9f396defdeb2892688ca",
  measurementId: "G-SFL4VVJ7TB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Инициализация Firestore с правильными настройками
const db = getFirestore(app);

// Применяем настройки для лучшей производительности
// В Firebase v9+ настройки применяются при создании экземпляра
// но добавим дополнительные опции для лучшей стабильности
// Нельзя напрямую присвоить db.settings, нужно использовать метод
try {
  // Для отладки можно использовать эмулятор
  // connectFirestoreEmulator(db, 'localhost', 8080);

  console.log("Firebase настроен с проектом:", firebaseConfig.projectId);
} catch (error) {
  console.error("Ошибка при инициализации Firebase:", error);
}

// Инициализация Auth
const auth = getAuth(app);

export { db, analytics, app, auth }; // Экспортируем app для использования в других местах
