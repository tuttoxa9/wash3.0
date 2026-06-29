import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Loader2, Download, Search, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { settingsService } from "@/lib/services/supabaseService"; // the global wash settings

export const OkleykaSafeSettings: React.FC = () => {
  const [safeBalance, setSafeBalance] = useState<number>(0);
  const [safeTransactions, setSafeTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [transactionType, setTransactionType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const fetchData = async () => {
    setFetching(true);
    try {
      const balance = await settingsService.getSafeBalance();
      const transactions = await settingsService.getSafeTransactions();
      setSafeBalance(balance);
      setSafeTransactions(transactions);
    } catch (e) {
      toast.error("Ошибка при загрузке сейфа");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !comment.trim()) return;

    const numAmount = Number.parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }

    if (transactionType === "out" && numAmount > safeBalance) {
      toast.error("Сумма операции превышает остаток в сейфе!");
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        id: crypto.randomUUID(),
        type: transactionType,
        amount: numAmount,
        comment: comment.trim(),
        date: new Date().toISOString(),
      };

      const newBalance =
        transactionType === "in"
          ? safeBalance + numAmount
          : safeBalance - numAmount;

      const result = await settingsService.processSafeOperations([transaction], newBalance);

      if (result.success) {
        setSafeBalance(result.newBalance ?? newBalance);
        setSafeTransactions(prev => [transaction, ...prev]);
        toast.success(
          transactionType === "in" ? "Средства внесены" : "Средства выданы"
        );
        setAmount("");
        setComment("");
      } else {
        toast.error("Ошибка при выполнении операции");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при выполнении операции");
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    if (safeTransactions.length === 0) {
      toast.error("Нет транзакций для экспорта");
      return;
    }

    const csvRows = [];
    csvRows.push(["Дата", "Время", "Тип", "Сумма (BYN)", "Комментарий"].join(";"));

    safeTransactions.forEach((tx) => {
      const date = new Date(tx.date);
      const row = [
        format(date, "dd.MM.yyyy"),
        format(date, "HH:mm"),
        tx.type === "in" ? "Внесение" : "Выдача",
        tx.amount.toFixed(2).replace(".", ","),
        `"${tx.comment.replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(";"));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `safe_transactions_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV успешно экспортирован");
  };

  const filteredTransactions = safeTransactions.filter((tx) => {
    const matchesFilter = filter === "all" || tx.type === filter;
    const matchesSearch = tx.comment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = selectedDate ? format(new Date(tx.date), "yyyy-MM-dd") === selectedDate : true;
    return matchesFilter && matchesSearch && matchesDate;
  });

  const groupedTransactions = filteredTransactions.reduce((acc, tx) => {
    const dateStr = format(new Date(tx.date), "yyyy-MM-dd");
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(tx);
    return acc;
  }, {} as Record<string, typeof safeTransactions>);

  if (fetching) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4 h-fit">
          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/50 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-2 mb-1 relative z-10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-medium text-muted-foreground">Остаток в сейфе</p>
            </div>
            <h2 className="text-3xl font-bold text-foreground relative z-10 mt-2">
              {safeBalance.toFixed(2)} <span className="text-xl text-muted-foreground font-semibold">BYN</span>
            </h2>
          </div>

          <form
            onSubmit={handleTransaction}
            className="p-6 sm:p-8 rounded-3xl bg-card border border-border/50 shadow-sm flex flex-col h-[420px]"
          >
            <div className="flex gap-2 p-1.5 bg-muted/50 rounded-2xl mb-6 shrink-0">
              <button
                type="button"
                onClick={() => setTransactionType("in")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  transactionType === "in"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                Внесение
              </button>
              <button
                type="button"
                onClick={() => setTransactionType("out")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  transactionType === "out"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                Выдача
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground/80">
                  Сумма (BYN)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                    BYN
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground/80">
                  Комментарий
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  placeholder="Назначение операции"
                  required
                />
              </div>
            </div>
            {transactionType === "out" && Number.parseFloat(amount) > safeBalance && (
              <p className="text-sm text-destructive font-medium mt-2">
                Сумма операции превышает остаток в сейфе ({safeBalance.toFixed(2)} BYN)
              </p>
            )}
            <div className="mt-auto pt-4">
              <button
                type="submit"
                disabled={loading || !amount || !comment.trim() || (transactionType === "out" && Number.parseFloat(amount) > safeBalance)}
                className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-white shadow-sm ${
                  transactionType === "in" ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  transactionType === "in" ? "Внести средства" : "Выдать средства"
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-7">
          <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border/50 shadow-sm flex flex-col h-full min-h-[600px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
              <h3 className="text-lg font-semibold text-foreground">
                История операций
              </h3>
              <button
                onClick={exportToCsv}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted text-sm font-medium transition-colors text-foreground whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Экспорт</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск по комментарию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border/50 rounded-xl bg-background focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="relative">
                <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-4 py-2 text-sm border border-border/50 rounded-xl bg-background focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full sm:w-auto px-4 py-2 text-sm border border-border/50 rounded-xl bg-background focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Все операции</option>
                <option value="in">Внесения</option>
                <option value="out">Выдачи</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 space-y-8">
              {Object.keys(groupedTransactions).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="text-sm">Нет операций за выбранный период</p>
                </div>
              ) : (
                Object.entries(groupedTransactions).map(([dateStr, txs]) => (
                  <div key={dateStr} className="space-y-3">
                    <div className="sticky top-0 bg-card/95 backdrop-blur-sm py-2 z-10 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/50" />
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        {format(new Date(dateStr), "dd MMMM yyyy", { locale: require("date-fns/locale").ru })}
                      </h4>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>
                    <div className="space-y-2">
                      {txs.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 rounded-2xl border border-border/50 hover:bg-muted/30 transition-colors bg-background/50"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                tx.type === "in"
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {tx.type === "in" ? (
                                <ArrowDownRight className="w-5 h-5" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">
                                {tx.comment}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(tx.date), "HH:mm")}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`font-semibold shrink-0 ml-4 tabular-nums ${
                              tx.type === "in" ? "text-green-600" : "text-foreground"
                            }`}
                          >
                            {tx.type === "in" ? "+" : "-"}
                            {tx.amount.toFixed(2)} BYN
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
