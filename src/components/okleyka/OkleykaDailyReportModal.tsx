import type React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Gear,
  ListBullets,
} from "@phosphor-icons/react";
import type { OkleykaOrder, OkleykaEmployee } from "@/lib/types/okleyka";

interface OkleykaDailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OkleykaOrder[];
  employees: OkleykaEmployee[];
  selectedDate: string;
  paymentFilter: "all" | "cash" | "card" | "organization" | "debt";
  onPaymentFilterChange: (
    filter: "all" | "cash" | "card" | "organization" | "debt"
  ) => void;
  onEditOrder: (order: OkleykaOrder) => void;
  onCompleteOrder: (order: OkleykaOrder) => void;
  onCancelOrder: (order: OkleykaOrder) => void;
}

const formatDateRu = (d: string) =>
  new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const OkleykaDailyReportModal: React.FC<OkleykaDailyReportModalProps> = ({
  isOpen,
  onClose,
  orders,
  employees,
  selectedDate,
  paymentFilter,
  onPaymentFilterChange,
  onEditOrder,
  onCompleteOrder,
  onCancelOrder,
}) => {
  const filteredOrders = orders.filter((o) => {
    if (paymentFilter === "all") return true;
    return o.paymentMethod?.type === paymentFilter;
  });

  const totalSum = filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="daily-report-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet/Modal */}
          <motion.div
            key="daily-report-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#0f0f14] rounded-t-3xl shadow-2xl md:inset-0 md:m-auto md:max-w-4xl md:max-h-[85vh] md:rounded-2xl overflow-hidden text-white"
            style={{ maxHeight: "88vh" }}
          >
            {/* Mobile Handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                  <ListBullets size={20} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Ежедневная ведомость</h2>
                  <p className="text-xs text-white/50">{formatDateRu(selectedDate)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Filters and Stats */}
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1">
                {(["all", "cash", "card", "organization", "debt"] as const).map((filter) => {
                  const label = {
                    all: "Все",
                    cash: "Наличные",
                    card: "Карта",
                    organization: "Безнал",
                    debt: "Долг",
                  }[filter];

                  return (
                    <button
                      key={filter}
                      onClick={() => onPaymentFilterChange(filter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        paymentFilter === filter
                          ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="text-sm font-medium text-white/70">
                Сумма по ведомости: <span className="font-extrabold text-emerald-400">{totalSum.toLocaleString("ru-RU")} BYN</span>
              </div>
            </div>

            {/* Body (Table) */}
            <div className="flex-1 overflow-y-auto p-5">
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <ListBullets size={40} className="opacity-20 mb-3" />
                  <p className="text-sm italic">Записей по выбранному фильтру нет</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 pr-2">Бокс</th>
                        <th className="py-2.5 pr-2">Автомобиль</th>
                        <th className="py-2.5 pr-2">Выполненные услуги</th>
                        <th className="py-2.5 pr-2">Исполнители</th>
                        <th className="py-2.5 pr-2">Способ оплаты</th>
                        <th className="py-2.5 pr-2 text-right">Сумма</th>
                        <th className="py-2.5 pl-2 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const orderItemNames = (order.items || []).map((i) => i.name).join(", ") || "—";
                        const orderWorkerNames = (order.workers || [])
                          .map((w) => employees.find((e) => e.id === w.employeeId)?.name)
                          .filter(Boolean)
                          .join(", ") || "—";

                        const pmType = order.paymentMethod?.type;
                        const pmLabel = pmType
                          ? {
                              cash: "Наличные",
                              card: "Карта",
                              organization: order.paymentMethod?.organizationName || "Безнал",
                              debt: "Долг",
                            }[pmType]
                          : "—";

                        return (
                          <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] last:border-b-0 transition-colors">
                            <td className="py-3.5 pr-2 font-medium">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                order.boxNumber === 1
                                  ? "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                                  : "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                              }`}>
                                Бокс {order.boxNumber}
                              </span>
                            </td>
                            <td className="py-3.5 pr-2 font-bold text-white">{order.carInfo}</td>
                            <td className="py-3.5 pr-2 text-white/60 truncate max-w-[150px]" title={orderItemNames}>
                              {orderItemNames}
                            </td>
                            <td className="py-3.5 pr-2 text-white/60 truncate max-w-[150px]" title={orderWorkerNames}>
                              {orderWorkerNames}
                            </td>
                            <td className="py-3.5 pr-2">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                pmType === "cash"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                  : pmType === "card"
                                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                  : pmType === "debt"
                                  ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                  : "bg-white/5 text-white/50"
                              }`}>
                                {pmLabel}
                              </span>
                            </td>
                            <td className="py-3.5 pr-2 text-right font-extrabold text-white">
                              {order.totalPrice.toLocaleString("ru-RU")} BYN
                            </td>
                            <td className="py-3.5 pl-2 text-right">
                              <div className="flex justify-end gap-1.5">
                                {order.status === "active" && (
                                  <button
                                    onClick={() => onCompleteOrder(order)}
                                    className="p-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl transition-colors"
                                    title="Завершить"
                                  >
                                    <Check size={12} weight="bold" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onEditOrder(order)}
                                  className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 rounded-xl transition-colors"
                                  title="Изменить"
                                >
                                  <Gear size={12} weight="bold" />
                                </button>
                                <button
                                  onClick={() => onCancelOrder(order)}
                                  className="p-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl transition-colors"
                                  title="Отменить заказ"
                                >
                                  <X size={12} weight="bold" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OkleykaDailyReportModal;
