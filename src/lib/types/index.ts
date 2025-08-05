// Тип для сотрудника
export interface Employee {
  id: string;
  name: string;
  position?: string;
  role?: EmployeeRole; // Роль сотрудника
  // Дополнительные поля могут быть добавлены по мере необходимости
}

// Тип для организации-партнера
export interface Organization {
  id: string;
  name: string;
  // Дополнительные поля могут быть добавлены по мере необходимости
}

// Тип для услуги
export interface Service {
  id: string;
  name: string;
  price: number;
  // Дополнительные поля
}

// Тип для способа оплаты
export interface PaymentMethod {
  type: 'cash' | 'card' | 'organization';
  organizationId?: string; // ID организации (если type === 'organization')
  organizationName?: string; // Имя организации (для удобства отображения)
}

// Тип для записи о помывке автомобиля
export interface CarWashRecord {
  id: string;
  date: Date | string;
  time: string;
  carInfo: string; // Информация об авто, включая гос.номер
  service: string; // Название услуги
  price: number;
  paymentMethod: PaymentMethod;
  employeeIds: string[]; // ID сотрудников, выполнивших работу
  // Дополнительные поля могут быть добавлены по мере необходимости
}

// Тип для ежедневной ведомости
export interface DailyReport {
  id: string;
  date: Date | string;
  employeeIds: string[]; // ID сотрудников, работавших в этот день
  records: CarWashRecord[]; // Записи о помывках за день
  totalCash: number; // Сумма наличных платежей
  totalNonCash: number; // Сумма безналичных платежей
  // Дополнительные поля могут быть добавлены по мере необходимости
}

// Тип для записи на мойку (предварительная запись)
export interface Appointment {
  id: string;
  date: string; // Дата в формате YYYY-MM-DD
  time: string; // Время в формате HH:MM
  carInfo: string; // Информация об автомобиле
  service: string; // Текстовое описание услуги вместо массива ID
  clientName?: string; // Опциональное имя клиента
  clientPhone?: string; // Опциональный телефон клиента
  status: 'scheduled' | 'completed' | 'cancelled'; // Статус записи
  createdAt?: Date | string; // Дата создания записи
}

// Тип для метода расчета зарплаты
export type SalaryCalculationMethod = 'percentage' | 'fixedPlusPercentage' | 'minimumWithPercentage';

// Тип для роли сотрудника
export type EmployeeRole = 'washer' | 'admin';

// Интерфейс для настроек минимальной оплаты
export interface MinimumPaymentSettings {
  minimumPaymentWasher: number; // Минимальная оплата за день для мойщика
  percentageWasher: number; // Процент от выручки для мойщика
  minimumPaymentAdmin: number; // Минимальная оплата за день для админа
}

// Тип для настроек темы
export type ThemeMode = 'light' | 'dark' | 'black';

// Типы для контекста состояния
export interface AppState {
  employees: Employee[];
  organizations: Organization[]; // Добавляем организации в состояние
  services: Service[];
  dailyReports: Record<string, DailyReport>; // Ключ - дата в формате YYYY-MM-DD
  appointments: Appointment[]; // Добавляем записи на мойку
  currentDate: string; // Текущая выбранная дата в формате YYYY-MM-DD
  theme: ThemeMode; // Текущая тема приложения
  salaryCalculationMethod: SalaryCalculationMethod; // Метод расчета зарплаты
  salaryCalculationDate: string; // Дата изменения метода расчета зарплаты в формате YYYY-MM-DD
  minimumPaymentSettings: MinimumPaymentSettings; // Настройки минимальной оплаты
}

// Типы действий для редьюсера
export type AppAction =
  | { type: 'SET_EMPLOYEES'; payload: Employee[] }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'REMOVE_EMPLOYEE'; payload: string } // payload - id сотрудника
  | { type: 'SET_ORGANIZATIONS'; payload: Organization[] } // Добавляем действия для организаций
  | { type: 'ADD_ORGANIZATION'; payload: Organization }
  | { type: 'UPDATE_ORGANIZATION'; payload: Organization }
  | { type: 'REMOVE_ORGANIZATION'; payload: string } // payload - id организации
  | { type: 'SET_SERVICES'; payload: Service[] }
  | { type: 'ADD_SERVICE'; payload: Service }
  | { type: 'SET_DAILY_REPORT'; payload: { date: string; report: DailyReport } }
  | { type: 'ADD_CAR_WASH_RECORD'; payload: { date: string; record: CarWashRecord } }
  | { type: 'SET_CURRENT_DATE'; payload: string }
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'SET_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: Appointment }
  | { type: 'REMOVE_APPOINTMENT'; payload: string } // payload - id записи
  | { type: 'SET_SALARY_CALCULATION_METHOD'; payload: { method: SalaryCalculationMethod, date: string } }
  | { type: 'SET_MINIMUM_PAYMENT_SETTINGS'; payload: MinimumPaymentSettings };
