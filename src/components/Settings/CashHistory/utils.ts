import { DailyReport } from "@/lib/types";
import { parseISO, isAfter, isBefore, startOfDay, endOfDay, subDays, startOfMonth, subMonths, endOfMonth } from "date-fns";
import { AppState } from "@/lib/context/AppContext";

export type TimeFilter = "all" | "today" | "yesterday" | "this_month" | "last_month" | "this_week";

export interface AggregatedCashData {
  totalCashIncome: number;
  totalCashOutcome: number;
  totalSalaryPayouts: number;
  totalTransferredToSafe: number;
  totalDiscrepancy: number; // Излишек/недостача
  shiftsWithShortage: number;
  shiftsWithSurplus: number;
}

export interface ModificationWithContext {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  method?: "cash" | "card";
  reportId: string;
  reportDate: string;
}

export const filterReportsByTime = (reports: DailyReport[], filter: TimeFilter): DailyReport[] => {
  if (filter === "all") return reports;

  const now = new Date();
  let startDate: Date;
  let endDate: Date = endOfDay(now);

  switch (filter) {
    case "today":
      startDate = startOfDay(now);
      break;
    case "yesterday":
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;
    case "this_month":
      startDate = startOfMonth(now);
      break;
    case "last_month":
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    case "this_week":
      startDate = startOfDay(subDays(now, 7)); // Оставим так для простоты (последние 7 дней)
      break;
    default:
      return reports;
  }

  return reports.filter((r) => {
    const reportDate = parseISO(r.date as string);
    return isAfter(reportDate, startDate) && isBefore(reportDate, endDate) || reportDate.getTime() === startDate.getTime() || reportDate.getTime() === endDate.getTime();
  });
};

export const aggregateCashData = (reports: DailyReport[]): AggregatedCashData => {
  let totalCashIncome = 0;
  let totalCashOutcome = 0;
  let totalSalaryPayouts = 0;
  let totalTransferredToSafe = 0;
  let totalDiscrepancy = 0;
  let shiftsWithShortage = 0;
  let shiftsWithSurplus = 0;

  reports.forEach((report) => {
    // Income from services (cash)
    totalCashIncome += report.totalCash || 0;

    // Process modifications
    if (report.cashModifications) {
      report.cashModifications.forEach((mod) => {
        if (!mod.method || mod.method === "cash") {
          if (mod.amount > 0) {
            totalCashIncome += mod.amount;
          } else {
            totalCashOutcome += Math.abs(mod.amount);
          }
        }
      });
    }

    // Process CashState
    if (report.cashState) {
      const state = report.cashState;

      // Salary
      const payouts = Object.values(state.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);
      totalSalaryPayouts += payouts;

      // Safe
      totalTransferredToSafe += state.transferredToSafe || 0;

      // Discrepancy
      if (state.actualEndOfDayCash !== undefined) {
        const expectedCash = state.startOfDayCash + report.totalCash - payouts - (state.transferredToSafe || 0);
        // add cash modifications that are "cash" (handled in totalCashIncome/Outcome above but need to calculate exact expected here per shift)
        let shiftModsNet = 0;
        if (report.cashModifications) {
             report.cashModifications.forEach(mod => {
                 if (!mod.method || mod.method === 'cash') {
                     shiftModsNet += mod.amount;
                 }
             })
        }

        // The expected cash in SettingsPage.tsx was calculated without modifications. Let's fix this here if modifications weren't included before, but we must be careful not to double count.
        // Let's rely on the formula that was already there for compatibility: expectedCash = startOfDayCash + totalCash - totalPayouts - transferredToSafe + modsNet

        const finalExpectedCash = state.startOfDayCash + report.totalCash + shiftModsNet - payouts - (state.transferredToSafe || 0);
        const diff = state.actualEndOfDayCash - finalExpectedCash;

        totalDiscrepancy += diff;

        if (diff > 0.01) shiftsWithSurplus++;
        else if (diff < -0.01) shiftsWithShortage++;
      }
    }
  });

  return {
    totalCashIncome,
    totalCashOutcome,
    totalSalaryPayouts,
    totalTransferredToSafe,
    totalDiscrepancy,
    shiftsWithShortage,
    shiftsWithSurplus
  };
};

export const extractAllModifications = (reports: DailyReport[]): ModificationWithContext[] => {
  return reports.flatMap((report) =>
    (report.cashModifications || [])
      .filter(mod => !mod.method || mod.method === 'cash') // Only cash transactions for cash history
      .map((mod) => ({
        ...mod,
        reportId: report.id,
        reportDate: report.date as string,
      }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getEmployeeName = (id: string, state: AppState): string => {
  const employee = state.employees.find((e) => e.id === id);
  return employee ? employee.name : "Неизвестный сотрудник";
};
