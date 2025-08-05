import type React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Archive, Settings, BarChart3, X, Home, Clipboard, BarChart, Sun, Moon } from 'lucide-react';
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

  return (
    <>
      {/* Мобильная подложка (фон) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Сайдбар */}
      <aside
        className={`fixed top-0 left-0 z-50 w-64 h-screen bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] p-4 border-r border-border/40 shadow-lg transition-transform md:static md:translate-x-0 md:z-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Шапка сайдбара */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold gradient-heading">Химчистка 8</h1>
            <button
              onClick={toggleMobileSidebar}
              className="p-1 rounded-lg hover:bg-secondary md:hidden"
              aria-label="Закрыть меню"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Навигация */}
          <nav className="flex-1 space-y-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              end
            >
              <Home className="w-5 h-5" />
              <span>Главная</span>
            </NavLink>
            <NavLink
              to="/records"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Clipboard className="w-5 h-5" />
              <span>Записи</span>
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <BarChart className="w-5 h-5" />
              <span>Отчеты</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Settings className="w-5 h-5" />
              <span>Настройки</span>
            </NavLink>
          </nav>

          {/* Переключатель темы */}
          <div className="pt-4 mt-6 border-t border-border/60">
            <p className="text-sm text-muted-foreground mb-3">Тема оформления</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-2 rounded-lg transition-colors ${
                  state.theme === 'light'
                    ? 'bg-primary text-white'
                    : 'hover:bg-secondary'
                }`}
                aria-label="Светлая тема"
              >
                <Sun className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-2 rounded-lg transition-colors ${
                  state.theme === 'dark'
                    ? 'bg-primary text-white'
                    : 'hover:bg-secondary'
                }`}
                aria-label="Темная тема"
              >
                <Moon className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleThemeChange('black')}
                className={`p-2 rounded-lg transition-colors ${
                  state.theme === 'black'
                    ? 'bg-primary text-white'
                    : 'hover:bg-secondary'
                }`}
                aria-label="Черная тема"
              >
                <span className="flex items-center justify-center w-5 h-5 font-bold">B</span>
              </button>
            </div>
          </div>

          {/* Футер сайдбара */}
          <div className="mt-6 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Химчистка 8</p>
            <p className="mt-1">v1.9.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
