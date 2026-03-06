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
import { determineEmployeeRole } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import OrganizationsReport from '@/components/OrganizationsReport';
import EmployeeRecordsModal from '@/components/EmployeeRecordsModal';
import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, TextRun, AlignmentType, BorderStyle } from 'docx';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import TooltipModal from '@/components/ui/tooltip-modal';
import { GeneralRevenueReport } from '@/components/Reports/GeneralRevenue/GeneralRevenueReport';

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
        Object.keys(rolesMap).forEach(date => {
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

        // Pre-group records by date to avoid O(N*M) filtering
        const recordsByDate: Record<string, CarWashRecord[]> = {};
        filteredRecords.forEach(rec => {
          const recDate = typeof rec.date === 'string' ? rec.date : format(rec.date, 'yyyy-MM-dd');
          if (!recordsByDate[recDate]) {
            recordsByDate[recDate] = [];
          }
          recordsByDate[recDate].push(rec);
        });

        datesInPeriod.forEach(dateStr => {
          const recordsForDay = recordsByDate[dateStr] || [];

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
            employeeRolesForDay[empId] = determineEmployeeRole(empId, dateStr, dayRoles, state.employees);

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

    const newSalary = Number.parseFloat(newSalaryStr.replace(',', '.'));
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

        // Pre-group records by date to avoid O(N*M) filtering
        const recordsByDate: Record<string, CarWashRecord[]> = {};
        allRecords.forEach(rec => {
          const recDate = typeof rec.date === 'string' ? rec.date : format(rec.date, 'yyyy-MM-dd');
          if (!recordsByDate[recDate]) {
            recordsByDate[recDate] = [];
          }
          recordsByDate[recDate].push(rec);
        });

        dateRange.forEach(dateStr => {
          const recordsForDay = recordsByDate[dateStr] || [];

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
            employeeRolesForDay[empId] = determineEmployeeRole(empId, dateStr, dayRoles, state.employees);

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

            <div className="border rounded-md overflow-x-auto">
              <div className="min-w-[500px]">
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
                  const perEmployee = report.calculatedEarnings;

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
          <div className="card-with-shadow p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Фильтры отчёта
            </h3>

            <div className="space-y-6">
              {/* Быстрые периоды */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const today = new Date();
                    setGeneralStartDate(today);
                    setGeneralEndDate(today);
                  }}
                  className="px-3 py-1.5 text-sm bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
                >
                  Сегодня
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const yesterday = new Date(today.getTime());
                    yesterday.setDate(yesterday.getDate() - 1);
                    setGeneralStartDate(yesterday);
                    setGeneralEndDate(yesterday);
                  }}
                  className="px-3 py-1.5 text-sm bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
                >
                  Вчера
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const startOfWk = startOfWeek(today, { weekStartsOn: 1 });
                    setGeneralStartDate(startOfWk);
                    setGeneralEndDate(today);
                  }}
                  className="px-3 py-1.5 text-sm bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
                >
                  Неделя
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const startOf30 = new Date(today.getTime());
                    startOf30.setDate(startOf30.getDate() - 30);
                    setGeneralStartDate(startOf30);
                    setGeneralEndDate(today);
                  }}
                  className="px-3 py-1.5 text-sm bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
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
                  className="px-3 py-1.5 text-sm bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
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
                  className="px-3 py-1.5 text-sm bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
                >
                  Прошлый
                </button>
              </div>

              {/* Выбор периода и кнопка */}
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="w-full sm:w-auto">
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Начало периода</label>
                  <input
                    type="date"
                    value={format(generalStartDate, 'yyyy-MM-dd')}
                    onChange={(e) => setGeneralStartDate(new Date(e.target.value))}
                    className="w-full px-4 py-2 border border-input rounded-xl bg-background shadow-sm focus:ring-2 focus:ring-primary/20 transition-shadow"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Конец периода</label>
                  <input
                    type="date"
                    value={format(generalEndDate, 'yyyy-MM-dd')}
                    onChange={(e) => setGeneralEndDate(new Date(e.target.value))}
                    className="w-full px-4 py-2 border border-input rounded-xl bg-background shadow-sm focus:ring-2 focus:ring-primary/20 transition-shadow"
                  />
                </div>
                <div className="w-full sm:w-auto mt-4 sm:mt-0">
                  <button
                    onClick={loadGeneralReport}
                    disabled={generalReportLoading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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

          {/* Результаты отчёта (Новый дизайн) */}
          <GeneralRevenueReport
            data={generalReportData}
            startDate={generalStartDate}
            endDate={generalEndDate}
            onExport={exportGeneralReportToWord}
            isLoading={generalReportLoading}
            onRefresh={loadGeneralReport}
          />
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
