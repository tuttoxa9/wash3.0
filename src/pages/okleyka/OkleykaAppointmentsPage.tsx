import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import { okleykaAppointmentService } from "@/lib/services/okleykaService";
import type { OkleykaAppointment } from "@/lib/types/okleyka";
import OkleykaWeeklyView from "@/components/okleyka/OkleykaWeeklyView";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parseISO, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Wrench,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

type AppointmentStatus = "scheduled" | "completed" | "cancelled";

const statusConfig = {
  scheduled: { label: "Запланировано", cls: "bg-blue-500/10 text-blue-500 border border-blue-500/20" },
  completed: { label: "Выполнено", cls: "bg-green-500/10 text-green-500 border border-green-500/20" },
  cancelled: { label: "Отменено", cls: "bg-red-500/10 text-red-500 border border-red-500/20" },
};

const OkleykaAppointmentsPage: React.FC = () => {
  const { dispatch } = useOkleykaContext();
  
  // Date state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [displayMode, setDisplayMode] = useState<"week" | "month">("week");

  // Appointments state
  const [appointments, setAppointments] = useState<OkleykaAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Add Form state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [carInfo, setCarInfo] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [service, setService] = useState("");
  const [boxNumber, setBoxNumber] = useState<1 | 2 | undefined>(undefined);
  const [time, setTime] = useState("10:00");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch appointments for month
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const data = await okleykaAppointmentService.getByDateRange(start, end);
      setAppointments(data);
      dispatch({ type: "SET_APPOINTMENTS", payload: data });
    } catch (err) {
      console.error("[OkleykaAppointmentsPage] fetch error:", err);
      toast.error("Не удалось загрузить записи");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, dispatch]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Actions
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carInfo.trim()) {
      toast.error("Укажите информацию об авто");
      return;
    }
    if (!time) {
      toast.error("Укажите время записи");
      return;
    }

    setSubmitting(true);
    try {
      const newAppt = await okleykaAppointmentService.add({
        date: formDate,
        time,
        carInfo: carInfo.trim(),
        clientName: clientName.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        service: service.trim() || undefined,
        boxNumber: boxNumber || undefined,
        status: "scheduled",
      });

      if (newAppt) {
        setAppointments((prev) => [...prev, newAppt].sort((a, b) => a.time.localeCompare(b.time)));
        dispatch({ type: "ADD_APPOINTMENT", payload: newAppt });
        toast.success("Запись успешно добавлена");
        
        // Reset form (except date)
        setCarInfo("");
        setClientName("");
        setClientPhone("");
        setService("");
        setBoxNumber(undefined);
        setTime("10:00");
        setShowQuickAdd(false);
      } else {
        toast.error("Не удалось добавить запись");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при сохранении записи");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (appt: OkleykaAppointment, newStatus: AppointmentStatus) => {
    const updated: OkleykaAppointment = { ...appt, status: newStatus };
    const ok = await okleykaAppointmentService.update(updated);
    if (ok) {
      setAppointments((prev) => prev.map((a) => (a.id === appt.id ? updated : a)));
      dispatch({ type: "UPDATE_APPOINTMENT", payload: updated });
      toast.success(`Статус записи изменен на: ${statusConfig[newStatus].label}`);
    } else {
      toast.error("Не удалось обновить статус записи");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) return;
    const ok = await okleykaAppointmentService.delete(id);
    if (ok) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      dispatch({ type: "REMOVE_APPOINTMENT", payload: id });
      toast.success("Запись удалена");
    } else {
      toast.error("Не удалось удалить запись");
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth((m) => subMonths(m, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((m) => addMonths(m, 1));
  };

  // Filter appointments
  const filtered = appointments.filter((a) => {
    if (viewMode === "day" && a.date !== selectedDate) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCar = a.carInfo.toLowerCase().includes(q);
      const matchClient = a.clientName?.toLowerCase().includes(q) ?? false;
      const matchPhone = a.clientPhone?.toLowerCase().includes(q) ?? false;
      const matchService = a.service?.toLowerCase().includes(q) ?? false;
      return matchCar || matchClient || matchPhone || matchService;
    }
    return true;
  });

  // Group by date for month view
  const groupedByDate = filtered.reduce<Record<string, OkleykaAppointment[]>>((acc, appt) => {
    if (!acc[appt.date]) acc[appt.date] = [];
    acc[appt.date].push(appt);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => a.localeCompare(b));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 w-full mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Календарь записей</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управление будущими записями на оклейку</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Display mode toggle (week / month+day) */}
          <div className="flex bg-muted p-1 rounded-xl">
            <button
              onClick={() => setDisplayMode("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === "week" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setDisplayMode("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === "month" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Месяц
            </button>
          </div>

          {/* Month/Day sub-toggle (only in month display mode) */}
          {displayMode === "month" && (
            <div className="flex bg-muted p-1 rounded-xl">
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "month" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                Все даты
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "day" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                День
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setFormDate(selectedDate);
              setShowQuickAdd((v) => !v);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Быстрая запись
          </button>
        </div>
      </div>

      {/* Date Navigation & Calendar selectors */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card border border-border/50 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-border/50 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold capitalize min-w-[120px] text-center">
            {format(currentMonth, "LLLL yyyy", { locale: ru })}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-border/50 hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {viewMode === "day" && (
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto max-w-full pb-2 md:pb-0">
            {/* Simple slider of dates inside current month */}
            {Array.from({ length: 7 }).map((_, i) => {
              const dateObj = new Date(selectedDate);
              dateObj.setDate(dateObj.getDate() - 3 + i);
              const dateStr = format(dateObj, "yyyy-MM-dd");
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setFormDate(dateStr);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[54px] border transition-all ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 border-border/30 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">{format(dateObj, "eee", { locale: ru })}</span>
                  <span className="text-sm font-bold mt-0.5">{format(dateObj, "d")}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filters Panel */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
          >
            <option value="all">Все статусы</option>
            <option value="scheduled">Запланировано</option>
            <option value="completed">Выполнено</option>
            <option value="cancelled">Отменено</option>
          </select>
        </div>
      </div>

      {/* Quick Add Form Section */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleAdd}
              className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <h3 className="text-sm font-bold text-foreground">Новая запись на оклейку</h3>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Скрыть
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Информация об авто <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Toyota Camry / A001AA 77"
                    value={carInfo}
                    onChange={(e) => setCarInfo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Имя клиента
                  </label>
                  <input
                    type="text"
                    placeholder="Александр"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Телефон клиента
                  </label>
                  <input
                    type="tel"
                    placeholder="+7 999..."
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Услуга / Работы
                  </label>
                  <input
                    type="text"
                    placeholder="Оклейка капота полиуретаном"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Дата <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none [color-scheme:dark]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Время <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Бокс
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([1, 2] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBoxNumber(boxNumber === b ? undefined : b)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          boxNumber === b
                            ? "bg-violet-500 border-violet-500 text-white"
                            : "bg-background border-border/55 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Бокс {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 rounded-xl border border-border/50 text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Добавить запись
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly view (displayMode === 'week') */}
      {displayMode === "week" && (
        <OkleykaWeeklyView
          appointments={appointments}
          onRefresh={fetchAppointments}
        />
      )}

      {/* Month / Day views (displayMode === 'month') */}
      {displayMode === "month" && (
        loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20 bg-card border border-border/50 rounded-2xl">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-base font-semibold">Нет записей</p>
            <p className="text-xs text-muted-foreground mt-1">
              На выбранный период нет запланированных записей или они не соответствуют фильтрам
            </p>
          </div>
        ) : (
          /* Appointments List */
          <div className="space-y-6">
            {viewMode === "month" ? (
              // Monthly view grouped by date
              sortedDates.map((dateStr) => {
                const dayAppts = groupedByDate[dateStr];
                const dateObj = parseISO(dateStr);
                return (
                  <div key={dateStr} className="space-y-2">
                    <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-1.5 flex items-center gap-2 border-b border-border/30">
                      <span className="text-sm font-bold text-foreground capitalize">
                        {format(dateObj, "EEEE, d MMMM", { locale: ru })}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {dayAppts.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dayAppts.map((appt) => (
                        <AppointmentCard
                          key={appt.id}
                          appt={appt}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Day view
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}
    </motion.div>
  );
};

// ── Card Component ────────────────────────────────────────────────────────────
interface AppointmentCardProps {
  appt: OkleykaAppointment;
  onStatusChange: (appt: OkleykaAppointment, status: AppointmentStatus) => void;
  onDelete: (id: string) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appt, onStatusChange, onDelete }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border/40 hover:border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 transition-colors"
    >
      <div className="space-y-2">
        {/* Header: Time, Box, Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg border border-border/50">
            <Clock className="w-3.5 h-3.5" /> {appt.time}
          </span>

          {appt.boxNumber && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              appt.boxNumber === 1 
                ? "bg-violet-500/10 text-violet-500 border border-violet-500/20" 
                : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
            }`}>
              Бокс {appt.boxNumber}
            </span>
          )}

          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig[appt.status].cls}`}>
            {statusConfig[appt.status].label}
          </span>
        </div>

        {/* Car and Client info */}
        <div>
          <h4 className="text-sm font-bold text-foreground leading-snug">{appt.carInfo}</h4>
          
          {appt.service && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Wrench className="w-3 h-3 text-violet-400" />
              {appt.service}
            </p>
          )}

          {(appt.clientName || appt.clientPhone) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-xl border border-border/20">
              {appt.clientName && (
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <User className="w-3 h-3 text-muted-foreground" />
                  {appt.clientName}
                </span>
              )}
              {appt.clientPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  {appt.clientPhone}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 mt-1">
        <button
          onClick={() => onDelete(appt.id)}
          className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
          title="Удалить запись"
        >
          <Trash2 className="w-3.8 h-3.8" />
        </button>

        {appt.status === "scheduled" && (
          <div className="flex gap-1.5">
            <button
              onClick={() => onStatusChange(appt, "cancelled")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/50 text-[11px] font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" /> Отменить
            </button>
            <button
              onClick={() => onStatusChange(appt, "completed")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 text-[11px] font-semibold transition-all border border-green-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Завершить
            </button>
          </div>
        )}

        {appt.status !== "scheduled" && (
          <button
            onClick={() => onStatusChange(appt, "scheduled")}
            className="text-[10px] text-primary hover:underline font-semibold"
          >
            Вернуть в запланированные
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default OkleykaAppointmentsPage;
