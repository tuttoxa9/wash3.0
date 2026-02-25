import type { CarWashRecord, Employee } from '@/lib/types';

export interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  statistics: any;
  periodLabel: string;
  onPaymentMethodClick: (method: string, records: CarWashRecord[]) => void;
}

export interface PaymentMethodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: string;
  records: CarWashRecord[];
  employee: Employee;
  periodLabel: string;
}

export interface DailyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  groupedRecords: Record<string, CarWashRecord[]>;
  sortedDates: string[];
  periodLabel: string;
  calculateEmployeeEarnings: (record: CarWashRecord, employeeId: string) => number;
  onDayClick: (date: string, dayRecords: CarWashRecord[]) => void;
  selectedDate: string | null;
  selectedDateRecords: CarWashRecord[];
  showAnalyticsButton?: boolean;
  onAnalyticsClick?: () => void;
}
