import {
  appointmentService,
  carWashService,
  dailyReportService,
  employeeService,
  organizationService,
  serviceService,
  settingsService,
} from "@/lib/services/supabaseService";
import { format } from "date-fns";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import type {
  AppAction,
  AppState,
  Appointment,
  DailyReport,
  MinimumPaymentSettings,
  Organization,
  SalaryCalculationMethod,
  ThemeMode,
} from "../types";

// Начальное состояние приложения
const initialState: AppState = {
  employees: [],
  organizations: [],
  services: [],
  dailyReports: {},
  appointments: [],
  currentDate: format(new Date(), "yyyy-MM-dd"),
  theme: "light",
  salaryCalculationMethod: "minimumWithPercentage", // Единственный доступный метод
  salaryCalculationDate: format(new Date(), "yyyy-MM-dd"), // Текущая дата как дата изменения метода
  minimumPaymentSettings: {
    minimumPaymentWasher: 0,
    percentageWasher: 10,
    percentageWasherDryclean: 15,
    minimumPaymentAdmin: 0,
    adminCashPercentage: 3,
    adminCarWashPercentage: 2,
    adminDrycleanPercentage: 3,
  },
  organizationsInTotal: [],
  isRealtimeEnabled: true,
  isInitialized: false,
};

// Создаем контекст
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  fetchDataForPeriod: (startDate: string, endDate: string) => Promise<void>;
}>({
  state: initialState,
  dispatch: () => null,
  fetchDataForPeriod: async () => {},
});

// Редьюсер для управления состоянием
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_EMPLOYEES":
      return { ...state, employees: action.payload };
    case "ADD_EMPLOYEE":
      return { ...state, employees: [...state.employees, action.payload] };
    case "UPDATE_EMPLOYEE": {
      const updatedEmployees = state.employees.map((emp) =>
        emp.id === action.payload.id ? action.payload : emp,
      );
      return { ...state, employees: updatedEmployees };
    }
    case "REMOVE_EMPLOYEE":
      return {
        ...state,
        employees: state.employees.filter((emp) => emp.id !== action.payload),
      };
    case "SET_ORGANIZATIONS":
      return { ...state, organizations: action.payload };
    case "ADD_ORGANIZATION":
      return {
        ...state,
        organizations: [...state.organizations, action.payload],
      };
    case "UPDATE_ORGANIZATION": {
      const updatedOrgs = state.organizations.map((org) =>
        org.id === action.payload.id ? action.payload : org,
      );
      return { ...state, organizations: updatedOrgs };
    }
    case "REMOVE_ORGANIZATION":
      return {
        ...state,
        organizations: state.organizations.filter(
          (org) => org.id !== action.payload,
        ),
      };
    case "SET_SERVICES":
      return { ...state, services: action.payload };
    case "ADD_SERVICE":
      return { ...state, services: [...state.services, action.payload] };
    case "SET_DAILY_REPORT":
      return {
        ...state,
        dailyReports: {
          ...state.dailyReports,
          [action.payload.date]: action.payload.report,
        },
      };
    case "SET_DAILY_REPORTS":
      return {
        ...state,
        dailyReports: {
          ...state.dailyReports,
          ...action.payload,
        },
      };
    case "ADD_CAR_WASH_RECORD": {
      const { date, record } = action.payload;
      const currentReport = state.dailyReports[date] || {
        id: date,
        date,
        employeeIds: [],
        records: [],
        totalCash: 0,
        totalNonCash: 0,
      };

      // Добавляем запись и обновляем итоги
      const updatedRecords = [...currentReport.records, record];

      // Рассчитываем новые итоги с учетом изменений в PaymentMethod
      // Долги (debt) не учитываются в текущей выручке
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

      // Объединяем ID сотрудников
      const allEmployeeIds = [
        ...new Set([...currentReport.employeeIds, ...record.employeeIds]),
      ];

      const updatedReport: DailyReport = {
        ...currentReport,
        records: updatedRecords,
        employeeIds: allEmployeeIds,
        totalCash,
        totalNonCash,
      };

      return {
        ...state,
        dailyReports: {
          ...state.dailyReports,
          [date]: updatedReport,
        },
      };
    }
    case "SET_CURRENT_DATE":
      return { ...state, currentDate: action.payload };
    case "SET_THEME": {
      // Сохраняем тему в localStorage для сохранения между сессиями
      localStorage.setItem("appTheme", action.payload);
      return { ...state, theme: action.payload };
    }
    // Добавляем обработку действий для записей на мойку
    case "SET_APPOINTMENTS":
      return { ...state, appointments: action.payload };
    case "ADD_APPOINTMENT":
      return {
        ...state,
        appointments: [...state.appointments, action.payload],
      };
    case "UPDATE_APPOINTMENT": {
      const updatedAppointments = state.appointments.map((appointment) =>
        appointment.id === action.payload.id ? action.payload : appointment,
      );
      return { ...state, appointments: updatedAppointments };
    }
    case "REMOVE_APPOINTMENT":
      return {
        ...state,
        appointments: state.appointments.filter(
          (appointment) => appointment.id !== action.payload,
        ),
      };
    case "SET_SALARY_CALCULATION_METHOD":
      // Сохраняем метод расчета зарплаты и дату изменения в localStorage
      localStorage.setItem("salaryCalculationMethod", action.payload.method);
      localStorage.setItem("salaryCalculationDate", action.payload.date);
      return {
        ...state,
        salaryCalculationMethod: action.payload.method,
        salaryCalculationDate: action.payload.date,
      };
    case "SET_MINIMUM_PAYMENT_SETTINGS":
      // Сохраняем настройки минимальной оплаты в localStorage
      localStorage.setItem(
        "minimumPaymentSettings",
        JSON.stringify(action.payload),
      );
      return {
        ...state,
        minimumPaymentSettings: action.payload,
      };
    case "SET_ORGANIZATIONS_IN_TOTAL":
      localStorage.setItem(
        "organizationsInTotal",
        JSON.stringify(action.payload),
      );
      return {
        ...state,
        organizationsInTotal: action.payload,
      };
    case "SET_REALTIME_ENABLED":
      return {
        ...state,
        isRealtimeEnabled: action.payload,
      };
    case "SET_INITIALIZED":
      return {
        ...state,
        isInitialized: action.payload,
      };
    case "SET_CERTIFICATES":
      return { ...state, certificates: action.payload };
    case "ADD_CERTIFICATE":
      return { ...state, certificates: [...(state.certificates || []), action.payload] };
    case "UPDATE_CERTIFICATE":
      return {
        ...state,
        certificates: (state.certificates || []).map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      };
    case "REMOVE_CERTIFICATE":
      return {
        ...state,
        certificates: (state.certificates || []).filter((c) => c.id !== action.payload),
      };
    default:
      return state;
  }
}

// Применение класса темы к документу
const applyThemeToDocument = (theme: ThemeMode) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "black");
  root.classList.add(theme);
};

import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import { certificateService } from "@/lib/services/supabaseService";

// Вспомогательный компонент для включения хуков после создания провайдера
function RealtimeSyncWrapper() {
  useRealtimeSync();
  return null;
}

// Провайдер контекста
export function AppProvider({ children }: { children: ReactNode }) {
  // Инициализируем начальное состояние с темой из localStorage, если есть
  const savedTheme = localStorage.getItem("appTheme") as ThemeMode | null;

  // Восстанавливаем метод расчета зарплаты из localStorage
  const savedSalaryMethod = localStorage.getItem(
    "salaryCalculationMethod",
  ) as SalaryCalculationMethod | null;
  const savedSalaryDate = localStorage.getItem("salaryCalculationDate") as
    | string
    | null;
  const savedMinimumPaymentSettings = localStorage.getItem(
    "minimumPaymentSettings",
  );

  let parsedMinimumPaymentSettings = initialState.minimumPaymentSettings;
  if (savedMinimumPaymentSettings) {
    try {
      parsedMinimumPaymentSettings = JSON.parse(savedMinimumPaymentSettings);
    } catch (error) {
      console.error("Ошибка при парсинге настроек минимальной оплаты:", error);
    }
  }

  const savedOrgsInTotal = localStorage.getItem("organizationsInTotal");
  let parsedOrgsInTotal = initialState.organizationsInTotal;
  if (savedOrgsInTotal) {
    try {
      parsedOrgsInTotal = JSON.parse(savedOrgsInTotal);
    } catch (error) {
      console.error("Ошибка при парсинге организаций в итого:", error);
    }
  }

  const initialStateWithSaved = {
    ...initialState,
    theme: savedTheme || initialState.theme,
    salaryCalculationMethod: "minimumWithPercentage", // Принудительно устанавливаем единственный метод
    salaryCalculationDate:
      savedSalaryDate || initialState.salaryCalculationDate,
    minimumPaymentSettings: parsedMinimumPaymentSettings,
    organizationsInTotal: parsedOrgsInTotal,
  };

  const [state, dispatch] = useReducer(appReducer, initialStateWithSaved);

  // Функция для загрузки данных за определенный период
  const fetchDataForPeriod = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        console.log(`Загрузка данных за период: ${startDate} - ${endDate}`);

        // Загружаем записи на мойку за период
        const appointments = await appointmentService.getAll(
          startDate,
          endDate,
        );
        dispatch({ type: "SET_APPOINTMENTS", payload: appointments });
        console.log(
          `Записи на мойку загружены за период: ${appointments.length}`,
        );

        // Загружаем отчеты за период
        const dailyReports = await dailyReportService.getByDateRange(
          startDate,
          endDate,
        );

        // Преобразуем массив отчетов в объект с ключами-датами
        const reportsMap: Record<string, DailyReport> = {};
        dailyReports.forEach((report) => {
          reportsMap[report.date] = report;
        });

        // Обновляем состояние - добавляем новые отчеты к существующим в одном действии
        dispatch({ type: "SET_DAILY_REPORTS", payload: reportsMap });

        console.log(`Отчеты загружены за период: ${dailyReports.length}`);
      } catch (error) {
        console.error("Ошибка при загрузке данных за период:", error);
      }
    },
    [],
  );

  // Загрузка данных при монтировании приложения (только за текущий месяц)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Вычисляем первый и последний день текущего месяца
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        );

        const startDate = format(firstDayOfMonth, "yyyy-MM-dd");
        const endDate = format(lastDayOfMonth, "yyyy-MM-dd");

        console.log(
          `Загрузка данных за текущий месяц: ${startDate} - ${endDate}`,
        );

        // Загружаем сотрудников (загружаем все, т.к. это справочник)
        const employees = await employeeService.getAll();
        dispatch({ type: "SET_EMPLOYEES", payload: employees });
        console.log(
          "Сотрудники загружены при запуске приложения:",
          employees.length,
        );

        // Загружаем организации (загружаем все, т.к. это справочник)
        const organizations = await organizationService.getAll();
        dispatch({ type: "SET_ORGANIZATIONS", payload: organizations });
        console.log(
          "Организации загружены при запуске приложения:",
          organizations.length,
        );

        // Загружаем услуги (загружаем все, т.к. это справочник)
        const services = await serviceService.getAll();
        dispatch({ type: "SET_SERVICES", payload: services });
        console.log(
          "Услуги загружены при запуске приложения:",
          services.length,
        );

        // Загружаем сертификаты
        const certificates = await certificateService.getAllActive();
        dispatch({ type: "SET_CERTIFICATES", payload: certificates });
        console.log(
          "Сертификаты загружены при запуске приложения:",
          certificates.length,
        );

        // Загружаем записи на мойку только за текущий месяц
        const appointments = await appointmentService.getAll(
          startDate,
          endDate,
        );
        dispatch({ type: "SET_APPOINTMENTS", payload: appointments });
        console.log(
          "Записи на мойку загружены за текущий месяц:",
          appointments.length,
        );

        // Загружаем отчеты только за текущий месяц
        const dailyReports = await dailyReportService.getByDateRange(
          startDate,
          endDate,
        );
        const reportsMap: Record<string, DailyReport> = {};
        dailyReports.forEach((report) => {
          reportsMap[report.date] = report;
        });
        dispatch({ type: "SET_DAILY_REPORTS", payload: reportsMap });
        console.log("Отчеты загружены за текущий месяц:", dailyReports.length);

        // Загружаем метод расчета зарплаты из базы данных
        const salarySettings =
          await settingsService.getSalaryCalculationMethod();
        if (salarySettings) {
          dispatch({
            type: "SET_SALARY_CALCULATION_METHOD",
            payload: {
              method: salarySettings.method as SalaryCalculationMethod,
              date: salarySettings.date,
            },
          });
          console.log(
            `Метод расчета зарплаты загружен из базы данных: ${salarySettings.method}`,
          );
        }

        // Загружаем настройки минимальной оплаты из базы данных
        const minimumPaymentSettings =
          await settingsService.getMinimumPaymentSettings();
        if (minimumPaymentSettings) {
          dispatch({
            type: "SET_MINIMUM_PAYMENT_SETTINGS",
            payload: minimumPaymentSettings,
          });
          console.log(
            "Настройки минимальной оплаты загружены из базы данных:",
            minimumPaymentSettings,
          );
        }

        // Загружаем настройки организаций в итого из базы данных
        const orgsInTotal = await settingsService.getOrganizationsInTotal();
        if (orgsInTotal) {
          dispatch({
            type: "SET_ORGANIZATIONS_IN_TOTAL",
            payload: orgsInTotal,
          });
          console.log(
            "Настройки организаций в итого загружены из БД:",
            orgsInTotal,
          );
        }

        const realtimeEnabled = await settingsService.getRealtimeEnabled();
        dispatch({ type: "SET_REALTIME_ENABLED", payload: realtimeEnabled });

        // Отмечаем, что инициализация завершена
        dispatch({ type: "SET_INITIALIZED", payload: true });
      } catch (error) {
        console.error("Ошибка при загрузке данных при запуске:", error);
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
      <RealtimeSyncWrapper />
      {children}
    </AppContext.Provider>
  );
}

// Хук для использования контекста
export function useAppContext() {
  return useContext(AppContext);
}

// Хук для расчета зарплаты с учетом метода и даты
export function useSalaryCalculation(
  date: string,
  totalRevenue: number,
  employeeCount = 1,
) {
  const { state } = useAppContext();

  // Теперь всегда используем выбранный метод (минималка + %)
  const methodToUse = state.salaryCalculationMethod;

  // Если метод не выбран, возвращаем нулевые значения
  if (methodToUse === "none") {
    return {
      method: "none" as SalaryCalculationMethod,
      description: "Метод не выбран",
      totalAmount: 0,
      perEmployee: 0,
      formula: "Выберите метод расчёта в настройках",
    };
  }

  // Всегда используем минимальную оплату + процент
  return {
    method: "minimumWithPercentage" as SalaryCalculationMethod,
    description: "Минимальная оплата + процент",
    totalAmount: 0, // Будет рассчитано индивидуально
    perEmployee: 0, // Будет рассчитано индивидуально
    formula: "Расчёт по ролям и индивидуальным показателям",
  };
}
