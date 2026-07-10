import type React from "react";
import { useMemo, useState, useEffect } from "react";
import { format, addDays, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import type { OkleykaOrder } from "@/lib/types/okleyka";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface OkleykaMonthCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseDate: string; // YYYY-MM-DD
  orders: OkleykaOrder[];
  onDateClick: (date: string) => void;
}

const OkleykaMonthCalendarModal: React.FC<OkleykaMonthCalendarModalProps> = ({
  isOpen,
  onClose,
  baseDate,
  orders,
  onDateClick,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => baseDate ? parseISO(baseDate) : new Date());

  useEffect(() => {
    if (isOpen && baseDate) {
      setCurrentMonth(parseISO(baseDate));
    }
  }, [isOpen, baseDate]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = [];
    let current = startDate;
    while (current <= endDate) {
      calendarDays.push(current);
      current = addDays(current, 1);
    }
    return calendarDays;
  }, [currentMonth]);

  const getOrdersForDate = (dateStr: string) => {
    return orders.filter(o => o.status !== "cancelled" && o.dateStart <= dateStr && o.dateEnd >= dateStr);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border/50 p-4 sm:p-6 rounded-3xl w-full max-w-4xl flex flex-col gap-4 sm:gap-6 shadow-xl max-h-[95vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground capitalize">
              {format(currentMonth, "LLLL yyyy", { locale: ru })}
            </h2>
            <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-border/50">
              <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-1 rounded-md hover:bg-background shadow-sm transition-colors text-muted-foreground hover:text-foreground">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-1 rounded-md hover:bg-background shadow-sm transition-colors text-muted-foreground hover:text-foreground">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent/50 text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground uppercase py-2">
                {day}
              </div>
            ))}
            
            {days.map((d, i) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const isCurrentMonth = isSameMonth(d, parseISO(baseDate));
              const isToday = isSameDay(d, new Date());
              const dayOrders = getOrdersForDate(dateStr);
              
              const box1 = dayOrders.find(o => o.boxNumber === 1);
              const box2 = dayOrders.find(o => o.boxNumber === 2);

              return (
                <div
                  key={i}
                  onClick={() => onDateClick(dateStr)}
                  className={`min-h-[80px] sm:min-h-[100px] border rounded-xl p-1.5 sm:p-2 cursor-pointer transition-colors flex flex-col gap-1 ${
                    !isCurrentMonth ? "opacity-50 bg-muted/5 border-transparent" : "bg-background border-border/50 hover:bg-accent/30 hover:border-primary/50"
                  } ${isToday ? "ring-2 ring-primary border-transparent" : ""}`}
                >
                  <div className={`text-xs sm:text-sm font-bold text-right mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(d, "d")}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1">
                    <div className={`flex-1 rounded-lg px-1.5 py-1 text-[9px] sm:text-[10px] font-bold flex flex-col justify-center leading-tight truncate ${
                      box1 
                        ? box1.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                          : "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted/10 text-muted-foreground/30 border border-border/30"
                    }`}>
                      {box1 ? box1.carInfo : "Б1 свободен"}
                    </div>
                    
                    <div className={`flex-1 rounded-lg px-1.5 py-1 text-[9px] sm:text-[10px] font-bold flex flex-col justify-center leading-tight truncate ${
                      box2 
                        ? box2.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                          : "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted/10 text-muted-foreground/30 border border-border/30"
                    }`}>
                      {box2 ? box2.carInfo : "Б2 свободен"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OkleykaMonthCalendarModal;
