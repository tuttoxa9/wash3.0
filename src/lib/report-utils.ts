import type { DailyReport, CarWashRecord } from "./types";

/**
 * Recalculates totalCash and totalCard for a report based on its records.
 */
export function recalculateReportTotals(
  report: DailyReport | { records: CarWashRecord[] }
): { totalCash: number; totalCard: number } {
  const records = report.records || [];
  const totalCash = records.reduce(
    (sum, rec) => sum + (rec.paymentMethod.type === "cash" ? rec.price : 0),
    0
  );
  const totalCard = records.reduce(
    (sum, rec) => sum + (rec.paymentMethod.type === "card" ? rec.price : 0),
    0
  );
  return { totalCash, totalCard };
}
