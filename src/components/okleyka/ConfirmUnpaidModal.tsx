import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WarningCircle, X, ArrowRight } from "@phosphor-icons/react";

// ── Types ──────────────────────────────────────────────────────────────────
interface ConfirmUnpaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  unpaidItems: { employeeName: string; serviceName: string }[];
  isLoading?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────
const ConfirmUnpaidModal: React.FC<ConfirmUnpaidModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  unpaidItems,
  isLoading = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="unpaid-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            key="unpaid-dialog"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed z-[61] inset-0 m-auto w-full max-w-sm h-fit rounded-2xl bg-[#13121c] border border-amber-500/20 shadow-2xl shadow-amber-900/20 overflow-hidden"
          >
            {/* Amber accent strip */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-yellow-500" />

            {/* Content */}
            <div className="px-6 pt-5 pb-6">
              {/* Icon + Close */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <WarningCircle size={28} weight="duotone" className="text-amber-400" />
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-white/60" />
                </button>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white mb-1">Не указана оплата</h3>
              <p className="text-sm text-white/60 mb-4">
                Следующим сотрудникам не указан размер оплаты:
              </p>

              {/* Unpaid list */}
              <div className="mb-4 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {unpaidItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm text-amber-200">
                      <span className="font-semibold">{item.employeeName}</span>
                      <span className="text-amber-300/60"> — </span>
                      <span className="text-amber-300/80">{item.serviceName}</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 mb-5">
                <WarningCircle
                  size={15}
                  weight="fill"
                  className="text-white/30 mt-0.5 shrink-0"
                />
                <p className="text-xs text-white/50 leading-relaxed">
                  Неоплаченные работы будут перенесены в раздел{" "}
                  <span className="text-white/70 font-medium">
                    «Неоплаченные услуги сотрудников»
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-all disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-sm shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <>
                      Создать заказ
                      <ArrowRight size={16} weight="bold" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmUnpaidModal;
