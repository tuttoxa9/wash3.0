import React, { useState } from "react";
import { User, Loader2, Save, X, Edit, Trash2 } from "lucide-react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useAppContext } from "@/lib/context/AppContext";
import { carWashService, dailyReportService } from "@/lib/services/supabaseService";
import type { CarWashRecord, DailyReport, Employee, Organization, PaymentMethod } from "@/lib/types";
import { createSalaryCalculator } from "@/components/SalaryCalculator";
import { calculateEmployeeShare } from "@/lib/employee-utils";
import { toast } from "sonner";
import type { EmployeeRole, MinimumPaymentSettings } from "@/lib/types";

interface EmployeeDetailModalProps {
  isOpen: boolean;
  employeeId: string;
  onClose: () => void;
  currentReport: DailyReport | null;
  employees: Employee[];
  organizations: Organization[];
  employeeRoles: Record<string, EmployeeRole>;
  minimumPaymentSettings: MinimumPaymentSettings;
}

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  employeeId,
  onClose,
  currentReport,
  employees,
  organizations,
  employeeRoles,
  minimumPaymentSettings,
}) => {
  const employee = employees.find((emp) => emp.id === employeeId);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] =
    useState<Partial<CarWashRecord> | null>(null);

  if (!employee || !currentReport) {
    return null;
  }

  // Фильтруем записи для конкретного работника
  const employeeRecords =
    currentReport.records?.filter((record) =>
      record.employeeIds.includes(employeeId),
    ) || [];

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

  // Общая сумма работника
  const totalEarnings = React.useMemo(() => {
    if (!currentReport || !currentReport.employeeIds?.includes(employeeId)) {
      return 0; // Сотрудник не в смене
    }

    // Подготовка override для минималки, если она была снята
    const minimumOverride: Record<string, boolean> = {};
    currentReport.employeeIds.forEach(id => {
       const key = `min_${id}` as any;
       const val = (currentReport.dailyEmployeeRoles as any)?.[key];
       minimumOverride[id] = val !== false;
    });

    const calculator = createSalaryCalculator(
       minimumPaymentSettings,
       currentReport.records,
       currentReport.dailyEmployeeRoles || employeeRoles,
       employees,
       minimumOverride
    );

    const results = calculator.calculateSalaries();
    const result = results.find(r => r.employeeId === employeeId);
    return result ? result.calculatedSalary : 0;
  }, [currentReport, employeeId, minimumPaymentSettings, employeeRoles, employees]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} fullHeight disableScroll className="md:max-w-5xl w-[96vw]">
      <div className="p-3 sm:p-4 md:p-6 flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-center mb-3 sm:mb-4 shrink-0">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-card-foreground">
            Детали работы - {employee.name}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-muted rounded-md sm:rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-muted/50 rounded-lg shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Всего машин:
              </span>
              <span className="font-semibold text-card-foreground text-sm sm:text-base">
                {employeeRecords.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Общая сумма:
              </span>
              <span className="font-semibold text-card-foreground text-sm sm:text-base">
                {totalEarnings.toFixed(2)} BYN
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 custom-scrollbar border border-border/40 rounded-xl shadow-sm relative">
          <table className="w-full bg-card min-w-[700px]">
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
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right text-xs sm:text-sm font-semibold text-primary">
                  Заработок
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  Оплата
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  Другие работники
                </th>
              </tr>
            </thead>
            <tbody>
              {employeeRecords.length > 0 ? (
                employeeRecords.map((record, index) => (
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
                        {record.serviceType === "dryclean" ? "Хим" : "Мойка"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right font-semibold text-card-foreground text-xs sm:text-sm">
                      {record.price.toFixed(2)} BYN
                    </td>
                    <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right font-bold text-primary text-xs sm:text-sm">
                      {(() => {
                        const role = employeeRoles[employeeId] || employees.find(e => e.id === employeeId)?.role || 'washer';
                        return calculateEmployeeShare(record, employeeId, role, minimumPaymentSettings).toFixed(2);
                      })()} BYN
                    </td>
                    <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-card-foreground text-xs sm:text-sm">
                      {getPaymentMethodDisplay(
                        record.paymentMethod.type,
                        record.paymentMethod.organizationId,
                      )}
                    </td>
                    <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-[10px] sm:text-xs text-muted-foreground">
                      {record.employeeIds
                        .filter((id) => id !== employeeId)
                        .map(
                          (id) =>
                            employees.find((emp) => emp.id === id)?.name,
                        )
                        .filter(Boolean)
                        .join(", ") || "Нет"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 sm:py-12 text-center text-muted-foreground text-xs sm:text-sm"
                  >
                    У этого работника нет записей за выбранную дату.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BottomSheet>
  );
};


export default EmployeeDetailModal;
