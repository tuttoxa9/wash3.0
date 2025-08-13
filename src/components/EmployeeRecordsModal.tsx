import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Calendar, Clock, Car, Wrench, CreditCard, Users, TrendingUp, DollarSign, BarChart3, PieChart, Star, Target, User, Info, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isSameWeek, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { CarWashRecord, Employee } from '@/lib/types';
import { useAppContext } from '@/lib/context/AppContext';

interface EmployeeRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  records: CarWashRecord[];
  periodLabel: string;
  dailyRoles?: Record<string, Record<string, string>>;
}

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  statistics: any;
  periodLabel: string;
  onPaymentMethodClick: (method: string, records: CarWashRecord[]) => void;
}

interface PaymentMethodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: string;
  records: CarWashRecord[];
  employee: Employee;
  periodLabel: string;
}

// Компонент детального окна по способу оплаты
const PaymentMethodDetailModal: React.FC<PaymentMethodDetailModalProps> = ({
  isOpen,
  onClose,
  paymentMethod,
  records,
  employee,
  periodLabel
}) => {
  const { state } = useAppContext();

  const getPaymentMethodLabel = (method: string, organizationId?: string) => {
    switch (method) {
      case 'cash': return 'Наличные';
      case 'card': return 'Карта';
      case 'organization': {
        if (organizationId) {
          const organization = state.organizations.find(org => org.id === organizationId);
          return organization ? organization.name : 'Организация';
        }
        return 'Организация';
      }
      default: return method;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return state.theme === 'dark'
          ? 'text-green-300 bg-green-500/10 border-green-500/20'
          : state.theme === 'black'
          ? 'text-green-400 bg-green-500/5 border-green-500/30'
          : 'text-green-600 bg-green-50 border-green-200';
      case 'card':
        return state.theme === 'dark'
          ? 'text-blue-300 bg-blue-500/10 border-blue-500/20'
          : state.theme === 'black'
          ? 'text-blue-400 bg-blue-500/5 border-blue-500/30'
          : 'text-blue-600 bg-blue-50 border-blue-200';
      case 'organization':
        return state.theme === 'dark'
          ? 'text-purple-300 bg-purple-500/10 border-purple-500/20'
          : state.theme === 'black'
          ? 'text-purple-400 bg-purple-500/5 border-purple-500/30'
          : 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return state.theme === 'dark'
          ? 'text-gray-300 bg-gray-500/10 border-gray-500/20'
          : state.theme === 'black'
          ? 'text-gray-400 bg-gray-500/5 border-gray-500/30'
          : 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-[70]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`w-full max-w-4xl max-h-[75vh] rounded-lg shadow-lg overflow-hidden ${
            state.theme === 'dark'
              ? 'bg-slate-900 border border-slate-700'
              : state.theme === 'black'
              ? 'bg-black border border-gray-800'
              : 'bg-white border border-gray-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Компактный заголовок */}
          <div className={`p-3 border-b flex items-center justify-between ${
            state.theme === 'dark'
              ? 'border-slate-700'
              : state.theme === 'black'
              ? 'border-gray-800'
              : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={`p-1 rounded-md transition-colors ${
                  state.theme === 'dark'
                    ? 'hover:bg-slate-700 text-gray-400'
                    : state.theme === 'black'
                    ? 'hover:bg-gray-800 text-gray-500'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
              <div>
                <h2 className={`text-lg font-semibold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {getPaymentMethodLabel(paymentMethod)}: {employee.name}
                </h2>
                <p className={`text-sm ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  {periodLabel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1 rounded-md transition-colors ${
                state.theme === 'dark'
                  ? 'hover:bg-slate-700 text-gray-400'
                  : state.theme === 'black'
                  ? 'hover:bg-gray-800 text-gray-500'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Компактная статистика */}
          <div className="overflow-y-auto max-h-[calc(75vh-80px)] p-3">
            {/* Основные показатели - компактные */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className={`p-2 rounded-md text-center ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-lg font-bold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {records.length}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Машин
                </div>
              </div>

              <div className={`p-2 rounded-md text-center ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-lg font-bold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {records.reduce((sum, record) => sum + (record.price / record.employeeIds.length), 0).toFixed(0)}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Заработок
                </div>
              </div>

              <div className={`p-2 rounded-md text-center ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-lg font-bold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {new Set(records.map(r => r.service)).size}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Услуг
                </div>
              </div>

              <div className={`p-2 rounded-md text-center ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-lg font-bold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {records.length > 0 ? (records.reduce((sum, record) => sum + (record.price / record.employeeIds.length), 0) / records.length).toFixed(0) : '0'}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Среднее
                </div>
              </div>
            </div>

            {/* Список записей */}
            <div className="space-y-2">
              {records.map(record => (
                <div
                  key={record.id}
                  className={`p-2 rounded-md ${
                    state.theme === 'dark'
                      ? 'bg-slate-800'
                      : state.theme === 'black'
                      ? 'bg-gray-900'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs mb-1">
                        <span className={`${
                          state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                          {format(parseISO(typeof record.date === 'string' ? record.date : format(record.date, 'yyyy-MM-dd')), 'dd.MM.yyyy')}
                        </span>
                        {record.time && (
                          <span className={`${
                            state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                            {record.time}
                          </span>
                        )}
                      </div>
                      <div className={`font-medium text-sm truncate ${
                        state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {record.carInfo}
                      </div>
                      <div className={`text-xs truncate ${
                        state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {record.service}
                      </div>
                      {record.paymentMethod.organizationName && (
                        <div className={`text-xs truncate ${
                          state.theme === 'dark' ? 'text-purple-300' : state.theme === 'black' ? 'text-purple-400' : 'text-purple-600'
                        }`}>
                          {record.paymentMethod.organizationName}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-sm font-bold text-green-500">
                        {record.price.toFixed(2)}
                      </div>
                      <div className={`text-xs ${
                        state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {record.employeeIds.length} сотр.
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Интерфейс модального окна группировки по дням
interface DailyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  groupedRecords: Record<string, CarWashRecord[]>;
  sortedDates: string[];
  periodLabel: string;
  dailyRoles: Record<string, Record<string, string>>;
  calculateEmployeeEarnings: (record: CarWashRecord, employeeId: string) => number;
  onDayClick: (date: string, dayRecords: CarWashRecord[]) => void;
  selectedDate: string | null;
  selectedDateRecords: CarWashRecord[];
  showAnalyticsButton?: boolean;
  onAnalyticsClick?: () => void;
}

// Компонент модального окна только для мобильных - список дней
const MobileDaysListModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  groupedRecords: Record<string, CarWashRecord[]>;
  sortedDates: string[];
  periodLabel: string;
  calculateEmployeeEarnings: (record: CarWashRecord, employeeId: string) => number;
  onDayClick: (date: string, dayRecords: CarWashRecord[]) => void;
}> = ({
  isOpen,
  onClose,
  employee,
  groupedRecords,
  sortedDates,
  periodLabel,
  calculateEmployeeEarnings,
  onDayClick
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-[60]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md h-[75vh] rounded-lg shadow-lg overflow-hidden bg-background border border-border flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Дни работы: {employee.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {periodLabel}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {sortedDates.map(date => {
                const dayRecords = groupedRecords[date];
                const dayEarnings = dayRecords.reduce((sum, record) =>
                  sum + calculateEmployeeEarnings(record, employee.id), 0
                );
                const dayRevenue = dayRecords.reduce((sum, record) =>
                  sum + (record.price / record.employeeIds.length), 0
                );

                return (
                  <div
                    key={date}
                    className="p-3 rounded-lg cursor-pointer transition-all duration-200 border bg-muted/20 border-border hover:bg-muted/40"
                    onClick={() => onDayClick(date, dayRecords)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-foreground">
                          {format(parseISO(date), 'dd MMMM yyyy', { locale: ru })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dayRecords.length} записей
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          +{dayEarnings.toFixed(2)} BYN
                        </div>
                        <div className="text-xs text-muted-foreground">
                          из {dayRevenue.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Компонент модального окна деталей дня для мобильных
const MobileDayDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  employee: Employee;
  selectedDate: string;
  selectedDateRecords: CarWashRecord[];
  calculateEmployeeEarnings: (record: CarWashRecord, employeeId: string) => number;
}> = ({
  isOpen,
  onClose,
  onBack,
  employee,
  selectedDate,
  selectedDateRecords,
  calculateEmployeeEarnings
}) => {
  const { state } = useAppContext();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-[70]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md h-[75vh] rounded-lg shadow-lg overflow-hidden bg-background border border-border flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: ru })}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedDateRecords.length} записей
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {selectedDateRecords.map(record => (
                <div
                  key={record.id}
                  className="p-3 rounded-lg bg-muted/20 border border-border"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span className="text-muted-foreground">
                          {record.time || '—'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${
                          record.paymentMethod.type === 'cash'
                            ? 'text-green-600 bg-green-50 border-green-200'
                            : record.paymentMethod.type === 'card'
                            ? 'text-blue-600 bg-blue-50 border-blue-200'
                            : 'text-purple-600 bg-purple-50 border-purple-200'
                        }`}>
                          {record.paymentMethod.type === 'cash' ? 'Наличные' :
                           record.paymentMethod.type === 'card' ? 'Карта' :
                           record.paymentMethod.organizationName ||
                           (record.paymentMethod.organizationId ?
                             state.organizations.find(org => org.id === record.paymentMethod.organizationId)?.name || 'Организация'
                             : 'Организация')}
                        </span>
                      </div>
                      <div className="font-medium text-sm truncate text-foreground">
                        {record.carInfo}
                      </div>
                      <div className="text-xs truncate text-muted-foreground">
                        {record.service}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-sm font-bold text-green-600">
                        +{calculateEmployeeEarnings(record, employee.id).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        из {record.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Компонент модального окна группировки по дням
const DailyBreakdownModal: React.FC<DailyBreakdownModalProps> = ({
  isOpen,
  onClose,
  employee,
  groupedRecords,
  sortedDates,
  periodLabel,
  dailyRoles,
  calculateEmployeeEarnings,
  onDayClick,
  selectedDate,
  selectedDateRecords,
  showAnalyticsButton = false,
  onAnalyticsClick
}) => {
  const { state } = useAppContext();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-[60]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-7xl h-[75vh] rounded-lg shadow-lg overflow-hidden bg-background border border-border flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Левая панель - список дней */}
          <div className="w-1/2 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Дни работы: {employee.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {periodLabel}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {sortedDates.map(date => {
                  const dayRecords = groupedRecords[date];
                  const dayEarnings = dayRecords.reduce((sum, record) =>
                    sum + calculateEmployeeEarnings(record, employee.id), 0
                  );
                  const dayRevenue = dayRecords.reduce((sum, record) =>
                    sum + (record.price / record.employeeIds.length), 0
                  );

                  return (
                    <div
                      key={date}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedDate === date
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/20 border-border hover:bg-muted/40'
                      }`}
                      onClick={() => onDayClick(date, dayRecords)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-foreground">
                            {format(parseISO(date), 'dd MMMM yyyy', { locale: ru })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {dayRecords.length} записей
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            +{dayEarnings.toFixed(2)} BYN
                          </div>
                          <div className="text-xs text-muted-foreground">
                            из {dayRevenue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Правая панель - детали выбранного дня */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedDate ? format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: ru }) : 'Выберите день'}
                </h2>
                {selectedDate && (
                  <p className="text-sm text-muted-foreground">
                    {selectedDateRecords.length} записей
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showAnalyticsButton && onAnalyticsClick && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onAnalyticsClick}
                    className="px-3 py-1.5 rounded-md font-medium text-sm transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
                  >
                    <BarChart3 className="w-4 h-4 mr-1 inline" />
                    Аналитика
                  </motion.button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {selectedDate && selectedDateRecords.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateRecords.map(record => (
                    <div
                      key={record.id}
                      className="p-3 rounded-lg bg-muted/20 border border-border"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm mb-1">
                            <span className="text-muted-foreground">
                              {record.time || '—'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs border ${
                              record.paymentMethod.type === 'cash'
                                ? 'text-green-600 bg-green-50 border-green-200'
                                : record.paymentMethod.type === 'card'
                                ? 'text-blue-600 bg-blue-50 border-blue-200'
                                : 'text-purple-600 bg-purple-50 border-purple-200'
                            }`}>
                              {record.paymentMethod.type === 'cash' ? 'Наличные' :
                               record.paymentMethod.type === 'card' ? 'Карта' :
                               record.paymentMethod.organizationName ||
                               (record.paymentMethod.organizationId ?
                                 state.organizations.find(org => org.id === record.paymentMethod.organizationId)?.name || 'Организация'
                                 : 'Организация')}
                            </span>
                          </div>
                          <div className="font-medium text-sm truncate text-foreground">
                            {record.carInfo}
                          </div>
                          <div className="text-xs truncate text-muted-foreground">
                            {record.service}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-sm font-bold text-green-600">
                            +{calculateEmployeeEarnings(record, employee.id).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            из {record.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Выберите день для просмотра деталей</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Компонент модального окна аналитики
const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  employee,
  statistics,
  periodLabel,
  onPaymentMethodClick
}) => {
  const { state } = useAppContext();

  const getPaymentMethodLabel = (method: string, organizationId?: string) => {
    switch (method) {
      case 'cash': return 'Наличные';
      case 'card': return 'Карта';
      case 'organization': {
        if (organizationId) {
          const organization = state.organizations.find(org => org.id === organizationId);
          return organization ? organization.name : 'Организация';
        }
        return 'Организация';
      }
      default: return method;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-[60]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`w-full max-w-4xl max-h-[75vh] rounded-lg shadow-lg overflow-hidden ${
            state.theme === 'dark'
              ? 'bg-slate-900 border border-slate-700'
              : state.theme === 'black'
              ? 'bg-black border border-gray-800'
              : 'bg-white border border-gray-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Компактный заголовок */}
          <div className={`p-3 border-b flex items-center justify-between ${
            state.theme === 'dark'
              ? 'border-slate-700'
              : state.theme === 'black'
              ? 'border-gray-800'
              : 'border-gray-200'
          }`}>
            <div>
              <h2 className={`text-lg font-semibold ${
                state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
              }`}>
                Аналитика: {employee.name}
              </h2>
              <p className={`text-sm ${
                state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {periodLabel}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-1 rounded-md transition-colors ${
                state.theme === 'dark'
                  ? 'hover:bg-slate-700 text-gray-400'
                  : state.theme === 'black'
                  ? 'hover:bg-gray-800 text-gray-500'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Компактное содержимое */}
          <div className="overflow-y-auto max-h-[calc(75vh-80px)] p-3">
            {/* Основные показатели - компактные */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className={`p-2 rounded-md text-center ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-lg font-bold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {statistics.totalRecords}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Машин
                </div>
              </div>

              <div className={`p-2 rounded-md text-center ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-lg font-bold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {statistics.totalEarnings.toFixed(0)}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Заработок
                </div>
              </div>

              <div className={`p-2 rounded-md text-center ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-lg font-bold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {Object.keys(statistics.serviceStats).length}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Услуг
                </div>
              </div>

              <div className={`p-2 rounded-md text-center ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-lg font-bold ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {(statistics.totalEarnings / Math.max(statistics.totalRecords, 1)).toFixed(0)}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  Среднее
                </div>
              </div>
            </div>

            {/* Лучший день - компактный */}
            {statistics.bestDay.date && (
              <div className={`p-2 rounded-md mb-4 ${
                state.theme === 'dark'
                  ? 'bg-slate-800'
                  : state.theme === 'black'
                  ? 'bg-gray-900'
                  : 'bg-gray-50'
              }`}>
                <div className={`text-sm font-medium mb-1 ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Лучший день: {format(parseISO(statistics.bestDay.date), 'dd.MM.yyyy')}
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  {statistics.bestDay.count} машин • {statistics.bestDay.earnings?.toFixed(0)} BYN
                </div>
              </div>
            )}

            {/* Разделы аналитики в две колонки */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Способы оплаты */}
              <div>
                <h3 className={`text-sm font-medium mb-2 ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Способы оплаты
                </h3>
                <div className="space-y-2">
                  {Object.entries(statistics.paymentStats).map(([method, stats]) => (
                    <button
                      key={method}
                      onClick={() => onPaymentMethodClick(method, stats.records || [])}
                      className={`w-full p-2 rounded-md text-left transition-colors ${
                        state.theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700'
                          : state.theme === 'black'
                          ? 'bg-gray-900 hover:bg-gray-800'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${
                          state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          {getPaymentMethodLabel(method)}
                        </span>
                        <div className="flex gap-3 text-xs">
                          <span>{stats.count} оп.</span>
                          <span className="font-medium">{stats.earnings.toFixed(0)} BYN</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Популярные услуги */}
              <div>
                <h3 className={`text-sm font-medium mb-2 ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Услуги
                </h3>
                <div className="space-y-2">
                  {Object.entries(statistics.serviceStats)
                    .sort(([,a], [,b]) => b.earnings - a.earnings)
                    .slice(0, 5)
                    .map(([service, stats]) => (
                    <div key={service} className={`p-2 rounded-md ${
                      state.theme === 'dark'
                        ? 'bg-slate-800'
                        : state.theme === 'black'
                        ? 'bg-gray-900'
                        : 'bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium truncate ${
                          state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          {service}
                        </span>
                        <div className="flex gap-3 text-xs">
                          <span>{stats.count}×</span>
                          <span className="font-medium">{stats.earnings.toFixed(0)} BYN</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Дни недели */}
              <div>
                <h3 className={`text-sm font-medium mb-2 ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  По дням недели
                </h3>
                <div className="space-y-2">
                  {Object.entries(statistics.weekdayStats)
                    .sort(([,a], [,b]) => b.earnings - a.earnings)
                    .map(([weekday, stats]) => (
                    <div key={weekday} className={`p-2 rounded-md ${
                      state.theme === 'dark'
                        ? 'bg-slate-800'
                        : state.theme === 'black'
                        ? 'bg-gray-900'
                        : 'bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium capitalize ${
                          state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          {weekday}
                        </span>
                        <div className="flex gap-3 text-xs">
                          <span>{stats.count} машин</span>
                          <span className="font-medium">{stats.earnings.toFixed(0)} BYN</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Продуктивные часы */}
              <div>
                <h3 className={`text-sm font-medium mb-2 ${
                  state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Время работы
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(statistics.hourlyStats)
                    .sort(([,a], [,b]) => b.earnings - a.earnings)
                    .slice(0, 6)
                    .map(([timeSlot, stats]) => (
                    <div key={timeSlot} className={`p-2 rounded-md text-center ${
                      state.theme === 'dark'
                        ? 'bg-slate-800'
                        : state.theme === 'black'
                        ? 'bg-gray-900'
                        : 'bg-gray-50'
                    }`}>
                      <div className={`text-sm font-medium ${
                        state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {timeSlot}
                      </div>
                      <div className={`text-xs ${
                        state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        {stats.count} • {stats.earnings.toFixed(0)} BYN
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const EmployeeRecordsModal: React.FC<EmployeeRecordsModalProps> = ({
  isOpen,
  onClose,
  employee,
  records,
  periodLabel,
  dailyRoles = {}
}) => {
  const { state } = useAppContext();
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentMethodRecords, setPaymentMethodRecords] = useState<CarWashRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState<CarWashRecord[]>([]);

  // Состояния для мобильной навигации
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDaysList, setShowMobileDaysList] = useState(false);
  const [showMobileDayDetails, setShowMobileDayDetails] = useState(false);

  // Проверка размера экрана
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // sm breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // При открытии модального окна показываем соответствующий интерфейс
  React.useEffect(() => {
    if (isOpen) {
      if (isMobile) {
        setShowMobileDaysList(true);
        setShowMobileDayDetails(false);
      }
      setSelectedDate(null);
      setSelectedDateRecords([]);
    }
  }, [isOpen, isMobile]);

  const toggleRecordExpansion = (recordId: string) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd MMMM yyyy', { locale: ru });
  };

  const getPaymentMethodLabel = (method: string, organizationId?: string) => {
    switch (method) {
      case 'cash':
        return 'Наличные';
      case 'card':
        return 'Карта';
      case 'organization':
        if (organizationId) {
          const organization = state.organizations.find(org => org.id === organizationId);
          return organization ? organization.name : 'Организация';
        }
        return 'Организация';
      default:
        return method;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    if (state.theme === 'dark') {
      switch (method) {
        case 'cash':
          return 'text-green-300 bg-green-500/10 border-green-500/20';
        case 'card':
          return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
        case 'organization':
          return 'text-purple-300 bg-purple-500/10 border-purple-500/20';
        default:
          return 'text-gray-300 bg-gray-500/10 border-gray-500/20';
      }
    } else if (state.theme === 'black') {
      switch (method) {
        case 'cash':
          return 'text-green-400 bg-green-500/5 border-green-500/30';
        case 'card':
          return 'text-blue-400 bg-blue-500/5 border-blue-500/30';
        case 'organization':
          return 'text-purple-400 bg-purple-500/5 border-purple-500/30';
        default:
          return 'text-gray-400 bg-gray-500/5 border-gray-500/30';
      }
    } else {
      switch (method) {
        case 'cash':
          return 'text-green-600 bg-green-50 border-green-200';
        case 'card':
          return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'organization':
          return 'text-purple-600 bg-purple-50 border-purple-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    }
  };

  // Функция для обработки клика по способу оплаты
  const handlePaymentMethodClick = (method: string, records: CarWashRecord[]) => {
    setSelectedPaymentMethod(method);
    setPaymentMethodRecords(records);
    setShowAnalytics(false);
    setShowPaymentDetail(true);
  };

  // Функция для закрытия детального окна способа оплаты
  const handleClosePaymentDetail = () => {
    setShowPaymentDetail(false);
    setShowAnalytics(true);
  };

  // Функция для обработки клика по дню
  const handleDayClick = (date: string, dayRecords: CarWashRecord[]) => {
    setSelectedDate(date);
    setSelectedDateRecords(dayRecords);

    // На мобильных переходим к деталям дня
    if (isMobile) {
      setShowMobileDaysList(false);
      setShowMobileDayDetails(true);
    }
  };

  // Функция для возврата к списку дней на мобильных
  const handleMobileBackToDaysList = () => {
    setShowMobileDayDetails(false);
    setShowMobileDaysList(true);
    setSelectedDate(null);
    setSelectedDateRecords([]);
  };

  // Функция для закрытия всех мобильных модальных окон
  const handleMobileClose = () => {
    setShowMobileDaysList(false);
    setShowMobileDayDetails(false);
    setSelectedDate(null);
    setSelectedDateRecords([]);
    onClose();
  };

  // Функция для расчёта заработка сотрудника от конкретной записи
  const calculateEmployeeEarnings = (record: CarWashRecord, employeeId: string) => {
    const recordDate = typeof record.date === 'string' ? record.date : format(record.date, 'yyyy-MM-dd');

    // Определяем роль сотрудника на дату записи
    const employeeRole = dailyRoles[recordDate]?.[employeeId] || 'washer';

    // Всегда используем выбранный метод (минималка + %)
    const methodToUse = state.salaryCalculationMethod;

    if (methodToUse === 'minimumWithPercentage') {
      if (employeeRole === 'washer') {
        // Мойщик получает процент от стоимости услуги
        const washerShare = record.price / record.employeeIds.length;
        const washerEarnings = washerShare * (state.minimumPaymentSettings.percentageWasher / 100);
        return washerEarnings;
      } else if (employeeRole === 'admin') {
        // Админ получает процент только если он участвовал в мойке этого авто
        if (record.employeeIds.includes(employeeId)) {
          const adminShare = record.price / record.employeeIds.length;
          const adminEarnings = adminShare * (state.minimumPaymentSettings.adminCarWashPercentage / 100);
          return adminEarnings;
        }
        return 0; // Админ не участвовал в мойке этого авто
      }
    }

    // Если метод не выбран или неизвестен, возвращаем 0
    return 0;
  };

  // Группировка записей по дням
  const groupedRecords = records.reduce((groups, record) => {
    const date = typeof record.date === 'string' ? record.date : format(record.date, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {} as Record<string, CarWashRecord[]>);

  // Сортировка дат
  const sortedDates = Object.keys(groupedRecords).sort((a, b) => b.localeCompare(a));

  // Сортируем записи в каждом дне по времени
  Object.keys(groupedRecords).forEach(date => {
    groupedRecords[date].sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return a.time.localeCompare(b.time);
    });
  });

  // Детальная статистика
  const statistics = useMemo(() => {
    const totalRecords = records.length;
    const totalRevenue = records.reduce((sum, record) => {
      return sum + (record.price / record.employeeIds.length);
    }, 0);

    const totalEarnings = records.reduce((sum, record) => {
      return sum + calculateEmployeeEarnings(record, employee.id);
    }, 0);

    // Статистика по способам оплаты
    const paymentStats = records.reduce((stats, record) => {
      const method = record.paymentMethod.type;
      const share = record.price / record.employeeIds.length;

      if (!stats[method]) {
        stats[method] = { count: 0, revenue: 0, earnings: 0, records: [] };
      }

      stats[method].count++;
      stats[method].revenue += share;
      stats[method].earnings += calculateEmployeeEarnings(record, employee.id);
      stats[method].records.push(record);

      return stats;
    }, {} as Record<string, { count: number; revenue: number; earnings: number; records: CarWashRecord[] }>);

    // Статистика по дням недели
    const weekdayStats = records.reduce((stats, record) => {
      const date = typeof record.date === 'string' ? parseISO(record.date) : record.date;
      const weekday = format(date, 'EEEE', { locale: ru });
      const share = record.price / record.employeeIds.length;

      if (!stats[weekday]) {
        stats[weekday] = { count: 0, revenue: 0, earnings: 0 };
      }

      stats[weekday].count++;
      stats[weekday].revenue += share;
      stats[weekday].earnings += calculateEmployeeEarnings(record, employee.id);

      return stats;
    }, {} as Record<string, { count: number; revenue: number; earnings: number }>);

    // Статистика по времени
    const hourlyStats = records.reduce((stats, record) => {
      if (!record.time) return stats;

      const hour = parseInt(record.time.split(':')[0]);
      const timeSlot = `${hour}:00-${hour + 1}:00`;
      const share = record.price / record.employeeIds.length;

      if (!stats[timeSlot]) {
        stats[timeSlot] = { count: 0, revenue: 0, earnings: 0 };
      }

      stats[timeSlot].count++;
      stats[timeSlot].revenue += share;
      stats[timeSlot].earnings += calculateEmployeeEarnings(record, employee.id);

      return stats;
    }, {} as Record<string, { count: number; revenue: number; earnings: number }>);

    // Самые популярные услуги
    const serviceStats = records.reduce((stats, record) => {
      const service = record.service || 'Не указано';
      const share = record.price / record.employeeIds.length;

      if (!stats[service]) {
        stats[service] = { count: 0, revenue: 0, earnings: 0 };
      }

      stats[service].count++;
      stats[service].revenue += share;
      stats[service].earnings += calculateEmployeeEarnings(record, employee.id);

      return stats;
    }, {} as Record<string, { count: number; revenue: number; earnings: number }>);

    // Средние показатели
    const averageRevenue = totalRecords > 0 ? totalRevenue / totalRecords : 0;
    const averageEarnings = totalRecords > 0 ? totalEarnings / totalRecords : 0;

    // Лучший день
    const bestDay = Object.entries(groupedRecords).reduce((best, [date, dayRecords]) => {
      const dayRevenue = dayRecords.reduce((sum, record) => sum + (record.price / record.employeeIds.length), 0);
      const dayEarnings = dayRecords.reduce((sum, record) => sum + calculateEmployeeEarnings(record, employee.id), 0);

      if (dayEarnings > (best.earnings || 0)) {
        return { date, count: dayRecords.length, revenue: dayRevenue, earnings: dayEarnings };
      }
      return best;
    }, {} as { date?: string; count?: number; revenue?: number; earnings?: number });

    return {
      totalRecords,
      totalRevenue,
      totalEarnings,
      averageRevenue,
      averageEarnings,
      paymentStats,
      weekdayStats,
      hourlyStats,
      serviceStats,
      bestDay
    };
  }, [records, employee.id, dailyRoles]);

  if (!isOpen) return null;

  return (
    <>
      {/* Для мобильных устройств */}
      {isMobile ? (
        <>
          {/* Мобильное модальное окно со списком дней */}
          <MobileDaysListModal
            isOpen={showMobileDaysList && isOpen}
            onClose={handleMobileClose}
            employee={employee}
            groupedRecords={groupedRecords}
            sortedDates={sortedDates}
            periodLabel={periodLabel}
            calculateEmployeeEarnings={calculateEmployeeEarnings}
            onDayClick={handleDayClick}
          />

          {/* Мобильное модальное окно с деталями дня */}
          <MobileDayDetailsModal
            isOpen={showMobileDayDetails && selectedDate !== null}
            onClose={handleMobileClose}
            onBack={handleMobileBackToDaysList}
            employee={employee}
            selectedDate={selectedDate || ''}
            selectedDateRecords={selectedDateRecords}
            calculateEmployeeEarnings={calculateEmployeeEarnings}
          />
        </>
      ) : (
        /* Для десктопных устройств - двухколоночный интерфейс */
        <DailyBreakdownModal
          isOpen={isOpen}
          onClose={onClose}
          employee={employee}
          groupedRecords={groupedRecords}
          sortedDates={sortedDates}
          periodLabel={periodLabel}
          dailyRoles={dailyRoles}
          calculateEmployeeEarnings={calculateEmployeeEarnings}
          onDayClick={handleDayClick}
          selectedDate={selectedDate}
          selectedDateRecords={selectedDateRecords}
          showAnalyticsButton={true}
          onAnalyticsClick={() => setShowAnalytics(true)}
        />
      )}

      {/* Модальное окно аналитики */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        employee={employee}
        statistics={statistics}
        periodLabel={periodLabel}
        onPaymentMethodClick={handlePaymentMethodClick}
      />

      {/* Модальное окно деталей способа оплаты */}
      <PaymentMethodDetailModal
        isOpen={showPaymentDetail}
        onClose={handleClosePaymentDetail}
        paymentMethod={selectedPaymentMethod}
        records={paymentMethodRecords}
        employee={employee}
        periodLabel={periodLabel}
      />

    </>
  );
};

export default EmployeeRecordsModal;
