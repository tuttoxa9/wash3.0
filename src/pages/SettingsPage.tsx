import type React from 'react';
import { useState, useEffect } from 'react';
import { Plus, Save, Loader2, AlertTriangle, Trash, Lock, Check, Cloud, RefreshCw, X, Sun, Moon, Edit, Building } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { useAppContext } from '@/lib/context/AppContext';
import { employeeService, serviceService, organizationService, settingsService, databaseService } from '@/lib/services/supabaseService';
import type { Employee, ThemeMode, Organization, SalaryCalculationMethod, MinimumPaymentSettings } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

// Компонент для ввода пароля
const PasswordAuth: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (password === 'adminlab') {
        setError('');
        onSuccess();
      } else {
        setError('Неверный пароль. Попробуйте еще раз.');
      }
      setIsLoading(false);
    }, 500); // Небольшая задержка для симуляции проверки
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-with-shadow max-w-md mx-auto mt-8"
    >
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold gradient-heading">Доступ к настройкам</h2>
        <p className="text-muted-foreground mt-1 text-sm">Введите пароль для доступа к панели настроек</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-primary text-white py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Проверка...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Войти
            </>
          )}
        </button>
      </form>
    </motion.div>
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
      <Cloud className="w-6 h-6 text-primary" />
      <motion.div
        className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"
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
    dispatch({ type: 'SET_THEME', payload: theme });
    toast.success(`Тема изменена на ${theme === 'light' ? 'светлую' : theme === 'dark' ? 'темную' : 'черную'}`);
  };

  return (
    <motion.div
      className="p-3 border border-border rounded-lg bg-card"
      whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      transition={{ duration: 0.2 }}
    >
      <h3 className="text-sm font-medium mb-2">Внешний вид</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Выберите тему оформления приложения
      </p>

      <div className="flex p-1 bg-muted rounded-xl gap-1 mb-1">
        <button
          onClick={() => setTheme('light')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition-all duration-200 ${
            state.theme === 'light'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span className="text-[10px] sm:text-xs font-medium">Светлая</span>
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition-all duration-200 ${
            state.theme === 'dark'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Moon className="w-4 h-4" />
          <span className="text-[10px] sm:text-xs font-medium">Темная</span>
        </button>

        <button
          onClick={() => setTheme('black')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition-all duration-200 ${
            state.theme === 'black'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className={`w-4 h-4 rounded-full flex items-center justify-center bg-black text-white border border-border ${
            state.theme === 'black' ? 'border-primary' : ''
          }`}>
            <span className="text-[10px] font-bold">B</span>
          </div>
          <span className="text-[10px] sm:text-xs font-medium">Черная</span>
        </button>
      </div>
    </motion.div>
  );
};

// Компонент для управления организациями-партнерами
const OrganizationsSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState({
    addOrg: false,
    deleteOrg: null as string | null,
    updateOrg: null as string | null,
    fetchOrgs: false
  });

  // Обновление списка организаций
  const fetchOrganizations = async () => {
    setLoading(prev => ({ ...prev, fetchOrgs: true }));
    try {
      const orgs = await organizationService.getAll();
      dispatch({ type: 'SET_ORGANIZATIONS', payload: orgs });
    } catch (error) {
      console.error('Ошибка при загрузке списка организаций:', error);
      toast.error('Не удалось загрузить список организаций');
    } finally {
      setLoading(prev => ({ ...prev, fetchOrgs: false }));
    }
  };

  // Добавление новой организации
  const handleAddOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrganizationName.trim()) {
      toast.error('Введите название организации');
      return;
    }

    setLoading(prev => ({ ...prev, addOrg: true }));
    try {
      const organization: Omit<Organization, 'id'> = {
        name: newOrganizationName.trim()
      };

      const addedOrg = await organizationService.add(organization);
      if (addedOrg) {
        dispatch({ type: 'ADD_ORGANIZATION', payload: addedOrg });
        toast.success(`Организация "${addedOrg.name}" добавлена`);
        setNewOrganizationName('');
      } else {
        throw new Error('Не удалось добавить организацию');
      }
    } catch (error) {
      console.error('Ошибка при добавлении организации:', error);
      toast.error('Произошла ошибка при добавлении организации');
    } finally {
      setLoading(prev => ({ ...prev, addOrg: false }));
    }
  };

  // Начало редактирования организации
  const startEditing = (org: Organization) => {
    setEditingOrganization({ ...org });
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingOrganization(null);
  };

  // Обновление организации
  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrganization) return;

    if (!editingOrganization.name.trim()) {
      toast.error('Введите название организации');
      return;
    }

    setLoading(prev => ({ ...prev, updateOrg: editingOrganization.id }));
    try {
      const success = await organizationService.update(editingOrganization);
      if (success) {
        dispatch({ type: 'UPDATE_ORGANIZATION', payload: editingOrganization });
        toast.success(`Организация "${editingOrganization.name}" обновлена`);
        setEditingOrganization(null);
      } else {
        throw new Error('Не удалось обновить организацию');
      }
    } catch (error) {
      console.error('Ошибка при обновлении организации:', error);
      toast.error('Произошла ошибка при обновлении организации');
    } finally {
      setLoading(prev => ({ ...prev, updateOrg: null }));
    }
  };

  // Удаление организации
  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить организацию "${orgName}"?`)) {
      return;
    }

    setLoading(prev => ({ ...prev, deleteOrg: orgId }));
    try {
      const success = await organizationService.delete(orgId);
      if (success) {
        dispatch({ type: 'REMOVE_ORGANIZATION', payload: orgId });
        toast.success(`Организация "${orgName}" удалена`);
        if (editingOrganization?.id === orgId) {
          setEditingOrganization(null);
        }
      } else {
        throw new Error('Не удалось удалить организацию');
      }
    } catch (error) {
      console.error('Ошибка при удалении организации:', error);
      toast.error('Произошла ошибка при удалении организации');
    } finally {
      setLoading(prev => ({ ...prev, deleteOrg: null }));
    }
  };

  return (
    <motion.div
      className="p-3 border border-border rounded-lg bg-card"
      whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium flex items-center">
          <Building className="w-4 h-4 mr-1.5 text-primary" />
          Организации-партнеры
        </h3>

        {loading.fetchOrgs ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
            <span className="text-xs text-muted-foreground">Загрузка организаций...</span>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchOrganizations}
            className="text-xs text-primary flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Обновить
          </motion.button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Управление списком организаций, которые используются для оплаты услуг
      </p>

      {/* Форма добавления новой организации */}
      <form onSubmit={handleAddOrganization} className="mb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={newOrganizationName}
              onChange={e => setNewOrganizationName(e.target.value)}
              placeholder="Название организации"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-sm"
              disabled={loading.addOrg}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="flex items-center gap-1 px-2 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-70 text-xs"
            disabled={loading.addOrg}
          >
            {loading.addOrg ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            <span>Добавить</span>
          </motion.button>
        </div>
      </form>

      {/* Список организаций */}
      <div className="border border-border rounded-md overflow-hidden bg-card/50">
        <div className="bg-muted/30 px-2 py-1.5 border-b border-border">
          <h4 className="text-xs font-medium">Список организаций</h4>
        </div>

        <ul className="divide-y divide-border max-h-[220px] overflow-y-auto">
          {state.organizations.length > 0 ? (
            state.organizations.map(org => (
              <motion.li
                key={org.id}
                className="px-2 py-2 flex items-center justify-between text-sm group"
                whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
              >
                {editingOrganization?.id === org.id ? (
                  <form
                    onSubmit={handleUpdateOrganization}
                    className="flex items-center gap-2 w-full"
                  >
                    <input
                      type="text"
                      value={editingOrganization.name}
                      onChange={e => setEditingOrganization({
                        ...editingOrganization,
                        name: e.target.value
                      })}
                      className="flex-1 px-3 py-1.5 border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <motion.button
                        type="button"
                        onClick={cancelEditing}
                        className="text-muted-foreground hover:text-foreground"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={loading.updateOrg === org.id}
                      >
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        type="submit"
                        className="text-primary hover:text-primary/80"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={loading.updateOrg === org.id}
                      >
                        {loading.updateOrg === org.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span>{org.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        onClick={() => startEditing(org)}
                        className="text-primary"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={!!editingOrganization}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeleteOrganization(org.id, org.name)}
                        className="text-destructive"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={loading.deleteOrg === org.id || !!editingOrganization}
                      >
                        {loading.deleteOrg === org.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.li>
            ))
          ) : (
            <li className="px-2 py-2 text-center text-muted-foreground text-xs">
              {loading.fetchOrgs ? 'Загрузка организаций...' : 'Нет добавленных организаций'}
            </li>
          )}
        </ul>
      </div>
    </motion.div>
  );
};



const SettingsContent: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [newEmployee, setNewEmployee] = useState('');
  const [loading, setLoading] = useState({
    employee: false,
    clearDatabase: false,
    connection: false,
    fetchEmployees: false,
    deleteEmployee: null as string | null
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{status: 'none' | 'checking' | 'success' | 'error', time?: number}>({
    status: 'none'
  });

  // Загрузка сотрудников при монтировании компонента
  useEffect(() => {
    if (isAuthenticated) {
      fetchEmployees();
    }
  }, [isAuthenticated]);

  // Функция для загрузки сотрудников из Supabase
  const fetchEmployees = async () => {
    setLoading(prev => ({ ...prev, fetchEmployees: true }));
    try {
      const employees = await employeeService.getAll();
      dispatch({ type: 'SET_EMPLOYEES', payload: employees });
    } catch (error) {
      console.error('Ошибка при загрузке сотрудников:', error);
      toast.error('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(prev => ({ ...prev, fetchEmployees: false }));
    }
  };

  // Функция для проверки соединения с Supabase
  const checkFirebaseConnection = async () => {
    setConnectionStatus({ status: 'checking' });
    setLoading(prev => ({ ...prev, connection: true }));

    const startTime = performance.now();

    try {
      toast.info('Проверка соединения с базой данных...');
      console.log('Начинаем проверку соединения с Supabase...');

      const connected = await databaseService.testConnection();

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (connected) {
        toast.success('Соединение с базой данных установлено успешно!');
        console.log(`Соединение (Supabase) успешно, время отклика: ${responseTime}ms`);

        setTimeout(() => {
          setConnectionStatus({
            status: 'success',
            time: responseTime
          });
          setLoading(prev => ({ ...prev, connection: false }));
        }, 500);
      } else {
        throw new Error('Не удалось подключиться к базе данных');
      }
    } catch (error: any) {
      console.error('Ошибка при проверке соединения с Supabase:', error);

      let errorMessage = 'Не удалось подключиться к базе данных.';
      toast.error(errorMessage);

      setConnectionStatus({ status: 'error' });
      setLoading(prev => ({ ...prev, connection: false }));
    }
  };

  // Добавление нового сотрудника
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.trim()) {
      toast.error('Введите имя сотрудника');
      return;
    }

    setLoading(prev => ({ ...prev, employee: true }));
    try {
      toast.info(`Добавление сотрудника "${newEmployee.trim()}"...`);
      console.log('Начинаем добавление нового сотрудника:', newEmployee.trim());

      const employee: Omit<Employee, 'id'> = {
        name: newEmployee.trim()
      };

      const addedEmployee = await employeeService.add(employee);
      if (addedEmployee) {
        dispatch({ type: 'ADD_EMPLOYEE', payload: addedEmployee });
        toast.success(`Сотрудник ${addedEmployee.name} успешно добавлен!`);
        setNewEmployee('');
      } else {
        throw new Error('Не удалось добавить сотрудника');
      }
    } catch (error: any) {
      console.error('Ошибка при добавлении сотрудника:', error);

      let errorMessage = 'Не удалось добавить сотрудника. ';
      errorMessage += `${error.message || 'Неизвестная ошибка.'}`;

      toast.error(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, employee: false }));
    }
  };

  // Удаление сотрудника
  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить сотрудника "${employeeName}"?`)) {
      return;
    }

    setLoading(prev => ({ ...prev, deleteEmployee: employeeId }));
    try {
      const success = await employeeService.delete(employeeId);
      if (success) {
        dispatch({ type: 'REMOVE_EMPLOYEE', payload: employeeId });
        toast.success(`Сотрудник ${employeeName} удален`);
      } else {
        throw new Error('Не удалось удалить сотрудника');
      }
    } catch (error) {
      console.error('Ошибка при удалении сотрудника:', error);
      toast.error('Произошла ошибка при удалении сотрудника');
    } finally {
      setLoading(prev => ({ ...prev, deleteEmployee: null }));
    }
  };

  // Очистка всей базы данных Supabase
  const handleClearDatabase = async () => {
    setLoading(prev => ({ ...prev, clearDatabase: true }));
    try {
      const success = await databaseService.clearAllData();

      if (success) {
        // Очищаем состояние приложения
        dispatch({ type: 'SET_EMPLOYEES', payload: [] });
        dispatch({ type: 'SET_ORGANIZATIONS', payload: [] });
        dispatch({ type: 'SET_SERVICES', payload: [] });
        dispatch({ type: 'SET_APPOINTMENTS', payload: [] });

        // Сбрасываем настройки к значениям по умолчанию
        dispatch({
          type: 'SET_SALARY_CALCULATION_METHOD',
          payload: {
            method: 'minimumWithPercentage',
            date: format(new Date(), 'yyyy-MM-dd')
          }
        });

        dispatch({
          type: 'SET_MINIMUM_PAYMENT_SETTINGS',
          payload: {
            minimumPaymentWasher: 0,
            percentageWasher: 10,
            percentageWasherDryclean: 15,
            minimumPaymentAdmin: 0,
            adminCashPercentage: 3,
            adminCarWashPercentage: 2,
            adminDrycleanPercentage: 3
          }
        });

        toast.success('Все данные из Supabase успешно удалены');
        setShowConfirmation(false);
      } else {
        throw new Error('Не удалось удалить данные из Supabase');
      }
    } catch (error) {
      console.error('Ошибка при очистке базы данных Supabase:', error);
      toast.error('Произошла ошибка при очистке базы данных');
    } finally {
      setLoading(prev => ({ ...prev, clearDatabase: false }));
    }
  };

  if (!isAuthenticated) {
    return <PasswordAuth onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="space-y-5">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card-with-shadow max-w-4xl mx-auto"
        >
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-bold gradient-heading flex-1">Настройки системы</h2>
          </div>

          <p className="text-muted-foreground text-sm mb-5">
            Управление сотрудниками, организациями и параметрами системы
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-5">
              <ThemeSettings />
              <SalaryCalculationSettings />

              <motion.div
                className="p-3 border border-border rounded-lg bg-card"
                whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-sm font-medium mb-2">Состояние базы данных</h3>
                <div className="flex items-center">
                  <div className="flex items-center flex-1">
                    <div className={`w-8 h-8 mr-2 rounded-full flex items-center justify-center
                      ${connectionStatus.status === 'none' ? 'bg-muted' :
                        connectionStatus.status === 'checking' ? 'bg-primary/20' :
                        connectionStatus.status === 'success' ? 'bg-green-100' :
                        'bg-destructive/20'}`}
                    >
                      {connectionStatus.status === 'checking' ? (
                        <AnimatedCloud />
                      ) : connectionStatus.status === 'success' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : connectionStatus.status === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Cloud className="w-4 h-4 text-muted-foreground/70" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {connectionStatus.status === 'none' ? 'Не проверено' :
                          connectionStatus.status === 'checking' ? 'Проверка...' :
                          connectionStatus.status === 'success' ? 'Подключено' :
                          'Ошибка соединения'}
                      </p>
                      {connectionStatus.status === 'success' && connectionStatus.time && (
                        <p className="text-xs text-muted-foreground">Отклик: {connectionStatus.time} мс</p>
                      )}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={checkFirebaseConnection}
                    disabled={loading.connection}
                    className="px-2 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors disabled:opacity-70 text-xs flex items-center gap-1"
                  >
                    {loading.connection ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Проверить</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>

            <div className="space-y-5">
              <motion.div
                className="p-3 border border-border rounded-lg bg-card"
                whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Сотрудники</h3>

                  {loading.fetchEmployees ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                      <span className="text-xs text-muted-foreground">Загрузка сотрудников...</span>
                      <div className="flex gap-1 mt-2">
                        <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchEmployees}
                      className="text-xs text-primary flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Обновить
                    </motion.button>
                  )}
                </div>

                <form onSubmit={handleAddEmployee} className="mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newEmployee}
                        onChange={e => setNewEmployee(e.target.value)}
                        placeholder="Имя сотрудника"
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                        disabled={loading.employee}
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="flex items-center gap-1 px-2 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-70 text-xs"
                      disabled={loading.employee}
                    >
                      {loading.employee ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      <span>Добавить</span>
                    </motion.button>
                  </div>
                </form>

                <div className="border border-border rounded-md overflow-hidden bg-card/50">
                  <div className="bg-muted/30 px-2 py-1.5 border-b border-border">
                    <h4 className="text-xs font-medium">Список сотрудников</h4>
                  </div>
                  <ul className="divide-y divide-border max-h-[220px] overflow-y-auto">
                    {state.employees.length > 0 ? (
                      state.employees.map(employee => (
                        <motion.li
                          key={employee.id}
                          className="px-2 py-2 flex items-center justify-between text-sm group"
                          whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                        >
                          <span>{employee.name}</span>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                            className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={loading.deleteEmployee === employee.id}
                          >
                            {loading.deleteEmployee === employee.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                          </motion.button>
                        </motion.li>
                      ))
                    ) : (
                      <li className="px-2 py-2 text-center text-muted-foreground text-xs">
                        {loading.fetchEmployees ? 'Загрузка сотрудников...' : 'Нет добавленных сотрудников'}
                      </li>
                    )}
                  </ul>
                </div>
              </motion.div>

              <OrganizationsSettings />

              <motion.div
                className="p-3 border border-destructive/30 rounded-lg bg-destructive/5"
                whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-sm font-medium mb-2 text-destructive flex items-center gap-2">
                  <Trash className="w-4 h-4" />
                  Управление данными Supabase
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Удаление всех данных из базы данных Supabase.
                  <span className="font-bold text-destructive"> Это действие необратимо!</span>
                </p>

                <AnimatePresence>
                  {showConfirmation ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-destructive mb-1 text-sm">Подтверждение удаления</h4>
                          <p className="mb-3 text-xs">
                            Вы действительно хотите удалить <span className="font-bold">ВСЕ данные из Supabase</span>?
                            Будут удалены: сотрудники, организации, услуги, записи о мойках и все настройки.
                          </p>
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setShowConfirmation(false)}
                              className="px-2 py-1 rounded-md border border-input hover:bg-secondary/50 transition-colors text-xs"
                              disabled={loading.clearDatabase}
                            >
                              Отмена
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleClearDatabase}
                              className="flex items-center justify-center gap-1 px-2 py-1 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-70 text-xs"
                              disabled={loading.clearDatabase}
                            >
                              {loading.clearDatabase ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Удаление...
                                </>
                              ) : (
                                <>
                                  <Trash className="w-3 h-3" />
                                  Да, удалить всё из Supabase
                                </>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowConfirmation(true)}
                      className="w-full px-3 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-colors text-xs flex items-center justify-center gap-2"
                    >
                      <Trash className="w-4 h-4" />
                      <span>Удалить все данные из Supabase</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Компонент настроек расчета зарплаты
const SalaryCalculationSettings: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [minimumSettings, setMinimumSettings] = useState<MinimumPaymentSettings>(state.minimumPaymentSettings);

  useEffect(() => {
    const loadSalaryCalculationMethod = async () => {
      try {
        const result = await settingsService.getSalaryCalculationMethod();

        if (result) {
          dispatch({
            type: 'SET_SALARY_CALCULATION_METHOD',
            payload: {
              method: result.method as SalaryCalculationMethod,
              date: result.date
            }
          });
          console.log(`Загружен метод расчета зарплаты из базы данных: ${result.method}, дата: ${result.date}`);
        }
      } catch (error) {
        console.error('Ошибка при загрузке метода расчета зарплаты:', error);
      }
    };

    loadSalaryCalculationMethod();
  }, [dispatch]);

  const handleSalaryMethodChange = async (method: SalaryCalculationMethod) => {
    setLoading(true);
    setSavingError(null);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const success = await settingsService.saveSalaryCalculationMethod(method, today);

      if (success) {
        dispatch({
          type: 'SET_SALARY_CALCULATION_METHOD',
          payload: {
            method,
            date: today
          }
        });

        const methodDescription = 'Минимальная оплата + процент';

        toast.success(`Метод расчета зарплаты изменен на: ${methodDescription}`);
      } else {
        throw new Error('Не удалось сохранить метод расчета зарплаты в базе данных');
      }
    } catch (error) {
      console.error('Ошибка при изменении метода расчета зарплаты:', error);
      toast.error('Ошибка при изменении метода расчета зарплаты');
      setSavingError('Не удалось сохранить настройки. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMinimumSettings = async () => {
    setLoading(true);
    try {
      const success = await settingsService.saveMinimumPaymentSettings(minimumSettings);

      if (success) {
        dispatch({
          type: 'SET_MINIMUM_PAYMENT_SETTINGS',
          payload: minimumSettings
        });
        toast.success('Настройки минимальной оплаты сохранены');
      } else {
        throw new Error('Не удалось сохранить настройки в базе данных');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек минимальной оплаты:', error);
      toast.error('Ошибка при сохранении настроек минимальной оплаты');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="p-3 border border-border rounded-lg bg-card"
      whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      transition={{ duration: 0.2 }}
    >
      <h3 className="text-sm font-medium mb-2">Расчет заработной платы</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Выберите метод расчета заработной платы. Изменение будет применено ко всем дням начиная с сегодняшнего.
      </p>

      {savingError && (
        <div className="mb-3 p-2 bg-destructive/10 text-destructive text-xs rounded-md">
          {savingError}
        </div>
      )}

      <div className="flex flex-col gap-3 mb-2">
        <div
          onClick={() => !loading && handleSalaryMethodChange('minimumWithPercentage')}
          className={`p-4 border-2 rounded-xl flex items-start transition-all duration-300 cursor-pointer ${
            state.salaryCalculationMethod === 'minimumWithPercentage'
              ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
              : 'border-border hover:border-border/80 hover:bg-muted/50'
          }`}
        >
          <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mr-4 flex items-center justify-center transition-colors ${
            state.salaryCalculationMethod === 'minimumWithPercentage'
              ? 'border-primary bg-primary' : 'border-input bg-card'
          }`}>
            {state.salaryCalculationMethod === 'minimumWithPercentage' && (
              <Check className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm transition-colors ${
              state.salaryCalculationMethod === 'minimumWithPercentage' ? 'text-primary' : 'text-foreground'
            }`}>
              Минимальная оплата + процент
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Мойщик: % от выручки мойки и химчистки (раздельно) или минимальная оплата. Админ: % от кассы + % от лично выполненных услуг (мойка и химчистка раздельно) или минимальная оплата.
            </p>
          </div>
          {loading && (
            <Loader2 className="w-5 h-5 animate-spin ml-2 text-primary shrink-0" />
          )}
        </div>

        {state.salaryCalculationMethod === 'minimumWithPercentage' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-8 pr-3 py-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg"
          >
            <h4 className="text-sm font-medium mb-3">Настройки минимальной оплаты</h4>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Минимальная оплата мойщика за день
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.minimumPaymentWasher}
                    onChange={(e) => setMinimumSettings({
                      ...minimumSettings,
                      minimumPaymentWasher: Number.parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Процент мойщика - мойка (%)
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.percentageWasher}
                    onChange={(e) => setMinimumSettings({
                      ...minimumSettings,
                      percentageWasher: Number.parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="10"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Процент мойщика - химчистка (%)
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.percentageWasherDryclean}
                    onChange={(e) => setMinimumSettings({
                      ...minimumSettings,
                      percentageWasherDryclean: Number.parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="15"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Минимальная оплата админа за день
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.minimumPaymentAdmin}
                    onChange={(e) => setMinimumSettings({
                      ...minimumSettings,
                      minimumPaymentAdmin: Number.parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    % админа от кассы (%)
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.adminCashPercentage}
                    onChange={(e) => setMinimumSettings({
                      ...minimumSettings,
                      adminCashPercentage: Number.parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="3"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    % админа от мойки (%)
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.adminCarWashPercentage}
                    onChange={(e) => setMinimumSettings({
                      ...minimumSettings,
                      adminCarWashPercentage: Number.parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="2"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    % админа от химчистки (%)
                  </label>
                  <input
                    type="number"
                    value={minimumSettings.adminDrycleanPercentage}
                    onChange={(e) => setMinimumSettings({
                      ...minimumSettings,
                      adminDrycleanPercentage: Number.parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="3"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveMinimumSettings}
                disabled={loading}
                className="w-full px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-xs disabled:opacity-70 flex items-center justify-center gap-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить настройки'
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
        <p>
          <span className="font-medium">Текущий метод:</span> {
            state.salaryCalculationMethod === 'none'
              ? 'Не выбран'
              : 'Минимальная оплата + процент'
          }
        </p>
        <p className="mt-1">
          <span className="font-medium">Дата изменения:</span> {(() => {
            try {
              return format(parseISO(state.salaryCalculationDate), 'dd.MM.yyyy');
            } catch (error) {
              return 'Неверная дата';
            }
          })()}
        </p>
      </div>
    </motion.div>
  );
};

export default function SettingsPage() {
  return (
    <div className="p-3 sm:p-4 space-y-3">
      <SettingsContent />
    </div>
  );
};
