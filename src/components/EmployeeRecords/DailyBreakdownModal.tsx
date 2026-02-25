import React from 'react';
import { X, Calendar, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppContext } from '@/lib/context/AppContext';
import { getPaymentMethodColor, getPaymentMethodLabel } from './utils';
import type { DailyBreakdownModalProps } from './types';

const DailyBreakdownModal: React.FC<DailyBreakdownModalProps> = ({
  isOpen,
  onClose,
  employee,
  groupedRecords,
  sortedDates,
  periodLabel,
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
                            <span className={`px-2 py-0.5 rounded text-xs border ${getPaymentMethodColor(record.paymentMethod.type, state.theme)}`}>
                              {getPaymentMethodLabel(record.paymentMethod.type, state.organizations, record.paymentMethod.organizationId)}
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

export default DailyBreakdownModal;
