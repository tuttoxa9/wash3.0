import React, { useState } from "react";
import type { DailyReport } from "@/lib/types";
import {
  Wallet,
  CheckCircle,
  Users,
  ArrowUpRight,
  Clock,
  TrendingUp,
  Coins,
  PiggyBank,
  Plus,
  Trash2,
  Lock,
  Loader2,
  ArrowLeftRight
} from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";
import { dailyReportService } from "@/lib/services/supabaseService";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  report: DailyReport;
  selectedDate: string;
  onCloseCash: () => void;
  onPayout: () => void;
  onTransferToSafe: () => void;
}

export default function CashStateWidget({
  report,
  selectedDate,
  onCloseCash,
  onPayout,
  onTransferToSafe,
}: Props) {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
    method: "cash" as "cash" | "card",
  });

  const cashState = report.cashState;

  // Формирование кассы (Грязная касса ДО любых выплат и изъятий ЗП/Сейфа)
  const cashMods = (report.cashModifications || []).filter(m => !m.method || m.method === "cash");
  const totalIn = cashMods.filter(m => m.amount > 0).reduce((sum, mod) => sum + mod.amount, 0);
  const totalOut = Math.abs(cashMods.filter(m => m.amount < 0).reduce((sum, mod) => sum + mod.amount, 0));

  const startCash = cashState?.startOfDayCash || 0;
  const servicesCash = report.totalCash || 0;
  const totalCashMods = totalIn - totalOut;

  // Ожидалось всего грязными
  const expectedGrossCash = startCash + servicesCash + totalCashMods;

  // Расходы из кассы
  const totalPayouts = Object.values(cashState?.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);
  const transferredToSafe = cashState?.transferredToSafe || 0;

  const isCashClosed = cashState?.actualEndOfDayCash !== undefined;

  // Фактическая грязная касса (то что ввел юзер при сверке + те выплаты, что он уже сделал до сверки)
  const actualGrossCash = cashState?.actualEndOfDayCash !== undefined ? cashState.actualEndOfDayCash : 0;

  // Текущий физический остаток в ящике
  // Если касса закрыта - берем факт (actualGrossCash) минус расходы
  // Если не закрыта - берем ожидание (expectedGrossCash) минус расходы
  const currentPhysicalCash = isCashClosed
    ? actualGrossCash - totalPayouts - transferredToSafe
    : expectedGrossCash - totalPayouts - transferredToSafe;

  // Разница при сверке
  const difference = isCashClosed ? actualGrossCash - expectedGrossCash : 0;
  const hasDifference = Math.abs(difference) > 0.01;

  // Добавление транзакции прямо из виджета
  const handleAddModification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCashClosed) {
      toast.error("Смена уже закрыта. Добавление операций невозможно.");
      return;
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Укажите причину изменения");
      return;
    }

    setLoading(true);

    try {
      const amountValue = Number(formData.amount);
      const modification = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
        amount: activeTab === "expense" ? -amountValue : amountValue,
        reason: formData.reason.trim(),
        createdAt: new Date().toISOString(),
        method: formData.method,
      };

      const updatedModifications = [...(report.cashModifications || []), modification];
      const updatedReport = { ...report, cashModifications: updatedModifications };

      const success = await dailyReportService.updateReport(updatedReport);

      if (success) {
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: selectedDate, report: updatedReport },
        });
        toast.success("Операция успешно добавлена");
        setFormData({ amount: "", reason: "", method: "cash" });
      } else {
        toast.error("Не удалось сохранить операцию");
      }
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  };

  // Удаление транзакции прямо из виджета
  const handleDeleteModification = async (id: string) => {
    if (isCashClosed) {
      toast.error("Смена уже закрыта. Удаление операций невозможно.");
      return;
    }

    if (!confirm("Вы уверены, что хотите удалить эту операцию?")) return;

    setLoading(true);
    try {
      const updatedModifications = (report.cashModifications || []).filter((m) => m.id !== id);
      const updatedReport = { ...report, cashModifications: updatedModifications };

      const success = await dailyReportService.updateReport(updatedReport);

      if (success) {
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: selectedDate, report: updatedReport },
        });
        toast.success("Операция успешно удалена");
      } else {
        toast.error("Не удалось удалить операцию");
      }
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка при удалении");
    } finally {
      setLoading(false);
    }
  };

  const modifications = report.cashModifications || [];

  return (
    <div
      id="cash-state-block"
      className="rounded-[2rem] bg-card border border-border/50 shadow-sm overflow-hidden flex flex-col p-6 gap-6 relative transition-all duration-300 hover:shadow-md"
    >
      {/* Шапка виджета */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Состояние кассы</h3>
            <p className="text-xs text-muted-foreground">Панель управления денежными средствами смены в реальном времени</p>
          </div>
        </div>
        <div>
          {isCashClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Касса закрыта
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Касса открыта
            </span>
          )}
        </div>
      </div>

      {/* Основная сетка на 3 колонки (на десктопе) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Колонка 1: Финансовый дашборд */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Финансовые показатели
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Начало дня */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex flex-col justify-between hover:bg-muted/20 transition-all duration-200">
              <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Начало дня</span>
              <div className="mt-1 flex items-baseline">
                <span className="font-extrabold text-foreground text-sm sm:text-base leading-none">
                  {startCash.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Нал */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex flex-col justify-between hover:bg-muted/20 transition-all duration-200">
              <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Нал</span>
              <div className="mt-1 flex items-baseline">
                <span className="font-extrabold text-foreground text-sm sm:text-base leading-none">
                  {servicesCash.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Движение кассы */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex flex-col justify-between hover:bg-muted/20 transition-all duration-200">
              <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Движение</span>
              <div className="mt-1 flex items-baseline">
                <span className={`font-extrabold text-sm sm:text-base leading-none ${totalCashMods > 0 ? "text-green-500" : totalCashMods < 0 ? "text-red-500" : "text-foreground"}`}>
                  {totalCashMods > 0 ? "+" : ""}{totalCashMods.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Ожидалось всего */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex flex-col justify-between hover:bg-muted/20 transition-all duration-200">
              <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Ожидалось</span>
              <div className="mt-1 flex items-baseline">
                <span className="font-extrabold text-foreground text-sm sm:text-base leading-none">
                  {expectedGrossCash.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Выплачено ЗП */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex flex-col justify-between hover:bg-muted/20 transition-all duration-200">
              <span className="text-[9px] sm:text-[10px] font-bold text-red-500/80 uppercase tracking-wider">Выплачено ЗП</span>
              <div className="mt-1 flex items-baseline">
                <span className="font-extrabold text-red-500 text-sm sm:text-base leading-none">
                  -{totalPayouts.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Отложено в сейф */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex flex-col justify-between hover:bg-muted/20 transition-all duration-200">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">В сейф</span>
              <div className="mt-1 flex items-baseline">
                <span className="font-extrabold text-amber-500 text-sm sm:text-base leading-none">
                  -{transferredToSafe.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Карточка текущего остатка */}
          <div className="mt-1 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
              <PiggyBank className="w-24 h-24 text-green-500" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                {isCashClosed ? "Фактический остаток" : "Ожидается сейчас"}
              </span>
              <PiggyBank className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-extrabold text-2xl sm:text-3xl text-green-600 dark:text-green-400 tracking-tight">
                {currentPhysicalCash.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-green-600/70 dark:text-green-400/70">BYN</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              {isCashClosed ? "Физическое количество наличных в кассе" : "Ориентировочный физический остаток в ящике"}
            </p>
          </div>
        </div>

        {/* Колонка 2: Быстрое добавление транзакций */}
        <div className="bg-muted/5 border border-border/30 rounded-2xl p-4 flex flex-col gap-3 relative">
          {isCashClosed && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-2xl z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="p-2 rounded-full bg-muted border border-border/50 text-muted-foreground mb-2">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">Быстрые транзакции заблокированы</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Касса смены была успешно сверена и закрыта</p>
            </div>
          )}

          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Быстрая транзакция
          </h4>

          {/* Переключатель типа транзакции */}
          <div className="flex bg-muted/30 p-1 rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab("expense")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "expense"
                  ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Изъятие
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("income")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "income"
                  ? "bg-green-500/10 text-green-500 border border-green-500/20 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Внесение
            </button>
          </div>

          <form onSubmit={handleAddModification} className="flex-1 flex flex-col gap-3 justify-between">
            <div className="space-y-3">
              {/* Выбор метода */}
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Способ</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                      formData.method === "cash"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 font-bold"
                        : "bg-background border-border text-muted-foreground hover:bg-accent/10"
                    }`}
                    onClick={() => setFormData({ ...formData, method: "cash" })}
                  >
                    Наличные
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                      formData.method === "card"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-500 font-bold"
                        : "bg-background border-border text-muted-foreground hover:bg-accent/10"
                    }`}
                    onClick={() => setFormData({ ...formData, method: "card" })}
                  >
                    Карта
                  </button>
                </div>
              </div>

              {/* Сумма */}
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Сумма (BYN)</span>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full px-3 py-1.5 border border-border/50 bg-background rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Комментарий */}
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Причина</span>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder=""
                  required
                  className="w-full px-3 py-1.5 border border-border/50 bg-background rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm ${
                activeTab === "expense" ? "bg-red-500 hover:bg-red-600 shadow-red-500/10" : "bg-green-500 hover:bg-green-600 shadow-green-500/10"
              } disabled:opacity-50`}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {activeTab === "expense" ? "Зафиксировать расход" : "Зафиксировать внесение"}
            </button>
          </form>
        </div>

        {/* Колонка 3: История операций & Основные действия */}
        <div className="flex flex-col gap-3 justify-between">
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Последние операции
            </h4>
            
            {/* Прокручиваемый список операций */}
            <div className="overflow-y-auto max-h-[165px] pr-1 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {modifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs bg-muted/10 border border-dashed border-border/30 rounded-2xl flex flex-col items-center justify-center">
                  <Coins className="w-6 h-6 text-muted-foreground/30 mb-1.5" />
                  <span>Нет ручных операций за смену</span>
                </div>
              ) : (
                [...modifications].reverse().map((mod) => (
                  <div
                    key={mod.id}
                    className="flex justify-between items-center p-2.5 rounded-xl border border-border/50 bg-background hover:bg-accent/5 transition-all text-xs group"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                        <span className="truncate">{mod.reason}</span>
                        <span
                          className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 ${
                            !mod.method || mod.method === "cash"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {!mod.method || mod.method === "cash" ? "Нал" : "Карта"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/70">
                        {format(new Date(mod.createdAt), "HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold tabular-nums whitespace-nowrap ${
                          mod.amount < 0 ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        {mod.amount > 0 ? "+" : ""}
                        {mod.amount.toFixed(2)}
                      </span>
                      {!isCashClosed && (
                        <button
                          onClick={() => handleDeleteModification(mod.id)}
                          disabled={loading}
                          className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100 disabled:opacity-30"
                          title="Удалить операцию"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Результат сверки при закрытой кассе */}
          {isCashClosed && hasDifference && (
            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50 text-xs flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Результат сверки:</span>
                <span className={`font-bold ${difference > 0 ? "text-green-500" : "text-red-500"}`}>
                  {difference > 0 ? `Излишек: +${difference.toFixed(2)}` : `Недостача: ${difference.toFixed(2)}`} BYN
                </span>
              </div>
            </div>
          )}

          {/* Кнопки основных действий */}
          <div className="pt-2 border-t border-border/50">
            {!isCashClosed ? (
              <button
                onClick={onCloseCash}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all font-bold shadow-sm shadow-green-500/10 hover:scale-[1.01]"
              >
                <CheckCircle className="w-4 h-4" />
                Сверить и закрыть кассу
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onPayout}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl transition-all text-xs font-bold shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  Выплатить ЗП
                </button>
                <button
                  onClick={onTransferToSafe}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/50 rounded-xl transition-all text-xs font-bold"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  В сейф
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
