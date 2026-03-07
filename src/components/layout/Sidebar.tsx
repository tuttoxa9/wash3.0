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
          <div className="mt-auto mb-3">
            <div
              className="relative overflow-hidden bg-primary/5 border border-primary/10 hover:border-primary/30 hover:bg-primary/10 rounded-xl p-2.5 cursor-pointer transition-all duration-200 group"
              onClick={() => {
                if (!currentReport) {
                  toast.error("Выберите дату со сменой");
                  return;
                }
                setIsNotesModalOpen(true);
              }}
            >
              <div className="flex items-center justify-between mb-1.5 relative z-10">
                <div className="flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-primary/70" />
                  <span className="text-[13px] font-medium text-foreground/80">
                    Заметки
                  </span>
                </div>
                {notes.length > 0 && (
                  <div className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-semibold">
                    {notes.length}
                  </div>
                )}
              </div>

              <div className="space-y-1 relative z-10 pl-1">
                {notes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 italic">
                    Нажмите, чтобы добавить...
                  </p>
                ) : (
                  <>
                    {notes.slice(0, 2).map((note) => (
                      <p
                        key={note.id}
                        className="text-[11px] text-foreground/70 leading-tight line-clamp-1 truncate relative before:content-[''] before:absolute before:left-[-6px] before:top-[6px] before:w-[3px] before:h-[3px] before:bg-primary/40 before:rounded-full pl-1"
                      >
                        {note.text}
                      </p>
                    ))}
                    {notes.length > 2 && (
                      <p className="text-[9px] text-primary/60 font-medium pt-0.5 pl-1">
                        +{notes.length - 2}
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
          <div className="p-4 flex flex-col h-[75vh] max-h-[600px] bg-background/50">
            <div className="flex items-center justify-between mb-4 shrink-0 relative">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                  <StickyNote className="w-4 h-4" />
                </div>
                Заметки смены
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 custom-scrollbar">
              {notes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm space-y-2 pb-6">
                  <div className="p-3 bg-muted/50 rounded-full">
                    <StickyNote className="w-6 h-6 opacity-40 text-primary" />
                  </div>
                  <p className="font-medium text-xs">Здесь пока нет заметок</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-card border border-border/40 rounded-xl p-3 group relative shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap pr-6">
                      {note.text}
                    </p>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/20">
                      <span className="text-[10px] font-medium text-muted-foreground/60">
                        {new Date(note.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-destructive/50 hover:text-destructive p-1 rounded-md transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 flex items-center"
                        title="Удалить заметку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 shrink-0 relative">
              <div className="flex items-end gap-1.5 bg-muted/20 p-1.5 rounded-xl border border-border/60 focus-within:border-primary/40 focus-within:bg-background transition-colors">
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
                  className="w-full bg-transparent border-none px-2.5 py-1.5 text-[13px] focus:outline-none resize-none min-h-[36px] max-h-[100px] placeholder:text-muted-foreground/50 custom-scrollbar leading-relaxed"
                  rows={1}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  className="h-9 w-9 shrink-0 flex items-center justify-center bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-40 hover:bg-primary transition-all active:scale-95 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Sidebar;
