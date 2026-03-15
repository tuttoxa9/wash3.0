import { createSalaryCalculator } from "@/components/SalaryCalculator";
import { useAppContext } from "@/lib/context/AppContext";
import { useToast } from "@/lib/hooks/useToast";
import {
  carWashService,
  dailyReportService,
  dailyRolesService,
} from "@/lib/services/supabaseService";
import type { CarWashRecord } from "@/lib/types";
import { determineEmployeeRole } from "@/lib/employee-utils";
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
} from "docx";
import { saveAs } from "file-saver";
import {
  Activity,
  BarChart3,
  Briefcase,
  Calendar as CalendarIcon,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileDown,
  Loader2,
  PieChart,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GeneralRevenueReport: React.FC = () => {
  const { state } = useAppContext();
  const { toast } = useToast();

  const [generalReportLoading, setGeneralReportLoading] = useState(false);
  const [generalStartDate, setGeneralStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [generalEndDate, setGeneralEndDate] = useState(new Date());
  const [generalMinimumFlags, setGeneralMinimumFlags] = useState<
    Record<string, boolean>
  >({});
  const [generalReportData, setGeneralReportData] = useState<{
    totalCash: number;
    totalCard: number;
    totalOrganizations: number;
    totalDebt: number;
    totalCertificate: number;
    totalRevenue: number;
    totalSalaries: number;
    organizationBreakdown: { name: string; amount: number }[];
    dailyData: {
      date: string;
      cash: number;
      card: number;
      organizations: number;
      debt: number;
      certificate: number;
      total: number;
      recordsCount: number;
    }[];
    averageDaily: number;
    maxDay: { date: string; amount: number };
    minDay: { date: string; amount: number };
  } | null>(null);

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

      const dateRange: string[] = [];
      const currentDate = new Date(generalStartDate);
      while (
        isBefore(currentDate, generalEndDate) ||
        isEqual(currentDate, generalEndDate)
      ) {
        if (!isNaN(currentDate.getTime())) {
          dateRange.push(format(currentDate, "yyyy-MM-dd"));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      let totalCash = 0;
      let totalCard = 0;
      let totalOrganizations = 0;
      let totalDebt = 0;
      let totalCertificate = 0;
      const organizationBreakdown: Record<string, number> = {};
      const dailyBreakdown: Record<
        string,
        {
          cash: number;
          card: number;
          organizations: number;
          debt: number;
          certificate: number;
          recordsCount: number;
        }
      > = {};

      dateRange.forEach((date) => {
        dailyBreakdown[date] = {
          cash: 0,
          card: 0,
          organizations: 0,
          debt: 0,
          certificate: 0,
          recordsCount: 0,
        };
      });

      allRecords.forEach((record) => {
        const recordDate = record.date;
        if (!dailyBreakdown[recordDate]) {
          dailyBreakdown[recordDate] = {
            cash: 0,
            card: 0,
            organizations: 0,
            debt: 0,
            certificate: 0,
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
        } else if (record.paymentMethod.type === "certificate") {
          totalCertificate += record.price;
          dailyBreakdown[recordDate].certificate += record.price;
        }
      });

      const totalRevenue =
        totalCash + totalCard + totalOrganizations + totalDebt + totalCertificate;

      const dailyData = dateRange.map((date) => {
        const dayData = dailyBreakdown[date] || {
          cash: 0,
          card: 0,
          organizations: 0,
          debt: 0,
          certificate: 0,
          recordsCount: 0,
        };
        const total =
          dayData.cash + dayData.card + dayData.organizations + dayData.debt + dayData.certificate;
        return {
          date: format(parseISO(date), "dd.MM"),
          cash: dayData.cash,
          card: dayData.card,
          organizations: dayData.organizations,
          debt: dayData.debt,
          certificate: dayData.certificate,
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
        const aggregatedGeneralMinFlags: Record<string, boolean> = {};

        const recordsByDate: Record<string, CarWashRecord[]> = {};
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
            rec.employeeIds.forEach((id) => participantIds.add(id)),
          );

          participantIds.forEach((empId) => {
            employeeRolesForDay[empId] = determineEmployeeRole(
              empId,
              dateStr,
              dayRoles,
              state.employees,
            );

            const minKey = `min_${empId}`;
            const minVal = dayRoles[minKey];
            minimumOverrideForDay[empId] = minVal !== false;

            if (minimumOverrideForDay[empId])
              aggregatedGeneralMinFlags[empId] = true;
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

        setGeneralMinimumFlags(aggregatedGeneralMinFlags);
      }

      setGeneralReportData({
        totalCash,
        totalCard,
        totalOrganizations,
        totalDebt,
        totalCertificate,
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
      });
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
                  text: "Тип оплаты",
                  alignment: AlignmentType.CENTER,
                  bold: true,
                }),
              ],
              width: { size: 3000, type: "dxa" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: "Сумма (BYN)",
                  alignment: AlignmentType.CENTER,
                  bold: true,
                }),
              ],
              width: { size: 2000, type: "dxa" },
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
            new TableCell({
              children: [new Paragraph({ text: "Итого выручка", bold: true })],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: generalReportData.totalRevenue.toFixed(2),
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
              children: [new Paragraph({ text: "Итого зарплаты", bold: true })],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: generalReportData.totalSalaries.toFixed(2),
                  alignment: AlignmentType.RIGHT,
                  bold: true,
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
                    text: "Организация",
                    alignment: AlignmentType.CENTER,
                    bold: true,
                  }),
                ],
                width: { size: 3000, type: "dxa" },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: "Сумма (BYN)",
                    alignment: AlignmentType.CENTER,
                    bold: true,
                  }),
                ],
                width: { size: 2000, type: "dxa" },
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
                width: { size: 5000, type: "dxa" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
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
              ...(orgTableRows.length > 0
                ? [
                    new Paragraph({
                      text: "Детализация по организациям:",
                      heading: HeadingLevel.HEADING_2,
                      spacing: { before: 400, after: 200 },
                    }),
                    new Table({
                      rows: orgTableRows,
                      width: { size: 5000, type: "dxa" },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 1,
                          color: "000000",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 1,
                          color: "000000",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 1,
                          color: "000000",
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 1,
                          color: "000000",
                        },
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
              new Paragraph({
                text: "Подпись ответственного лица: ___________________",
                spacing: { before: 400 },
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

  return (
    <div className="space-y-16">
      {/* Chapter 1: Header and Controls */}
      <section
        className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden"
      >
        {/* Abstract background decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center">
              <TrendingUp className="w-8 h-8 mr-3 text-primary" />
              Общий Отчёт по Выручке
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Комплексная аналитика финансовых показателей, рентабельности и
              эффективности вашей автомойки.
            </p>
          </div>

          {generalReportData && (
            <button
              onClick={exportGeneralReportToWord}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-all active:scale-95"
            >
              <FileDown className="w-5 h-5" />
              Экспорт (Word)
            </button>
          )}
        </div>

        <div className="bg-background/80 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-border/50 shadow-sm relative z-10">
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              {
                label: "Сегодня",
                onClick: () => {
                  const t = new Date();
                  setGeneralStartDate(t);
                  setGeneralEndDate(t);
                },
              },
              {
                label: "7 дней",
                onClick: () => {
                  const t = new Date();
                  const w = new Date(t);
                  w.setDate(w.getDate() - 7);
                  setGeneralStartDate(w);
                  setGeneralEndDate(t);
                },
              },
              {
                label: "30 дней",
                onClick: () => {
                  const t = new Date();
                  const m = new Date(t);
                  m.setMonth(m.getMonth() - 1);
                  setGeneralStartDate(m);
                  setGeneralEndDate(t);
                },
              },
              {
                label: "Месяц",
                onClick: () => {
                  const t = new Date();
                  setGeneralStartDate(
                    new Date(t.getFullYear(), t.getMonth(), 1),
                  );
                  setGeneralEndDate(t);
                },
              },
              {
                label: "Прошлый",
                onClick: () => {
                  const t = new Date();
                  setGeneralStartDate(
                    new Date(t.getFullYear(), t.getMonth() - 1, 1),
                  );
                  setGeneralEndDate(new Date(t.getFullYear(), t.getMonth(), 0));
                },
              },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={preset.onClick}
                className="px-4 py-1.5 text-sm font-medium rounded-full bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="w-full sm:w-auto flex-1">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Начало периода
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="date"
                  value={format(generalStartDate, "yyyy-MM-dd")}
                  onChange={(e) =>
                    setGeneralStartDate(new Date(e.target.value))
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            <div className="w-full sm:w-auto flex-1">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Конец периода
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="date"
                  value={format(generalEndDate, "yyyy-MM-dd")}
                  onChange={(e) => setGeneralEndDate(new Date(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            <button
              onClick={loadGeneralReport}
              disabled={generalReportLoading}
              className="w-full sm:w-auto px-8 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {generalReportLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Анализ...
                </>
              ) : (
                "Сформировать"
              )}
            </button>
          </div>
        </div>
      </section>

      {generalReportData && (
        <div className="space-y-24">
          {/* Chapter 2: The Big Picture (KPIs) */}
          <section




            className="space-y-8"
          >
            <div

              className="flex items-end gap-4 mb-2"
            >
              <div>
                <h3 className="text-2xl font-bold">Главные метрики</h3>
                <p className="text-muted-foreground">
                  Обзор финансовых показателей за период
                </p>
              </div>
              <div className="flex-1 border-b border-border/50 pb-2 mb-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Revenue Card */}
              <div

                className="md:col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-3xl p-8 relative overflow-hidden shadow-sm"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Wallet className="w-32 h-32 text-primary" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                      Общая Выручка
                    </span>
                    <div className="text-5xl lg:text-7xl font-bold tracking-tighter text-foreground">
                      {generalReportData.totalRevenue.toFixed(2)}{" "}
                      <span className="text-2xl lg:text-3xl text-muted-foreground font-medium">
                        BYN
                      </span>
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-background/60 backdrop-blur rounded-2xl p-4 border border-border/50">
                      <div className="text-sm text-muted-foreground mb-1">
                        Обслужено авто
                      </div>
                      <div className="text-2xl font-semibold">
                        {generalReportData.dailyData.reduce(
                          (sum, day) => sum + day.recordsCount,
                          0,
                        )}
                      </div>
                    </div>
                    <div className="bg-background/60 backdrop-blur rounded-2xl p-4 border border-border/50">
                      <div className="text-sm text-muted-foreground mb-1">
                        Средний чек
                      </div>
                      <div className="text-2xl font-semibold">
                        {generalReportData.dailyData.reduce(
                          (sum, day) => sum + day.recordsCount,
                          0,
                        ) > 0
                          ? (
                              generalReportData.totalRevenue /
                              generalReportData.dailyData.reduce(
                                (sum, day) => sum + day.recordsCount,
                                0,
                              )
                            ).toFixed(2)
                          : 0}{" "}
                        <span className="text-sm text-muted-foreground">
                          BYN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit & Salary Stack */}
              <div  className="flex flex-col gap-6">
                <div className="flex-1 bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                  <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-emerald-500" />{" "}
                    Чистая Прибыль
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {(
                      generalReportData.totalRevenue -
                      generalReportData.totalSalaries
                    ).toFixed(2)}{" "}
                    <span className="text-lg text-muted-foreground font-medium">
                      BYN
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-emerald-500 font-medium">
                    Рентабельность:{" "}
                    {generalReportData.totalRevenue > 0
                      ? (
                          ((generalReportData.totalRevenue -
                            generalReportData.totalSalaries) /
                            generalReportData.totalRevenue) *
                          100
                        ).toFixed(2)
                      : "0.00"}
                    %
                  </div>
                </div>

                <div className="flex-1 bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full" />
                  <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-orange-500" /> Фонд
                    Зарплат
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {generalReportData.totalSalaries.toFixed(2)}{" "}
                    <span className="text-lg text-muted-foreground font-medium">
                      BYN
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {generalReportData.totalRevenue > 0
                      ? (
                          (generalReportData.totalSalaries /
                            generalReportData.totalRevenue) *
                          100
                        ).toFixed(2)
                      : "0.00"}
                    % от выручки
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods Breakdown (Mini Bento) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-card border border-border/60 hover:border-blue-500/30 transition-colors rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-blue-500 mb-3">
                  <DollarSign className="w-5 h-5" />{" "}
                  <span className="font-medium text-sm">Наличные</span>
                </div>
                <div className="text-2xl font-bold">
                  {generalReportData.totalCash.toFixed(2)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    BYN
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {generalReportData.totalRevenue > 0
                    ? (
                        (generalReportData.totalCash /
                          generalReportData.totalRevenue) *
                        100
                      ).toFixed(2)
                    : "0.00"}
                  % доли
                </div>
              </div>
              <div

                className="bg-card border border-border/60 hover:border-green-500/30 transition-colors rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-green-500 mb-3">
                  <CreditCard className="w-5 h-5" />{" "}
                  <span className="font-medium text-sm">Карта</span>
                </div>
                <div className="text-2xl font-bold">
                  {generalReportData.totalCard.toFixed(2)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    BYN
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {generalReportData.totalRevenue > 0
                    ? (
                        (generalReportData.totalCard /
                          generalReportData.totalRevenue) *
                        100
                      ).toFixed(2)
                    : "0.00"}
                  % доли
                </div>
              </div>
              <div

                className="bg-card border border-border/60 hover:border-purple-500/30 transition-colors rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-purple-500 mb-3">
                  <Briefcase className="w-5 h-5" />{" "}
                  <span className="font-medium text-sm">Безнал (Орг.)</span>
                </div>
                <div className="text-2xl font-bold">
                  {generalReportData.totalOrganizations.toFixed(2)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    BYN
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {generalReportData.totalRevenue > 0
                    ? (
                        (generalReportData.totalOrganizations /
                          generalReportData.totalRevenue) *
                        100
                      ).toFixed(2)
                    : "0.00"}
                  % доли
                </div>
              </div>
              <div

                className="bg-card border border-border/60 hover:border-red-500/30 transition-colors rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-red-500 mb-3">
                  <RefreshCw className="w-5 h-5" />{" "}
                  <span className="font-medium text-sm">Долги</span>
                </div>
                <div className="text-2xl font-bold">
                  {generalReportData.totalDebt.toFixed(2)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    BYN
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {generalReportData.totalRevenue > 0
                    ? (
                        (generalReportData.totalDebt /
                          generalReportData.totalRevenue) *
                        100
                      ).toFixed(2)
                    : "0.00"}
                  % доли
                </div>
              </div>
              <div
                className="bg-card border border-border/60 hover:border-orange-500/30 transition-colors rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-orange-500 mb-3">
                  <Activity className="w-5 h-5" />{" "}
                  <span className="font-medium text-sm">Сертификаты</span>
                </div>
                <div className="text-2xl font-bold">
                  {generalReportData.totalCertificate.toFixed(2)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    BYN
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {generalReportData.totalRevenue > 0
                    ? (
                        (generalReportData.totalCertificate /
                          generalReportData.totalRevenue) *
                        100
                      ).toFixed(2)
                    : "0.00"}
                  % доли
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 3: Dynamics & Charts */}
          <section className="space-y-8">
            <div className="flex items-end gap-4 mb-2">
              <div>
                <h3 className="text-2xl font-bold">Динамика Выручки</h3>
                <p className="text-muted-foreground">
                  Тренды и корреляция с количеством авто
                </p>
              </div>
              <div className="flex-1 border-b border-border/50 pb-2 mb-1" />
            </div>

            <div

              className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm"
            >
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={generalReportData.dailyData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorTotal"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                      }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      itemStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: 500,
                      }}
                      labelStyle={{
                        color: "hsl(var(--muted-foreground))",
                        marginBottom: "8px",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "recordsCount"
                          ? `${value} шт.`
                          : `${value.toFixed(2)} BYN`,
                        name === "recordsCount"
                          ? "Автомобилей"
                          : name === "total"
                            ? "Выручка"
                            : name,
                      ]}
                      labelFormatter={(label) => `Дата: ${label}`}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="total"
                      name="Общая выручка"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="recordsCount"
                      name="Кол-во авто"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Stats below chart */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border/50">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Лучший день
                  </div>
                  <div className="font-semibold">
                    {generalReportData.maxDay.amount.toFixed(2)} BYN
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {generalReportData.maxDay.date}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Худший день
                  </div>
                  <div className="font-semibold">
                    {generalReportData.minDay.amount.toFixed(2)} BYN
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {generalReportData.minDay.date}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Среднее / день
                  </div>
                  <div className="font-semibold">
                    {generalReportData.averageDaily.toFixed(2)} BYN
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Макс. авто / день
                  </div>
                  <div className="font-semibold">
                    {Math.max(
                      ...generalReportData.dailyData.map((d) => d.recordsCount),
                    )}{" "}
                    шт.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 4: Efficiency & Analytics */}
          <section




            className="space-y-8"
          >
            <div

              className="flex items-end gap-4 mb-2"
            >
              <div>
                <h3 className="text-2xl font-bold">Эффективность</h3>
                <p className="text-muted-foreground">
                  Глубокая аналитика рабочих процессов
                </p>
              </div>
              <div className="flex-1 border-b border-border/50 pb-2 mb-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div

                className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm"
              >
                <h4 className="font-semibold mb-6 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-primary" />{" "}
                  Операционные метрики
                </h4>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        Загруженность (от максимума)
                      </span>
                      <span className="font-medium">
                        {(() => {
                          const maxCars = Math.max(
                            ...generalReportData.dailyData.map(
                              (d) => d.recordsCount,
                            ),
                          );
                          const avgCars =
                            generalReportData.dailyData.reduce(
                              (sum, d) => sum + d.recordsCount,
                              0,
                            ) / generalReportData.dailyData.length;
                          return maxCars > 0
                            ? Math.round((avgCars / maxCars) * 100)
                            : 0;
                        })()}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${(() => {
                            const maxCars = Math.max(
                              ...generalReportData.dailyData.map(
                                (d) => d.recordsCount,
                              ),
                            );
                            const avgCars =
                              generalReportData.dailyData.reduce(
                                (sum, d) => sum + d.recordsCount,
                                0,
                              ) / generalReportData.dailyData.length;
                            return maxCars > 0
                              ? Math.round((avgCars / maxCars) * 100)
                              : 0;
                          })()}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-2xl">
                      <div className="text-xs text-muted-foreground mb-1">
                        Выручка / раб. день
                      </div>
                      <div className="text-xl font-semibold">
                        {generalReportData.dailyData.filter(
                          (day) => day.recordsCount > 0,
                        ).length > 0
                          ? (
                              generalReportData.totalRevenue /
                              generalReportData.dailyData.filter(
                                (day) => day.recordsCount > 0,
                              ).length
                            ).toFixed(2)
                          : 0}{" "}
                        BYN
                      </div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-2xl">
                      <div className="text-xs text-muted-foreground mb-1">
                        Рабочих дней
                      </div>
                      <div className="text-xl font-semibold">
                        {
                          generalReportData.dailyData.filter(
                            (day) => day.recordsCount > 0,
                          ).length
                        }{" "}
                        из {generalReportData.dailyData.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div

                className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm"
              >
                <h4 className="font-semibold mb-6 flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-primary" /> Анализ по
                  дням недели
                </h4>
                <div className="space-y-3">
                  {(() => {
                    const weekdayStats = generalReportData.dailyData.reduce(
                      (acc, day, index) => {
                        const date = new Date(generalStartDate);
                        date.setDate(date.getDate() + index);
                        const dayNames = [
                          "Вс",
                          "Пн",
                          "Вт",
                          "Ср",
                          "Чт",
                          "Пт",
                          "Сб",
                        ];
                        const dayName = dayNames[date.getDay()];
                        if (!acc[dayName])
                          acc[dayName] = { total: 0, count: 0, cars: 0 };
                        acc[dayName].total += day.total;
                        acc[dayName].cars += day.recordsCount;
                        acc[dayName].count += 1;
                        return acc;
                      },
                      {} as Record<string, any>,
                    );

                    const maxDayVal = Math.max(
                      ...Object.values(weekdayStats).map((s: any) =>
                        s.count > 0 ? s.total / s.count : 0,
                      ),
                    );

                    return (
                      Object.entries(weekdayStats)
                        // Сортируем с понедельника (Пн, Вт...) для порядка (если нужно), или по доходу
                        .sort(
                          ([, a], [, b]) =>
                            b.total / b.count - a.total / a.count,
                        )
                        .slice(0, 5) // Показываем топ-5
                        .map(([day, stats], idx) => {
                          const avgVal =
                            stats.count > 0 ? stats.total / stats.count : 0;
                          const percent =
                            maxDayVal > 0 ? (avgVal / maxDayVal) * 100 : 0;

                          return (
                            <div key={day} className="flex items-center gap-4">
                              <div className="w-8 text-sm font-medium text-muted-foreground">
                                {day}
                              </div>
                              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden flex">
                                <div
                                  style={{ width: `${percent}%` }}
                                  className={`h-full ${idx === 0 ? "bg-primary" : "bg-primary/50"}`}
                                />
                              </div>
                              <div className="w-20 text-right text-sm font-semibold">
                                {avgVal.toFixed(2)}{" "}
                                <span className="text-xs text-muted-foreground font-normal">
                                  BYN
                                </span>
                              </div>
                            </div>
                          );
                        })
                    );
                  })()}
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 5: Corporate Clients */}
          {generalReportData.organizationBreakdown.length > 0 && (
            <section




              className="space-y-8"
            >
              <div

                className="flex items-end gap-4 mb-2"
              >
                <div>
                  <h3 className="text-2xl font-bold">Организации</h3>
                  <p className="text-muted-foreground">
                    Топ корпоративных клиентов
                  </p>
                </div>
                <div className="flex-1 border-b border-border/50 pb-2 mb-1" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div

                  className="bg-gradient-to-br from-purple-500/10 to-background border border-purple-500/20 rounded-3xl p-6 sm:p-8 flex flex-col justify-center shadow-sm"
                >
                  <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-4xl font-bold text-foreground mb-2">
                    {generalReportData.organizationBreakdown.length}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Активных организаций в периоде
                  </div>

                  <div className="mt-8 pt-6 border-t border-border/50">
                    <div className="text-sm text-muted-foreground mb-1">
                      Крупнейший клиент
                    </div>
                    <div className="font-semibold text-lg truncate">
                      {
                        generalReportData.organizationBreakdown.sort(
                          (a, b) => b.amount - a.amount,
                        )[0]?.name
                      }
                    </div>
                    <div className="text-sm text-primary font-medium">
                      {generalReportData.organizationBreakdown
                        .sort((a, b) => b.amount - a.amount)[0]
                        ?.amount.toFixed(2)}{" "}
                      BYN
                    </div>
                  </div>
                </div>

                <div

                  className="lg:col-span-2 bg-card border border-border rounded-3xl p-2 sm:p-4 shadow-sm overflow-hidden"
                >
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left min-w-[350px]">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 sm:px-6 sm:py-4 text-left rounded-tl-xl whitespace-nowrap">
                            Организация
                          </th>
                          <th className="px-4 py-3 sm:px-6 sm:py-4 text-right whitespace-nowrap">Сумма (BYN)</th>
                          <th className="px-4 py-3 sm:px-6 sm:py-4 text-right rounded-tr-xl whitespace-nowrap">
                            Доля
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {generalReportData.organizationBreakdown
                          .sort((a, b) => b.amount - a.amount)
                          .slice(0, 5)
                          .map((org, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors"
                            >
                              <td className="px-4 py-3 sm:px-6 sm:py-4 text-left font-medium flex items-center gap-2 sm:gap-3 truncate max-w-[140px] sm:max-w-none" title={org.name}>
                                <div
                                  className={`shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white ${idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-600" : "bg-primary/50"}`}
                                >
                                  {idx + 1}
                                </div>
                                <span className="truncate">{org.name}</span>
                              </td>
                              <td className="px-4 py-3 sm:px-6 sm:py-4 text-right font-semibold whitespace-nowrap">
                                {org.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 sm:px-6 sm:py-4 text-right text-muted-foreground whitespace-nowrap">
                                {generalReportData.totalOrganizations > 0
                                  ? (
                                      (org.amount /
                                        generalReportData.totalOrganizations) *
                                      100
                                    ).toFixed(2)
                                  : "0.00"}
                                %
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {generalReportData.organizationBreakdown.length > 5 && (
                      <div className="text-center py-3 text-xs text-muted-foreground bg-muted/10 rounded-b-xl">
                        И еще{" "}
                        {generalReportData.organizationBreakdown.length - 5}{" "}
                        организаций...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty state when no report is generated yet but not loading */}
      {!generalReportData && !generalReportLoading && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium mb-2">Отчет не сформирован</h3>
          <p className="text-muted-foreground max-w-sm">
            Выберите период в панели выше и нажмите "Сформировать", чтобы
            увидеть аналитику.
          </p>
        </div>
      )}
    </div>
  );
};

export default GeneralRevenueReport;
