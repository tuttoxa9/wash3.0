import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/lib/context/AppContext';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, isEqual } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar as CalendarIcon, X, Filter, Building, TrendingUp, FileDown, Pencil } from 'lucide-react';
import { carWashService, dailyRolesService, organizationService, dailyReportService } from '@/lib/services/supabaseService';
import type { CarWashRecord, Employee } from '@/lib/types';
import { createSalaryCalculator } from '@/components/SalaryCalculator';
import { useToast } from '@/lib/hooks/useToast';
import OrganizationsReport from '@/components/OrganizationsReport';
import EmployeeRecordsModal from '@/components/EmployeeRecordsModal';
import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, TextRun, AlignmentType, BorderStyle } from 'docx';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import TooltipModal from '@/components/ui/tooltip-modal';

type PeriodType = 'day' | 'week' | 'month' | 'custom';

interface EarningsReport {
  employeeId: string;
  employeeName: string;
  totalServiceValue: number;
  calculatedEarnings: number;
  totalCash: number;
  totalNonCash: number;
  totalOrganizations: number;
  totalDebt: number;
  recordsCount: number;
  isManual?: boolean;
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
  const [dailyReports, setDailyReports] = useState<Record<string, any>>({});
  const [minimumFlags, setMinimumFlags] = useState<Record<string, boolean>>({});

  // Состояние для общего отчёта
  const [generalMinimumFlags, setGeneralMinimumFlags] = useState<Record<string, boolean>>({});
  const [generalReportLoading, setGeneralReportLoading] = useState(false);
  const [generalStartDate, setGeneralStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [generalEndDate, setGeneralEndDate] = useState(new Date());
  const [generalReportData, setGeneralReportData] = useState<{
    totalCash: number;
    totalCard: number;
    totalOrganizations: number;
    totalDebt: number;
    totalRevenue: number;
    totalSalaries: number;
    organizationBreakdown: { name: string; amount: number }[];
    dailyData: { date: string; cash: number; card: number; organizations: number; debt: number; total: number; recordsCount: number }[];
    averageDaily: number;
    maxDay: { date: string; amount: number };
    minDay: { date: string; amount: number };
  } | null>(null);

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

  // Load records for the selected date range - Optimized with batch fetching
  useEffect(() => {
    const loadRecords = async () => {
      if (!startDate || !endDate) return;

      setLoading(true);
      try {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');

        const [allRecords, rolesMap, reportsList] = await Promise.all([
          carWashService.getByDateRange(startStr, endStr),
          dailyRolesService.getDailyRolesByDateRange(startStr, endStr),
          dailyReportService.getByDateRange(startStr, endStr)
        ]);

        setRecords(allRecords);
        setDailyRoles(rolesMap);

        const reportsMap: Record<string, any> = {};
        reportsList.forEach(report => {
          const dateStr = typeof report.date === 'string' ? report.date : format(report.date, 'yyyy-MM-dd');
          reportsMap[dateStr] = report;
        });
        setDailyReports(reportsMap);

        // Отладка: посмотрим что загрузилось
        console.log('=== ОТЛАДКА ЗАГРУЗКИ РОЛЕЙ ===');
        console.log('rolesMap:', rolesMap);
        dateRange.forEach(date => {
          const roles = rolesMap[date];
          if (roles) {
            Object.keys(roles).forEach(key => {
              if (key.startsWith('min_')) {
                console.log(`Дата ${date}, флаг минималки ${key}: ${roles[key]}`);
              }
            });
          }
        });
      } catch (error) {
        console.error('Error loading records:', error);
        toast.error('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [startDate, endDate]);


  // Calculate earnings when records or selected employee changes
  useEffect(() => {
    // Если нет записей, но есть сотрудники на смене, всё равно показываем минималку
    const hasEmployeesOnShift = Object.keys(dailyRoles).some(date =>
      Object.keys(dailyRoles[date]).length > 0
    );

    if (records.length === 0 && !hasEmployeesOnShift) {
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
      // Create a set of all employee IDs involved in the filtered records and on shift
      const employeeIdsSet = new Set<string>();

      // Добавляем сотрудников из записей о мойке
      filteredRecords.forEach(record => {
        record.employeeIds.forEach(id => employeeIdsSet.add(id));
      });

      // Добавляем всех сотрудников, которые работали в смене за период (даже если не мыли машины)
      Object.entries(dailyRoles).forEach(([date, roles]) => {
        Object.keys(roles).forEach(empId => {
          employeeIdsSet.add(empId);
        });
      });

      // Initialize map entries for each employee
      const employeeMap = new Map<string, {
        id: string;
        name: string;
        totalCash: number;
        totalNonCash: number;
        totalOrganizations: number;
        totalDebt: number;
        recordsCount: number;
      }>();

      if (selectedEmployeeId) {
        // Only specific employee - проверяем что сотрудник существует
        const selectedEmployee = state.employees.find(e => e.id === selectedEmployeeId);
        if (selectedEmployee) {
          employeeMap.set(selectedEmployeeId, {
            id: selectedEmployeeId,
            name: selectedEmployee.name,
            totalCash: 0,
            totalNonCash: 0,
            totalOrganizations: 0,
        totalDebt: 0,
            recordsCount: 0
          });
        }
      } else {
        // All employees involved in the records - только те, которые есть в списке сотрудников
        employeeIdsSet.forEach(empId => {
          const employee = state.employees.find(e => e.id === empId);
          if (employee) {
            employeeMap.set(empId, {
              id: empId,
              name: employee.name,
              totalCash: 0,
              totalNonCash: 0,
              totalOrganizations: 0,
              totalDebt: 0,
              recordsCount: 0
            });
          }
        });

        // Добавляем всех админов за период (даже если они не мыли машины) - только если есть в списке сотрудников
        Object.entries(dailyRoles).forEach(([date, roles]) => {
          Object.entries(roles).forEach(([empId, role]) => {
            if (role === 'admin' && !employeeMap.has(empId)) {
              const employee = state.employees.find(e => e.id === empId);
              if (employee) {
                employeeMap.set(empId, {
                  id: empId,
                  name: employee.name,
                  totalCash: 0,
                  totalNonCash: 0,
                  totalOrganizations: 0,
                  totalDebt: 0,
                  recordsCount: 0
                });
              }
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
            } else if (record.paymentMethod.type === 'debt') {
              empData.totalDebt += valuePerEmployee;
            }
            empData.recordsCount++;
          }
        });
      });

      const results: EarningsReport[] = [];
      let totalCashAll = 0;
      let totalNonCashAll = 0;
      let totalOrganizationsAll = 0;
      let totalDebtAll = 0;

      for (const [_, employee] of employeeMap.entries()) {
        const totalVolume = employee.totalCash + employee.totalNonCash + employee.totalOrganizations + employee.totalDebt;
        totalCashAll += employee.totalCash;
        totalNonCashAll += employee.totalNonCash;
        totalOrganizationsAll += employee.totalOrganizations;
        totalDebtAll += employee.totalDebt;

        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          totalServiceValue: totalVolume,
          calculatedEarnings: 0, // will calculate below
          totalCash: employee.totalCash,
          totalNonCash: employee.totalNonCash,
          totalOrganizations: employee.totalOrganizations,
          totalDebt: employee.totalDebt,
          recordsCount: employee.recordsCount,
        });
      }

      // Calculate salary for each employee with daily roles - Refactored to calculate day-by-day
      const methodToUse = state.salaryCalculationMethod;

      if (methodToUse === 'none') {
        results.forEach(r => { r.calculatedEarnings = 0; });
      } else if (methodToUse === 'minimumWithPercentage') {
        const totalEarningsByEmployee: Record<string, number> = {};
        const isEmployeeManualMap: Record<string, boolean> = {};
        const aggregatedMinimumFlags: Record<string, boolean> = {};

        // Iterate through each date in the period
        const datesInPeriod = Object.keys(dailyRoles).sort();

        datesInPeriod.forEach(dateStr => {
          const recordsForDay = filteredRecords.filter(rec => {
            const recDate = typeof rec.date === 'string' ? rec.date : format(rec.date, 'yyyy-MM-dd');
            return recDate === dateStr;
          });

          const dayRoles = dailyRoles[dateStr] || {};

          // Determine roles for this specific day
          const employeeRolesForDay: Record<string, 'admin' | 'washer'> = {};
          const minimumOverrideForDay: Record<string, boolean> = {};

          // Initialize participants for this day (from roles or records)
          const participantIds = new Set<string>();
          Object.keys(dayRoles).forEach(key => {
            if (!key.startsWith('min_')) participantIds.add(key);
          });
          recordsForDay.forEach(rec => rec.employeeIds.forEach(id => participantIds.add(id)));

          participantIds.forEach(empId => {
            // Role logic - CRITICAL FIX: DO NOT use current role for historical dates
            let role: 'admin' | 'washer' = 'washer'; // default to washer for safety

            if (dayRoles[empId]) {
              // If we have explicit historical role data for this date, use it
              role = dayRoles[empId] as 'admin' | 'washer';
            } else {
              // No explicit role for this date
              // Only use current role if this is TODAY's date
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

              if (isToday) {
                const emp = state.employees.find(e => e.id === empId);
                if (emp?.role) role = emp.role;
              }
              // For historical dates without explicit role data, keep default 'washer'
              // This prevents promoted employees from having their past shifts recalculated with higher percentages
            }
            employeeRolesForDay[empId] = role;

            // Minimum flag logic for this day
            const minKey = `min_${empId}`;
            const minVal = dayRoles[minKey];
            // If explicit flag exists, use it. Otherwise, it's true by default.
            minimumOverrideForDay[empId] = minVal !== false;

            // For UI display in reports, we aggregate: if enabled on ANY day, show as enabled for the period
            if (minimumOverrideForDay[empId]) {
              aggregatedMinimumFlags[empId] = true;
            }
          });

          // Calculate for this single day
          const salaryCalculator = createSalaryCalculator(
            state.minimumPaymentSettings,
            recordsForDay,
            employeeRolesForDay,
            state.employees,
            minimumOverrideForDay
          );

          const dailyResults = salaryCalculator.calculateSalaries();
          const dayReport = dailyReports[dateStr];

          dailyResults.forEach(res => {
            let salary = res.calculatedSalary;
            if (dayReport?.manualSalaries && dayReport.manualSalaries[res.employeeId] !== undefined) {
              salary = dayReport.manualSalaries[res.employeeId];
              isEmployeeManualMap[res.employeeId] = true;
            }
            totalEarningsByEmployee[res.employeeId] = (totalEarningsByEmployee[res.employeeId] || 0) + salary;
          });
        });

        // Update results with summed calculated earnings
        results.forEach(r => {
          r.calculatedEarnings = totalEarningsByEmployee[r.employeeId] || 0;
          r.isManual = isEmployeeManualMap[r.employeeId];
        });

        setMinimumFlags(aggregatedMinimumFlags);
      }

      // Sort by calculated earnings descending
      results.sort((a, b) => b.calculatedEarnings - a.calculatedEarnings);

      setTotalRevenue(totalCashAll + totalNonCashAll + totalOrganizationsAll + totalDebtAll);

      return results;
    };

    const employeeReports = calculateEmployeeReports();

    setEarningsReport(employeeReports || []);
  }, [records, selectedEmployeeId, state.employees, periodType, startDate, state.salaryCalculationDate, state.salaryCalculationMethod, dailyReports]);

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

  const handleManualSalaryEdit = async (employeeId: string, currentSalary: number) => {
    if (periodType !== 'day') {
      toast.error('Ручное изменение зарплаты доступно только при просмотре за один день');
      return;
    }

    const dateStr = format(startDate, 'yyyy-MM-dd');
    const employee = earningsReport.find(e => e.employeeId === employeeId);
    const newSalaryStr = window.prompt(`Введите скорректированную зарплату для ${employee?.employeeName} (или 0 для сброса):`, currentSalary.toFixed(2));

    if (newSalaryStr === null) return;

    const newSalary = parseFloat(newSalaryStr.replace(',', '.'));
    if (isNaN(newSalary)) {
      toast.error('Некорректная сумма');
      return;
    }

    try {
      let report = dailyReports[dateStr];
      if (!report) {
        report = {
          id: dateStr,
          date: dateStr,
          employeeIds: [],
          records: [],
          totalCash: 0,
          totalNonCash: 0,
          manualSalaries: {}
        };
      }

      const manualSalaries = { ...(report.manualSalaries || {}) };
      if (newSalary <= 0) {
        delete manualSalaries[employeeId];
      } else {
        manualSalaries[employeeId] = newSalary;
      }

      const updatedReport = { ...report, manualSalaries };
      const success = await dailyReportService.updateReport(updatedReport);

      if (success) {
        setDailyReports(prev => ({ ...prev, [dateStr]: updatedReport }));
        toast.success('Зарплата обновлена');
      } else {
        toast.error('Ошибка при сохранении');
      }
    } catch (error) {
      console.error('Error updating manual salary:', error);
      toast.error('Ошибка при сохранении');
    }
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

  // Функция для загрузки данных общего отчёта - Optimized with batch fetching
  const loadGeneralReport = async () => {
    setGeneralReportLoading(true);
    try {
      const startStr = format(generalStartDate, 'yyyy-MM-dd');
      const endStr = format(generalEndDate, 'yyyy-MM-dd');

      const [allRecords, rolesMap, reportsList] = await Promise.all([
        carWashService.getByDateRange(startStr, endStr),
        dailyRolesService.getDailyRolesByDateRange(startStr, endStr),
        dailyReportService.getByDateRange(startStr, endStr)
      ]);

      const reportsMap: Record<string, any> = {};
      reportsList.forEach(report => {
        const dateStr = typeof report.date === 'string' ? report.date : format(report.date, 'yyyy-MM-dd');
        reportsMap[dateStr] = report;
      });

      // Получаем все даты в диапазоне для формирования графика
      const dateRange: string[] = [];
      const currentDate = new Date(generalStartDate);
      while (isBefore(currentDate, generalEndDate) || isEqual(currentDate, generalEndDate)) {
        if (!isNaN(currentDate.getTime())) {
          dateRange.push(format(currentDate, 'yyyy-MM-dd'));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Подсчитываем итоги и данные по дням
      let totalCash = 0;
      let totalCard = 0;
      let totalOrganizations = 0;
      let totalDebt = 0;
      const organizationBreakdown: Record<string, number> = {};
      const dailyBreakdown: Record<string, { cash: number; card: number; organizations: number; debt: number; recordsCount: number }> = {};

      // Инициализируем данные для каждого дня
      dateRange.forEach(date => {
        dailyBreakdown[date] = { cash: 0, card: 0, organizations: 0, debt: 0, recordsCount: 0 };
      });

      allRecords.forEach(record => {
        const recordDate = record.date;
        if (!dailyBreakdown[recordDate]) {
          dailyBreakdown[recordDate] = { cash: 0, card: 0, organizations: 0, debt: 0, recordsCount: 0 };
        }

        dailyBreakdown[recordDate].recordsCount++;

        if (record.paymentMethod.type === 'cash') {
          totalCash += record.price;
          dailyBreakdown[recordDate].cash += record.price;
        } else if (record.paymentMethod.type === 'card') {
          totalCard += record.price;
          dailyBreakdown[recordDate].card += record.price;
        } else if (record.paymentMethod.type === 'organization') {
          totalOrganizations += record.price;
          dailyBreakdown[recordDate].organizations += record.price;
          const orgName = record.paymentMethod.organizationName ||
                          state.organizations.find(org => org.id === record.paymentMethod.organizationId)?.name ||
                          'Неизвестная организация';
          organizationBreakdown[orgName] = (organizationBreakdown[orgName] || 0) + record.price;
        } else if (record.paymentMethod.type === 'debt') {
          totalDebt += record.price;
          dailyBreakdown[recordDate].debt += record.price;
        }
      });

      const totalRevenue = totalCash + totalCard + totalOrganizations + totalDebt;

      // Подготавливаем данные для графика
      const dailyData = dateRange.map(date => {
        const dayData = dailyBreakdown[date] || { cash: 0, card: 0, organizations: 0, debt: 0, recordsCount: 0 };
        const total = dayData.cash + dayData.card + dayData.organizations + dayData.debt;
        return {
          date: format(parseISO(date), 'dd.MM'),
          cash: dayData.cash,
          card: dayData.card,
          organizations: dayData.organizations,
          debt: dayData.debt,
          total,
          recordsCount: dayData.recordsCount
        };
      });

      // Вычисляем статистику
      const averageDaily = dailyData.length > 0 ? totalRevenue / dailyData.length : 0;
      const maxDay = dailyData.reduce((max, day) => day.total > max.amount ? { date: day.date, amount: day.total } : max, { date: '', amount: 0 });
      const minDay = dailyData.reduce((min, day) => day.total < min.amount || min.amount === 0 ? { date: day.date, amount: day.total } : min, { date: '', amount: Number.MAX_VALUE });

      // Подсчитываем общую зарплату - Refactored to calculate day-by-day
      let totalSalaries = 0;
      if (state.salaryCalculationMethod === 'minimumWithPercentage') {
        const aggregatedGeneralMinFlags: Record<string, boolean> = {};

        dateRange.forEach(dateStr => {
          const recordsForDay = allRecords.filter(rec => {
            const recDate = typeof rec.date === 'string' ? rec.date : format(rec.date, 'yyyy-MM-dd');
            return recDate === dateStr;
          });

          const dayRoles = rolesMap[dateStr] || {};
          const employeeRolesForDay: Record<string, 'admin' | 'washer'> = {};
          const minimumOverrideForDay: Record<string, boolean> = {};

          const participantIds = new Set<string>();
          Object.keys(dayRoles).forEach(key => {
            if (!key.startsWith('min_')) participantIds.add(key);
          });
          recordsForDay.forEach(rec => rec.employeeIds.forEach(id => participantIds.add(id)));

          participantIds.forEach(empId => {
            // Role logic - CRITICAL FIX: DO NOT use current role for historical dates
            let role: 'admin' | 'washer' = 'washer'; // default to washer for safety

            if (dayRoles[empId]) {
              // If we have explicit historical role data for this date, use it
              role = dayRoles[empId] as 'admin' | 'washer';
            } else {
              // No explicit role for this date
              // Only use current role if this is TODAY's date
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

              if (isToday) {
                const emp = state.employees.find(e => e.id === empId);
                if (emp?.role) role = emp.role;
              }
              // For historical dates without explicit role data, keep default 'washer'
              // This prevents promoted employees from having their past shifts recalculated with higher percentages
            }
            employeeRolesForDay[empId] = role;

            const minKey = `min_${empId}`;
            const minVal = dayRoles[minKey];
            minimumOverrideForDay[empId] = minVal !== false; // true by default

            if (minimumOverrideForDay[empId]) aggregatedGeneralMinFlags[empId] = true;
          });

          const salaryCalculator = createSalaryCalculator(
            state.minimumPaymentSettings,
            recordsForDay,
            employeeRolesForDay,
            state.employees,
            minimumOverrideForDay
          );

          const dailyResults = salaryCalculator.calculateSalaries();
          const dayReport = reportsMap[dateStr];

          dailyResults.forEach(res => {
            let salary = res.calculatedSalary;
            if (dayReport?.manualSalaries && dayReport.manualSalaries[res.employeeId] !== undefined) {
              salary = dayReport.manualSalaries[res.employeeId];
            }
            totalSalaries += salary;
          });
        });

        setGeneralMinimumFlags(aggregatedGeneralMinFlags);
      }

      setGeneralReportData({
        totalCash,
        totalCard,
        totalOrganizations,
        totalDebt,
        totalRevenue,
        totalSalaries,
        organizationBreakdown: Object.entries(organizationBreakdown).map(([name, amount]) => ({ name, amount })),
        dailyData,
        averageDaily,
        maxDay,
        minDay: minDay.amount === Number.MAX_VALUE ? { date: '', amount: 0 } : minDay
      });

    } catch (error) {
      console.error('Ошибка при загрузке общего отчёта:', error);
      toast.error('Ошибка при загрузке данных общего отчёта');
    } finally {
      setGeneralReportLoading(false);
    }
  };

  // Функция экспорта общего отчёта в Word
  const exportGeneralReportToWord = async () => {
    if (!generalReportData) {
      toast.error('Нет данных для экспорта');
      return;
    }

    try {
      // Создаем таблицу с итогами
      const summaryTableRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Тип оплаты", alignment: AlignmentType.CENTER, bold: true })],
              width: { size: 3000, type: "dxa" }
            }),
            new TableCell({
              children: [new Paragraph({ text: "Сумма (BYN)", alignment: AlignmentType.CENTER, bold: true })],
              width: { size: 2000, type: "dxa" }
            }),
          ],
          tableHeader: true
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Наличные" })]
            }),
            new TableCell({
              children: [new Paragraph({ text: generalReportData.totalCash.toFixed(2), alignment: AlignmentType.RIGHT })]
            }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Долги" })]
            }),
            new TableCell({
              children: [new Paragraph({ text: generalReportData.totalDebt.toFixed(2), alignment: AlignmentType.RIGHT })]
            }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Карта" })]
            }),
            new TableCell({
              children: [new Paragraph({ text: generalReportData.totalCard.toFixed(2), alignment: AlignmentType.RIGHT })]
            }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Безнал" })]
            }),
            new TableCell({
              children: [new Paragraph({ text: generalReportData.totalOrganizations.toFixed(2), alignment: AlignmentType.RIGHT })]
            }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Итого выручка", bold: true })]
            }),
            new TableCell({
              children: [new Paragraph({ text: generalReportData.totalRevenue.toFixed(2), alignment: AlignmentType.RIGHT, bold: true })]
            }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Итого зарплаты", bold: true })]
            }),
            new TableCell({
              children: [new Paragraph({ text: generalReportData.totalSalaries.toFixed(2), alignment: AlignmentType.RIGHT, bold: true })]
            }),
          ]
        }),
      ];

      // Создаем таблицу по организациям, если есть данные
      const orgTableRows = [];
      if (generalReportData.organizationBreakdown.length > 0) {
        orgTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "Организация", alignment: AlignmentType.CENTER, bold: true })],
                width: { size: 3000, type: "dxa" }
              }),
              new TableCell({
                children: [new Paragraph({ text: "Сумма (BYN)", alignment: AlignmentType.CENTER, bold: true })],
                width: { size: 2000, type: "dxa" }
              }),
            ],
            tableHeader: true
          })
        );

        generalReportData.organizationBreakdown.forEach(org => {
          orgTableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: org.name })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: org.amount.toFixed(2), alignment: AlignmentType.RIGHT })]
                }),
              ]
            })
          );
        });
      }

      // Создаем документ
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Заголовок отчета
              new Paragraph({
                text: "Общий отчёт по выручке",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),

              // Период отчета
              new Paragraph({
                text: `Период: ${format(generalStartDate, 'dd.MM.yyyy')} - ${format(generalEndDate, 'dd.MM.yyyy')}`,
                spacing: { after: 300 }
              }),

              // Общая таблица
              new Paragraph({
                text: "Сводка по выручке:",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200 }
              }),

              new Table({
                rows: summaryTableRows,
                width: { size: 5000, type: "dxa" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                }
              }),

              // Таблица по организациям
              ...(orgTableRows.length > 0 ? [
                new Paragraph({
                  text: "Детализация по организациям:",
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 400, after: 200 }
                }),

                new Table({
                  rows: orgTableRows,
                  width: { size: 5000, type: "dxa" },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  }
                }),
              ] : []),

              // Дата создания
              new Paragraph({
                spacing: { before: 400, after: 400 },
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `Отчет сформирован: ${format(new Date(), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}`, size: 18 })]
              }),

              // Место для подписи
              new Paragraph({
                text: "Подпись ответственного лица: ___________________",
                spacing: { before: 400 }
              }),
            ]
          }
        ]
      });

      // Сохраняем документ
      const blob = await Packer.toBlob(doc);
      const fileName = `Общий_отчет_выручка_${format(new Date(), 'dd-MM-yyyy')}.docx`;
      saveAs(blob, fileName);

      toast.success('Документ успешно экспортирован');
    } catch (error) {
      console.error('Ошибка при экспорте документа:', error);
      toast.error('Ошибка при экспорте документа');
    }
  };

  return (
    <div className="space-y-5 min-h-screen pb-20 overflow-x-hidden">
      <h2 className="text-xl sm:text-2xl font-semibold border-b pb-3">Отчеты</h2>

      <Tabs defaultValue="employee-earnings" className="w-full">
        <div className="mb-4 overflow-x-auto">
          <TabsList className="flex w-max min-w-full">
            <TabsTrigger value="employee-earnings" className="flex items-center gap-2 whitespace-nowrap">
              Расчет ЗП
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2 whitespace-nowrap">
              <Building className="h-4 w-4" />
              Отчеты по организациям
            </TabsTrigger>
            <TabsTrigger value="general-revenue" className="flex items-center gap-2 whitespace-nowrap">
              <TrendingUp className="h-4 w-4" />
              Общий отчёт по выручке
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="employee-earnings" className="space-y-5">
          <div className="card-with-shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Выбор Периода</h3>

            <div className="space-y-4">
              {/* Period type selector */}
              <div className="segmented-control mb-4">
                <button
                  onClick={() => setPeriodType('day')}
                  className={periodType === 'day' ? 'active' : ''}
                >
                  День
                </button>
                <button
                  onClick={() => setPeriodType('week')}
                  className={periodType === 'week' ? 'active' : ''}
                >
                  Неделя
                </button>
                <button
                  onClick={() => setPeriodType('month')}
                  className={periodType === 'month' ? 'active' : ''}
                >
                  Месяц
                </button>
                <button
                  onClick={() => setPeriodType('custom')}
                  className={periodType === 'custom' ? 'active' : ''}
                >
                  Период
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
                ) : periodType === 'week' || periodType === 'month' ? (
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
              <div className="grid grid-cols-7 gap-1 sm:gap-2 bg-muted/50 px-2 md:px-4 py-1.5 md:py-2 border-b">
                <div className="font-medium text-xs md:text-sm px-1">Сотрудник</div>
                <div className="font-medium text-xs md:text-sm text-right px-1">Нал</div>
                <div className="font-medium text-xs md:text-sm text-right px-1">Карт</div>
                <div className="font-medium text-xs md:text-sm text-right px-1">Безнал</div>
                <div className="font-medium text-xs md:text-sm text-right px-1">Долг</div>
                <div className="font-medium text-xs md:text-sm text-right px-1">Всего</div>
                <div className="font-medium text-xs md:text-sm text-right px-1">ЗП</div>
              </div>
              <div className="divide-y">
                {earningsReport.map(report => {
                  const totalRevenueEmp = report.totalCash + report.totalNonCash + report.totalOrganizations + report.totalDebt;

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
                      // Фильтруем записи для этого сотрудника и сортируем по времени
                      const employeeRecords = records
                        .filter(record => record.employeeIds.includes(report.employeeId))
                        .sort((a, b) => {
                          // Сначала сортируем по дате
                          const dateCompare = a.date.localeCompare(b.date);
                          if (dateCompare !== 0) return dateCompare;

                          // Затем по времени
                          if (!a.time || !b.time) return 0;
                          return a.time.localeCompare(b.time);
                        });
                      setSelectedEmployeeForModal(employee);
                      setIsModalOpen(true);
                    }
                  };

                  return (
                    <div
                      key={report.employeeId}
                      className="grid grid-cols-7 gap-1 sm:gap-2 px-2 md:px-4 py-1.5 md:py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={handleEmployeeClick}
                    >
                      <div className="text-primary hover:text-primary/80 font-medium text-xs md:text-sm truncate px-1" title={report.employeeName}>{report.employeeName}</div>
                      <div className="text-right text-xs md:text-sm px-1">{report.totalCash.toFixed(2)}</div>
                      <div className="text-right text-xs md:text-sm px-1">{report.totalNonCash.toFixed(2)}</div>
                      <div className="text-right text-xs md:text-sm px-1">{report.totalOrganizations.toFixed(2)}</div>
                      <div className="text-right text-xs md:text-sm px-1 text-red-500">{report.totalDebt.toFixed(2)}</div>
                      <div className="text-right text-xs md:text-sm px-1">{totalRevenueEmp.toFixed(2)}</div>
                      <div className="text-right font-medium text-xs md:text-sm px-1 flex items-center justify-end gap-1">
                        <span className={report.isManual ? "text-orange-500 font-bold" : ""}>
                          {perEmployee.toFixed(2)}
                          {report.isManual && "*"}
                        </span>
                        {periodType === 'day' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleManualSalaryEdit(report.employeeId, perEmployee);
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Изменить зарплату вручную"
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
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

        <TabsContent value="general-revenue" className="space-y-5">
          <div className="card-with-shadow p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Общий отчёт по выручке
              <TooltipModal
                title="Общий отчёт по выручке"
                content="Комплексная аналитическая система для анализа финансовых показателей автомойки:

Возможности отчёта:
• Анализ выручки по типам платежей (наличные, карта, безнал)
• Расчёт ключевых бизнес-показателей и метрик эффективности
• Прогнозирование и анализ трендов развития
• Детальная сегментация по дням недели и организациям
• Интерактивные графики динамики выручки

Выберите период и нажмите 'Сформировать отчёт' для получения детальной аналитики. Отчёт можно экспортировать в Word для печати или отправки."
              />
            </h3>

            <div className="space-y-4">
              {/* Быстрые периоды */}
              <div className="segmented-control mb-4 overflow-x-auto">
                <button
                  onClick={() => {
                    const today = new Date();
                    setGeneralStartDate(today);
                    setGeneralEndDate(today);
                  }}
                  className="text-[10px] sm:text-xs"
                >
                  Сегодня
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    setGeneralStartDate(weekAgo);
                    setGeneralEndDate(today);
                  }}
                  className="text-[10px] sm:text-xs"
                >
                  7 дней
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    setGeneralStartDate(monthAgo);
                    setGeneralEndDate(today);
                  }}
                  className="text-[10px] sm:text-xs"
                >
                  30 дней
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    setGeneralStartDate(startOfMonth);
                    setGeneralEndDate(today);
                  }}
                  className="text-[10px] sm:text-xs"
                >
                  Месяц
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                    setGeneralStartDate(lastMonthStart);
                    setGeneralEndDate(lastMonthEnd);
                  }}
                  className="text-[10px] sm:text-xs"
                >
                  Прошлый
                </button>
              </div>

              {/* Выбор периода */}
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Начальная дата</label>
                  <input
                    type="date"
                    value={format(generalStartDate, 'yyyy-MM-dd')}
                    onChange={(e) => setGeneralStartDate(new Date(e.target.value))}
                    className="px-3 py-2 border border-input rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Конечная дата</label>
                  <input
                    type="date"
                    value={format(generalEndDate, 'yyyy-MM-dd')}
                    onChange={(e) => setGeneralEndDate(new Date(e.target.value))}
                    className="px-3 py-2 border border-input rounded-lg bg-background"
                  />
                </div>
                <div className="flex items-end reports-buttons">
                  <button
                    onClick={loadGeneralReport}
                    disabled={generalReportLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {generalReportLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      'Сформировать отчёт'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Результаты отчёта */}
          {generalReportData && (
            <div className="card-with-shadow overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="font-medium">
                  Период: {format(generalStartDate, 'dd.MM.yyyy')} - {format(generalEndDate, 'dd.MM.yyyy')}
                </h3>
                <div className="reports-buttons">
                  <button
                    onClick={exportGeneralReportToWord}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Экспорт в Word
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* КПЭ директора */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    Ключевые бизнес-показатели
                    <TooltipModal
                      title="Ключевые бизнес-показатели"
                      content="Основные финансовые показатели работы автомойки:

• Наличные - денежные средства, полученные наличными
• Карта - оплата банковскими картами
• Безнал - платежи от организаций по договорам
• Общая выручка - сумма всех поступлений за период
• Зарплаты - общий фонд оплаты труда сотрудников
• Чистая прибыль - выручка минус зарплаты (упрощенный расчет)

Проценты показывают долю каждого типа платежей от общей выручки."
                    />
                  </h4>

                  {/* Основные показатели */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Наличные</div>
                      <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {generalReportData.totalCash.toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        {((generalReportData.totalCash / generalReportData.totalRevenue) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Карта</div>
                      <div className="text-lg font-bold text-green-900 dark:text-green-100">
                        {generalReportData.totalCard.toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        {((generalReportData.totalCard / generalReportData.totalRevenue) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Безнал</div>
                      <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                        {generalReportData.totalOrganizations.toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">
                        {((generalReportData.totalOrganizations / generalReportData.totalRevenue) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Долги</div>
                      <div className="text-lg font-bold text-red-900 dark:text-red-100">
                        {generalReportData.totalDebt.toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300">
                        {((generalReportData.totalDebt / generalReportData.totalRevenue) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/10 to-primary/20 p-3 rounded-lg border border-primary/30">
                      <div className="text-xs font-medium text-primary mb-1">Общая выручка</div>
                      <div className="text-lg font-bold text-primary">
                        {generalReportData.totalRevenue.toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-primary/80">
                        {generalReportData.dailyData.reduce((sum, day) => sum + day.recordsCount, 0)} авто
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Зарплаты</div>
                      <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                        {generalReportData.totalSalaries.toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300">
                        {((generalReportData.totalSalaries / generalReportData.totalRevenue) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Чистая прибыль</div>
                      <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                        {(generalReportData.totalRevenue - generalReportData.totalSalaries).toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-300">
                        {(((generalReportData.totalRevenue - generalReportData.totalSalaries) / generalReportData.totalRevenue) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Детальная аналитика */}
                  <div className="mb-3">
                    <h5 className="text-md font-semibold mb-4 flex items-center">
                      Детальная аналитика
                      <TooltipModal
                        title="Детальная аналитика"
                        content="Дополнительные показатели эффективности:

• Средний чек - выручка, деленная на количество обслуженных автомобилей
• Среднее/день - средняя выручка за один рабочий день
• Лучший день - день с максимальной выручкой за период
• Худший день - день с минимальной выручкой за период
• Рентабельность - отношение прибыли к затратам в процентах (прибыль/зарплаты * 100%)

Эти показатели помогают оценить стабильность работы и найти точки роста."
                      />
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">Средний чек</div>
                      <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                        {generalReportData.dailyData.reduce((sum, day) => sum + day.recordsCount, 0) > 0 ?
                          (generalReportData.totalRevenue / generalReportData.dailyData.reduce((sum, day) => sum + day.recordsCount, 0)).toFixed(0) : 0} BYN
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 p-3 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-1">Среднее/день</div>
                      <div className="text-lg font-bold text-cyan-900 dark:text-cyan-100">
                        {generalReportData.averageDaily.toFixed(0)} BYN
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800">
                      <div className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">Лучший день</div>
                      <div className="text-lg font-bold text-rose-900 dark:text-rose-100">
                        {generalReportData.maxDay.amount.toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-rose-700 dark:text-rose-300">
                        {generalReportData.maxDay.date}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Худший день</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {generalReportData.minDay.amount.toFixed(0)} BYN
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        {generalReportData.minDay.date}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Рентабельность</div>
                      <div className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                        {(((generalReportData.totalRevenue - generalReportData.totalSalaries) / generalReportData.totalSalaries) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Дополнительные метрики */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-card border border-border p-3 rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Рабочих дней</div>
                      <div className="text-lg font-bold">
                        {generalReportData.dailyData.filter(day => day.recordsCount > 0).length}
                      </div>
                    </div>

                    <div className="bg-card border border-border p-3 rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Авто в день</div>
                      <div className="text-lg font-bold">
                        {generalReportData.dailyData.filter(day => day.recordsCount > 0).length > 0 ?
                          Math.round(generalReportData.dailyData.reduce((sum, day) => sum + day.recordsCount, 0) /
                          generalReportData.dailyData.filter(day => day.recordsCount > 0).length) : 0}
                      </div>
                    </div>

                    <div className="bg-card border border-border p-3 rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Макс авто/день</div>
                      <div className="text-lg font-bold">
                        {Math.max(...generalReportData.dailyData.map(day => day.recordsCount))}
                      </div>
                    </div>

                    <div className="bg-card border border-border p-3 rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Дней без работы</div>
                      <div className="text-lg font-bold">
                        {generalReportData.dailyData.filter(day => day.recordsCount === 0).length}
                      </div>
                    </div>
                  </div>

                  {/* Аналитика эффективности */}
                  <div className="mt-6">
                    <h5 className="text-md font-semibold mb-4 flex items-center">
                      Аналитика эффективности
                      <TooltipModal
                        title="Аналитика эффективности"
                        content="Показатели операционной эффективности автомойки:

• Выручка/рабочий день - средняя выручка только за дни, когда была работа (исключая выходные)
• Стабильность дохода - показатель постоянства выручки (100% = одинаковая выручка каждый день)
• Потенциал роста - насколько можно увеличить среднюю выручку, ориентируясь на лучший день
• Эффективность персонала - сколько рублей выручки приносит каждый рубль зарплаты

Эти метрики помогают оптимизировать работу и планировать развитие."
                      />
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-card border border-border p-3 rounded-lg">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Выручка/рабочий день</div>
                        <div className="text-lg font-bold">
                          {generalReportData.dailyData.filter(day => day.recordsCount > 0).length > 0 ?
                            (generalReportData.totalRevenue / generalReportData.dailyData.filter(day => day.recordsCount > 0).length).toFixed(0) : 0} BYN
                        </div>
                      </div>

                      <div className="bg-card border border-border p-3 rounded-lg">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Стабильность дохода</div>
                        <div className="text-lg font-bold">
                          {(() => {
                            const workingDays = generalReportData.dailyData.filter(day => day.recordsCount > 0);
                            if (workingDays.length === 0) return '0%';
                            const avg = workingDays.reduce((sum, day) => sum + day.total, 0) / workingDays.length;
                            const variance = workingDays.reduce((sum, day) => sum + Math.pow(day.total - avg, 2), 0) / workingDays.length;
                            const coefficient = avg > 0 ? (Math.sqrt(variance) / avg) : 0;
                            return (100 - Math.min(100, coefficient * 100)).toFixed(0) + '%';
                          })()}
                        </div>
                      </div>

                      <div className="bg-card border border-border p-3 rounded-lg">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Потенциал роста</div>
                        <div className="text-lg font-bold">
                          {(() => {
                            const maxDay = generalReportData.maxDay.amount;
                            const avgDay = generalReportData.averageDaily;
                            return avgDay > 0 ? Math.round((maxDay / avgDay - 1) * 100) + '%' : '0%';
                          })()}
                        </div>
                      </div>

                      <div className="bg-card border border-border p-3 rounded-lg">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Эффективность персонала</div>
                        <div className="text-lg font-bold">
                          {generalReportData.totalSalaries > 0 ?
                            (generalReportData.totalRevenue / generalReportData.totalSalaries).toFixed(1) + 'x' : '0x'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Прогнозы и тренды */}
                  <div className="mt-6">
                    <h5 className="text-md font-semibold mb-4 flex items-center">
                      Прогнозы и тренды
                      <TooltipModal
                        title="Прогнозы и тренды"
                        content="Аналитические прогнозы развития бизнеса:

• Прогноз на следующий месяц - ожидаемая выручка, рассчитанная на основе средней дневной выручки за текущий период
• Тренд роста - сравнение первой и второй половины периода для определения динамики развития (+/- в процентах)
• Оптимальная нагрузка - рекомендуемая дневная выручка (80% от максимального показателя для устойчивой работы)

Прогнозы основаны на исторических данных и текущих трендах."
                      />
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Прогноз на следующий месяц</div>
                        <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          {(() => {
                            const daysInPeriod = generalReportData.dailyData.length;
                            const avgDaily = generalReportData.averageDaily;
                            const daysInMonth = 30;
                            return (avgDaily * daysInMonth).toFixed(0);
                          })()} BYN
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Основано на текущем среднем
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Тренд роста</div>
                        <div className="text-xl font-bold text-green-900 dark:text-green-100">
                          {(() => {
                            const data = generalReportData.dailyData.filter(day => day.total > 0);
                            if (data.length < 2) return '0%';
                            const firstHalf = data.slice(0, Math.floor(data.length / 2));
                            const secondHalf = data.slice(Math.floor(data.length / 2));
                            const firstAvg = firstHalf.reduce((sum, day) => sum + day.total, 0) / firstHalf.length;
                            const secondAvg = secondHalf.reduce((sum, day) => sum + day.total, 0) / secondHalf.length;
                            const growth = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg * 100) : 0;
                            return (growth > 0 ? '+' : '') + growth.toFixed(1) + '%';
                          })()}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                          Сравнение периодов
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">Оптимальная нагрузка</div>
                        <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
                          {Math.round(generalReportData.maxDay.amount * 0.8).toFixed(0)} BYN
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                          80% от максимума
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Детальная сегментация */}
                  <div className="mt-6">
                    <h5 className="text-md font-semibold mb-4 flex items-center">
                      Детальная сегментация
                      <TooltipModal
                        title="Детальная сегментация"
                        content="Углубленный анализ работы автомойки:

Анализ по дням недели:
• Показывает средние значения выручки и количества автомобилей для каждого дня недели
• Помогает выявить самые прибыльные дни и планировать график работы

Качество обслуживания:
• Загруженность мойки - процент использования максимальной пропускной способности
• Пиковые дни - количество дней с нагрузкой выше средней в 1.5 раза
• Стабильность потока - равномерность загрузки по дням (чем выше, тем стабильнее поток клиентов)

Эти данные помогают оптимизировать рабочие процессы."
                      />
                    </h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Анализ по дням недели */}
                      <div className="bg-card border border-border rounded-lg p-4">
                        <h6 className="font-medium mb-3">Анализ по дням недели</h6>
                        <div className="space-y-2">
                          {(() => {
                            const weekdayStats = generalReportData.dailyData.reduce((acc, day, index) => {
                              const date = new Date(generalStartDate);
                              date.setDate(date.getDate() + index);
                              const dayOfWeek = date.getDay();
                              const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                              const dayName = dayNames[dayOfWeek];

                              if (!acc[dayName]) {
                                acc[dayName] = { total: 0, count: 0, cars: 0 };
                              }
                              acc[dayName].total += day.total;
                              acc[dayName].cars += day.recordsCount;
                              acc[dayName].count += 1;
                              return acc;
                            }, {});

                            return Object.entries(weekdayStats)
                              .sort(([, a], [, b]) => b.total / b.count - a.total / a.count)
                              .map(([day, stats]) => (
                                <div key={day} className="flex justify-between items-center p-2 rounded bg-muted/30">
                                  <span className="text-sm font-medium">{day}</span>
                                  <div className="text-right">
                                    <div className="text-sm font-bold">
                                      {stats.count > 0 ? (stats.total / stats.count).toFixed(0) : 0} BYN
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {stats.count > 0 ? Math.round(stats.cars / stats.count) : 0} авто
                                    </div>
                                  </div>
                                </div>
                              ));
                          })()}
                        </div>
                      </div>

                      {/* Качество обслуживания */}
                      <div className="bg-card border border-border rounded-lg p-4">
                        <h6 className="font-medium mb-3">Качество обслуживания</h6>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Загруженность мойки</span>
                            <span className="text-sm font-bold">
                              {(() => {
                                const maxCarsPerDay = Math.max(...generalReportData.dailyData.map(day => day.recordsCount));
                                const avgCarsPerDay = generalReportData.dailyData.reduce((sum, day) => sum + day.recordsCount, 0) / generalReportData.dailyData.length;
                                return maxCarsPerDay > 0 ? Math.round((avgCarsPerDay / maxCarsPerDay) * 100) + '%' : '0%';
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Пиковые дни</span>
                            <span className="text-sm font-bold">
                              {generalReportData.dailyData.filter(day =>
                                day.recordsCount > generalReportData.dailyData.reduce((sum, d) => sum + d.recordsCount, 0) / generalReportData.dailyData.length * 1.5
                              ).length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Стабильность потока</span>
                            <span className="text-sm font-bold">
                              {(() => {
                                const workingDays = generalReportData.dailyData.filter(day => day.recordsCount > 0);
                                if (workingDays.length === 0) return '0%';
                                const avgCars = workingDays.reduce((sum, day) => sum + day.recordsCount, 0) / workingDays.length;
                                const variance = workingDays.reduce((sum, day) => sum + Math.pow(day.recordsCount - avgCars, 2), 0) / workingDays.length;
                                const stability = avgCars > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avgCars * 100)) : 0;
                                return Math.round(stability) + '%';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Интерактивные графики */}
                <div className="space-y-6">
                  {/* График выручки по дням */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      Динамика выручки
                      <TooltipModal
                        title="Динамика выручки"
                        content="Интерактивный график изменения выручки по дням:

Линии графика:
• Фиолетовая (толстая) - общая выручка за день
• Зеленая - поступления наличными
• Оранжевая - платежи картой
• Красная - безналичные платежи от организаций

Возможности:
• Наведите курсор на точку для детальной информации
• Все суммы отображаются в белорусских рублях (BYN)
• График показывает тренды и помогает выявить закономерности

Полезно для анализа сезонности и планирования работы."
                      />
                    </h4>
                    <div className="bg-card border border-border rounded-lg p-2 sm:p-4 overflow-hidden">
                      <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
                        <LineChart data={generalReportData.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis
                            dataKey="date"
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              `${value.toFixed(2)} BYN`,
                              name === 'total'
                                ? 'Общая выручка'
                                : name === 'cash'
                                  ? 'Наличные'
                                  : name === 'card'
                                    ? 'Карта'
                                    : name === 'debt'
                                      ? 'Долги'
                                      : 'Безнал',
                            ]}
                            labelFormatter={(label) => `Дата: ${label}`}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            name="Общая выручка"
                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 7, stroke: '#8b5cf6', strokeWidth: 2 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="cash"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Наличные"
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="card"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            name="Карта"
                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="organizations"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="Безнал"
                            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="debt"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            name="Долги"
                            dot={{ fill: '#f43f5e', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Комбинированный график: выручка и количество авто */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      Выручка vs Количество автомобилей
                      <TooltipModal
                        title="Выручка vs Количество автомобилей"
                        content="Комбинированный график для анализа связи между объемом работ и доходом:

Элементы графика:
• Фиолетовые столбцы - выручка за день (левая ось, BYN)
• Оранжевая линия - количество обслуженных автомобилей (правая ось, штук)

Анализ показывает:
• Эффективность работы (соотношение выручки к количеству авто)
• Изменение среднего чека по дням
• Корреляцию между объемом работ и доходом
• Дни с высокой/низкой эффективностью

Помогает оптимизировать ценообразование и планировать нагрузку."
                      />
                    </h4>
                    <div className="bg-card border border-border rounded-lg p-2 sm:p-4 overflow-hidden">
                      <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                        <BarChart data={generalReportData.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis
                            dataKey="date"
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis yAxisId="left" fontSize={12} />
                          <YAxis yAxisId="right" orientation="right" fontSize={12} />
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              name === 'recordsCount' ? `${value} авто` : `${value.toFixed(2)} BYN`,
                              name === 'recordsCount' ? 'Количество авто' : 'Выручка'
                            ]}
                            labelFormatter={(label) => `Дата: ${label}`}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="total"
                            fill="#8b5cf6"
                            name="Выручка (BYN)"
                            radius={[2, 2, 0, 0]}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="recordsCount"
                            stroke="#f97316"
                            strokeWidth={3}
                            name="Количество авто"
                            dot={{ fill: '#f97316', strokeWidth: 2, r: 5 }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Структура оплат - круговая диаграмма */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      Структура платежей
                      <TooltipModal
                        title="Структура платежей"
                        content="Анализ способов оплаты клиентов:

Типы платежей:
• Наличные - оплата наличными деньгами
• Карта - оплата банковскими картами
• Безнал - платежи от организаций по договорам

Показатели:
• Абсолютные суммы в белорусских рублях
• Процентное соотношение от общей выручки
• Тенденции изменения предпочтений клиентов

Анализ помогает:
• Планировать техническое оснащение (терминалы, касса)
• Оценивать налоговые обязательства
• Развивать корпоративное направление
• Понимать предпочтения клиентов"
                      />
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="font-medium">Наличные</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{generalReportData.totalCash.toFixed(0)} BYN</div>
                              <div className="text-sm text-muted-foreground">
                                {((generalReportData.totalCash / generalReportData.totalRevenue) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="font-medium">Долги</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{generalReportData.totalDebt.toFixed(0)} BYN</div>
                              <div className="text-sm text-muted-foreground">
                                {((generalReportData.totalDebt / generalReportData.totalRevenue) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="font-medium">Карта</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{generalReportData.totalCard.toFixed(0)} BYN</div>
                              <div className="text-sm text-muted-foreground">
                                {((generalReportData.totalCard / generalReportData.totalRevenue) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                              <span className="font-medium">Безнал</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{generalReportData.totalOrganizations.toFixed(0)} BYN</div>
                              <div className="text-sm text-muted-foreground">
                                {((generalReportData.totalOrganizations / generalReportData.totalRevenue) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card border border-border rounded-lg p-4">
                        <h5 className="font-medium mb-3">Тенденции оплат</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Доля наличных:</span>
                            <span className={`font-medium ${
                              (generalReportData.totalCash / generalReportData.totalRevenue) > 0.5 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {((generalReportData.totalCash / generalReportData.totalRevenue) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Безналичные платежи:</span>
                            <span className="font-medium text-blue-600">
                              {(((generalReportData.totalCard + generalReportData.totalOrganizations) / generalReportData.totalRevenue) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Доля долгов:</span>
                            <span className="font-medium text-red-600">
                              {((generalReportData.totalDebt / generalReportData.totalRevenue) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Наибольшая доля:</span>
                            <span className="font-medium">
                              {generalReportData.totalCash > generalReportData.totalCard && generalReportData.totalCash > generalReportData.totalOrganizations
                                ? 'Наличные'
                                : generalReportData.totalCard > generalReportData.totalOrganizations
                                ? 'Карта'
                                : 'Безнал'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Детализация по организациям */}
                {generalReportData.organizationBreakdown.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      Анализ по организациям
                      <TooltipModal
                        title="Анализ по организациям"
                        content="Детальная аналитика корпоративных клиентов:

Основные показатели:
• Количество организаций - общее число корпоративных клиентов за период
• Крупнейший клиент - организация с наибольшим объемом платежей
• Доля безнала - процент корпоративных платежей от общей выручки

Рейтинг организаций:
• Топ-5 организаций с наибольшими суммами
• Процент от безналичных платежей и от общей выручки
• Цветовая индикация значимости клиентов (зеленый >10%, желтый >5%, серый <5%)

Помогает определить ключевых клиентов и развивать корпоративное направление."
                      />
                    </h4>

                    {/* Краткая сводка */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Количество организаций</div>
                        <div className="text-2xl font-bold">{generalReportData.organizationBreakdown.length}</div>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Крупнейший клиент</div>
                        <div className="text-lg font-bold">
                          {generalReportData.organizationBreakdown.sort((a, b) => b.amount - a.amount)[0]?.name || 'Нет данных'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {generalReportData.organizationBreakdown.sort((a, b) => b.amount - a.amount)[0]?.amount.toFixed(0)} BYN
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Доля безнала</div>
                        <div className="text-2xl font-bold">
                          {((generalReportData.totalOrganizations / generalReportData.totalRevenue) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Рейтинг организаций */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Топ организации */}
                      <div>
                        <h5 className="font-medium mb-3">Топ-5 организаций</h5>
                        <div className="space-y-2">
                          {generalReportData.organizationBreakdown
                            .sort((a, b) => b.amount - a.amount)
                            .slice(0, 5)
                            .map((org, index) => (
                            <div key={index} className="bg-card border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                    index === 0 ? 'bg-yellow-500' :
                                    index === 1 ? 'bg-gray-400' :
                                    index === 2 ? 'bg-amber-600' :
                                    'bg-blue-500'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium">{org.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {((org.amount / generalReportData.totalOrganizations) * 100).toFixed(1)}% от безнала
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">{org.amount.toFixed(0)} BYN</div>
                                  <div className="text-xs text-muted-foreground">
                                    {((org.amount / generalReportData.totalRevenue) * 100).toFixed(1)}% общей выручки
                                  </div>
                                </div>
                              </div>

                              {/* Прогресс бар */}
                              <div className="mt-2">
                                <div className="w-full bg-secondary/30 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      index === 0 ? 'bg-yellow-500' :
                                      index === 1 ? 'bg-gray-400' :
                                      index === 2 ? 'bg-amber-600' :
                                      'bg-blue-500'
                                    }`}
                                    style={{
                                      width: `${(org.amount / generalReportData.organizationBreakdown[0].amount) * 100}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Полная таблица для остальных */}
                      <div>
                        <h5 className="font-medium mb-3">Все организации</h5>
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                  <th className="py-3 px-4 text-left text-sm font-medium">Организация</th>
                                  <th className="py-3 px-4 text-right text-sm font-medium">Сумма</th>
                                  <th className="py-3 px-4 text-right text-sm font-medium">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {generalReportData.organizationBreakdown
                                  .sort((a, b) => b.amount - a.amount)
                                  .map((org, index) => (
                                  <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium">
                                      {index < 3 && (
                                        <span className="mr-2 font-bold text-primary">
                                          #{index + 1}
                                        </span>
                                      )}
                                      {org.name}
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold">{org.amount.toFixed(0)} BYN</td>
                                    <td className="py-3 px-4 text-right text-sm">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        (org.amount / generalReportData.totalRevenue) * 100 > 10
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                          : (org.amount / generalReportData.totalRevenue) * 100 > 5
                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                      }`}>
                                        {((org.amount / generalReportData.totalRevenue) * 100).toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {generalReportLoading && (
            <div className="card-with-shadow">
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
                <p>Формирование отчёта...</p>
              </div>
            </div>
          )}
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
          records={records
            .filter(record => record.employeeIds.includes(selectedEmployeeForModal.id))
            .sort((a, b) => {
              // Сначала сортируем по дате
              const dateCompare = a.date.localeCompare(b.date);
              if (dateCompare !== 0) return dateCompare;

              // Затем по времени
              if (!a.time || !b.time) return 0;
              return a.time.localeCompare(b.time);
            })
          }
          periodLabel={formatDateRange()}
          dailyRoles={dailyRoles}
        />
      )}
    </div>
  );
};

export default ReportsPage;
