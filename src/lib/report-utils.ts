import type { DailyReport, CarWashRecord } from "./types";

/**
 * Recalculates totalCash and totalCard for a report based on its records.
 */
export function recalculateReportTotals(
  report: DailyReport | { records: CarWashRecord[] }
): { totalCash: number; totalCard: number } {
  const records = report.records || [];
  const totalCash = records.reduce(
    (sum, rec) => {
      if (rec.paymentMethod.type === "cash") return sum + rec.price;
      if (rec.paymentMethod.type === "debt" && rec.paymentMethod.isClosed && rec.paymentMethod.actualMethod === "cash") return sum + rec.price;
      return sum;
    },
    0
  );
  const totalCard = records.reduce(
    (sum, rec) => {
      if (rec.paymentMethod.type === "card") return sum + rec.price;
      if (rec.paymentMethod.type === "debt" && rec.paymentMethod.isClosed && rec.paymentMethod.actualMethod === "card") return sum + rec.price;
      return sum;
    },
    0
  );
  return { totalCash, totalCard };
}
