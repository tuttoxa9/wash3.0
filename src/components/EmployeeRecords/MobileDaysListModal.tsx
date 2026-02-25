import React from 'react';
import { X, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { CarWashRecord, Employee } from '@/lib/types';

interface MobileDaysListModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  groupedRecords: Record<string, CarWashRecord[]>;
  sortedDates: string[];
  periodLabel: string;
  calculateEmployeeEarnings: (record: CarWashRecord, employeeId: string) => number;
  onDayClick: (date: string, dayRecords: CarWashRecord[]) => void;
  onAnalyticsClick: () => void;
}

const MobileDaysListModal: React.FC<MobileDaysListModalProps> = ({
  isOpen,
  onClose,
  employee,
  groupedRecords,
  sortedDates,
  periodLabel,
  calculateEmployeeEarnings,
  onDayClick,
  onAnalyticsClick
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
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAnalyticsClick}
                  className="px-3 py-1.5 rounded-md font-medium text-sm transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
                >
                  <BarChart3 className="w-4 h-4 mr-1 inline" />
                  Аналитика
                </motion.button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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

export default MobileDaysListModal;
