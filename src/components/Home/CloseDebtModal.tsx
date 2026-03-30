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
      <div className="space-y-4">
        {record && (
          <div className="mb-5 space-y-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex justify-between items-start mb-1">
                <div className="text-sm font-bold text-foreground">
                  {record.carInfo}
                </div>
                <div className="text-[10px] font-medium text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">
                  {format(parseISO(record.date as string), "dd.MM.yyyy")} {record.time}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {record.service} •{" "}
                <span className="font-bold text-foreground">
                  {record.price.toFixed(2)} BYN
                </span>
              </div>

              <div className="pt-2 border-t border-border/40">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Работавшие сотрудники:
                </div>
                <div className="space-y-1">
                  {record.employeeIds.map((id) => {
                    const employee = state.employees.find((e) => e.id === id);
                    const role = roles?.[id] || "washer";
                    const earnings = calculateEmployeeShare(record, id, role, minimumPaymentSettings);
                    return (
                      <div
                        key={id}
                        className="flex justify-between items-center text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground">
                            {employee?.name || "Неизвестный"}
                          </span>
                          <span
                            className={`text-[9px] px-1 rounded ${role === "admin" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                          >
                            {role === "admin" ? "Админ" : "Мойщик"}
                          </span>
                        </div>
                        <div className="font-medium text-primary">
                          +{earnings.toFixed(2)} BYN
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Способ оплаты долга
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label
              className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                paymentType === "cash"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:text-accent-foreground"
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
              <span className="text-2xl mb-2">💵</span>
              <span className="text-sm font-medium">Наличные</span>
            </label>
            <label
              className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                paymentType === "card"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:text-accent-foreground"
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
              <CreditCard className="w-6 h-6 mb-2" />
              <span className="text-sm font-medium">Карта</span>
            </label>
            <label
              className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                paymentType === "organization"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:text-accent-foreground"
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
              <span className="text-2xl mb-2">🏢</span>
              <span className="text-sm font-medium">Организация</span>
            </label>
            <label
              className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                paymentType === "certificate"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent hover:text-accent-foreground"
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
              <span className="text-2xl mb-2">🎫</span>
              <span className="text-sm font-medium">Сертификат</span>
            </label>
          </div>
        </div>

        {paymentType === "organization" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Выберите организацию
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {state.organizations.map((org) => (
                <label
                  key={org.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedOrganizationId === org.id
                      ? "border-primary bg-primary/10"
                      : "border-input bg-card hover:bg-accent"
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
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      selectedOrganizationId === org.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                  >
                    {selectedOrganizationId === org.id && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium">
                    {org.name}
                  </span>
                </label>
              ))}
              {state.organizations.length === 0 && (
                <div className="text-center p-4 text-sm text-muted-foreground bg-accent/50 rounded-lg">
                  Нет доступных организаций
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-border mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              (paymentType === "organization" && !selectedOrganizationId)
            }
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Оплатить
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CloseDebtModal;
