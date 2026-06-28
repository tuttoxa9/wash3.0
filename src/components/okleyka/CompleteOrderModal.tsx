import type React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  CheckCircle,
  Car,
  CalendarBlank,
  CurrencyRub,
  Bell,
  Clock,
} from "@phosphor-icons/react";
import { okleykaOrderService } from "@/lib/services/okleykaService";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import type { OkleykaOrder } from "@/lib/types/okleyka";

// ── Types ──────────────────────────────────────────────────────────────────
interface CompleteOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OkleykaOrder | null;
  onCompleted: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDateRu = (d: string) =>
  new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── Component ──────────────────────────────────────────────────────────────
const CompleteOrderModal: React.FC<CompleteOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onCompleted,
}) => {
  const { dispatch } = useOkleykaContext();

  const [scheduleInspection, setScheduleInspection] = useState(false);
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionTime, setInspectionTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setScheduleInspection(false);
      setInspectionDate("");
      setInspectionTime("10:00");
    }
  }, [isOpen, order]);

  if (!order) return null;

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      // Build inspection ISO datetime if scheduled
      let inspectionISO: string | null = null;
      if (scheduleInspection && inspectionDate) {
        const dt = new Date(`${inspectionDate}T${inspectionTime || "10:00"}:00`);
        inspectionISO = dt.toISOString();
      }

      const ok = await okleykaOrderService.complete(order.id, inspectionISO);
      if (!ok) {
        toast.error("Ошибка при завершении заказа");
        return;
      }

      const updatedOrder: OkleykaOrder = {
        ...order,
        status: "completed",
        completedAt: new Date().toISOString(),
        inspectionDate: inspectionISO,
      };

      dispatch({ type: "UPDATE_ORDER", payload: updatedOrder });
      toast.success("Заказ завершён!");
      onCompleted();
      onClose();
    } catch (err) {
      console.error("[CompleteOrderModal] error:", err);
      toast.error("Неожиданная ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const paymentLabel: Record<string, string> = {
    cash: "Наличные",
    card: "Карта",
    organization: "Организация",
    debt: "Долг",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="complete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="complete-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#0f0f14] rounded-t-3xl shadow-2xl md:inset-0 md:m-auto md:max-w-lg md:max-h-[85vh] md:rounded-2xl overflow-hidden"
            style={{ maxHeight: "88vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <CheckCircle size={20} weight="duotone" className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Завершить заказ</h2>
                  <p className="text-xs text-white/50">Подтвердите завершение работ</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Order summary */}
              <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                {/* Car */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                  <Car size={18} weight="duotone" className="text-violet-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">{order.carInfo}</p>
                    {order.clientName && (
                      <p className="text-xs text-white/50">{order.clientName}</p>
                    )}
                  </div>
                  <span className="ml-auto text-xs font-semibold text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-lg border border-violet-500/20">
                    Бокс {order.boxNumber}
                  </span>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                  <CalendarBlank size={18} weight="duotone" className="text-blue-400 shrink-0" />
                  <span className="text-sm text-white/70">
                    {formatDateRu(order.dateStart)} — {formatDateRu(order.dateEnd)}
                  </span>
                </div>

                {/* Services */}
                {order.items && order.items.length > 0 && (
                  <div className="px-4 py-3 border-b border-white/8 space-y-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="text-sm text-white/70">{item.name}</span>
                        <span className="text-sm font-semibold text-white">
                          {item.price.toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CurrencyRub size={16} className="text-emerald-400" />
                    <span className="text-sm text-white/60">Итого</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-300">
                      {order.totalPrice.toLocaleString("ru-RU")} ₽
                    </p>
                    {order.paymentMethod && (
                      <p className="text-xs text-white/40">
                        {paymentLabel[order.paymentMethod.type] ?? order.paymentMethod.type}
                        {order.paymentMethod.organizationName
                          ? ` · ${order.paymentMethod.organizationName}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Inspection section */}
              <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={18} weight="duotone" className="text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">
                        Контрольный осмотр
                      </h3>
                    </div>
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => setScheduleInspection((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-all ${
                        scheduleInspection ? "bg-blue-500" : "bg-white/15"
                      }`}
                    >
                      <motion.span
                        layout
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                        animate={{ x: scheduleInspection ? 22 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Запланировать контрольный осмотр
                  </p>
                </div>

                <AnimatePresence>
                  {scheduleInspection && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-white/50 mb-1">
                              <CalendarBlank size={12} className="inline mr-1" />
                              Дата осмотра
                            </label>
                            <input
                              type="date"
                              value={inspectionDate}
                              onChange={(e) => setInspectionDate(e.target.value)}
                              min={order.dateEnd}
                              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white/50 mb-1">
                              <Clock size={12} className="inline mr-1" />
                              Время
                            </label>
                            <input
                              type="time"
                              value={inspectionTime}
                              onChange={(e) => setInspectionTime(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/8 border border-blue-500/15 text-xs text-blue-300/80">
                          <Bell size={13} weight="fill" className="shrink-0" />
                          За 24 часа будет отправлено напоминание в Telegram
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <div className="h-2" />
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/10 bg-[#0f0f14] flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-all disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting || (scheduleInspection && !inspectionDate)}
                className="flex-2 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <>
                    <CheckCircle size={18} weight="fill" />
                    Завершить заказ
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CompleteOrderModal;
