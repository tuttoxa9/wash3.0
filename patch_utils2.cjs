const fs = require('fs');
let content = fs.readFileSync('src/lib/utils.ts', 'utf8');

// Добавим импорт EmployeeRole и MinimumPaymentSettings
if (!content.includes('MinimumPaymentSettings')) {
  content = content.replace(
    'EmployeeRole,\n} from "@/lib/types";',
    'EmployeeRole,\n  MinimumPaymentSettings,\n} from "@/lib/types";'
  );
}

// Добавим createSalaryCalculator если нет
if (!content.includes('import { createSalaryCalculator } from "@/components/SalaryCalculator";')) {
  // У нас уже есть import { SalaryCalculator } from "@/components/SalaryCalculator";
  content = content.replace(
    'import { SalaryCalculator } from "@/components/SalaryCalculator";',
    'import { SalaryCalculator, createSalaryCalculator } from "@/components/SalaryCalculator";'
  );
}

// 1. Изменение сигнатуры generatePeriodReportDocx
content = content.replace(
  'export const generatePeriodReportDocx = (\n  reports: { date: string; report: DailyReport }[],\n  employees: Employee[],\n  periodStats: { cash: number; nonCash: number; total: number; salary: number },\n  periodType: "week" | "month",\n): Document => {',
  'export const generatePeriodReportDocx = (\n  reports: { date: string; report: DailyReport }[],\n  employees: Employee[],\n  periodStats: { cash: number; nonCash: number; total: number; salary: number },\n  periodType: "week" | "month",\n  minimumPaymentSettings: MinimumPaymentSettings,\n): Document => {'
);

// Исправление логики расчета внутри generatePeriodReportDocx
const newPeriodLogic = `
  // Добавляем строки с данными
  reports.forEach(({ date, report }) => {
    const formattedDate = format(parseISO(date), "d MMMM (EEE)", {
      locale: ru,
    });
    const orderCount = report.records.length;

    // Подсчет выручки
    let dayCash = 0;
    let dayCard = 0;
    let dayOrg = 0;
    let dayDebt = 0;

    report.records.forEach(r => {
      if (r.paymentMethod.type === 'cash') dayCash += r.price;
      else if (r.paymentMethod.type === 'card') dayCard += r.price;
      else if (r.paymentMethod.type === 'organization') dayOrg += r.price;
      else if (r.paymentMethod.type === 'debt') dayDebt += r.price;
    });

    const totalDay = dayCash + dayCard + dayOrg + dayDebt;

    // Подсчет зарплаты
    const localEmployeeRoles = report.dailyEmployeeRoles || {};
    const minimumOverride = Object.keys(localEmployeeRoles).reduce<Record<string, boolean>>((acc, key) => {
      if (key.startsWith('min_')) {
        const empId = key.replace('min_', '');
        acc[empId] = localEmployeeRoles[key] !== false;
      }
      return acc;
    }, {});

    const salaryCalculator = createSalaryCalculator(
      minimumPaymentSettings,
      report.records,
      localEmployeeRoles,
      employees,
      minimumOverride
    );

    const salaryResults = salaryCalculator.calculateSalaries();
    const daySalary = salaryResults.reduce((sum, res) => sum + res.calculatedSalary, 0);

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: formattedDate })] }),
          new TableCell({
            children: [
              new Paragraph({
                text: orderCount.toString(),
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: dayCash.toFixed(2),
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: dayCard.toFixed(2),
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: totalDay.toFixed(2),
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: daySalary.toFixed(2),
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
    );
  });
`;

// Замена старой логики на новую
let periodStartIdx = content.indexOf('// Добавляем строки с данными');
let periodEndIdx = content.indexOf('// Добавляем строку с итогами');
content = content.substring(0, periodStartIdx) + newPeriodLogic + '\n  ' + content.substring(periodEndIdx);

// 2. Изменение сигнатуры generateDailyReportDocx
content = content.replace(
  'export function generateDailyReportDocx(\n  report: DailyReport,\n  employees: Employee[],\n  date: string,\n) {',
  'export function generateDailyReportDocx(\n  report: DailyReport,\n  employees: Employee[],\n  date: string,\n  minimumPaymentSettings: MinimumPaymentSettings,\n) {'
);

// 3. Удаление localStorage из generateDailyReportDocx
content = content.replace(
  '  // Настройки зарплаты\n  const savedSalaryMethod =\n    localStorage.getItem("salaryCalculationMethod") || "minimumWithPercentage";\n  const minimumPaymentSettings = JSON.parse(\n    localStorage.getItem("minimumPaymentSettings") ||\n      \'{"minimumPaymentWasher":0,"percentageWasher":10,"minimumPaymentAdmin":0,"adminCashPercentage":3,"adminCarWashPercentage":2}\',\n  );\n  const localEmployeeRoles = report.dailyEmployeeRoles || {};',
  '  // Настройки зарплаты\n  const localEmployeeRoles = report.dailyEmployeeRoles || {};'
);


fs.writeFileSync('src/lib/utils.ts', content);
console.log('utils.ts patched correctly');
