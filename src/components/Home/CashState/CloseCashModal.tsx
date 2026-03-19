import type React from "react";
import { useState } from "react";
import Modal from "@/components/ui/modal";
import { X, CheckCircle, Loader2 } from "lucide-react";
import type { DailyReport } from "@/lib/types";
import { dailyReportService } from "@/lib/services/supabaseService";
import { useAppContext } from "@/lib/context/AppContext";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport;
}

export default function CloseCashModal({ isOpen, onClose, report }: Props) {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [actualCash, setActualCash] = useState<string>("");

  const cashState = report.cashState;
  const cashMods = (report.cashModifications || []).filter(m => !m.method || m.method === "cash");
  const totalCashMods = cashMods.reduce((sum, mod) => sum + mod.amount, 0);
  const totalIn = cashMods.filter(m => m.amount > 0).reduce((sum, mod) => sum + mod.amount, 0);
  const totalOut = Math.abs(cashMods.filter(m => m.amount < 0).reduce((sum, mod) => sum + mod.amount, 0));

  const totalPayouts = Object.values(cashState?.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);
  const transferredToSafe = cashState?.transferredToSafe || 0;

  // Ожидалась грязная касса ДО выплат
  const expectedGrossCash = (cashState?.startOfDayCash || 0) + report.totalCash + totalCashMods;

  // Текущая ожидаемая касса (чистая, с учетом выплат, которые УЖЕ могли быть сделаны)
  const expectedNetCash = expectedGrossCash - totalPayouts - transferredToSafe;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numActualNetCash = Number.parseFloat(actualCash);

    if (Number.isNaN(numActualNetCash) || numActualNetCash < 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    setLoading(true);
    try {
      // Пользователь пересчитывает физические деньги в ящике.
      // Если он уже выдал ЗП или перевел в сейф - этих денег в ящике НЕТ. Значит он вводит чистую кассу.
      // Но в actualEndOfDayCash мы должны хранить кассу ДО этих выплат (грязную),
      // чтобы вся остальная система могла корректно отнимать их и не получалось двойного вычитания.
      const grossActualCash = numActualNetCash + totalPayouts + transferredToSafe;

      const updatedReport: DailyReport = {
        ...report,
        cashState: {
          ...(report.cashState || { isShiftOpen: true, startOfDayCash: 0 }),
          actualEndOfDayCash: grossActualCash
        }
      };

      const success = await dailyReportService.updateReport(updatedReport);
      if (success) {
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: report.date as string, report: updatedReport }
        });
        toast.success("Касса успешно сверена");
        onClose();
      } else {
        throw new Error("Ошибка при обновлении отчета");
      }
    } catch (error) {
      console.error(error);
      toast.error("Не удалось закрыть кассу");
    } finally {
      setLoading(false);
    }
  };

  const difference = actualCash ? Number.parseFloat(actualCash) - expectedNetCash : 0;
  const isDifference = Math.abs(difference) > 0.01;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Сверка кассы
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-muted/20 border border-border/50 mb-6 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Начало дня:</span>
            <span className="font-semibold text-foreground">{cashState?.startOfDayCash?.toFixed(2) || "0.00"} BYN</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">По услугам (нал):</span>
            <span className="font-semibold text-foreground">{report.totalCash.toFixed(2)} BYN</span>
          </div>
          {totalIn > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground pl-3 border-l-2 border-green-500/50">Внесения:</span>
              <span className="font-semibold text-green-600">+{totalIn.toFixed(2)} BYN</span>
            </div>
          )}
          {totalOut > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground pl-3 border-l-2 border-red-500/50">Изъятия:</span>
              <span className="font-semibold text-red-600">-{totalOut.toFixed(2)} BYN</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm mt-1 pt-2 border-t border-border/50">
            <span className="text-muted-foreground font-medium">Ожидалось всего:</span>
            <span className="font-bold text-foreground">{expectedGrossCash.toFixed(2)} BYN</span>
          </div>

          {/* Если уже были расходы до сверки - показываем их, чтобы человек понимал, почему ожидает меньше */}
          {(totalPayouts > 0 || transferredToSafe > 0) && (
            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-border/50">
              {totalPayouts > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground pl-3 border-l-2 border-orange-500/50">Уже выплачено ЗП:</span>
                  <span className="font-semibold text-orange-500">-{totalPayouts.toFixed(2)} BYN</span>
                </div>
              )}
              {transferredToSafe > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground pl-3 border-l-2 border-blue-500/50">Уже передано в сейф:</span>
                  <span className="font-semibold text-blue-500">-{transferredToSafe.toFixed(2)} BYN</span>
                </div>
              )}

              <div className="flex justify-between items-center mt-2 bg-accent/30 -mx-4 px-4 py-2">
                <span className="text-muted-foreground font-medium">Ожидается сейчас:</span>
                <span className="font-bold text-lg text-foreground">{expectedNetCash.toFixed(2)} BYN</span>
              </div>
            </div>
          )}
          {totalPayouts === 0 && transferredToSafe === 0 && (
             <div className="flex justify-between items-center mt-2 bg-accent/30 -mx-4 px-4 py-2">
               <span className="text-muted-foreground font-medium">Ожидается сейчас:</span>
               <span className="font-bold text-lg text-foreground">{expectedNetCash.toFixed(2)} BYN</span>
             </div>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1.5">
              Физически сейчас в кассе <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Пересчитайте деньги в ящике и введите фактическую сумму.
            </p>
            <input
              type="number"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              autoFocus
              className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-lg font-bold"
            />
            {actualCash && isDifference && (
              <p className={`text-sm mt-2 font-medium ${difference > 0 ? "text-green-500" : "text-destructive"}`}>
                {difference > 0 ? "Излишек:" : "Недостача:"} {Math.abs(difference).toFixed(2)} BYN
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
              disabled={loading || !actualCash}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить факт
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
