// ============================================================
// OKLEYKA MODULE — TypeScript Types
// ============================================================

export interface OkleykaEmployee {
  id: string;
  name: string;
  position?: string;
}

export interface OkleykaOrganization {
  id: string;
  name: string;
}

// Способ оплаты в оклейке (аналог PaymentMethod мойки)
export interface OkleykaPaymentMethod {
  type: "cash" | "card" | "organization" | "debt";
  organizationId?: string;
  organizationName?: string;
  comment?: string;
}

// Услуга внутри заказа
export interface OkleykaOrderItem {
  id: string;
  orderId: string;
  name: string;
  price: number;
}

// Сотрудник на услуге + его зарплата
export interface OkleykaOrderWorker {
  id: string;
  orderId: string;
  itemId: string;
  employeeId: string;
  salary: number | null; // null = не назначена (неоплаченная)
  isPaid: boolean;
}

// Заказ оклейки
export interface OkleykaOrder {
  id: string;
  boxNumber: 1 | 2;
  dateStart: string; // YYYY-MM-DD
  dateEnd: string;   // YYYY-MM-DD
  carInfo: string;
  clientName?: string;
  clientPhone?: string;
  status: "active" | "completed" | "cancelled";
  paymentMethod?: OkleykaPaymentMethod;
  totalPrice: number;
  notes?: string;
  shiftDate?: string; // YYYY-MM-DD
  inspectionDate?: string | null; // ISO datetime
  inspectionNotified?: boolean;
  completedAt?: string | null;
  createdAt: string;
  // joined data
  items?: OkleykaOrderItem[];
  workers?: OkleykaOrderWorker[];
}

// Быстрая транзакция (приход/расход кассы)
export interface OkleykaCashModification {
  id: string;
  amount: number; // отрицательное = расход, положительное = приход
  reason: string;
  method: "cash" | "card";
  createdAt: string;
}

// Смена оклейки
export interface OkleykaShift {
  id: string;
  date: string; // YYYY-MM-DD
  employeeIds: string[];
  employeeRoles: Record<string, "admin" | "installer">;
  startOfDayCash: number;
  actualEndCash?: number | null; // null = смена открыта
  salaryPayouts: Record<string, number>; // employeeId -> amount
  cashModifications: OkleykaCashModification[];
  isOpen: boolean;
}

// Долг оклейки
export interface OkleykaDebt {
  id: string;
  orderId?: string | null;
  carInfo: string;
  amount: number;
  shiftDate: string;
  isClosed: boolean;
  closedAt?: string | null;
  actualPaymentMethod?: OkleykaPaymentMethod | null;
  employeePayouts: Record<string, number>; // employeeId -> amount
  createdAt: string;
}

// Запись на будущее
export interface OkleykaAppointment {
  id: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  carInfo: string;
  clientName?: string;
  clientPhone?: string;
  service?: string;
  boxNumber?: 1 | 2;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
}

// Состояние приложения оклейки
export interface OkleykaAppState {
  employees: OkleykaEmployee[];
  organizations: OkleykaOrganization[];
  currentShift: OkleykaShift | null;
  orders: OkleykaOrder[];      // заказы текущего месяца
  debts: OkleykaDebt[];        // открытые долги
  appointments: OkleykaAppointment[];
  upcomingInspections: OkleykaOrder[]; // заказы с inspection_date в ближайшие 48ч
  unpaidWorkersCount: number;   // кол-во записей с salary IS NULL
  isInitialized: boolean;
  currentDate: string; // YYYY-MM-DD
  settings: { adminSalaryType: "percent" | "fixed"; adminSalaryValue: number } | null;
}
