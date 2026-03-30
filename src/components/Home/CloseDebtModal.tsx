import React, { useState } from "react";
import { CreditCard, BanknotesIcon as Coins, BuildingOfficeIcon as Building2, CheckCircle, X, Check, Loader2, ArrowRight } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import type { CarWashRecord, EmployeeRole, PaymentMethod, MinimumPaymentSettings } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { calculateEmployeeShare } from "@/lib/employee-utils";

interface CloseDebtModalProps {
  onClose: () => void;
  onSubmit: (paymentMethod: PaymentMethod) => Promise<void>;
  clickPosition?: { x: number; y: number } | null;
  record?: CarWashRecord;
  roles?: Record<string, EmployeeRole>;
  minimumPaymentSettings: MinimumPaymentSettings;
}

const CloseDebtModal: React.FC<CloseDebtModalProps> = ({
  onClose,
  onSubmit,
  clickPosition,
  record,
  roles,
  minimumPaymentSettings,
}) => {
  const { state } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "organization">("cash");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");

  const handleSubmit = async () => {
    if (paymentType === "organization" && !selectedOrganizationId) {
      return;
    }

    setLoading(true);
    try {
      const paymentMethod: PaymentMethod =
        paymentType === "organization"
          ? { type: "organization", organizationId: selectedOrganizationId }
          : { type: paymentType };

      await onSubmit(paymentMethod);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Закрытие долга"
      clickPosition={clickPosition}
    >
      <div className="space-y-6">
        {record && (
          <>
            {/* Сумма долга вынесена в самый верх и сделана крупной */}
            <div className="flex flex-col items-center justify-center py-4 bg-muted/20 rounded-xl border border-border/40">
              <span className="text-sm font-medium text-muted-foreground mb-1">Сумма к оплате</span>
              <div className="text-4xl font-bold tracking-tight text-foreground">
                {record.price.toFixed(2)} <span className="text-2xl text-muted-foreground font-medium">BYN</span>
              </div>
            </div>

            {/* Компактный блок информации ("чек") */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Автомобиль:</span>
                <span className="font-semibold text-foreground text-right">{record.carInfo}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Дата и время:</span>
                <span className="font-medium text-foreground text-right">
                  {format(parseISO(record.date as string), "dd.MM.yyyy")} в {record.time}
                </span>
              </div>
              <div className="flex justify-between items-start text-sm border-b border-border/40 pb-3">
                <span className="text-muted-foreground whitespace-nowrap mr-4">Услуга:</span>
                <span className="font-medium text-foreground text-right">{record.service}</span>
              </div>

              {/* Зарплаты сотрудников */}
              <div className="pt-1">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Доли сотрудников по долгу:
                </div>
                <div className="space-y-1.5 bg-muted/10 rounded-lg p-2 border border-border/30">
                  {record.employeeIds.map((id) => {
                    const employee = state.employees.find((e) => e.id === id);
                    const role = roles?.[id] || "washer";
                    const earnings = calculateEmployeeShare(record, id, role, minimumPaymentSettings);
                    return (
                      <div
                        key={id}
                        className="flex justify-between items-center text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">
                            {employee?.name || "Неизвестный"}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md ${role === "admin" ? "bg-green-100/80 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}
                          >
                            {role === "admin" ? "Админ" : "Мойщик"}
                          </span>
                        </div>
                        <div className="font-semibold text-muted-foreground">
                          {earnings.toFixed(2)} BYN
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="pt-2">
          <label className="block text-sm font-semibold text-foreground mb-3">
            Способ оплаты
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                paymentType === "cash"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:border-accent-foreground/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="payment_type"
                value="cash"
                className="sr-only"
                checked={paymentType === "cash"}
                onChange={() => setPaymentType("cash")}
              />
              <span className="text-2xl mb-1.5">💵</span>
              <span className="text-sm font-semibold">Наличные</span>
            </label>
            <label
              className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                paymentType === "card"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:border-accent-foreground/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="payment_type"
                value="card"
                className="sr-only"
                checked={paymentType === "card"}
                onChange={() => setPaymentType("card")}
              />
              <CreditCard className="w-6 h-6 mb-1.5" />
              <span className="text-sm font-semibold">Карта</span>
            </label>
            <label
              className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                paymentType === "organization"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:border-accent-foreground/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="payment_type"
                value="organization"
                className="sr-only"
                checked={paymentType === "organization"}
                onChange={() => setPaymentType("organization")}
              />
              <span className="text-2xl mb-1.5">🏢</span>
              <span className="text-sm font-semibold">Организация</span>
            </label>
            <label
              className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                paymentType === "certificate"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:border-accent-foreground/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="payment_type"
                value="certificate"
                className="sr-only"
                checked={paymentType === "certificate"}
                onChange={() => setPaymentType("certificate")}
              />
              <span className="text-2xl mb-1.5">🎫</span>
              <span className="text-sm font-semibold">Сертификат</span>
            </label>
          </div>
        </div>

        {paymentType === "organization" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-muted/20 p-3 rounded-xl border border-border/50">
            <label className="block text-sm font-semibold text-foreground mb-3">
              Выберите организацию-плательщика
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {state.organizations.map((org) => (
                <label
                  key={org.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedOrganizationId === org.id
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-input bg-background hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="organization"
                    value={org.id}
                    className="sr-only"
                    checked={selectedOrganizationId === org.id}
                    onChange={() => setSelectedOrganizationId(org.id)}
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedOrganizationId === org.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background"
                    }`}
                  >
                    {selectedOrganizationId === org.id && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col">
                     <span className="text-sm font-semibold text-foreground">
                       {org.name}
                     </span>
                  </div>
                </label>
              ))}
              {state.organizations.length === 0 && (
                <div className="text-center p-4 text-sm text-muted-foreground bg-background rounded-lg border border-dashed border-border">
                  Нет доступных организаций
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t border-border/40">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-semibold transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              (paymentType === "organization" && !selectedOrganizationId)
            }
            className="flex-[2] px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Обработка...
              </>
            ) : (
              <>
                Оплатить {record ? `${record.price.toFixed(2)} BYN` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CloseDebtModal;
