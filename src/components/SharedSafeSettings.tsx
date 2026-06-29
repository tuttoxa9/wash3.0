import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Calendar as CalendarIcon, Download, Loader2, RefreshCw, Search, Check } from "lucide-react";
import { settingsService } from "@/lib/services/supabaseService";

export interface SharedSafeSettingsProps {
  safeBalance: number;
  safeTransactions: any[];
  onTransactionComplete: (transaction: any, newBalance: number) => void;
}

export const SharedSafeSettings: React.FC<SharedSafeSettingsProps> = ({ safeBalance, safeTransactions, onTransactionComplete }) => {
  
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(15);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const datePickerRef = useRef<HTMLInputElement>(null);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number.parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("╨Т╨▓╨╡╨┤╨╕╤В╨╡ ╨║╨╛╤А╤А╨╡╨║╤В╨╜╤Г╤О ╤Б╤Г╨╝╨╝╤Г");
      return;
    }
    if (!comment.trim()) {
      toast.error("╨Ф╨╛╨▒╨░╨▓╤М╤В╨╡ ╨║╨╛╨╝╨╝╨╡╨╜╤В╨░╤А╨╕╨╣");
      return;
    }

    if (transactionType === "out" && numAmount > safeBalance) {
      toast.error("╨б╤Г╨╝╨╝╨░ ╨╕╨╖╤К╤П╤В╨╕╤П ╨┐╤А╨╡╨▓╤Л╤И╨░╨╡╤В ╨▒╨░╨╗╨░╨╜╤Б ╤Б╨╡╨╣╤Д╨░!");
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        date: new Date().toISOString(),
        amount: numAmount,
        type: transactionType,
        comment: comment.trim(),
      };

      const newBalance =
        transactionType === "in"
          ? safeBalance + numAmount
          : safeBalance - numAmount;

      const result = await settingsService.processSafeOperations([transaction], newBalance);

      if (result.success) {
        onTransactionComplete(transaction, result.newBalance ?? newBalance);
        
        toast.success(
          transactionType === "in" ? "╨б╤А╨╡╨┤╤Б╤В╨▓╨░ ╨▓╨╜╨╡╤Б╨╡╨╜╤Л" : "╨б╤А╨╡╨┤╤Б╤В╨▓╨░ ╨╕╨╖╤К╤П╤В╤Л"
        );
        setAmount("");
        setComment("");
      } else {
        throw new Error("╨Ю╤И╨╕╨▒╨║╨░ ╨┐╤А╨╕ ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╨╕╨╕ ╤Б╨╡╨╣╤Д╨░");
      }
    } catch (error) {
      console.error(error);
      toast.error("╨Я╤А╨╛╨╕╨╖╨╛╤И╨╗╨░ ╨╛╤И╨╕╨▒╨║╨░");
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    if (safeTransactions.length === 0) {
      toast.error("╨Э╨╡╤В ╤В╤А╨░╨╜╨╖╨░╨║╤Ж╨╕╨╣ ╨┤╨╗╤П ╤Н╨║╤Б╨┐╨╛╤А╤В╨░");
      return;
    }

    const csvRows = [];
    // ╨Ч╨░╨│╨╛╨╗╨╛╨▓╨║╨╕
    csvRows.push(["╨Ф╨░╤В╨░", "╨Т╤А╨╡╨╝╤П", "╨в╨╕╨┐", "╨б╤Г╨╝╨╝╨░ (BYN)", "╨Ъ╨╛╨╝╨╝╨╡╨╜╤В╨░╤А╨╕╨╣"].join(";"));

    safeTransactions.forEach((tx) => {
      const date = new Date(tx.date);
      const row = [
        format(date, "dd.MM.yyyy"),
        format(date, "HH:mm"),
        tx.type === "in" ? "╨Т╨╜╨╡╤Б╨╡╨╜╨╕╨╡" : "╨Ш╨╖╤К╤П╤В╨╕╨╡",
        tx.amount.toFixed(2),
        `"${tx.comment.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(";"));
    });

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const fileName = `╨б╨╡╨╣╤Д_${format(new Date(), "dd-MM-yyyy")}.csv`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV ╤Г╤Б╨┐╨╡╤И╨╜╨╛ ╤Н╨║╤Б╨┐╨╛╤А╤В╨╕╤А╨╛╨▓╨░╨╜");
  };

  const filteredTransactions = safeTransactions.filter((tx) => {
    const matchesFilter = filter === "all" || tx.type === filter;
    const matchesSearch = tx.comment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = selectedDate ? format(new Date(tx.date), "yyyy-MM-dd") === selectedDate : true;
    return matchesFilter && matchesSearch && matchesDate;
  });

  const displayTransactions = filteredTransactions.slice(0, displayCount);
  const hasMore = displayCount < filteredTransactions.length;

  // Group transactions by date
  const groupedTransactions = displayTransactions.reduce((acc, tx) => {
    const dateStr = format(new Date(tx.date), "dd.MM.yyyy");
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(tx);
    return acc;
  }, {} as Record<string, typeof safeTransactions>);

  return (
    <div className="flex flex-col animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">

        {/* ╨Ы╨╡╨▓╨░╤П ╨║╨╛╨╗╨╛╨╜╨║╨░ (╨С╨░╨╗╨░╨╜╤Б + ╨д╨╛╤А╨╝╨░) */}
        <div className="flex flex-col gap-4">

          {/* ╨У╨╗╨░╨▓╨╜╤Л╨╣ ╨▒╨░╨╗╨░╨╜╤Б */}
          <div className="p-6 border border-border/50 rounded-2xl bg-card shadow-sm flex flex-col justify-center gap-2 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-green-500/5 rotate-12">
              <Wallet className="w-40 h-40" />
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                <Wallet className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">╨С╨░╨╗╨░╨╜╤Б ╤Б╨╡╨╣╤Д╨░</p>
            </div>
            <h2 className="text-3xl font-bold text-foreground relative z-10 mt-2">
              {safeBalance.toFixed(2)} <span className="text-xl text-muted-foreground font-semibold">BYN</span>
            </h2>
          </div>

          {/* ╨д╨╛╤А╨╝╨░ */}
          <div className="p-6 border border-border/50 rounded-2xl bg-card shadow-sm flex flex-col">
            <h3 className="text-lg font-bold mb-4">╨Э╨╛╨▓╨░╤П ╨╛╨┐╨╡╤А╨░╤Ж╨╕╤П</h3>
          <div className="flex bg-muted/50 p-1 rounded-xl gap-1 mb-5">
            <button
              onClick={() => setTransactionType("in")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                transactionType === "in"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              ╨Т╨╜╨╡╤Б╤В╨╕
            </button>
            <button
              onClick={() => setTransactionType("out")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                transactionType === "out"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              ╨Ш╨╖╤К╤П╤В╤М
            </button>
          </div>

          <form onSubmit={handleTransaction} className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                ╨б╤Г╨╝╨╝╨░ (BYN)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-base font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                ╨Ъ╨╛╨╝╨╝╨╡╨╜╤В╨░╤А╨╕╨╣
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="╨Я╤А╨╕╤З╨╕╨╜╨░ ╨╛╨┐╨╡╤А╨░╤Ж╨╕╨╕"
                className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                required
              />
            </div>
            {transactionType === "out" && Number.parseFloat(amount) > safeBalance && (
              <p className="text-sm text-destructive font-medium mt-2">
                ╨б╤Г╨╝╨╝╨░ ╨╕╨╖╤К╤П╤В╨╕╤П ╨╜╨╡ ╨╝╨╛╨╢╨╡╤В ╨┐╤А╨╡╨▓╤Л╤И╨░╤В╤М ╨▒╨░╨╗╨░╨╜╤Б ╤Б╨╡╨╣╤Д╨░ ({safeBalance.toFixed(2)} BYN)
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
                ) : transactionType === "in" ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
                {transactionType === "in" ? "╨Я╨╛╨┐╨╛╨╗╨╜╨╕╤В╤М ╤Б╨╡╨╣╤Д" : "╨Ш╨╖╤К╤П╤В╤М ╤Б╤А╨╡╨┤╤Б╤В╨▓╨░"}
              </button>
            </div>
          </form>
          </div>
        </div>

        {/* ╨Ш╤Б╤В╨╛╤А╨╕╤П (╨Я╤А╨░╨▓╨░╤П ╨║╨╛╨╗╨╛╨╜╨║╨░) */}
        <div className="p-6 border border-border/50 rounded-2xl bg-card shadow-sm flex flex-col h-[500px] lg:h-auto lg:min-h-[600px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">╨Ш╤Б╤В╨╛╤А╨╕╤П ╨╛╨┐╨╡╤А╨░╤Ж╨╕╨╣</h3>
              <button
                onClick={exportToCsv}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="╨н╨║╤Б╨┐╨╛╤А╤В ╨▓ CSV"
              >
                <FileDown className="w-4 h-4" />
              </button>
            </div>

            <div className="flex bg-muted/40 p-1 rounded-lg gap-1 self-start">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                }`}
              >
                ╨Т╤Б╨╡
              </button>
              <button
                onClick={() => setFilter("in")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === "in" ? "bg-background shadow-sm text-green-600" : "text-muted-foreground hover:bg-background/50"
                }`}
              >
                ╨Т╨╜╨╡╤Б╨╡╨╜╨╕╤П
              </button>
              <button
                onClick={() => setFilter("out")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === "out" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                }`}
              >
                ╨Ш╨╖╤К╤П╤В╨╕╤П
              </button>
            </div>
          </div>

          <div className="mb-4 flex gap-2 relative">
            <div className="relative flex-1">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
               <input
                 type="text"
                 placeholder="╨Я╨╛╨╕╤Б╨║..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-colors"
               />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => datePickerRef.current?.showPicker()}
                className={`p-2.5 rounded-xl border transition-colors flex items-center justify-center ${
                  selectedDate
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-input text-muted-foreground hover:bg-muted/50"
                }`}
                title={selectedDate ? "╨Ю╤З╨╕╤Б╤В╨╕╤В╤М ╨┤╨░╤В╤Г" : "╨Т╤Л╨▒╤А╨░╤В╤М ╨┤╨░╤В╤Г"}
              >
                <CalendarIcon className="w-4 h-4" />
                {selectedDate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate("");
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </button>
              <input
                ref={datePickerRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDisplayCount(15);
                }}
                className="absolute opacity-0 w-0 h-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Wallet className="w-12 h-12 text-muted/30 mb-3" />
                <p>╨в╤А╨░╨╜╨╖╨░╨║╤Ж╨╕╨╕ ╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜╤Л</p>
              </div>
            ) : (
              <>
                {Object.entries(groupedTransactions).map(([dateStr, txs]) => (
                  <div key={dateStr} className="space-y-2">
                    <div className="sticky top-0 z-10 bg-card py-1">
                      <div className="inline-block px-3 py-1 rounded-lg bg-muted/50 border border-border/50 text-xs font-semibold text-muted-foreground shadow-sm">
                        {dateStr === format(new Date(), "dd.MM.yyyy") ? "╨б╨╡╨│╨╛╨┤╨╜╤П" : dateStr}
                      </div>
                    </div>
                    {txs.map((tx) => (
                      <div key={tx.id} className="p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background flex items-center justify-between gap-4 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            tx.type === "in" ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-muted text-foreground border border-border"
                          }`}>
                            {tx.type === "in" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col">
                            <p className="font-semibold text-sm text-foreground">{tx.comment}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(tx.date), "HH:mm")}
                            </p>
                          </div>
                        </div>
                        <div className={`font-bold text-base whitespace-nowrap ${tx.type === "in" ? "text-green-600" : "text-foreground"}`}>
                          {tx.type === "in" ? "+" : "-"}{tx.amount.toFixed(2)} <span className="text-xs font-medium opacity-70">BYN</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {hasMore && (
                  <button
                    onClick={() => setDisplayCount((prev) => prev + 15)}
                    className="w-full py-3 rounded-xl border border-input bg-background hover:bg-muted/50 transition-colors text-sm font-medium text-foreground mt-4"
                  >
                    ╨Х╤Й╤С
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};