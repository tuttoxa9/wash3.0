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
      <div className="space-y-5 px-1 py-2">
        {record && (
          <div className="bg-muted/30 p-4 rounded-xl border border-border/40 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Сумма долга
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {record.price.toFixed(2)} <span className="text-lg text-muted-foreground">BYN</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-medium text-muted-foreground bg-background px-2 py-0.5 rounded border border-border/40 inline-block mb-1">
                  {format(parseISO(record.date as string), "dd.MM.yyyy")} {record.time}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {record.carInfo}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Детали услуги и доли сотрудников
              </div>
              <div className="text-sm text-foreground mb-3">
                <span className="text-muted-foreground mr-1">Услуга:</span> {record.service}
              </div>

              <div className="space-y-1.5">
                {record.employeeIds.map((id) => {
                  const employee = state.employees.find((e) => e.id === id);
                  const role = roles?.[id] || "washer";
                  const earnings = calculateEmployeeShare(record, id, role, minimumPaymentSettings);
                  return (
                    <div
                      key={id}
                      className="flex justify-between items-center text-sm bg-background/50 p-2 rounded-lg border border-border/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">
                          {employee?.name || "Неизвестный"}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${role === "admin" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}
                        >
                          {role === "admin" ? "Админ" : "Мойщик"}
                        </span>
                      </div>
                      <div className="font-semibold text-muted-foreground text-xs">
                        {earnings.toFixed(2)} BYN
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Способ оплаты долга
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentType("cash")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                paymentType === "cash"
                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "border-input bg-background hover:bg-accent text-foreground"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentType === "cash" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                💵
              </div>
              <span className="text-sm font-medium">Наличные</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("card")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                paymentType === "card"
                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "border-input bg-background hover:bg-accent text-foreground"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentType === "card" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Карта</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("organization")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                paymentType === "organization"
                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "border-input bg-background hover:bg-accent text-foreground"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentType === "organization" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                🏢
              </div>
              <span className="text-sm font-medium">Организация</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("certificate")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                paymentType === "certificate"
                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "border-input bg-background hover:bg-accent text-foreground"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentType === "certificate" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                🎫
              </div>
              <span className="text-sm font-medium">Сертификат</span>
            </button>
          </div>
        </div>

        {paymentType === "organization" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Организация-плательщик
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {state.organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrganizationId(org.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    selectedOrganizationId === org.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-accent text-foreground"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      selectedOrganizationId === org.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                  >
                    {selectedOrganizationId === org.id && (
                      <Check className="w-2.5 h-2.5" />
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium">
                    {org.name}
                  </span>
                </button>
              ))}
              {state.organizations.length === 0 && (
                <div className="text-center p-4 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
                  Нет доступных организаций
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-border mt-2">
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
            className="flex-[2] px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
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
