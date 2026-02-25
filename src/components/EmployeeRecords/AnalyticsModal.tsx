import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppContext } from '@/lib/context/AppContext';
import { getPaymentMethodLabel } from './utils';
import type { AnalyticsModalProps } from './types';

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
                          {getPaymentMethodLabel(method, state.organizations)}
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

export default AnalyticsModal;
