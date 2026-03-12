import React, { useState } from "react";
import { Receipt, X, Loader2, Save, Edit, Trash2, FileDown, Eye } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import { carWashService, dailyReportService } from "@/lib/services/supabaseService";
import type { CarWashRecord, DailyReport, Employee, Organization, PaymentMethod } from "@/lib/types";
import { createSalaryCalculator } from "@/components/SalaryCalculator";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import type { EmployeeRole, MinimumPaymentSettings } from "@/lib/types";

interface DailyReportModalProps {
  onClose: () => void;
  currentReport: DailyReport | null;
  employees: Employee[];
  organizations: Organization[];
  selectedDate: string;
  onExport: () => void;
  isExporting: boolean;
  paymentFilter: "all" | "cash" | "card" | "organization" | "debt" | "certificate";
  onPaymentFilterChange: (
    filter: "all" | "cash" | "card" | "organization" | "debt" | "certificate",
  ) => void;
  employeeRoles?: Record<string, EmployeeRole>;
  minimumPaymentSettings?: MinimumPaymentSettings;
}

const DailyReportModal: React.FC<DailyReportModalProps> = ({
  onClose,
  currentReport,
  employees,
  organizations,
  selectedDate,
  onExport,
  isExporting,
  paymentFilter,
  onPaymentFilterChange,
  employeeRoles,
  minimumPaymentSettings,
}) => {
  const { state, dispatch } = useAppContext();
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] =
    useState<Partial<CarWashRecord> | null>(null);

  // Получить название организации по ID
  const getOrganizationName = (id: string): string => {
    const organization = organizations.find((org) => org.id === id);
    return organization ? organization.name : "Неизвестная организация";
  };

  // Формирование текстового представления способа оплаты для таблицы
  const getPaymentMethodDisplay = (
    type: string,
    organizationId?: string,
  ): string => {
    if (type === "cash") return "Наличные";
    if (type === "card") return "Карта";
    if (type === "organization" && organizationId)
      return getOrganizationName(organizationId);
    return "Неизвестный";
  };

  // Функция для начала редактирования записи
  const startEditing = (record: CarWashRecord) => {
    setEditingRecordId(record.id);
    setEditFormData({
      ...record,
    });
  };

  // Функция для отмены редактирования
  const cancelEditing = () => {
    setEditingRecordId(null);
    setEditFormData(null);
  };

  // Обработчик изменений в полях формы редактирования
  const handleEditFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      if (!prev) return prev;

      // Особая обработка для числовых значений
      if (name === "price") {
        return { ...prev, [name]: Number.parseFloat(value) || 0 };
      }

      return { ...prev, [name]: value };
    });
  };

  // Обработчик изменения способа оплаты при редактировании
  const handleEditPaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt" | "certificate",
  ) => {
    setEditFormData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          type,
          organizationId:
            type === "organization"
              ? prev.paymentMethod?.organizationId
              : undefined,
          organizationName:
            type === "organization"
              ? prev.paymentMethod?.organizationName
              : undefined,
          comment: type === "debt" ? prev.paymentMethod?.comment : undefined,
        },
      };
    });
  };

  // Обработчик выбора организации при редактировании
  const handleEditOrganizationChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find(
      (org) => org.id === organizationId,
    );

    setEditFormData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        paymentMethod: {
          ...prev.paymentMethod,
          type: "organization",
          organizationId,
          organizationName: organization?.name,
        },
      };
    });
  };

  // Обработчик выбора сотрудников при редактировании
  const handleEditEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setEditFormData((prev) => {
      if (!prev) return prev;

      const currentEmployeeIds = prev.employeeIds || [];

      if (checked) {
        return {
          ...prev,
          employeeIds: [...currentEmployeeIds, value],
        };
      }
      return {
        ...prev,
        employeeIds: currentEmployeeIds.filter((id) => id !== value),
      };
    });
  };

  // Функция для сохранения изменений
  const saveRecordChanges = async () => {
    if (!editFormData || !editingRecordId) return;

    try {
      const record = {
        ...editFormData,
        id: editingRecordId,
      } as CarWashRecord;

      // Обновляем запись в базе данных
      const updatedRecord = await carWashService.update(record);

      if (updatedRecord) {
        // Обновляем запись в отчете
        const updatedReport = { ...currentReport };
        if (updatedReport?.records) {
          updatedReport.records = updatedReport.records.map((rec) =>
            rec.id === editingRecordId ? record : rec,
          );

          // Пересчитываем итоги
          const totalCash = updatedReport.records.reduce(
            (sum, rec) =>
              sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
            0,
          );

          const totalNonCash = updatedReport.records.reduce(
            (sum, rec) =>
              sum +
              (rec.paymentMethod.type === "card" ||
              rec.paymentMethod.type === "organization"
                ? rec.price
                : 0),
            0,
          );

          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        }

        // Сбрасываем состояние редактирования
        cancelEditing();
        toast.success("Запись успешно обновлена");
      } else {
        toast.error("Не удалось обновить запись");
      }
    } catch (error) {
      console.error("Ошибка при обновлении записи:", error);
      toast.error("Произошла ошибка при обновлении записи");
    }
  };

  // Функция для удаления записи
  const deleteRecord = async (recordId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) {
      return;
    }

    try {
      const success = await carWashService.delete(recordId);

      if (success) {
        // Обновляем отчет
        const updatedReport = { ...currentReport };
        if (updatedReport?.records) {
          const updatedRecords = updatedReport.records.filter(
            (rec) => rec.id !== recordId,
          );

          // Пересчитываем итоги
          const totalCash = updatedRecords.reduce(
            (sum, rec) =>
              sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
            0,
          );

          const totalNonCash = updatedRecords.reduce(
            (sum, rec) =>
              sum +
              (rec.paymentMethod.type === "card" ||
              rec.paymentMethod.type === "organization"
                ? rec.price
                : 0),
            0,
          );

          updatedReport.records = updatedRecords;
          updatedReport.totalCash = totalCash;
          updatedReport.totalNonCash = totalNonCash;

          // Сохраняем обновленный отчет в базе данных
          await dailyReportService.updateReport(updatedReport);

          // Обновляем состояние
          dispatch({
            type: "SET_DAILY_REPORT",
            payload: { date: selectedDate, report: updatedReport },
          });
        }

        toast.success("Запись успешно удалена");
      } else {
        toast.error("Не удалось удалить запись");
      }
    } catch (error) {
      console.error("Ошибка при удалении записи:", error);
      toast.error("Произошла ошибка при удалении записи");
    }
  };

  // Фильтрация записей по методу оплаты
  const filteredRecords =
    currentReport?.records?.filter((record) => {
      if (paymentFilter === "all") return true;
      return record.paymentMethod.type === paymentFilter;
    }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Оверлей */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Модальное окно снизу */}
      <div className="relative w-full max-w-7xl bg-card rounded-t-xl sm:rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[95vh] sm:max-h-[98vh] lg:h-[75vh] lg:max-h-none overflow-hidden border border-border">
        <div className="p-3 sm:p-4 md:p-6 lg:flex lg:flex-col lg:h-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-card-foreground">
              <span className="hidden sm:inline">Ежедневная ведомость - </span>
              <span className="sm:hidden">Ведомость - </span>
              {format(new Date(selectedDate), "dd.MM.yyyy")}
            </h3>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={onExport}
                disabled={isExporting || !currentReport}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-secondary text-secondary-foreground rounded-lg sm:rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span className="hidden sm:inline">Экспорт...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Экспорт в Word</span>
                    <span className="sm:hidden">Word</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-muted rounded-md sm:rounded-lg transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Фильтры по методу оплаты */}
          <div className="segmented-control mb-4">
            <button
              onClick={() => onPaymentFilterChange("all")}
              className={paymentFilter === "all" ? "active" : ""}
            >
              Все
            </button>
            <button
              onClick={() => onPaymentFilterChange("cash")}
              className={paymentFilter === "cash" ? "active" : ""}
            >
              Наличные
            </button>
            <button
              onClick={() => onPaymentFilterChange("card")}
              className={paymentFilter === "card" ? "active" : ""}
            >
              Карта
            </button>
            <button
              onClick={() => onPaymentFilterChange("organization")}
              className={paymentFilter === "organization" ? "active" : ""}
            >
              Безнал
            </button>
            <button
              onClick={() => onPaymentFilterChange("debt")}
              className={paymentFilter === "debt" ? "active" : ""}
            >
              Долги
            </button>
            <button
              onClick={() => onPaymentFilterChange("certificate")}
              className={paymentFilter === "certificate" ? "active" : ""}
            >
              Сертификаты
            </button>
          </div>

          {/* Десктопная версия таблицы */}
          <div className="hidden sm:block overflow-x-auto max-h-[75vh] lg:flex-1 lg:max-h-none lg:overflow-y-auto">
            <table className="w-full bg-card min-w-[800px]">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    №
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Время
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Авто
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Услуга
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Тип
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right text-xs sm:text-sm font-semibold text-card-foreground">
                    Стоимость
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Оплата
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Сотрудники
                  </th>
                  <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => {
                    const isEditing = editingRecordId === record.id;

                    if (isEditing && editFormData) {
                      // Режим редактирования
                      return (
                        <tr
                          key={record.id}
                          className="border-b border-border bg-yellow-50 dark:bg-yellow-900/20"
                        >
                          <td className="py-4 px-4 text-card-foreground font-medium">
                            {index + 1}
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="time"
                              name="time"
                              value={editFormData.time || ""}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              name="carInfo"
                              value={editFormData.carInfo || ""}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              name="service"
                              value={editFormData.service || ""}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-input rounded text-sm"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditFormData({
                                    ...editFormData,
                                    serviceType: "wash",
                                  })
                                }
                                className={`px-2 py-1 text-xs rounded ${
                                  editFormData.serviceType === "wash"
                                    ? "bg-blue-500 text-white"
                                    : "bg-secondary"
                                }`}
                              >
                                Мойка
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditFormData({
                                    ...editFormData,
                                    serviceType: "dryclean",
                                  })
                                }
                                className={`px-2 py-1 text-xs rounded ${
                                  editFormData.serviceType === "dryclean"
                                    ? "bg-purple-500 text-white"
                                    : "bg-secondary"
                                }`}
                              >
                                Хим
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              name="price"
                              value={editFormData.price || 0}
                              onChange={handleEditFormChange}
                              step="0.01"
                              min="0"
                              className="w-full px-2 py-1 border border-input rounded text-sm text-right"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("cash")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === "cash"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Нал
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("card")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === "card"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Карта
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("organization")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type ===
                                    "organization"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Орг
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditPaymentTypeChange("debt")
                                  }
                                  className={`px-2 py-1 text-xs rounded ${
                                    editFormData.paymentMethod?.type === "debt"
                                      ? "bg-primary text-white"
                                      : "bg-secondary"
                                  }`}
                                >
                                  Долг
                                </button>
                              </div>
                              {editFormData.paymentMethod?.type === "debt" && (
                                <input
                                  type="text"
                                  value={
                                    editFormData.paymentMethod?.comment || ""
                                  }
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      paymentMethod: {
                                        ...editFormData.paymentMethod,
                                        comment: e.target.value,
                                      } as any,
                                    })
                                  }
                                  placeholder="Комментарий"
                                  className="w-full px-2 py-1 border border-input rounded text-xs"
                                />
                              )}
                              {editFormData.paymentMethod?.type ===
                                "organization" && (
                                <select
                                  value={
                                    editFormData.paymentMethod
                                      ?.organizationId || ""
                                  }
                                  onChange={handleEditOrganizationChange}
                                  className="w-full px-2 py-1 border border-input rounded text-xs"
                                >
                                  <option value="">Выберите организацию</option>
                                  {state.organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                      {org.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {employees.map((emp) => (
                                <label
                                  key={emp.id}
                                  className="flex items-center gap-1 text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    value={emp.id}
                                    checked={
                                      editFormData.employeeIds?.includes(
                                        emp.id,
                                      ) || false
                                    }
                                    onChange={handleEditEmployeeChange}
                                    className="w-3 h-3"
                                  />
                                  <span className="truncate">{emp.name}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={saveRecordChanges}
                                className="p-1 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                title="Сохранить"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                title="Отмена"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Обычный режим просмотра
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-border hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground font-medium text-xs sm:text-sm">
                          {index + 1}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                          {record.time}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                          {record.carInfo}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                          {record.service}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4">
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${
                              record.serviceType === "dryclean"
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {record.serviceType === "dryclean"
                              ? "Хим"
                              : "Мойка"}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right font-semibold text-card-foreground text-xs sm:text-sm">
                          {record.price.toFixed(2)} BYN
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                          {record.paymentMethod.type === "debt" ? (
                            <span className="text-red-500 font-bold">
                              Долг{" "}
                              {record.paymentMethod.comment
                                ? `(${record.paymentMethod.comment})`
                                : ""}
                            </span>
                          ) : (
                            getPaymentMethodDisplay(
                              record.paymentMethod.type,
                              record.paymentMethod.organizationId,
                            )
                          )}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-[10px] sm:text-xs text-muted-foreground">
                          {record.employeeIds
                            .map(
                              (id) =>
                                employees.find((emp) => emp.id === id)?.name,
                            )
                            .filter(Boolean)
                            .join(", ")}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              onClick={() => startEditing(record)}
                              className="p-1 sm:p-1.5 md:p-2 rounded-md sm:rounded-lg hover:bg-secondary/50 transition-colors"
                              title="Редактировать"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="p-1 sm:p-1.5 md:p-2 rounded-md sm:rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {paymentFilter === "all"
                        ? "За выбранную дату нет записей."
                        : `Нет записей с выбранным методом оплаты.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Мобильная версия таблицы - компактная */}
          <div className="sm:hidden max-h-[70vh] overflow-y-auto p-2 space-y-2">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, index) => {
                const isEditing = editingRecordId === record.id;

                if (isEditing && editFormData) {
                  // Режим редактирования для мобильных - компактный
                  return (
                    <div
                      key={record.id}
                      className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-xs">
                          Ред. #{index + 1}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={saveRecordChanges}
                            className="p-1.5 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                            title="Сохранить"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Отмена"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block font-medium mb-0.5">
                            Время
                          </label>
                          <input
                            type="time"
                            name="time"
                            value={editFormData.time || ""}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-input rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-medium mb-0.5">
                            Цена
                          </label>
                          <input
                            type="number"
                            name="price"
                            value={editFormData.price || 0}
                            onChange={handleEditFormChange}
                            step="0.01"
                            min="0"
                            className="w-full px-2 py-1 border border-input rounded text-xs"
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="block font-medium mb-0.5">Авто</label>
                        <input
                          type="text"
                          name="carInfo"
                          value={editFormData.carInfo || ""}
                          onChange={handleEditFormChange}
                          className="w-full px-2 py-1 border border-input rounded text-xs"
                        />
                      </div>
                    </div>
                  );
                }

                // Компактный режим просмотра для мобильных
                return (
                  <div
                    key={record.id}
                    className="border border-border rounded-lg p-2.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-medium shrink-0">
                          {record.time}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                            record.serviceType === "dryclean"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                          }`}
                        >
                          {record.serviceType === "dryclean" ? "Х" : "М"}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-bold text-sm leading-tight">
                          {record.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground leading-none">
                          BYN
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs leading-tight">
                        <span className="font-medium">{record.carInfo}</span>
                        <span className="text-muted-foreground"> • </span>
                        <span className="text-muted-foreground">
                          {record.service}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">
                        <span className="font-medium">Сотрудники: </span>
                        <span>
                          {record.employeeIds
                            .map(
                              (id) =>
                                employees.find((emp) => emp.id === id)?.name,
                            )
                            .filter(Boolean)
                            .join(", ") || "Не указано"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground truncate flex-1 min-w-0 pr-2">
                          {record.paymentMethod.type === "debt" ? (
                            <span className="text-red-500 font-bold uppercase tracking-tighter">
                              Долг{" "}
                              {record.paymentMethod.comment
                                ? `(${record.paymentMethod.comment})`
                                : ""}
                            </span>
                          ) : (
                            getPaymentMethodDisplay(
                              record.paymentMethod.type,
                              record.paymentMethod.organizationId,
                            )
                          )}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => startEditing(record)}
                            className="p-1 rounded hover:bg-secondary/50 transition-colors"
                            title="Редактировать"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="p-1 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs">
                {paymentFilter === "all"
                  ? "За выбранную дату нет записей."
                  : `Нет записей с выбранным методом оплаты.`}
              </div>
            )}
          </div>

          {/* Итоги - компактный дизайн */}
          {currentReport && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border bg-muted/5 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pb-2">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === "cash"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "cash" ? "all" : "cash",
                    )
                  }
                  title="Нажмите для фильтрации по наличным"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Наличные
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight break-words flex flex-col items-center">
                    {(() => {
                      const actualCash = currentReport.totalCash + (currentReport.cashModifications || [])
                        .filter(m => !m.method || m.method === "cash")
                        .reduce((sum, mod) => sum + mod.amount, 0);
                      return actualCash.toFixed(2);
                    })()} BYN
                    {currentReport.cashModifications && currentReport.cashModifications.filter(m => !m.method || m.method === "cash").length > 0 && (
                       <span className="text-[9px] font-normal text-muted-foreground mt-0.5">по услугам {currentReport.totalCash.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === "card"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "card" ? "all" : "card",
                    )
                  }
                  title="Нажмите для фильтрации по картам"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Карта
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight break-words flex flex-col items-center">
                    {(() => {
                      const totalCardServices = currentReport.records?.reduce((sum, rec) => sum + (rec.paymentMethod.type === "card" ? rec.price : 0), 0) || 0;
                      const cardMods = (currentReport.cashModifications || []).filter(m => m.method === "card").reduce((sum, mod) => sum + mod.amount, 0);
                      return (totalCardServices + cardMods).toFixed(2);
                    })()} BYN
                    {currentReport.cashModifications && currentReport.cashModifications.filter(m => m.method === "card").length > 0 && (
                       <span className="text-[9px] font-normal text-muted-foreground mt-0.5">по услугам {(currentReport.records?.reduce((sum, rec) => sum + (rec.paymentMethod.type === "card" ? rec.price : 0), 0) || 0).toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === "organization"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "organization" ? "all" : "organization",
                    )
                  }
                  title="Нажмите для фильтрации по безналу"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Безнал
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight break-words">
                    {(() => {
                      const orgSum =
                        currentReport.records?.reduce((sum, record) => {
                          return (
                            sum +
                            (record.paymentMethod.type === "organization"
                              ? record.price
                              : 0)
                          );
                        }, 0) || 0;
                      return orgSum.toFixed(2);
                    })()} BYN
                  </div>
                </div>
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                    paymentFilter === "debt"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "debt" ? "all" : "debt",
                    )
                  }
                  title="Нажмите для фильтрации по долгам"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Долги
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-red-500 leading-tight break-words">
                    {(() => {
                      const debtSum =
                        currentReport.records?.reduce((sum, record) => {
                          return (
                            sum +
                            (record.paymentMethod.type === "debt"
                              ? record.price
                              : 0)
                          );
                        }, 0) || 0;
                      return debtSum.toFixed(2);
                    })()} BYN
                  </div>
                </div>
                {/* Сертификаты */}
                {(() => {
                  const totalCertificate = currentReport.records?.reduce((sum, record) => sum + (record.paymentMethod.type === "certificate" ? record.price : 0), 0) || 0;
                  if (totalCertificate <= 0) return null;
                  return (
                    <div
                      className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                        paymentFilter === "certificate"
                          ? "bg-primary/10 border border-primary"
                          : "bg-muted/30 hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        onPaymentFilterChange(
                          paymentFilter === "certificate" ? "all" : "certificate",
                        )
                      }
                      title="Нажмите для фильтрации по сертификатам"
                    >
                      <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                        Сертификаты
                      </div>
                      <div className="text-xs sm:text-sm md:text-base font-bold text-purple-500 leading-tight break-words">
                        {totalCertificate.toFixed(2)} BYN
                      </div>
                    </div>
                  );
                })()}
                <div
                  className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors col-span-2 lg:col-span-1 ${
                    paymentFilter === "all"
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => onPaymentFilterChange("all")}
                  title="Показать все записи"
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 whitespace-nowrap">
                    Всего
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-primary leading-tight break-words">
                    {(() => {
                      const totalRevenue =
                        currentReport.records?.reduce((sum, record) => {
                          return sum + record.price;
                        }, 0) || 0;
                      return totalRevenue.toFixed(2);
                    })()} BYN
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyReportModal;
