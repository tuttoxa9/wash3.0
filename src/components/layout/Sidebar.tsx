import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Archive, Settings, BarChart3, X, Home, Clipboard, BarChart, Sun, Moon, Download, LogOut, StickyNote, Plus, Trash, Loader2 } from 'lucide-react';
import { useAppContext } from '@/lib/context/AppContext';
import { useAuth } from '@/lib/context/AuthContext';
import type { ThemeMode, ShiftNote } from '@/lib/types';
import { dailyReportService } from '@/lib/services/supabaseService';
import { toast } from 'sonner';

interface SidebarProps {
  isMobileOpen: boolean;
  toggleMobileSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, toggleMobileSidebar }) => {
  const { state, dispatch } = useAppContext();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    dispatch({ type: 'SET_THEME', payload: newTheme });
  };

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const currentReport = state.dailyReports[state.currentDate];
  const notes = currentReport?.notes || [];

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !currentReport) return;

    setIsSavingNote(true);
    try {
      const newNote: ShiftNote = {
        id: crypto.randomUUID(),
        text: newNoteText.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedNotes = [...notes, newNote];
      const success = await dailyReportService.updateReport({
        ...currentReport,
        notes: updatedNotes
      });

      if (success) {
        dispatch({
          type: 'SET_DAILY_REPORT',
          payload: {
            date: state.currentDate,
            report: { ...currentReport, notes: updatedNotes }
          }
        });
        setNewNoteText('');
        toast.success('Заметка добавлена');
      } else {
        toast.error('Не удалось сохранить заметку');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Произошла ошибка');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!currentReport) return;

    setIsSavingNote(true);
    try {
      const updatedNotes = notes.filter(n => n.id !== noteId);
      const success = await dailyReportService.updateReport({
        ...currentReport,
        notes: updatedNotes
      });

      if (success) {
        dispatch({
          type: 'SET_DAILY_REPORT',
          payload: {
            date: state.currentDate,
            report: { ...currentReport, notes: updatedNotes }
          }
        });
        toast.success('Заметка удалена');
      } else {
        toast.error('Не удалось удалить заметку');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Произошла ошибка');
    } finally {
      setIsSavingNote(false);
    }
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
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Шапка сайдбара */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h1 className="text-lg sm:text-xl font-bold gradient-heading truncate">Detail Lab</h1>
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
                `sidebar-link ${isActive ? 'active' : ''}`
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
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={toggleMobileSidebar}
            >
              <Clipboard className="w-5 h-5" />
              <span>Записи</span>
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={toggleMobileSidebar}
            >
              <BarChart className="w-5 h-5" />
              <span>Отчеты</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={toggleMobileSidebar}
            >
              <Settings className="w-5 h-5" />
              <span>Настройки</span>
            </NavLink>
          </nav>

          {/* Виджет заметок */}
          <div className="mt-4 mb-4">
            <div
              className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                if (!currentReport) {
                  toast.info('Сначала выберите сотрудников и начните смену');
                  return;
                }
                setIsNotesModalOpen(true);
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold">Заметки смены</span>
                </div>
                {notes.length > 0 && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                    {notes.length}
                  </span>
                )}
              </div>

              <div className="p-3 text-xs">
                {!currentReport ? (
                  <p className="text-muted-foreground italic text-center text-[11px]">Смена не начата</p>
                ) : notes.length === 0 ? (
                  <p className="text-muted-foreground italic text-center text-[11px]">Нет заметок. Нажмите, чтобы добавить.</p>
                ) : (
                  <ul className="space-y-2">
                    {notes.slice(0, 3).map(note => (
                      <li key={note.id} className="text-foreground line-clamp-2 leading-tight bg-muted/20 p-1.5 rounded-md border border-border/30">
                        {note.text}
                      </li>
                    ))}
                    {notes.length > 3 && (
                      <li className="text-center text-primary text-[10px] font-medium pt-1">
                        + ещё {notes.length - 3}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Кнопка установки PWA */}
          <div className="mt-auto mb-4">
            <button
              onClick={handleInstallPWA}
              className="w-full flex items-center gap-3 p-3 rounded-xl install-pwa-btn"
            >
              <Download className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Установить приложение</span>
            </button>
          </div>

          {/* Настройки интерфейса (Тема и Выход) */}
          <div className="pt-4 border-t border-border/60 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3 px-1">Тема оформления</p>
              <div className="segmented-control">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={state.theme === 'light' ? 'active' : ''}
                  aria-label="Светлая тема"
                >
                  <Sun className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={state.theme === 'dark' ? 'active' : ''}
                  aria-label="Темная тема"
                >
                  <Moon className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => handleThemeChange('black')}
                  className={state.theme === 'black' ? 'active' : ''}
                  aria-label="Черная тема"
                >
                  <span className="flex items-center justify-center font-bold text-xs">B</span>
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
      {isNotesModalOpen && currentReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border/50 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-primary" />
                Заметки за {state.currentDate}
              </h2>
              <button
                onClick={() => setIsNotesModalOpen(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Нет заметок</p>
                  <p className="text-sm">Добавьте первую заметку ниже</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {notes.map(note => (
                    <li key={note.id} className="group flex flex-col gap-2 p-3 bg-muted/30 rounded-xl border border-border/40 hover:border-border/80 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm whitespace-pre-wrap flex-1">{note.text}</p>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={isSavingNote}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Удалить заметку"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Новая заметка..."
                  className="flex-1 min-h-[44px] max-h-32 p-3 rounded-xl border border-input bg-background resize-y text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={1}
                  disabled={isSavingNote}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (newNoteText.trim()) {
                        handleAddNote(e as unknown as React.FormEvent);
                      }
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newNoteText.trim() || isSavingNote}
                  className="h-11 px-4 bg-primary text-primary-foreground rounded-xl font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[44px]"
                >
                  {isSavingNote ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
