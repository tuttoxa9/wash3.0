import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { CarWashRecord, Employee } from '@/lib/types';
import { useAppContext } from '@/lib/context/AppContext';

// Import sub-components
import MobileDaysListModal from './EmployeeRecords/MobileDaysListModal';
import MobileDayDetailsModal from './EmployeeRecords/MobileDayDetailsModal';
import DailyBreakdownModal from './EmployeeRecords/DailyBreakdownModal';
import AnalyticsModal from './EmployeeRecords/AnalyticsModal';
import PaymentMethodDetailModal from './EmployeeRecords/PaymentMethodDetailModal';

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
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // sm breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // При открытии модального окна показываем соответствующий интерфейс
  useEffect(() => {
    if (isOpen) {
      if (isMobile) {
        setShowMobileDaysList(true);
        setShowMobileDayDetails(false);
      }
      setSelectedDate(null);
      setSelectedDateRecords([]);
    }
  }, [isOpen, isMobile]);

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
  const calculateEmployeeEarnings = React.useCallback((record: CarWashRecord, employeeId: string) => {
    const recordDate = typeof record.date === 'string' ? record.date : format(record.date, 'yyyy-MM-dd');

    // Определяем роль сотрудника на дату записи
    const employeeRole = dailyRoles[recordDate]?.[employeeId] || 'washer';

    // Всегда используем выбранный метод (минималка + %)
    const methodToUse = state.salaryCalculationMethod;

    if (methodToUse === 'minimumWithPercentage') {
      const share = record.price / record.employeeIds.length;
      const isDryClean = record.serviceType === 'dryclean';

      if (employeeRole === 'washer') {
        const percentage = isDryClean
          ? state.minimumPaymentSettings.percentageWasherDryclean
          : state.minimumPaymentSettings.percentageWasher;
        return share * (percentage / 100);
      } else if (employeeRole === 'admin') {
        if (record.employeeIds.includes(employeeId)) {
          const percentage = isDryClean
            ? state.minimumPaymentSettings.adminDrycleanPercentage
            : state.minimumPaymentSettings.adminCarWashPercentage;
          return share * (percentage / 100);
        }
        return 0;
      }
    }

    // Если метод не выбран или неизвестен, возвращаем 0
    return 0;
  }, [dailyRoles, state.salaryCalculationMethod, state.minimumPaymentSettings]);

  // Группировка записей по дням
  const groupedRecords = useMemo(() => {
    const groups = records.reduce((acc, record) => {
      const date = typeof record.date === 'string' ? record.date : format(record.date, 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {} as Record<string, CarWashRecord[]>);

    // Сортируем записи в каждом дне по времени
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => {
        if (!a.time || !b.time) return 0;
        return a.time.localeCompare(b.time);
      });
    });

    return groups;
  }, [records]);

  // Сортировка дат
  const sortedDates = useMemo(() =>
    Object.keys(groupedRecords).sort((a, b) => b.localeCompare(a)),
    [groupedRecords]
  );

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
  }, [records, employee.id, dailyRoles, groupedRecords, calculateEmployeeEarnings]);

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
            onAnalyticsClick={() => {
              setShowMobileDaysList(false);
              setShowAnalytics(true);
            }}
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
        onClose={() => {
          setShowAnalytics(false);
          // На мобильных возвращаемся к списку дней
          if (isMobile) {
            setShowMobileDaysList(true);
          }
        }}
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
