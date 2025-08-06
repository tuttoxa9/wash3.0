import type React from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';
import NotificationPanel from '@/components/NotificationPanel';

const Layout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Боковая панель */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />

      {/* Основной контент */}
      <main className="flex-1 overflow-auto p-2 sm:p-3 md:p-4 lg:p-6">
        {/* Шапка для мобильных устройств */}
        <div className="flex md:hidden items-center justify-between mb-3 sm:mb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 -mx-2 px-2 py-2">
          <div className="flex items-center">
            <button
              onClick={toggleMobileSidebar}
              className="mobile-button p-2 mr-2 rounded-xl hover:bg-secondary touch-manipulation active:scale-95 transition-transform"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold gradient-heading truncate">Detail Lab</h1>
          </div>
          <NotificationPanel />
        </div>

        {/* Шапка для десктопа */}
        <div className="hidden md:flex justify-end mb-4">
          <NotificationPanel />
        </div>

        {/* Содержимое страницы */}
        <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)]">
          <Outlet />
        </div>
      </main>

      {/* Тостер для уведомлений */}
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;
