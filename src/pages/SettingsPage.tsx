import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/lib/context/AppContext";
import {
  databaseService,
  employeeService,
  organizationService,
  settingsService,
} from "@/lib/services/supabaseService";
import type {
  Employee,
  MinimumPaymentSettings,
  Organization,
  SalaryCalculationMethod,
  ThemeMode,
} from "@/lib/types";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Building,
  Check,
  Cloud,
  Edit,
  Loader2,
  Lock,
  Moon,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Sun,
  Trash,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { dailyReportService, carWashService } from "@/lib/services/supabaseService";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import TransactionHistory from "@/components/Settings/TransactionHistory";

// Компонент для ввода пароля
const PasswordAuth: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (password === import.meta.env.VITE_SETTINGS_PASSWORD) {
        setError("");
        onSuccess();
      } else {
        setError("Неверный пароль. Попробуйте еще раз.");
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-card rounded-2xl border border-border/50 shadow-sm p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Доступ к настройкам</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Введите пароль для доступа к панели управления
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-colors"
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Проверка...
            </>
          ) : (
            <>Войти</>
          )}
        </button>
      </form>
    </div>
  );
};

// Component for theme settings section
const ThemeSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();

  const setTheme = (theme: ThemeMode) => {
    dispatch({ type: "SET_THEME", payload: theme });
    toast.success(
      `Тема изменена на ${theme === "light" ? "светлую" : theme === "dark" ? "темную" : "черную"}`,
    );
  };

  return (
    <div className="p-5 sm:p-6 border border-border/50 rounded-2xl bg-card shadow-sm">
      <h3 className="text-base font-semibold mb-1">Внешний вид</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Выберите тему оформления приложения
      </p>

      <div className="flex bg-muted/50 p-1 rounded-xl gap-1">
        <button
          onClick={() => setTheme("light")}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-colors text-xs font-medium ${
            state.theme === "light"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:bg-background/50"
          }`}
        >
          <Sun className="w-4 h-4 mb-1.5" />
          Светлая
        </button>

        <button
          onClick={() => setTheme("dark")}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-colors text-xs font-medium ${
            state.theme === "dark"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:bg-background/50"
          }`}
        >
          <Moon className="w-4 h-4 mb-1.5" />
          Темная
        </button>

        <button
          onClick={() => setTheme("black")}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-colors text-xs font-medium ${
            state.theme === "black"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:bg-background/50"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-foreground flex items-center justify-center mb-1.5">
            <div className="w-2 h-2 rounded-full bg-background" />
          </div>
          Черная
        </button>
      </div>
    </div>
  );
};

// Database Status Component
const DatabaseStatus: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: "none" | "checking" | "success" | "error";
    time?: number;
  }>({ status: "none" });

  const checkFirebaseConnection = async () => {
    setConnectionStatus({ status: "checking" });
    setLoading(true);

    const startTime = performance.now();

    try {
      const connected = await databaseService.testConnection();
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (connected) {
        setConnectionStatus({
          status: "success",
          time: responseTime,
        });
        toast.success("Соединение установлено");
      } else {
        throw new Error("Не удалось подключиться к базе данных");
      }
    } catch (error) {
      setConnectionStatus({ status: "error" });
      toast.error("Не удалось подключиться к базе данных");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 border border-border/50 rounded-2xl bg-card shadow-sm">
      <h3 className="text-base font-semibold mb-4">Состояние базы данных</h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div
            className={`w-10 h-10 mr-3 rounded-xl flex items-center justify-center transition-colors
            ${
              connectionStatus.status === "none"
                ? "bg-muted text-muted-foreground"
                : connectionStatus.status === "checking"
                  ? "bg-primary/10 text-primary"
                  : connectionStatus.status === "success"
                    ? "bg-green-500/10 text-green-600"
                    : "bg-destructive/10 text-destructive"
            }`}
          >
            {connectionStatus.status === "checking" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : connectionStatus.status === "success" ? (
              <Check className="w-5 h-5" />
            ) : connectionStatus.status === "error" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Cloud className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {connectionStatus.status === "none"
                ? "Не проверено"
                : connectionStatus.status === "checking"
                  ? "Проверка..."
                  : connectionStatus.status === "success"
                    ? "Подключено"
                    : "Ошибка соединения"}
            </p>
            {connectionStatus.status === "success" && connectionStatus.time && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Отклик: {connectionStatus.time} мс
              </p>
            )}
          </div>
        </div>
        <button
          onClick={checkFirebaseConnection}
          disabled={loading}
          className="px-3 py-1.5 bg-secondary/50 text-secondary-foreground rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 text-xs font-medium flex items-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Проверить</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Data Management Component
const DataManagement: React.FC = () => {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [showClearByDate, setShowClearByDate] = useState(false);
  const [dateToClear, setDateToClear] = useState(format(new Date(), "yyyy-MM-dd"));
  const [clearDatePassword, setClearDatePassword] = useState("");
  const [clearDateError, setClearDateError] = useState("");
  const [clearDateLoading, setClearDateLoading] = useState(false);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [daySummary, setDaySummary] = useState<{ recordsCount: number; totalRevenue: number } | null>(null);

  useEffect(() => {
    if (!showClearByDate || !dateToClear) {
      setDaySummary(null);
      return;
    }

    let isMounted = true;

    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const report = await dailyReportService.getByDate(dateToClear);
        if (isMounted) {
          if (report) {
            setDaySummary({
              recordsCount: report.records.length,
              totalRevenue: report.totalCash + report.totalNonCash,
            });
          } else {
            setDaySummary(null);
          }
        }
      } catch (error) {
        // error handling
      } finally {
        if (isMounted) setSummaryLoading(false);
      }
    };

    fetchSummary();

    return () => { isMounted = false; };
  }, [dateToClear, showClearByDate]);

  const handleClearDatabase = async () => {
    setLoading(true);
    try {
      const success = await databaseService.clearAllData();

      if (success) {
        dispatch({ type: "SET_EMPLOYEES", payload: [] });
        dispatch({ type: "SET_ORGANIZATIONS", payload: [] });
        dispatch({ type: "SET_SERVICES", payload: [] });
        dispatch({ type: "SET_APPOINTMENTS", payload: [] });

        dispatch({
          type: "SET_SALARY_CALCULATION_METHOD",
          payload: {
            method: "minimumWithPercentage",
            date: format(new Date(), "yyyy-MM-dd"),
          },
        });

        dispatch({
          type: "SET_MINIMUM_PAYMENT_SETTINGS",
          payload: {
            minimumPaymentWasher: 0,
            percentageWasher: 10,
            percentageWasherDryclean: 15,
            minimumPaymentAdmin: 0,
            adminCashPercentage: 3,
            adminCarWashPercentage: 2,
            adminDrycleanPercentage: 3,
          },
        });

        toast.success("Все данные удалены");
        setShowConfirmation(false);
      } else {
        throw new Error("Не удалось удалить данные");
      }
    } catch (error) {
      toast.error("Произошла ошибка при очистке");
    } finally {
      setLoading(false);
    }
  };

  const handleClearByDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateToClear) return;

    setClearDateLoading(true);
    setClearDateError("");

    setTimeout(async () => {
      if (clearDatePassword !== import.meta.env.VITE_SETTINGS_PASSWORD) {
        setClearDateError("Неверный пароль. Попробуйте еще раз.");
        setClearDateLoading(false);
        return;
      }

      try {
        const success = await databaseService.clearDataByDate(dateToClear);
        if (success) {
          toast.success(`Данные за ${format(parseISO(dateToClear), "dd.MM.yyyy")} успешно удалены`);
          setShowClearByDate(false);
          setClearDatePassword("");

          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          throw new Error("Не удалось удалить данные за день");
        }
      } catch (error) {
        toast.error("Произошла ошибка при удалении данных за день");
      } finally {
        setClearDateLoading(false);
      }
    }, 500);
  };

  return (
    <div className="p-5 sm:p-6 border border-destructive/20 rounded-2xl bg-destructive/5 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-2 text-destructive flex items-center gap-2">
          <Trash className="w-4 h-4" />
          Опасная зона
        </h3>
        <p className="text-sm text-muted-foreground">
          Удаление данных из базы данных. Это действие необратимо.
        </p>
      </div>

      {/* Очистка данных за конкретный день */}
      <div className="bg-background/50 border border-border/50 rounded-xl p-4">
        {!showClearByDate ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">Очистка по дате</h4>
              <p className="text-xs text-muted-foreground mt-1">Удаление всех смен, долгов и записей за выбранный день</p>
            </div>
            <button
              onClick={() => setShowClearByDate(true)}
              className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors text-xs font-medium whitespace-nowrap self-start sm:self-auto"
            >
              Выбрать день
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center justify-between">
              Удаление данных за день
              <button
                onClick={() => {
                  setShowClearByDate(false);
                  setClearDatePassword("");
                  setClearDateError("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </h4>

            <form onSubmit={handleClearByDate} className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Выберите дату</label>
                <input
                  type="date"
                  value={dateToClear}
                  onChange={(e) => setDateToClear(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-destructive text-sm"
                  required
                />
              </div>

              {/* Day Summary Block */}
              {summaryLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/30 rounded-xl border border-border/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Загрузка данных о смене...
                </div>
              ) : daySummary ? (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-destructive font-medium mb-1">
                        Найдены данные за {format(parseISO(dateToClear), "dd.MM.yyyy")}:
                      </p>
                      <ul className="text-xs text-destructive/80 space-y-0.5 list-disc list-inside">
                        <li>Количество машин: <span className="font-semibold">{daySummary.recordsCount}</span></li>
                        <li>Общая выручка: <span className="font-semibold">{daySummary.totalRevenue} BYN</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/50 border border-border/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">
                    Нет данных о машинах и выручке за {dateToClear ? format(parseISO(dateToClear), "dd.MM.yyyy") : "этот день"}.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Пароль от настроек</label>
                <input
                  type="password"
                  value={clearDatePassword}
                  onChange={(e) => setClearDatePassword(e.target.value)}
                  placeholder="Введите пароль для подтверждения"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-destructive text-sm"
                  required
                />
                {clearDateError && <p className="mt-1.5 text-xs text-destructive">{clearDateError}</p>}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={clearDateLoading || !clearDatePassword || !dateToClear}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-50 text-xs font-medium"
                >
                  {clearDateLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash className="w-3.5 h-3.5" />
                  )}
                  Удалить данные за {dateToClear ? format(parseISO(dateToClear), "dd.MM.yyyy") : "выбранный день"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="h-px bg-border/50 w-full my-2"></div>

      {/* Очистка всей БД */}
      {showConfirmation ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive mb-1 text-sm">
                Подтверждение удаления
              </h4>
              <p className="mb-4 text-xs text-destructive/80 leading-relaxed">
                Вы действительно хотите удалить <strong>ВСЕ данные</strong>? Будут
                удалены: сотрудники, организации, услуги, записи и настройки.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-3 py-1.5 rounded-lg bg-background border border-input hover:bg-muted transition-colors text-xs font-medium"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  onClick={handleClearDatabase}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 text-xs font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash className="w-3 h-3" />
                  )}
                  Удалить всё
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirmation(true)}
          className="px-4 py-2 w-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Trash className="w-4 h-4" />
          <span>Удалить все данные</span>
        </button>
      )}
    </div>
  );
};

// Employee Settings Component
const EmployeeSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [newEmployee, setNewEmployee] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState({
    employee: false,
    fetchEmployees: false,
    deleteEmployee: null as string | null,
    updateEmployee: null as string | null,
  });

  const fetchEmployees = async () => {
    setLoading((prev) => ({ ...prev, fetchEmployees: true }));
    try {
      const employees = await employeeService.getAll();
      dispatch({ type: "SET_EMPLOYEES", payload: employees });
    } catch (error) {
      toast.error("Не удалось загрузить список сотрудников");
    } finally {
      setLoading((prev) => ({ ...prev, fetchEmployees: false }));
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.trim()) {
      toast.error("Введите имя сотрудника");
      return;
    }

    setLoading((prev) => ({ ...prev, employee: true }));
    try {
      const employee: Omit<Employee, "id"> = { name: newEmployee.trim() };
      const addedEmployee = await employeeService.add(employee);
      if (addedEmployee) {
        dispatch({ type: "ADD_EMPLOYEE", payload: addedEmployee });
        toast.success(`Сотрудник ${addedEmployee.name} добавлен`);
        setNewEmployee("");
      } else {
        throw new Error("Не удалось добавить сотрудника");
      }
    } catch (error) {
      toast.error("Не удалось добавить сотрудника");
    } finally {
      setLoading((prev) => ({ ...prev, employee: false }));
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (!editingEmployee.name.trim()) return;

    setLoading((prev) => ({ ...prev, updateEmployee: editingEmployee.id }));
    try {
      const success = await employeeService.update(editingEmployee);
      if (success) {
        dispatch({ type: "UPDATE_EMPLOYEE", payload: editingEmployee });
        toast.success("Данные сотрудника обновлены");
        setEditingEmployee(null);
      } else {
        throw new Error("Не удалось обновить");
      }
    } catch (error) {
      toast.error("Ошибка при обновлении данных сотрудника");
    } finally {
      setLoading((prev) => ({ ...prev, updateEmployee: null }));
    }
  };

  const handleDeleteEmployee = async (
    employeeId: string,
    employeeName: string,
  ) => {
    if (!confirm(`Удалить сотрудника "${employeeName}"?`)) return;

    setLoading((prev) => ({ ...prev, deleteEmployee: employeeId }));
    try {
      const success = await employeeService.delete(employeeId);
      if (success) {
        dispatch({ type: "REMOVE_EMPLOYEE", payload: employeeId });
        toast.success(`Сотрудник ${employeeName} удален`);
        if (editingEmployee?.id === employeeId) setEditingEmployee(null);
      } else {
        throw new Error("Не удалось удалить сотрудника");
      }
    } catch (error) {
      toast.error("Ошибка при удалении сотрудника");
    } finally {
      setLoading((prev) => ({ ...prev, deleteEmployee: null }));
    }
  };

  return (
    <div className="p-6 sm:p-7 border border-border/50 rounded-[24px] bg-card shadow-md flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-foreground">Список сотрудников</h3>
        <button
          onClick={fetchEmployees}
          disabled={loading.fetchEmployees}
          className="text-xs px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading.fetchEmployees ? "animate-spin" : ""}`}
          />
          Обновить
        </button>
      </div>

      <form onSubmit={handleAddEmployee} className="mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newEmployee}
            onChange={(e) => setNewEmployee(e.target.value)}
            placeholder="Имя сотрудника"
            className="flex-1 px-4 py-3 bg-muted/50 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm transition-colors text-foreground placeholder:text-muted-foreground/50"
            disabled={loading.employee}
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm"
            disabled={loading.employee || !newEmployee.trim()}
          >
            {loading.employee ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Добавить</span>
          </button>
        </div>
      </form>

      <div className="rounded-[16px] border border-border/50 bg-background/50 overflow-hidden flex-1">
        {state.employees.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {state.employees.map((employee) => (
              <li
                key={employee.id}
                className="px-5 py-4 flex items-center justify-between text-sm group hover:bg-muted/50 transition-colors min-h-[56px]"
              >
                {editingEmployee?.id === employee.id ? (
                  <form
                    onSubmit={handleUpdateEmployee}
                    className="flex items-center gap-2 w-full"
                  >
                    <input
                      type="text"
                      value={editingEmployee.name}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-1.5 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingEmployee(null)}
                        className="text-muted-foreground hover:text-foreground p-1.5"
                        disabled={loading.updateEmployee === employee.id}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="submit"
                        className="text-primary hover:text-primary/80 p-1.5"
                        disabled={loading.updateEmployee === employee.id}
                      >
                        {loading.updateEmployee === employee.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="font-semibold text-[15px]">{employee.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingEmployee({ ...employee })}
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted"
                        disabled={!!editingEmployee}
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteEmployee(employee.id, employee.name)
                        }
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-destructive/10"
                        disabled={loading.deleteEmployee === employee.id || !!editingEmployee}
                        title="Удалить"
                      >
                        {loading.deleteEmployee === employee.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            {loading.fetchEmployees
              ? "Загрузка..."
              : "Нет добавленных сотрудников"}
          </div>
        )}
      </div>
    </div>
  );
};

// Salary Calculation Settings Component
const SalaryCalculationSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [minimumSettings, setMinimumSettings] = useState<MinimumPaymentSettings>(
    state.minimumPaymentSettings,
  );

  useEffect(() => {
    const loadSalaryCalculationMethod = async () => {
      try {
        const result = await settingsService.getSalaryCalculationMethod();
        if (result) {
          dispatch({
            type: "SET_SALARY_CALCULATION_METHOD",
            payload: {
              method: result.method as SalaryCalculationMethod,
              date: result.date,
            },
          });
        }
      } catch (error) {
        // Silent error
      }
    };
    loadSalaryCalculationMethod();
  }, [dispatch]);

  const handleSalaryMethodChange = async (method: SalaryCalculationMethod) => {
    setLoading(true);
    setSavingError(null);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const success = await settingsService.saveSalaryCalculationMethod(
        method,
        today,
      );
      if (success) {
        dispatch({
          type: "SET_SALARY_CALCULATION_METHOD",
          payload: { method, date: today },
        });
        toast.success("Метод расчета изменен");
      } else {
        throw new Error("Ошибка сохранения");
      }
    } catch (error) {
      setSavingError("Не удалось сохранить настройки. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMinimumSettings = async () => {
    setLoading(true);
    try {
      const success = await settingsService.saveMinimumPaymentSettings(
        minimumSettings,
      );
      if (success) {
        dispatch({
          type: "SET_MINIMUM_PAYMENT_SETTINGS",
          payload: minimumSettings,
        });
        toast.success("Настройки минимальной оплаты сохранены");
      } else {
        throw new Error("Ошибка сохранения");
      }
    } catch (error) {
      toast.error("Ошибка при сохранении настроек");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-7 border border-border/50 rounded-[24px] bg-card shadow-md flex flex-col h-full">
      <h3 className="text-lg font-bold text-foreground mb-2">Расчет заработной платы</h3>
      <p className="text-[13px] text-muted-foreground mb-6">
        Выберите метод расчета. Изменение применяется ко всем сменам с сегодняшнего дня.
      </p>

      {savingError && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
          {savingError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <button
          onClick={() => handleSalaryMethodChange("minimumWithPercentage")}
          className={`p-5 rounded-[16px] flex items-start text-left transition-colors border ${
            state.salaryCalculationMethod === "minimumWithPercentage"
              ? "bg-primary/5 border-primary/30 shadow-sm"
              : "bg-background/50 border-border/50 hover:bg-muted/50"
          }`}
          disabled={loading}
        >
          <div
            className={`w-[22px] h-[22px] rounded-full border flex-shrink-0 mt-0.5 mr-4 flex items-center justify-center transition-colors ${
              state.salaryCalculationMethod === "minimumWithPercentage"
                ? "border-primary bg-primary/10"
                : "border-input bg-background"
            }`}
          >
            {state.salaryCalculationMethod === "minimumWithPercentage" && (
              <div className="w-[10px] h-[10px] rounded-full bg-primary shadow-sm"></div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[15px] mb-1.5 text-foreground">Минимальная оплата + процент</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Мойщик: % от выручки или мин. оплата. <br />
              Админ: % от кассы + % от личных услуг или мин. оплата.
            </p>
          </div>
        </button>

        {state.salaryCalculationMethod === "minimumWithPercentage" && (
          <div className="p-5 bg-background/30 rounded-[16px] border border-border/50 mt-2 animate-in fade-in duration-300">
            <h4 className="text-[15px] font-bold mb-5 text-foreground">
              Параметры расчета
            </h4>

            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] text-muted-foreground mb-2 font-medium">
                    Мин. оплата мойщика
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.minimumPaymentWasher}
                    onChange={(e) =>
                      setMinimumSettings({
                        ...minimumSettings,
                        minimumPaymentWasher: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted/50 text-sm text-foreground border border-input rounded-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-muted-foreground mb-2 font-medium">
                    % мойщика - мойка
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.percentageWasher}
                    onChange={(e) =>
                      setMinimumSettings({
                        ...minimumSettings,
                        percentageWasher: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted/50 text-sm text-foreground border border-input rounded-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="10"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-muted-foreground mb-2 font-medium">
                    % мойщика - химчистка
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.percentageWasherDryclean}
                    onChange={(e) =>
                      setMinimumSettings({
                        ...minimumSettings,
                        percentageWasherDryclean:
                          Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted/50 text-sm text-foreground border border-input rounded-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="15"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-[13px] text-muted-foreground mb-2 font-medium">
                    Мин. оплата админа
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.minimumPaymentAdmin}
                    onChange={(e) =>
                      setMinimumSettings({
                        ...minimumSettings,
                        minimumPaymentAdmin: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted/50 text-sm text-foreground border border-input rounded-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-muted-foreground mb-2 font-medium">
                    % адм от кассы
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.adminCashPercentage}
                    onChange={(e) =>
                      setMinimumSettings({
                        ...minimumSettings,
                        adminCashPercentage: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted/50 text-sm text-foreground border border-input rounded-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="3"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-muted-foreground mb-2 font-medium">
                    % адм от мойки
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.adminCarWashPercentage}
                    onChange={(e) =>
                      setMinimumSettings({
                        ...minimumSettings,
                        adminCarWashPercentage: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted/50 text-sm text-foreground border border-input rounded-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="2"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-muted-foreground mb-2 font-medium">
                    % адм от химчистки
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.adminDrycleanPercentage}
                    onChange={(e) =>
                      setMinimumSettings({
                        ...minimumSettings,
                        adminDrycleanPercentage: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted/50 text-sm text-foreground border border-input rounded-[12px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="3"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveMinimumSettings}
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-primary text-primary-foreground rounded-[12px] hover:bg-primary/90 transition-colors text-[15px] font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Сохранить параметры
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Organizations Settings Component
const OrganizationsSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(
    null,
  );
  const [loading, setLoading] = useState({
    addOrg: false,
    deleteOrg: null as string | null,
    updateOrg: null as string | null,
    fetchOrgs: false,
  });

  const fetchOrganizations = async () => {
    setLoading((prev) => ({ ...prev, fetchOrgs: true }));
    try {
      const orgs = await organizationService.getAll();
      dispatch({ type: "SET_ORGANIZATIONS", payload: orgs });
    } catch (error) {
      toast.error("Не удалось загрузить организации");
    } finally {
      setLoading((prev) => ({ ...prev, fetchOrgs: false }));
    }
  };

  const handleAddOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrganizationName.trim()) {
      toast.error("Введите название организации");
      return;
    }

    setLoading((prev) => ({ ...prev, addOrg: true }));
    try {
      const organization: Omit<Organization, "id"> = {
        name: newOrganizationName.trim(),
      };
      const addedOrg = await organizationService.add(organization);
      if (addedOrg) {
        dispatch({ type: "ADD_ORGANIZATION", payload: addedOrg });
        toast.success("Организация добавлена");
        setNewOrganizationName("");
      } else {
        throw new Error("Не удалось добавить");
      }
    } catch (error) {
      toast.error("Ошибка при добавлении");
    } finally {
      setLoading((prev) => ({ ...prev, addOrg: false }));
    }
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrganization) return;
    if (!editingOrganization.name.trim()) return;

    setLoading((prev) => ({ ...prev, updateOrg: editingOrganization.id }));
    try {
      const success = await organizationService.update(editingOrganization);
      if (success) {
        dispatch({ type: "UPDATE_ORGANIZATION", payload: editingOrganization });
        toast.success("Организация обновлена");
        setEditingOrganization(null);
      } else {
        throw new Error("Не удалось обновить");
      }
    } catch (error) {
      toast.error("Ошибка при обновлении");
    } finally {
      setLoading((prev) => ({ ...prev, updateOrg: null }));
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Удалить организацию "${orgName}"?`)) return;

    setLoading((prev) => ({ ...prev, deleteOrg: orgId }));
    try {
      const success = await organizationService.delete(orgId);
      if (success) {
        dispatch({ type: "REMOVE_ORGANIZATION", payload: orgId });
        toast.success("Организация удалена");
        if (editingOrganization?.id === orgId) setEditingOrganization(null);
      } else {
        throw new Error("Не удалось удалить");
      }
    } catch (error) {
      toast.error("Ошибка при удалении");
    } finally {
      setLoading((prev) => ({ ...prev, deleteOrg: null }));
    }
  };

  return (
    <div className="p-5 sm:p-6 border border-border/50 rounded-2xl bg-card shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold">Список партнеров</h3>
        <button
          onClick={fetchOrganizations}
          disabled={loading.fetchOrgs}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading.fetchOrgs ? "animate-spin" : ""}`}
          />
          Обновить
        </button>
      </div>

      <form onSubmit={handleAddOrganization} className="mb-5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newOrganizationName}
            onChange={(e) => setNewOrganizationName(e.target.value)}
            placeholder="Название организации"
            className="flex-1 px-3 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-colors"
            disabled={loading.addOrg}
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
            disabled={loading.addOrg || !newOrganizationName.trim()}
          >
            {loading.addOrg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Добавить</span>
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-border/50 bg-background/50 overflow-hidden">
        {state.organizations.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {state.organizations.map((org) => (
              <li
                key={org.id}
                className="px-4 py-2 flex items-center justify-between text-sm group hover:bg-muted/50 transition-colors min-h-[44px]"
              >
                {editingOrganization?.id === org.id ? (
                  <form
                    onSubmit={handleUpdateOrganization}
                    className="flex items-center gap-2 w-full"
                  >
                    <input
                      type="text"
                      value={editingOrganization.name}
                      onChange={(e) =>
                        setEditingOrganization({
                          ...editingOrganization,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 px-2 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingOrganization(null)}
                        className="text-muted-foreground hover:text-foreground p-1.5"
                        disabled={loading.updateOrg === org.id}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="submit"
                        className="text-primary hover:text-primary/80 p-1.5"
                        disabled={loading.updateOrg === org.id}
                      >
                        {loading.updateOrg === org.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="font-medium">{org.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingOrganization({ ...org })}
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded-md"
                        disabled={!!editingOrganization}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrganization(org.id, org.name)}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded-md"
                        disabled={loading.deleteOrg === org.id || !!editingOrganization}
                      >
                        {loading.deleteOrg === org.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            {loading.fetchOrgs ? "Загрузка..." : "Нет организаций"}
          </div>
        )}
      </div>
    </div>
  );
};

// Organizations In Total Settings
const OrganizationsInTotalSettings = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);

  const toggleOrganization = async (orgId: string) => {
    setLoading(true);
    try {
      const current = state.organizationsInTotal || [];
      const isSelected = current.includes(orgId);
      let newOrgs: string[];

      if (isSelected) {
        newOrgs = current.filter((id) => id !== orgId);
      } else {
        newOrgs = [...current, orgId];
      }

      const success = await settingsService.saveOrganizationsInTotal(newOrgs);
      if (success) {
        dispatch({
          type: "SET_ORGANIZATIONS_IN_TOTAL",
          payload: newOrgs,
        });
      } else {
        throw new Error("Ошибка");
      }
    } catch (error) {
      toast.error("Не удалось сохранить настройки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 border border-border/50 rounded-2xl bg-card shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-base font-semibold">Организации в Итого</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Выберите организации, суммы которых будут вычитаться из общего безнала и
        отображаться отдельным пунктом в блоке «Итого».
      </p>

      {state.organizations.length === 0 ? (
        <div className="p-4 border border-dashed rounded-xl text-center text-muted-foreground text-sm">
          Сначала добавьте организации в списке партнеров
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.organizations.map((org) => {
            const isSelected = (state.organizationsInTotal || []).includes(org.id);
            return (
              <button
                key={org.id}
                onClick={() => toggleOrganization(org.id)}
                disabled={loading}
                className={`p-3.5 rounded-xl flex items-center justify-between transition-colors border text-left ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 bg-background hover:border-border hover:bg-muted/50"
                }`}
              >
                <span
                  className={`text-sm font-medium truncate pr-3 ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}
                >
                  {org.name}
                </span>

                <div
                  className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input bg-background"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Debts Management Component
const DebtsManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [activeDebts, setActiveDebts] = useState<
    Array<{
      reportId: string;
      record: any;
    }>
  >([]);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const reports = await dailyReportService.getActiveDebts();
      const debts: Array<{
        reportId: string;
        record: any;
      }> = [];

      reports.forEach((report) => {
        report.records.forEach((record) => {
          if (record.paymentMethod.type === "debt") {
            debts.push({
              reportId: report.id,
              record,
            });
          }
        });
      });

      // Сортировка по дате (по убыванию)
      debts.sort((a, b) => new Date(b.reportId).getTime() - new Date(a.reportId).getTime());

      setActiveDebts(debts);
    } catch (error) {
      toast.error("Ошибка при загрузке долгов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const handleDeleteDebt = async (reportId: string, recordId: string) => {
    if (!confirm("Вы уверены, что хотите ПОЛНОСТЬЮ удалить эту запись о долге? Это действие нельзя отменить.")) {
      return;
    }

    setDeleteLoadingId(recordId);
    try {
      // 1. Удаляем из таблицы car_wash_records
      const successDB = await carWashService.delete(recordId);

      if (successDB) {
        // 2. Получаем оригинальный отчет, чтобы пересчитать суммы
        const report = await dailyReportService.getByDate(reportId);
        if (report) {
          const updatedRecords = report.records.filter((rec) => rec.id !== recordId);

          // Пересчитываем итоги
          const totalCash = updatedRecords.reduce(
            (sum, rec) => sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
            0,
          );

          const totalNonCash = updatedRecords.reduce(
            (sum, rec) =>
              sum +
              (rec.paymentMethod.type === "card" ||
              rec.paymentMethod.type === "organization"
                ? rec.price
                : 0),
            0,
          );

          const updatedReport = {
            ...report,
            records: updatedRecords,
            totalCash,
            totalNonCash,
          };

          // Обновляем отчет в базе
          await dailyReportService.updateReport(updatedReport);
        }

        toast.success("Долг успешно удален");
        // Обновляем список долгов
        loadDebts();
      } else {
        throw new Error("Не удалось удалить запись");
      }
    } catch (error) {
      console.error("Error deleting debt:", error);
      toast.error("Произошла ошибка при удалении долга");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="p-5 sm:p-6 border border-border/50 rounded-2xl bg-card shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold">Управление долгами</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Здесь отображаются все не закрытые долги. Вы можете безвозвратно удалить ошибочные записи.
          </p>
        </div>
        <button
          onClick={loadDebts}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1.5 transition-all shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Обновить
        </button>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/50 overflow-hidden">
        {loading && activeDebts.length === 0 ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeDebts.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {activeDebts.map(({ reportId, record }) => (
              <li
                key={record.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-red-500 text-sm border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded">
                      {format(parseISO(reportId), "dd.MM.yyyy")}
                    </span>
                    <span className="font-semibold text-foreground text-base truncate">
                      {record.carInfo}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate mb-1.5">
                    {record.service} •{" "}
                    <span className="font-bold text-foreground">
                      {record.price.toFixed(0)} BYN
                    </span>
                  </div>
                  {record.paymentMethod.comment && (
                    <div className="text-xs text-red-500 font-medium italic truncate">
                      "{record.paymentMethod.comment}"
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteDebt(reportId, record.id)}
                  disabled={deleteLoadingId === record.id}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors text-xs font-semibold shrink-0"
                >
                  {deleteLoadingId === record.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm flex flex-col items-center">
            <Check className="w-10 h-10 text-green-500/50 mb-2" />
            <p>Нет активных долгов</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Настройки синхронизации в реальном времени
const RealtimeSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [phase, setPhase] = useState<"idle" | "checking" | "success">("idle");

  const toggleRealtime = async () => {
    // Если мы уже в процессе проверки, игнорируем клики
    if (phase !== "idle") return;

    const newValue = !state.isRealtimeEnabled;

    if (newValue) {
      // Пользователь ВКЛЮЧАЕТ синхронизацию - запускаем анимацию проверки
      setPhase("checking");

      try {
        const success = await settingsService.saveRealtimeEnabled(true);
        if (success) {
          dispatch({ type: "SET_REALTIME_ENABLED", payload: true });

          // Крутим лоадер 1.5 секунды
          setTimeout(() => {
            setPhase("success");

            // Показываем галочку успеха 1.5 секунды
            setTimeout(() => {
              setPhase("idle");
              toast.success("Синхронизация успешно включена");
            }, 1500);

          }, 1500);

        } else {
          throw new Error("Не удалось сохранить");
        }
      } catch (error) {
        setPhase("idle");
        toast.error("Ошибка при сохранении настроек");
      }
    } else {
      // Пользователь ВЫКЛЮЧАЕТ синхронизацию - без анимации (просто выключили)
      try {
        const success = await settingsService.saveRealtimeEnabled(false);
        if (success) {
          dispatch({ type: "SET_REALTIME_ENABLED", payload: false });
          toast.success("Синхронизация отключена");
        } else {
          throw new Error("Не удалось сохранить");
        }
      } catch (error) {
        toast.error("Ошибка при сохранении настроек");
      }
    }
  };

  return (
    <button
      onClick={toggleRealtime}
      disabled={phase !== "idle"}
      className={`w-full p-5 sm:p-6 rounded-2xl flex items-center justify-between transition-colors border text-left mt-4 ${
        state.isRealtimeEnabled && phase === "idle"
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/60 bg-background hover:border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex-1 pr-4">
        <h3 className={`text-base font-semibold mb-1 ${
          state.isRealtimeEnabled && phase === "idle" ? "text-primary" : "text-foreground"
        }`}>
          Глобальная синхронизация данных
        </h3>
        <p className="text-sm text-muted-foreground">
          Устройства моментально получают новые долги и записи без перезагрузки.
        </p>
      </div>

      <div
        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${
          phase === "checking"
            ? "border-transparent bg-transparent"
            : phase === "success"
              ? "bg-green-500 border-green-500 text-white shadow-sm"
              : state.isRealtimeEnabled
                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                : "border-input bg-background"
        }`}
      >
        {phase === "checking" && <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />}
        {phase === "success" && <Check className="w-4 h-4 sm:w-5 sm:h-5 animate-in zoom-in duration-200" />}
        {phase === "idle" && state.isRealtimeEnabled && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-in zoom-in duration-200" />}
      </div>
    </button>
  );
};

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { dispatch } = useAppContext();

  useEffect(() => {
    if (isAuthenticated) {
      employeeService.getAll().then((employees) => {
        dispatch({ type: "SET_EMPLOYEES", payload: employees });
      });
      organizationService.getAll().then((orgs) => {
        dispatch({ type: "SET_ORGANIZATIONS", payload: orgs });
      });
    }
  }, [isAuthenticated, dispatch]);

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <PasswordAuth onSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Настройки системы
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Управление параметрами, сотрудниками и организациями
        </p>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-2 md:grid-cols-3 lg:flex bg-muted/60 p-1.5 rounded-2xl border border-border/10">
          <TabsTrigger value="general" className="rounded-xl text-sm px-7 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap">
            Общие
          </TabsTrigger>
          <TabsTrigger value="employees" className="rounded-xl text-sm px-7 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap">
            Сотрудники
          </TabsTrigger>
          <TabsTrigger value="organizations" className="rounded-xl text-sm px-7 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap">
            Организации
          </TabsTrigger>
          <TabsTrigger value="debts" className="rounded-xl text-sm px-7 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap">
            Долги
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-xl text-sm px-7 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-muted-foreground hover:text-foreground whitespace-nowrap">
            Транзакции
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 focus-visible:outline-none animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ThemeSettings />
            <DatabaseStatus />
          </div>
          <RealtimeSettings />
          <DataManagement />
        </TabsContent>

        <TabsContent value="employees" className="space-y-4 focus-visible:outline-none animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EmployeeSettings />
            <SalaryCalculationSettings />
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4 focus-visible:outline-none animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OrganizationsSettings />
            <OrganizationsInTotalSettings />
          </div>
        </TabsContent>

        <TabsContent value="debts" className="space-y-4 focus-visible:outline-none animate-in fade-in duration-300">
          <div className="grid grid-cols-1 gap-4">
            <DebtsManagement />
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 focus-visible:outline-none animate-in fade-in duration-300">
          <div className="grid grid-cols-1 gap-4">
            <TransactionHistory />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
