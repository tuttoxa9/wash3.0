import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import { certificateService, dailyReportService } from "@/lib/services/supabaseService";
import { toast } from "sonner";

interface SellCertificateModalProps {
  onClose: () => void;
  selectedDate: string;
}

const SellCertificateModal: React.FC<SellCertificateModalProps> = ({
  onClose,
  selectedDate,
}) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    service: "",
    paymentMethod: "cash" as "cash" | "card",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    if (!formData.service.trim()) {
      toast.error("Укажите услугу или описание сертификата");
      return;
    }

    setLoading(true);

    try {
      // 1. Добавляем сертификат в базу
      const newCertificate = await certificateService.add({
        date: selectedDate,
        amount: Number(formData.amount),
        service: formData.service.trim(),
        paymentMethod: formData.paymentMethod,
        status: "active",
      });

      if (!newCertificate) {
        throw new Error("Не удалось создать сертификат");
      }

      // Обновляем контекст сертификатов
      dispatch({ type: "ADD_CERTIFICATE", payload: newCertificate });

      // 2. Добавляем корректировку кассы (внесение) в текущий DailyReport
      const currentReport = state.dailyReports[selectedDate];
      if (currentReport) {
        const modification = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
          amount: Number(formData.amount), // Внесение (плюс)
          reason: `Продажа сертификата: ${formData.service.trim()}`,
          method: formData.paymentMethod,
          createdAt: new Date().toISOString(),
        };

        const updatedModifications = [...(currentReport.cashModifications || []), modification];
        const updatedReport = { ...currentReport, cashModifications: updatedModifications };

        const success = await dailyReportService.updateReport(updatedReport);

        if (success) {
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        } else {
          console.error("Не удалось обновить кассу при продаже сертификата");
          toast.warning("Сертификат создан, но не удалось обновить кассу");
        }
      }

      toast.success("Сертификат успешно продан");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка при продаже сертификата");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-foreground">Продажа сертификата</h3>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Услуга / Описание</label>
            <input
              type="text"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              placeholder="Например: Химчистка салона"
              className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Сумма (BYN)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Способ оплаты</label>
            <div className="segmented-control">
              <button
                type="button"
                className={formData.paymentMethod === "cash" ? "active" : ""}
                onClick={() => setFormData({ ...formData, paymentMethod: "cash" })}
              >
                Наличные
              </button>
              <button
                type="button"
                className={formData.paymentMethod === "card" ? "active" : ""}
                onClick={() => setFormData({ ...formData, paymentMethod: "card" })}
              >
                Карта
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              * Сумма будет добавлена в фактическую кассу за сегодня, но не пойдет в расчет зарплаты сотрудникам.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-input hover:bg-muted transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Продать"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default SellCertificateModal;