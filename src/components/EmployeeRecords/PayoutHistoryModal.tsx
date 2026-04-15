import { useAppContext } from "@/lib/context/AppContext";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { X, Wallet, ShieldCheck, Info } from "lucide-react";
import type React from "react";
import LegacyModal from "@/components/ui/LegacyModal";
import type { Employee } from "@/lib/types";

interface PayoutHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  payouts: Array<{ date: string; amount: number; source: "cash" | "safe" }>;
  periodLabel: string;
}

const PayoutHistoryModal: React.FC<PayoutHistoryModalProps> = ({
  isOpen,
  onClose,
  employee,
  payouts,
  periodLabel,
}) => {
  const { state } = useAppContext();

  if (!isOpen) return null;

  const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <LegacyModal isOpen={isOpen} onClose={onClose} className="md:max-w-[400px]">
      <div className="flex flex-col max-h-[85dvh]">
          {/* Header */}
          <div
            className={`p-4 border-b flex items-center justify-between ${
              state.theme === "dark"
                ? "border-slate-700"
                : state.theme === "black"
                  ? "border-gray-800"
                  : "border-gray-200"
            }`}
          >
            <div>
              <h2
                className={`text-lg font-bold flex items-center gap-2 ${
                  state.theme === "dark"
                    ? "text-white"
                    : state.theme === "black"
                      ? "text-gray-100"
                      : "text-gray-900"
                }`}
              >
                <Wallet className="w-5 h-5 text-primary" />
                История выплат
              </h2>
              <p
                className={`text-sm mt-0.5 ${
                  state.theme === "dark"
                    ? "text-gray-400"
                    : state.theme === "black"
                      ? "text-gray-500"
                      : "text-gray-500"
                }`}
              >
                {employee.name} • {periodLabel}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                state.theme === "dark"
                  ? "hover:bg-slate-800 text-gray-400"
                  : state.theme === "black"
                    ? "hover:bg-gray-800 text-gray-500"
                    : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-4 flex-1">
            {payouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Wallet className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">Нет выплат за этот период</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout, index) => (
                  <div
                    key={`${payout.date}-${index}`}
                    className={`p-3 rounded-lg flex items-center justify-between border ${
                      state.theme === "dark"
                        ? "bg-slate-800/50 border-slate-700"
                        : state.theme === "black"
                          ? "bg-gray-900/50 border-gray-800"
                          : "bg-muted/30 border-border/50"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {format(parseISO(payout.date), "dd MMMM yyyy", { locale: ru })}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {payout.source === "cash" ? (
                          <>
                            <Wallet className="w-3 h-3" /> Выдано из кассы
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3" /> Выдано из сейфа
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground">
                        {payout.amount.toFixed(2)} BYN
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer summary */}
          <div
            className={`p-4 border-t flex justify-between items-center ${
              state.theme === "dark"
                ? "border-slate-700 bg-slate-800/50"
                : state.theme === "black"
                  ? "border-gray-800 bg-gray-900/50"
                  : "border-gray-200 bg-muted/20"
            }`}
          >
            <span className="font-medium text-muted-foreground">Всего выплачено:</span>
            <span className="font-bold text-lg text-foreground">{totalPayouts.toFixed(2)} BYN</span>
          </div>
      </div>
    </LegacyModal>
  );
};

export default PayoutHistoryModal;
