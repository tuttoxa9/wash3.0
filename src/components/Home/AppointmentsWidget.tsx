import type React from "react";
import { useState, useEffect } from "react";
import { Calendar, Loader2, CheckCircle, Clock, ArrowRight, X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";
import { appointmentService } from "@/lib/services/supabaseService";
import type { Appointment } from "@/lib/types";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

interface AppointmentsWidgetProps {
  onStartAppointment: (
    appointment: Appointment,
    event?: React.MouseEvent,
  ) => void;
  canCreateRecords: boolean;
}

const AppointmentsWidget: React.FC<AppointmentsWidgetProps> = ({
  onStartAppointment,
  canCreateRecords,
}) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Загрузка записей на сегодня и завтра
  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      try {
        const todayTomorrowAppointments =
          await appointmentService.getTodayAndTomorrow();
        setAppointments(todayTomorrowAppointments);
      } catch (error) {
        console.error("Ошибка при загрузке записей:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();

    // Обновляем записи каждые 5 минут
    const interval = setInterval(loadAppointments, 5 * 60 * 1000);

    // Слушатель события завершения записи
    const handleAppointmentCompleted = (event: CustomEvent<{ id: string }>) => {
      setAppointments((currentAppointments) =>
        currentAppointments.filter((app) => app.id !== event.detail.id),
      );
    };

    // Добавляем слушатель события
    document.addEventListener(
      "appointmentCompleted",
      handleAppointmentCompleted as EventListener,
    );

    return () => {
      clearInterval(interval);
      document.removeEventListener(
        "appointmentCompleted",
        handleAppointmentCompleted as EventListener,
      );
    };
  }, []);

  // Группировка записей по дате
  const todayAppointments = appointments.filter((app) =>
    isToday(parseISO(app.date)),
  );
  const tomorrowAppointments = appointments.filter((app) =>
    isTomorrow(parseISO(app.date)),
  );

  // Обработка клика по иконке "Начать выполнение"
  const handleStartAppointment = (
    appointment: Appointment,
    event?: React.MouseEvent,
  ) => {
    if (!canCreateRecords) {
      toast.info("Сначала выберите работников и начните смену");
      return;
    }
    onStartAppointment(appointment, event);
  };

  // Обработка отметки о выполнении
  const handleCompleteAppointment = async (appointment: Appointment) => {
    if (!confirm("Отметить запись как выполненную?")) {
      return;
    }

    try {
      const updatedAppointment: Appointment = {
        ...appointment,
        status: "completed",
      };

      const success = await appointmentService.update(updatedAppointment);

      if (success) {
        // Обновляем список записей
        setAppointments(
          appointments.map((app) =>
            app.id === appointment.id ? updatedAppointment : app,
          ),
        );

        // Обновляем в глобальном состоянии
        dispatch({ type: "UPDATE_APPOINTMENT", payload: updatedAppointment });

        toast.success("Запись отмечена как выполненная");
      } else {
        toast.error("Не удалось обновить статус записи");
      }
    } catch (error) {
      console.error("Ошибка при обновлении статуса записи:", error);
      toast.error("Произошла ошибка при обновлении статуса");
    }
  };

  // Обработка удаления записи
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) {
      return;
    }

    try {
      const success = await appointmentService.delete(id);

      if (success) {
        // Обновляем список записей
        setAppointments(appointments.filter((app) => app.id !== id));

        // Обновляем в глобальном состоянии
        dispatch({ type: "REMOVE_APPOINTMENT", payload: id });

        toast.success("Запись успешно удалена");
      } else {
        toast.error("Не удалось удалить запись");
      }
    } catch (error) {
      console.error("Ошибка при удалении записи:", error);
      toast.error("Произошла ошибка при удалении записи");
    }
  };

  // Рендер записи - более компактный вариант
  const renderAppointment = (appointment: Appointment) => (
    <div
      key={appointment.id}
      className="py-1 sm:py-1.5 px-2 sm:px-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/10"
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center text-[10px] sm:text-xs">
            <span className="font-medium whitespace-nowrap">
              {appointment.time}
            </span>
            <span className="mx-0.5 sm:mx-1 text-muted-foreground">•</span>
            <span className="truncate">{appointment.carInfo}</span>
          </div>
          <div className="text-[9px] sm:text-xs text-muted-foreground truncate">
            {appointment.service}
          </div>
        </div>

        <div className="flex ml-0.5 sm:ml-1 gap-0.5">
          {appointment.status === "scheduled" && (
            <>
              <button
                onClick={(e) => handleStartAppointment(appointment, e)}
                className="p-0.5 sm:p-1 rounded hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 disabled:opacity-50"
                title={
                  canCreateRecords
                    ? "Начать выполнение"
                    : "Сначала выберите работников и начните смену"
                }
                disabled={!canCreateRecords}
              >
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteAppointment(appointment.id)}
                className="p-0.5 sm:p-1 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                title="Отменить запись"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl sm:rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-350px)]">
      <div
        className="flex items-center justify-between p-3 sm:p-4 border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/10 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
          <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline">Записи на мойку</span>
            <span className="sm:hidden">Записи</span>
          </h3>
        </div>
        <a
          href={canCreateRecords ? "/records" : "#"}
          onClick={(e) => {
            e.stopPropagation(); // Предотвращаем сворачивание/разворачивание при клике на ссылку
            if (!canCreateRecords) {
              e.preventDefault();
              toast.info("Сначала выберите работников и начните смену");
            }
          }}
          className={`text-[10px] sm:text-xs flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg font-medium transition-all duration-200 ${canCreateRecords ? "text-primary hover:bg-primary/10 border border-primary/20" : "pointer-events-none opacity-60"}`}
          title={
            canCreateRecords
              ? undefined
              : "Сначала выберите работников и начните смену"
          }
        >
          <span className="hidden sm:inline">Все записи</span>
          <span className="sm:hidden">Все</span>
          <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        </a>
      </div>

      {isExpanded && (
      <div className="overflow-y-auto">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-8 sm:py-12">
            <div className="relative">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-transparent border-r-accent rounded-full animate-spin animation-delay-150" />
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3 font-medium">
              Загрузка записей...
            </span>
          </div>
        ) : (
          <>
            {todayAppointments.length > 0 || tomorrowAppointments.length > 0 ? (
              <>
                {todayAppointments.length > 0 && (
                  <div className="mb-0.5">
                    <div>{todayAppointments.map(renderAppointment)}</div>
                  </div>
                )}

                {tomorrowAppointments.length > 0 && (
                  <div>
                    <h4 className="text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 bg-secondary/10 border-l-2 border-secondary">
                      Завтра
                    </h4>
                    <div>{tomorrowAppointments.map(renderAppointment)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 sm:py-6 text-muted-foreground text-[10px] sm:text-xs px-2">
                <p>Нет предстоящих записей</p>
                <a
                  href={canCreateRecords ? "/records" : "#"}
                  onClick={(e) => {
                    if (!canCreateRecords) {
                      e.preventDefault();
                      toast.info("Сначала выберите работников и начните смену");
                    }
                  }}
                  className={`text-[10px] sm:text-xs text-primary hover:underline inline-flex items-center mt-1 ${!canCreateRecords ? "pointer-events-none opacity-60" : ""}`}
                  title={
                    canCreateRecords
                      ? undefined
                      : "Сначала выберите работников и начните смену"
                  }
                >
                  Создать запись{" "}
                  <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5 ml-0.5" />
                </a>
              </div>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
};


export default AppointmentsWidget;
