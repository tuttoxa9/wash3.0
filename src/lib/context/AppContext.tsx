import { createContext, useReducer, useContext, type ReactNode, useEffect, useCallback } from 'react';
import type { AppState, AppAction, DailyReport, ThemeMode, Organization, Appointment, SalaryCalculationMethod, MinimumPaymentSettings } from '../types';
import { format } from 'date-fns';
import { employeeService, organizationService, serviceService, appointmentService, settingsService, carWashService, dailyReportService } from '@/lib/services/supabaseService';

// Начальное состояние приложения
const initialState: AppState = {
  employees: [],
  organizations: [],
  services: [],
  dailyReports: {},
  appointments: [],
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  theme: 'light',
  salaryCalculationMethod: 'minimumWithPercentage', // Единственный доступный метод
  salaryCalculationDate: format(new Date(), 'yyyy-MM-dd'), // Текущая дата как дата изменения метода
  minimumPaymentSettings: {
    minimumPaymentWasher: 0,
    percentageWasher: 10,
    percentageWasherDryclean: 15,
    minimumPaymentAdmin: 0,
    adminCashPercentage: 3,
    adminCarWashPercentage: 2,
    adminDrycleanPercentage: 3
  }
};

// Создаем контекст
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  fetchDataForPeriod: (startDate: string, endDate: string) => Promise<void>;
}>({
  state: initialState,
  dispatch: () => null,
  fetchDataForPeriod: async () => {}
});

// Редьюсер для управления состоянием
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_EMPLOYEES':
      return { ...state, employees: action.payload };
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [...state.employees, action.payload] };
    case 'REMOVE_EMPLOYEE':
      return { ...state, employees: state.employees.filter(emp => emp.id !== action.payload) };
    case 'SET_ORGANIZATIONS':
      return { ...state, organizations: action.payload };
    case 'ADD_ORGANIZATION':
      return { ...state, organizations: [...state.organizations, action.payload] };
    case 'UPDATE_ORGANIZATION': {
      const updatedOrgs = state.organizations.map(org =>
        org.id === action.payload.id ? action.payload : org
      );
      return { ...state, organizations: updatedOrgs };
    }
    case 'REMOVE_ORGANIZATION':
      return { ...state, organizations: state.organizations.filter(org => org.id !== action.payload) };
    case 'SET_SERVICES':
      return { ...state, services: action.payload };
    case 'ADD_SERVICE':
      return { ...state, services: [...state.services, action.payload] };
    case 'SET_DAILY_REPORT':
      return {
        ...state,
        dailyReports: {
          ...state.dailyReports,
          [action.payload.date]: action.payload.report
        }
      };
    case 'ADD_CAR_WASH_RECORD': {
      const { date, record } = action.payload;
      const currentReport = state.dailyReports[date] || {
        id: date,
        date,
        employeeIds: [],
        records: [],
        totalCash: 0,
        totalNonCash: 0
      };

      // Добавляем запись и обновляем итоги
      const updatedRecords = [...currentReport.records, record];

      // Рассчитываем новые итоги с учетом изменений в PaymentMethod
      const totalCash = updatedRecords.reduce(
        (sum, rec) => sum + (rec.paymentMethod.type === 'cash' ? rec.price : 0),
        0
      );

      const totalNonCash = updatedRecords.reduce(
        (sum, rec) => sum + (rec.paymentMethod.type === 'card' ? rec.price : 0),
        0
      );

      // Объединяем ID сотрудников
      const allEmployeeIds = [...new Set([
        ...currentReport.employeeIds,
        ...record.employeeIds
      ])];

      const updatedReport: DailyReport = {
        ...currentReport,
        records: updatedRecords,
        employeeIds: allEmployeeIds,
        totalCash,
        totalNonCash
      };

      return {
        ...state,
        dailyReports: {
          ...state.dailyReports,
          [date]: updatedReport
        }
      };
    }
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload };
    case 'SET_THEME': {
      // Сохраняем тему в localStorage для сохранения между сессиями
      localStorage.setItem('appTheme', action.payload);
      return { ...state, theme: action.payload };
    }
    // Добавляем обработку действий для записей на мойку
    case 'SET_APPOINTMENTS':
      return { ...state, appointments: action.payload };
    case 'ADD_APPOINTMENT':
      return { ...state, appointments: [...state.appointments, action.payload] };
    case 'UPDATE_APPOINTMENT': {
      const updatedAppointments = state.appointments.map(appointment =>
        appointment.id === action.payload.id ? action.payload : appointment
      );
      return { ...state, appointments: updatedAppointments };
    }
    case 'REMOVE_APPOINTMENT':
      return { ...state, appointments: state.appointments.filter(appointment => appointment.id !== action.payload) };
    case 'SET_SALARY_CALCULATION_METHOD':
      // Сохраняем метод расчета зарплаты и дату изменения в localStorage
      localStorage.setItem('salaryCalculationMethod', action.payload.method);
      localStorage.setItem('salaryCalculationDate', action.payload.date);
      return {
        ...state,
        salaryCalculationMethod: action.payload.method,
        salaryCalculationDate: action.payload.date
      };
    case 'SET_MINIMUM_PAYMENT_SETTINGS':
      // Сохраняем настройки минимальной оплаты в localStorage
      localStorage.setItem('minimumPaymentSettings', JSON.stringify(action.payload));
      return {
        ...state,
        minimumPaymentSettings: action.payload
      };
    default:
      return state;
  }
}

// Применение класса темы к документу
const applyThemeToDocument = (theme: ThemeMode) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark', 'black');
  root.classList.add(theme);
};

// Провайдер контекста
export function AppProvider({ children }: { children: ReactNode }) {
  // Инициализируем начальное состояние с темой из localStorage, если есть
  const savedTheme = localStorage.getItem('appTheme') as ThemeMode | null;

  // Восстанавливаем метод расчета зарплаты из localStorage
  const savedSalaryMethod = localStorage.getItem('salaryCalculationMethod') as SalaryCalculationMethod | null;
  const savedSalaryDate = localStorage.getItem('salaryCalculationDate') as string | null;
  const savedMinimumPaymentSettings = localStorage.getItem('minimumPaymentSettings');

  let parsedMinimumPaymentSettings = initialState.minimumPaymentSettings;
  if (savedMinimumPaymentSettings) {
    try {
      parsedMinimumPaymentSettings = JSON.parse(savedMinimumPaymentSettings);
    } catch (error) {
      console.error('Ошибка при парсинге настроек минимальной оплаты:', error);
    }
  }

  const initialStateWithSaved = {
    ...initialState,
    theme: savedTheme || initialState.theme,
    salaryCalculationMethod: 'minimumWithPercentage', // Принудительно устанавливаем единственный метод
    salaryCalculationDate: savedSalaryDate || initialState.salaryCalculationDate,
    minimumPaymentSettings: parsedMinimumPaymentSettings
  };

  const [state, dispatch] = useReducer(appReducer, initialStateWithSaved);

  // Функция для загрузки данных за определенный период
  const fetchDataForPeriod = useCallback(async (startDate: string, endDate: string) => {
    try {
      console.log(`Загрузка данных за период: ${startDate} - ${endDate}`);

      // Загружаем записи на мойку за период
      const appointments = await appointmentService.getAll(startDate, endDate);
      dispatch({ type: 'SET_APPOINTMENTS', payload: appointments });
      console.log(`Записи на мойку загружены за период: ${appointments.length}`);

      // Загружаем отчеты за период
      const dailyReports = await dailyReportService.getByDateRange(startDate, endDate);

      // Преобразуем массив отчетов в объект с ключами-датами
      const reportsMap: Record<string, DailyReport> = {};
      dailyReports.forEach(report => {
        reportsMap[report.date] = report;
      });

      // Обновляем состояние - добавляем новые отчеты к существующим
      for (const [date, report] of Object.entries(reportsMap)) {
        dispatch({ type: 'SET_DAILY_REPORT', payload: { date, report } });
      }

      console.log(`Отчеты загружены за период: ${dailyReports.length}`);
    } catch (error) {
      console.error('Ошибка при загрузке данных за период:', error);
    }
  }, []);

  // Загрузка данных при монтировании приложения (только за текущий месяц)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Вычисляем первый и последний день текущего месяца
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const startDate = format(firstDayOfMonth, 'yyyy-MM-dd');
        const endDate = format(lastDayOfMonth, 'yyyy-MM-dd');

        console.log(`Загрузка данных за текущий месяц: ${startDate} - ${endDate}`);

        // Загружаем сотрудников (загружаем все, т.к. это справочник)
        const employees = await employeeService.getAll();
        dispatch({ type: 'SET_EMPLOYEES', payload: employees });
        console.log('Сотрудники загружены при запуске приложения:', employees.length);

        // Загружаем организации (загружаем все, т.к. это справочник)
        const organizations = await organizationService.getAll();
        dispatch({ type: 'SET_ORGANIZATIONS', payload: organizations });
        console.log('Организации загружены при запуске приложения:', organizations.length);

        // Загружаем услуги (загружаем все, т.к. это справочник)
        const services = await serviceService.getAll();
        dispatch({ type: 'SET_SERVICES', payload: services });
        console.log('Услуги загружены при запуске приложения:', services.length);

        // Загружаем записи на мойку только за текущий месяц
        const appointments = await appointmentService.getAll(startDate, endDate);
        dispatch({ type: 'SET_APPOINTMENTS', payload: appointments });
        console.log('Записи на мойку загружены за текущий месяц:', appointments.length);

        // Загружаем отчеты только за текущий месяц
        const dailyReports = await dailyReportService.getByDateRange(startDate, endDate);
        const reportsMap: Record<string, DailyReport> = {};
        dailyReports.forEach(report => {
          reportsMap[report.date] = report;
        });
        for (const [date, report] of Object.entries(reportsMap)) {
          dispatch({ type: 'SET_DAILY_REPORT', payload: { date, report } });
        }
        console.log('Отчеты загружены за текущий месяц:', dailyReports.length);

        // Загружаем метод расчета зарплаты из базы данных
        const salarySettings = await settingsService.getSalaryCalculationMethod();
        if (salarySettings) {
          dispatch({
            type: 'SET_SALARY_CALCULATION_METHOD',
            payload: {
              method: salarySettings.method as SalaryCalculationMethod,
              date: salarySettings.date
            }
          });
          console.log(`Метод расчета зарплаты загружен из базы данных: ${salarySettings.method}`);
        }

        // Загружаем настройки минимальной оплаты из базы данных
        const minimumPaymentSettings = await settingsService.getMinimumPaymentSettings();
        if (minimumPaymentSettings) {
          dispatch({
            type: 'SET_MINIMUM_PAYMENT_SETTINGS',
            payload: minimumPaymentSettings
          });
          console.log('Настройки минимальной оплаты загружены из базы данных:', minimumPaymentSettings);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных при запуске:', error);
      }
    };

    loadInitialData();
  }, []);

  // Применяем тему при изменении
  useEffect(() => {
    applyThemeToDocument(state.theme);
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch, fetchDataForPeriod }}>
      {children}
    </AppContext.Provider>
  );
}

// Хук для использования контекста
export function useAppContext() {
  return useContext(AppContext);
}

// Хук для расчета зарплаты с учетом метода и даты
export function useSalaryCalculation(date: string, totalRevenue: number, employeeCount = 1) {
  const { state } = useAppContext();

  // Теперь всегда используем выбранный метод (минималка + %)
  const methodToUse = state.salaryCalculationMethod;

  // Если метод не выбран, возвращаем нулевые значения
  if (methodToUse === 'none') {
    return {
      method: 'none' as SalaryCalculationMethod,
      description: 'Метод не выбран',
      totalAmount: 0,
      perEmployee: 0,
      formula: 'Выберите метод расчёта в настройках'
    };
  }

  // Всегда используем минимальную оплату + процент
  return {
    method: 'minimumWithPercentage' as SalaryCalculationMethod,
    description: 'Минимальная оплата + процент',
    totalAmount: 0, // Будет рассчитано индивидуально
    perEmployee: 0, // Будет рассчитано индивидуально
    formula: 'Расчёт по ролям и индивидуальным показателям'
  };
}
