import { SalaryCalculator } from "@/components/SalaryCalculator";
import type {
  CarWashRecord,
  DailyReport,
  Employee,
  EmployeeRole,
} from "@/lib/types";
import { type ClassValue, clsx } from "clsx";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from "docx";
import type { Organization } from "./types";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Генерация CSV из DailyReport
export function generateDailyReportCsv(
  report: DailyReport,
  employees: Employee[],
  organizations: Organization[] = [],
  date: string,
  organizationsInTotal: string[] = [],
): string {
  if (!report || !report.records) return "";

  const BOM = "\uFEFF";
  let csvContent = BOM;

  // Заголовок
  csvContent += `Ведомость за ${format(new Date(date), "dd.MM.yyyy")}\n\n`;

  // Заголовки таблицы
  csvContent += "Время;Авто;Услуга;Тип;Сумма;Оплата;Сотрудники\n";

  // Функция для получения названия организации
  const getOrgName = (id?: string) => {
    if (!id) return "Организация";
    const org = organizations.find((o) => o.id === id);
    return org ? org.name : "Организация";
  };

  // Экранирование для CSV
  const escapeCsv = (str: string) => {
    let result = str.replace(/;/g, ",");
    // Защита от CSV Injection
    if (/^[=+\-@]/.test(result)) {
      result = "'" + result;
    }
    return result;
  };

  // Строки таблицы
  report.records.forEach((record) => {
    const time = escapeCsv(record.time);
    const car = escapeCsv(record.carInfo);
    const service = escapeCsv(record.service);
    const type = record.serviceType === "dryclean" ? "Химчистка" : "Мойка";
    const price = record.price.toFixed(2);

    let paymentStr = "Наличные";
    if (record.paymentMethod.type === "card") paymentStr = "Карта";
    else if (record.paymentMethod.type === "organization") paymentStr = escapeCsv(getOrgName(record.paymentMethod.organizationId));
    else if (record.paymentMethod.type === "debt") paymentStr = escapeCsv(`Долг ${record.paymentMethod.comment || ""}`.trim());
    else if (record.paymentMethod.type === "certificate") paymentStr = "Сертификат";

    const emps = escapeCsv(record.employeeIds
      .map((id) => employees.find((e) => e.id === id)?.name || "Неизвестный")
      .join(", "));

    csvContent += `${time};${car};${service};${type};${price};${paymentStr};${emps}\n`;
  });

  // Движение средств
  const modifications = report.cashModifications || [];
  const cashModifications = modifications.filter(m => !m.method || m.method === "cash");
  const cardModifications = modifications.filter(m => m.method === "card");

  if (modifications.length > 0) {
    csvContent += "\nДвижение средств:\nВремя;Тип;Сумма;Комментарий\n";
    modifications.forEach((mod) => {
      const timeStr = format(new Date(mod.createdAt), "HH:mm");
      const methodStr = (!mod.method || mod.method === 'cash') ? 'Нал' : 'Карта';
      csvContent += `${timeStr};${methodStr};${mod.amount.toFixed(2)};${escapeCsv(mod.reason)}\n`;
    });
  }

  // Итоги
  csvContent += "\nИтоги:\n";

  const totalCashModifications = cashModifications.reduce((sum, mod) => sum + mod.amount, 0);
  const actualCash = report.totalCash + totalCashModifications;
  csvContent += `Наличные по услугам:;${report.totalCash.toFixed(2)}\n`;
  if (cashModifications.length > 0) {
    csvContent += `Наличные в кассе (факт):;${actualCash.toFixed(2)}\n`;
  } else {
    csvContent += `Всего Наличные:;${report.totalCash.toFixed(2)}\n`;
  }

  const totalCardServices = report.records.reduce((sum, r) => sum + (r.paymentMethod.type === "card" ? r.price : 0), 0);
  const actualCard = totalCardServices + cardModifications.reduce((sum, mod) => sum + mod.amount, 0);
  csvContent += `Карта по услугам:;${totalCardServices.toFixed(2)}\n`;
  if (cardModifications.length > 0) {
    csvContent += `Карта (факт):;${actualCard.toFixed(2)}\n`;
  }

  // Раздельный безнал (Организации из Separate учета)
  organizationsInTotal.forEach(orgId => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;
    const orgSum = report.records.reduce((sum, r) => {
      return sum + ((r.paymentMethod.type === "organization" && r.paymentMethod.organizationId === orgId) ? r.price : 0);
    }, 0);
    if (orgSum > 0) {
      csvContent += `Безнал (${escapeCsv(org.name)}):;${orgSum.toFixed(2)}\n`;
    }
  });

  // Остальной Безнал
  const totalRestOrg = report.records.reduce((sum, r) => {
    const isOrg = r.paymentMethod.type === "organization";
    const isSeparated = r.paymentMethod.organizationId && organizationsInTotal.includes(r.paymentMethod.organizationId);
    return sum + ((isOrg && !isSeparated) ? r.price : 0);
  }, 0);

  if (totalRestOrg > 0 || organizationsInTotal.length === 0) {
    csvContent += `Всего Безнал (Орг):;${totalRestOrg.toFixed(2)}\n`;
  }

  const totalDebt = report.records.reduce(
    (sum, r) => sum + (r.paymentMethod.type === "debt" ? r.price : 0),
    0
  );
  if (totalDebt > 0) {
    csvContent += `Всего Долги:;${totalDebt.toFixed(2)}\n`;
  }

  const totalCertificate = report.records.reduce(
    (sum, r) => sum + (r.paymentMethod.type === "certificate" ? r.price : 0),
    0
  );
  if (totalCertificate > 0) {
    csvContent += `Всего Сертификаты:;${totalCertificate.toFixed(2)}\n`;
  }

  const totalRevenue = report.records.reduce((sum, r) => sum + r.price, 0);
  csvContent += `ОБЩАЯ СУММА:;${totalRevenue.toFixed(2)}\n`;

  return csvContent;
}

// Функция для генерации docx файла с отчетом за период (неделя или месяц)
export const generatePeriodReportDocx = (
  reports: { date: string; report: DailyReport }[],
  employees: Employee[],
  periodStats: { cash: number; nonCash: number; total: number; salary: number },
  periodType: "week" | "month",
): Document => {
  // Форматируем заголовок периода
  const periodTitle =
    periodType === "week" ? "Недельный отчет" : "Месячный отчет";
  const periodDateRange =
    reports.length > 0
      ? `${format(parseISO(reports[0].date), "d MMMM", { locale: ru })} - ${format(parseISO(reports[reports.length - 1].date), "d MMMM yyyy", { locale: ru })}`
      : "";

  // Заголовок отчета
  const title = new Paragraph({
    text: `${periodTitle} DetailLab`,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 100 },
  });

  // Дата и сотрудники
  const dateInfo = new Paragraph({
    text: `Период: ${periodDateRange}`,
    spacing: { after: 100 },
  });

  // Получаем всех работавших сотрудников
  const workingEmployeeIds = new Set<string>();
  reports.forEach(({ report }) => {
    report.employeeIds.forEach((id) => workingEmployeeIds.add(id));
  });

  const workingEmployees = Array.from(workingEmployeeIds)
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean) as Employee[];

  // Информация о сотрудниках
  const employeesInfo = new Paragraph({
    text: `Работали: ${workingEmployees.map((e) => e.name).join(", ")}`,
    spacing: { after: 200 },
  });

  // Создаем таблицу с данными за период
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({ text: "Дата", alignment: AlignmentType.CENTER }),
          ],
          width: { size: 15, type: "pct" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Кол-во заказов",
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: "pct" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Наличные (BYN)",
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 20, type: "pct" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Безналичные (BYN)",
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 20, type: "pct" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Всего (BYN)",
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: "pct" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Зарплата (BYN)",
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: "pct" },
        }),
      ],
      tableHeader: true,
    }),
  ];

  // Добавляем строки с данными
  reports.forEach(({ date, report }) => {
    const formattedDate = format(parseISO(date), "d MMMM (EEE)", {
      locale: ru,
    });
    const orderCount = report.records.length;
    const totalDay = report.records.reduce((sum, r) => sum + r.price, 0);
    const salary = totalDay * 0.27;

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
                text: report.totalCash.toFixed(2),
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: report.totalCard.toFixed(2),
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
                text: salary.toFixed(2),
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
    );
  });

  // Добавляем строку с итогами
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              text: "ИТОГО:",
              bold: true,
            }),
          ],
          columnSpan: 2,
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: periodStats.cash.toFixed(2),
              bold: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: periodStats.nonCash.toFixed(2),
              bold: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: periodStats.total.toFixed(2),
              bold: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: periodStats.salary.toFixed(2),
              bold: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      ],
    }),
  );

  const reportsTable = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: "pct",
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });

  // Добавляем информацию о распределении зарплаты
  const salaryDistribution = new Paragraph({
    text: `Распределение зарплаты:`,
    spacing: { before: 200, after: 100 },
  });

  const salaryPerEmployee = periodStats.salary / workingEmployees.length;

  const salaryPerEmployeeText = new Paragraph({
    text: `На каждого сотрудника (поровну): ${salaryPerEmployee.toFixed(2)} BYN`,
    spacing: { after: 100 },
  });

  // Создаем документ
  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: [
          title,
          dateInfo,
          employeesInfo,
          reportsTable,
          salaryDistribution,
          salaryPerEmployeeText,
        ],
      },
    ],
  });
};

// Генерация отчета в формате Word
export function generateDailyReportDocx(
  report: DailyReport,
  employees: Employee[],
  date: string,
  organizations: Organization[] = [],
  organizationsInTotal: string[] = [],
) {
  // Получаем всех работавших сотрудников
  const workingEmployeeIds = new Set<string>();
  report.employeeIds.forEach((id) => workingEmployeeIds.add(id));

  const workingEmployees = Array.from(workingEmployeeIds)
    .map((id) => employees.find((emp) => emp.id === id))
    .filter((emp) => emp !== undefined) as Employee[];

  // Создаем список сотрудников для отчета
  const employeesList = workingEmployees.map((emp) => emp.name).join(", ");

  // Настройки зарплаты
  const savedSalaryMethod =
    localStorage.getItem("salaryCalculationMethod") || "minimumWithPercentage";
  const minimumPaymentSettings = JSON.parse(
    localStorage.getItem("minimumPaymentSettings") ||
      '{"minimumPaymentWasher":0,"percentageWasher":10,"minimumPaymentAdmin":0,"adminCashPercentage":3,"adminCarWashPercentage":2}',
  );
  const localEmployeeRoles = report.dailyEmployeeRoles || {};

  // Карта флагов минималки из dailyEmployeeRoles (min_<id>)
  const minimumOverride = Array.from(workingEmployeeIds).reduce<
    Record<string, boolean>
  >((acc, empId) => {
    const val = (localEmployeeRoles as any)?.[`min_${empId}`];
    acc[empId] = val !== false; // по умолчанию учитываем минималку
    return acc;
  }, {});

  // Создаем калькулятор зарплаты с учетом флага минималки
  const salaryCalculator = new SalaryCalculator(
    minimumPaymentSettings,
    report.records,
    localEmployeeRoles,
    workingEmployees,
    minimumOverride,
  );

  const salaryResults = salaryCalculator.calculateSalaries();

  // Подсчитываем итоги
  let totalCash = 0;
  let totalCard = 0;
  let totalOrganizations = 0;
  let totalDebt = 0;
  let totalCertificate = 0;
  const separateOrgTotals: Record<string, number> = {};

  const modifications = report.cashModifications || [];
  const cashModifications = modifications.filter(m => !m.method || m.method === "cash");
  const cardModifications = modifications.filter(m => m.method === "card");

  const totalCashModifications = cashModifications.reduce((sum, mod) => sum + mod.amount, 0);
  const totalCardModifications = cardModifications.reduce((sum, mod) => sum + mod.amount, 0);

  if (report.records) {
    report.records.forEach((record) => {
      if (record.paymentMethod.type === "cash") {
        totalCash += record.price;
      } else if (record.paymentMethod.type === "card") {
        totalCard += record.price;
      } else if (record.paymentMethod.type === "organization") {
        if (record.paymentMethod.organizationId && organizationsInTotal.includes(record.paymentMethod.organizationId)) {
          const orgId = record.paymentMethod.organizationId;
          separateOrgTotals[orgId] = (separateOrgTotals[orgId] || 0) + record.price;
        } else {
          totalOrganizations += record.price;
        }
      } else if (record.paymentMethod.type === "debt") {
        totalDebt += record.price;
      } else if (record.paymentMethod.type === "certificate") {
        totalCertificate += record.price;
      }
    });
  }
  const totalSeparateOrgs = Object.values(separateOrgTotals).reduce((sum, val) => sum + val, 0);
  const totalRevenue = totalCash + totalCard + totalOrganizations + totalSeparateOrgs + totalDebt + totalCertificate;
  const totalSalary = salaryResults.reduce(
    (sum, result) => sum + result.calculatedSalary,
    0,
  );

  const sections = [];

  // Первый лист - общая сводка
  sections.push({
    properties: {
      page: {
        margin: {
          top: 1000,
          right: 1000,
          bottom: 1000,
          left: 1000,
        },
      },
    },
    children: [
      // Заголовок отчета
      new Paragraph({
        text: "Ведомость ежедневная выполненных работ DetailLab",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
        alignment: AlignmentType.CENTER,
      }),

      // Дата отчета
      new Paragraph({
        text: `Дата: ${format(parseISO(date), "d MMMM yyyy г.", { locale: ru })}`,
        spacing: { after: 100 },
        alignment: AlignmentType.CENTER,
      }),

      // Информация о сотрудниках
      new Paragraph({
        text: `Работали: ${employeesList}`,
        spacing: { after: 200 },
      }),

      // Общие итоги
      new Paragraph({
        text: "ОБЩИЕ ИТОГИ",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Table({
        rows: [
          ...(totalCertificate > 0 ? [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Сертификат" })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: totalCertificate.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
          ] : []),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    text: "Показатель",
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 4000, type: "dxa" },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: "Сумма (BYN)",
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 2000, type: "dxa" },
              }),
            ],
            tableHeader: true,
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "Наличные (по услугам)" })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: totalCash.toFixed(2),
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          }),
          ...(cashModifications.length > 0 ? [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Наличные (в кассе фактические)" })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: (totalCash + totalCashModifications).toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
          ] : []),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: cardModifications.length > 0 ? "Карта (по услугам)" : "Карта" })] }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: totalCard.toFixed(2),
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          }),
          ...(cardModifications.length > 0 ? [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Карта (фактически)" })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: (totalCard + totalCardModifications).toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
          ] : []),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "Долг" })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: totalDebt.toFixed(2),
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          }),
          ...(totalCertificate > 0 ? [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Сертификат (использовано)" })] }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: totalCertificate.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
          ] : []),
          ...Object.entries(separateOrgTotals).map(([orgId, orgSum]) => {
            const orgName = organizations.find((o) => o.id === orgId)?.name || "Неизвестная организация";
            return new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: `Безнал (${orgName})` })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: orgSum.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            });
          }),
          ...(totalOrganizations > 0 || Object.keys(separateOrgTotals).length === 0 ? [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Безнал (организации)" })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: totalOrganizations.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            })
          ] : []),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ text: "ИТОГО ВЫРУЧКА", bold: true }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: totalRevenue.toFixed(2),
                    alignment: AlignmentType.RIGHT,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ text: "ИТОГО ЗАРПЛАТА", bold: true }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: totalSalary.toFixed(2),
                    alignment: AlignmentType.RIGHT,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
        width: { size: 6000, type: "dxa" },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          insideHorizontal: {
            style: BorderStyle.SINGLE,
            size: 1,
            color: "000000",
          },
          insideVertical: {
            style: BorderStyle.SINGLE,
            size: 1,
            color: "000000",
          },
        },
      }),

      // Зарплата по сотрудникам
      new Paragraph({
        text: "ЗАРПЛАТА ПО СОТРУДНИКАМ",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),

      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    text: "Сотрудник",
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 3000, type: "dxa" },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: "Роль",
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 1500, type: "dxa" },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: "Зарплата (BYN)",
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 1500, type: "dxa" },
              }),
            ],
            tableHeader: true,
          }),
          ...salaryResults.map(
            (result) =>
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: result.employeeName })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: result.role === "admin" ? "Админ" : "Мойщик",
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: result.calculatedSalary.toFixed(2),
                        alignment: AlignmentType.RIGHT,
                      }),
                    ],
                  }),
                ],
              }),
          ),
        ],
        width: { size: 6000, type: "dxa" },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          insideHorizontal: {
            style: BorderStyle.SINGLE,
            size: 1,
            color: "000000",
          },
          insideVertical: {
            style: BorderStyle.SINGLE,
            size: 1,
            color: "000000",
          },
        },
      }),

      ...(modifications.length > 0 ? [
        new Paragraph({
          text: "ДВИЖЕНИЕ СРЕДСТВ",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Время", alignment: AlignmentType.CENTER })], width: { size: 1000, type: "dxa" } }),
                new TableCell({ children: [new Paragraph({ text: "Тип", alignment: AlignmentType.CENTER })], width: { size: 1000, type: "dxa" } }),
                new TableCell({ children: [new Paragraph({ text: "Комментарий", alignment: AlignmentType.CENTER })], width: { size: 2500, type: "dxa" } }),
                new TableCell({ children: [new Paragraph({ text: "Сумма (BYN)", alignment: AlignmentType.CENTER })], width: { size: 1500, type: "dxa" } }),
              ],
              tableHeader: true,
            }),
            ...modifications.map(mod => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: format(new Date(mod.createdAt), "HH:mm"), alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: (!mod.method || mod.method === 'cash') ? 'Нал' : 'Карта', alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: mod.reason })] }),
                new TableCell({ children: [new Paragraph({ text: `${mod.amount > 0 ? '+' : ''}${mod.amount.toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
              ],
            }))
          ],
          width: { size: 6000, type: "dxa" },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
        }),
      ] : []),

      // Место для подписи
      new Paragraph({
        text: "Администратор / роспись: _____________________",
        spacing: { before: 400, after: 100 },
      }),
    ],
  });

  // Создаем отдельные листы для каждого сотрудника
  workingEmployees.forEach((employee) => {
    // Фильтруем записи для данного сотрудника
    const employeeRecords =
      report.records?.filter((record) =>
        record.employeeIds.includes(employee.id),
      ) || [];

    // Сортируем записи по времени
    employeeRecords.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return a.time.localeCompare(b.time);
    });

    // Подсчитываем итоги для сотрудника
    let empCash = 0;
    let empCard = 0;
    let empOrganizations = 0;
    let empDebt = 0;
    let empCertificate = 0;
    const empSeparateOrgs: Record<string, number> = {};

    employeeRecords.forEach((record) => {
      const share = record.price / record.employeeIds.length;
      if (record.paymentMethod.type === "cash") {
        empCash += share;
      } else if (record.paymentMethod.type === "card") {
        empCard += share;
      } else if (record.paymentMethod.type === "organization") {
        if (record.paymentMethod.organizationId && organizationsInTotal.includes(record.paymentMethod.organizationId)) {
          const orgId = record.paymentMethod.organizationId;
          empSeparateOrgs[orgId] = (empSeparateOrgs[orgId] || 0) + share;
        } else {
          empOrganizations += share;
        }
      } else if (record.paymentMethod.type === "debt") {
        empDebt += share;
      } else if (record.paymentMethod.type === "certificate") {
        empCertificate += share;
      }
    });

    const empTotalSeparateOrgs = Object.values(empSeparateOrgs).reduce((sum, val) => sum + val, 0);
    const empTotal = empCash + empCard + empOrganizations + empTotalSeparateOrgs + empDebt + empCertificate;
    const empSalary =
      salaryResults.find((r) => r.employeeId === employee.id)
        ?.calculatedSalary || 0;

    // Создаем таблицу для записей сотрудника
    const employeeTableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ text: "№", alignment: AlignmentType.CENTER }),
            ],
            width: { size: 500, type: "dxa" },
          }),
          new TableCell({
            children: [
              new Paragraph({ text: "Время", alignment: AlignmentType.CENTER }),
            ],
            width: { size: 800, type: "dxa" },
          }),
          new TableCell({
            children: [
              new Paragraph({ text: "Авто", alignment: AlignmentType.CENTER }),
            ],
            width: { size: 1800, type: "dxa" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Услуга",
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 1800, type: "dxa" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Стоимость",
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 800, type: "dxa" },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Оплата",
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 1000, type: "dxa" },
          }),
          new TableCell({
            children: [
              new Paragraph({ text: "Доля", alignment: AlignmentType.CENTER }),
            ],
            width: { size: 800, type: "dxa" },
          }),
        ],
        tableHeader: true,
      }),
    ];

    if (employeeRecords.length > 0) {
      employeeRecords.forEach((record, index) => {
        // Определяем способ оплаты
        let paymentMethod = "Наличные";
        if (record.paymentMethod.type === "card") {
          paymentMethod = "Карта";
        } else if (record.paymentMethod.type === "organization") {
          paymentMethod =
            record.paymentMethod.organizationName || "Организация";
        } else if (record.paymentMethod.type === "debt") {
          paymentMethod = "Долг";
        } else if (record.paymentMethod.type === "certificate") {
          paymentMethod = "Сертификат";
        }

        const share = record.price / record.employeeIds.length;

        employeeTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    text: (index + 1).toString(),
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: record.time || "",
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
              new TableCell({
                children: [new Paragraph({ text: record.carInfo || "" })],
              }),
              new TableCell({
                children: [new Paragraph({ text: record.service || "" })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: record.price.toFixed(2),
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
              new TableCell({
                children: [new Paragraph({ text: paymentMethod })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: share.toFixed(2),
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          }),
        );
      });
    } else {
      employeeTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  text: "Нет записей",
                  alignment: AlignmentType.CENTER,
                }),
              ],
              columnSpan: 7,
            }),
          ],
        }),
      );
    }

    sections.push({
      properties: {
        page: {
          margin: {
            top: 1000,
            right: 1000,
            bottom: 1000,
            left: 1000,
          },
        },
      },
      children: [
        new Paragraph({
          text: `Отчет по сотруднику: ${employee.name}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 100 },
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({
          text: `Дата: ${format(parseISO(date), "d MMMM yyyy г.", { locale: ru })}`,
          spacing: { after: 100 },
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({
          text: `Роль: ${localEmployeeRoles[employee.id] === "admin" ? "Администратор" : "Мойщик"}`,
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: "ВЫПОЛНЕННЫЕ РАБОТЫ",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 },
        }),

        new Table({
          rows: employeeTableRows,
          width: { size: 8500, type: "dxa" },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
            insideVertical: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
          },
        }),

        new Paragraph({
          text: "ИТОГИ",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),

        new Table({
          rows: [
            ...(empCertificate > 0 ? [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Сертификат" })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: empCertificate.toFixed(2),
                        alignment: AlignmentType.RIGHT,
                      }),
                    ],
                  }),
                ],
              }),
            ] : []),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      text: "Показатель",
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 4000, type: "dxa" },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: "Сумма (BYN)",
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 2000, type: "dxa" },
                }),
              ],
              tableHeader: true,
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Количество машин" })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: employeeRecords.length.toString(),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Долг" })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: empDebt.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Наличные" })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: empCash.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Карта" })] }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: empCard.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
            ...Object.entries(empSeparateOrgs).map(([orgId, orgSum]) => {
              const orgName = organizations.find((o) => o.id === orgId)?.name || "Неизвестная организация";
              return new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: `Безнал (${orgName})` })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: orgSum.toFixed(2),
                        alignment: AlignmentType.RIGHT,
                      }),
                    ],
                  }),
                ],
              });
            }),
            ...(empOrganizations > 0 || Object.keys(empSeparateOrgs).length === 0 ? [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Безнал (организации)" })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: empOrganizations.toFixed(2),
                        alignment: AlignmentType.RIGHT,
                      }),
                    ],
                  }),
                ],
              }),
            ] : []),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ text: "ИТОГО УСЛУГИ", bold: true }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: empTotal.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "ЗАРПЛАТА", bold: true })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: empSalary.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
          ],
          width: { size: 6000, type: "dxa" },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
            insideVertical: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
          },
        }),

        new Paragraph({
          text: `Подпись: ${employee.name} _____________________`,
          spacing: { before: 400, after: 100 },
        }),
      ],
    });
  });

  // Создаем документ со всеми секциями
  const doc = new Document({
    sections: sections,
  });

  return doc;
}
