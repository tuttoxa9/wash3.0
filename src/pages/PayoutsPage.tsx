import React, { useState, useMemo } from "react";
import { useAppContext } from "@/lib/context/AppContext";
import { format, isToday } from "date-fns";
import { Search, Wallet, WalletCards, ArrowUpRight, ArrowDownLeft, Loader2, Info, X } from "lucide-react";
import { toast } from "sonner";
import { dailyReportService, settingsService } from "@/lib/services/supabaseService";
import { createSalaryCalculator } from "@/components/SalaryCalculator";
import Modal from "@/components/ui/modal";

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | null;
}

const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, employeeId }) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<"cash" | "safe">("cash");
  const [useCustomComment, setUseCustomComment] = useState(false);
  const [customComment, setCustomComment] = useState("");

  const employee = state.employees.find((e) => e.id === employeeId);
  const currentReport = state.dailyReports[state.currentDate];

  const stateCash = currentReport?.cashState || {
    isShiftOpen: true,
    startOfDayCash: 0,
    salaryPayouts: {},
    transferredToSafe: 0
  };

  const totalPayouts = Object.values(stateCash.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);

  // Учитываем операции с наличными (внесения, изъятия, сертификаты за наличку)
  const cashModificationsTotal = (currentReport?.cashModifications || [])
    .filter((mod) => mod.method === "cash")
    .reduce((sum, mod) => {
      return mod.type === "in" ? sum + mod.amount : sum - mod.amount;
    }, 0);

  const expectedCash = stateCash.startOfDayCash + (currentReport?.totalCash || 0) + cashModificationsTotal - totalPayouts - (stateCash.transferredToSafe || 0);
  const safeAvailable = state.safeBalance;

  if (!isOpen || !employee) return null;

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number.parseFloat(amount);

    if (Number.isNaN(numAmount) || numAmount <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    setLoading(true);

    try {
      // Если есть отчет, но нет cashState (старые данные), считаем смену открытой
      const isShiftOpen = currentReport ? (currentReport.cashState?.isShiftOpen ?? true) : false;

      if (source === "cash") {
        if (!isShiftOpen) {
          toast.error("Смена закрыта или не начата. Выплата из кассы невозможна.");
          setLoading(false);
          return;
        }

        if (numAmount > expectedCash) {
          toast.error(`В кассе недостаточно средств (доступно: ${expectedCash.toFixed(2)} BYN)`);
          setLoading(false);
          return;
        }

        const currentPayout = stateCash.salaryPayouts?.[employeeId] || 0;

        const updatedReport = {
          ...currentReport!,
          cashState: {
            ...stateCash,
            salaryPayouts: {
              ...(stateCash.salaryPayouts || {}),
              [employeeId]: currentPayout + numAmount
            }
          }
        };

        const success = await dailyReportService.updateReport(updatedReport);
        if (success) {
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: state.currentDate, report: updatedReport }
          });
          toast.success(`Выплачено ${numAmount.toFixed(2)} BYN из кассы`);
          onClose();
        } else {
          throw new Error("Ошибка при обновлении отчета");
        }

      } else {
        // Источник: Сейф
        if (numAmount > state.safeBalance) {
          toast.error(`В сейфе недостаточно средств (доступно: ${state.safeBalance.toFixed(2)} BYN)`);
          setLoading(false);
          return;
        }

        const defaultComment = `Выплата: ${employee.name}`;
        const finalComment = useCustomComment && customComment.trim() ? customComment.trim() : defaultComment;

        const transaction = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          date: new Date().toISOString(),
          amount: numAmount,
          type: "out" as const,
          comment: finalComment,
        };

        const successTx = await settingsService.addSafeTransaction(transaction);
        const newBalance = state.safeBalance - numAmount;
        const successBal = await settingsService.updateSafeBalance(newBalance);

        if (successTx && successBal) {
          dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
          dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });
          toast.success(`Выплачено ${numAmount.toFixed(2)} BYN из сейфа`);
          onClose();
        } else {
          throw new Error("Ошибка при операции с сейфом");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка при выплате");
    } finally {
      setLoading(false);
    }
  };

  const isShiftOpen = currentReport ? (currentReport.cashState?.isShiftOpen ?? true) : false;

  const parsedAmount = Number.parseFloat(amount);
  const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const isExceedingCash = source === "cash" && isValidAmount && parsedAmount > expectedCash;
  const isExceedingSafe = source === "safe" && isValidAmount && parsedAmount > safeAvailable;
  const isOverLimit = isExceedingCash || isExceedingSafe;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Выплата сотруднику</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-muted/30 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {employee.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold">{employee.name}</p>
            <p className="text-xs text-muted-foreground">Оформление выдачи средств</p>
          </div>
        </div>

        <form onSubmit={handlePayout}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Сумма выплаты (BYN) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
                autoFocus
                className={`w-full px-4 py-3 bg-background border rounded-xl focus:outline-none focus:ring-1 font-semibold text-lg transition-colors ${
                  isOverLimit
                    ? "border-destructive/50 focus:ring-destructive/50 text-destructive bg-destructive/5"
                    : "border-input focus:ring-primary"
                }`}
              />
              {isExceedingCash && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Сумма превышает остаток в кассе
                </p>
              )}
              {isExceedingSafe && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Сумма превышает баланс сейфа
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Источник средств <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSource("cash")}
                  className={`p-3 rounded-xl border flex flex-col transition-colors text-left ${
                    source === "cash"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between items-start w-full gap-2">
                    <span className="font-semibold text-sm leading-tight">Касса смены</span>
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap mt-0.5">
                      {expectedCash.toFixed(2)} BYN
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 leading-tight">Выдать из наличности</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSource("safe")}
                  disabled={safeAvailable <= 0}
                  className={`p-3 rounded-xl border flex flex-col transition-colors text-left ${
                    source === "safe"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 bg-background hover:bg-muted/50"
                  } ${safeAvailable <= 0 ? "opacity-50 cursor-not-allowed hover:bg-background" : ""}`}
                >
                  <div className="flex justify-between items-start w-full gap-2">
                    <span className="font-semibold text-sm leading-tight">Глобальный Сейф</span>
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap mt-0.5">
                      {safeAvailable.toFixed(2)} BYN
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 leading-tight">Создать транзакцию</span>
                </button>
              </div>
            </div>

            {source === "cash" && !isShiftOpen && (
               <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-2">
                 <Info className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                 <p className="text-xs text-destructive font-medium leading-relaxed">
                   Смена на сегодня не открыта или закрыта. Выдача из кассы невозможна. Выберите сейф.
                 </p>
               </div>
            )}

            {source === "safe" && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomComment}
                    onChange={(e) => setUseCustomComment(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Свой комментарий для сейфа</span>
                </label>

                {useCustomComment && (
                  <input
                    type="text"
                    value={customComment}
                    onChange={(e) => setCustomComment(e.target.value)}
                    placeholder={`Выплата: ${employee.name}`}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !isValidAmount || isOverLimit || (source === "cash" && !isShiftOpen)}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Выдать средства
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default function PayoutsPage() {
  const { state } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Для удобства показываем, сколько человек заработал за сегодня (если смена открыта)
  const currentReport = state.dailyReports[state.currentDate];

  const todayEarnings = useMemo(() => {
    const earnings: Record<string, number> = {};

    if (currentReport?.records && currentReport.dailyEmployeeRoles) {
      const minimumOverride = currentReport.employeeIds.reduce<Record<string, boolean>>((acc, id) => {
        const key = `min_${id}` as any;
        const val = (currentReport.dailyEmployeeRoles as any)[key];
        acc[id] = val !== false;
        return acc;
      }, {});

      const salaryCalculator = createSalaryCalculator(
        state.minimumPaymentSettings,
        currentReport.records,
        currentReport.dailyEmployeeRoles,
        state.employees,
        minimumOverride
      );

      const salaryResults = salaryCalculator.calculateSalaries();

      salaryResults.forEach(res => {
        const manualAmount = currentReport.manualSalaries?.[res.employeeId];
        earnings[res.employeeId] = manualAmount !== undefined ? manualAmount : res.calculatedSalary;
      });
    }
    return earnings;
  }, [currentReport, state.minimumPaymentSettings, state.employees]);


  const filteredEmployees = useMemo(() => {
    let result = state.employees;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }

    // Сортируем: сначала те, кто сегодня работает (имеет заработок), затем по алфавиту
    return result.sort((a, b) => {
      const earnA = todayEarnings[a.id] || 0;
      const earnB = todayEarnings[b.id] || 0;

      if (earnA > 0 && earnB === 0) return -1;
      if (earnA === 0 && earnB > 0) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [state.employees, searchQuery, todayEarnings]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <WalletCards className="w-6 h-6 text-primary" />
          Выплаты сотрудникам
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Быстрая выдача средств из кассы смены или из сейфа
        </p>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 sm:p-6 border-b border-border/50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по имени сотрудника..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 bg-background/50 overflow-y-auto">
          {filteredEmployees.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm space-y-3">
               <WalletCards className="w-12 h-12 text-muted/30" />
               <p>Сотрудники не найдены</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((employee) => {
                const earnedToday = todayEarnings[employee.id] || 0;
                const paidFromCashToday = currentReport?.cashState?.salaryPayouts?.[employee.id] || 0;
                const isWorkingToday = currentReport?.employeeIds.includes(employee.id);

                return (
                  <div
                    key={employee.id}
                    className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors shadow-sm flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-base truncate pr-2" title={employee.name}>
                          {employee.name}
                        </h3>
                        {isWorkingToday ? (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-[10px] font-bold">
                            В смене сегодня
                          </span>
                        ) : (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-bold">
                            Не в смене
                          </span>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary">
                        {employee.name.charAt(0)}
                      </div>
                    </div>

                    <div className="mt-auto space-y-3">
                      {earnedToday > 0 && (
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-muted-foreground">Заработано сегодня:</span>
                          <span className="font-bold text-foreground">{earnedToday.toFixed(2)} BYN</span>
                        </div>
                      )}

                      {paidFromCashToday > 0 && (
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-muted-foreground">Выдано из кассы сегодня:</span>
                          <span className="font-bold text-foreground">{paidFromCashToday.toFixed(2)} BYN</span>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedEmployeeId(employee.id)}
                        className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Выдать деньги
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PayoutModal
        isOpen={!!selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        employeeId={selectedEmployeeId}
      />
    </div>
  );
}
