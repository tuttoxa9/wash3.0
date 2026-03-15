import NotificationPanel from "@/components/NotificationPanel";
import { useNotifications } from "@/lib/context/NotificationContext";
import { Menu } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Toaster, toast } from "sonner";
import Sidebar from "./Sidebar";

const Layout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { addNotification } = useNotifications();

  // Перехват всех toast сообщений
  useEffect(() => {
    const originalToast = {
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
    };

    // Переопределяем функции toast
    toast.success = (message: string) => {
      addNotification({ type: "success", title: message });
      return originalToast.success(message);
    };

    toast.error = (message: string) => {
      addNotification({ type: "error", title: message });
      return originalToast.error(message);
    };

    toast.info = (message: string) => {
      addNotification({ type: "info", title: message });
      return originalToast.info(message);
    };

    toast.warning = (message: string) => {
      addNotification({ type: "warning", title: message });
      return originalToast.warning(message);
    };

    return () => {
      // Восстанавливаем оригинальные функции
      toast.success = originalToast.success;
      toast.error = originalToast.error;
      toast.info = originalToast.info;
      toast.warning = originalToast.warning;
    };
  }, [addNotification]);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
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
            <div className="w-10">
              <NotificationPanel />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-3/5">
              <img src="/logo.png" alt="Detail Lab" className="h-6 sm:h-8 w-auto object-contain" />
            </div>

            <button
              onClick={toggleMobileSidebar}
              className="mobile-button p-2 rounded-xl hover:bg-secondary touch-manipulation active:scale-95 transition-transform w-10 h-10 flex items-center justify-center"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Контент с отступами */}
        <div className="p-3 sm:p-4 md:p-6">
          {/* Шапка для десктопа */}
          <div className="hidden md:flex justify-end mb-4">
            <NotificationPanel />
          </div>

          {/* Содержимое страницы */}
          <div className="w-full md:max-w-6xl md:mx-auto min-h-[calc(100vh-120px)]">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Тостер для уведомлений - скрытые уведомления */}
      <Toaster
        position="top-right"
        richColors
        visibleToasts={0}
        toastOptions={{
          duration: 1,
          style: { display: "none" },
        }}
      />
    </div>
  );
};

export default Layout;
