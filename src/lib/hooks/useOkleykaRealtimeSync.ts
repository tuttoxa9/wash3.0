import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";

/**
 * Hook for syncing Okleyka data in real-time with Supabase.
 * When changes occur in the database (e.g., from other devices), the app state updates automatically.
 */
export function useOkleykaRealtimeSync() {
  const { state, refreshShift, refreshOrders, refreshDebts } = useOkleykaContext();

  useEffect(() => {
    // We listen to okleyka_shifts
    const shiftsSubscription = supabase
      .channel("okleyka_shifts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "okleyka_shifts" },
        () => {
          if (state.currentDate) {
            refreshShift(state.currentDate);
          }
        }
      )
      .subscribe();

    // Listen to okleyka_orders
    const ordersSubscription = supabase
      .channel("okleyka_orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "okleyka_orders" },
        () => {
          // Since we need to update stats and box status, we just refresh all active orders
          // Usually we refresh by current date
          if (state.currentDate) {
            refreshOrders(state.currentDate);
          }
        }
      )
      .subscribe();

    // Listen to okleyka_debts
    const debtsSubscription = supabase
      .channel("okleyka_debts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "okleyka_debts" },
        () => {
          refreshDebts();
        }
      )
      .subscribe();

    // Listen to okleyka_cash_modifications
    const cashSubscription = supabase
      .channel("okleyka_cash_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "okleyka_cash_modifications" },
        () => {
          if (state.currentDate) {
            refreshShift(state.currentDate);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(shiftsSubscription);
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(debtsSubscription);
      supabase.removeChannel(cashSubscription);
    };
  }, [state.currentDate, refreshShift, refreshOrders, refreshDebts]);
}
