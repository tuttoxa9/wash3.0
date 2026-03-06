import { createSalaryCalculator } from "@/components/SalaryCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TooltipModal from "@/components/ui/tooltip-modal";
import { useAppContext } from "@/lib/context/AppContext";
import { useToast } from "@/lib/hooks/useToast";
import {
  carWashService,
  dailyReportService,
  dailyRolesService,
} from "@/lib/services/supabaseService";
import { determineEmployeeRole } from "@/lib/utils";
import { format, isBefore, isEqual, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  FileDown,
  Info,
  Loader2,
  TrendingUp,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Типы для отчета
interface GeneralReportData {
  totalCash: number;
  totalCard: number;
  totalOrganizations: number;
  totalDebt: number;
  totalRevenue: number;
  totalSalaries: number;
  organizationBreakdown: { name: string; amount: number }[];
  dailyData: {
    date: string;
    cash: number;
    card: number;
    organizations: number;
    debt: number;
    total: number;
    recordsCount: number;
  }[];
  averageDaily: number;
  maxDay: { date: string; amount: number };
  minDay: { date: string; amount: number };
  insights: string[];
}

const GeneralRevenueReport: React.FC = () => {
  const { state } = useAppContext();
  const { toast } = useToast();

  const [generalReportLoading, setGeneralReportLoading] = useState(false);
  const [generalStartDate, setGeneralStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [generalEndDate, setGeneralEndDate] = useState(new Date());
  const [generalReportData, setGeneralReportData] =
    useState<GeneralReportData | null>(null);

  // Состояние для отображения всех клиентов
  const [showAllClients, setShowAllClients] = useState(false);

  // Анимационные варианты
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const generateInsights = (data: Partial<GeneralReportData>): string[] => {
    const insights: string[] = [];
    if (!data.dailyData || data.dailyData.length === 0) return insights;

    const totalRev = data.totalRevenue || 0;
    const maxDay = data.maxDay;
    const workingDays = data.dailyData.filter((d) => d.recordsCount > 0);
    const avgCheck =
      workingDays.reduce((sum, d) => sum + d.recordsCount, 0) > 0
        ? totalRev / workingDays.reduce((sum, d) => sum + d.recordsCount, 0)
        : 0;

    // Инсайт 1: Максимальный день
    if (maxDay && maxDay.amount > 0) {
      insights.push(
        `🔥 Рекордная выручка была **${maxDay.date}** (${maxDay.amount.toFixed(0)} BYN)`,
      );
    }

    // Инсайт 2: Самый частый тип оплаты
    const cash = data.totalCash || 0;
    const card = data.totalCard || 0;
    const orgs = data.totalOrganizations || 0;
    const maxPayment = Math.max(cash, card, orgs);
    if (maxPayment === cash && cash > 0)
      insights.push(
        `💵 Чаще всего клиенты платят **Наличными** (${((cash / totalRev) * 100).toFixed(0)}%)`,
      );
    else if (maxPayment === card && card > 0)
      insights.push(
        `💳 Основной способ оплаты — **Карта** (${((card / totalRev) * 100).toFixed(0)}%)`,
      );
    else if (maxPayment === orgs && orgs > 0)
      insights.push(
        `🏢 Большая часть выручки — от **Организаций** (${((orgs / totalRev) * 100).toFixed(0)}%)`,
      );

    // Инсайт 3: Средний чек
    if (avgCheck > 0) {
      insights.push(`📈 Средний чек составляет **${avgCheck.toFixed(1)} BYN**`);
    }

    // Инсайт 4: Загруженность
    const zeroDays = data.dailyData.filter((d) => d.recordsCount === 0).length;
    if (zeroDays > 0) {
      insights.push(`⚠️ За период было **${zeroDays} дней** без работы.`);
    }

    return insights;
  };

  const loadGeneralReport = async () => {
    setGeneralReportLoading(true);
    try {
      const startStr = format(generalStartDate, "yyyy-MM-dd");
      const endStr = format(generalEndDate, "yyyy-MM-dd");

      const [allRecords, rolesMap, reportsList] = await Promise.all([
        carWashService.getByDateRange(startStr, endStr),
        dailyRolesService.getDailyRolesByDateRange(startStr, endStr),
        dailyReportService.getByDateRange(startStr, endStr),
      ]);

      const reportsMap: Record<string, any> = {};
      reportsList.forEach((report) => {
        const dateStr =
          typeof report.date === "string"
            ? report.date
            : format(report.date, "yyyy-MM-dd");
        reportsMap[dateStr] = report;
      });

      // Получаем все даты в диапазоне
      const dateRange: string[] = [];
      const currentDate = new Date(generalStartDate);
      while (
        isBefore(currentDate, generalEndDate) ||
        isEqual(currentDate, generalEndDate)
      ) {
        if (!Number.isNaN(currentDate.getTime())) {
          dateRange.push(format(currentDate, "yyyy-MM-dd"));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      let totalCash = 0;
      let totalCard = 0;
      let totalOrganizations = 0;
      let totalDebt = 0;
      const organizationBreakdown: Record<string, number> = {};
      const dailyBreakdown: Record<
        string,
        {
          cash: number;
          card: number;
          organizations: number;
          debt: number;
          recordsCount: number;
        }
      > = {};

      dateRange.forEach((date) => {
        dailyBreakdown[date] = {
          cash: 0,
          card: 0,
          organizations: 0,
          debt: 0,
          recordsCount: 0,
        };
      });

      allRecords.forEach((record) => {
        const recordDate =
          typeof record.date === "string"
            ? record.date
            : format(record.date, "yyyy-MM-dd");
        if (!dailyBreakdown[recordDate]) {
          dailyBreakdown[recordDate] = {
            cash: 0,
            card: 0,
            organizations: 0,
            debt: 0,
            recordsCount: 0,
          };
        }

        dailyBreakdown[recordDate].recordsCount++;

        if (record.paymentMethod.type === "cash") {
          totalCash += record.price;
          dailyBreakdown[recordDate].cash += record.price;
        } else if (record.paymentMethod.type === "card") {
          totalCard += record.price;
          dailyBreakdown[recordDate].card += record.price;
        } else if (record.paymentMethod.type === "organization") {
          totalOrganizations += record.price;
          dailyBreakdown[recordDate].organizations += record.price;
          const orgName =
            record.paymentMethod.organizationName ||
            state.organizations.find(
              (org) => org.id === record.paymentMethod.organizationId,
            )?.name ||
            "Неизвестная организация";
          organizationBreakdown[orgName] =
            (organizationBreakdown[orgName] || 0) + record.price;
        } else if (record.paymentMethod.type === "debt") {
          totalDebt += record.price;
          dailyBreakdown[recordDate].debt += record.price;
        }
      });

      const totalRevenue =
        totalCash + totalCard + totalOrganizations + totalDebt;

      const dailyData = dateRange.map((date) => {
        const dayData = dailyBreakdown[date] || {
          cash: 0,
          card: 0,
          organizations: 0,
          debt: 0,
          recordsCount: 0,
        };
        const total =
          dayData.cash + dayData.card + dayData.organizations + dayData.debt;
        return {
          date: format(parseISO(date), "dd.MM"),
          cash: dayData.cash,
          card: dayData.card,
          organizations: dayData.organizations,
          debt: dayData.debt,
          total,
          recordsCount: dayData.recordsCount,
        };
      });

      const averageDaily =
        dailyData.length > 0 ? totalRevenue / dailyData.length : 0;
      const maxDay = dailyData.reduce(
        (max, day) =>
          day.total > max.amount ? { date: day.date, amount: day.total } : max,
        { date: "", amount: 0 },
      );
      const minDay = dailyData.reduce(
        (min, day) =>
          day.total < min.amount || min.amount === 0
            ? { date: day.date, amount: day.total }
            : min,
        { date: "", amount: Number.MAX_VALUE },
      );

      let totalSalaries = 0;
      if (state.salaryCalculationMethod === "minimumWithPercentage") {
        const recordsByDate: Record<string, any[]> = {};
        allRecords.forEach((rec) => {
          const recDate =
            typeof rec.date === "string"
              ? rec.date
              : format(rec.date, "yyyy-MM-dd");
          if (!recordsByDate[recDate]) {
            recordsByDate[recDate] = [];
          }
          recordsByDate[recDate].push(rec);
        });

        dateRange.forEach((dateStr) => {
          const recordsForDay = recordsByDate[dateStr] || [];
          const dayRoles = rolesMap[dateStr] || {};
          const employeeRolesForDay: Record<string, "admin" | "washer"> = {};
          const minimumOverrideForDay: Record<string, boolean> = {};

          const participantIds = new Set<string>();
          Object.keys(dayRoles).forEach((key) => {
            if (!key.startsWith("min_")) participantIds.add(key);
          });
          recordsForDay.forEach((rec) =>
            rec.employeeIds.forEach((id: string) => participantIds.add(id)),
          );

          participantIds.forEach((empId) => {
            employeeRolesForDay[empId] = determineEmployeeRole(
              empId,
              dateStr,
              dayRoles,
              state.employees,
            );
            const minKey = `min_${empId}`;
            const minVal = dayRoles[minKey] as any;
            minimumOverrideForDay[empId] =
              minVal !== "false" && minVal !== false;
          });

          const salaryCalculator = createSalaryCalculator(
            state.minimumPaymentSettings,
            recordsForDay,
            employeeRolesForDay,
            state.employees,
            minimumOverrideForDay,
          );

          const dailyResults = salaryCalculator.calculateSalaries();
          const dayReport = reportsMap[dateStr];

          dailyResults.forEach((res) => {
            let salary = res.calculatedSalary;
            if (
              dayReport?.manualSalaries &&
              dayReport.manualSalaries[res.employeeId] !== undefined
            ) {
              salary = dayReport.manualSalaries[res.employeeId];
            }
            totalSalaries += salary;
          });
        });
      }

      const generatedData: Partial<GeneralReportData> = {
        totalCash,
        totalCard,
        totalOrganizations,
        totalDebt,
        totalRevenue,
        totalSalaries,
        organizationBreakdown: Object.entries(organizationBreakdown).map(
          ([name, amount]) => ({ name, amount }),
        ),
        dailyData,
        averageDaily,
        maxDay,
        minDay:
          minDay.amount === Number.MAX_VALUE ? { date: "", amount: 0 } : minDay,
      };

      generatedData.insights = generateInsights(generatedData);

      setGeneralReportData(generatedData as GeneralReportData);
    } catch (error) {
      console.error("Ошибка при загрузке общего отчёта:", error);
      toast.error("Ошибка при загрузке данных общего отчёта");
    } finally {
      setGeneralReportLoading(false);
    }
  };

  const exportGeneralReportToWord = async () => {
    if (!generalReportData) {
      toast.error("Нет данных для экспорта");
      return;
    }

    try {
      const summaryTableRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Тип оплаты", bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Сумма (BYN)", bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
          tableHeader: true,
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Наличные" })] }),
            new TableCell({
              children: [
                new Paragraph({
                  text: generalReportData.totalCash.toFixed(2),
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
                  text: generalReportData.totalCard.toFixed(2),
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Безнал" })] }),
            new TableCell({
              children: [
                new Paragraph({
                  text: generalReportData.totalOrganizations.toFixed(2),
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Долги" })] }),
            new TableCell({
              children: [
                new Paragraph({
                  text: generalReportData.totalDebt.toFixed(2),
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Итого выручка", bold: true }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: generalReportData.totalRevenue.toFixed(2),
                      bold: true,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Итого зарплаты", bold: true }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: generalReportData.totalSalaries.toFixed(2),
                      bold: true,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        }),
      ];

      const orgTableRows = [];
      if (generalReportData.organizationBreakdown.length > 0) {
        orgTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Организация", bold: true }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Сумма (BYN)", bold: true }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
            ],
            tableHeader: true,
          }),
        );
        generalReportData.organizationBreakdown.forEach((org) => {
          orgTableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: org.name })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: org.amount.toFixed(2),
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
          );
        });
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: "Общий отчёт по выручке",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 },
              }),
              new Paragraph({
                text: `Период: ${format(generalStartDate, "dd.MM.yyyy")} - ${format(generalEndDate, "dd.MM.yyyy")}`,
                spacing: { after: 300 },
              }),
              new Paragraph({
                text: "Сводка по выручке:",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200 },
              }),
              new Table({
                rows: summaryTableRows,
                width: { size: 5000, type: WidthType.DXA },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
              ...(orgTableRows.length > 0
                ? [
                    new Paragraph({
                      text: "Детализация по организациям:",
                      heading: HeadingLevel.HEADING_2,
                      spacing: { before: 400, after: 200 },
                    }),
                    new Table({
                      rows: orgTableRows,
                      width: { size: 5000, type: WidthType.DXA },
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                        insideHorizontal: {
                          style: BorderStyle.SINGLE,
                          size: 1,
                        },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                      },
                    }),
                  ]
                : []),
              new Paragraph({
                spacing: { before: 400, after: 400 },
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Отчет сформирован: ${format(new Date(), "dd.MM.yyyy HH:mm:ss", { locale: ru })}`,
                    size: 18,
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(
        blob,
        `Общий_отчет_выручка_${format(new Date(), "dd-MM-yyyy")}.docx`,
      );
      toast.success("Документ успешно экспортирован");
    } catch (error) {
      console.error("Ошибка при экспорте документа:", error);
      toast.error("Ошибка при экспорте документа");
    }
  };

  // Вспомогательные рендеры
  const renderProgressBar = () => {
    if (!generalReportData || generalReportData.totalRevenue === 0) return null;
    const pCash =
      (generalReportData.totalCash / generalReportData.totalRevenue) * 100;
    const pCard =
      (generalReportData.totalCard / generalReportData.totalRevenue) * 100;
    const pOrg =
      (generalReportData.totalOrganizations / generalReportData.totalRevenue) *
      100;
    const pDebt =
      (generalReportData.totalDebt / generalReportData.totalRevenue) * 100;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Структура выручки
        </h4>
        <div className="w-full h-4 sm:h-6 bg-secondary rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${pCash}%` }}
            className="h-full bg-blue-500 transition-all duration-500"
            title={`Наличные: ${pCash.toFixed(1)}%`}
          />
          <div
            style={{ width: `${pCard}%` }}
            className="h-full bg-green-500 transition-all duration-500"
            title={`Карта: ${pCard.toFixed(1)}%`}
          />
          <div
            style={{ width: `${pOrg}%` }}
            className="h-full bg-purple-500 transition-all duration-500"
            title={`Безнал: ${pOrg.toFixed(1)}%`}
          />
          <div
            style={{ width: `${pDebt}%` }}
            className="h-full bg-red-500 transition-all duration-500"
            title={`Долг: ${pDebt.toFixed(1)}%`}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
          <div className="flex flex-col p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />{" "}
              <span className="text-muted-foreground">Нал</span>
            </div>
            <span className="font-bold">
              {generalReportData.totalCash.toFixed(0)} BYN
            </span>
            <span className="text-xs opacity-70">{pCash.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col p-2 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800/30">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />{" "}
              <span className="text-muted-foreground">Карта</span>
            </div>
            <span className="font-bold">
              {generalReportData.totalCard.toFixed(0)} BYN
            </span>
            <span className="text-xs opacity-70">{pCard.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col p-2 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/30">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />{" "}
              <span className="text-muted-foreground">Безнал</span>
            </div>
            <span className="font-bold">
              {generalReportData.totalOrganizations.toFixed(0)} BYN
            </span>
            <span className="text-xs opacity-70">{pOrg.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col p-2 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800/30">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />{" "}
              <span className="text-muted-foreground">Долг</span>
            </div>
            <span className="font-bold">
              {generalReportData.totalDebt.toFixed(0)} BYN
            </span>
            <span className="text-xs opacity-70">{pDebt.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Шапка фильтров */}
      <div className="card-with-shadow p-4 bg-card/80 backdrop-blur-sm border border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Панель управления отчетом
          </h3>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => {
                const today = new Date();
                setGeneralStartDate(today);
                setGeneralEndDate(today);
              }}
              className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-md whitespace-nowrap transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                setGeneralStartDate(weekAgo);
                setGeneralEndDate(today);
              }}
              className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-md whitespace-nowrap transition-colors"
            >
              7 дней
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                setGeneralStartDate(monthAgo);
                setGeneralEndDate(today);
              }}
              className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-md whitespace-nowrap transition-colors"
            >
              30 дней
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setGeneralStartDate(
                  new Date(today.getFullYear(), today.getMonth(), 1),
                );
                setGeneralEndDate(today);
              }}
              className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-md whitespace-nowrap transition-colors"
            >
              Месяц
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              С
            </label>
            <div className="relative">
              <input
                type="date"
                value={format(generalStartDate, "yyyy-MM-dd")}
                onChange={(e) => setGeneralStartDate(new Date(e.target.value))}
                className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-lg bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <CalendarIcon className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              По
            </label>
            <div className="relative">
              <input
                type="date"
                value={format(generalEndDate, "yyyy-MM-dd")}
                onChange={(e) => setGeneralEndDate(new Date(e.target.value))}
                className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-lg bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <CalendarIcon className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <button
            onClick={loadGeneralReport}
            disabled={generalReportLoading}
            className="w-full sm:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {generalReportLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Анализ...
              </>
            ) : (
              "Сформировать отчёт"
            )}
          </button>
        </div>
      </div>

      {generalReportData && (
        <motion.div
          variants={containerVariants as any}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Слой 1: Hero секция + Инсайты */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              variants={itemVariants as any}
              className="lg:col-span-2 relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-primary/90 to-purple-600/90 dark:from-primary/20 dark:to-purple-900/40 text-white shadow-xl border border-primary/20 backdrop-blur-md"
            >
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <TrendingUp className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-medium opacity-90 drop-shadow-sm">
                      Итоговая выручка
                    </h2>
                    <button
                      onClick={exportGeneralReportToWord}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
                      title="Экспорт в Word"
                    >
                      <FileDown className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight drop-shadow-md">
                    {generalReportData.totalRevenue.toFixed(0)}{" "}
                    <span className="text-2xl sm:text-3xl font-medium opacity-70">
                      BYN
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm opacity-80 mb-1">
                      ФОТ (Зарплаты)
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      {generalReportData.totalSalaries.toFixed(0)}{" "}
                      <span className="text-sm font-normal opacity-70">
                        BYN
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80 mb-1">
                      Чистая прибыль
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-300">
                      {(
                        generalReportData.totalRevenue -
                        generalReportData.totalSalaries
                      ).toFixed(0)}{" "}
                      <span className="text-sm font-normal opacity-70">
                        BYN
                      </span>
                    </div>
                    <div className="text-xs bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full inline-block mt-1">
                      Рентабельность:{" "}
                      {(
                        ((generalReportData.totalRevenue -
                          generalReportData.totalSalaries) /
                          generalReportData.totalRevenue) *
                          100 || 0
                      ).toFixed(0)}
                      %
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants as any}
              className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm flex flex-col"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" /> Умные выводы
              </h3>
              <div className="space-y-3 flex-1">
                {generalReportData.insights.length > 0 ? (
                  generalReportData.insights.map((insight, i) => {
                    // Парсинг маркдаун-подобного жирного шрифта
                    const parts = insight.split(/\*\*(.*?)\*\*/g);
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm bg-secondary/30 p-3 rounded-lg border border-secondary"
                      >
                        <span className="flex-1">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? (
                              <span
                                key={j}
                                className="font-bold text-foreground"
                              >
                                {part}
                              </span>
                            ) : (
                              part
                            ),
                          )}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-muted-foreground text-sm flex items-center justify-center h-full">
                    Недостаточно данных для анализа
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Слой 2: Структура выручки (Stacked Bar) */}
          <motion.div
            variants={itemVariants as any}
            className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6 shadow-sm"
          >
            {renderProgressBar()}
          </motion.div>

          {/* Слой 3: Bento Grid для метрик */}
          <motion.div
            variants={itemVariants as any}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {/* Bento Item 1 */}
            <div className="bg-gradient-to-br from-yellow-50/50 to-yellow-100/50 dark:from-yellow-900/10 dark:to-yellow-800/10 p-4 rounded-2xl border border-yellow-200/50 dark:border-yellow-800/30 flex flex-col justify-center">
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1">
                Средний чек
              </span>
              <span className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {generalReportData.dailyData.reduce(
                  (s, d) => s + d.recordsCount,
                  0,
                ) > 0
                  ? (
                      generalReportData.totalRevenue /
                      generalReportData.dailyData.reduce(
                        (s, d) => s + d.recordsCount,
                        0,
                      )
                    ).toFixed(1)
                  : 0}{" "}
                <span className="text-sm font-normal">BYN</span>
              </span>
            </div>
            {/* Bento Item 2 */}
            <div className="bg-gradient-to-br from-cyan-50/50 to-cyan-100/50 dark:from-cyan-900/10 dark:to-cyan-800/10 p-4 rounded-2xl border border-cyan-200/50 dark:border-cyan-800/30 flex flex-col justify-center">
              <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">
                Среднее в день
              </span>
              <span className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                {generalReportData.averageDaily.toFixed(0)}{" "}
                <span className="text-sm font-normal">BYN</span>
              </span>
            </div>
            {/* Bento Item 3 */}
            <div className="bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-800/20 dark:to-slate-700/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                Всего авто
              </span>
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {generalReportData.dailyData.reduce(
                  (sum, day) => sum + day.recordsCount,
                  0,
                )}{" "}
                <span className="text-sm font-normal">шт</span>
              </span>
            </div>
            {/* Bento Item 4 */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 dark:from-indigo-900/10 dark:to-indigo-800/10 p-4 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 flex flex-col justify-center">
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">
                Прогноз на 30 дней
              </span>
              <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                {(generalReportData.averageDaily * 30).toFixed(0)}{" "}
                <span className="text-sm font-normal">BYN</span>
              </span>
            </div>
          </motion.div>

          {/* Слой 4: Панель графиков с табами */}
          <motion.div
            variants={itemVariants as any}
            className="bg-card border border-border/60 rounded-2xl p-2 sm:p-5 shadow-sm"
          >
            <Tabs defaultValue="revenue">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-3 pt-2 sm:p-0 mb-4 gap-4">
                <h3 className="text-lg font-semibold ml-2 sm:ml-0">
                  Аналитика динамики
                </h3>
                <TabsList className="grid grid-cols-2 sm:flex sm:w-auto w-full h-auto">
                  <TabsTrigger
                    value="revenue"
                    className="text-xs sm:text-sm py-2"
                  >
                    Выручка
                  </TabsTrigger>
                  <TabsTrigger
                    value="traffic"
                    className="text-xs sm:text-sm py-2"
                  >
                    Трафик
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="revenue" className="mt-0">
                <div className="h-[300px] sm:h-[400px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={generalReportData.dailyData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-border/40"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(0)} BYN`,
                          name === "total"
                            ? "Итого"
                            : name === "cash"
                              ? "Нал"
                              : name === "card"
                                ? "Карта"
                                : "Безнал",
                        ]}
                        labelStyle={{
                          color: "hsl(var(--muted-foreground))",
                          marginBottom: "8px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Итого"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cash"
                        name="Наличные"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="card"
                        name="Карта"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="organizations"
                        name="Безнал"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="traffic" className="mt-0">
                <div className="h-[300px] sm:h-[400px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={generalReportData.dailyData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-border/40"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        dy={10}
                      />
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        dx={-10}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(value: number, name: string) => [
                          name === "recordsCount"
                            ? `${value} шт`
                            : `${value.toFixed(0)} BYN`,
                          name === "recordsCount"
                            ? "Количество авто"
                            : "Выручка",
                        ]}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="total"
                        name="Выручка"
                        fill="hsl(var(--primary)/0.2)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="recordsCount"
                        name="Количество авто"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ fill: "#f97316", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Слой 5: Корпоративные клиенты (Подиум) */}
          {generalReportData.organizationBreakdown.length > 0 && (
            <motion.div
              variants={itemVariants as any}
              className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6 shadow-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Корпоративные клиенты
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                    {generalReportData.organizationBreakdown.length} шт
                  </span>
                </h3>
              </div>

              {/* Подиум Топ-3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {generalReportData.organizationBreakdown
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 3)
                  .map((org, index) => {
                    const isFirst = index === 0;
                    return (
                      <div
                        key={org.name}
                        className={`relative p-5 rounded-2xl border ${isFirst ? "border-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-900/10 shadow-md sm:-mt-4 sm:mb-4" : "border-border/60 bg-secondary/20"} flex flex-col items-center text-center transition-transform hover:scale-[1.02]`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mb-3 shadow-sm ${index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600" : index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500" : "bg-gradient-to-br from-amber-600 to-amber-800"}`}
                        >
                          {index + 1}
                        </div>
                        <h4 className="font-semibold text-sm line-clamp-2 mb-1 h-10 flex items-center justify-center">
                          {org.name}
                        </h4>
                        <div className="mt-auto pt-2 w-full">
                          <div
                            className={`text-xl font-bold ${isFirst ? "text-yellow-600 dark:text-yellow-400" : ""}`}
                          >
                            {org.amount.toFixed(0)} BYN
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {(
                              (org.amount /
                                generalReportData.totalOrganizations) *
                              100
                            ).toFixed(1)}
                            % от безнала
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Остальные клиенты (Аккордеон) */}
              {generalReportData.organizationBreakdown.length > 3 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowAllClients(!showAllClients)}
                    className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl transition-colors border border-transparent hover:border-border/50 border-dashed flex justify-center items-center gap-2"
                  >
                    {showAllClients
                      ? "Скрыть список"
                      : `Показать всех (${generalReportData.organizationBreakdown.length - 3})`}
                  </button>
                  <AnimatePresence>
                    {showAllClients && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-4"
                      >
                        <div className="bg-background border border-border/50 rounded-xl overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-secondary/50 text-muted-foreground">
                              <tr>
                                <th className="py-3 px-4 text-left font-medium">
                                  Организация
                                </th>
                                <th className="py-3 px-4 text-right font-medium">
                                  Сумма (BYN)
                                </th>
                                <th className="py-3 px-4 text-right font-medium">
                                  Доля
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {generalReportData.organizationBreakdown
                                .sort((a, b) => b.amount - a.amount)
                                .slice(3)
                                .map((org) => (
                                  <tr
                                    key={org.name}
                                    className="hover:bg-muted/30 transition-colors"
                                  >
                                    <td className="py-3 px-4 font-medium">
                                      {org.name}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      {org.amount.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-muted-foreground">
                                      {(
                                        (org.amount /
                                          generalReportData.totalOrganizations) *
                                        100
                                      ).toFixed(1)}
                                      %
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Заглушка, когда данные не загружены и не загружаются */}
      {!generalReportData && !generalReportLoading && (
        <div className="card-with-shadow py-16 px-4 text-center border border-dashed border-border/60 bg-card/30 flex flex-col items-center justify-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">
            Выберите период и нажмите "Сформировать отчёт"
          </p>
        </div>
      )}
    </div>
  );
};

export default GeneralRevenueReport;
