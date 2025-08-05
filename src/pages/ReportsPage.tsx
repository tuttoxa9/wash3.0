import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/lib/context/AppContext';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, isEqual } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar as CalendarIcon, X, Filter, Building } from 'lucide-react';
import { carWashService } from '@/lib/services/firebaseService';
import type { CarWashRecord, Employee } from '@/lib/types';
import { toast } from 'sonner';
import OrganizationsReport from '@/components/OrganizationsReport';

type PeriodType = 'day' | 'week' | 'month' | 'custom';

interface EarningsReport {
  employeeId: string;
  employeeName: string;
  totalServiceValue: number;
  calculatedEarnings: number;
  totalCash: number;
  totalNonCash: number;
  recordsCount: number;
}

const ReportsPage: React.FC = () => {
  const { state } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [earningsReport, setEarningsReport] = useState<EarningsReport[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

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
          dateRange.push(format(currentDate, 'yyyy-MM-dd'));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Fetch records for each date
        const recordsPromises = dateRange.map(date =>
          carWashService.getByDate(date)
        );

        const recordsResults = await Promise.all(recordsPromises);
        const allRecords = recordsResults.flat();

        setRecords(allRecords);
      } catch (error) {
        console.error('Error loading records:', error);
        toast.error('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [startDate, endDate]);

  // Функция для расчета зарплаты
  const getSalaryAmount = (totalRevenue: number, employeeCount = 1) => {
    // Определяем дату для периода отчета
    const reportDate = periodType === 'day' ? startDate.toISOString().split('T')[0] : '';

    // Получаем метод расчета зарплаты для этой даты
    const shouldUseCurrentMethod = periodType === 'day' && reportDate >= state.salaryCalculationDate;
    const methodToUse = shouldUseCurrentMethod ? state.salaryCalculationMethod : 'percentage';

    if (methodToUse === 'percentage') {
      // 27% от общей выручки - делится между сотрудниками
      const totalSalary = totalRevenue * 0.27;
      return {
        totalAmount: totalSalary,
        perEmployee: employeeCount > 0 ? totalSalary / employeeCount : totalSalary
      };
    }

    // 60 руб + 10% от общей выручки для КАЖДОГО сотрудника
    const perEmployee = 60 + (totalRevenue * 0.1);
    return {
      totalAmount: perEmployee * employeeCount,
      perEmployee
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
        recordsCount: number;
      }>();

      if (selectedEmployeeId) {
        // Only specific employee
        employeeMap.set(selectedEmployeeId, {
          id: selectedEmployeeId,
          name: state.employees.find(e => e.id === selectedEmployeeId)?.name || 'Неизвестный',
          totalCash: 0,
          totalNonCash: 0,
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
            recordsCount: 0
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
            }
            empData.recordsCount++;
          }
        });
      });

      const results: EarningsReport[] = [];
      let totalCashAll = 0;
      let totalNonCashAll = 0;

      for (const [_, employee] of employeeMap.entries()) {
        const totalEarnings = employee.totalCash + employee.totalNonCash;
        totalCashAll += employee.totalCash;
        totalNonCashAll += employee.totalNonCash;

        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          totalServiceValue: totalEarnings,
          calculatedEarnings: 0, // will calculate below
          totalCash: employee.totalCash,
          totalNonCash: employee.totalNonCash,
          recordsCount: employee.recordsCount,
        });
      }

      // Calculate salary for each employee
      const salaryInfo = getSalaryAmount(totalCashAll + totalNonCashAll, results.length);
      if (state.salaryCalculationMethod === 'percentage' || periodType !== 'day' || (periodType === 'day' && startDate.toISOString().split('T')[0] < state.salaryCalculationDate)) {
        // For percentage or old method, divide total salary equally
        results.forEach(r => {
          r.calculatedEarnings = salaryInfo.perEmployee;
        });
      } else {
        // For new method 60+10%, calculate individually
        results.forEach(r => {
          const indivSalaryInfo = getSalaryAmount(r.totalCash + r.totalNonCash, 1);
          r.calculatedEarnings = indivSalaryInfo.perEmployee;
        });
      }

      // Sort by calculated earnings descending
      results.sort((a, b) => b.calculatedEarnings - a.calculatedEarnings);

      setTotalRevenue(totalCashAll + totalNonCashAll);

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
    if (periodType === 'day') {
      return format(startDate, 'dd.MM.yyyy');
    } else {
      return `${format(startDate, 'dd.MM.yyyy')} - ${format(endDate, 'dd.MM.yyyy')}`;
    }
  };

  // Date change handlers
  const handleMainDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
    setActiveDatePicker(null);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(new Date(e.target.value));
    setActiveDatePicker(null);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(new Date(e.target.value));
    setActiveDatePicker(null);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold border-b pb-3">Отчеты</h2>

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
                        <span className="flex-1">{format(selectedDate, 'dd.MM.yyyy')}</span>
                      </div>
                      {activeDatePicker === 'main' && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-card rounded-md shadow-md border border-border p-1">
                          <input
                            type="date"
                            value={format(selectedDate, 'yyyy-MM-dd')}
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
                          <span className="flex-1">{format(startDate, 'dd.MM.yyyy')}</span>
                        </div>
                        {activeDatePicker === 'start' && (
                          <div className="absolute top-full left-0 mt-1 z-10 bg-card rounded-md shadow-md border border-border p-1">
                            <input
                              type="date"
                              value={format(startDate, 'yyyy-MM-dd')}
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
                          <span className="flex-1">{format(endDate, 'dd.MM.yyyy')}</span>
                        </div>
                        {activeDatePicker === 'end' && (
                          <div className="absolute top-full left-0 mt-1 z-10 bg-card rounded-md shadow-md border border-border p-1">
                            <input
                              type="date"
                              value={format(endDate, 'yyyy-MM-dd')}
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

          <div className="card-with-shadow">
            <div className="flex justify-between items-center mb-1 p-4 pb-3 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                Результаты расчета
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({formatDateRange()})
                </span>
              </h3>

              {selectedEmployeeId && (
                <button
                  onClick={clearEmployeeFilter}
                  className="flex items-center gap-1 text-sm px-2 py-1 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  <X className="w-3 h-3" />
                  Снять фильтр
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
                <p>Загрузка данных...</p>
              </div>
            ) : earningsReport.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 px-4 text-left">Сотрудник</th>
                      <th className="py-3 px-4 text-right">Общая стоимость услуг (BYN)</th>
                      <th className="py-3 px-4 text-right">Расчетный заработок (BYN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earningsReport.map(report => (
                      <tr
                        key={report.employeeId}
                        className={`border-b border-border hover:bg-muted/30 cursor-pointer ${
                          selectedEmployeeId === report.employeeId ? 'bg-muted/40' : ''
                        }`}
                        onClick={() => handleEmployeeSelect(report.employeeId)}
                      >
                        <td className="py-3 px-4 flex items-center">
                          {report.employeeName}
                          {selectedEmployeeId === report.employeeId && (
                            <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary text-xs text-white">
                              <Filter className="w-3 h-3 mr-0.5" />
                              Фильтр
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{report.totalServiceValue.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">{report.calculatedEarnings.toFixed(2)}</td>
                      </tr>
                    ))}
                    {/* If showing all employees, add a total row */}
                    {!selectedEmployeeId && earningsReport.length > 1 && (
                      <tr className="border-b border-border bg-muted/30 font-semibold">
                        <td className="py-3 px-4">Итого:</td>
                        <td className="py-3 px-4 text-right">
                          {earningsReport.reduce((sum, item) => sum + item.totalServiceValue, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {earningsReport.reduce((sum, item) => sum + item.calculatedEarnings, 0).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {records.length === 0
                  ? 'Нет данных за выбранный период'
                  : 'Нет данных для выбранных сотрудников'}
              </div>
            )}
          </div>

          {/* Итоговая таблица по сотрудникам */}
          <div className="mt-4">
            <h2 className="text-lg font-medium mb-3">Заработок по сотрудникам</h2>

            {/* Отобразим информацию о методе расчета зарплаты */}
            <div className="mb-4 p-3 border rounded-md bg-secondary/5">
              <h3 className="text-sm font-medium mb-1">Метод расчета зарплаты:</h3>
              <p className="text-sm">
                {(() => {
                  // Определяем дату для периода отчета
                  const reportDate = periodType === 'day' ? startDate.toISOString().split('T')[0] : '';

                  // Получаем метод расчета зарплаты для этой даты
                  const shouldUseCurrentMethod = periodType === 'day' && reportDate >= state.salaryCalculationDate;
                  const methodToUse = shouldUseCurrentMethod ? state.salaryCalculationMethod : 'percentage';

                  if (methodToUse === 'percentage') {
                    return '27% от общей выручки, делится поровну между сотрудниками';
                  }
                  return '60 руб. + 10% от общей выручки для каждого сотрудника';
                })()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {periodType === 'day' && startDate >= parseISO(state.salaryCalculationDate) ?
                  'На основе текущих настроек' :
                  'На основе метода, действующего на указанную дату'
                }
              </p>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-5 bg-muted/50 px-4 py-2 border-b">
                <div className="font-medium text-sm">Сотрудник</div>
                <div className="font-medium text-sm text-right">Наличные (BYN)</div>
                <div className="font-medium text-sm text-right">Карта (BYN)</div>
                <div className="font-medium text-sm text-right">Всего (BYN)</div>
                <div className="font-medium text-sm text-right">Зарплата (BYN)</div>
              </div>
              <div className="divide-y">
                {earningsReport.map(report => {
                  const totalRevenueEmp = report.totalCash + report.totalNonCash;

                  // Рассчитываем зарплату сотрудника с использованием функции
                  const { perEmployee } = getSalaryAmount(totalRevenueEmp, 1); // передаем 1, так как это для одного сотрудника

                  return (
                    <div key={report.employeeId} className="grid grid-cols-5 px-4 py-2">
                      <div>{report.employeeName}</div>
                      <div className="text-right">{report.totalCash.toFixed(2)}</div>
                      <div className="text-right">{report.totalNonCash.toFixed(2)}</div>
                      <div className="text-right">{totalRevenueEmp.toFixed(2)}</div>
                      <div className="text-right font-medium">{perEmployee.toFixed(2)}</div>
                    </div>
                  );
                })}
                {earningsReport.length === 0 && (
                  <div className="px-4 py-6 text-center text-muted-foreground">
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
                      const { totalAmount } = getSalaryAmount(totalRevenue, earningsReport.length);
                      return totalAmount.toFixed(2);
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
    </div>
  );
};

export default ReportsPage;
