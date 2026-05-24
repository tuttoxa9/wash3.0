import React, { useState, useEffect } from "react";
import { X, Loader2, Edit3, UserCheck, Check } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import { carWashService, dailyReportService } from "@/lib/services/supabaseService";
import type { EmployeeRole, PaymentMethod, CarWashRecord, DailyReport } from "@/lib/types";
import { toast } from "sonner";
import { parseISO, format } from "date-fns";

interface EditCarWashModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CarWashRecord | null;
  employeeRoles: Record<string, EmployeeRole>;
  onSuccess?: (date: string, updatedRecord: CarWashRecord) => void;
}

const EditCarWashModal: React.FC<EditCarWashModalProps> = ({
  isOpen,
  onClose,
  record,
  employeeRoles,
  onSuccess,
}) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [salaries, setSalaries] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    time: "",
    carInfo: "",
    service: "",
    serviceType: "wash" as "wash" | "dryclean" | "detailing" | "wrap_sale" | "wrap_execution",
    price: 0,
    paymentMethod: { type: "cash" } as PaymentMethod,
    employeeIds: [] as string[],
    noAdminCommission: false,
    manualWrapperSalary: 0,
  });

  useEffect(() => {
    if (isOpen && record) {
      setFormData({
        time: record.time || "",
        carInfo: record.carInfo || "",
        service: record.service || "",
        serviceType: record.serviceType,
        price: record.price || 0,
        paymentMethod: { ...record.paymentMethod },
        employeeIds: [...record.employeeIds],
        noAdminCommission: record.noAdminCommission || false,
        manualWrapperSalary: record.manualWrapperSalary || 0,
      });

      const initialSalaries: Record<string, string> = {};
      record.employeeIds.forEach((empId) => {
        const indSal = record.individualSalaries?.[empId] 
          || (record.manualWrapperSalary ? record.manualWrapperSalary / record.employeeIds.length : 0);
        initialSalaries[empId] = indSal > 0 ? indSal.toFixed(2) : "";
      });
      setSalaries(initialSalaries);
    }
  }, [isOpen, record]);

  if (!record) return null;

  const recordDateStr = typeof record.date === "string" ? record.date : (record.date as any).toISOString().slice(0, 10);
  const shiftEmployeeIds = Object.keys(employeeRoles);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt" | "certificate",
  ) => {
    setFormData({
      ...formData,
      paymentMethod: {
        type,
        organizationId: type === "organization" ? formData.paymentMethod.organizationId : undefined,
        organizationName: type === "organization" ? formData.paymentMethod.organizationName : undefined,
        comment: type === "debt" ? formData.paymentMethod.comment : undefined,
      },
    });
  };

  const handleOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find((org) => org.id === organizationId);
    setFormData({
      ...formData,
      paymentMethod: {
        ...formData.paymentMethod,
        organizationId,
        organizationName: organization?.name,
      },
    });
  };

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData({ ...formData, employeeIds: [...formData.employeeIds, value] });
    } else {
      setFormData({ ...formData, employeeIds: formData.employeeIds.filter((id) => id !== value) });
      const newSalaries = { ...salaries };
      delete newSalaries[value];
      setSalaries(newSalaries);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.carInfo || !formData.service || !formData.time) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const price = Number.parseFloat(formData.price.toString());
    if (isNaN(price) || price <= 0) {
      toast.error("Укажите корректную стоимость");
      return;
    }

    if (formData.employeeIds.length === 0 && formData.serviceType !== "wrap_sale") {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }

    let paymentMethod = { ...formData.paymentMethod };
    if (paymentMethod.type === "cash" || paymentMethod.type === "card" || paymentMethod.type === "certificate") {
      paymentMethod = { type: paymentMethod.type };
    } else if (paymentMethod.type === "debt") {
      paymentMethod = {
        type: "debt",
        comment: paymentMethod.comment,
        isSalaryPaidForDebt: (record.paymentMethod as any).isSalaryPaidForDebt || false,
      };
    } else if (paymentMethod.type === "organization" && !paymentMethod.organizationId) {
      toast.error("Выберите организацию для оплаты");
      return;
    }

    const individualSalaries: Record<string, number> = {};
    let totalManualSalary = 0;
    
    // Проверяем, нужно ли индивидуальные ЗП
    const requiresSalaries = formData.serviceType === "wrap_execution" || formData.serviceType === "detailing" || formData.manualWrapperSalary > 0;
    
    if (requiresSalaries && formData.employeeIds.length > 0) {
        for (const empId of formData.employeeIds) {
            const valStr = salaries[empId] || "0";
            const val = parseFloat(valStr);
            if (isNaN(val) || val < 0) {
                toast.error("Введите корректную сумму зарплаты");
                return;
            }
            individualSalaries[empId] = val;
            totalManualSalary += val;
        }
    }

    setLoading(true);

    try {
      const updatedRecord: CarWashRecord = {
        ...record,
        time: formData.time,
        carInfo: formData.carInfo,
        service: formData.service,
        serviceType: formData.serviceType,
        price,
        paymentMethod,
        employeeIds: formData.employeeIds,
        noAdminCommission: formData.noAdminCommission,
        manualWrapperSalary: totalManualSalary > 0 ? totalManualSalary : undefined,
        individualSalaries: requiresSalaries ? individualSalaries : undefined,
      };

      const successDb = await carWashService.update(updatedRecord);
      if (!successDb) throw new Error("Failed to update record in DB");

      // Обновляем в DailyReport
      let currentReport = state.dailyReports[recordDateStr];
      if (!currentReport) {
         currentReport = await dailyReportService.getByDate(recordDateStr);
      }
      
      if (currentReport) {
        const updatedRecords = currentReport.records.map((r) => 
          r.id === record.id ? updatedRecord : r
        );
        const updatedReport: DailyReport = {
          ...currentReport,
          records: updatedRecords
        };
        await dailyReportService.updateReport(updatedReport);
        
        dispatch({
            type: "SET_DAILY_REPORT",
            payload: {
              date: recordDateStr,
              report: updatedReport
            }
        });
      }

      toast.success("Услуга успешно обновлена");
      if (onSuccess) onSuccess(recordDateStr, updatedRecord);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Не удалось обновить услугу");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-primary" />
            Редактирование услуги
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Время */}
            <div>
              <label htmlFor="time" className="block text-sm font-medium mb-1">Время</label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Авто */}
            <div>
              <label htmlFor="carInfo" className="block text-sm font-medium mb-1">Авто</label>
              <input
                type="text"
                id="carInfo"
                name="carInfo"
                value={formData.carInfo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Услуга */}
            <div>
              <label htmlFor="service" className="block text-sm font-medium mb-1">Название услуги</label>
              <input
                type="text"
                id="service"
                name="service"
                value={formData.service}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Цена */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1">Стоимость (BYN)</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          {/* Тип услуги */}
          <div>
            <label className="block text-sm font-medium mb-2">Тип услуги</label>
            <div className="segmented-control mb-3 flex-wrap">
              <button type="button" onClick={() => setFormData({ ...formData, serviceType: "wash" })} className={formData.serviceType === "wash" ? "active" : ""}>Мойка</button>
              <button type="button" onClick={() => setFormData({ ...formData, serviceType: "dryclean" })} className={formData.serviceType === "dryclean" ? "active" : ""}>Химчистка</button>
              <button type="button" onClick={() => setFormData({ ...formData, serviceType: "detailing" })} className={formData.serviceType === "detailing" ? "active" : ""}>Детейлинг</button>
              <button type="button" onClick={() => setFormData({ ...formData, serviceType: "wrap_sale" })} className={formData.serviceType === "wrap_sale" ? "active" : ""}>Оклейка (продажа)</button>
              <button type="button" onClick={() => setFormData({ ...formData, serviceType: "wrap_execution" })} className={formData.serviceType === "wrap_execution" ? "active" : ""}>Оклейка (исполнение)</button>
            </div>
          </div>

          {/* Оплата */}
          <div className="p-3 bg-muted/20 border border-border/40 rounded-xl space-y-3">
            <label className="block text-sm font-medium">Способ оплаты</label>
            <div className="segmented-control flex-wrap">
              <button type="button" onClick={() => handlePaymentTypeChange("cash")} className={formData.paymentMethod.type === "cash" ? "active" : ""}>Наличные</button>
              <button type="button" onClick={() => handlePaymentTypeChange("card")} className={formData.paymentMethod.type === "card" ? "active" : ""}>Карта</button>
              <button type="button" onClick={() => handlePaymentTypeChange("organization")} className={formData.paymentMethod.type === "organization" ? "active" : ""}>Безнал</button>
              <button type="button" onClick={() => handlePaymentTypeChange("debt")} className={formData.paymentMethod.type === "debt" ? "active" : ""}>Долг</button>
              <button type="button" onClick={() => handlePaymentTypeChange("certificate")} className={formData.paymentMethod.type === "certificate" ? "active" : ""}>Сертификат</button>
            </div>

            {formData.paymentMethod.type === "debt" && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Комментарий / Кто должен</label>
                <input
                  type="text"
                  value={formData.paymentMethod.comment || ""}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: { ...formData.paymentMethod, comment: e.target.value }})}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  required
                />
              </div>
            )}
            {formData.paymentMethod.type === "organization" && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Организация</label>
                <select
                  value={formData.paymentMethod.organizationId || ""}
                  onChange={handleOrganizationChange}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  required
                >
                  <option value="" disabled>Выберите организацию</option>
                  {state.organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Админ комиссия */}
          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="noAdminCommission"
              checked={formData.noAdminCommission}
              onChange={(e) => setFormData({ ...formData, noAdminCommission: e.target.checked })}
              className="rounded border-input text-primary focus:ring-ring"
            />
            <label htmlFor="noAdminCommission" className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none">
              Без админского процента (исключить из выручки админа)
            </label>
          </div>

          {/* Исполнители и ЗП */}
          <div>
            <label className="block text-sm font-medium mb-2">Исполнители</label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-input rounded-xl bg-background">
                {state.employees.map((employee) => {
                    const isSelected = formData.employeeIds.includes(employee.id);
                    return (
                        <div key={employee.id} className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-muted/50"}`}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id={`emp-${employee.id}`}
                                    value={employee.id}
                                    checked={isSelected}
                                    onChange={handleEmployeeChange}
                                    className="rounded border-input text-primary focus:ring-ring"
                                />
                                <label htmlFor={`emp-${employee.id}`} className="flex flex-col cursor-pointer">
                                    <span className="text-sm font-medium">{employee.name}</span>
                                    {shiftEmployeeIds.includes(employee.id) && (
                                        <span className="text-[10px] text-muted-foreground">На смене</span>
                                    )}
                                </label>
                            </div>
                            
                            {(formData.serviceType === "wrap_execution" || formData.serviceType === "detailing" || formData.manualWrapperSalary > 0) && isSelected && (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={salaries[employee.id] || ""}
                                        onChange={(e) => setSalaries({ ...salaries, [employee.id]: e.target.value })}
                                        placeholder="0.00"
                                        className="w-20 px-2 py-1 text-sm text-right bg-background border border-input rounded-md"
                                    />
                                    <span className="text-xs text-muted-foreground font-semibold">BYN</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {(formData.serviceType === "wash" || formData.serviceType === "dryclean") && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Активировать фикс ЗП для мойки/химчистки
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={formData.manualWrapperSalary || ""}
                        onChange={(e) => setFormData({...formData, manualWrapperSalary: parseFloat(e.target.value) || 0})}
                        placeholder="Общая сумма ЗП на всех..."
                        className="flex-1 px-3 py-1.5 text-sm bg-background border border-input rounded-md"
                    />
                    <span className="text-xs">BYN</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditCarWashModal;
