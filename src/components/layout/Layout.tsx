import type React from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';

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
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {/* Шапка для мобильных устройств */}
        <div className="flex md:hidden items-center mb-4">
          <button
            onClick={toggleMobileSidebar}
            className="p-2 mr-2 rounded-xl hover:bg-secondary"
            aria-label="Открыть меню"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold gradient-heading">Химчистка 8</h1>
        </div>

        {/* Содержимое страницы */}
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Тостер для уведомлений */}
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;
