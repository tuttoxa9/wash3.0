import type React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Archive, Settings, BarChart3, X, Home, Clipboard, BarChart, Sun, Moon, Download } from 'lucide-react';
import { useAppContext } from '@/lib/context/AppContext';
import type { ThemeMode } from '@/lib/types';

interface SidebarProps {
  isMobileOpen: boolean;
  toggleMobileSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, toggleMobileSidebar }) => {
  const { state, dispatch } = useAppContext();

  const handleThemeChange = (newTheme: ThemeMode) => {
    dispatch({ type: 'SET_THEME', payload: newTheme });
  };

  const handleInstallPWA = async () => {
    const deferredPrompt = (window as any).deferredPrompt;

    // Проверяем, запущено ли приложение в режиме PWA
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              (window.navigator as any).standalone ||
                              document.referrer.includes('android-app://');

    if (isInStandaloneMode) {
      alert('Приложение уже установлено!');
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === 'accepted') {
          console.log('[Sidebar] PWA установлено');
        } else {
          console.log('[Sidebar] Пользователь отказался от установки');
        }

        (window as any).deferredPrompt = null;
      } catch (error) {
        console.error('[Sidebar] Ошибка при установке PWA:', error);
      }
    } else {
      // Определяем тип устройства и браузер для более точных инструкций
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isChrome = /Chrome/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);

      let message = '';

      if (isIOS) {
        if (isSafari) {
          message = 'Для установки приложения:\n1. Нажмите кнопку "Поделиться" внизу экрана\n2. Выберите "На экран Домой"\n3. Нажмите "Добавить"';
        } else {
          message = 'Для установки на iOS используйте Safari браузер';
        }
      } else if (isAndroid) {
        if (isChrome) {
          message = 'Для установки приложения:\n1. Нажмите на меню браузера (⋮)\n2. Выберите "Установить приложение"\n3. Нажмите "Установить"';
        } else if (isFirefox) {
          message = 'Для установки приложения:\n1. Нажмите на меню браузера\n2. Выберите "Установить"\n3. Нажмите "Добавить на главный экран"';
        } else {
          message = 'Для установки используйте Chrome или Firefox браузер';
        }
      } else {
        // Desktop
        if (isChrome) {
          message = 'Для установки приложения:\n1. Нажмите на иконку установки в адресной строке\n2. Нажмите "Установить"';
        } else {
          message = 'Для установки приложения используйте Chrome, Edge или другой современный браузер';
        }
      }

      alert(message);
    }
  };

  return (
    <>
      {/* Затемнение фона при открытом мобильном меню (старый вариант) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Сайдбар */}
      <aside
        className={`
          sidebar
          fixed bottom-0 left-0 z-50 w-full h-auto p-2 border-t border-border/40
          bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]
          shadow-t-lg transition-transform duration-300 ease-in-out
          md:static md:top-0 md:w-64 md:h-screen md:p-3 sm:md:p-4 md:border-r md:border-t-0 md:shadow-xl
          ${isMobileOpen ? 'translate-x-0' : 'md:-translate-x-full'}
        `}
      >
        {/* Десктопная версия */}
        <div className="hidden md:flex flex-col h-full">
          {/* Шапка сайдбара */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h1 className="text-lg sm:text-xl font-bold gradient-heading truncate">Detail Lab</h1>
          </div>

          {/* Навигация */}
          <nav className="flex-1 space-y-2">
            <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
              <Home className="w-5 h-5" />
              <span>Главная</span>
            </NavLink>
            <NavLink to="/records" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Clipboard className="w-5 h-5" />
              <span>Записи</span>
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <BarChart className="w-5 h-5" />
              <span>Отчеты</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Settings className="w-5 h-5" />
              <span>Настройки</span>
            </NavLink>
          </nav>

          {/* Кнопка установки PWA */}
          <div className="mt-auto mb-4">
            <button onClick={handleInstallPWA} className="w-full flex items-center gap-3 p-3 rounded-xl install-pwa-btn">
              <Download className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Установить приложение</span>
            </button>
          </div>

          {/* Переключатель темы */}
          <div className="pt-4 border-t border-border/60">
            <p className="text-sm text-muted-foreground mb-3">Тема оформления</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-2 rounded-lg transition-colors ${state.theme === 'light' ? 'bg-primary text-white' : ''}`}
                aria-label="Светлая тема"
              >
                <Sun className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-2 rounded-lg transition-colors ${state.theme === 'dark' ? 'bg-primary text-white' : ''}`}
                aria-label="Темная тема"
              >
                <Moon className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleThemeChange('black')}
                className={`p-2 rounded-lg transition-colors ${state.theme === 'black' ? 'bg-primary text-white' : ''}`}
                aria-label="Черная тема"
              >
                <span className="flex items-center justify-center w-5 h-5 font-bold">B</span>
              </button>
            </div>
          </div>

          {/* Футер сайдбара */}
          <div className="mt-6 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Detail Lab</p>
            <p className="mt-1">0.9a</p>
          </div>
        </div>

        {/* Мобильная версия (Док-бар) */}
        <nav className="flex justify-around items-center md:hidden">
            <NavLink to="/" className={({ isActive }) => `sidebar-link-mobile ${isActive ? 'active' : ''}`} end>
              <Home className="w-5 h-5" />
              <span className="text-xs mt-1">Главная</span>
            </NavLink>
            <NavLink to="/records" className={({ isActive }) => `sidebar-link-mobile ${isActive ? 'active' : ''}`}>
              <Clipboard className="w-5 h-5" />
              <span className="text-xs mt-1">Записи</span>
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => `sidebar-link-mobile ${isActive ? 'active' : ''}`}>
              <BarChart className="w-5 h-5" />
              <span className="text-xs mt-1">Отчеты</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `sidebar-link-mobile ${isActive ? 'active' : ''}`}>
              <Settings className="w-5 h-5" />
              <span className="text-xs mt-1">Настройки</span>
            </NavLink>
            <button onClick={toggleMobileSidebar} className="sidebar-link-mobile">
              <X className="w-5 h-5" />
              <span className="text-xs mt-1">Ещё</span>
            </button>
        </nav>
      </aside>

      {/* Модальное окно для мобильных */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleMobileSidebar}></div>
        <div className={`absolute bottom-0 left-0 w-full bg-[hsl(var(--sidebar-background))] rounded-t-2xl p-4 transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <button onClick={toggleMobileSidebar} className="absolute top-3 right-3 p-2 rounded-full hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold mb-4">Доп. меню</h2>

          {/* Кнопка установки PWA */}
          <div className="mb-4">
            <button onClick={handleInstallPWA} className="w-full flex items-center gap-3 p-3 rounded-xl install-pwa-btn">
              <Download className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Установить приложение</span>
            </button>
          </div>

          {/* Переключатель темы */}
          <div className="pt-4 border-t border-border/60">
            <p className="text-sm text-muted-foreground mb-3">Тема оформления</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-2 rounded-lg transition-colors ${state.theme === 'light' ? 'bg-primary text-white' : ''}`}
                aria-label="Светлая тема"
              >
                <Sun className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-2 rounded-lg transition-colors ${state.theme === 'dark' ? 'bg-primary text-white' : ''}`}
                aria-label="Темная тема"
              >
                <Moon className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleThemeChange('black')}
                className={`p-2 rounded-lg transition-colors ${state.theme === 'black' ? 'bg-primary text-white' : ''}`}
                aria-label="Черная тема"
              >
                <span className="flex items-center justify-center w-5 h-5 font-bold">B</span>
              </button>
            </div>
          </div>

          {/* Футер */}
          <div className="mt-6 text-xs text-muted-foreground text-center">
            <p>© {new Date().getFullYear()} Detail Lab</p>
            <p className="mt-1">0.9a</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
