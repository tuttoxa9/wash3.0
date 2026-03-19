import type React from "react";
import type { DailyReport } from "@/lib/types";
import { Wallet, CheckCircle, Users, ArrowUpRight } from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";

interface Props {
  report: DailyReport;
  onCloseCash: () => void;
  onPayout: () => void;
  onTransferToSafe: () => void;
}

export default function CashStateWidget({ report, onCloseCash, onPayout, onTransferToSafe }: Props) {
  const { state } = useAppContext();
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

  return (
    <div className="mt-6 rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-green-50 dark:bg-green-950/20">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
          <Wallet className="w-4 h-4" />
          Состояние кассы
        </h3>
        {isCashClosed && (
          <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
            Закрыта
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Блок формирования грязной кассы */}
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Начало дня:</span>
            <span className="font-semibold text-foreground">{startCash.toFixed(2)} BYN</span>
          </div>
          <div className="flex justify-between items-center">
            <span>По услугам (нал):</span>
            <span className="font-semibold text-foreground">{servicesCash.toFixed(2)} BYN</span>
          </div>
          {totalIn > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="pl-2 border-l-2 border-green-500/50">Внесения:</span>
              <span className="font-semibold text-green-600">+{totalIn.toFixed(2)} BYN</span>
            </div>
          )}
          {totalOut > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="pl-2 border-l-2 border-red-500/50">Изъятия:</span>
              <span className="font-semibold text-red-600">-{totalOut.toFixed(2)} BYN</span>
            </div>
          )}
        </div>

        {/* Итог: Грязная касса */}
        <div className="flex justify-between items-center mt-1 pt-2 border-t border-border/50">
          <span className="text-sm text-muted-foreground font-medium" title="Ожидаемая общая сумма до вычета зарплат и сейфа">
            Ожидалось всего:
          </span>
          <span className="font-bold text-foreground text-lg">
            {expectedGrossCash.toFixed(2)} BYN
          </span>
        </div>

        {/* Результат сверки (если закрыта) */}
        {isCashClosed && (
          <div className="flex flex-col gap-1 mt-1 p-2.5 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Факт при сверке:</span>
              <span className={`font-bold text-base ${hasDifference ? (difference > 0 ? "text-green-500" : "text-red-500") : "text-primary"}`}>
                {actualGrossCash.toFixed(2)} BYN
              </span>
            </div>
            {hasDifference && (
              <div className="flex justify-end text-xs font-semibold">
                <span className={difference > 0 ? "text-green-600" : "text-red-600"}>
                  {difference > 0 ? `Излишек: +${difference.toFixed(2)} BYN` : `Недостача: ${difference.toFixed(2)} BYN`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Блок расходов */}
        {(totalPayouts > 0 || transferredToSafe > 0) && (
          <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-border/50">
            {(Object.keys(cashState?.salaryPayouts || {}).length > 0) && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Выплаты ЗП:</span>
                  <span className="font-bold text-base text-orange-500">
                    -{totalPayouts.toFixed(2)} BYN
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-2 border-l-2 border-orange-500/30">
                  {Object.entries(cashState?.salaryPayouts || {}).map(([empId, amount]) => {
                    const emp = state.employees.find(e => e.id === empId);
                    return (
                      <div key={empId} className="flex justify-between items-center text-xs text-muted-foreground/80">
                        <span className="truncate pr-2">{emp?.name || 'Неизвестный'}</span>
                        <span className="shrink-0">{amount.toFixed(2)} BYN</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {transferredToSafe > 0 && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground font-medium">Передано в сейф:</span>
                <span className="font-bold text-base text-blue-500">
                  -{transferredToSafe.toFixed(2)} BYN
                </span>
              </div>
            )}
          </div>
        )}

        {/* Итог: Текущий остаток */}
        <div className="flex justify-between items-center mt-2 pt-3 border-t border-border/50 bg-accent/20 -mx-4 px-4 pb-2">
          <div className="flex flex-col mt-2">
            <span className="text-sm font-bold text-secondary-foreground">
              Текущий остаток:
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Физически в кассе
            </span>
          </div>
          <span className="font-bold text-2xl text-secondary-foreground mt-2">
            {currentPhysicalCash.toFixed(2)} BYN
          </span>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {!isCashClosed ? (
            <button
              onClick={onCloseCash}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-xl transition-colors text-sm font-semibold"
            >
              <CheckCircle className="w-4 h-4" />
              Сверить кассу
            </button>
          ) : (
            <>
              <button
                onClick={onPayout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors text-sm font-semibold"
              >
                <Users className="w-4 h-4" />
                Рассчитать сотрудников
              </button>
              <button
                onClick={onTransferToSafe}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 text-secondary-foreground hover:bg-secondary rounded-xl transition-colors text-sm font-semibold"
              >
                <ArrowUpRight className="w-4 h-4" />
                В сейф
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
