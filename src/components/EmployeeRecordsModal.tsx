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

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Наличные';
      case 'card': return 'Карта';
      case 'organization': return 'Организация';
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
          className={`w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden ${
            state.theme === 'dark'
              ? 'bg-slate-900 border border-slate-700'
              : state.theme === 'black'
              ? 'bg-black border border-gray-800'
              : 'bg-white border border-gray-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Заголовок */}
          <div className={`p-4 border-b ${
            state.theme === 'dark'
              ? 'border-slate-700 bg-slate-800/50'
              : state.theme === 'black'
              ? 'border-gray-800 bg-gray-900/50'
              : 'border-gray-200 bg-gray-50/50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors ${
                    state.theme === 'dark'
                      ? 'hover:bg-slate-700 text-gray-300'
                      : state.theme === 'black'
                      ? 'hover:bg-gray-800 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
                <div className={`p-2 rounded-lg border ${getPaymentMethodColor(paymentMethod)}`}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${
                    state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    {getPaymentMethodLabel(paymentMethod)} • {employee.name}
                  </h2>
                  <p className={`text-sm ${
                    state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {periodLabel} • {records.length} записей
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  state.theme === 'dark'
                    ? 'hover:bg-slate-700 text-gray-300'
                    : state.theme === 'black'
                    ? 'hover:bg-gray-800 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Статистика по способу оплаты */}
          <div className={`p-4 border-b ${
            state.theme === 'dark'
              ? 'border-slate-700 bg-slate-800/20'
              : state.theme === 'black'
              ? 'border-gray-800 bg-gray-900/20'
              : 'border-gray-200 bg-gray-50/20'
          }`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`text-center p-3 rounded-lg border ${getPaymentMethodColor(paymentMethod)}`}>
                <Car className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xl font-bold">
                  {records.length}
                </div>
                <div className="text-xs">
                  Записей
                </div>
              </div>

              <div className={`text-center p-3 rounded-lg border ${getPaymentMethodColor(paymentMethod)}`}>
                <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xl font-bold">
                  {records.reduce((sum, record) => sum + (record.price / record.employeeIds.length), 0).toFixed(0)}
                </div>
                <div className="text-xs">
                  Выручка BYN
                </div>
              </div>

              <div className={`text-center p-3 rounded-lg border ${getPaymentMethodColor(paymentMethod)}`}>
                <DollarSign className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xl font-bold">
                  {records.length > 0 ? (records.reduce((sum, record) => sum + (record.price / record.employeeIds.length), 0) / records.length).toFixed(0) : '0'}
                </div>
                <div className="text-xs">
                  Среднее BYN
                </div>
              </div>

              <div className={`text-center p-3 rounded-lg border ${getPaymentMethodColor(paymentMethod)}`}>
                <Target className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xl font-bold">
                  {new Set(records.map(r => r.service)).size}
                </div>
                <div className="text-xs">
                  Услуг
                </div>
              </div>
            </div>
          </div>

          {/* Список записей */}
          <div className="overflow-y-auto max-h-[calc(95vh-220px)] p-4">
            <div className="space-y-3">
              {records.map(record => (
                <div
                  key={record.id}
                  className={`p-4 rounded-lg border ${
                    state.theme === 'dark'
                      ? 'border-slate-700 bg-slate-800/30'
                      : state.theme === 'black'
                      ? 'border-gray-800 bg-gray-900/30'
                      : 'border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className={`${
                          state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {format(parseISO(typeof record.date === 'string' ? record.date : format(record.date, 'yyyy-MM-dd')), 'dd MMMM yyyy', { locale: ru })}
                        </span>
                        {record.time && (
                          <>
                            <Clock className="w-4 h-4 text-blue-500 ml-2" />
                            <span className={`${
                              state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {record.time}
                            </span>
                          </>
                        )}
                      </div>

                      <div className={`font-medium ${
                        state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {record.carInfo}
                      </div>

                      <div className={`text-sm ${
                        state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {record.service}
                      </div>

                      {record.paymentMethod.organizationName && (
                        <div className={`text-sm ${
                          state.theme === 'dark' ? 'text-purple-300' : state.theme === 'black' ? 'text-purple-400' : 'text-purple-600'
                        }`}>
                          {record.paymentMethod.organizationName}
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-green-500">
                        {record.price.toFixed(2)} BYN
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
          className={`w-full max-w-4xl max-h-[90vh] rounded-lg shadow-lg overflow-hidden ${
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
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-3">
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
                          {method === 'cash' ? 'Наличные' : method === 'card' ? 'Карта' : 'Организация'}
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

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Наличные';
      case 'card':
        return 'Карта';
      case 'organization':
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

  // Функция для расчёта заработка сотрудника от конкретной записи
  const calculateEmployeeEarnings = (record: CarWashRecord, employeeId: string) => {
    const recordDate = typeof record.date === 'string' ? record.date : format(record.date, 'yyyy-MM-dd');

    // Определяем роль сотрудника на дату записи
    const employeeRole = dailyRoles[recordDate]?.[employeeId] || 'washer';

    // Определяем метод расчета зарплаты
    const shouldUseCurrentMethod = recordDate >= state.salaryCalculationDate;
    const methodToUse = shouldUseCurrentMethod ? state.salaryCalculationMethod : 'percentage';

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
    } else if (methodToUse === 'percentage') {
      // 27% от общей выручки - но от конкретного авто считаем пропорционально
      const employeeShare = record.price / record.employeeIds.length;
      return employeeShare * 0.27;
    } else if (methodToUse === 'fixedPlusPercentage') {
      // 10% от выручки за авто для сотрудника
      const employeeShare = record.price / record.employeeIds.length;
      return employeeShare * 0.1;
    }

    // Fallback
    const employeeShare = record.price / record.employeeIds.length;
    return employeeShare * 0.27;
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
      <AnimatePresence>
        {/* Основное модальное окно */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden ${
              state.theme === 'dark'
                ? 'bg-slate-900 border border-slate-700'
                : state.theme === 'black'
                ? 'bg-black border border-gray-800'
                : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Компактный заголовок */}
            <div className={`p-4 border-b ${
              state.theme === 'dark'
                ? 'border-slate-700 bg-slate-800/30'
                : state.theme === 'black'
                ? 'border-gray-800 bg-gray-900/30'
                : 'border-gray-200 bg-gray-50/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    state.theme === 'dark'
                      ? 'bg-blue-500/10 text-blue-400'
                      : state.theme === 'black'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${
                      state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {employee.name}
                    </h2>
                    <p className={`text-sm ${
                      state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {periodLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAnalytics(true)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      state.theme === 'dark'
                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                        : state.theme === 'black'
                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 mr-2 inline" />
                    Аналитика
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-colors ${
                      state.theme === 'dark'
                        ? 'hover:bg-slate-700 text-gray-300'
                        : state.theme === 'black'
                        ? 'hover:bg-gray-800 text-gray-400'
                        : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Компактная статистика */}
            <div className={`p-4 border-b ${
              state.theme === 'dark'
                ? 'border-slate-700 bg-slate-800/20'
                : state.theme === 'black'
                ? 'border-gray-800 bg-gray-900/20'
                : 'border-gray-200 bg-gray-50/20'
            }`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`text-center p-3 rounded-lg border ${
                  state.theme === 'dark'
                    ? 'bg-slate-800 border-slate-600'
                    : state.theme === 'black'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                  <Car className={`w-5 h-5 mx-auto mb-1 ${
                    state.theme === 'dark' ? 'text-blue-400' : state.theme === 'black' ? 'text-blue-300' : 'text-blue-600'
                  }`} />
                  <div className={`text-xl font-bold ${
                    state.theme === 'dark' ? 'text-blue-400' : state.theme === 'black' ? 'text-blue-300' : 'text-blue-600'
                  }`}>
                    {statistics.totalRecords}
                  </div>
                  <div className={`text-xs ${
                    state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Машин
                  </div>
                </div>

                <div className={`text-center p-3 rounded-lg border ${
                  state.theme === 'dark'
                    ? 'bg-slate-800 border-slate-600'
                    : state.theme === 'black'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                  <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${
                    state.theme === 'dark' ? 'text-green-400' : state.theme === 'black' ? 'text-green-300' : 'text-green-600'
                  }`} />
                  <div className={`text-xl font-bold ${
                    state.theme === 'dark' ? 'text-green-400' : state.theme === 'black' ? 'text-green-300' : 'text-green-600'
                  }`}>
                    {statistics.totalRevenue.toFixed(0)}
                  </div>
                  <div className={`text-xs ${
                    state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Выручка BYN
                  </div>
                </div>

                <div className={`text-center p-3 rounded-lg border ${
                  state.theme === 'dark'
                    ? 'bg-slate-800 border-slate-600'
                    : state.theme === 'black'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                  <DollarSign className={`w-5 h-5 mx-auto mb-1 ${
                    state.theme === 'dark' ? 'text-orange-400' : state.theme === 'black' ? 'text-orange-300' : 'text-orange-600'
                  }`} />
                  <div className={`text-xl font-bold ${
                    state.theme === 'dark' ? 'text-orange-400' : state.theme === 'black' ? 'text-orange-300' : 'text-orange-600'
                  }`}>
                    {statistics.totalEarnings.toFixed(0)}
                  </div>
                  <div className={`text-xs ${
                    state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Заработок BYN
                  </div>
                </div>

                <div className={`text-center p-3 rounded-lg border ${
                  state.theme === 'dark'
                    ? 'bg-slate-800 border-slate-600'
                    : state.theme === 'black'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                  <Target className={`w-5 h-5 mx-auto mb-1 ${
                    state.theme === 'dark' ? 'text-purple-400' : state.theme === 'black' ? 'text-purple-300' : 'text-purple-600'
                  }`} />
                  <div className={`text-xl font-bold ${
                    state.theme === 'dark' ? 'text-purple-400' : state.theme === 'black' ? 'text-purple-300' : 'text-purple-600'
                  }`}>
                    {statistics.averageEarnings.toFixed(0)}
                  </div>
                  <div className={`text-xs ${
                    state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Среднее BYN
                  </div>
                </div>
              </div>
            </div>

            {/* Содержимое с записями */}
            <div className="flex-1 overflow-y-auto max-h-[calc(95vh-220px)] p-4">
              {statistics.totalRecords === 0 ? (
                <div className={`text-center py-8 ${
                  state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет записей за выбранный период</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDates.map(date => (
                    <motion.div
                      key={date}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-xl overflow-hidden ${
                        state.theme === 'dark'
                          ? 'border-slate-700'
                          : state.theme === 'black'
                          ? 'border-gray-800'
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Заголовок дня */}
                      <div className={`p-3 border-b ${
                        state.theme === 'dark'
                          ? 'bg-slate-800/50 border-slate-700'
                          : state.theme === 'black'
                          ? 'bg-gray-900/50 border-gray-800'
                          : 'bg-gray-50/50 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <span className={`font-medium ${
                              state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                            }`}>
                              {formatDate(date)}
                            </span>
                          </div>
                          <div className={`text-sm ${
                            state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {groupedRecords[date].length} записей • {' '}
                            <span className="font-medium text-green-500">
                              {groupedRecords[date].reduce((sum, record) => sum + calculateEmployeeEarnings(record, employee.id), 0).toFixed(2)} BYN
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Записи дня */}
                      <div className={`divide-y ${
                        state.theme === 'dark'
                          ? 'divide-slate-700'
                          : state.theme === 'black'
                          ? 'divide-gray-800'
                          : 'divide-gray-200'
                      }`}>
                        {groupedRecords[date].map(record => {
                          const isExpanded = expandedRecords.has(record.id);
                          const employeeShare = record.price / record.employeeIds.length;

                          return (
                            <motion.div
                              key={record.id}
                              className={`p-3 transition-colors ${
                                state.theme === 'dark'
                                  ? 'hover:bg-slate-800/30'
                                  : state.theme === 'black'
                                  ? 'hover:bg-gray-900/30'
                                  : 'hover:bg-gray-50/50'
                              }`}
                            >
                              {/* Основная информация записи */}
                              <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleRecordExpansion(record.id)}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronRight className={`w-4 h-4 ${
                                      state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                                    }`} />
                                  </motion.div>

                                  <div className={`flex items-center gap-2 text-sm ${
                                    state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                                  }`}>
                                    <Clock className="w-3 h-3" />
                                    {record.time || '—'}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className={`font-medium truncate ${
                                      state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                                    }`}>
                                      {record.carInfo}
                                    </div>
                                    <div className={`text-sm truncate ${
                                      state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                                    }`}>
                                      {record.service}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className={`font-medium ${
                                      state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                                    }`}>
                                      {record.price.toFixed(2)} BYN
                                    </div>
                                    <div className="text-xs text-green-500 font-medium">
                                      +{calculateEmployeeEarnings(record, employee.id).toFixed(2)} BYN
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Развернутая информация */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-3 pl-7 border-l-2 border-blue-500/30"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <Car className={`w-4 h-4 ${
                                            state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                                          }`} />
                                          <span className={`font-medium ${
                                            state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-700'
                                          }`}>
                                            Автомобиль:
                                          </span>
                                          <span className={`${
                                            state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                                          }`}>
                                            {record.carInfo}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <Wrench className={`w-4 h-4 ${
                                            state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                                          }`} />
                                          <span className={`font-medium ${
                                            state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-700'
                                          }`}>
                                            Услуга:
                                          </span>
                                          <span className={`${
                                            state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                                          }`}>
                                            {record.service}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <CreditCard className={`w-4 h-4 ${
                                            state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                                          }`} />
                                          <span className={`font-medium ${
                                            state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-700'
                                          }`}>
                                            Оплата:
                                          </span>
                                          <span className={`px-2 py-1 rounded-md text-xs border ${getPaymentMethodColor(record.paymentMethod.type)}`}>
                                            {getPaymentMethodLabel(record.paymentMethod.type)}
                                            {record.paymentMethod.organizationName && ` (${record.paymentMethod.organizationName})`}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <Users className={`w-4 h-4 ${
                                            state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-500'
                                          }`} />
                                          <span className={`font-medium ${
                                            state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-700'
                                          }`}>
                                            Сотрудников:
                                          </span>
                                          <span className={`${
                                            state.theme === 'dark' ? 'text-white' : state.theme === 'black' ? 'text-gray-100' : 'text-gray-900'
                                          }`}>
                                            {record.employeeIds.length}
                                          </span>
                                        </div>

                                        <div>
                                          <span className={`font-medium ${
                                            state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-700'
                                          }`}>
                                            Общая стоимость:
                                          </span>
                                          <span className={`ml-2 text-lg font-bold ${
                                            state.theme === 'dark' ? 'text-blue-400' : state.theme === 'black' ? 'text-blue-300' : 'text-blue-600'
                                          }`}>
                                            {record.price.toFixed(2)} BYN
                                          </span>
                                        </div>

                                        <div>
                                          <span className={`font-medium ${
                                            state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-700'
                                          }`}>
                                            Заработок сотрудника:
                                          </span>
                                          <span className="ml-2 text-lg font-bold text-green-500">
                                            {calculateEmployeeEarnings(record, employee.id).toFixed(2)} BYN
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {record.notes && (
                                      <div className={`mt-3 p-3 rounded-lg ${
                                        state.theme === 'dark'
                                          ? 'bg-slate-800/50'
                                          : state.theme === 'black'
                                          ? 'bg-gray-900/50'
                                          : 'bg-gray-50'
                                      }`}>
                                        <span className={`font-medium text-sm ${
                                          state.theme === 'dark' ? 'text-gray-300' : state.theme === 'black' ? 'text-gray-400' : 'text-gray-700'
                                        }`}>
                                          Примечания:
                                        </span>
                                        <p className={`text-sm mt-1 ${
                                          state.theme === 'dark' ? 'text-gray-400' : state.theme === 'black' ? 'text-gray-500' : 'text-gray-600'
                                        }`}>
                                          {record.notes}
                                        </p>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

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
