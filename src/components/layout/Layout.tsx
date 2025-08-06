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
      <main className="flex-1 overflow-auto mobile-main-content">
        {/* Шапка для мобильных устройств */}
        <div className="md:hidden sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border/20 mobile-header">
          <div className="flex items-center justify-between p-3 sm:p-4">
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
        </div>

        {/* Контент с отступами */}
        <div className="p-3 sm:p-4 md:p-6">

          {/* Шапка для десктопа */}
          <div className="hidden md:flex justify-end mb-4">
            <NotificationPanel />
          </div>

          {/* Содержимое страницы */}
          <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)]">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Тостер для уведомлений */}
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;
