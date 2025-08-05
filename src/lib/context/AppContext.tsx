import { createContext, useReducer, useContext, type ReactNode, useEffect } from 'react';
import type { AppState, AppAction, DailyReport, ThemeMode, Organization, Appointment, SalaryCalculationMethod, MinimumPaymentSettings } from '../types';
import { format } from 'date-fns';
import { employeeService, organizationService, serviceService, appointmentService, settingsService } from '@/lib/services/firebaseService';

// Начальное состояние приложения
const initialState: AppState = {
  employees: [],
  organizations: [],
  services: [],
  dailyReports: {},
  appointments: [],
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  theme: 'light',
  salaryCalculationMethod: 'percentage', // По умолчанию - процентный метод (27%)
  salaryCalculationDate: format(new Date(), 'yyyy-MM-dd'), // Текущая дата как дата изменения метода
  minimumPaymentSettings: {
    minimumPaymentWasher: 0,
    percentageWasher: 10,
    minimumPaymentAdmin: 0,
    percentageAdmin: 5
  }
};

// Создаем контекст
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => null
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
    salaryCalculationMethod: savedSalaryMethod || initialState.salaryCalculationMethod,
    salaryCalculationDate: savedSalaryDate || initialState.salaryCalculationDate,
    minimumPaymentSettings: parsedMinimumPaymentSettings
  };

  const [state, dispatch] = useReducer(appReducer, initialStateWithSaved);

  // Загрузка данных при монтировании приложения
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Загружаем сотрудников
        const employees = await employeeService.getAll();
        dispatch({ type: 'SET_EMPLOYEES', payload: employees });
        console.log('Сотрудники загружены при запуске приложения:', employees.length);

        // Загружаем организации
        const organizations = await organizationService.getAll();
        dispatch({ type: 'SET_ORGANIZATIONS', payload: organizations });
        console.log('Организации загружены при запуске приложения:', organizations.length);

        // Загружаем услуги
        const services = await serviceService.getAll();
        dispatch({ type: 'SET_SERVICES', payload: services });
        console.log('Услуги загружены при запуске приложения:', services.length);

        // Загружаем записи на мойку
        const appointments = await appointmentService.getAll();
        dispatch({ type: 'SET_APPOINTMENTS', payload: appointments });
        console.log('Записи на мойку загружены при запуске приложения:', appointments.length);

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
    <AppContext.Provider value={{ state, dispatch }}>
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

  // Определяем метод расчета в зависимости от даты
  // Если дата до изменения метода - используем percentage,
  // иначе используем текущий выбранный метод
  const shouldUseCurrentMethod = date >= state.salaryCalculationDate;
  const methodToUse = shouldUseCurrentMethod ? state.salaryCalculationMethod : 'percentage';

  // Расчет зарплаты
  if (methodToUse === 'percentage') {
    // 27% от общей выручки делится между сотрудниками
    const totalSalary = totalRevenue * 0.27;
    const perEmployeeSalary = employeeCount > 0 ? totalSalary / employeeCount : totalSalary;

    return {
      method: 'percentage' as SalaryCalculationMethod,
      description: '27% от общей выручки',
      totalAmount: totalSalary,
      perEmployee: perEmployeeSalary,
      formula: `(${totalRevenue.toFixed(2)} × 0.27) ÷ ${employeeCount} = ${perEmployeeSalary.toFixed(2)}`
    };
  } else {
    // 60 руб + 10% от общей выручки для КАЖДОГО сотрудника (не делится)
    const perEmployeeSalary = 60 + (totalRevenue * 0.1);
    const totalSalary = perEmployeeSalary * employeeCount;

    return {
      method: 'fixedPlusPercentage' as SalaryCalculationMethod,
      description: '60 руб. + 10% от общей выручки',
      totalAmount: totalSalary,
      perEmployee: perEmployeeSalary,
      formula: `60 + (${totalRevenue.toFixed(2)} × 0.1) = ${perEmployeeSalary.toFixed(2)}`
    };
  }
}
