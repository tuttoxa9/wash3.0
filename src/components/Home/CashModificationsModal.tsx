import React, { useState } from "react";
import { X, Plus, Trash2, Edit } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import { dailyReportService } from "@/lib/services/supabaseService";
import type { DailyReport } from "@/lib/types";
import { toast } from "sonner";
import { generateId } from "@/lib/utils";
import { format } from "date-fns";

interface CashModificationsModalProps {
  onClose: () => void;
  currentReport: DailyReport;
  selectedDate: string;
}

const CashModificationsModal: React.FC<CashModificationsModalProps> = ({
  onClose,
  currentReport,
  selectedDate,
}) => {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "expense", // 'expense' (изъятие) или 'income' (внесение)
    amount: "",
    reason: "",
    method: "cash" as "cash" | "card",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddModification = async (e: React.FormEvent) => {
    e.preventDefault();

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
        id: generateId(),
        amount: formData.type === "expense" ? -amountValue : amountValue,
        reason: formData.reason.trim(),
        createdAt: new Date().toISOString(),
        method: formData.method,
      };

      const updatedModifications = [...(currentReport.cashModifications || []), modification];
      const updatedReport = { ...currentReport, cashModifications: updatedModifications };

      const success = await dailyReportService.updateReport(updatedReport);

      if (success) {
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: selectedDate, report: updatedReport },
        });
        toast.success("Изменение добавлено");
        setShowAddForm(false);
        setFormData({ type: "expense", amount: "", reason: "", method: "cash" });
      } else {
        toast.error("Ошибка при сохранении");
      }
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModification = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) return;

    setLoading(true);
    try {
      const updatedModifications = (currentReport.cashModifications || []).filter((m) => m.id !== id);
      const updatedReport = { ...currentReport, cashModifications: updatedModifications };

      const success = await dailyReportService.updateReport(updatedReport);

      if (success) {
        dispatch({
          type: "SET_DAILY_REPORT",
          payload: { date: selectedDate, report: updatedReport },
        });
        toast.success("Запись удалена");
      } else {
        toast.error("Ошибка при удалении");
      }
    } catch (error) {
      console.error(error);
      toast.error("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const modifications = currentReport.cashModifications || [];

  // Разделяем нал и безнал
  const cashModifications = modifications.filter(m => !m.method || m.method === "cash");
  const cardModifications = modifications.filter(m => m.method === "card");

  const totalCashModifications = cashModifications.reduce((sum, mod) => sum + mod.amount, 0);
  const totalCardModifications = cardModifications.reduce((sum, mod) => sum + mod.amount, 0);

  const actualCash = currentReport.totalCash + totalCashModifications;

  const totalCardServices = currentReport.records?.reduce((sum, rec) => sum + (rec.paymentMethod.type === "card" ? rec.price : 0), 0) || 0;
  const actualCard = totalCardServices + totalCardModifications;

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-foreground">Движение средств</h3>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Сводка */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Наличные (услуги)</div>
            <div className="font-semibold text-sm mb-2">{currentReport.totalCash.toFixed(2)} BYN</div>
            <div className="text-xs text-muted-foreground mb-1">Фактически</div>
            <div className="font-bold text-base text-primary">{actualCash.toFixed(2)} BYN</div>
          </div>
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Карта (услуги)</div>
            <div className="font-semibold text-sm mb-2">{totalCardServices.toFixed(2)} BYN</div>
            <div className="text-xs text-muted-foreground mb-1">Фактически</div>
            <div className="font-bold text-base text-primary">{actualCard.toFixed(2)} BYN</div>
          </div>
        </div>

        {/* Список изменений */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-foreground">История изменений</h4>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить
              </button>
            )}
          </div>

          {modifications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm bg-accent/20 rounded-xl border border-border/30">
              Нет записей об изменениях
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {modifications.map((mod) => (
                <div key={mod.id} className="flex justify-between items-center p-3 rounded-lg border border-border/50 bg-background hover:bg-accent/10 transition-colors">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-medium text-sm text-foreground truncate flex items-center gap-2">
                      {mod.reason}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${(!mod.method || mod.method === 'cash') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {(!mod.method || mod.method === 'cash') ? 'Нал' : 'Карта'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(mod.createdAt), "HH:mm")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold tabular-nums whitespace-nowrap ${mod.amount < 0 ? "text-red-500" : "text-green-500"}`}>
                      {mod.amount > 0 ? "+" : ""}{mod.amount.toFixed(2)} BYN
                    </span>
                    <button
                      onClick={() => handleDeleteModification(mod.id)}
                      disabled={loading}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Форма добавления */}
        {showAddForm && (
          <form onSubmit={handleAddModification} className="bg-accent/10 rounded-xl p-4 border border-border/50 animate-in fade-in slide-in-from-top-2">
            <h4 className="font-semibold text-sm mb-3">Новая запись</h4>

            <div className="segmented-control mb-3">
              <button
                type="button"
                className={formData.type === "expense" ? "active" : ""}
                onClick={() => setFormData({ ...formData, type: "expense" })}
              >
                Изъятие
              </button>
              <button
                type="button"
                className={formData.type === "income" ? "active" : ""}
                onClick={() => setFormData({ ...formData, type: "income" })}
              >
                Внесение
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Способ оплаты</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-sm rounded-lg border ${formData.method === 'cash' ? 'bg-amber-100 border-amber-300 text-amber-800 font-medium' : 'bg-background border-border text-muted-foreground'}`}
                    onClick={() => setFormData({ ...formData, method: "cash" })}
                  >
                    Наличные
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-sm rounded-lg border ${formData.method === 'card' ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' : 'bg-background border-border text-muted-foreground'}`}
                    onClick={() => setFormData({ ...formData, method: "card" })}
                  >
                    Карта
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Сумма (BYN)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Причина / Комментарий</label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder={formData.type === "expense" ? "Например: оплата за воду" : "Например: сдача"}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-input text-sm font-medium hover:bg-accent transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default CashModificationsModal;
