import type React from "react";
import type { DailyReport } from "@/lib/types";
import { Wallet, CheckCircle, Users, ArrowUpRight } from "lucide-react";

interface Props {
  report: DailyReport;
  onCloseCash: () => void;
  onPayout: () => void;
  onTransferToSafe: () => void;
}

export default function CashStateWidget({ report, onCloseCash, onPayout, onTransferToSafe }: Props) {
  const cashState = report.cashState;

  // Расчет ожидаемой кассы:
  // Начальная + Нал за услуги + Внесения - Изъятия (не включая переносы в сейф/выплаты, если они еще не учтены как cashModifications)
  // Мы предполагаем, что выплата ЗП и сейф могут учитываться отдельно или через модификации.
  // Но для простоты: ожидаемая касса = (cashState?.startOfDayCash || 0) + totalCash + totalCashMods
  const totalCashMods = (report.cashModifications || [])
    .filter(m => !m.method || m.method === "cash")
    .reduce((sum, mod) => sum + mod.amount, 0);

  const expectedCash = (cashState?.startOfDayCash || 0) + report.totalCash + totalCashMods;
  const isCashClosed = cashState?.actualEndOfDayCash !== undefined;

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
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Начало дня:</span>
          <span className="font-semibold">{cashState?.startOfDayCash?.toFixed(2) || "0.00"} BYN</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Ожидается:</span>
          <span className="font-bold text-foreground text-lg">{expectedCash.toFixed(2)} BYN</span>
        </div>

        {isCashClosed && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Факт в кассе:</span>
              <span className={`font-bold text-lg ${
                (cashState?.actualEndOfDayCash || 0) < expectedCash ? "text-red-500" :
                (cashState?.actualEndOfDayCash || 0) > expectedCash ? "text-green-500" : "text-primary"
              }`}>
                {cashState?.actualEndOfDayCash?.toFixed(2)} BYN
              </span>
            </div>

            {(Object.keys(cashState?.salaryPayouts || {}).length > 0 || (cashState?.transferredToSafe || 0) > 0) && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground font-medium text-secondary-foreground">После выплат/сейфа:</span>
                <span className="font-bold text-lg text-secondary-foreground">
                  {((cashState?.actualEndOfDayCash || 0) - Object.values(cashState?.salaryPayouts || {}).reduce((sum, val) => sum + val, 0) - (cashState?.transferredToSafe || 0)).toFixed(2)} BYN
                </span>
              </div>
            )}
          </div>
        )}

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
