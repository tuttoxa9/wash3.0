import type React from "react";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import {
  okleykaShiftService,
  okleykaOrderService,
  okleykaDebtService,
  okleykaSettingsService,
} from "@/lib/services/okleykaService";
import type { OkleykaEmployee, OkleykaCashModification } from "@/lib/types/okleyka";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  Check,
  Calendar,
} from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 9);

interface PayoutModalProps {
  employee: OkleykaEmployee;
  balance: number;
  onClose: () => void;
  onConfirm: (amount: number, comment: string) => Promise<void>;
  submitting: boolean;
}

const PayoutModal: React.FC<PayoutModalProps> = ({
  employee,
  balance,
  onClose,
  onConfirm,
  submitting,
}) => {
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("Выдача ЗП");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number.parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }
    if (val > balance) {
      toast.error(`Сумма превышает баланс сотрудника (доступно: ${balance} BYN)`);
      return;
    }
    await onConfirm(val, comment.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Выплатить зарплату</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 mb-4 p-3 bg-muted/40 rounded-xl text-sm">
          <p className="font-semibold text-foreground">{employee.name}</p>
          {employee.position && <p className="text-muted-foreground text-xs">{employee.position}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            Баланс (остаток к выплате): <span className="font-bold text-primary">{balance.toLocaleString("ru-RU")} BYN</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Сумма выплаты (BYN)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Комментарий</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Выдача ЗП"
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium hover:bg-muted transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Подтвердить
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const OkleykaPayoutsPage: React.FC = () => {
  const { state, refreshShift } = useOkleykaContext();
  const { currentShift, employees, orders } = state;

  const [payoutTarget, setPayoutTarget] = useState<OkleykaEmployee | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cash modification form (other expenses/revenues)
  const [showModForm, setShowModForm] = useState(false);
  const [modAmount, setModAmount] = useState("");
  const [modReason, setModReason] = useState("");
  const [modType, setModType] = useState<"expense" | "income">("expense");
  const [modSaving, setModSaving] = useState(false);

  const [loadingBalances, setLoadingBalances] = useState(true);
  const [employeeBalances, setEmployeeBalances] = useState<Record<string, number>>({});
  const [employeeEarnings, setEmployeeEarnings] = useState<Record<string, number>>({});
  const [employeePaid, setEmployeePaid] = useState<Record<string, number>>({});

  const fetchBalances = useCallback(async () => {
    if (!currentShift) return;
    setLoadingBalances(true);
    try {
      const dateObj = parseISO(currentShift.date);
      const start = format(startOfMonth(dateObj), "yyyy-MM-dd");
      const end = format(endOfMonth(dateObj), "yyyy-MM-dd");

      const [shifts, allOrders, closedDebts, settings] = await Promise.all([
        okleykaShiftService.getByDateRange(start, end),
        okleykaOrderService.getByDateRange(start, end),
        okleykaDebtService.getByDateRange(start, end),
        state.settings ? Promise.resolve(state.settings) : okleykaSettingsService.get(),
      ]);

      const completed = allOrders.filter(o => o.status === "completed");

      const paidMap: Record<string, number> = {};
      shifts.forEach(shift => {
        if (shift.salaryPayouts) {
          Object.entries(shift.salaryPayouts).forEach(([empId, amount]) => {
            paidMap[empId] = (paidMap[empId] || 0) + amount;
          });
        }
      });

      const earnedMap: Record<string, number> = {};
      if (completed.length > 0) {
        const completedIds = completed.map(o => o.id);
        const chunkSize = 100;
        let workersData: any[] = [];
        
        for (let i = 0; i < completedIds.length; i += chunkSize) {
          const chunk = completedIds.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from("okleyka_order_workers")
            .select("employee_id, salary")
            .in("order_id", chunk);

          if (error) {
            console.error("Error fetching order workers in payouts:", error);
          } else if (data) {
            workersData = [...workersData, ...data];
          }
        }

        workersData.forEach(w => {
          if (w.salary !== null) {
            earnedMap[w.employee_id] = (earnedMap[w.employee_id] || 0) + Number(w.salary);
          }
        });
      }

      const closedDebtsFiltered = closedDebts.filter(
        d => d.isClosed && d.closedAt && d.closedAt.slice(0, 10) >= start && d.closedAt.slice(0, 10) <= end
      );
      closedDebtsFiltered.forEach(d => {
        if (d.employeePayouts) {
          Object.entries(d.employeePayouts).forEach(([empId, amount]) => {
            earnedMap[empId] = (earnedMap[empId] || 0) + amount;
          });
        }
      });

      if (settings && settings.adminSalaryValue > 0) {
        shifts.forEach(shift => {
          const roles = shift.employeeRoles || {};
          Object.entries(roles).forEach(([empId, role]) => {
            if (role === "admin") {
              let dailyAdminSalary = 0;
              if (settings.adminSalaryType === "fixed") {
                dailyAdminSalary = settings.adminSalaryValue;
              } else if (settings.adminSalaryType === "percent") {
                const dailyCompletedOrders = completed.filter(
                  o => o.shiftDate === shift.date || (!o.shiftDate && o.dateStart === shift.date)
                );
                const dailyRevenue = dailyCompletedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
                dailyAdminSalary = dailyRevenue * (settings.adminSalaryValue / 100);
              }
              if (dailyAdminSalary > 0) {
                earnedMap[empId] = (earnedMap[empId] || 0) + dailyAdminSalary;
              }
            }
          });
        });
      }

      const balances: Record<string, number> = {};
      employees.forEach(emp => {
        const earned = earnedMap[emp.id] || 0;
        const paid = paidMap[emp.id] || 0;
        balances[emp.id] = earned - paid;
      });

      setEmployeeEarnings(earnedMap);
      setEmployeePaid(paidMap);
      setEmployeeBalances(balances);
    } catch (err) {
      console.error("Error calculating payouts balances:", err);
    } finally {
      setLoadingBalances(false);
    }
  }, [currentShift, employees, state.settings]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  if (!currentShift || !currentShift.isOpen) {
    return (
      <div className="p-6 max-w-md mx-auto text-center mt-12">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Смена не открыта</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Для проведения выплат сотрудникам и управления кассой оклейки необходимо сначала открыть рабочую смену на главном экране.
        </p>
      </div>
    );
  }

  // Find employee details for shift active workers
  const shiftEmployees = employees.filter((emp) => currentShift.employeeIds.includes(emp.id));

  // Calculations
  const completedCashOrders = orders.filter(
    (o) => o.shiftDate === currentShift.date && o.status === "completed" && o.paymentMethod?.type === "cash"
  );
  const completedCashOrdersSum = completedCashOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  const totalPayouts = Object.values(currentShift.salaryPayouts).reduce((sum, amt) => sum + amt, 0);

  const totalModifications = currentShift.cashModifications.reduce((sum, m) => sum + m.amount, 0);

  // Cash balance in the register
  const estimatedCash = currentShift.startOfDayCash + completedCashOrdersSum + totalModifications;

  const handlePayoutConfirm = async (amount: number, comment: string) => {
    if (!payoutTarget) return;
    setSubmitting(true);
    try {
      // 1. Update salary payouts map
      const currentAmount = currentShift.salaryPayouts[payoutTarget.id] || 0;
      const updatedPayouts = {
        ...currentShift.salaryPayouts,
        [payoutTarget.id]: currentAmount + amount,
      };

      // 2. Add cash register modification (expense)
      const newMod: OkleykaCashModification = {
        id: uid(),
        amount: -amount, // expense
        reason: `${comment}: ${payoutTarget.name}`,
        method: "cash",
        createdAt: new Date().toISOString(),
      };

      // Call service to update payouts
      const okPayout = await okleykaShiftService.updateSalaryPayouts(currentShift.id, updatedPayouts);
      if (!okPayout) {
        toast.error("Не удалось записать выплату зарплаты");
        return;
      }

      // Call service to add cash modification
      const okMod = await okleykaShiftService.addCashModification(
        currentShift.id,
        newMod,
        currentShift.cashModifications
      );

      if (okMod) {
        toast.success(`Выплачено ${amount} BYN сотруднику ${payoutTarget.name}`);
        setPayoutTarget(null);
        await refreshShift(currentShift.date);
        await fetchBalances();
      } else {
        toast.error("Не удалось списать средства из кассы смены");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при проведении выплаты");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddModification = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number.parseFloat(modAmount);
    if (isNaN(val) || val <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }
    if (!modReason.trim()) {
      toast.error("Укажите причину операции");
      return;
    }

    setModSaving(true);
    try {
      const amount = modType === "expense" ? -val : val;
      const newMod: OkleykaCashModification = {
        id: uid(),
        amount,
        reason: modReason.trim(),
        method: "cash",
        createdAt: new Date().toISOString(),
      };

      const ok = await okleykaShiftService.addCashModification(
        currentShift.id,
        newMod,
        currentShift.cashModifications
      );

      if (ok) {
        toast.success(modType === "expense" ? "Расход зафиксирован" : "Приход зафиксирован");
        setModAmount("");
        setModReason("");
        setShowModForm(false);
        await refreshShift(currentShift.date);
      } else {
        toast.error("Не удалось сохранить операцию");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при выполнении операции");
    } finally {
      setModSaving(false);
    }
  };

  const handleDeleteModification = async (mod: OkleykaCashModification) => {
    if (!confirm(`Удалить операцию «${mod.reason}» на сумму ${mod.amount} BYN?`)) return;

    try {
      // If it matches a salary payout, we should adjust the employee salaryPayouts too
      // (Scan reasons matching 'Выдача ЗП' or comment strings, but the cleanest is just deleting the modification)
      const ok = await okleykaShiftService.removeCashModification(
        currentShift.id,
        mod.id,
        currentShift.cashModifications
      );

      if (ok) {
        toast.success("Операция удалена из кассы");
        await refreshShift(currentShift.date);
      } else {
        toast.error("Не удалось удалить операцию");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при удалении операции");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Касса и выплаты
            <span className="text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full">
              Смена открыта
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Рабочая смена от {currentShift.date}
          </p>
        </div>

        <button
          onClick={() => setShowModForm((v) => !v)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border/50 text-xs font-semibold hover:bg-muted transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Коррекция кассы
        </button>
      </div>

      {/* Cash register overview card */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold">Состояние кассы оклейки</h3>
          </div>
          <span className="text-2xl font-extrabold text-foreground tabular-nums">
            {estimatedCash.toLocaleString("ru-RU")} BYN
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-background/40 border border-border/20 p-3 rounded-xl">
            <span className="text-muted-foreground block mb-0.5">Начало смены</span>
            <span className="font-semibold text-foreground tabular-nums">
              {currentShift.startOfDayCash.toLocaleString("ru-RU")} BYN
            </span>
          </div>

          <div className="bg-background/40 border border-border/20 p-3 rounded-xl">
            <span className="text-muted-foreground block mb-0.5">Заказы (нал)</span>
            <span className="font-semibold text-foreground tabular-nums text-emerald-500">
              +{completedCashOrdersSum.toLocaleString("ru-RU")} BYN
            </span>
          </div>

          <div className="bg-background/40 border border-border/20 p-3 rounded-xl">
            <span className="text-muted-foreground block mb-0.5">Выплачено ЗП</span>
            <span className="font-semibold text-foreground tabular-nums text-red-500">
              -{totalPayouts.toLocaleString("ru-RU")} BYN
            </span>
          </div>

          <div className="bg-background/40 border border-border/20 p-3 rounded-xl">
            <span className="text-muted-foreground block mb-0.5">Коррекции (прочее)</span>
            {/* Find modifications that are not payouts */}
            <span className={`font-semibold tabular-nums ${totalModifications >= 0 ? "text-foreground" : "text-red-400"}`}>
              {totalModifications.toLocaleString("ru-RU")} BYN
            </span>
          </div>
        </div>
      </div>

      {/* Cash Correction Form */}
      <AnimatePresence>
        {showModForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleAddModification}
              className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Корректировка наличных в кассе
                </h4>
                <button
                  type="button"
                  onClick={() => setShowModForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Закрыть
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Тип операции</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModType("expense")}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        modType === "expense"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-background border-border/50 text-muted-foreground"
                      }`}
                    >
                      Расход (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModType("income")}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        modType === "income"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-background border-border/50 text-muted-foreground"
                      }`}
                    >
                      Приход (+)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Сумма (BYN)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={modAmount}
                    onChange={(e) => setModAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Назначение / Причина</label>
                  <input
                    type="text"
                    placeholder="Например: покупка химии"
                    value={modReason}
                    onChange={(e) => setModReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModForm(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border/50 text-xs font-medium hover:bg-muted transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={modSaving}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  {modSaving && <Loader2 className="w-3 animate-spin" />}
                  Провести
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Active workers payouts list */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold">Сотрудники в смене</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Выдавайте зарплату сотрудникам, назначенным на текущую смену
            </p>
          </div>

          {shiftEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">На смене нет сотрудников</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shiftEmployees.map((emp) => {
                const paid = currentShift.salaryPayouts[emp.id] || 0;
                const balance = employeeBalances[emp.id] || 0;
                return (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-3.5 bg-background border border-border/30 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-bold">{emp.name}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 text-xs text-muted-foreground mt-0.5">
                        <span>Выплачено: <span className="font-semibold text-foreground">{paid.toLocaleString("ru-RU")} BYN</span></span>
                        <span className="hidden sm:inline text-border">|</span>
                        <span>Баланс: <span className={`font-semibold ${balance > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{balance.toLocaleString("ru-RU")} BYN</span></span>
                      </div>
                    </div>

                    <button
                      onClick={() => setPayoutTarget(emp)}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                    >
                      <Wallet className="w-3.5 h-3.5" /> Выплатить
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shift log (all modifications) */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold">Лог кассовых операций</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Все приходы, расходы и выплаты смены
            </p>
          </div>

          {currentShift.cashModifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex-1 flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">Кассовые операции не проводились</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 flex-1 mt-2">
              {[...currentShift.cashModifications]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((mod) => {
                  const isExpense = mod.amount < 0;
                  return (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/20 bg-background/50 hover:bg-background transition-colors text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-foreground truncate">{mod.reason}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(mod.createdAt), "HH:mm")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-bold tabular-nums flex items-center gap-0.5 ${
                            isExpense ? "text-red-500" : "text-emerald-500"
                          }`}
                        >
                          {isExpense ? (
                            <ArrowDownLeft className="w-3 h-3 shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 shrink-0" />
                          )}
                          {Math.abs(mod.amount).toLocaleString("ru-RU")} BYN
                        </span>

                        <button
                          onClick={() => handleDeleteModification(mod)}
                          className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                          title="Удалить операцию"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Salary payout modal */}
      <AnimatePresence>
        {payoutTarget && (
          <PayoutModal
            employee={payoutTarget}
            balance={employeeBalances[payoutTarget.id] || 0}
            onClose={() => setPayoutTarget(null)}
            onConfirm={handlePayoutConfirm}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OkleykaPayoutsPage;
