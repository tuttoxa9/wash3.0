import { DailyReport } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { saveAs } from "file-saver";
import { ModificationWithContext } from "./utils";

export const exportCashHistoryToCSV = (shifts: DailyReport[], mods: ModificationWithContext[], timeFilterStr: string) => {
  const BOM = "\uFEFF"; // Byte Order Mark for Excel
  let csvContent = "data:text/csv;charset=utf-8," + BOM;

  // Header
  csvContent += "ОТЧЕТ ПО КАССОВЫМ ОПЕРАЦИЯМ\n";
  csvContent += `Период: ${timeFilterStr}\n`;
  csvContent += `Дата формирования: ${format(new Date(), "dd.MM.yyyy HH:mm")}\n\n`;

  // Shifts Table
  csvContent += "=== КНИГА УЧЕТА СМЕН ===\n";
  csvContent += "Дата смены;Статус;На начало дня;Приход (услуги);Внесения;Изъятия;Выплачено ЗП;В сейф;Расчетный остаток;Факт. в кассе;Разница\n";

  shifts.forEach(report => {
    const s = report.cashState;
    if (!s) return;

    let shiftModsIn = 0;
    let shiftModsOut = 0;
    (report.cashModifications || [])
      .filter(m => !m.method || m.method === 'cash')
      .forEach(m => {
          if (m.amount > 0) shiftModsIn += m.amount;
          else shiftModsOut += Math.abs(m.amount);
      });

    const totalPayouts = Object.values(s.salaryPayouts || {}).reduce((sum, val) => sum + val, 0);
    const expectedCash = s.startOfDayCash + report.totalCash + shiftModsIn - totalPayouts - (s.transferredToSafe || 0);
    const diff = s.actualEndOfDayCash !== undefined ? s.actualEndOfDayCash - expectedCash : 0;

    const row = [
        format(parseISO(report.date as string), "dd.MM.yyyy"),
        s.isShiftOpen ? "Открыта" : "Закрыта",
        s.startOfDayCash.toFixed(2),
        report.totalCash.toFixed(2),
        shiftModsIn.toFixed(2),
        shiftModsOut.toFixed(2),
        totalPayouts.toFixed(2),
        (s.transferredToSafe || 0).toFixed(2),
        expectedCash.toFixed(2),
        s.actualEndOfDayCash !== undefined ? s.actualEndOfDayCash.toFixed(2) : "—",
        diff.toFixed(2)
    ];

    csvContent += row.join(";") + "\n";
  });

  csvContent += "\n\n=== ТРАНЗАКЦИИ (ВНЕСЕНИЯ И ИЗЪЯТИЯ) ===\n";
  csvContent += "Дата и время;Дата смены;Тип;Сумма (BYN);Основание\n";

  mods.forEach(mod => {
      const type = mod.amount > 0 ? "Пополнение" : "Изъятие";
      const row = [
          format(new Date(mod.createdAt), "dd.MM.yyyy HH:mm"),
          format(parseISO(mod.reportDate), "dd.MM.yyyy"),
          type,
          Math.abs(mod.amount).toFixed(2),
          `"${mod.reason.replace(/"/g, '""')}"` // escape quotes
      ];
      csvContent += row.join(";") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const fileName = `Кассовый_Отчет_${format(new Date(), "dd-MM-yyyy")}.csv`;
  saveAs(encodedUri, fileName);
};
