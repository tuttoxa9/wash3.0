import React, { useState } from "react";
import { Loader2, Check } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import { carWashService, dailyReportService } from "@/lib/services/supabaseService";
import type { CarWashRecord, EmployeeRole } from "@/lib/types";
import { toast } from "sonner";
import { format } from "date-fns";

interface WrapExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  originalRecord: CarWashRecord | null;
  originalReportId: string | null;
  clickPosition?: { x: number; y: number } | null;
  employeeRoles: Record<string, EmployeeRole>;
  onSuccess?: () => void;
}

const WrapExecutionModal: React.FC<WrapExecutionModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  originalRecord,
  originalReportId,
  clickPosition,
  employeeRoles,
  onSuccess,
}) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);

  const currentReport = state.dailyReports[selectedDate] || null;
  const shiftEmployeeIds = currentReport?.employeeIds || [];

  const [formData, setFormData] = useState({
    time: format(new Date(), "HH:mm"),
    employeeIds: [] as string[],
  });

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        employeeIds: [...prev.employeeIds, value],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        employeeIds: prev.employeeIds.filter((id) => id !== value),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!originalRecord || !originalReportId) return;

    if (formData.employeeIds.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }

    setLoading(true);

    try {
      // 1. Создаем запись wrap_execution
      const newRecord: Omit<CarWashRecord, "id"> = {
        date: selectedDate,
        time: formData.time,
        carInfo: originalRecord.carInfo,
        service: originalRecord.service,
        serviceType: "wrap_execution",
        price: originalRecord.price, // Цена копируется для расчета ЗП, но не идет в общую выручку (type: prepaid)
        paymentMethod: { type: "prepaid" },
        employeeIds: formData.employeeIds,
        relatedRecordId: originalRecord.id,
      };

      const addedRecord = await carWashService.add(newRecord);

      if (!addedRecord) {
        throw new Error("Failed to add wrap_execution record");
      }

      // Добавляем запись в текущий отчет
      const successReport = await dailyReportService.addRecord(
        selectedDate,
        addedRecord
      );

      if (!successReport) {
        throw new Error("Failed to add to daily report");
      }

      // Обновляем локальное состояние текущей смены
      dispatch({
        type: "ADD_CAR_WASH_RECORD",
        payload: {
          date: selectedDate,
          record: addedRecord,
        },
      });

      // 2. Помечаем оригинальную запись wrap_sale как isExecuted = true
      const originalReport = await dailyReportService.getByDate(originalReportId);
      if (originalReport) {
        const updatedRecords = originalReport.records.map((rec) => {
          if (rec.id === originalRecord.id) {
            return {
              ...rec,
              isExecuted: true,
              paymentMethod: {
                ...rec.paymentMethod,
                isExecuted: true,
              }
            };
          }
          return rec;
        });

        const updatedReport = {
          ...originalReport,
          records: updatedRecords,
        };

        await dailyReportService.updateReport(updatedReport);

        // Обновляем в car_wash_records тоже
        const recordToUpdate = updatedRecords.find((r) => r.id === originalRecord.id);
        if (recordToUpdate) {
          await carWashService.update(recordToUpdate);
        }

        // Если это текущий день, обновим состояние
        if (originalReportId === selectedDate) {
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        }
      }

      toast.success("Оклейка успешно исполнена");
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error("Ошибка при исполнении оклейки:", error);
      toast.error("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  if (!originalRecord) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      clickPosition={clickPosition}
      className="max-w-lg"
    >
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">Исполнение оклейки</h3>

        <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border/50">
          <div className="text-sm text-muted-foreground mb-1">Оригинальная услуга</div>
          <div className="font-semibold">{originalRecord.carInfo}</div>
          <div className="text-sm">{originalRecord.service} • {originalRecord.price} BYN</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="time" className="block text-sm font-medium mb-1">
                Время завершения
              </label>
              <input
                type="time"
                id="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Сотрудники, выполнившие работу
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-input rounded-xl">
                {state.employees.length > 0 ? (
                  [...state.employees]
                    .sort((a, b) => {
                      const aOnShift = shiftEmployeeIds.includes(a.id);
                      const bOnShift = shiftEmployeeIds.includes(b.id);
                      if (aOnShift && !bOnShift) return -1;
                      if (!aOnShift && bOnShift) return 1;
                      return 0;
                    })
                    .map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          id={`wrap-employee-${employee.id}`}
                          value={employee.id}
                          checked={formData.employeeIds.includes(employee.id)}
                          onChange={handleEmployeeChange}
                          className="rounded border-input text-primary focus:ring-ring"
                        />
                        <label
                          htmlFor={`wrap-employee-${employee.id}`}
                          className={`flex-1 flex items-center gap-2 text-sm ${shiftEmployeeIds.includes(employee.id) ? "font-medium" : ""}`}
                        >
                          <span>{employee.name}</span>
                          {shiftEmployeeIds.includes(employee.id) && (
                            <span
                              className={`px-2 py-1 rounded text-xs text-white ${
                                employeeRoles[employee.id] === "admin"
                                  ? "bg-green-500"
                                  : employeeRoles[employee.id] === "washer"
                                    ? "bg-blue-500"
                                    : "bg-gray-500"
                              }`}
                            >
                              {employeeRoles[employee.id] === "admin"
                                ? "Админ"
                                : employeeRoles[employee.id] === "washer"
                                  ? "Мойщик"
                                  : "на смене"}
                            </span>
                          )}
                        </label>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    Нет доступных сотрудников.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-input hover:bg-secondary/50 transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Исполнить"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default WrapExecutionModal;
