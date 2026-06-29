import type React from "react";
import { X } from "lucide-react";
import BottomSheet from "@/components/ui/BottomSheet";
import type { OkleykaOrder, OkleykaEmployee } from "@/lib/types/okleyka";
import { format, parseISO } from "date-fns";
import { Edit, Trash2, Check } from "lucide-react";

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

  const getCashSum = () => orders.reduce((sum, o) => sum + (o.paymentMethod?.type === "cash" ? o.totalPrice : 0), 0);
  const getCardSum = () => orders.reduce((sum, o) => sum + (o.paymentMethod?.type === "card" ? o.totalPrice : 0), 0);
  const getOrgSum = () => orders.reduce((sum, o) => sum + (o.paymentMethod?.type === "organization" ? o.totalPrice : 0), 0);
  const getDebtSum = () => orders.reduce((sum, o) => sum + (o.paymentMethod?.type === "debt" ? o.totalPrice : 0), 0);
  const getTotalSum = () => orders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} fullHeight disableScroll className="md:max-w-6xl w-[98vw]">
      <div className="p-3 sm:p-4 md:p-6 flex flex-col h-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6 shrink-0">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-card-foreground">
            <span className="hidden sm:inline">Ежедневная ведомость - </span>
            <span className="sm:hidden">Ведомость - </span>
            {format(parseISO(selectedDate), "dd.MM.yyyy")}
          </h3>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-muted rounded-md sm:rounded-lg transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Фильтры по методу оплаты */}
        <div className="segmented-control mb-4 shrink-0">
          <button
            onClick={() => onPaymentFilterChange("all")}
            className={paymentFilter === "all" ? "active" : ""}
          >
            Все
          </button>
          <button
            onClick={() => onPaymentFilterChange("cash")}
            className={paymentFilter === "cash" ? "active" : ""}
          >
            Наличные
          </button>
          <button
            onClick={() => onPaymentFilterChange("card")}
            className={paymentFilter === "card" ? "active" : ""}
          >
            Карта
          </button>
          <button
            onClick={() => onPaymentFilterChange("organization")}
            className={paymentFilter === "organization" ? "active" : ""}
          >
            Безнал
          </button>
          <button
            onClick={() => onPaymentFilterChange("debt")}
            className={paymentFilter === "debt" ? "active" : ""}
          >
            Долги
          </button>
        </div>

        {/* Десктопная версия таблицы */}
        <div className="hidden sm:block overflow-x-auto overflow-y-auto flex-1 min-h-0 custom-scrollbar border border-border/40 rounded-xl mb-4 shadow-sm relative">
          <table className="w-full bg-card min-w-[800px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border bg-muted/30">
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  №
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  Бокс
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  Авто
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  Услуга
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-right text-xs sm:text-sm font-semibold text-card-foreground">
                  Стоимость
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  Оплата
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  Сотрудники
                </th>
                <th className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-left text-xs sm:text-sm font-semibold text-card-foreground">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => {
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
                    <tr
                      key={order.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-card-foreground">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm text-card-foreground font-bold">
                        Бокс {order.boxNumber}
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm text-card-foreground">
                        {order.carInfo}
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm text-card-foreground">
                        {orderItemNames}
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-card-foreground text-right">
                        {order.totalPrice.toFixed(2)} BYN
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm text-card-foreground">
                        {pmLabel}
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm text-muted-foreground">
                        {orderWorkerNames}
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm">
                        <div className="flex gap-2">
                          {order.status === "active" && (
                            <button
                              onClick={() => onCompleteOrder(order)}
                              className="p-1 sm:p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"
                              title="Завершить заказ"
                            >
                              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditOrder(order)}
                            className="p-1 sm:p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                            title="Изменить заказ"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => onCancelOrder(order)}
                            className="p-1 sm:p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Отменить заказ"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 sm:py-12 text-center text-muted-foreground"
                  >
                    Записей за этот день по выбранному фильтру нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Мобильная версия списка */}
        <div className="sm:hidden flex-1 overflow-y-auto mb-4 space-y-3 custom-scrollbar">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, index) => {
              const orderItemNames = (order.items || []).map((i) => i.name).join(", ") || "—";
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
                <div key={order.id} className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm sm:text-base text-card-foreground">
                      {order.carInfo} <span className="text-muted-foreground text-xs font-normal">({orderItemNames})</span>
                    </span>
                    <span className="font-bold text-sm sm:text-base text-card-foreground shrink-0">
                      {order.totalPrice.toFixed(2)} BYN
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                       Оплата: {pmLabel}
                     </span>
                     <div className="flex gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50 justify-end">
                       {order.status === "active" && (
                         <button
                           onClick={() => onCompleteOrder(order)}
                           className="p-1.5 sm:p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-md transition-colors"
                         >
                           <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                         </button>
                       )}
                       <button
                         onClick={() => onEditOrder(order)}
                         className="p-1.5 sm:p-2 bg-muted hover:bg-muted/80 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                       >
                         <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </button>
                       <button
                         onClick={() => onCancelOrder(order)}
                         className="p-1.5 sm:p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors"
                       >
                         <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </button>
                     </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Записей нет
            </div>
          )}
        </div>

        {/* Итоги (Grid внизу) */}
        {orders.length > 0 && (
          <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-4 shrink-0 shadow-sm mt-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              <div
                className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                  paymentFilter === "cash"
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() =>
                  onPaymentFilterChange(
                    paymentFilter === "cash" ? "all" : "cash",
                  )
                }
              >
                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">
                  Наличные
                </div>
                <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight">
                  {getCashSum().toFixed(2)} BYN
                </div>
              </div>
              <div
                className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                  paymentFilter === "card"
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() =>
                  onPaymentFilterChange(
                    paymentFilter === "card" ? "all" : "card",
                  )
                }
              >
                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">
                  Карта
                </div>
                <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight">
                  {getCardSum().toFixed(2)} BYN
                </div>
              </div>
              <div
                className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                  paymentFilter === "organization"
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() =>
                  onPaymentFilterChange(
                    paymentFilter === "organization" ? "all" : "organization",
                  )
                }
              >
                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">
                  Безнал
                </div>
                <div className="text-xs sm:text-sm md:text-base font-bold text-card-foreground leading-tight">
                  {getOrgSum().toFixed(2)} BYN
                </div>
              </div>
              <div
                className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors ${
                  paymentFilter === "debt"
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() =>
                  onPaymentFilterChange(
                    paymentFilter === "debt" ? "all" : "debt",
                  )
                }
              >
                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">
                  Долги
                </div>
                <div className="text-xs sm:text-sm md:text-base font-bold text-red-500 leading-tight">
                  {getDebtSum().toFixed(2)} BYN
                </div>
              </div>
              <div
                className={`text-center p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors col-span-2 md:col-span-1 ${
                  paymentFilter === "all"
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() => onPaymentFilterChange("all")}
              >
                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">
                  Всего
                </div>
                <div className="text-xs sm:text-sm md:text-base font-bold text-primary leading-tight">
                  {getTotalSum().toFixed(2)} BYN
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

export default OkleykaDailyReportModal;
