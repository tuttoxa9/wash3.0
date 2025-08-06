import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/lib/context/AppContext';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, isEqual } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar as CalendarIcon, X, Filter, Building } from 'lucide-react';
import { carWashService, dailyRolesService } from '@/lib/services/firebaseService';
import type { CarWashRecord, Employee } from '@/lib/types';
import { createSalaryCalculator } from '@/components/SalaryCalculator';
import { useToast } from '@/lib/hooks/useToast';
import OrganizationsReport from '@/components/OrganizationsReport';
import EmployeeRecordsModal from '@/components/EmployeeRecordsModal';

type PeriodType = 'day' | 'week' | 'month' | 'custom';

interface EarningsReport {
  employeeId: string;
  employeeName: string;
  totalServiceValue: number;
  calculatedEarnings: number;
  totalCash: number;
  totalNonCash: number;
  totalOrganizations: number;
  recordsCount: number;
}

const ReportsPage: React.FC = () => {
  const { state } = useAppContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [earningsReport, setEarningsReport] = useState<EarningsReport[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dailyRoles, setDailyRoles] = useState<Record<string, Record<string, string>>>({});

  // Modal state
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Date picker state
  const [activeDatePicker, setActiveDatePicker] = useState<'main' | 'start' | 'end' | null>(null);
  const mainDatePickerRef = useRef<HTMLDivElement>(null);
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the date pickers to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        (activeDatePicker === 'main' && mainDatePickerRef.current && !mainDatePickerRef.current.contains(event.target as Node)) ||
        (activeDatePicker === 'start' && startDatePickerRef.current && !startDatePickerRef.current.contains(event.target as Node)) ||
        (activeDatePicker === 'end' && endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node))
      ) {
        setActiveDatePicker(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDatePicker, mainDatePickerRef, startDatePickerRef, endDatePickerRef]);

  // Calculate date range based on period type
  useEffect(() => {
    switch (periodType) {
      case 'day':
        setStartDate(selectedDate);
        setEndDate(selectedDate);
        break;
      case 'week':
        setStartDate(startOfWeek(selectedDate, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(selectedDate, { weekStartsOn: 1 }));
        break;
      case 'month':
        setStartDate(startOfMonth(selectedDate));
        setEndDate(endOfMonth(selectedDate));
        break;
      // For custom range, the dates are set directly by the user
    }
  }, [periodType, selectedDate]);

  // Load records for the selected date range
  useEffect(() => {
    const loadRecords = async () => {
      if (!startDate || !endDate) return;

      setLoading(true);
      try {
        // Get all dates in the range
        const dateRange: string[] = [];
        const currentDate = new Date(startDate);

        while (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
          if (!isNaN(currentDate.getTime())) {
            dateRange.push(format(currentDate, 'yyyy-MM-dd'));
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Fetch records for each date
        const recordsPromises = dateRange.map(date =>
          carWashService.getByDate(date)
        );

        // Fetch daily roles for each date
        const rolesPromises = dateRange.map(date =>
          dailyRolesService.getDailyRoles(date).then(roles => ({ date, roles: roles || {} }))
        );

        const [recordsResults, rolesResults] = await Promise.all([
          Promise.all(recordsPromises),
          Promise.all(rolesPromises)
        ]);

        const allRecords = recordsResults.flat();
        const rolesMap: Record<string, Record<string, string>> = {};
        rolesResults.forEach(({ date, roles }) => {
          rolesMap[date] = roles;
        });

        setRecords(allRecords);
        setDailyRoles(rolesMap);
      } catch (error) {
        console.error('Error loading records:', error);
        toast.error('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [startDate, endDate]);

  // Функция для расчета зарплаты - теперь всегда используем минималку + %
  const getSalaryAmount = (totalRevenue: number, employeeCount = 1, employeeRole: 'admin' | 'washer' | null = null, date?: string) => {
    // Всегда используем выбранный метод (минималка + %)
    const methodToUse = state.salaryCalculationMethod;

    // Если метод не выбран, возвращаем 0
    if (methodToUse === 'none') {
      return {
        totalAmount: 0,
        perEmployee: 0
      };
    }

    // Минимальная оплата + процент с учетом ролей
    if (employeeRole) {
      if (employeeRole === 'washer') {
        // Базовый расчёт для мойщика
        const basePercentage = totalRevenue * (state.minimumPaymentSettings.percentageWasher / 100);
        const salary = Math.max(basePercentage, state.minimumPaymentSettings.minimumPaymentWasher);
        return {
          totalAmount: salary * employeeCount,
          perEmployee: salary
        };
      } else if (employeeRole === 'admin') {
        // Специальный расчёт для админа с учетом настроек
        let adminEarnings = 0;

        // Процент от всей выручки (наличные + безнал + организации) - всегда получает
        const cashBonus = totalRevenue * (state.minimumPaymentSettings.adminCashPercentage / 100);

        // Процент от вымытых машин - только если участвовал в мойке
        // Здесь нужен employee ID, но его нет в параметрах функции
        // Эта логика будет обрабатываться в вызывающем коде
        const carWashBonus = 0; // Будет рассчитано отдельно для каждого админа

        adminEarnings = cashBonus + carWashBonus;
        const salary = Math.max(adminEarnings, state.minimumPaymentSettings.minimumPaymentAdmin);

        return {
          totalAmount: salary * employeeCount,
          perEmployee: salary
        };
      }
    }

    // Fallback если роль не определена - используем как мойщик
    const earnings = totalRevenue * (state.minimumPaymentSettings.percentageWasher / 100);
    const salary = Math.max(earnings, state.minimumPaymentSettings.minimumPaymentWasher);
    return {
      totalAmount: salary * employeeCount,
      perEmployee: salary
    };
  };

  // Calculate earnings when records or selected employee changes
  useEffect(() => {
    if (records.length === 0) {
      setEarningsReport([]);
      setTotalRevenue(0);
      return;
    }

    // Filter records by selected employee if needed
    const filteredRecords = selectedEmployeeId
      ? records.filter(record => record.employeeIds.includes(selectedEmployeeId))
      : records;

    // Calculate employee reports
    const calculateEmployeeReports = () => {
      // Create a set of all employee IDs involved in the filtered records
      const employeeIdsSet = new Set<string>();
      filteredRecords.forEach(record => {
        record.employeeIds.forEach(id => employeeIdsSet.add(id));
      });

      // Initialize map entries for each employee
      const employeeMap = new Map<string, {
        id: string;
        name: string;
        totalCash: number;
        totalNonCash: number;
        totalOrganizations: number;
        recordsCount: number;
      }>();

      if (selectedEmployeeId) {
        // Only specific employee
        employeeMap.set(selectedEmployeeId, {
          id: selectedEmployeeId,
          name: state.employees.find(e => e.id === selectedEmployeeId)?.name || 'Неизвестный',
          totalCash: 0,
          totalNonCash: 0,
          totalOrganizations: 0,
          recordsCount: 0
        });
      } else {
        // All employees involved in the records
        employeeIdsSet.forEach(empId => {
          employeeMap.set(empId, {
            id: empId,
            name: state.employees.find(e => e.id === empId)?.name || 'Неизвестный',
            totalCash: 0,
            totalNonCash: 0,
            totalOrganizations: 0,
            recordsCount: 0
          });
        });

        // Добавляем всех админов за период (даже если они не мыли машины)
        Object.entries(dailyRoles).forEach(([date, roles]) => {
          Object.entries(roles).forEach(([empId, role]) => {
            if (role === 'admin' && !employeeMap.has(empId)) {
              employeeMap.set(empId, {
                id: empId,
                name: state.employees.find(e => e.id === empId)?.name || 'Неизвестный',
                totalCash: 0,
                totalNonCash: 0,
                totalOrganizations: 0,
                recordsCount: 0
              });
            }
          });
        });
      }

      // Process records
      filteredRecords.forEach(record => {
        const relevantEmployeeIds = selectedEmployeeId
          ? [selectedEmployeeId]
          : record.employeeIds.filter(id => employeeIdsSet.has(id));

        // Skip record if employee not involved
        if (relevantEmployeeIds.length === 0) return;

        // Calculate share per employee
        const valuePerEmployee = record.price / relevantEmployeeIds.length;

        relevantEmployeeIds.forEach(empId => {
          const empData = employeeMap.get(empId);
          if (empData) {
            if (record.paymentMethod.type === 'cash') {
              empData.totalCash += valuePerEmployee;
            } else if (record.paymentMethod.type === 'card') {
              empData.totalNonCash += valuePerEmployee;
            } else if (record.paymentMethod.type === 'organization') {
              empData.totalOrganizations += valuePerEmployee;
            }
            empData.recordsCount++;
          }
        });
      });

      const results: EarningsReport[] = [];
      let totalCashAll = 0;
      let totalNonCashAll = 0;
      let totalOrganizationsAll = 0;

      for (const [_, employee] of employeeMap.entries()) {
        const totalEarnings = employee.totalCash + employee.totalNonCash + employee.totalOrganizations;
        totalCashAll += employee.totalCash;
        totalNonCashAll += employee.totalNonCash;
        totalOrganizationsAll += employee.totalOrganizations;

        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          totalServiceValue: totalEarnings,
          calculatedEarnings: 0, // will calculate below
          totalCash: employee.totalCash,
          totalNonCash: employee.totalNonCash,
          totalOrganizations: employee.totalOrganizations,
          recordsCount: employee.recordsCount,
        });
      }

      // Calculate salary for each employee with daily roles
      const reportDate = startDate.toISOString().split('T')[0];
      // Всегда используем выбранный метод (минималка + %)
      const methodToUse = state.salaryCalculationMethod;

      // Если метод не выбран, устанавливаем зарплату в 0 для всех
      if (methodToUse === 'none') {
        results.forEach(r => {
          r.calculatedEarnings = 0;
        });
      } else if (methodToUse === 'minimumWithPercentage') {
        // Используем новый компонент расчёта зарплаты
        const employeeRolesForCalc: Record<string, 'admin' | 'washer'> = {};

        // Определяем роли для всех сотрудников
        results.forEach(r => {
          let employeeRole: 'admin' | 'washer' = 'washer';

          // Проверяем роль в dailyRoles для начальной даты периода или глобально
          if (dailyRoles[reportDate] && dailyRoles[reportDate][r.employeeId]) {
            employeeRole = dailyRoles[reportDate][r.employeeId] as 'admin' | 'washer';
          } else {
            // Если роли для даты нет, пытаемся получить из глобального состояния сотрудников
            const employee = state.employees.find(emp => emp.id === r.employeeId);
            if (employee && employee.role) {
              employeeRole = employee.role;
            }
          }

          employeeRolesForCalc[r.employeeId] = employeeRole;
        });

        // Создаём калькулятор зарплаты и получаем результаты
        const salaryCalculator = createSalaryCalculator(
          state.minimumPaymentSettings,
          filteredRecords,
          employeeRolesForCalc,
          state.employees
        );

        const salaryResults = salaryCalculator.calculateSalaries();

        // Обновляем результаты с рассчитанными зарплатами
        results.forEach(r => {
          const salaryResult = salaryResults.find(sr => sr.employeeId === r.employeeId);
          if (salaryResult) {
            r.calculatedEarnings = salaryResult.calculatedSalary;
          }
        });
      }

      // Sort by calculated earnings descending
      results.sort((a, b) => b.calculatedEarnings - a.calculatedEarnings);

      setTotalRevenue(totalCashAll + totalNonCashAll + totalOrganizationsAll);

      return results;
    };

    const employeeReports = calculateEmployeeReports();

    setEarningsReport(employeeReports || []);
  }, [records, selectedEmployeeId, state.employees, periodType, startDate, state.salaryCalculationDate, state.salaryCalculationMethod]);

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    if (selectedEmployeeId === employeeId) {
      // If clicking the same employee, clear the filter
      setSelectedEmployeeId(null);
    } else {
      // Otherwise set the selected employee
      setSelectedEmployeeId(employeeId);
    }
  };

  // Clear employee filter
  const clearEmployeeFilter = () => {
    setSelectedEmployeeId(null);
  };

  // Format date range for display
  const formatDateRange = () => {
    try {
      if (periodType === 'day') {
        return startDate && !isNaN(startDate.getTime()) ? format(startDate, 'dd.MM.yyyy') : 'Неверная дата';
      } else {
        const startFormatted = startDate && !isNaN(startDate.getTime()) ? format(startDate, 'dd.MM.yyyy') : 'Неверная дата';
        const endFormatted = endDate && !isNaN(endDate.getTime()) ? format(endDate, 'dd.MM.yyyy') : 'Неверная дата';
        return `${startFormatted} - ${endFormatted}`;
      }
    } catch (error) {
      console.warn('Error formatting date range:', error);
      return 'Ошибка формата даты';
    }
  };

  // Date change handlers
  const handleMainDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      try {
        const date = parseISO(value);
        if (date && !isNaN(date.getTime())) {
          setSelectedDate(date);
        }
      } catch (error) {
        console.warn('Invalid date value:', value);
      }
    }
    setActiveDatePicker(null);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      try {
        const date = parseISO(value);
        if (date && !isNaN(date.getTime())) {
          setStartDate(date);
        }
      } catch (error) {
        console.warn('Invalid date value:', value);
      }
    }
    setActiveDatePicker(null);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      try {
        const date = parseISO(value);
        if (date && !isNaN(date.getTime())) {
          setEndDate(date);
        }
      } catch (error) {
        console.warn('Invalid date value:', value);
      }
    }
    setActiveDatePicker(null);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl sm:text-2xl font-semibold border-b pb-3">Отчеты</h2>

      <Tabs defaultValue="employee-earnings" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="employee-earnings" className="flex items-center gap-2">
            Расчет ЗП
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Отчеты по организациям
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employee-earnings" className="space-y-5">
          <div className="card-with-shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Выбор Периода</h3>

            <div className="space-y-4">
              {/* Period type selector */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPeriodType('day')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    periodType === 'day' ? 'bg-primary text-white' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  День
                </button>
                <button
                  onClick={() => setPeriodType('week')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    periodType === 'week' ? 'bg-primary text-white' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  Неделя
                </button>
                <button
                  onClick={() => setPeriodType('month')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    periodType === 'month' ? 'bg-primary text-white' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  Месяц
                </button>
                <button
                  onClick={() => setPeriodType('custom')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    periodType === 'custom' ? 'bg-primary text-white' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  Произвольный период
                </button>
              </div>

              {/* Date selectors */}
              <div className="flex flex-wrap gap-4">
                {periodType !== 'custom' ? (
                  <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1">
                      {periodType === 'day' ? 'Дата' : periodType === 'week' ? 'Неделя' : 'Месяц'}
                    </label>
                    <div className="relative" ref={mainDatePickerRef}>
                      <div
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring cursor-pointer"
                        onClick={() => setActiveDatePicker('main')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        <span className="flex-1">{selectedDate && !isNaN(selectedDate.getTime()) ? format(selectedDate, 'dd.MM.yyyy') : 'Неверная дата'}</span>
                      </div>
                      {activeDatePicker === 'main' && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-card rounded-md shadow-md border border-border p-1">
                          <input
                            type="date"
                            value={selectedDate && !isNaN(selectedDate.getTime()) ? format(selectedDate, 'yyyy-MM-dd') : ''}
                            onChange={handleMainDateChange}
                            className="w-full p-2 outline-none bg-background rounded-md"
                            autoFocus
                            onBlur={() => setActiveDatePicker(null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-full sm:w-auto">
                      <label className="block text-sm font-medium mb-1">Начальная дата</label>
                      <div className="relative" ref={startDatePickerRef}>
                        <div
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring cursor-pointer"
                          onClick={() => setActiveDatePicker('start')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                          <span className="flex-1">{startDate && !isNaN(startDate.getTime()) ? format(startDate, 'dd.MM.yyyy') : 'Неверная дата'}</span>
                        </div>
                        {activeDatePicker === 'start' && (
                          <div className="absolute top-full left-0 mt-1 z-10 bg-card rounded-md shadow-md border border-border p-1">
                            <input
                              type="date"
                              value={startDate && !isNaN(startDate.getTime()) ? format(startDate, 'yyyy-MM-dd') : ''}
                              onChange={handleStartDateChange}
                              className="w-full p-2 outline-none bg-background rounded-md"
                              autoFocus
                              onBlur={() => setActiveDatePicker(null)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto">
                      <label className="block text-sm font-medium mb-1">Конечная дата</label>
                      <div className="relative" ref={endDatePickerRef}>
                        <div
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring cursor-pointer"
                          onClick={() => setActiveDatePicker('end')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                          <span className="flex-1">{endDate && !isNaN(endDate.getTime()) ? format(endDate, 'dd.MM.yyyy') : 'Неверная дата'}</span>
                        </div>
                        {activeDatePicker === 'end' && (
                          <div className="absolute top-full left-0 mt-1 z-10 bg-card rounded-md shadow-md border border-border p-1">
                            <input
                              type="date"
                              value={endDate && !isNaN(endDate.getTime()) ? format(endDate, 'yyyy-MM-dd') : ''}
                              onChange={handleEndDateChange}
                              className="w-full p-2 outline-none bg-background rounded-md"
                              autoFocus
                              onBlur={() => setActiveDatePicker(null)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>





          {/* Итоговая таблица по сотрудникам */}
          <div className="mt-4">
            <h2 className="text-lg font-medium mb-3">Заработок по сотрудникам</h2>

            {/* Отобразим информацию о методе расчета зарплаты */}
            <div className="mb-4 p-3 border rounded-md bg-secondary/5">
              <h3 className="text-sm font-medium mb-1">Метод расчета зарплаты:</h3>
              <p className="text-sm">
                {(() => {
                  // Всегда используем текущий выбранный метод
                  const methodToUse = state.salaryCalculationMethod;

                  if (methodToUse === 'none') {
                    return 'Метод расчета не выбран. Перейдите в настройки для выбора метода.';
                  } else if (methodToUse === 'minimumWithPercentage') {
                    return 'Минимальная оплата + процент с учетом ролей (мойщик/админ)';
                  }
                  return 'Минимальная оплата + процент с учетом ролей (мойщик/админ)';
                })()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                На основе текущих настроек
              </p>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-6 bg-muted/50 px-2 md:px-4 py-1.5 md:py-2 border-b">
                <div className="font-medium text-xs md:text-sm">Сотрудник</div>
                <div className="font-medium text-xs md:text-sm text-right">Нал</div>
                <div className="font-medium text-xs md:text-sm text-right">Карт</div>
                <div className="font-medium text-xs md:text-sm text-right">Безнал</div>
                <div className="font-medium text-xs md:text-sm text-right">Всего</div>
                <div className="font-medium text-xs md:text-sm text-right">ЗП</div>
              </div>
              <div className="divide-y">
                {earningsReport.map(report => {
                  const totalRevenueEmp = report.totalCash + report.totalNonCash + report.totalOrganizations;

                  // Рассчитываем зарплату сотрудника с учетом роли
                  const reportDate = startDate.toISOString().split('T')[0];
                  let employeeRole: 'admin' | 'washer' = 'washer';

                  if (dailyRoles[reportDate]) {
                    employeeRole = dailyRoles[reportDate][report.employeeId] as 'admin' | 'washer' || 'washer';
                  }

                  // Всегда используем выбранный метод (минималка + %)
                  const methodToUse = state.salaryCalculationMethod;

                  // Используем уже рассчитанное значение calculatedEarnings из useEffect
                  let perEmployee = report.calculatedEarnings;

                  const handleEmployeeClick = () => {
                    const employee = state.employees.find(e => e.id === report.employeeId);
                    if (employee) {
                      // Фильтруем записи для этого сотрудника
                      const employeeRecords = records.filter(record =>
                        record.employeeIds.includes(report.employeeId)
                      );
                      setSelectedEmployeeForModal(employee);
                      setIsModalOpen(true);
                    }
                  };

                  return (
                    <div
                      key={report.employeeId}
                      className="grid grid-cols-6 px-2 md:px-4 py-1.5 md:py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={handleEmployeeClick}
                    >
                      <div className="text-primary hover:text-primary/80 font-medium text-xs md:text-sm truncate" title={report.employeeName}>{report.employeeName}</div>
                      <div className="text-right text-xs md:text-sm">{report.totalCash.toFixed(2)}</div>
                      <div className="text-right text-xs md:text-sm">{report.totalNonCash.toFixed(2)}</div>
                      <div className="text-right text-xs md:text-sm">{report.totalOrganizations.toFixed(2)}</div>
                      <div className="text-right text-xs md:text-sm">{totalRevenueEmp.toFixed(2)}</div>
                      <div className="text-right font-medium text-xs md:text-sm">{perEmployee.toFixed(2)}</div>
                    </div>
                  );
                })}
                {earningsReport.length === 0 && (
                  <div className="px-2 md:px-4 py-4 md:py-6 text-center text-muted-foreground text-sm">
                    Нет данных для выбранного периода и фильтра
                  </div>
                )}
              </div>
            </div>

            {/* Итоговая сумма - заменим таблицу на строку с итоговыми цифрами */}
            {earningsReport.length > 0 && (
              <div className="mt-4 p-4 border rounded-md bg-muted/10">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Общая выручка:</div>
                  <div className="font-bold text-lg">{totalRevenue.toFixed(2)} BYN</div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="font-medium">Итого зарплата:</div>
                  <div className="font-bold text-lg">
                    {(() => {
                      // Суммируем индивидуальные зарплаты всех сотрудников
                      const totalSalarySum = earningsReport.reduce((sum, report) => sum + report.calculatedEarnings, 0);
                      return totalSalarySum.toFixed(2);
                    })()} BYN
                  </div>
                </div>
              </div>
            )}
          </div>

        </TabsContent>

        <TabsContent value="organizations">
          <OrganizationsReport />
        </TabsContent>
      </Tabs>

      {/* Модальное окно с записями сотрудника */}
      {selectedEmployeeForModal && (
        <EmployeeRecordsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEmployeeForModal(null);
          }}
          employee={selectedEmployeeForModal}
          records={records.filter(record =>
            record.employeeIds.includes(selectedEmployeeForModal.id)
          )}
          periodLabel={formatDateRange()}
          dailyRoles={dailyRoles}
        />
      )}
    </div>
  );
};

export default ReportsPage;
