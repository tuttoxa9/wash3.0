import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/lib/context/AppContext";
import {
  appointmentService,
  carWashService,
  dailyReportService,
} from "@/lib/services/supabaseService";
import { format } from "date-fns";

/**
 * Хук для синхронизации данных приложения с Supabase в реальном времени.
 * При изменении записей в БД (на других устройствах) данные в текущем приложении обновятся автоматически.
 */
export function useRealtimeSync() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    // Специальная подписка на саму таблицу settings, чтобы моментально узнавать об отключении/включении Realtime
    const settingsSubscription = supabase
      .channel("settings_realtime_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings", filter: "key=eq.realtimeEnabled" },
        (payload) => {
          if (payload.new && "data" in payload.new) {
            const isEnabled = (payload.new as any).data?.isEnabled ?? true;
            dispatch({ type: "SET_REALTIME_ENABLED", payload: isEnabled });
          }
        }
      )
      .subscribe();

    if (!state.isRealtimeEnabled) {
      return () => {
        supabase.removeChannel(settingsSubscription);
      };
    }

    // 1. Подписка на изменения в таблице записей (Appointments)
    const appointmentsSubscription = supabase
      .channel("appointments_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Новая запись на мойку
            dispatch({
              type: "ADD_APPOINTMENT",
              payload: payload.new as any,
            });
          } else if (payload.eventType === "UPDATE") {
            // Обновление записи (например, поменяли статус на "выполнено")
            dispatch({
              type: "UPDATE_APPOINTMENT",
              payload: payload.new as any,
            });
          } else if (payload.eventType === "DELETE") {
            // Удаление записи
            dispatch({
              type: "REMOVE_APPOINTMENT",
              payload: payload.old.id,
            });
          }
        },
      )
      .subscribe();

    // 2. Подписка на ежедневные отчеты (Daily Reports)
    // При изменении ежедневного отчета (состава смены, общих сумм) мы перезапрашиваем его целиком
    // чтобы стейт (records, employees) был согласованным
    const dailyReportsSubscription = supabase
      .channel("daily_reports_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_reports" },
        async (payload) => {
          const reportDate =
            payload.eventType === "DELETE"
              ? payload.old.date
              : payload.new.date;

          // Если это изменение касается отчета, который мы сейчас просматриваем (или сегодня)
          if (reportDate) {
            try {
              // Просто перезапрашиваем актуальную версию отчета со всеми вложенными записями
              const updatedReport =
                await dailyReportService.getByDate(reportDate);
              if (updatedReport) {
                dispatch({
                  type: "SET_DAILY_REPORT",
                  payload: { date: reportDate, report: updatedReport },
                });
              }
            } catch (error) {
              console.error("Error syncing daily report:", error);
            }
          }
        },
      )
      .subscribe();

    // 3. Подписка на записи о мойках (Car Wash Records - включая долги)
    // Так как записи являются частью DailyReport в нашем стейте,
    // при добавлении/изменении/удалении записи о мойке (например, долга),
    // нам нужно обновить соответствующий DailyReport.
    const carWashRecordsSubscription = supabase
      .channel("car_wash_records_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "car_wash_records" },
        async (payload) => {
          // Определяем дату записи, чтобы обновить нужный отчет
          const recordDate =
            payload.eventType === "DELETE"
              ? payload.old.date // для DELETE supabase передает только id в старом объекте, если не включен REPLICA IDENTITY FULL,
                                 // поэтому мы можем не знать дату. В этом случае мы обновим текущий просматриваемый отчет.
              : payload.new.date;

          const dateToUpdate = recordDate || state.currentDate;

          try {
            // Перезапрашиваем отчет, так как там хранятся все записи и итоги (totalCash, totalNonCash)
            const updatedReport =
              await dailyReportService.getByDate(dateToUpdate);
            if (updatedReport) {
              dispatch({
                type: "SET_DAILY_REPORT",
                payload: { date: dateToUpdate, report: updatedReport },
              });
            }
          } catch (error) {
            console.error("Error syncing car wash record:", error);
          }
        },
      )
      .subscribe();

    // Очистка подписок при размонтировании или выключении рубильника
    return () => {
      supabase.removeChannel(settingsSubscription);
      supabase.removeChannel(appointmentsSubscription);
      supabase.removeChannel(dailyReportsSubscription);
      supabase.removeChannel(carWashRecordsSubscription);
    };
  }, [dispatch, state.currentDate, state.isRealtimeEnabled]);
}
