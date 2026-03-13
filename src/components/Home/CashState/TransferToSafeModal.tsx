import type React from "react";
import { useState } from "react";
import Modal from "@/components/ui/modal";
import { X, ArrowUpRight, Loader2, Wallet } from "lucide-react";
import type { DailyReport } from "@/lib/types";
import { dailyReportService, settingsService } from "@/lib/services/supabaseService";
import { useAppContext } from "@/lib/context/AppContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport;
}

export default function TransferToSafeModal({ isOpen, onClose, report }: Props) {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");

  const cashState = report.cashState;

  // Рассчитываем остаток в кассе после выплат
  // Ожидаемая (или фактическая) касса минус все выплаты
  const baseCash = cashState?.actualEndOfDayCash !== undefined
    ? cashState.actualEndOfDayCash
    : (cashState?.startOfDayCash || 0) + report.totalCash;

  const totalPayouts = Object.values(cashState?.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);
  const currentTransferred = cashState?.transferredToSafe || 0;

  const availableCash = baseCash - totalPayouts - currentTransferred;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number.parseFloat(amount);

    if (Number.isNaN(numAmount) || numAmount <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    setLoading(true);
    try {
      // 1. Создаем транзакцию для сейфа
      const transaction = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        date: new Date().toISOString(),
        amount: numAmount,
        type: "in" as const,
        comment: `Выручка за ${format(new Date(report.date), "dd.MM.yyyy")}`,
        reportId: report.id
      };

      const successTx = await settingsService.addSafeTransaction(transaction);

      // 2. Обновляем баланс сейфа
      const newBalance = state.safeBalance + numAmount;
      const successBal = await settingsService.updateSafeBalance(newBalance);

      // 3. Обновляем отчет (cashState)
      const updatedReport: DailyReport = {
        ...report,
        cashState: {
          ...(report.cashState || { isShiftOpen: true, startOfDayCash: 0 }),
          transferredToSafe: (report.cashState?.transferredToSafe || 0) + numAmount
        }
      };
      const successReport = await dailyReportService.updateReport(updatedReport);

      if (successTx && successBal && successReport) {
        dispatch({ type: "ADD_SAFE_TRANSACTION", payload: transaction });
        dispatch({ type: "SET_SAFE_BALANCE", payload: newBalance });
        dispatch({ type: "SET_DAILY_REPORT", payload: { date: report.date as string, report: updatedReport } });

        toast.success(`Перенесено ${numAmount.toFixed(2)} BYN в сейф`);
        onClose();
      } else {
        throw new Error("Ошибка при переносе средств");
      }
    } catch (error) {
      console.error(error);
      toast.error("Не удалось перенести средства");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-secondary-foreground" />
            Перенос в сейф
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 rounded-xl bg-secondary/10 border border-secondary/20 mb-6 flex flex-col items-center justify-center text-center">
          <Wallet className="w-8 h-8 text-secondary-foreground mb-2" />
          <p className="text-sm text-secondary-foreground/80 font-medium mb-1">Доступно для переноса (после выплат):</p>
          <p className="text-2xl font-bold text-secondary-foreground">{availableCash.toFixed(2)} BYN</p>
          {currentTransferred > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Уже перенесено за смену: <span className="font-semibold">{currentTransferred.toFixed(2)} BYN</span>
            </p>
          )}
        </div>

        <form onSubmit={handleTransfer}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Сумма переноса <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                max={availableCash > 0 ? availableCash : undefined}
                placeholder="0.00"
                required
                autoFocus
                className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-secondary text-lg font-bold pr-16"
              />
              <button
                type="button"
                onClick={() => setAmount(availableCash.toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/80 transition-colors"
              >
                Всё
              </button>
            </div>
            {availableCash < 0 && (
              <p className="text-sm text-destructive mt-2 font-medium">
                Касса в минусе, перенос невозможен.
              </p>
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
              disabled={loading || !amount || Number.parseFloat(amount) <= 0 || availableCash < 0}
              className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              В сейф
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
