import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, TextRun, AlignmentType, BorderStyle, PageOrientation } from 'docx';
import type { CarWashRecord, DailyReport, Employee } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

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
    text: `${periodTitle} ООО Автомойка МО`,
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
  // Импорты не нужны, так как они уже импортированы в начале файла

  // Создаем объект с отчетами по дням
  const reports = [{ date: date, report }];

  // Получаем всех работавших сотрудников
  const workingEmployeeIds = new Set<string>();
  reports.forEach(({ report }) => {
    report.employeeIds.forEach(id => workingEmployeeIds.add(id));
  });

  const workingEmployees = Array.from(workingEmployeeIds)
    .map(id => employees.find(emp => emp.id === id))
    .filter(emp => emp !== undefined) as Employee[];

  // Создаем список сотрудников для отчета
  const employeesList = workingEmployees.map(emp => emp.name).join(', ');

  // Создаем таблицу записей с новой структурой: № | Время | Авто | Услуга | Стоимость | Оплата
  const recordsTableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: "№", alignment: AlignmentType.CENTER })],
          width: { size: 500, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "Время", alignment: AlignmentType.CENTER })],
          width: { size: 1000, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "Авто", alignment: AlignmentType.CENTER })],
          width: { size: 2000, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "Услуга", alignment: AlignmentType.CENTER })],
          width: { size: 2000, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "Стоимость", alignment: AlignmentType.CENTER })],
          width: { size: 1000, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "Оплата", alignment: AlignmentType.CENTER })],
          width: { size: 1500, type: "dxa" }
        }),
      ],
      tableHeader: true
    })
  ];

  // Добавляем записи в таблицу
  if (report && report.records && report.records.length > 0) {
    report.records.forEach((record, index) => {
      // Определяем способ оплаты
      let paymentMethod = "Наличные";
      if (record.paymentMethod.type === 'card') {
        paymentMethod = "Карта";
      } else if (record.paymentMethod.type === 'organization' && record.paymentMethod.organizationId) {
        paymentMethod = record.paymentMethod.organizationName || "Организация";
      }

      recordsTableRows.push(
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
              children: [new Paragraph({ text: paymentMethod || "" })]
            }),
          ]
        })
      );
    });
  } else {
    // Если нет записей, добавляем пустую строку
    recordsTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: "Нет данных", alignment: AlignmentType.CENTER })],
            columnSpan: 6 // Обновлено с 5 до 6, так как теперь у нас 6 колонок
          })
        ]
      })
    );
  }

  // Создаем таблицу для отчета по дням
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: "Дата", alignment: AlignmentType.CENTER })],
          width: { size: 1500, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "Карта/Безнал", alignment: AlignmentType.CENTER })],
          width: { size: 1500, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "Нал", alignment: AlignmentType.CENTER })],
          width: { size: 1500, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "Всего", alignment: AlignmentType.CENTER })],
          width: { size: 1500, type: "dxa" }
        }),
        new TableCell({
          children: [new Paragraph({ text: "ЗП", alignment: AlignmentType.CENTER })],
          width: { size: 1500, type: "dxa" }
        }),
      ],
      tableHeader: true
    })
  ];

  // Рассчитываем итоги
  let totalCash = 0;
  let totalNonCash = 0;
  let totalAmount = 0;
  let totalSalary = 0;
  let perEmployee = "0.00"; // Инициализируем переменную perEmployee

  // Добавляем строки с данными
  reports.forEach(({ date, report }) => {
    const formattedDate = format(parseISO(date), 'd MMMM (EEE)', { locale: ru });

    // Расчет ЗП
    const totalRevenue = report.totalCash + report.totalNonCash;

    // Определяем дату и метод расчета из localStorage
    const savedSalaryDate = localStorage.getItem('salaryCalculationDate') || format(new Date(), 'yyyy-MM-dd');
    const savedSalaryMethod = localStorage.getItem('salaryCalculationMethod') || 'percentage';

    // Определяем, какой метод расчета использовать
    const useCurrentMethod = date >= savedSalaryDate;
    const calculationMethod = useCurrentMethod ? savedSalaryMethod : 'percentage';

    let salary = 0;
    if (calculationMethod === 'percentage') {
      // 27% от общей выручки
      salary = totalRevenue * 0.27;
    } else {
      // 60 руб + 10% от общей выручки
      salary = 60 + (totalRevenue * 0.1);
    }

    // Распределение на сотрудников
    perEmployee = (workingEmployees.length > 0) ?
      (salary / workingEmployees.length).toFixed(2) :
      salary.toFixed(2);

    // Обновляем итоги
    totalCash += report.totalCash;
    totalNonCash += report.totalNonCash;
    totalAmount += totalRevenue;
    totalSalary += salary;

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: formattedDate })]}),
          new TableCell({ children: [new Paragraph({ text: report.totalNonCash.toFixed(2) })]}),
          new TableCell({ children: [new Paragraph({ text: report.totalCash.toFixed(2) })]}),
          new TableCell({ children: [new Paragraph({ text: totalRevenue.toFixed(2) })]}),
          new TableCell({ children: [new Paragraph({ text: salary.toFixed(2) })]}),
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
            text: "Итого:",
            alignment: AlignmentType.RIGHT,
            bold: true
          })],
          columnSpan: 1
        }),
        new TableCell({
          children: [new Paragraph({
            text: totalNonCash.toFixed(2),
            alignment: AlignmentType.RIGHT,
            bold: true
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: totalCash.toFixed(2),
            alignment: AlignmentType.RIGHT,
            bold: true
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: totalAmount.toFixed(2),
            alignment: AlignmentType.RIGHT,
            bold: true
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: totalSalary.toFixed(2),
            alignment: AlignmentType.RIGHT,
            bold: true
          })],
        }),
      ],
    })
  );

  // Получаем метод расчета для отображения
  const savedSalaryMethod = localStorage.getItem('salaryCalculationMethod') || 'percentage';
  const salaryMethodDescription = savedSalaryMethod === 'percentage'
    ? '27% от общей выручки'
    : '60 руб. + 10% от общей выручки';

  // Создаем экземпляр документа
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Заголовок отчета
          new Paragraph({
            text: "Ведомость ежедневная выполненных работ ООО Автомойка МО",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 100 }
          }),

          // Дата отчета
          new Paragraph({
            text: `Дата: ${format(parseISO(date), 'd MMMM yyyy г.', { locale: ru })}`,
            spacing: { after: 100 }
          }),

          // Информация о сотрудниках
          new Paragraph({
            text: `Работали: ${employeesList}`,
            spacing: { after: 200 }
          }),

          // Таблица записей
          new Paragraph({
            text: "Список выполненных работ:",
            spacing: { before: 100, after: 100 }
          }),

          // Новая таблица с записями
          new Table({
            rows: recordsTableRows,
            width: { size: 8000, type: "dxa" },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            }
          }),

          // Таблица итогов
          new Paragraph({
            text: "Итоги:",
            spacing: { before: 200, after: 100 }
          }),

          // Таблица отчета с итогами
          new Table({
            rows: tableRows,
            width: { size: 8000, type: "dxa" },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            }
          }),

          // Добавляем информацию о методе расчета зарплаты
          new Paragraph({
            text: `Метод расчета зарплаты: ${salaryMethodDescription}`,
            spacing: { before: 200, after: 100 }
          }),

          // Добавляем информацию о распределении зарплаты
          new Paragraph({
            text: "Распределение зарплаты:",
            spacing: { before: 100, after: 100 }
          }),

          new Paragraph({
            text: `По ${perEmployee} BYN на каждого сотрудника`,
            spacing: { after: 200 }
          }),

          // Место для подписи
          new Paragraph({
            text: "Администратор / роспись:",
            spacing: { before: 400, after: 100 }
          }),

          new Paragraph({
            text: "_____________________",
            spacing: { after: 400 }
          }),
        ]
      }
    ]
  });

  return doc;
}
