import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import { useAuth } from "@/lib/context/AuthContext";
import { dailyReportService } from "@/lib/services/supabaseService";
import type { ThemeMode } from "@/lib/types";
import {
  Archive,
  BarChart,
  BarChart3,
  Clipboard,
  Download,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Settings,
  StickyNote,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { toast } from "sonner";

interface SidebarProps {
  isMobileOpen: boolean;
  toggleMobileSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  toggleMobileSidebar,
}) => {
  const { state, dispatch } = useAppContext();
  const { logout } = useAuth();

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const currentReport = state.dailyReports[state.currentDate];
  const notes = currentReport?.notes || [];

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    if (!currentReport) {
      toast.error("Сначала начните смену");
      return;
    }

    const newNote = {
      id: crypto.randomUUID(),
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedReport = {
      ...currentReport,
      notes: [...notes, newNote],
    };

    try {
      const success = await dailyReportService.updateReport(updatedReport);
      if (success) {
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: state.currentDate, report: updatedReport },
        });
        setNewNoteText("");
        toast.success("Заметка добавлена");
      } else {
        toast.error("Не удалось сохранить заметку");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при сохранении заметки");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!currentReport) return;

    const updatedReport = {
      ...currentReport,
      notes: notes.filter((n) => n.id !== noteId),
    };

    try {
      const success = await dailyReportService.updateReport(updatedReport);
      if (success) {
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: state.currentDate, report: updatedReport },
        });
        toast.success("Заметка удалена");
      } else {
        toast.error("Не удалось удалить заметку");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при удалении заметки");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    dispatch({ type: "SET_THEME", payload: newTheme });
  };

  const handleInstallPWA = async () => {
    const deferredPrompt = (window as any).deferredPrompt;

    // Проверяем, запущено ли приложение в режиме PWA
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isInStandaloneMode) {
      alert("Приложение уже установлено!");
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
          console.log("[Sidebar] PWA установлено");
        } else {
          console.log("[Sidebar] Пользователь отказался от установки");
        }

        (window as any).deferredPrompt = null;
      } catch (error) {
        console.error("[Sidebar] Ошибка при установке PWA:", error);
      }
    } else {
      // Определяем тип устройства и браузер для более точных инструкций
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isChrome = /Chrome/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);

      let message = "";

      if (isIOS) {
        if (isSafari) {
          message =
            'Для установки приложения:\n1. Нажмите кнопку "Поделиться" внизу экрана\n2. Выберите "На экран Домой"\n3. Нажмите "Добавить"';
        } else {
          message = "Для установки на iOS используйте Safari браузер";
        }
      } else if (isAndroid) {
        if (isChrome) {
          message =
            'Для установки приложения:\n1. Нажмите на меню браузера (⋮)\n2. Выберите "Установить приложение"\n3. Нажмите "Установить"';
        } else if (isFirefox) {
          message =
            'Для установки приложения:\n1. Нажмите на меню браузера\n2. Выберите "Установить"\n3. Нажмите "Добавить на главный экран"';
        } else {
          message = "Для установки используйте Chrome или Firefox браузер";
        }
      } else {
        // Desktop
        if (isChrome) {
          message =
            'Для установки приложения:\n1. Нажмите на иконку установки в адресной строке\n2. Нажмите "Установить"';
        } else {
          message =
            "Для установки приложения используйте Chrome, Edge или другой современный браузер";
        }
      }

      alert(message);
    }
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
        className={`sidebar fixed top-0 left-0 z-50 w-[85vw] max-w-[320px] sm:w-80 md:w-64 h-screen bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] p-3 sm:p-4 border-r border-border/40 shadow-xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:z-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Шапка сайдбара */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h1 className="text-lg sm:text-xl font-bold gradient-heading truncate">
              Detail Lab
            </h1>
            <button
              onClick={toggleMobileSidebar}
              className="mobile-button p-2 rounded-lg hover:bg-secondary md:hidden touch-manipulation active:scale-95 transition-transform"
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
                `sidebar-link ${isActive ? "active" : ""}`
              }
              end
              onClick={toggleMobileSidebar}
            >
              <Home className="w-5 h-5" />
              <span>Главная</span>
            </NavLink>
            <NavLink
              to="/records"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={toggleMobileSidebar}
            >
              <Clipboard className="w-5 h-5" />
              <span>Записи</span>
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={toggleMobileSidebar}
            >
              <BarChart className="w-5 h-5" />
              <span>Отчеты</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={toggleMobileSidebar}
            >
              <Settings className="w-5 h-5" />
              <span>Настройки</span>
            </NavLink>
          </nav>

          {/* Заметки смены */}
          <div className="mt-auto mb-4">
            <div
              className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/40 rounded-2xl p-3 cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-md"
              onClick={() => {
                if (!currentReport) {
                  toast.error("Выберите дату со сменой");
                  return;
                }
                setIsNotesModalOpen(true);
              }}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />

              <div className="flex items-center justify-between mb-2.5 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-background/80 backdrop-blur-sm rounded-lg shadow-sm border border-border/40 text-primary group-hover:text-primary transition-colors">
                    <StickyNote className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-bold tracking-tight text-foreground/90">
                    Заметки
                  </span>
                </div>
                {notes.length > 0 && (
                  <div className="text-[10px] bg-background/80 backdrop-blur-sm border border-border/40 text-foreground px-2 py-0.5 rounded-full font-bold shadow-sm">
                    {notes.length}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 relative z-10">
                {notes.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/80 font-medium">
                    Оставить заметку о смене...
                  </p>
                ) : (
                  <>
                    {notes.slice(0, 2).map((note) => (
                      <div key={note.id} className="flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                        <p className="text-[11px] text-foreground/80 leading-snug line-clamp-1 truncate font-medium">
                          {note.text}
                        </p>
                      </div>
                    ))}
                    {notes.length > 2 && (
                      <p className="text-[10px] text-primary/70 font-bold pt-0.5 pl-2.5">
                        +{notes.length - 2} ещё
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Кнопка установки PWA */}
          <div className="mb-4">
            <button
              onClick={handleInstallPWA}
              className="w-full flex items-center gap-3 p-3 rounded-xl install-pwa-btn"
            >
              <Download className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                Установить приложение
              </span>
            </button>
          </div>

          {/* Настройки интерфейса (Тема и Выход) */}
          <div className="pt-4 border-t border-border/60 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3 px-1">
                Тема оформления
              </p>
              <div className="segmented-control">
                <button
                  onClick={() => handleThemeChange("light")}
                  className={state.theme === "light" ? "active" : ""}
                  aria-label="Светлая тема"
                >
                  <Sun className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleThemeChange("dark")}
                  className={state.theme === "dark" ? "active" : ""}
                  aria-label="Темная тема"
                >
                  <Moon className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleThemeChange("black")}
                  className={state.theme === "black" ? "active" : ""}
                  aria-label="Черная тема"
                >
                  <span className="flex items-center justify-center font-bold text-xs">
                    B
                  </span>
                </button>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Выйти</span>
            </button>
          </div>

          {/* Футер сайдбара */}
          <div className="mt-6 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Detail Lab</p>
            <p className="mt-1">0.9a</p>
          </div>
        </div>
      </aside>

      {/* Модальное окно заметок */}
      {isNotesModalOpen && (
        <Modal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
        >
          <div className="p-5 sm:p-6 flex flex-col h-[85vh] sm:h-[80vh] max-h-[700px] bg-background/50">
            <div className="flex items-center justify-between mb-6 shrink-0 relative">
              <h3 className="text-xl font-bold flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <StickyNote className="w-5 h-5" />
                </div>
                Заметки смены
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2 custom-scrollbar">
              {notes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm space-y-3 pb-10">
                  <div className="p-4 bg-muted/50 rounded-full">
                    <StickyNote className="w-8 h-8 opacity-40 text-primary" />
                  </div>
                  <p className="font-medium">Здесь пока нет заметок</p>
                  <p className="text-xs opacity-70">
                    Напишите что-нибудь важное для этой смены
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-card border border-border/40 rounded-2xl p-4 group relative shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
                  >
                    <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap pr-8">
                      {note.text}
                    </p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/30">
                      <span className="text-[11px] font-medium text-muted-foreground/70 bg-muted/30 px-2 py-0.5 rounded-md">
                        {new Date(note.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100 flex items-center gap-1.5"
                        title="Удалить заметку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold hidden sm:inline-block">
                          УДАЛИТЬ
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 pt-4 shrink-0 relative">
              <div className="flex items-end gap-2 bg-muted/30 p-2 rounded-2xl border border-border/50 focus-within:border-primary/40 focus-within:bg-background transition-colors shadow-inner">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                  placeholder="Новая заметка..."
                  className="w-full bg-transparent border-none px-3 py-2 text-sm focus:outline-none resize-none min-h-[44px] max-h-[120px] placeholder:text-muted-foreground/60 custom-scrollbar leading-relaxed"
                  rows={1}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  className="h-11 w-11 shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-all active:scale-95 shadow-sm disabled:shadow-none"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                Нажмите Enter для отправки, Shift+Enter для переноса строки
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Sidebar;
