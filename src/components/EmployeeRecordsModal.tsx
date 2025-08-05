import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, Calendar, Clock, Car, Wrench, CreditCard, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { CarWashRecord, Employee } from '@/lib/types';

interface EmployeeRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  records: CarWashRecord[];
  periodLabel: string;
}

const EmployeeRecordsModal: React.FC<EmployeeRecordsModalProps> = ({
  isOpen,
  onClose,
  employee,
  records,
  periodLabel
}) => {
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

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

  const totalRecords = records.length;
  const totalRevenue = records.reduce((sum, record) => {
    // Рассчитываем долю сотрудника в записи
    return sum + (record.price / record.employeeIds.length);
  }, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Заголовок */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
            <div>
              <h2 className="text-xl font-bold text-foreground">{employee.name}</h2>
              <p className="text-sm text-muted-foreground">
                Записи за период: {periodLabel}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Статистика */}
          <div className="p-6 border-b border-border bg-secondary/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalRecords}</div>
                <div className="text-sm text-muted-foreground">Всего записей</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalRevenue.toFixed(2)} BYN</div>
                <div className="text-sm text-muted-foreground">Доля выручки</div>
              </div>
            </div>
          </div>

          {/* Содержимое с прокруткой */}
          <div className="flex-1 overflow-y-auto p-6">
            {totalRecords === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Нет записей за выбранный период</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedDates.map(date => (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    {/* Заголовок дня */}
                    <div className="bg-muted/50 p-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">{formatDate(date)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {groupedRecords[date].length} записей
                        </div>
                      </div>
                    </div>

                    {/* Записи дня */}
                    <div className="divide-y divide-border">
                      {groupedRecords[date].map(record => {
                        const isExpanded = expandedRecords.has(record.id);
                        const employeeShare = record.price / record.employeeIds.length;

                        return (
                          <motion.div
                            key={record.id}
                            className="p-4 hover:bg-muted/30 transition-colors"
                          >
                            {/* Основная информация записи */}
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => toggleRecordExpansion(record.id)}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <motion.div
                                  animate={{ rotate: isExpanded ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </motion.div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {record.time || '—'}
                                </div>

                                <div className="flex-1">
                                  <div className="font-medium">{record.carInfo}</div>
                                  <div className="text-sm text-muted-foreground">{record.service}</div>
                                </div>

                                <div className="text-right">
                                  <div className="font-medium">{employeeShare.toFixed(2)} BYN</div>
                                  <div className="text-xs text-muted-foreground">
                                    из {record.price.toFixed(2)} BYN
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
                                  className="mt-4 pl-8 border-l-2 border-primary/20"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Car className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">Автомобиль:</span>
                                        <span>{record.carInfo}</span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <Wrench className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">Услуга:</span>
                                        <span>{record.service}</span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">Оплата:</span>
                                        <span className={`px-2 py-1 rounded-md text-xs border ${getPaymentMethodColor(record.paymentMethod.type)}`}>
                                          {getPaymentMethodLabel(record.paymentMethod.type)}
                                          {record.paymentMethod.organizationName && ` (${record.paymentMethod.organizationName})`}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">Сотрудников:</span>
                                        <span>{record.employeeIds.length}</span>
                                      </div>

                                      <div>
                                        <span className="font-medium">Общая стоимость:</span>
                                        <span className="ml-2 text-lg font-bold text-primary">
                                          {record.price.toFixed(2)} BYN
                                        </span>
                                      </div>

                                      <div>
                                        <span className="font-medium">Доля сотрудника:</span>
                                        <span className="ml-2 text-lg font-bold text-green-600">
                                          {employeeShare.toFixed(2)} BYN
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {record.notes && (
                                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                      <span className="font-medium text-sm">Примечания:</span>
                                      <p className="text-sm text-muted-foreground mt-1">{record.notes}</p>
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
  );
};

export default EmployeeRecordsModal;
