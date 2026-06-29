import React, { useMemo } from "react";
import { format, addDays, parseISO, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import type { OkleykaOrder } from "@/lib/types/okleyka";
import { Maximize2, Plus } from "lucide-react";

interface OkleykaTimelineWidgetProps {
  startDate: string; // ISO date string e.g. YYYY-MM-DD
  orders: OkleykaOrder[];
  onAddAppointment: (boxNum: 1 | 2, date: string) => void;
  onOrderClick: (order: OkleykaOrder) => void;
  onExpand: () => void;
}

const OkleykaTimelineWidget: React.FC<OkleykaTimelineWidgetProps> = ({
  startDate,
  orders,
  onAddAppointment,
  onOrderClick,
  onExpand,
}) => {
  const days = useMemo(() => {
    const start = parseISO(startDate);
    return Array.from({ length: 14 }).map((_, i) => addDays(start, i));
  }, [startDate]);

  const getOrdersForBoxAndDate = (boxNum: 1 | 2, dateStr: string) => {
    return orders.filter((o) => {
      if (o.boxNumber !== boxNum || o.status === "cancelled") return false;
      return o.dateStart <= dateStr && o.dateEnd >= dateStr;
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-border/50 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Загруженность боксов</h2>
        </div>
        <button
          onClick={onExpand}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-background hover:bg-accent transition-colors text-sm font-medium shadow-sm"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Весь месяц</span>
        </button>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row (dates) */}
          <div className="flex mb-2">
            <div className="w-20 shrink-0"></div>
            <div className="flex-1 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
              {days.map((d, i) => (
                <div key={i} className="text-center pb-2">
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase mb-0.5">
                    {format(d, "EEE", { locale: ru })}
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-bold ${
                      isSameDay(d, new Date()) ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {format(d, "d")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Box rows */}
          {([1, 2] as const).map((boxNum) => (
            <div key={boxNum} className="flex mb-2">
              <div className="w-20 shrink-0 flex items-center justify-center font-bold text-sm text-muted-foreground bg-muted/10 rounded-l-lg border border-r-0 border-border/50">
                Бокс {boxNum}
              </div>
              <div className="flex-1 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
                {(() => {
                  const cells = [];
                  for (let i = 0; i < 14; i++) {
                    const d = days[i];
                    const dateStr = format(d, "yyyy-MM-dd");
                    const boxOrders = getOrdersForBoxAndDate(boxNum, dateStr);
                    const isOccupied = boxOrders.length > 0;
                    const order = activeOrder(boxOrders);

                    let colSpan = 1;
                    if (isOccupied && order) {
                      while (i + colSpan < 14) {
                        const nextD = days[i + colSpan];
                        const nextDateStr = format(nextD, "yyyy-MM-dd");
                        if (order.dateStart <= nextDateStr && order.dateEnd >= nextDateStr) {
                          colSpan++;
                        } else {
                          break;
                        }
                      }
                    }

                    cells.push(
                      <div
                        key={i}
                        style={{ gridColumn: `span ${colSpan}` }}
                        onClick={() => {
                          if (isOccupied && order) {
                            onOrderClick(order);
                          } else {
                            onAddAppointment(boxNum, dateStr);
                          }
                        }}
                        className={`h-16 sm:h-20 border border-border/50 transition-all cursor-pointer relative group flex flex-col p-1.5 ${
                          i + colSpan === 14 ? "rounded-r-lg" : ""
                        } ${
                          isOccupied
                            ? order?.status === "completed"
                              ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50"
                              : "bg-primary/10 border-primary/30 hover:border-primary/50"
                            : "bg-background hover:bg-accent/50"
                        }`}
                        title={
                          isOccupied && order
                            ? `${order.carInfo}\n${order.dateStart} - ${order.dateEnd}`
                            : "Свободно (клик, чтобы записать)"
                        }
                      >
                        {isOccupied && order ? (
                          <>
                            <div
                              className={`text-[10px] font-bold truncate ${
                                order.status === "completed" ? "text-emerald-600" : "text-primary"
                              }`}
                            >
                              {order.carInfo}
                            </div>
                            {order.dateStart >= dateStr && (
                              <div className="text-[9px] text-muted-foreground leading-none mt-1">
                                Старт
                              </div>
                            )}
                            {order.dateEnd <= format(days[i + colSpan - 1], "yyyy-MM-dd") && (
                              <div className="text-[9px] text-muted-foreground leading-none mt-auto">
                                Финиш
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity">
                            <Plus className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    );

                    i += colSpan - 1;
                  }
                  return cells;
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function activeOrder(orders: OkleykaOrder[]) {
  if (orders.length === 0) return null;
  // Prefer active over completed
  const active = orders.find(o => o.status === "active");
  if (active) return active;
  return orders[0];
}

export default OkleykaTimelineWidget;
