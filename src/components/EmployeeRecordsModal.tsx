import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Calendar, Clock, Car, Wrench, CreditCard, Users, TrendingUp, DollarSign, BarChart3, PieChart, Star, Target } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'records' | 'analytics'>('records');

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
        stats[method] = { count: 0, revenue: 0, earnings: 0 };
      }

      stats[method].count++;
      stats[method].revenue += share;
      stats[method].earnings += calculateEmployeeEarnings(record, employee.id);

      return stats;
    }, {} as Record<string, { count: number; revenue: number; earnings: number }>);

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

          {/* Расширенная статистика */}
          <div className="p-6 border-b border-border bg-secondary/20">
            {/* Основные показатели */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-card rounded-lg border">
                <Car className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold text-primary">{statistics.totalRecords}</div>
                <div className="text-sm text-muted-foreground">Помытых машин</div>
              </div>
              <div className="text-center p-3 bg-card rounded-lg border">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-600">{statistics.totalRevenue.toFixed(2)} BYN</div>
                <div className="text-sm text-muted-foreground">Доля выручки</div>
              </div>
              <div className="text-center p-3 bg-card rounded-lg border">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">{statistics.totalEarnings.toFixed(2)} BYN</div>
                <div className="text-sm text-muted-foreground">Заработок</div>
              </div>
              <div className="text-center p-3 bg-card rounded-lg border">
                <Target className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold text-orange-600">{statistics.averageEarnings.toFixed(2)} BYN</div>
                <div className="text-sm text-muted-foreground">Средний заработок</div>
              </div>
            </div>

            {/* Лучший день */}
            {statistics.bestDay.date && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Лучший день</span>
                </div>
                <div className="text-sm text-yellow-700">
                  <span className="font-medium">{format(parseISO(statistics.bestDay.date), 'dd MMMM yyyy', { locale: ru })}</span>
                  {' — '}
                  <span>{statistics.bestDay.count} машин, заработок {statistics.bestDay.earnings?.toFixed(2)} BYN</span>
                </div>
              </div>
            )}

            {/* Статистика по способам оплаты */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Способы оплаты
                </h4>
                <div className="space-y-2">
                  {Object.entries(statistics.paymentStats).map(([method, stats]) => (
                    <div key={method} className="flex justify-between items-center p-2 bg-card rounded border">
                      <span className={`px-2 py-1 rounded text-xs ${
                        method === 'cash' ? 'bg-green-100 text-green-800' :
                        method === 'card' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {method === 'cash' ? 'Наличные' : method === 'card' ? 'Карта' : 'Организация'}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-medium">{stats.count} записей</div>
                        <div className="text-xs text-muted-foreground">{stats.earnings.toFixed(2)} BYN</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Популярные услуги
                </h4>
                <div className="space-y-2">
                  {Object.entries(statistics.serviceStats)
                    .sort(([,a], [,b]) => b.count - a.count)
                    .slice(0, 5)
                    .map(([service, stats]) => (
                    <div key={service} className="flex justify-between items-center p-2 bg-card rounded border">
                      <span className="text-sm font-medium truncate flex-1 mr-2">{service}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">{stats.count} раз</div>
                        <div className="text-xs text-muted-foreground">{stats.earnings.toFixed(2)} BYN</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Вкладки */}
          <div className="border-b border-border">
            <div className="flex">
              <button
                onClick={() => setActiveTab('records')}
                className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'records'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Записи ({statistics.totalRecords})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'analytics'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Аналитика
                </div>
              </button>
            </div>
          </div>

          {/* Содержимое с прокруткой */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'records' ? (
              // Вкладка "Записи"
              statistics.totalRecords === 0 ? (
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
                            {groupedRecords[date].length} записей, заработок: {' '}
                            {groupedRecords[date].reduce((sum, record) => sum + calculateEmployeeEarnings(record, employee.id), 0).toFixed(2)} BYN
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
                                    <div className="font-medium">{record.price.toFixed(2)} BYN</div>
                                    <div className="text-xs text-muted-foreground">
                                      Заработок: {calculateEmployeeEarnings(record, employee.id).toFixed(2)} BYN
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
                                            {((employeeShare / record.price) * 100).toFixed(1)}% ({employeeShare.toFixed(2)} BYN)
                                          </span>
                                        </div>

                                        <div>
                                          <span className="font-medium">Заработок сотрудника:</span>
                                          <span className="ml-2 text-lg font-bold text-blue-600">
                                            {calculateEmployeeEarnings(record, employee.id).toFixed(2)} BYN
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
              )
            ) : (
              // Вкладка "Аналитика"
              <div className="space-y-6">
                {/* Аналитика по дням недели */}
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Активность по дням недели
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(statistics.weekdayStats)
                      .sort(([,a], [,b]) => b.count - a.count)
                      .map(([weekday, stats]) => (
                      <div key={weekday} className="p-4 bg-card border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium capitalize">{weekday}</span>
                          <span className="text-sm text-muted-foreground">{stats.count} машин</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Выручка: {stats.revenue.toFixed(2)} BYN</span>
                          <span className="text-blue-600 font-medium">Заработок: {stats.earnings.toFixed(2)} BYN</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Аналитика по времени */}
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Активность по времени
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(statistics.hourlyStats)
                      .sort(([,a], [,b]) => b.count - a.count)
                      .slice(0, 9)
                      .map(([timeSlot, stats]) => (
                      <div key={timeSlot} className="p-3 bg-card border rounded-lg text-center">
                        <div className="font-medium text-sm mb-1">{timeSlot}</div>
                        <div className="text-lg font-bold text-primary">{stats.count}</div>
                        <div className="text-xs text-muted-foreground">машин</div>
                        <div className="text-sm text-blue-600 font-medium mt-1">
                          {stats.earnings.toFixed(2)} BYN
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Детальная статистика по услугам */}
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" />
                    Детальная статистика по услугам
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(statistics.serviceStats)
                      .sort(([,a], [,b]) => b.earnings - a.earnings)
                      .map(([service, stats]) => (
                      <div key={service} className="p-4 bg-card border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium flex-1">{service}</h5>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">{stats.earnings.toFixed(2)} BYN</div>
                            <div className="text-sm text-muted-foreground">заработок</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Количество:</span>
                            <div className="font-medium">{stats.count} раз</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Доля выручки:</span>
                            <div className="font-medium">{stats.revenue.toFixed(2)} BYN</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Средний заработок:</span>
                            <div className="font-medium">{(stats.earnings / stats.count).toFixed(2)} BYN</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmployeeRecordsModal;
