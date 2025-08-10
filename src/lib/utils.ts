import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, TextRun, AlignmentType, BorderStyle, PageOrientation } from 'docx';
import type { CarWashRecord, DailyReport, Employee } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SalaryCalculator } from '@/components/SalaryCalculator';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Функция для генерации docx файла с отчетом за период (неделя или месяц)
export const generatePeriodReportDocx = (
  reports: { date: string; report: DailyReport }[],
  employees: Employee[],
  periodStats: { cash: number; nonCash: number; total: number; salary: number },
  periodType: 'week' | 'month'
): Document => {
  // Форматируем заголовок периода
  const periodTitle = periodType === 'week' ? 'Недельный отчет' : 'Месячный отчет';
  const periodDateRange = reports.length > 0 ?
    `${format(parseISO(reports[0].date), 'd MMMM', { locale: ru })} - ${format(parseISO(reports[reports.length - 1].date), 'd MMMM yyyy', { locale: ru })}` :
    '';

  // Заголовок отчета
  const title = new Paragraph({
    text: `${periodTitle} DetailLab`,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 100 }
  });

  // Дата и сотрудники
  const dateInfo = new Paragraph({
    text: `Период: ${periodDateRange}`,
    spacing: { after: 100 }
  });

  // Получаем всех работавших сотрудников
  const workingEmployeeIds = new Set<string>();
  reports.forEach(({ report }) => {
    report.employeeIds.forEach(id => workingEmployeeIds.add(id));
  });

  const workingEmployees = Array.from(workingEmployeeIds)
    .map(id => employees.find(e => e.id === id))
    .filter(Boolean) as Employee[];

  // Информация о сотрудниках
  const employeesInfo = new Paragraph({
    text: `Работали: ${workingEmployees.map(e => e.name).join(', ')}`,
    spacing: { after: 200 }
  });

  // Создаем таблицу с данными за период
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: 'Дата', alignment: AlignmentType.CENTER })], width: { size: 15, type: 'pct' } }),
        new TableCell({ children: [new Paragraph({ text: 'Кол-во заказов', alignment: AlignmentType.CENTER })], width: { size: 15, type: 'pct' } }),
        new TableCell({ children: [new Paragraph({ text: 'Наличные (BYN)', alignment: AlignmentType.CENTER })], width: { size: 20, type: 'pct' } }),
        new TableCell({ children: [new Paragraph({ text: 'Безналичные (BYN)', alignment: AlignmentType.CENTER })], width: { size: 20, type: 'pct' } }),
        new TableCell({ children: [new Paragraph({ text: 'Всего (BYN)', alignment: AlignmentType.CENTER })], width: { size: 15, type: 'pct' } }),
        new TableCell({ children: [new Paragraph({ text: 'Зарплата (BYN)', alignment: AlignmentType.CENTER })], width: { size: 15, type: 'pct' } }),
      ],
      tableHeader: true
    }),
  ];

  // Добавляем строки с данными
  reports.forEach(({ date, report }) => {
    const formattedDate = format(parseISO(date), 'd MMMM (EEE)', { locale: ru });
    const orderCount = report.records.length;
    const totalDay = report.totalCash + report.totalNonCash;
    const salary = totalDay * 0.27;

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: formattedDate })] }),
          new TableCell({ children: [new Paragraph({ text: orderCount.toString(), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: report.totalCash.toFixed(2), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: report.totalNonCash.toFixed(2), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: totalDay.toFixed(2), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: salary.toFixed(2), alignment: AlignmentType.RIGHT })] }),
        ]
      })
    );
  });

  // Добавляем строку с итогами
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            text: "ИТОГО:",
            bold: true
          })],
          columnSpan: 2
        }),
        new TableCell({
          children: [new Paragraph({
            text: periodStats.cash.toFixed(2),
            bold: true,
            alignment: AlignmentType.RIGHT
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: periodStats.nonCash.toFixed(2),
            bold: true,
            alignment: AlignmentType.RIGHT
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: periodStats.total.toFixed(2),
            bold: true,
            alignment: AlignmentType.RIGHT
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: periodStats.salary.toFixed(2),
            bold: true,
            alignment: AlignmentType.RIGHT
          })],
        }),
      ]
    })
  );

  const reportsTable = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: 'pct',
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    }
  });

  // Добавляем информацию о распределении зарплаты
  const salaryDistribution = new Paragraph({
    text: `Распределение зарплаты:`,
    spacing: { before: 200, after: 100 }
  });

  const salaryPerEmployee = periodStats.salary / workingEmployees.length;

  const salaryPerEmployeeText = new Paragraph({
    text: `На каждого сотрудника (поровну): ${salaryPerEmployee.toFixed(2)} BYN`,
    spacing: { after: 100 }
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
          salaryPerEmployeeText
        ]
      }
    ]
  });
};

// Генерация отчета в формате Word
export function generateDailyReportDocx(report: DailyReport, employees: Employee[], date: string) {
  // Получаем всех работавших сотрудников
  const workingEmployeeIds = new Set<string>();
  report.employeeIds.forEach(id => workingEmployeeIds.add(id));

  const workingEmployees = Array.from(workingEmployeeIds)
    .map(id => employees.find(emp => emp.id === id))
    .filter(emp => emp !== undefined) as Employee[];

  // Создаем список сотрудников для отчета
  const employeesList = workingEmployees.map(emp => emp.name).join(', ');

  // Настройки зарплаты
  const savedSalaryMethod = localStorage.getItem('salaryCalculationMethod') || 'minimumWithPercentage';
  const minimumPaymentSettings = JSON.parse(localStorage.getItem('minimumPaymentSettings') || '{"minimumPaymentWasher":0,"percentageWasher":10,"minimumPaymentAdmin":0,"adminCashPercentage":3,"adminCarWashPercentage":2}');
  const localEmployeeRoles = report.dailyEmployeeRoles || {};

  // Карта флагов минималки из dailyEmployeeRoles (min_<id>)
  const minimumOverride = Array.from(workingEmployeeIds).reduce<Record<string, boolean>>((acc, empId) => {
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
    minimumOverride
  );

  const salaryResults = salaryCalculator.calculateSalaries();

  // Подсчитываем итоги
  let totalCash = report.totalCash;
  let totalCard = report.totalNonCash;
  let totalOrganizations = 0;
  if (report.records) {
    totalOrganizations = report.records.reduce((sum, record) => {
      return sum + (record.paymentMethod.type === 'organization' ? record.price : 0);
    }, 0);
  }
  const totalRevenue = totalCash + totalCard + totalOrganizations;
  const totalSalary = salaryResults.reduce((sum, result) => sum + result.calculatedSalary, 0);

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
        alignment: AlignmentType.CENTER
      }),

      // Дата отчета
      new Paragraph({
        text: `Дата: ${format(parseISO(date), 'd MMMM yyyy г.', { locale: ru })}`,
        spacing: { after: 100 },
        alignment: AlignmentType.CENTER
      }),

      // Информация о сотрудниках
      new Paragraph({
        text: `Работали: ${employeesList}`,
        spacing: { after: 200 }
      }),

      // Общие итоги
      new Paragraph({
        text: "ОБЩИЕ ИТОГИ",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),

      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "Показатель", alignment: AlignmentType.CENTER })],
                width: { size: 4000, type: "dxa" }
              }),
              new TableCell({
                children: [new Paragraph({ text: "Сумма (BYN)", alignment: AlignmentType.CENTER })],
                width: { size: 2000, type: "dxa" }
              }),
            ],
            tableHeader: true
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Наличные" })] }),
              new TableCell({ children: [new Paragraph({ text: totalCash.toFixed(2), alignment: AlignmentType.RIGHT })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Карта" })] }),
              new TableCell({ children: [new Paragraph({ text: totalCard.toFixed(2), alignment: AlignmentType.RIGHT })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "Безнал (организации)" })] }),
              new TableCell({ children: [new Paragraph({ text: totalOrganizations.toFixed(2), alignment: AlignmentType.RIGHT })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "ИТОГО ВЫРУЧКА", bold: true })]
              }),
              new TableCell({
                children: [new Paragraph({ text: totalRevenue.toFixed(2), alignment: AlignmentType.RIGHT, bold: true })]
              }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "ИТОГО ЗАРПЛАТА", bold: true })]
              }),
              new TableCell({
                children: [new Paragraph({ text: totalSalary.toFixed(2), alignment: AlignmentType.RIGHT, bold: true })]
              }),
            ]
          }),
        ],
        width: { size: 6000, type: "dxa" },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        }
      }),

      // Зарплата по сотрудникам
      new Paragraph({
        text: "ЗАРПЛАТА ПО СОТРУДНИКАМ",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),

      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "Сотрудник", alignment: AlignmentType.CENTER })],
                width: { size: 3000, type: "dxa" }
              }),
              new TableCell({
                children: [new Paragraph({ text: "Роль", alignment: AlignmentType.CENTER })],
                width: { size: 1500, type: "dxa" }
              }),
              new TableCell({
                children: [new Paragraph({ text: "Зарплата (BYN)", alignment: AlignmentType.CENTER })],
                width: { size: 1500, type: "dxa" }
              }),
            ],
            tableHeader: true
          }),
          ...salaryResults.map(result =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: result.employeeName })] }),
                new TableCell({ children: [new Paragraph({ text: result.role === 'admin' ? 'Админ' : 'Мойщик', alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: result.calculatedSalary.toFixed(2), alignment: AlignmentType.RIGHT })] }),
              ]
            })
          )
        ],
        width: { size: 6000, type: "dxa" },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        }
      }),

      // Место для подписи
      new Paragraph({
        text: "Администратор / роспись: _____________________",
        spacing: { before: 400, after: 100 }
      }),
    ]
  });

  // Создаем отдельные листы для каждого сотрудника
  workingEmployees.forEach(employee => {
    // Фильтруем записи для данного сотрудника
    const employeeRecords = report.records?.filter(record =>
      record.employeeIds.includes(employee.id)
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

    employeeRecords.forEach(record => {
      const share = record.price / record.employeeIds.length;
      if (record.paymentMethod.type === 'cash') {
        empCash += share;
      } else if (record.paymentMethod.type === 'card') {
        empCard += share;
      } else if (record.paymentMethod.type === 'organization') {
        empOrganizations += share;
      }
    });

    const empTotal = empCash + empCard + empOrganizations;
    const empSalary = salaryResults.find(r => r.employeeId === employee.id)?.calculatedSalary || 0;

    // Создаем таблицу для записей сотрудника
    const employeeTableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: "№", alignment: AlignmentType.CENTER })],
            width: { size: 500, type: "dxa" }
          }),
          new TableCell({
            children: [new Paragraph({ text: "Время", alignment: AlignmentType.CENTER })],
            width: { size: 800, type: "dxa" }
          }),
          new TableCell({
            children: [new Paragraph({ text: "Авто", alignment: AlignmentType.CENTER })],
            width: { size: 1800, type: "dxa" }
          }),
          new TableCell({
            children: [new Paragraph({ text: "Услуга", alignment: AlignmentType.CENTER })],
            width: { size: 1800, type: "dxa" }
          }),
          new TableCell({
            children: [new Paragraph({ text: "Стоимость", alignment: AlignmentType.CENTER })],
            width: { size: 800, type: "dxa" }
          }),
          new TableCell({
            children: [new Paragraph({ text: "Оплата", alignment: AlignmentType.CENTER })],
            width: { size: 1000, type: "dxa" }
          }),
          new TableCell({
            children: [new Paragraph({ text: "Доля", alignment: AlignmentType.CENTER })],
            width: { size: 800, type: "dxa" }
          }),
        ],
        tableHeader: true
      })
    ];

    if (employeeRecords.length > 0) {
      employeeRecords.forEach((record, index) => {
        // Определяем способ оплаты
        let paymentMethod = "Наличные";
        if (record.paymentMethod.type === 'card') {
          paymentMethod = "Карта";
        } else if (record.paymentMethod.type === 'organization') {
          paymentMethod = record.paymentMethod.organizationName || "Организация";
        }

        const share = record.price / record.employeeIds.length;

        employeeTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })]
              }),
              new TableCell({
                children: [new Paragraph({ text: record.time || "", alignment: AlignmentType.CENTER })]
              }),
              new TableCell({
                children: [new Paragraph({ text: record.carInfo || "" })]
              }),
              new TableCell({
                children: [new Paragraph({ text: record.service || "" })]
              }),
              new TableCell({
                children: [new Paragraph({ text: record.price.toFixed(2), alignment: AlignmentType.RIGHT })]
              }),
              new TableCell({
                children: [new Paragraph({ text: paymentMethod })]
              }),
              new TableCell({
                children: [new Paragraph({ text: share.toFixed(2), alignment: AlignmentType.RIGHT })]
              }),
            ]
          })
        );
      });
    } else {
      employeeTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Нет записей", alignment: AlignmentType.CENTER })],
              columnSpan: 7
            })
          ]
        })
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
          alignment: AlignmentType.CENTER
        }),

        new Paragraph({
          text: `Дата: ${format(parseISO(date), 'd MMMM yyyy г.', { locale: ru })}`,
          spacing: { after: 100 },
          alignment: AlignmentType.CENTER
        }),

        new Paragraph({
          text: `Роль: ${localEmployeeRoles[employee.id] === 'admin' ? 'Администратор' : 'Мойщик'}`,
          spacing: { after: 200 }
        }),

        new Paragraph({
          text: "ВЫПОЛНЕННЫЕ РАБОТЫ",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 }
        }),

        new Table({
          rows: employeeTableRows,
          width: { size: 8500, type: "dxa" },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          }
        }),

        new Paragraph({
          text: "ИТОГИ",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),

        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Показатель", alignment: AlignmentType.CENTER })],
                  width: { size: 4000, type: "dxa" }
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Сумма (BYN)", alignment: AlignmentType.CENTER })],
                  width: { size: 2000, type: "dxa" }
                }),
              ],
              tableHeader: true
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Количество машин" })] }),
                new TableCell({ children: [new Paragraph({ text: employeeRecords.length.toString(), alignment: AlignmentType.RIGHT })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Наличные" })] }),
                new TableCell({ children: [new Paragraph({ text: empCash.toFixed(2), alignment: AlignmentType.RIGHT })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Карта" })] }),
                new TableCell({ children: [new Paragraph({ text: empCard.toFixed(2), alignment: AlignmentType.RIGHT })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Безнал (организации)" })] }),
                new TableCell({ children: [new Paragraph({ text: empOrganizations.toFixed(2), alignment: AlignmentType.RIGHT })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "ИТОГО УСЛУГИ", bold: true })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: empTotal.toFixed(2), alignment: AlignmentType.RIGHT, bold: true })]
                }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "ЗАРПЛАТА", bold: true })]
                }),
                new TableCell({
                  children: [new Paragraph({ text: empSalary.toFixed(2), alignment: AlignmentType.RIGHT, bold: true })]
                }),
              ]
            }),
          ],
          width: { size: 6000, type: "dxa" },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          }
        }),

        new Paragraph({
          text: `Подпись: ${employee.name} _____________________`,
          spacing: { before: 400, after: 100 }
        }),
      ]
    });
  });

  // Создаем документ со всеми секциями
  const doc = new Document({
    sections: sections
  });

  return doc;
}
