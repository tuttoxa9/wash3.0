import type React from "react";
import { useState, useMemo } from "react";
import Modal from "@/components/ui/modal";
import { X, Users, Loader2 } from "lucide-react";
import type { DailyReport, Employee } from "@/lib/types";
import { dailyReportService } from "@/lib/services/supabaseService";
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

  const existingPayouts = report.cashState?.salaryPayouts || {};
  const [payouts, setPayouts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.keys(existingPayouts).forEach(id => {
      initial[id] = existingPayouts[id].toString();
    });
    return initial;
  });

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
      const numericPayouts: Record<string, number> = {};
      Object.keys(payouts).forEach(id => {
        const val = Number.parseFloat(payouts[id]);
        if (!Number.isNaN(val) && val > 0) {
          numericPayouts[id] = val;
        }
      });

      const updatedReport: DailyReport = {
        ...report,
        cashState: {
          ...(report.cashState || { isShiftOpen: true, startOfDayCash: 0 }),
          salaryPayouts: numericPayouts
        }
      };

      const success = await dailyReportService.updateReport(updatedReport);
      if (success) {
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: report.date as string, report: updatedReport }
        });
        toast.success("Выплаты сохранены");
        onClose();
      } else {
        throw new Error("Ошибка сохранения выплат");
      }
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleSetAll = (employeeId: string, earnedAmount: number) => {
    setPayouts(prev => ({
      ...prev,
      [employeeId]: earnedAmount.toFixed(2)
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-2xl">
      <div className="p-6 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50 shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Users className="w-6 h-6 text-primary" />
            Расчет сотрудников
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

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

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    value={payouts[employee.id] || ""}
                    onChange={(e) => setPayouts(prev => ({ ...prev, [employee.id]: e.target.value }))}
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
