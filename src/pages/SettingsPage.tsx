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
import { AnimatePresence, motion } from "framer-motion";
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
  Sun,
  Trash,
  X,
  Settings,
  Users,
  Banknote,
  Database
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Базовый компонент карточки для Meta-стиля
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.div
    className={`bg-card rounded-2xl border border-border/50 shadow-sm p-4 sm:p-5 ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

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
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-card w-full max-w-md p-6 sm:p-8 rounded-2xl border border-border/50 shadow-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Доступ к настройкам
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Введите пароль для доступа к панели управления
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full px-4 py-3 bg-muted/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-destructive pl-1">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Проверка...
              </>
            ) : (
              "Войти"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// Компонент анимированного облака
const AnimatedCloud: React.FC = () => {
  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: [0.9, 1.02, 1],
        opacity: 1,
      }}
      transition={{
        duration: 1,
        times: [0, 0.7, 1],
      }}
    >
      <Cloud className="w-5 h-5 text-primary" />
      <motion.div
        className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full"
        animate={{
          opacity: [0, 1, 0],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 2,
        }}
      />
    </motion.div>
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
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Sun className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Внешний вид</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Выберите тему оформления приложения
      </p>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(["light", "dark", "black"] as ThemeMode[]).map((theme) => {
          const isActive = state.theme === theme;
          return (
            <button
              key={theme}
              onClick={() => setTheme(theme)}
              className={`flex flex-col items-center justify-center py-3 sm:py-4 rounded-xl border transition-all ${
                isActive
                  ? "border-primary bg-primary/5 text-primary shadow-sm"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:border-border"
              }`}
            >
              {theme === "light" && <Sun className="w-5 h-5 mb-2" />}
              {theme === "dark" && <Moon className="w-5 h-5 mb-2" />}
              {theme === "black" && (
                <div className="w-5 h-5 rounded-full bg-foreground mb-2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-background" />
                </div>
              )}
              <span className="text-xs sm:text-sm font-medium">
                {theme === "light" ? "Светлая" : theme === "dark" ? "Темная" : "Черная"}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  );
};

// Компонент для управления организациями-партнерами
const OrganizationsSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
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
      console.error("Ошибка при загрузке списка организаций:", error);
      toast.error("Не удалось загрузить список организаций");
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
        toast.success(`Организация "${addedOrg.name}" добавлена`);
        setNewOrganizationName("");
      } else {
        throw new Error("Не удалось добавить организацию");
      }
    } catch (error) {
      console.error("Ошибка при добавлении организации:", error);
      toast.error("Произошла ошибка при добавлении организации");
    } finally {
      setLoading((prev) => ({ ...prev, addOrg: false }));
    }
  };

  const startEditing = (org: Organization) => {
    setEditingOrganization({ ...org });
  };

  const cancelEditing = () => {
    setEditingOrganization(null);
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrganization) return;

    if (!editingOrganization.name.trim()) {
      toast.error("Введите название организации");
      return;
    }

    setLoading((prev) => ({ ...prev, updateOrg: editingOrganization.id }));
    try {
      const success = await organizationService.update(editingOrganization);
      if (success) {
        dispatch({ type: "UPDATE_ORGANIZATION", payload: editingOrganization });
        toast.success(`Организация "${editingOrganization.name}" обновлена`);
        setEditingOrganization(null);
      } else {
        throw new Error("Не удалось обновить организацию");
      }
    } catch (error) {
      console.error("Ошибка при обновлении организации:", error);
      toast.error("Произошла ошибка при обновлении организации");
    } finally {
      setLoading((prev) => ({ ...prev, updateOrg: null }));
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить организацию "${orgName}"?`)) {
      return;
    }

    setLoading((prev) => ({ ...prev, deleteOrg: orgId }));
    try {
      const success = await organizationService.delete(orgId);
      if (success) {
        dispatch({ type: "REMOVE_ORGANIZATION", payload: orgId });
        toast.success(`Организация "${orgName}" удалена`);
        if (editingOrganization?.id === orgId) {
          setEditingOrganization(null);
        }
      } else {
        throw new Error("Не удалось удалить организацию");
      }
    } catch (error) {
      console.error("Ошибка при удалении организации:", error);
      toast.error("Произошла ошибка при удалении организации");
    } finally {
      setLoading((prev) => ({ ...prev, deleteOrg: null }));
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          Список организаций
        </h3>

        {loading.fetchOrgs ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <button
            onClick={fetchOrganizations}
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Обновить
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Организации-партнеры, которые используются для оплаты услуг по безналу
      </p>

      {/* Форма добавления новой организации */}
      <form onSubmit={handleAddOrganization} className="mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={newOrganizationName}
              onChange={(e) => setNewOrganizationName(e.target.value)}
              placeholder="Новая организация..."
              className="w-full px-3 py-2 border border-border/60 bg-muted/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-sm"
              disabled={loading.addOrg}
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center h-9 w-9 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70 flex-shrink-0"
            disabled={loading.addOrg}
          >
            {loading.addOrg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Список организаций */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/10">
        <ul className="divide-y divide-border/60 max-h-[250px] overflow-y-auto custom-scrollbar">
          {state.organizations.length > 0 ? (
            state.organizations.map((org) => (
              <li
                key={org.id}
                className="px-3 py-2.5 flex items-center justify-between text-sm group hover:bg-muted/30 transition-colors"
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
                      className="flex-1 px-3 py-1 border border-border/60 rounded-md focus:outline-none focus:border-primary/50 text-sm bg-background"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        disabled={loading.updateOrg === org.id}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="submit"
                        className="p-1 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-md transition-colors"
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
                        onClick={() => startEditing(org)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                        disabled={!!editingOrganization}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteOrganization(org.id, org.name)
                        }
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        disabled={
                          loading.deleteOrg === org.id || !!editingOrganization
                        }
                      >
                        {loading.deleteOrg === org.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-6 text-center text-muted-foreground text-sm">
              {loading.fetchOrgs
                ? "Загрузка организаций..."
                : "Нет добавленных организаций"}
            </li>
          )}
        </ul>
      </div>
    </Card>
  );
};

const SettingsContent: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [newEmployee, setNewEmployee] = useState("");
  const [loading, setLoading] = useState({
    employee: false,
    clearDatabase: false,
    connection: false,
    fetchEmployees: false,
    deleteEmployee: null as string | null,
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: "none" | "checking" | "success" | "error";
    time?: number;
  }>({
    status: "none",
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchEmployees();
    }
  }, [isAuthenticated]);

  const fetchEmployees = async () => {
    setLoading((prev) => ({ ...prev, fetchEmployees: true }));
    try {
      const employees = await employeeService.getAll();
      dispatch({ type: "SET_EMPLOYEES", payload: employees });
    } catch (error) {
      console.error("Ошибка при загрузке сотрудников:", error);
      toast.error("Не удалось загрузить список сотрудников");
    } finally {
      setLoading((prev) => ({ ...prev, fetchEmployees: false }));
    }
  };

  const checkFirebaseConnection = async () => {
    setConnectionStatus({ status: "checking" });
    setLoading((prev) => ({ ...prev, connection: true }));

    const startTime = performance.now();

    try {
      const connected = await databaseService.testConnection();

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (connected) {
        setTimeout(() => {
          setConnectionStatus({
            status: "success",
            time: responseTime,
          });
          setLoading((prev) => ({ ...prev, connection: false }));
        }, 500);
      } else {
        throw new Error("Не удалось подключиться к базе данных");
      }
    } catch (error: any) {
      console.error("Ошибка при проверке соединения с Supabase:", error);
      setConnectionStatus({ status: "error" });
      setLoading((prev) => ({ ...prev, connection: false }));
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
      const employee: Omit<Employee, "id"> = {
        name: newEmployee.trim(),
      };

      const addedEmployee = await employeeService.add(employee);
      if (addedEmployee) {
        dispatch({ type: "ADD_EMPLOYEE", payload: addedEmployee });
        toast.success(`Сотрудник ${addedEmployee.name} успешно добавлен!`);
        setNewEmployee("");
      } else {
        throw new Error("Не удалось добавить сотрудника");
      }
    } catch (error: any) {
      console.error("Ошибка при добавлении сотрудника:", error);
      toast.error("Не удалось добавить сотрудника");
    } finally {
      setLoading((prev) => ({ ...prev, employee: false }));
    }
  };

  const handleDeleteEmployee = async (
    employeeId: string,
    employeeName: string,
  ) => {
    if (
      !confirm(`Вы уверены, что хотите удалить сотрудника "${employeeName}"?`)
    ) {
      return;
    }

    setLoading((prev) => ({ ...prev, deleteEmployee: employeeId }));
    try {
      const success = await employeeService.delete(employeeId);
      if (success) {
        dispatch({ type: "REMOVE_EMPLOYEE", payload: employeeId });
        toast.success(`Сотрудник ${employeeName} удален`);
      } else {
        throw new Error("Не удалось удалить сотрудника");
      }
    } catch (error) {
      console.error("Ошибка при удалении сотрудника:", error);
      toast.error("Произошла ошибка при удалении сотрудника");
    } finally {
      setLoading((prev) => ({ ...prev, deleteEmployee: null }));
    }
  };

  const handleClearDatabase = async () => {
    setLoading((prev) => ({ ...prev, clearDatabase: true }));
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

        toast.success("Все данные из Supabase успешно удалены");
        setShowConfirmation(false);
      } else {
        throw new Error("Не удалось удалить данные из Supabase");
      }
    } catch (error) {
      console.error("Ошибка при очистке базы данных Supabase:", error);
      toast.error("Произошла ошибка при очистке базы данных");
    } finally {
      setLoading((prev) => ({ ...prev, clearDatabase: false }));
    }
  };

  if (!isAuthenticated) {
    return <PasswordAuth onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="space-y-6">
      <div className="px-1 sm:px-0 mb-4">
        <h2 className="text-2xl font-bold text-foreground">
          Настройки системы
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Управление параметрами приложения, сотрудниками и базами данных
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg py-2 data-[state=active]:shadow-sm">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Общие</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="rounded-lg py-2 data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Сотрудники и ЗП</span>
          </TabsTrigger>
          <TabsTrigger value="organizations" className="rounded-lg py-2 data-[state=active]:shadow-sm">
            <Building className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Организации</span>
          </TabsTrigger>
        </TabsList>

        {/* Вкладка 1: Общие настройки */}
        <TabsContent value="general" className="space-y-4 outline-none focus:ring-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ThemeSettings />

            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold">Состояние базы</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Проверка подключения к серверу Supabase
              </p>

              <div className="flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border/60">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${
                      connectionStatus.status === "none"
                        ? "bg-muted text-muted-foreground"
                        : connectionStatus.status === "checking"
                          ? "bg-primary/20 text-primary"
                          : connectionStatus.status === "success"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {connectionStatus.status === "checking" ? (
                      <AnimatedCloud />
                    ) : connectionStatus.status === "success" ? (
                      <Check className="w-5 h-5" />
                    ) : connectionStatus.status === "error" ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Cloud className="w-5 h-5 opacity-50" />
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
                  disabled={loading.connection}
                  className="px-3 py-1.5 bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-1.5"
                >
                  {loading.connection ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Проверить
                </button>
              </div>
            </Card>
          </div>

          <Card className="border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="text-base font-semibold text-destructive">
                Управление данными
              </h3>
            </div>
            <p className="text-sm text-destructive/80 mb-4">
              Удаление всех данных из базы данных Supabase.
              <span className="font-bold"> Это действие необратимо!</span>
            </p>

            <AnimatePresence mode="wait">
              {showConfirmation ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-background border border-destructive/50 rounded-xl p-4 overflow-hidden"
                >
                  <h4 className="font-semibold text-destructive mb-2 text-sm">
                    Вы уверены?
                  </h4>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Все сотрудники, организации, записи и настройки будут безвозвратно удалены.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className="px-4 py-2 rounded-xl border border-border hover:bg-muted/50 transition-colors text-sm font-medium flex-1"
                      disabled={loading.clearDatabase}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleClearDatabase}
                      className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-70 text-sm font-medium flex items-center justify-center gap-2 flex-1"
                      disabled={loading.clearDatabase}
                    >
                      {loading.clearDatabase ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Удаление...
                        </>
                      ) : (
                        <>
                          <Trash className="w-4 h-4" />
                          Да, удалить всё
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setShowConfirmation(true)}
                  className="w-full px-4 py-2.5 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  <span>Удалить все данные из базы</span>
                </button>
              )}
            </AnimatePresence>
          </Card>
        </TabsContent>

        {/* Вкладка 2: Сотрудники и ЗП */}
        <TabsContent value="employees" className="space-y-4 outline-none focus:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Сотрудники
                </h3>

                {loading.fetchEmployees ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <button
                    onClick={fetchEmployees}
                    className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Обновить
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Управление списком персонала
              </p>

              <form onSubmit={handleAddEmployee} className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newEmployee}
                      onChange={(e) => setNewEmployee(e.target.value)}
                      placeholder="Имя сотрудника..."
                      className="w-full px-3 py-2 border border-border/60 bg-muted/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-sm"
                      disabled={loading.employee}
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center h-9 w-9 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70 flex-shrink-0"
                    disabled={loading.employee}
                  >
                    {loading.employee ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>

              <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/10">
                <ul className="divide-y divide-border/60 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {state.employees.length > 0 ? (
                    state.employees.map((employee) => (
                      <li
                        key={employee.id}
                        className="px-3 py-2.5 flex items-center justify-between text-sm group hover:bg-muted/30 transition-colors"
                      >
                        <span className="font-medium">{employee.name}</span>
                        <button
                          onClick={() =>
                            handleDeleteEmployee(employee.id, employee.name)
                          }
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                          disabled={loading.deleteEmployee === employee.id}
                        >
                          {loading.deleteEmployee === employee.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-6 text-center text-muted-foreground text-sm">
                      {loading.fetchEmployees
                        ? "Загрузка сотрудников..."
                        : "Нет сотрудников"}
                    </li>
                  )}
                </ul>
              </div>
            </Card>

            <SalaryCalculationSettings />
          </div>
        </TabsContent>

        {/* Вкладка 3: Организации */}
        <TabsContent value="organizations" className="space-y-4 outline-none focus:ring-0">
          <OrganizationsSettings />
          <OrganizationsInTotalSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
};

// Компонент настроек расчета зарплаты
const SalaryCalculationSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [minimumSettings, setMinimumSettings] =
    useState<MinimumPaymentSettings>(state.minimumPaymentSettings);

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
        console.error("Ошибка при загрузке метода расчета зарплаты:", error);
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
          payload: {
            method,
            date: today,
          },
        });
        toast.success("Метод расчета зарплаты изменен");
      } else {
        throw new Error("Не удалось сохранить метод");
      }
    } catch (error) {
      console.error(error);
      setSavingError("Не удалось сохранить настройки. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMinimumSettings = async () => {
    setLoading(true);
    try {
      const success =
        await settingsService.saveMinimumPaymentSettings(minimumSettings);

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
      console.error(error);
      toast.error("Ошибка при сохранении настроек");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Banknote className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">Расчет зарплаты</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Параметры расчета, применяемые начиная с сегодняшнего дня
      </p>

      {savingError && (
        <div className="mb-3 p-2 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
          {savingError}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => handleSalaryMethodChange("minimumWithPercentage")}
          className={`w-full p-3 border rounded-xl flex items-start text-left transition-colors ${
            state.salaryCalculationMethod === "minimumWithPercentage"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border/60 hover:border-border hover:bg-muted/30"
          }`}
          disabled={loading}
        >
          <div
            className={`w-4 h-4 rounded-full border mt-0.5 mr-3 flex-shrink-0 flex items-center justify-center transition-colors ${
              state.salaryCalculationMethod === "minimumWithPercentage"
                ? "border-primary"
                : "border-muted-foreground"
            }`}
          >
            {state.salaryCalculationMethod === "minimumWithPercentage" && (
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">Минимальная оплата + процент</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Мойщик: % от выручки или мин. оплата. <br />
              Админ: % от кассы + % от лично выполненных услуг или мин. оплата.
            </p>
          </div>
        </button>

        <AnimatePresence>
          {state.salaryCalculationMethod === "minimumWithPercentage" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 pb-1 space-y-4">
                {/* Настройки мойщика */}
                <div className="bg-muted/20 p-3 rounded-xl border border-border/50">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">
                    Мойщик
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        Мин. оплата (₽)
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
                        className="w-full px-3 py-2 text-sm border border-border/60 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        % мойка
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
                        className="w-full px-3 py-2 text-sm border border-border/60 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        min="0" max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        % химчистка
                      </label>
                      <input
                        type="number"
                        value={minimumSettings.percentageWasherDryclean}
                        onChange={(e) =>
                          setMinimumSettings({
                            ...minimumSettings,
                            percentageWasherDryclean: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-border/60 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        min="0" max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Настройки админа */}
                <div className="bg-muted/20 p-3 rounded-xl border border-border/50">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">
                    Администратор
                  </h4>
                  <div className="mb-3">
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      Мин. оплата (₽)
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
                      className="w-full sm:w-1/2 px-3 py-2 text-sm border border-border/60 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                      min="0"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        % касса
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
                        className="w-full px-3 py-2 text-sm border border-border/60 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        min="0" max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        % мойка
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
                        className="w-full px-3 py-2 text-sm border border-border/60 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        min="0" max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        % химч.
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
                        className="w-full px-3 py-2 text-sm border border-border/60 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        min="0" max="100"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveMinimumSettings}
                  disabled={loading}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Сохранить проценты"
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50 flex justify-between">
        <span>
          Текущий: <span className="font-medium text-foreground">{state.salaryCalculationMethod === "none" ? "Не выбран" : "Мин. оплата + %"}</span>
        </span>
        <span>
          Изменен: {(() => {
            try {
              return format(parseISO(state.salaryCalculationDate), "dd.MM.yyyy");
            } catch (error) {
              return "Неизвестно";
            }
          })()}
        </span>
      </div>
    </Card>
  );
};

// Новый компонент для настройки "Организации в Итого"
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
        throw new Error("Ошибка сохранения");
      }
    } catch (error) {
      console.error(error);
      toast.error("Не удалось сохранить настройки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Building className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">Исключения для Итого</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Организации, суммы которых будут вычитаться из общего безнала и отображаться отдельно.
      </p>

      {state.organizations.length === 0 ? (
        <div className="text-sm text-muted-foreground p-6 border border-border/60 rounded-xl bg-muted/10 text-center">
          Сначала добавьте организации в списке выше
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {state.organizations.map((org) => {
            const isSelected = (state.organizationsInTotal || []).includes(org.id);
            return (
              <button
                key={org.id}
                onClick={() => toggleOrganization(org.id)}
                disabled={loading}
                className={`group flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/30 hover:bg-muted/20"
                }`}
              >
                <span
                  className={`text-sm font-medium truncate pr-2 transition-colors ${
                    isSelected ? "text-primary" : "text-foreground group-hover:text-primary/80"
                  }`}
                >
                  {org.name}
                </span>

                <div
                  className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input bg-background"
                  }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default function SettingsPage() {
  return (
    <div className="p-3 sm:p-5 max-w-5xl mx-auto">
      <SettingsContent />
    </div>
  );
}
