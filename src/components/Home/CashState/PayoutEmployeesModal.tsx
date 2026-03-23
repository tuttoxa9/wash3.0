import type React from "react";
import { useState, useMemo } from "react";
import Modal from "@/components/ui/modal";
import { X, Users, Loader2, Wallet, Lock } from "lucide-react";
import type { DailyReport, Employee } from "@/lib/types";
import { dailyReportService, settingsService } from "@/lib/services/supabaseService";
import { useAppContext } from "@/lib/context/AppContext";
import { createSalaryCalculator } from "@/components/SalaryCalculator";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport;
  employees: Employee[];
}

export default function PayoutEmployeesModal({ isOpen, onClose, report, employees }: Props) {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"cash" | "safe">("cash");

  // Храним выплаты раздельно для кассы и для сейфа
  const existingCashPayouts = report.cashState?.salaryPayouts || {};
  const [cashPayouts, setCashPayouts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.keys(existingCashPayouts).forEach(id => {
      initial[id] = existingCashPayouts[id].toString();
    });
    return initial;
  });

  // Храним уже выданное из сейфа за сегодня для каждого сотрудника
  const existingSafePayouts = useMemo(() => {
    const todayStr = state.currentDate;
    const payouts: Record<string, number> = {};
    const todayTxs = state.safeTransactions.filter(tx => tx.date.startsWith(todayStr) && tx.comment.includes("Выплата ЗП:"));

    employees.forEach(emp => {
      const empTxs = todayTxs.filter(tx => tx.comment.includes(emp.name));
      let sum = 0;
      empTxs.forEach(tx => {
         if (tx.type === "out") sum += tx.amount;
         if (tx.type === "in") sum -= tx.amount;
      });
      if (sum > 0) payouts[emp.id] = sum;
    });
    return payouts;
  }, [state.safeTransactions, state.currentDate, employees]);

  const [safePayouts, setSafePayouts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.keys(existingSafePayouts).forEach(id => {
      initial[id] = existingSafePayouts[id].toString();
    });
    return initial;
  });

  const activePayouts = source === "cash" ? cashPayouts : safePayouts;
  const setActivePayouts = source === "cash" ? setCashPayouts : setSafePayouts;

  const salaryResults = useMemo(() => {
    if (state.salaryCalculationMethod === "minimumWithPercentage" && report.records) {
      const minimumOverride = (report.employeeIds || []).reduce<Record<string, boolean>>((acc, id) => {
        const key = `min_${id}` as any;
        const val = (report.dailyEmployeeRoles as any)?.[key];
        acc[id] = val !== false;
        return acc;
      }, {});

      const calc = createSalaryCalculator(
        state.minimumPaymentSettings,
        report.records,
        report.dailyEmployeeRoles || {},
        employees,
        minimumOverride
      );
      return calc.calculateSalaries();
    }
    return [];
  }, [report, employees, state.salaryCalculationMethod, state.minimumPaymentSettings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (source === "cash") {
        const numericPayouts: Record<string, number> = {};
        Object.keys(cashPayouts).forEach(id => {
          if (cashPayouts[id] === "") return; // Skip completely empty
          const val = Number.parseFloat(cashPayouts[id]);
          if (!Number.isNaN(val) && val >= 0) {
            if (val > 0) {
                numericPayouts[id] = val;
            }
            // if val === 0, we simply don't add it, which effectively deletes it from payouts
          }
        });

        // Проверяем, хватает ли наличных в кассе
        const totalPayoutsSum = Object.values(numericPayouts).reduce((sum, val) => sum + val, 0);
        const stateCash = report.cashState!;

        const cashModificationsTotal = (report.cashModifications || [])
          .filter(m => !m.method || m.method === "cash")
          .reduce((sum, mod) => sum + mod.amount, 0);

        const baseCash = stateCash.actualEndOfDayCash !== undefined
          ? stateCash.actualEndOfDayCash
          : stateCash.startOfDayCash + report.totalCash + cashModificationsTotal;

        const expectedCash = baseCash - (stateCash.transferredToSafe || 0);

        if (totalPayoutsSum > expectedCash) {
          toast.error(`В кассе недостаточно средств (доступно: ${expectedCash.toFixed(2)} BYN)`);
          setLoading(false);
          return;
        }

        const updatedReport: DailyReport = {
          ...report,
          cashState: {
            ...stateCash,
            salaryPayouts: numericPayouts
          }
        };

        const success = await dailyReportService.updateReport(updatedReport);
        if (success) {
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: report.date as string, report: updatedReport }
          });
          toast.success("Выплаты из кассы сохранены");
          onClose();
        } else {
          throw new Error("Ошибка сохранения выплат");
        }
      } else {
        // Выплата из СЕЙФА
        const newSafeTransactions: any[] = [];
        let netSafeChange = 0; // Negative means money leaves safe, positive means money returns

        Object.keys(safePayouts).forEach(id => {
          if (safePayouts[id] === "") return;
          const val = Number.parseFloat(safePayouts[id]);
          if (!Number.isNaN(val) && val >= 0) {
            const currentPayout = existingSafePayouts[id] || 0;
            const diff = val - currentPayout;

            if (diff !== 0) {
               const emp = employees.find(e => e.id === id);
               netSafeChange -= diff; // If diff > 0, we pay more out (negative change to balance).

               newSafeTransactions.push({
                 id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                 date: new Date().toISOString(),
                 amount: Math.abs(diff),
                 type: diff > 0 ? "out" : "in",
                 comment: diff > 0
                     ? `Выплата ЗП: ${emp?.name || "Сотрудник"}`
                     : `Возврат выплаты ЗП: ${emp?.name || "Сотрудник"}`,
               });
            }
          }
        });

        if (newSafeTransactions.length === 0) {
          toast.error("Нет изменений для сохранения");
          setLoading(false);
          return;
        }

        if (netSafeChange < 0 && Math.abs(netSafeChange) > state.safeBalance) {
           toast.error(`В сейфе недостаточно средств для доплаты (доступно: ${state.safeBalance.toFixed(2)} BYN)`);
           setLoading(false);
           return;
        }

        const newBalance = state.safeBalance + netSafeChange;

        const result = await settingsService.processSafeOperations(newSafeTransactions, newBalance);

        if (result.success) {
          for (const tx of newSafeTransactions) {
            dispatch({ type: "ADD_SAFE_TRANSACTION", payload: tx });
          }
          dispatch({ type: "SET_SAFE_BALANCE", payload: result.newBalance ?? newBalance });

          toast.success(netSafeChange < 0
              ? `Сейф: выплачено еще ${Math.abs(netSafeChange).toFixed(2)} BYN`
              : `Сейф: возвращено ${netSafeChange.toFixed(2)} BYN`);
          onClose();
        } else {
          throw new Error("Ошибка при обновлении сейфа");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleSetAll = (employeeId: string, earnedAmount: number) => {
    setActivePayouts((prev: Record<string, string>) => ({
      ...prev,
      [employeeId]: earnedAmount.toFixed(2)
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-2xl">
      <div className="p-6 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50 shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Users className="w-6 h-6 text-primary" />
            Расчет сотрудников
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSource("cash")}
            className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors text-left ${
              source === "cash"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/50 bg-background hover:bg-muted/50"
            }`}
          >
            <span className="font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Касса смены
            </span>
            <span className="text-xs text-muted-foreground">Выдать из наличности</span>
          </button>
          <button
            type="button"
            onClick={() => setSource("safe")}
            className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors text-left ${
              source === "safe"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/50 bg-background hover:bg-muted/50"
            }`}
          >
            <span className="font-semibold text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Сейф
            </span>
            <span className="text-xs text-muted-foreground">Создать транзакцию в сейфе</span>
          </button>
        </div>

        {source === "cash" && (
           <div className="mb-4 p-3 bg-muted/40 rounded-xl flex items-center justify-between text-sm shrink-0 border border-border/50">
             <span className="font-medium text-muted-foreground">Выплаты сохраняются в итогах смены</span>
           </div>
        )}
        {source === "safe" && (
           <div className="mb-4 p-3 bg-primary/10 rounded-xl flex items-center justify-between text-sm shrink-0 border border-primary/20">
             <span className="font-medium text-primary">Баланс сейфа:</span>
             <span className="font-bold text-primary">{state.safeBalance.toFixed(2)} BYN</span>
           </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-6">
          {employees.map(employee => {
            const role = report.dailyEmployeeRoles?.[employee.id];

            // Если сотрудник не работал, ЗП равна 0. Иначе берем из результатов
            const worked = report.employeeIds?.includes(employee.id);
            const isManual = report.manualSalaries?.[employee.id] !== undefined;
            const manualAmount = report.manualSalaries?.[employee.id];

            let earned = 0;
            if (worked) {
              const res = salaryResults.find(r => r.employeeId === employee.id);
              earned = isManual ? (manualAmount || 0) : (res?.calculatedSalary || 0);
            }

            return (
              <div key={employee.id} className="p-4 rounded-xl border border-border/50 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{employee.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {worked && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {role === "admin" ? "Админ" : "Мойщик"}
                      </span>
                    )}
                    <span className={`text-sm font-medium ${worked ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                      Заработал(а): <span className={worked ? "text-foreground font-bold" : ""}>{earned.toFixed(2)} BYN</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  {source === "safe" && existingCashPayouts[employee.id] > 0 && (
                     <div className="text-[10px] text-muted-foreground font-medium mb-1">
                       Уже выдано из кассы: {existingCashPayouts[employee.id].toFixed(2)}
                     </div>
                  )}
                  {source === "cash" && existingSafePayouts[employee.id] > 0 && (
                     <div className="text-[10px] text-muted-foreground font-medium mb-1">
                       Уже выдано из сейфа: {existingSafePayouts[employee.id].toFixed(2)}
                     </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={activePayouts[employee.id] || ""}
                      onChange={(e) => setActivePayouts((prev: Record<string, string>) => ({ ...prev, [employee.id]: e.target.value }))}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-24 px-3 py-2 bg-muted/20 border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm font-semibold text-right transition-colors"
                    />
                    <span className="text-sm text-muted-foreground font-medium">BYN</span>
                    <button
                      onClick={() => handleSetAll(employee.id, earned)}
                      disabled={earned === 0}
                      className="ml-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors text-xs font-semibold disabled:opacity-50"
                    >
                      Всё
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-border/50 flex gap-3 mt-auto shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Сохранить выплаты
          </button>
        </div>
      </div>
    </Modal>
  );
}
