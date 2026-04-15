import { useAppContext } from "@/lib/context/AppContext";
import type { CarWashRecord, Employee } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, X } from "lucide-react";
import type React from "react";
import LegacyModal from "@/components/ui/LegacyModal";
import { getPaymentMethodColor, getPaymentMethodLabel } from "./utils";

interface MobileDayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  employee: Employee;
  selectedDate: string;
  selectedDateRecords: CarWashRecord[];
  calculateEmployeeEarnings: (
    record: CarWashRecord,
    employeeId: string,
  ) => number;
}

const MobileDayDetailsModal: React.FC<MobileDayDetailsModalProps> = ({
  isOpen,
  onClose,
  onBack,
  employee,
  selectedDate,
  selectedDateRecords,
  calculateEmployeeEarnings,
}) => {
  const { state } = useAppContext();

  if (!isOpen) return null;

  return (
    <LegacyModal isOpen={isOpen} onClose={onClose} fullScreen>
      <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {format(parseISO(selectedDate), "dd MMMM yyyy", {
                      locale: ru,
                    })}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedDateRecords.length > 0 ? `${selectedDateRecords.length} записей` : "Нет лично выполненных услуг"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {selectedDateRecords.length > 0 ? (
              <div className="space-y-2">
                {selectedDateRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-lg bg-muted/20 border border-border"
                  >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span className="text-muted-foreground">
                          {record.time || "—"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs border ${getPaymentMethodColor(record.paymentMethod.type, state.theme)}`}
                        >
                          {getPaymentMethodLabel(
                            record.paymentMethod.type,
                            state.organizations,
                            record.paymentMethod.organizationId,
                          )}
                        </span>
                      </div>
                      <div className="font-medium text-sm truncate text-foreground">
                        {record.carInfo}
                      </div>
                      <div className="text-xs truncate text-muted-foreground">
                        {record.service}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-sm font-bold text-green-600">
                        +
                        {calculateEmployeeEarnings(record, employee.id).toFixed(
                          2,
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        из {record.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <div className="w-8 h-8 opacity-30 border-2 rounded-full border-current" />
                </div>
                <p className="font-medium text-foreground mb-1">Нет лично выполненных услуг</p>
                <p className="text-sm text-center max-w-[250px]">В этот день вы не мыли машины, но заработали процент от общей кассы смены.</p>
              </div>
            )}
          </div>
      </div>
    </LegacyModal>
  );
};

export default MobileDayDetailsModal;
