import React, { useState, useEffect } from "react";
import { format, parseISO, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, Search, ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { dailyReportService } from "@/lib/services/supabaseService";
import type { DailyReport } from "@/lib/types";

interface Transaction {
  id: string;
  reportDate: string;
  createdAt: string;
  amount: number;
  reason: string;
  method: "cash" | "card";
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const reports = await dailyReportService.getByDateRange(startDate, endDate);

      const allTransactions: Transaction[] = [];

      reports.forEach((report) => {
        if (report.cashModifications && report.cashModifications.length > 0) {
          report.cashModifications.forEach((mod) => {
            allTransactions.push({
              id: mod.id,
              reportDate: report.date as string,
              createdAt: mod.createdAt,
              amount: mod.amount,
              reason: mod.reason,
              method: mod.method || "cash",
            });
          });
        }
      });

      // Sort by creation date descending
      allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Failed to load transactions", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [startDate, endDate]);

  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">История транзакций</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Все изменения баланса (изъятия и внесения)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
            <span className="text-muted-foreground hidden sm:inline">-</span>
            <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="date"
                value={endDate}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
            <button
              onClick={loadTransactions}
              disabled={isLoading}
              className="p-2 bg-background border border-border/50 hover:bg-muted text-foreground rounded-xl transition-colors shrink-0 flex items-center justify-center w-full sm:w-auto"
              title="Обновить"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-background rounded-xl p-4 border border-border/50 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Всего внесений</p>
              <p className="text-xl font-bold text-emerald-500">+{totalIncome.toLocaleString()} ₽</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-background rounded-xl p-4 border border-border/50 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Всего изъятий</p>
              <p className="text-xl font-bold text-rose-500">-{totalExpense.toLocaleString()} ₽</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-muted/30 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-4 whitespace-nowrap">Дата и Время</th>
              <th className="px-6 py-4 whitespace-nowrap">Смена</th>
              <th className="px-6 py-4 whitespace-nowrap">Тип</th>
              <th className="px-6 py-4 whitespace-nowrap">Способ</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Сумма</th>
              <th className="px-6 py-4 w-full">Основание</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                    <p>Загрузка истории...</p>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="w-8 h-8 mb-4 opacity-20" />
                    <p>За выбранный период транзакций не найдено</p>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const isExpense = t.amount < 0;
                return (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-foreground">
                        {format(parseISO(t.createdAt), "dd MMM yyyy", { locale: ru })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(t.createdAt), "HH:mm")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {format(parseISO(t.reportDate), "dd.MM.yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          isExpense
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {isExpense ? "Изъятие" : "Внесение"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {t.method === "cash" ? "Наличные" : "Карта"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-semibold ${isExpense ? "text-rose-500" : "text-emerald-500"}`}>
                        {isExpense ? "" : "+"}
                        {t.amount.toLocaleString()} ₽
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate group-hover:whitespace-normal group-hover:break-words">
                      {t.reason || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionHistory;
