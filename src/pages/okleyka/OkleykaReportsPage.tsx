import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import { okleykaOrderService, okleykaShiftService, okleykaDebtService, okleykaSettingsService } from "@/lib/services/okleykaService";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import OkleykaOrganizationsReport from "@/components/okleyka/OkleykaOrganizationsReport";
import OkleykaGeneralRevenueReport from "@/components/okleyka/OkleykaGeneralRevenueReport";
import PasswordAuth from "@/components/ui/PasswordAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  subMonths,
  parseISO,
} from "date-fns";
import { ru } from "date-fns/locale";
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Building,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  Loader2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  X,
} from "lucide-react";

interface EmployeeReportRow {
  id: string;
  name: string;
  position: string;
  earned: number;
  paid: number;
  balance: number;
}

interface WorkerOrderDetail {
  id: string;
  employeeId: string;
  date: string;
  carInfo: string;
  serviceName: string;
  price: number;
  salary: number;
  isPaid: boolean;
}

interface EmployeeOkleykaRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  periodRange: string;
  records: WorkerOrderDetail[];
}

const EmployeeOkleykaRecordsModal: React.FC<EmployeeOkleykaRecordsModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  periodRange,
  records,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/20">
          <div>
            <h3 className="text-lg font-bold text-foreground">{employeeName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Период: {periodRange}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Нет выполненных услуг за этот период.
            </div>
          ) : (
            <div className="overflow-x-auto border border-border/30 rounded-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/40 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Дата</th>
                    <th className="py-3 px-4">Автомобиль</th>
                    <th className="py-3 px-4">Услуга</th>
                    <th className="py-3 px-4 text-right">Зарплата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-muted-foreground">
                        {format(parseISO(rec.date), "dd.MM.yyyy")}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{rec.carInfo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{rec.serviceName}</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums">
                        {rec.salary.toLocaleString("ru-RU")} BYN
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/20 bg-muted/20 flex justify-between items-center rounded-b-2xl">
          <div className="text-xs text-muted-foreground">
            Всего услуг: <span className="font-bold text-foreground">{records.length}</span>
          </div>
          <div className="text-sm font-bold text-foreground">
            Общая сумма ЗП:{" "}
            <span className="text-primary">
              {records.reduce((sum, r) => sum + r.salary, 0).toLocaleString("ru-RU")} BYN
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

type PresetRange = "today" | "yesterday" | "this_week" | "this_month" | "last_month";

const OkleykaReportsPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { state } = useOkleykaContext();
  
  // Date filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [activePreset, setActivePreset] = useState<PresetRange | "custom">("this_month");

  // Report statistics
  const [loading, setLoading] = useState(true);
  const [totalCompletedOrders, setTotalCompletedOrders] = useState(0);
  const [revenueCash, setRevenueCash] = useState(0);
  const [revenueCard, setRevenueCard] = useState(0);
  const [revenueOrg, setRevenueOrg] = useState(0);
  const [revenueDebt, setRevenueDebt] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [employeeRows, setEmployeeRows] = useState<EmployeeReportRow[]>([]);
  
  const [allWorkersDetails, setAllWorkersDetails] = useState<WorkerOrderDetail[]>([]);
  const [selectedEmployeeIdForModal, setSelectedEmployeeIdForModal] = useState<string | null>(null);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);

  const handleRowClick = (employeeId: string) => {
    setSelectedEmployeeIdForModal(employeeId);
    setIsRecordsModalOpen(true);
  };

  // Apply preset dates
  const applyPreset = (preset: PresetRange) => {
    const today = new Date();
    let start = today;
    let end = today;

    switch (preset) {
      case "today":
        start = today;
        end = today;
        break;
      case "yesterday":
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case "this_week":
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "this_month":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "last_month":
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
    }

    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
    setActivePreset(preset);
  };

  const calculateReport = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch completed orders in range
      const allOrders = await okleykaOrderService.getByDateRange(startDate, endDate);
      const completed = allOrders.filter(o => o.status === "completed");
      setTotalCompletedOrders(completed.length);

      // Sum by payment method
      let cash = 0;
      let card = 0;
      let org = 0;
      let debt = 0;

      completed.forEach(o => {
        const type = o.paymentMethod?.type;
        if (type === "cash") cash += o.totalPrice;
        else if (type === "card") card += o.totalPrice;
        else if (type === "organization") org += o.totalPrice;
        else if (type === "debt") debt += o.totalPrice;
      });

      // 2. Fetch shifts in range for payouts calculation
      const shifts = await okleykaShiftService.getByDateRange(startDate, endDate);
      const shiftPayouts: Record<string, number> = {};
      shifts.forEach(shift => {
        if (shift.salaryPayouts) {
          Object.entries(shift.salaryPayouts).forEach(([empId, amount]) => {
            shiftPayouts[empId] = (shiftPayouts[empId] || 0) + amount;
          });
        }
      });

      // 3. Fetch worker records from completed orders to calculate earnings
      const employeeEarnings: Record<string, number> = {};
      const detailsList: WorkerOrderDetail[] = [];

      if (completed.length > 0) {
        const completedIds = completed.map(o => o.id);
        
        // Chunk requests if there are too many completed orders to fit in a single SQL query
        const chunkSize = 100;
        let workersData: any[] = [];
        
        for (let i = 0; i < completedIds.length; i += chunkSize) {
          const chunk = completedIds.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from("okleyka_order_workers")
            .select(`
              id,
              employee_id,
              salary,
              is_paid,
              okleyka_orders (
                date_start,
                car_info,
                status
              ),
              okleyka_order_items (
                name,
                price
              )
            `)
            .in("order_id", chunk);

          if (error) {
            console.error("Error fetching order workers details:", error);
          } else if (data) {
            workersData = [...workersData, ...data];
          }
        }

        workersData.forEach(w => {
          if (w.salary !== null) {
            employeeEarnings[w.employee_id] = (employeeEarnings[w.employee_id] || 0) + Number(w.salary);
          }

          const order = Array.isArray(w.okleyka_orders) ? w.okleyka_orders[0] : w.okleyka_orders;
          const item = Array.isArray(w.okleyka_order_items) ? w.okleyka_order_items[0] : w.okleyka_order_items;

          if (order && item) {
            detailsList.push({
              id: w.id,
              employeeId: w.employee_id,
              date: order.date_start,
              carInfo: order.car_info,
              serviceName: item.name,
              price: Number(item.price || 0),
              salary: w.salary !== null ? Number(w.salary) : 0,
              isPaid: !!w.is_paid,
            });
          }
        });
      }

      // Fetch okleyka settings
      let settings = state.settings;
      if (!settings) {
        try {
          settings = await okleykaSettingsService.get();
        } catch (err) {
          console.error("Error fetching settings in report:", err);
        }
      }

      if (settings && settings.adminSalaryValue > 0) {
        shifts.forEach(shift => {
          const roles = shift.employeeRoles || {};
          Object.entries(roles).forEach(([empId, role]) => {
            if (role === "admin") {
              let dailyAdminSalary = 0;
              let dailyRevenue = 0;
              if (settings!.adminSalaryType === "fixed") {
                dailyAdminSalary = settings!.adminSalaryValue;
              } else if (settings!.adminSalaryType === "percent") {
                const dailyCompletedOrders = completed.filter(
                  o => o.shiftDate === shift.date || (!o.shiftDate && o.dateStart === shift.date)
                );
                dailyRevenue = dailyCompletedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
                dailyAdminSalary = dailyRevenue * (settings!.adminSalaryValue / 100);
              }

              if (dailyAdminSalary > 0) {
                employeeEarnings[empId] = (employeeEarnings[empId] || 0) + dailyAdminSalary;
                detailsList.push({
                  id: `admin-${shift.id}-${empId}`,
                  employeeId: empId,
                  date: shift.date,
                  carInfo: "Администрирование смены",
                  serviceName: settings!.adminSalaryType === "fixed"
                    ? "Фиксированная ставка"
                    : `Процент от выручки (${settings!.adminSalaryValue}%)`,
                  price: dailyRevenue,
                  salary: dailyAdminSalary,
                  isPaid: false,
                });
              }
            }
          });
        });
      }

      setAllWorkersDetails(detailsList);

      // 4. Incorporate closed debts payouts
      // Fetch closed debts in range
      const closedDebts = await okleykaDebtService.getByDateRange(startDate, endDate);
      const closedDebtsFiltered = closedDebts.filter(d => d.isClosed && d.closedAt && d.closedAt.slice(0, 10) >= startDate && d.closedAt.slice(0, 10) <= endDate);

      closedDebtsFiltered.forEach(d => {
        const type = d.actualPaymentMethod?.type;
        if (type === "cash") cash += d.amount;
        else if (type === "card") card += d.amount;
        else if (type === "organization") org += d.amount;

        // Add debt payouts to worker earnings if applicable
        if (d.employeePayouts) {
          Object.entries(d.employeePayouts).forEach(([empId, amount]) => {
            employeeEarnings[empId] = (employeeEarnings[empId] || 0) + amount;
          });
        }
      });

      setRevenueCash(cash);
      setRevenueCard(card);
      setRevenueOrg(org);
      setRevenueDebt(debt);
      setTotalRevenue(cash + card + org);

      // 5. Build employee rows
      const rows: EmployeeReportRow[] = state.employees.map(emp => {
        const earned = employeeEarnings[emp.id] || 0;
        const paid = shiftPayouts[emp.id] || 0;
        return {
          id: emp.id,
          name: emp.name,
          position: emp.position || "Сотрудник",
          earned,
          paid,
          balance: earned - paid,
        };
      });

      // Sort rows by name
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setEmployeeRows(rows);

    } catch (err) {
      console.error("[OkleykaReportsPage] calculate error:", err);
      toast.error("Не удалось сформировать отчёт");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, state.employees]);

  useEffect(() => {
    calculateReport();
  }, [calculateReport]);

  const getPeriodLabel = () => {
    try {
      const start = format(parseISO(startDate), "dd.MM.yyyy");
      const end = format(parseISO(endDate), "dd.MM.yyyy");
      return `${start} - ${end}`;
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <PasswordAuth onSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 w-full mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Финансовые отчеты</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Статистика доходов и расчетов по сдельным работам</p>
      </div>

      {/* Period Selectors & Presets */}
      <div className="bg-card border border-border/50 p-4 rounded-2xl shadow-sm space-y-4">
        {/* Date presets */}
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/20">
          {(["today", "yesterday", "this_week", "this_month", "last_month"] as PresetRange[]).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activePreset === preset
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {{
                today: "Сегодня",
                yesterday: "Вчера",
                this_week: "Эта неделя",
                this_month: "Этот месяц",
                last_month: "Прошлый месяц",
              }[preset]}
            </button>
          ))}
          <button
            onClick={() => setActivePreset("custom")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activePreset === "custom"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Период
          </button>
        </div>

        {/* Date inputs (custom or active preset display) */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset("custom");
              }}
              className="w-full sm:w-36 px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset("custom");
              }}
              className="w-full sm:w-36 px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]"
            />
          </div>

          <button
            onClick={calculateReport}
            className="w-full sm:w-auto ml-auto px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold transition-colors"
          >
            Обновить данные
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="employee-earnings" className="w-full relative z-10">
          <div className="mb-4 overflow-x-auto">
            <TabsList className="flex w-max min-w-full">
              <TabsTrigger value="employee-earnings" className="flex items-center gap-2 whitespace-nowrap">
                Зарплата
              </TabsTrigger>
              <TabsTrigger value="organizations" className="flex items-center gap-2 whitespace-nowrap">
                <Building className="h-4 w-4" />
                Отчёт по организациям
              </TabsTrigger>
              <TabsTrigger value="general-revenue" className="flex items-center gap-2 whitespace-nowrap">
                <TrendingUp className="h-4 w-4" />
                Общий отчёт по выручке
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="employee-earnings" className="space-y-5">
            {/* Employee Performance & Balances */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Взаиморасчеты с сотрудниками</h3>
                <p className="text-xs text-muted-foreground">Начисленные зарплаты и выплаты за выбранный период</p>
              </div>
              <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-2">Сотрудник</th>
                    <th className="py-3 px-2 text-right">Начислено (ЗП)</th>
                    <th className="py-3 px-2 text-right">Выплачено</th>
                    <th className="py-3 px-2 text-right">Баланс (остаток)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {employeeRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row.id)}
                      className="hover:bg-muted/10 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="font-semibold text-foreground">{row.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{row.position}</div>
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-foreground tabular-nums">
                        {row.earned.toLocaleString("ru-RU")} BYN
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-muted-foreground tabular-nums">
                        {row.paid.toLocaleString("ru-RU")} BYN
                      </td>
                      <td className={`py-3 px-2 text-right font-bold tabular-nums ${
                        row.balance > 0 
                          ? "text-amber-500 dark:text-amber-400" 
                          : row.balance < 0 
                            ? "text-red-500" 
                            : "text-muted-foreground"
                      }`}>
                        {row.balance > 0 ? "+" : ""}{row.balance.toLocaleString("ru-RU")} BYN
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stack View */}
            <div className="sm:hidden space-y-3">
              {employeeRows.map((row) => (
                <div
                  key={row.id}
                  onClick={() => handleRowClick(row.id)}
                  className="bg-background border border-border/30 p-3 rounded-xl space-y-2 cursor-pointer active:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{row.name}</p>
                      <p className="text-[10px] text-muted-foreground">{row.position}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      row.balance > 0 
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                        : row.balance < 0 
                          ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {row.balance > 0 ? "Долг: " : ""}{row.balance.toLocaleString("ru-RU")} BYN
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-border/10">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                        Начислено
                      </span>
                      <span className="font-semibold text-foreground">{row.earned.toLocaleString("ru-RU")} BYN</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                        Выплачено
                      </span>
                      <span className="font-semibold text-foreground">{row.paid.toLocaleString("ru-RU")} BYN</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {employeeRows.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-xs">Сотрудники не найдены</p>
              </div>
            )}
          </div>
          </TabsContent>

          <TabsContent value="general-revenue" className="space-y-5">
            <OkleykaGeneralRevenueReport />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Revenue Card */}
            <motion.div
              whileHover={{ y: -2 }}
              className="col-span-2 md:col-span-3 lg:col-span-2 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between"
            >
              <div>
                <span className="text-xs text-white/70 uppercase tracking-wider font-semibold">
                  Общая выручка
                </span>
                <h3 className="text-3xl font-extrabold mt-1 tracking-tight">
                  {totalRevenue.toLocaleString("ru-RU")} BYN
                </h3>
              </div>
              <div className="flex items-center justify-between mt-6 pt-3 border-t border-white/20 text-xs text-white/80">
                <span>Заказов завершено</span>
                <span className="font-bold text-sm bg-white/20 px-2 py-0.5 rounded-lg">
                  {totalCompletedOrders}
                </span>
              </div>
            </motion.div>

            {/* Cash Card */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Наличные
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-bold text-foreground">
                  {revenueCash.toLocaleString("ru-RU")} BYN
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">В кассе & выплачено</p>
              </div>
            </motion.div>

            {/* Card Card */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Карта
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-bold text-foreground">
                  {revenueCard.toLocaleString("ru-RU")} BYN
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Безналичный расчет</p>
              </div>
            </motion.div>

            {/* Organization Card */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Организации
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-bold text-foreground">
                  {revenueOrg.toLocaleString("ru-RU")} BYN
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Юридические лица</p>
              </div>
            </motion.div>

            {/* Debts Card */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between md:col-span-3 lg:col-span-1"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Долги
                </span>
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-bold text-foreground">
                  {revenueDebt.toLocaleString("ru-RU")} BYN
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Созданные долги</p>
              </div>
            </motion.div>
          </div>
          </TabsContent>

          <TabsContent value="organizations" className="space-y-5">
            <OkleykaOrganizationsReport />
          </TabsContent>
        </Tabs>
      )}

      {/* Employee records detail modal */}
      <AnimatePresence>
        {isRecordsModalOpen && selectedEmployeeIdForModal && (
          <EmployeeOkleykaRecordsModal
            isOpen={isRecordsModalOpen}
            onClose={() => {
              setIsRecordsModalOpen(false);
              setSelectedEmployeeIdForModal(null);
            }}
            employeeName={state.employees.find(e => e.id === selectedEmployeeIdForModal)?.name || "Сотрудник"}
            periodRange={getPeriodLabel()}
            records={allWorkersDetails.filter(d => d.employeeId === selectedEmployeeIdForModal)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OkleykaReportsPage;
